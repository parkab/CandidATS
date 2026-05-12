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
import { getSupabaseAdmin } from '@/lib/supabase';
import { withErrorHandler } from '@/app/api/error-handler';
import { validationError, authError, notFoundError, databaseError, serviceError } from '@/lib/errors';
import { logger } from '@/lib/logger';

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

  const supabaseAdmin = getSupabaseAdmin();
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

async function handlePost(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    throw authError('Unauthorized');
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
      throw validationError('type and file are required');
    }

    const fileMimeType =
      file.type && file.type.trim().length > 0
        ? file.type
        : mimeFromFileName(file.name);

    if (!isSupportedUploadMimeType(fileMimeType)) {
      throw validationError('Unsupported file type. Supported formats: PDF, DOCX, TXT');
    }

    if (file.size === 0) {
      throw validationError('File cannot be empty');
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw validationError('File too large. Maximum size is 10 MB');
    }

    if (!isSupportedDocumentType(typeValue)) {
      throw validationError('Type must be one of resume, cover_letter, or other');
    }

    if (statusValue && !isSupportedDocumentStatus(statusValue)) {
      throw validationError('Status must be one of draft, ready, or archived');
    }

    if (jobId) {
      const job = await verifyJobOwnership(jobId, session.userId);
      if (!job) {
        throw notFoundError('Job');
      }
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw serviceError('Supabase');
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
      throw databaseError('Failed to upload file', { details: uploadResult.error.message });
    }

    const data: {
      user_id: string;
      title: string;
      content: string;
      type: string;
      status: string;
      tags: string[];
      job_id?: string;
    } = {
      user_id: session.userId,
      title: title ?? fileName,
      content: encodeStoredFileContent({
        kind: 'file',
        bucket: DOCUMENTS_BUCKET,
        path: storagePath,
        fileName,
        mimeType: fileMimeType,
        size: file.size,
      }),
      type: typeValue,
      status: statusValue ?? 'ready',
      tags,
      ...(jobId && { job_id: jobId }),
    };

    const document = await prisma.document.create({
      data,
    });

    logger.info('Document created (multipart)', { userId: session.userId, documentId: document.id, type: typeValue });

    return NextResponse.json(
      { document: await toApiDocument(document) },
      { status: 201 },
    );
  }

  const body = (await request
    .json()
    .catch(() => null)) as CreateDocumentBody | null;

  if (!body || typeof body !== 'object') {
    throw validationError('Invalid request body');
  }

  const jobId = asNonEmptyString(body.jobId);
  const title = asNonEmptyString(body.title);
  const content = asNonEmptyString(body.content);
  const type = asNonEmptyString(body.type);
  const status = asNonEmptyString(body.status);
  const tags = parseTags(body.tags);
  if (!title || !content || !type) {
    throw validationError('title, content, and type are required');
  }

  if (!isSupportedDocumentType(type)) {
    throw validationError('Type must be one of resume, cover_letter, or other');
  }

  if (status && !isSupportedDocumentStatus(status)) {
    throw validationError('Status must be one of draft, ready, or archived');
  }

  if (jobId) {
    const job = await verifyJobOwnership(jobId, session.userId);
    if (!job) {
      throw notFoundError('Job');
    }
  }

  const data: {
    user_id: string;
    title: string;
    content: string;
    type: string;
    status: string;
    tags: string[];
    job_id?: string;
  } = {
    user_id: session.userId,
    title,
    content,
    type,
    status: status ?? 'draft',
    tags,
    ...(jobId && { job_id: jobId }),
  };

  const document = await prisma.document.create({
    data,
  });

  logger.info('Document created (JSON)', { userId: session.userId, documentId: document.id, type });

  return NextResponse.json(
    { document: await toApiDocument(document) },
    { status: 201 },
  );
}

export const POST = withErrorHandler(handlePost);

async function handleGet(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    throw authError('Unauthorized');
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const library = searchParams.get('library') === 'true';

  if (jobId) {
    // Verify job exists and belongs to user
    const job = await verifyJobOwnership(jobId, session.userId);
    if (!job) {
      throw notFoundError('Job');
    }

    try {
      // Query documents linked via job_id (generated documents)
      const documentsViaJobId = await prisma.document.findMany({
        where: {
          user_id: session.userId,
          job_id: jobId,
        },
      });

      // Query documents linked via DocumentJob junction table (uploaded documents)
      const documentJobLinks = await prisma.documentJob.findMany({
        where: { jobId },
        select: { documentId: true },
      });

      const documentIdsFromJunction = documentJobLinks.map((link) => link.documentId);

      const documentsViaJunction = await prisma.document.findMany({
        where: {
          user_id: session.userId,
          id: { in: documentIdsFromJunction },
        },
      });

      // Combine and deduplicate
      const allDocumentIds = new Set<string>();
      const documentMap = new Map<string, typeof documentsViaJobId[0]>();

      for (const doc of [...documentsViaJobId, ...documentsViaJunction]) {
        if (!allDocumentIds.has(doc.id)) {
          allDocumentIds.add(doc.id);
          documentMap.set(doc.id, doc);
        }
      }

      const documents = Array.from(documentMap.values());

      const documentsWithStorage = await Promise.all(
        documents.map((document) =>
          toApiDocumentWithOptions(document, { includeSignedUrl: false }),
        ),
      );

      logger.info('Documents retrieved successfully for job', { 
        userId: session.userId, 
        jobId, 
        count: documents.length 
      });

      return NextResponse.json({ documents: documentsWithStorage });
    } catch (routeError) {
      if (routeError instanceof Error && 'statusCode' in routeError) {
        throw routeError;
      }
      throw databaseError('Failed to fetch documents for job', { error: String(routeError) });
    }
  } else if (library) {
    try {
      // Get documents not linked to any job via primary job_id field
      // These can be linked to multiple jobs via the DocumentJob junction table
      const documents = await prisma.document.findMany({
        where: {
          user_id: session.userId,
          job_id: null, // Only uploaded/unlinked documents (no primary job)
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      const documentsWithStorage = await Promise.all(
        documents.map((document) =>
          toApiDocumentWithOptions(document, { includeSignedUrl: false }),
        ),
      );

      logger.info('Library documents retrieved successfully', { userId: session.userId, count: documents.length });

      return NextResponse.json({ documents: documentsWithStorage });
    } catch (routeError) {
      if (routeError instanceof Error && 'statusCode' in routeError) {
        throw routeError;
      }
      throw databaseError('Failed to fetch library documents', { error: String(routeError) });
    }
  } else {
    throw validationError('Either jobId or library=true query parameter is required');
  }
}

export const GET = withErrorHandler(handleGet);
