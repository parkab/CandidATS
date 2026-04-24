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
  } | null;
};

type JobSavedDocumentsSectionProps = {
  jobId: string;
};

export default function JobSavedDocumentsSection({
  jobId,
}: JobSavedDocumentsSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [jobId]);

  async function fetchDocuments() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/documents?jobId=${jobId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <h4 className="text-sm font-semibold text-(--foreground)">
          Saved Documents
        </h4>
        <div className="flex items-center gap-2 text-sm text-(--text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent"></div>
          Loading documents...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4">
        <h4 className="text-sm font-semibold text-(--foreground)">
          Saved Documents
        </h4>
        <p className="text-sm text-red-600">Error loading documents: {error}</p>
      </div>
    );
  }

  const resumes = documents.filter((doc) => doc.type === 'resume');
  const coverLetters = documents.filter((doc) => doc.type === 'cover_letter');
  const otherDocuments = documents.filter((doc) => doc.type === 'other');

  if (documents.length === 0) {
    return (
      <div className="grid gap-4">
        <h4 className="text-sm font-semibold text-(--foreground)">
          Saved Documents
        </h4>
        <p className="text-sm text-(--text-muted)">
          No documents have been saved for this job yet. Generate and save
          resumes or cover letters to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <h4 className="text-sm font-semibold text-(--foreground)">
        Saved Documents
      </h4>

      {resumes.length > 0 && (
        <div className="grid gap-2">
          <h5 className="text-xs font-semibold text-(--text-muted) uppercase tracking-wide">
            Resumes ({resumes.length})
          </h5>
          <div className="grid gap-2">
            {resumes.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
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
              <DocumentCard key={doc.id} document={doc} />
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
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentCard({ document }: { document: Document }) {
  const [isExpanded, setIsExpanded] = useState(false);

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
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-2 text-xs text-(--text-muted) hover:text-(--foreground)"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3">
          {document.storage?.signedUrl ? (
            <a
              href={document.storage.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 inline-flex rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
            >
              Open file
            </a>
          ) : null}
          <div className="rounded border bg-(--background) p-3">
            <pre className="whitespace-pre-wrap text-xs text-(--foreground) leading-relaxed">
              {document.storage
                ? document.storage.note || 'Stored file document'
                : document.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
