import { supabaseAdmin } from '@/lib/supabase';
import {
  DOCUMENTS_BUCKET,
  getStorageFolderByType,
} from '@/lib/documents/metadata';

export async function uploadPdf(params: {
  userId: string;
  buffer: Buffer;
  type: 'resume' | 'cover_letter';
}): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Storage service unavailable');
  }

  const folder = getStorageFolderByType(params.type);
  const path = `${params.userId}/${folder}/${crypto.randomUUID()}.pdf`;

  const { error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, params.buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(`PDF upload failed: ${error.message}`);
  }

  return path;
}

export async function createPdfSignedUrl(
  path: string,
): Promise<string | null> {
  if (!supabaseAdmin) return null;

  const { data } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return data?.signedUrl ?? null;
}
