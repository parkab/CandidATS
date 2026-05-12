'use client';

import { useEffect, useState } from 'react';
import type { Document } from '@/types/documents';

type LinkDocumentsModalProps = {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  onDocumentLinked: () => void;
};

export default function LinkDocumentsModal({
  jobId,
  isOpen,
  onClose,
  onDocumentLinked,
}: LinkDocumentsModalProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchDocuments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/documents?library=true');
        if (!response.ok) {
          throw new Error('Failed to fetch library documents');
        }
        const data = await response.json();
        setDocuments(data.documents || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch documents',
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [isOpen]);

  const handleLinkDocument = async (documentId: string) => {
    setIsLinking(documentId);
    try {
      const response = await fetch(`/api/documents/${documentId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        throw new Error('Failed to link document');
      }

      onDocumentLinked();
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link document');
    } finally {
      setIsLinking(null);
    }
  };

  const filteredDocuments = documents
    .filter((doc) => !doc.job_id) // Only show documents not linked to any job
    .filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  if (!isOpen) return null;

  const dialogTitleId = 'link-documents-title';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
    >
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-lg bg-(--background) shadow-lg">
        {/* Header */}
        <div className="border-b border-(--surface-border) p-6">
          <div className="flex items-center justify-between mb-4">
            <h2
              id={dialogTitleId}
              className="text-xl font-semibold text-(--foreground)"
            >
              Link Documents
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-xl text-(--text-muted) hover:text-(--foreground)"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="Search documents by title or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-(--surface-border) bg-(--surface) px-3 py-2 text-sm text-(--foreground) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--foreground)"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <p className="text-center text-sm text-(--text-muted)">
              Loading documents...
            </p>
          ) : error ? (
            <p className="text-center text-sm text-(--danger-text)">{error}</p>
          ) : filteredDocuments.length === 0 ? (
            <p className="text-center text-sm text-(--text-muted)">
              {searchQuery
                ? 'No documents match your search'
                : 'No library documents available'}
            </p>
          ) : (
            <ul className="grid gap-3" aria-label="Library documents">
              {filteredDocuments.map((doc) => (
                <li
                  key={doc.id}
                  className="rounded-lg border border-(--surface-border) p-4 hover:bg-(--surface) transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-(--foreground)">
                        {doc.title}
                      </p>
                      <p className="text-xs text-(--text-muted) mt-1">
                        Type: {doc.type} • Status: {doc.status}
                      </p>
                      {doc.tags.length > 0 && (
                        <p className="text-xs text-(--text-muted) mt-1">
                          Tags: {doc.tags.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleLinkDocument(doc.id)}
                      disabled={isLinking === doc.id}
                      className="flex-none whitespace-nowrap rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLinking === doc.id ? 'Linking...' : 'Link'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-(--surface-border) p-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
