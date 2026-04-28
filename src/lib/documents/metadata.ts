export type DocumentType = 'resume' | 'cover_letter' | 'other';
export type DocumentStatus = 'draft' | 'ready' | 'archived';

const DOCUMENT_TYPE_SET = new Set<DocumentType>([
  'resume',
  'cover_letter',
  'other',
]);

const DOCUMENT_STATUS_SET = new Set<DocumentStatus>([
  'draft',
  'ready',
  'archived',
]);

export const DOCUMENTS_BUCKET =
  process.env.SUPABASE_DOCUMENTS_BUCKET ?? 'documents';

export type StoredFileDocumentContent = {
  kind: 'file';
  bucket: string;
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
  note?: string;
};

export function isSupportedDocumentType(value: unknown): value is DocumentType {
  return (
    typeof value === 'string' && DOCUMENT_TYPE_SET.has(value as DocumentType)
  );
}

export function isSupportedDocumentStatus(
  value: unknown,
): value is DocumentStatus {
  return (
    typeof value === 'string' &&
    DOCUMENT_STATUS_SET.has(value as DocumentStatus)
  );
}

export function getStorageFolderByType(type: DocumentType): string {
  if (type === 'resume') {
    return 'resumes';
  }

  if (type === 'cover_letter') {
    return 'cover-letters';
  }

  return 'other';
}

export function sanitizeStorageFileName(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9._-]+/g, '-');
  const collapsed = safe.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return collapsed.length > 0 ? collapsed : 'document.bin';
}

export function buildStoragePath(params: {
  userId: string;
  type: DocumentType;
  fileName: string;
}): string {
  const safeFileName = sanitizeStorageFileName(params.fileName);
  const folder = getStorageFolderByType(params.type);
  return `${params.userId}/${folder}/${crypto.randomUUID()}-${safeFileName}`;
}

export function encodeStoredFileContent(
  content: StoredFileDocumentContent,
): string {
  return JSON.stringify(content);
}

export function tryParseStoredFileContent(
  value: string,
): StoredFileDocumentContent | null {
  try {
    const parsed = JSON.parse(value) as Partial<StoredFileDocumentContent>;

    if (
      parsed.kind !== 'file' ||
      typeof parsed.bucket !== 'string' ||
      typeof parsed.path !== 'string' ||
      typeof parsed.fileName !== 'string' ||
      typeof parsed.mimeType !== 'string' ||
      typeof parsed.size !== 'number'
    ) {
      return null;
    }

    return {
      kind: 'file',
      bucket: parsed.bucket,
      path: parsed.path,
      fileName: parsed.fileName,
      mimeType: parsed.mimeType,
      size: parsed.size,
      note: typeof parsed.note === 'string' ? parsed.note : undefined,
    };
  } catch {
    return null;
  }
}
