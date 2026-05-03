'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Document = {
  id: string;
  title: string;
  content: string;
  type: 'resume' | 'cover_letter' | 'other';
  status: 'draft' | 'ready' | 'archived';
  tags: string[];
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

  function handleDocumentUpdated(updated: Document) {
    setDocuments((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d)),
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
              <DocumentCard
                key={doc.id}
                document={doc}
                onDocumentUpdated={handleDocumentUpdated}
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
              <DocumentCard
                key={doc.id}
                document={doc}
                onDocumentUpdated={handleDocumentUpdated}
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
              <DocumentCard
                key={doc.id}
                document={doc}
                onDocumentUpdated={handleDocumentUpdated}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentCard({
  document,
  onDocumentUpdated,
}: {
  document: Document;
  onDocumentUpdated: (updated: Document) => void;
}) {
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState(document.title);
  const [editType, setEditType] = useState(document.type);
  const [editStatus, setEditStatus] = useState(document.status);
  const [editTags, setEditTags] = useState(document.tags.join(', '));
  const [editNote, setEditNote] = useState(document.storage?.note ?? '');

  const isGenerated = document.storage === null;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getTypeLabel = (type: string) => {
    if (type === 'resume') return 'Resume';
    if (type === 'cover_letter') return 'Cover Letter';
    return 'Other';
  };

  const getTypeColor = (type: string) => {
    if (type === 'resume') return 'bg-blue-100 text-blue-800';
    if (type === 'cover_letter') return 'bg-green-100 text-green-800';
    return 'bg-amber-100 text-amber-800';
  };

  function handleOpenEditDetails() {
    setEditTitle(document.title);
    setEditType(document.type);
    setEditStatus(document.status);
    setEditTags(document.tags.join(', '));
    setEditNote(document.storage?.note ?? '');
    setDetailsError(null);
    setIsEditingDetails(true);
  }

  async function handleSaveDetails() {
    setIsSavingDetails(true);
    setDetailsError(null);
    try {
      const tags = editTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const res = await fetch(`/api/documents/${encodeURIComponent(document.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim() || document.title,
          type: editType,
          status: editStatus,
          tags,
          ...(document.storage !== null ? { note: editNote } : {}),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: 'Save failed' }))) as {
          error: string;
        };
        throw new Error(err.error);
      }
      const payload = (await res.json()) as { document: Document };
      onDocumentUpdated(payload.document);
      setIsEditingDetails(false);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSavingDetails(false);
    }
  }

  return (
    <div className="rounded-md border border-(--surface-border) bg-(--surface-dimmed) p-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h6 className="truncate text-sm font-semibold text-(--foreground)">
              {document.title}
            </h6>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(document.type)}`}
            >
              {getTypeLabel(document.type)}
            </span>
          </div>
          <p className="text-xs text-(--text-muted)">
            {formatDate(document.created_at)}
            {document.status !== 'draft' && (
              <> · <span className="capitalize">{document.status}</span></>
            )}
            {document.tags.length > 0 && (
              <> · {document.tags.join(', ')}</>
            )}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        {isGenerated ? (
          <>
            <Link
              href={`/documents/${document.id}/view`}
              className="inline-flex items-center rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
            >
              View
            </Link>
            <Link
              href={`/documents/${document.id}/edit`}
              className="inline-flex items-center rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
            >
              Edit Document
            </Link>
          </>
        ) : (
          <Link
            href={`/documents/${document.id}/view`}
            className="inline-flex items-center rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
          >
            View
          </Link>
        )}
        <button
          type="button"
          onClick={isEditingDetails ? () => setIsEditingDetails(false) : handleOpenEditDetails}
          className="rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
        >
          {isEditingDetails ? 'Cancel' : 'Edit Details'}
        </button>
      </div>

      {/* Edit Details inline form */}
      {isEditingDetails && (
        <div className="mt-3 grid gap-3 border-t border-(--surface-border) pt-3">
          <div className="grid gap-1">
            <label className="text-xs font-medium text-(--foreground)">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="rounded border border-(--surface-border) bg-(--background) px-2 py-1 text-sm text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--foreground)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <label className="text-xs font-medium text-(--foreground)">Category</label>
              <select
                value={editType}
                onChange={(e) =>
                  setEditType(e.target.value as 'resume' | 'cover_letter' | 'other')
                }
                className="rounded border border-(--surface-border) bg-(--background) px-2 py-1 text-sm text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--foreground)"
              >
                <option value="resume">Resume</option>
                <option value="cover_letter">Cover Letter</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-medium text-(--foreground)">Status</label>
              <select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(e.target.value as 'draft' | 'ready' | 'archived')
                }
                className="rounded border border-(--surface-border) bg-(--background) px-2 py-1 text-sm text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--foreground)"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="grid gap-1">
            <label className="text-xs font-medium text-(--foreground)">
              Tags <span className="font-normal text-(--text-muted)">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              placeholder="e.g. tailored, v2, final"
              className="rounded border border-(--surface-border) bg-(--background) px-2 py-1 text-sm text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--foreground)"
            />
          </div>
          {document.storage !== null && (
            <div className="grid gap-1">
              <label className="text-xs font-medium text-(--foreground)">Note</label>
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional note"
                className="rounded border border-(--surface-border) bg-(--background) px-2 py-1 text-sm text-(--foreground) focus:outline-none focus:ring-1 focus:ring-(--foreground)"
              />
            </div>
          )}
          {detailsError && (
            <p className="text-xs text-(--danger-text)">{detailsError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveDetails}
              disabled={isSavingDetails}
              className="rounded-md bg-(--foreground) px-3 py-1.5 text-xs font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingDetails ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditingDetails(false)}
              className="rounded-md border border-(--surface-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-hover)"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
