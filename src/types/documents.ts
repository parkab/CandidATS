export type Document = {
  id: string;
  user_id: string;
  job_id: string | null;
  title: string;
  content: string;
  type: 'resume' | 'cover_letter' | 'other';
  status: 'draft' | 'ready' | 'archived';
  tags: string[];
  created_at: string;
  updated_at: string;
  storage?: {
    fileName: string;
    mimeType: string;
    size: number;
    note?: string;
    signedUrl: string | null;
    signedUrlError?: string;
  } | null;
};
