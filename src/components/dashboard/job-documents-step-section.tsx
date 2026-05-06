'use client';

import Link from 'next/link';
import { useState } from 'react';
import type {
  JobDocumentItemDraft,
  JobMultiStepDraft,
} from '@/lib/jobs/multi-step-form';
import type { SectionComposerMode } from './job-multi-step-form-section-types';
import DocumentItemComposer from './job-document-item-composer';
import LinkDocumentsModal from './link-documents-modal';

type DocumentsStepSectionProps = {
  files: JobMultiStepDraft['documents']['files'];
  isLoading?: boolean;
  loadError?: string | null;
  documentDraft: JobDocumentItemDraft;
  isComposerOpen: boolean;
  composerMode: SectionComposerMode;
  editingDocumentId: string | null;
  jobId?: string;
  onOpenComposer: () => void;
  onEditDocument: (id: string) => void;
  onCloseComposer: () => void;
  onDocumentDraftChange: <K extends keyof JobDocumentItemDraft>(
    fieldName: K,
    value: JobDocumentItemDraft[K],
  ) => void;
  onDocumentFileSelected: (file: File | null) => void;
  onSaveDocument: () => void;
  onRemoveDocument: (id: string) => void;
  onDocumentsChanged?: () => void;
};

export default function DocumentsStepSection({
  files,
  isLoading = false,
  loadError = null,
  documentDraft,
  isComposerOpen,
  composerMode,
  editingDocumentId,
  jobId,
  onOpenComposer,
  onEditDocument,
  onCloseComposer,
  onDocumentDraftChange,
  onDocumentFileSelected,
  onSaveDocument,
  onRemoveDocument,
  onDocumentsChanged,
}: DocumentsStepSectionProps) {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const titleId = 'document-title';
  const dateId = 'document-date';
  const notesId = 'document-notes';
  const categoryId = 'document-category';
  const statusId = 'document-status';
  const tagsId = 'document-tags';
  const fileId = 'document-file';

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onOpenComposer}
          className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover)"
        >
          + Add Document
        </button>
        {jobId && (
          <button
            type="button"
            onClick={() => setIsLinkModalOpen(true)}
            className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover)"
          >
            Link from Library
          </button>
        )}
      </div>

      {jobId && (
        <LinkDocumentsModal
          jobId={jobId}
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          onDocumentLinked={() => {
            setIsLinkModalOpen(false);
            onDocumentsChanged?.();
          }}
        />
      )}

      {isComposerOpen && composerMode === 'add' ? (
        <DocumentItemComposer
          titleId={titleId}
          dateId={dateId}
          notesId={notesId}
          categoryId={categoryId}
          statusId={statusId}
          tagsId={tagsId}
          fileId={fileId}
          documentDraft={documentDraft}
          onTitleChange={(value) => onDocumentDraftChange('title', value)}
          onDateChange={(value) => onDocumentDraftChange('date', value)}
          onNotesChange={(value) => onDocumentDraftChange('notes', value)}
          onDocumentTypeChange={(value) =>
            onDocumentDraftChange('documentType', value)
          }
          onStatusChange={(value) => onDocumentDraftChange('status', value)}
          onTagsChange={(value) => onDocumentDraftChange('tags', value)}
          onFileChange={onDocumentFileSelected}
          onClose={onCloseComposer}
          onSave={onSaveDocument}
          saveLabel="Add document"
        />
      ) : null}

      {isLoading ? (
        <p className="text-center text-sm text-(--text-muted)">
          Loading documents...
        </p>
      ) : null}

      {loadError ? (
        <p className="text-center text-sm text-(--danger-text)">{loadError}</p>
      ) : null}

      {files.length > 0 ? (
        <ul className="grid gap-3" aria-label="Document items">
          {files.map((file) => {
            const isGenerated = file.isAiGenerated ?? false;
            return (
              <li key={file.id} className="item-card rounded-lg p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-(--foreground)">
                      {file.title || 'Document'}
                    </p>
                    {file.date ? (
                      <p className="text-xs text-(--text-muted)">{file.date}</p>
                    ) : null}
                    <p className="text-xs text-(--text-muted) wrap-break-word">
                      Status: {file.status}
                      {file.tags.length > 0
                        ? ` • Tags: ${file.tags.join(', ')}`
                        : ''}
                    </p>
                    {file.notes ? (
                      <p className="mt-1 text-sm text-(--text-muted)">
                        {file.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:self-start">
                    <Link
                      href={`/documents/${file.id}/view`}
                      className="flex-none whitespace-nowrap rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
                    >
                      View/Download
                    </Link>
                    {isGenerated && (
                      <Link
                        href={`/documents/${file.id}/edit`}
                        className="flex-none whitespace-nowrap rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
                      >
                        Edit Document
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => onEditDocument(file.id)}
                      className="flex-none whitespace-nowrap rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
                    >
                      Edit Details
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveDocument(file.id)}
                      className="flex-none whitespace-nowrap rounded-md border border-(--danger-border) px-3 py-1.5 text-xs font-semibold text-(--danger-text) transition hover:bg-(--danger-bg)"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {isComposerOpen &&
                composerMode === 'edit' &&
                editingDocumentId === file.id ? (
                  <div className="mt-3 border-t border-(--surface-divider) pt-3">
                    <DocumentItemComposer
                      titleId={titleId}
                      dateId={dateId}
                      notesId={notesId}
                      categoryId={categoryId}
                      statusId={statusId}
                      tagsId={tagsId}
                      fileId={fileId}
                      documentDraft={documentDraft}
                      onTitleChange={(value) =>
                        onDocumentDraftChange('title', value)
                      }
                      onDateChange={(value) =>
                        onDocumentDraftChange('date', value)
                      }
                      onNotesChange={(value) =>
                        onDocumentDraftChange('notes', value)
                      }
                      onDocumentTypeChange={(value) =>
                        onDocumentDraftChange('documentType', value)
                      }
                      onStatusChange={(value) =>
                        onDocumentDraftChange('status', value)
                      }
                      onTagsChange={(value) =>
                        onDocumentDraftChange('tags', value)
                      }
                      onFileChange={onDocumentFileSelected}
                      onClose={onCloseComposer}
                      onSave={onSaveDocument}
                      saveLabel="Save document"
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : !isLoading ? (
        <p className="text-center text-sm text-(--text-muted)">
          No documents added yet.
        </p>
      ) : null}
    </section>
  );
}
