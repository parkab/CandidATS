import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import {
  buildStoragePath,
  DOCUMENTS_BUCKET,
  encodeStoredFileContent,
  isSupportedDocumentStatus,
  isSupportedDocumentType,
  isSupportedUploadMimeType,
  MAX_UPLOAD_BYTES,
  mimeFromFileName,
  tryParseStoredFileContent,
} from '@/lib/documents/metadata';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';

type CreateDocumentBody = {
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
  return toApiDocumentWithOptions(document, { includeSignedUrl: true });
}

type ToApiDocumentOptions = {
  includeSignedUrl?: boolean;
};

async function toApiDocumentWithOptions(
  document: PersistedDocument,
  options: ToApiDocumentOptions,
) {
  const storedFile = tryParseStoredFileContent(document.content);

  if (!storedFile) {
    return {
      ...document,
      storage: null,
    };
  }

  const includeSignedUrl = options.includeSignedUrl ?? true;

  if (!includeSignedUrl) {
    return {
      ...document,
      storage: {
        ...storedFile,
        signedUrl: null,
      },
    };
  }

  let signedUrl: string | null = null;
  let signedUrlError: string | null = null;

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.storage
      .from(storedFile.bucket)
      .createSignedUrl(storedFile.path, 60 * 60);
    signedUrl = data?.signedUrl ?? null;
    if (error) {
      signedUrlError = error.message;
    }
  } else {
    signedUrlError = 'Storage service unavailable';
  }

  return {
    ...document,
    storage: {
      ...storedFile,
      signedUrl,
      signedUrlError: signedUrlError ?? undefined,
    },
  };
}

function asNonEmptyString(value: FormDataEntryValue | unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const jobId = asNonEmptyString(formData.get('jobId'));
      const title = asNonEmptyString(formData.get('title'));
      const typeValue = asNonEmptyString(formData.get('type'));
      const statusValue = asNonEmptyString(formData.get('status'));
      // const note = asNonEmptyString(formData.get('note'));
      const tags = parseTags(formData.getAll('tags'));
      const file = formData.get('file');

      if (!typeValue || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'type and file are required' },
          { status: 400 },
        );
      }

      const fileMimeType =
        file.type && file.type.trim().length > 0
          ? file.type
          : mimeFromFileName(file.name);

      if (!isSupportedUploadMimeType(fileMimeType)) {
        return NextResponse.json(
          { error: 'Unsupported file type. Supported formats: PDF, DOCX, TXT' },
          { status: 400 },
        );
      }

      if (file.size === 0) {
        return NextResponse.json(
          { error: 'File cannot be empty' },
          { status: 400 },
        );
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 10 MB' },
          { status: 400 },
        );
      }

      if (!isSupportedDocumentType(typeValue)) {
        return NextResponse.json(
          { error: 'Type must be one of resume, cover_letter, or other' },
          { status: 400 },
        );
      }

      if (statusValue && !isSupportedDocumentStatus(statusValue)) {
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

      const fileName = file.name.trim().length > 0 ? file.name : 'document.bin';
      const storagePath = buildStoragePath({
        userId: session.userId,
        type: typeValue,
        fileName,
      });

      const uploadResult = await supabaseAdmin.storage
        .from(DOCUMENTS_BUCKET)
        .upload(storagePath, file, {
          contentType: fileMimeType,
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

      const document = await prisma.document.create({
        data: {
          user_id: session.userId,
          job_id: jobId ?? null,
          title: title ?? fileName,
          content: encodeStoredFileContent({
            kind: 'file',
            bucket: DOCUMENTS_BUCKET,
            path: storagePath,
            fileName,
            mimeType: fileMimeType,
            size: file.size,
            //note: note ?? undefined,
          }),
          type: typeValue,
          status: statusValue ?? 'ready',
          tags,
        },
      });

      return NextResponse.json(
        { document: await toApiDocument(document) },
        { status: 201 },
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as CreateDocumentBody | null;

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }

    const jobId = asNonEmptyString(body.jobId);
    const title = asNonEmptyString(body.title);
    const content = asNonEmptyString(body.content);
    const note = asNonEmptyString(body.note);
    const type = asNonEmptyString(body.type);
    const status = asNonEmptyString(body.status);
    const tags = parseTags(body.tags);
    if (!title || !content || !type) {
      return NextResponse.json(
        { error: 'title, content, and type are required' },
        { status: 400 },
      );
    }

    if (!isSupportedDocumentType(type)) {
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

    const document = await prisma.document.create({
      data: {
        user_id: session.userId,
        job_id: jobId ?? null,
        title,
        content,
        type,
        status: status ?? 'draft',
        tags,
      },
    });

    return NextResponse.json(
      { document: await toApiDocument(document) },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating document:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create document', details: errorMessage },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const library = searchParams.get('library') === 'true';

    const whereClause: {
  user_id: string;
  job_id?: string | null;
} = {
  user_id: session.userId,
};

if (jobId) {
  const job = await verifyJobOwnership(jobId, session.userId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  whereClause.job_id = jobId;
} else if (library) {
  whereClause.job_id = null;
} else {
  return NextResponse.json(
    { error: 'Either jobId or library=true query parameter is required' },
    { status: 400 },
  );
}

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc',
      },
    });

    const documentsWithStorage = await Promise.all(
      documents.map((document) =>
        toApiDocumentWithOptions(document, { includeSignedUrl: false }),
      ),
    );

    return NextResponse.json({ documents: documentsWithStorage });
  } catch (error) {
    console.error('Error fetching documents:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: errorMessage },
      { status: 500 },
    );
  }
}
