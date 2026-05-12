import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { tryParseStoredFileContent } from '@/lib/documents/metadata';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';
import { createPdfSignedUrl } from '@/lib/storage/pdf';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = await context.params;

    const document = await prisma.document.findFirst({
      where: { id: documentId, user_id: session.userId },
      select: { id: true, title: true, content: true, job_id: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Generated document path: DocumentVersion.pdfUrl
    const version = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
      select: { pdfUrl: true },
    });

    if (version?.pdfUrl) {
      const signedUrl = await createPdfSignedUrl(version.pdfUrl);
      return NextResponse.json({
        title: document.title,
        signedUrl,
        mimeType: 'application/pdf',
        jobId: document.job_id ?? null,
      });
    }

    // Uploaded file path: StoredFileDocumentContent in document.content
    const storedFile = tryParseStoredFileContent(document.content);
    if (storedFile) {
      let signedUrl: string | null = null;
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin.storage
          .from(storedFile.bucket)
          .createSignedUrl(storedFile.path, 60 * 60);
        signedUrl = data?.signedUrl ?? null;
      }
      return NextResponse.json({
        title: document.title,
        signedUrl,
        mimeType: storedFile.mimeType,
        jobId: document.job_id ?? null,
      });
    }

    if (document.content && document.content.trim().length > 0) {
      return NextResponse.json({
        title: document.title,
        signedUrl: null,
        mimeType: 'text/plain',
        content: document.content,
        jobId: document.job_id ?? null,
      });
    }

    return NextResponse.json({
      title: document.title,
      signedUrl: null,
      mimeType: 'application/pdf',
      jobId: document.job_id ?? null,
    });
  } catch (error) {
    console.error('[pdf GET] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
