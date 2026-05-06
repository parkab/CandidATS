'use client';

import { useEffect, useState } from 'react';

type Document = {
  id: string;
  title: string;
  content: string;
  type: 'resume' | 'cover_letter' | 'other';
  created_at: string;
  updated_at: string;
  storage: {
    fileName: string;
    mimeType: string;
    size: number;
    note?: string;
    signedUrl: string | null;
    signedUrlError?: string;
  } | null;
};

type JobLibraryDocumentsSectionProps = {
  jobId: string;
  onDocumentLinked?: () => void;
};

export default function JobLibraryDocumentsSection({
  jobId,
  onDocumentLinked,
}: JobLibraryDocumentsSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLibraryDocuments();
  }, []);

  async function fetchLibraryDocuments() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/documents?library=true');

      if (!response.ok) {
        throw new Error('Failed to fetch library documents');
      }

      const data = await response.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  async function linkDocument(documentId: string) {
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        throw new Error('Failed to link document');
      }

      // Remove from library list
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      onDocumentLinked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link document');
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <h4 className="text-sm font-semibold text-(--foreground)">
          Link Library Documents
        </h4>
        <div className="flex items-center gap-2 text-sm text-(--text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent"></div>
          Loading library documents...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4">
        <h4 className="text-sm font-semibold text-(--foreground)">
          Link Library Documents
        </h4>
        <p className="text-sm text-red-600">Error loading library documents: {error}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="grid gap-4">
        <h4 className="text-sm font-semibold text-(--foreground)">
          Link Library Documents
        </h4>
        <p className="text-sm text-(--text-muted)">
          No library documents available to link. Create some documents first.
        </p>
      </div>
    );
  }

  const resumes = documents.filter((doc) => doc.type === 'resume');
  const coverLetters = documents.filter((doc) => doc.type === 'cover_letter');
  const otherDocuments = documents.filter((doc) => doc.type === 'other');

  return (
    <div className="grid gap-4">
      <h4 className="text-sm font-semibold text-(--foreground)">
        Link Library Documents
      </h4>

      {resumes.length > 0 && (
        <div className="grid gap-2">
          <h5 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wide">
            Resumes ({resumes.length})
          </h5>
          <div className="grid gap-2">
            {resumes.map((doc) => (
              <LibraryDocumentCard
                key={doc.id}
                document={doc}
                onLink={() => linkDocument(doc.id)}
              />
            ))}
          </div>
        </div>
      )}

      {coverLetters.length > 0 && (
        <div className="grid gap-2">
          <h5 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wide">
            Cover Letters ({coverLetters.length})
          </h5>
          <div className="grid gap-2">
            {coverLetters.map((doc) => (
              <LibraryDocumentCard
                key={doc.id}
                document={doc}
                onLink={() => linkDocument(doc.id)}
              />
            ))}
          </div>
        </div>
      )}

      {otherDocuments.length > 0 && (
        <div className="grid gap-2">
          <h5 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wide">
            Other Documents ({otherDocuments.length})
          </h5>
          <div className="grid gap-2">
            {otherDocuments.map((doc) => (
              <LibraryDocumentCard
                key={doc.id}
                document={doc}
                onLink={() => linkDocument(doc.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LibraryDocumentCard({
  document,
  onLink,
}: {
  document: Document;
  onLink: () => void;
}) {
  const [isLinking, setIsLinking] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    if (type === 'resume') {
      return 'Resume';
    }

    if (type === 'cover_letter') {
      return 'Cover Letter';
    }

    return 'Other';
  };

  const getTypeColor = (type: string) => {
    if (type === 'resume') {
      return 'bg-blue-100 text-blue-800';
    }

    if (type === 'cover_letter') {
      return 'bg-green-100 text-green-800';
    }

    return 'bg-amber-100 text-amber-800';
  };

  const handleLink = async () => {
    setIsLinking(true);
    try {
      await onLink();
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="rounded-md border border-(--surface-border) bg-(--surface-dimmed) p-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h6 className="text-sm font-semibold text-(--foreground) truncate">
              {document.title}
            </h6>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(document.type)}`}
            >
              {getTypeLabel(document.type)}
            </span>
          </div>
          <p className="text-xs text-(--text-muted)">
            Created: {formatDate(document.created_at)}
            {document.updated_at !== document.created_at && (
              <> • Updated: {formatDate(document.updated_at)}</>
            )}
          </p>
        </div>
        <button
          onClick={handleLink}
          disabled={isLinking}
          className="ml-2 inline-flex rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg) disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLinking ? 'Linking...' : 'Link to Job'}
        </button>
      </div>
    </div>
  );
}