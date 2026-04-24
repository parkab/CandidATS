import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  buildStoragePath,
  DOCUMENTS_BUCKET,
  type DocumentType,
  encodeStoredFileContent,
  isSupportedDocumentStatus,
  isSupportedDocumentType,
  type StoredFileDocumentContent,
  tryParseStoredFileContent,
} from '@/lib/documents/metadata';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';

type UpdateDocumentBody = {
  jobId?: string;
  title?: string;
  content?: string;
  note?: string;
  type?: string;
  status?: string;
  tags?: string[];
};

function parseTags(
  value:
    | string
    | string[]
    | FormDataEntryValue
    | FormDataEntryValue[]
    | null
    | undefined,
): string[] {
  if (Array.isArray(value)) {
    const tags: string[] = [];

    for (const entry of value) {
      if (typeof entry !== 'string') {
        continue;
      }

      const trimmed = entry.trim();
      if (trimmed.length > 0) {
        tags.push(trimmed);
      }
    }

    return tags;
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

type PersistedDocument =
  Awaited<ReturnType<typeof prisma.document.findFirst>> extends infer T
    ? NonNullable<T>
    : never;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function verifyJobOwnership(jobId: string, userId: string) {
  return prisma.job.findFirst({
    where: {
      id: jobId,
      user_id: userId,
    },
    select: { id: true },
  });
}

async function toApiDocument(document: PersistedDocument) {
  const storedFile = tryParseStoredFileContent(document.content);

  if (!storedFile) {
    return {
      ...document,
      storage: null,
    };
  }

  let signedUrl: string | null = null;

  if (supabaseAdmin) {
    const { data } = await supabaseAdmin.storage
      .from(storedFile.bucket)
      .createSignedUrl(storedFile.path, 60 * 60);
    signedUrl = data?.signedUrl ?? null;
  }

  return {
    ...document,
    storage: {
      ...storedFile,
      signedUrl,
    },
  };
}

async function deleteStoredFileIfPresent(content: string) {
  const metadata = tryParseStoredFileContent(content);

  if (!metadata || !supabaseAdmin) {
    return;
  }

  await supabaseAdmin.storage.from(metadata.bucket).remove([metadata.path]);
}

async function moveStoredFileToTypeFolder(params: {
  metadata: StoredFileDocumentContent;
  userId: string;
  type: DocumentType;
}): Promise<StoredFileDocumentContent> {
  if (!supabaseAdmin) {
    throw new Error('Storage service unavailable');
  }

  const nextPath = buildStoragePath({
    userId: params.userId,
    type: params.type,
    fileName: params.metadata.fileName,
  });

  const storage = supabaseAdmin.storage.from(params.metadata.bucket);
  const copyResult = await storage.copy(params.metadata.path, nextPath);

  if (copyResult.error) {
    throw new Error(copyResult.error.message);
  }

  const removeResult = await storage.remove([params.metadata.path]);
  if (removeResult.error) {
    console.warn('Moved document file but failed to delete old path:', {
      oldPath: params.metadata.path,
      newPath: nextPath,
      details: removeResult.error.message,
    });
  }

  return {
    ...params.metadata,
    path: nextPath,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const documentId = asNonEmptyString(id);

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document id is required' },
        { status: 400 },
      );
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        user_id: session.userId,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ document: await toApiDocument(document) });
  } catch (error) {
    console.error('Error fetching document:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch document', details: errorMessage },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const documentId = asNonEmptyString(id);

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document id is required' },
        { status: 400 },
      );
    }

    const existingDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        user_id: session.userId,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const title = asNonEmptyString(formData.get('title'));
      const type = asNonEmptyString(formData.get('type'));
      const status = asNonEmptyString(formData.get('status'));
      const note = asNonEmptyString(formData.get('note'));
      const tags = parseTags(formData.getAll('tags'));
      const jobId = asNonEmptyString(formData.get('jobId'));

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: 'file is required for multipart updates' },
          { status: 400 },
        );
      }

      if (type && !isSupportedDocumentType(type)) {
        return NextResponse.json(
          { error: 'Type must be one of resume, cover_letter, or other' },
          { status: 400 },
        );
      }

      if (status && !isSupportedDocumentStatus(status)) {
        return NextResponse.json(
          { error: 'Status must be one of draft, ready, or archived' },
          { status: 400 },
        );
      }

      if (jobId) {
        const job = await verifyJobOwnership(jobId, session.userId);
        if (!job) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
      }

      if (!supabaseAdmin) {
        return NextResponse.json(
          { error: 'Storage service unavailable' },
          { status: 503 },
        );
      }

      const nextType = (type ?? existingDocument.type) as
        | 'resume'
        | 'cover_letter'
        | 'other';
      const fileName = file.name.trim().length > 0 ? file.name : 'document.bin';
      const storagePath = buildStoragePath({
        userId: session.userId,
        type: nextType,
        fileName,
      });

      const uploadResult = await supabaseAdmin.storage
        .from(DOCUMENTS_BUCKET)
        .upload(storagePath, file, {
          contentType:
            file.type && file.type.trim().length > 0
              ? file.type
              : 'application/octet-stream',
          upsert: false,
        });

      if (uploadResult.error) {
        return NextResponse.json(
          {
            error: 'Failed to upload file',
            details: uploadResult.error.message,
          },
          { status: 500 },
        );
      }

      await deleteStoredFileIfPresent(existingDocument.content);

      const updatedDocument = await prisma.document.update({
        where: { id: existingDocument.id },
        data: {
          job_id: jobId ?? existingDocument.job_id,
          title: title ?? existingDocument.title,
          type: nextType,
          status: status ?? existingDocument.status,
          tags: formData.has('tags') ? tags : existingDocument.tags,
          content: encodeStoredFileContent({
            kind: 'file',
            bucket: DOCUMENTS_BUCKET,
            path: storagePath,
            fileName,
            mimeType:
              file.type && file.type.trim().length > 0
                ? file.type
                : 'application/octet-stream',
            size: file.size,
            note: note ?? undefined,
          }),
          updated_at: new Date(),
        },
      });

      return NextResponse.json({
        document: await toApiDocument(updatedDocument),
      });
    }

    const body = (await request
      .json()
      .catch(() => null)) as UpdateDocumentBody | null;

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }

    if (body.jobId) {
      const job = await verifyJobOwnership(body.jobId, session.userId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
    }

    if (body.type && !isSupportedDocumentType(body.type)) {
      return NextResponse.json(
        { error: 'Type must be one of resume, cover_letter, or other' },
        { status: 400 },
      );
    }

    if (body.status && !isSupportedDocumentStatus(body.status)) {
      return NextResponse.json(
        { error: 'Status must be one of draft, ready, or archived' },
        { status: 400 },
      );
    }

    const existingFileMetadata = tryParseStoredFileContent(
      existingDocument.content,
    );
    let nextFileMetadata = existingFileMetadata;

    if (
      existingFileMetadata &&
      body.type &&
      body.type !== existingDocument.type
    ) {
      if (!supabaseAdmin) {
        return NextResponse.json(
          { error: 'Storage service unavailable' },
          { status: 503 },
        );
      }

      try {
        nextFileMetadata = await moveStoredFileToTypeFolder({
          metadata: existingFileMetadata,
          userId: session.userId,
          type: body.type as DocumentType,
        });
      } catch (moveError) {
        const details =
          moveError instanceof Error ? moveError.message : 'Unknown error';
        return NextResponse.json(
          { error: 'Failed to move stored file', details },
          { status: 500 },
        );
      }
    }

    const mergedTags = Array.isArray(body.tags)
      ? parseTags(body.tags)
      : existingDocument.tags;

    const mergedContent = (() => {
      if (nextFileMetadata) {
        return encodeStoredFileContent({
          ...nextFileMetadata,
          note:
            typeof body.note === 'string'
              ? body.note.trim() || undefined
              : nextFileMetadata.note,
        });
      }

      if (typeof body.content === 'string') {
        return body.content;
      }

      return existingDocument.content;
    })();

    const updatedDocument = await prisma.document.update({
      where: { id: existingDocument.id },
      data: {
        job_id: body.jobId ?? existingDocument.job_id,
        title: asNonEmptyString(body.title) ?? existingDocument.title,
        content: mergedContent,
        type: body.type ?? existingDocument.type,
        status:
          asNonEmptyString(body.status) ??
          (existingDocument.status as 'draft' | 'ready' | 'archived'),
        tags: mergedTags,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      document: await toApiDocument(updatedDocument),
    });
  } catch (error) {
    console.error('Error updating document:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update document', details: errorMessage },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const documentId = asNonEmptyString(id);

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document id is required' },
        { status: 400 },
      );
    }

    const existingDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        user_id: session.userId,
      },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    await prisma.document.delete({ where: { id: existingDocument.id } });
    await deleteStoredFileIfPresent(existingDocument.content);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete document', details: errorMessage },
      { status: 500 },
    );
  }
}
