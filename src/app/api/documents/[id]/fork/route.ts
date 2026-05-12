import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { compileLatex } from '@/lib/latex/compile';
import type { Prisma } from '@/generated/prisma/client';
import {
  isSupportedTemplate,
  renderTemplate,
  documentTypeFromTemplate,
  type TemplateName,
} from '@/lib/latex/render';
import { prisma } from '@/lib/prisma';
import { deletePdf, uploadPdf } from '@/lib/storage/pdf';

type ForkBody = {
  templateName?: unknown;
  structuredData?: unknown;
  title?: unknown;
};

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

    const sourceDocument = await prisma.document.findFirst({
      where: { id: sourceDocumentId, user_id: session.userId },
      select: { id: true, title: true, job_id: true, type: true, status: true, tags: true },
    });

    if (!sourceDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as ForkBody | null;

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!isSupportedTemplate(body.templateName)) {
      return NextResponse.json(
        { error: 'templateName must be one of: jakes-resume, jakes-cover-letter' },
        { status: 400 },
      );
    }

    if (body.structuredData === null || body.structuredData === undefined) {
      return NextResponse.json({ error: 'structuredData is required' }, { status: 400 });
    }

    const templateName = body.templateName as TemplateName;
    const newTitle =
      typeof body.title === 'string' && body.title.trim().length > 0
        ? body.title.trim()
        : sourceDocument.title;

    let latexSource: string;
    try {
      latexSource = renderTemplate(templateName, body.structuredData);
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

    const sourceLatestVersion = await prisma.documentVersion.findFirst({
      where: { documentId: sourceDocumentId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (sourceLatestVersion?.versionNumber ?? 0) + 1;

    let newDocument: { id: string };
    try {
      newDocument = await prisma.$transaction(async (tx) => {
        const doc = await tx.document.create({
          data: {
            user_id: session.userId,
            job_id: sourceDocument.job_id,
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
            versionNumber: nextVersionNumber,
            templateName,
            structuredData: body.structuredData as Prisma.InputJsonValue,
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
  } catch (error) {
    console.error('[fork POST] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
