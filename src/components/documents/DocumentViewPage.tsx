'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type FileResponse = {
  title: string;
  signedUrl: string | null;
  mimeType: string;
};

function fileExtension(mimeType: string): string {
  if (mimeType === 'text/plain') return '.txt';
  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return '.docx';
  return '.pdf';
}

function safeFileName(title: string): string {
  const stripped = (title || 'document').replace(/\.(pdf|docx|doc|txt)$/i, '');
  return stripped.replace(/[^\w\s.-]/g, '-').trim() || 'document';
}

export default function DocumentViewPage({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('application/pdf');
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/documents/${documentId}/pdf`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        return res.json() as Promise<FileResponse>;
      })
      .then(async (data) => {
        setTitle(data.title);
        const mime = data.mimeType ?? 'application/pdf';
        setMimeType(mime);
        setSignedUrl(data.signedUrl);

        if (mime === 'text/plain' && data.signedUrl) {
          try {
            const textRes = await fetch(data.signedUrl);
            setTextContent(textRes.ok ? await textRes.text() : null);
          } catch {
            setTextContent(null);
          }
        }
      })
      .catch(() => setError('Failed to load document.'))
      .finally(() => setLoading(false));
  }, [documentId]);

  function handleDownload() {
    if (!signedUrl) return;
    const a = document.createElement('a');
    a.href = signedUrl;
    a.download = `${safeFileName(title)}${fileExtension(mimeType)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-(--text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent" />
          Loading document...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-5rem)] flex-col items-center justify-center gap-4">
        <p className="text-sm text-(--danger-text)">{error}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-(--surface-border) px-4 py-2 text-sm font-semibold text-(--foreground) hover:bg-(--action-hover)"
        >
          Go Back
        </button>
      </div>
    );
  }

  function renderContent() {
    if (!signedUrl) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-(--text-muted)">
          No file available for this document. Save the document from the editor
          first.
        </div>
      );
    }

    if (mimeType === 'application/pdf') {
      return (
        <iframe
          src={signedUrl}
          className="h-full w-full border-none"
          title="Document PDF"
        />
      );
    }

    if (mimeType === 'text/plain') {
      return (
        <div className="flex-1 overflow-auto p-6">
          <pre className="whitespace-pre-wrap font-mono text-sm text-(--foreground)">
            {textContent ?? 'Unable to load text content.'}
          </pre>
        </div>
      );
    }

    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-(--text-muted)">
          <p>Preview not available for DOCX files.</p>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-hover)"
          >
            Download to view
          </button>
        </div>
      );
    }

    return (
      <div className="flex h-full items-center justify-center text-sm text-(--text-muted)">
        Preview not available. Use the Download button to access the file.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-(--surface-border) bg-(--background) px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded px-2 py-1 text-sm text-(--text-muted) hover:bg-(--action-hover)"
        >
          ← Back
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-(--foreground)">
          {title || 'Document'}
        </span>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!signedUrl}
          className="rounded-md border border-(--surface-border) px-3 py-1.5 text-sm font-semibold text-(--foreground) transition-all hover:-translate-y-0.5 hover:border-(--foreground) hover:bg-(--action-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download
        </button>
      </div>

      {renderContent()}
    </div>
  );
}
