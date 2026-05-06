import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { compileLatex } from '@/lib/latex/compile';
import type { Prisma } from '@/generated/prisma/client';
import {
  buildStoragePath,
  DOCUMENTS_BUCKET,
  encodeStoredFileContent,
  isSupportedDocumentType,
  tryParseStoredFileContent,
  type DocumentType,
} from '@/lib/documents/metadata';
import {
  isSupportedTemplate,
  renderTemplate,
  documentTypeFromTemplate,
  type TemplateName,
} from '@/lib/latex/render';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';
import { deletePdf, uploadPdf } from '@/lib/storage/pdf';

type DuplicateBody = {
  title?: unknown;
  jobId?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function verifyJobOwnership(jobId: string, userId: string) {
  return prisma.job.findFirst({
    where: { id: jobId, user_id: userId },
    select: { id: true },
  });
}

function isOwnedDocumentStorageObject(params: {
  bucket: string;
  path: string;
  userId: string;
}): boolean {
  if (params.bucket !== DOCUMENTS_BUCKET) {
    return false;
  }

  const normalizedPath = params.path.trim().replace(/^\/+/, '');
  return normalizedPath.startsWith(`${params.userId}/`);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sourceDocumentId } = await context.params;

    const body = (await request.json().catch(() => null)) as DuplicateBody | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const newTitle = asNonEmptyString(body.title);
    const targetJobId = asNonEmptyString(body.jobId);
    if (!newTitle) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!targetJobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const targetJob = await verifyJobOwnership(targetJobId, session.userId);
    if (!targetJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const sourceDocument = await prisma.document.findFirst({
      where: { id: sourceDocumentId, user_id: session.userId },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        status: true,
        tags: true,
      },
    });

    if (!sourceDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const latestVersion = await prisma.documentVersion.findFirst({
      where: { documentId: sourceDocument.id },
      orderBy: { versionNumber: 'desc' },
    });

    if (latestVersion && isSupportedTemplate(latestVersion.templateName)) {
      const templateName = latestVersion.templateName as TemplateName;
      let latexSource: string;
      try {
        latexSource = renderTemplate(templateName, latestVersion.structuredData);
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Render error';
        return NextResponse.json(
          { error: `Template render failed: ${detail}` },
          { status: 422 },
        );
      }

      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await compileLatex(latexSource);
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Compile error';
        return NextResponse.json(
          { error: `PDF compilation failed: ${detail}` },
          { status: 502 },
        );
      }

      const pdfPath = await uploadPdf({
        userId: session.userId,
        buffer: pdfBuffer,
        type: documentTypeFromTemplate(templateName),
      });

      const docType = documentTypeFromTemplate(templateName);

      let newDocument: { id: string };
      try {
        newDocument = await prisma.$transaction(async (tx) => {
          const doc = await tx.document.create({
            data: {
              user_id: session.userId,
              job_id: targetJobId,
              title: newTitle,
              content: '',
              type: docType,
              status: sourceDocument.status,
              tags: sourceDocument.tags,
            },
          });

          await tx.documentVersion.create({
            data: {
              documentId: doc.id,
              versionNumber: 1,
              templateName,
              structuredData: latestVersion.structuredData as Prisma.InputJsonValue,
              latexSource,
              pdfUrl: pdfPath,
              changeNotes: null,
            },
          });

          return doc;
        });
      } catch (txError) {
        await deletePdf(pdfPath).catch(() => undefined);
        throw txError;
      }

      return NextResponse.json({ documentId: newDocument.id }, { status: 201 });
    }

    const storedFile = tryParseStoredFileContent(sourceDocument.content);
    if (storedFile) {
      if (!supabaseAdmin) {
        return NextResponse.json(
          { error: 'Storage service unavailable' },
          { status: 503 },
        );
      }

      const docType = sourceDocument.type;
      if (!isSupportedDocumentType(docType)) {
        return NextResponse.json(
          { error: 'Document has unsupported type for file duplicate' },
          { status: 422 },
        );
      }
      if (
        !isOwnedDocumentStorageObject({
          bucket: storedFile.bucket,
          path: storedFile.path,
          userId: session.userId,
        })
      ) {
        return NextResponse.json(
          { error: 'Document storage metadata is invalid' },
          { status: 422 },
        );
      }

      const typeFolder = docType as DocumentType;
      const newPath = buildStoragePath({
        userId: session.userId,
        type: typeFolder,
        fileName: storedFile.fileName,
      });

      const storage = supabaseAdmin.storage.from(storedFile.bucket);
      const copyResult = await storage.copy(storedFile.path, newPath);

      if (copyResult.error) {
        return NextResponse.json(
          {
            error: 'Failed to copy file in storage',
            details: copyResult.error.message,
          },
          { status: 500 },
        );
      }

      const newDocument = await prisma.document.create({
        data: {
          user_id: session.userId,
          job_id: targetJobId,
          title: newTitle,
          content: encodeStoredFileContent({
            kind: 'file',
            bucket: storedFile.bucket,
            path: newPath,
            fileName: storedFile.fileName,
            mimeType: storedFile.mimeType,
            size: storedFile.size,
            note: storedFile.note,
          }),
          type: docType,
          status: sourceDocument.status,
          tags: sourceDocument.tags,
        },
      });

      return NextResponse.json({ documentId: newDocument.id }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Document has no duplicable content' },
      { status: 422 },
    );
  } catch (error) {
    console.error('[duplicate POST] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
