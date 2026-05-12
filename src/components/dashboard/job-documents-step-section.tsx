'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type {
  JobCompanyResearchDraft,
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
  jobData?: {
    title: string;
    company_name: string;
    location: string;
    job_description: string;
  };
  companyResearch?: JobCompanyResearchDraft;
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
  onCompanyResearchChange?: (content: string) => void;
  onUserContextChange?: (context: string) => void;
  onSavedAsDocument?: (content: string) => void;
  onRefreshDocuments?: () => void;
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
  jobData,
  companyResearch,
  onOpenComposer,
  onEditDocument,
  onCloseComposer,
  onDocumentDraftChange,
  onDocumentFileSelected,
  onSaveDocument,
  onRemoveDocument,
  onDocumentsChanged,
  onCompanyResearchChange,
  onUserContextChange,
  onSavedAsDocument,
  onRefreshDocuments,
}: DocumentsStepSectionProps) {
  const router = useRouter();
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isGenerateMenuOpen, setIsGenerateMenuOpen] = useState(false);
  const [showResearchPanel, setShowResearchPanel] = useState(false);
  const [editingResearchId, setEditingResearchId] = useState<string | null>(
    null,
  );
  const [editingResearchContent, setEditingResearchContent] = useState('');
  const [editingResearchUserContext, setEditingResearchUserContext] =
    useState('');
  const [optionsMenuId, setOptionsMenuId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<
    'resume' | 'cover_letter' | 'research' | null
  >(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isSavingResearch, setIsSavingResearch] = useState(false);
  const titleId = 'document-title';
  const dateId = 'document-date';
  const notesId = 'document-notes';
  const categoryId = 'document-category';
  const statusId = 'document-status';
  const tagsId = 'document-tags';
  const fileId = 'document-file';

  const canGenerate = Boolean(jobId || jobData);
  const researchDraft = companyResearch ?? {
    content: '',
    isGenerating: false,
    userContext: '',
  };

  function getStatusLabel(status: JobDocumentItemDraft['status']) {
    if (status === 'ready') return 'Ready';
    if (status === 'archived') return 'Archived';
    return 'Draft';
  }

  function getStatusPillClass(status: JobDocumentItemDraft['status']) {
    if (status === 'ready') return 'bg-emerald-100 text-emerald-800';
    if (status === 'archived') return 'bg-gray-200 text-gray-800';
    return 'bg-amber-100 text-amber-800';
  }

  async function generateResume() {
    if (!jobId && !jobData) return;
    setIsGenerating('resume');
    setGenerateError(null);

    try {
      const aiRes = await fetch('/api/ai/resume-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobId ? { jobId } : { jobData }),
      });
      if (!aiRes.ok) {
        const err = (await aiRes
          .json()
          .catch(() => ({ error: 'Generation failed' }))) as {
          error: string;
        };
        throw new Error(err.error);
      }
      const { templateName, structuredData } = (await aiRes.json()) as {
        templateName: string;
        structuredData: unknown;
      };

      if (!jobId) {
        setGenerateError('Save the job first to open the resume editor.');
        return;
      }

      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          type: 'resume',
          title: `Resume - ${jobData?.company_name ?? 'Draft'} ${new Date().toLocaleDateString()}`,
          content: JSON.stringify(structuredData),
          status: 'draft',
        }),
      });
      if (!docRes.ok) throw new Error('Failed to create document');
      const docData = (await docRes.json()) as { document: { id: string } };

      sessionStorage.setItem(
        `pendingDraft_${docData.document.id}`,
        JSON.stringify({ templateName, structuredData }),
      );

      router.push(`/documents/${docData.document.id}/edit`);
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : 'Generation failed',
      );
    } finally {
      setIsGenerating(null);
    }
  }

  async function generateCoverLetter() {
    if (!jobId && !jobData) return;
    setIsGenerating('cover_letter');
    setGenerateError(null);

    try {
      const aiRes = await fetch('/api/ai/cover-letter-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobId ? { jobId } : { jobData }),
      });
      if (!aiRes.ok) {
        const err = (await aiRes
          .json()
          .catch(() => ({ error: 'Generation failed' }))) as {
          error: string;
        };
        throw new Error(err.error);
      }
      const { templateName, structuredData } = (await aiRes.json()) as {
        templateName: string;
        structuredData: unknown;
      };

      if (!jobId) {
        setGenerateError('Save the job first to open the cover letter editor.');
        return;
      }

      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          type: 'cover_letter',
          title: `Cover Letter - ${jobData?.company_name ?? 'Draft'} ${new Date().toLocaleDateString()}`,
          content: JSON.stringify(structuredData),
          status: 'draft',
        }),
      });
      if (!docRes.ok) throw new Error('Failed to create document');
      const docData = (await docRes.json()) as { document: { id: string } };

      sessionStorage.setItem(
        `pendingDraft_${docData.document.id}`,
        JSON.stringify({ templateName, structuredData }),
      );

      router.push(`/documents/${docData.document.id}/edit`);
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : 'Generation failed',
      );
    } finally {
      setIsGenerating(null);
    }
  }

  async function generateResearch() {
    if (!jobId && !jobData) return;
    setIsGenerating('research');
    setGenerateError(null);

    try {
      const requestBody = jobId
        ? {
            jobId,
            userContext: researchDraft.userContext || '',
          }
        : {
            jobData: {
              ...jobData,
              company_name: jobData?.company_name,
            },
            userContext: researchDraft.userContext || '',
          };

      const response = await fetch('/api/ai/company-research-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      onCompanyResearchChange?.(data.research);
      setShowResearchPanel(true);
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : 'Generation failed',
      );
    } finally {
      setIsGenerating(null);
    }
  }

  async function saveResearch() {
    if (!jobId || !researchDraft.content.trim()) {
      return;
    }

    try {
      setIsSavingResearch(true);
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Company Research for ${jobData?.company_name || 'Unknown Company'} - ${new Date().toLocaleDateString()}`,
          content: researchDraft.content,
          type: 'other',
          jobId,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      onSavedAsDocument?.(researchDraft.content);
      onRefreshDocuments?.();
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : 'Unable to save research.',
      );
    } finally {
      setIsSavingResearch(false);
    }
  }

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
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsGenerateMenuOpen((previous) => !previous)}
            disabled={!canGenerate}
            className="rounded-md bg-[linear-gradient(to_right,#ff75c3_0%,#ffa647_20%,#ffe83f_40%,#9fff5b_60%,#70e2ff_80%,#cd93ff_100%)] px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            aria-expanded={isGenerateMenuOpen}
            aria-haspopup="menu"
          >
            Generate
          </button>
          {isGenerateMenuOpen ? (
            <div
              role="menu"
              className="absolute left-0 z-10 mt-2 w-48 rounded-lg border border-(--surface-border) bg-(--background) p-2 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsGenerateMenuOpen(false);
                  generateResume();
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-(--foreground) transition hover:bg-(--surface-hover)"
              >
                Resume
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsGenerateMenuOpen(false);
                  generateCoverLetter();
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-(--foreground) transition hover:bg-(--surface-hover)"
              >
                Cover Letter
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsGenerateMenuOpen(false);
                  setShowResearchPanel(true);
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-(--foreground) transition hover:bg-(--surface-hover)"
              >
                Research
              </button>
            </div>
          ) : null}
        </div>
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

      {generateError ? (
        <p className="text-center text-sm text-(--danger-text)">
          {generateError}
        </p>
      ) : null}

      {(isGenerating === 'resume' || isGenerating === 'cover_letter') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--background)/95">
          <div className="flex items-center gap-2 text-sm text-(--text-muted)">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent" />
            Loading document...
          </div>
        </div>
      )}

      {showResearchPanel ? (
        <div className="grid gap-3 rounded-lg border border-(--surface-border) bg-(--background) p-4">
          <div>
            <h4 className="text-md font-semibold text-(--foreground)">
              Company Research
            </h4>
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="documents-research-focus"
              className="text-sm font-semibold text-(--foreground)"
            >
              Research Focus (Optional)
            </label>
            <div className="profile-input-wrap">
              <textarea
                id="documents-research-focus"
                value={researchDraft.userContext}
                onChange={(event) => onUserContextChange?.(event.target.value)}
                placeholder="E.g.: Work-life balance, leadership changes, recent launches..."
                className="profile-input profile-textarea"
                disabled={isGenerating === 'research'}
              />
            </div>
            {!canGenerate ? (
              <p className="text-xs text-(--text-muted)">
                Save the job first to enable research generation.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateResearch}
              disabled={!canGenerate || isGenerating !== null}
              className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating === 'research'
                ? 'Researching...'
                : 'Generate Research'}
            </button>
          </div>

          {isGenerating === 'research' ? (
            <div className="flex items-center gap-2 text-sm text-(--text-muted)">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent" />
              Researching company with AI...
            </div>
          ) : null}

          <div className="grid gap-2">
            <label
              htmlFor="documents-research-results"
              className="text-sm font-semibold text-(--foreground)"
            >
              Research Results
            </label>
            <div className="profile-input-wrap">
              <textarea
                id="documents-research-results"
                value={researchDraft.content}
                onChange={(event) =>
                  onCompanyResearchChange?.(event.target.value)
                }
                placeholder="Generated research appears here."
                className="profile-input profile-textarea min-h-40"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowResearchPanel(false)}
              className="rounded-md border border-(--danger-border) px-4 py-2 text-sm font-semibold text-(--danger-text) transition hover:bg-(--danger-bg)"
            >
              Close
            </button>
            <button
              type="button"
              onClick={saveResearch}
              disabled={!researchDraft.content.trim() || isSavingResearch}
              className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg) disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingResearch ? 'Saving...' : 'Save Research'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Edit Research Document Panel */}
      {editingResearchId ? (
        <div className="rounded-lg border border-(--surface-border) bg-(--background) p-4">
          <div className="mb-4 grid gap-2">
            <h3 className="text-md font-semibold text-(--foreground)">
              Edit Research Document
            </h3>
          </div>

          <div className="mb-4 grid gap-2">
            <label
              htmlFor="edit-research-context"
              className="text-sm font-semibold text-(--foreground)"
            >
              Research Focus (Optional)
            </label>
            <div className="profile-input-wrap">
              <textarea
                id="edit-research-context"
                value={editingResearchUserContext}
                onChange={(e) => setEditingResearchUserContext(e.target.value)}
                placeholder="e.g.: What is their work-life balance like? How do they treat remote employees?"
                className="profile-input min-h-16 px-3 py-2 text-sm text-(--foreground) placeholder:text-(--text-muted) focus:border-(--foreground) focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-4 grid gap-2">
            <label
              htmlFor="edit-research-content"
              className="text-sm font-semibold text-(--foreground)"
            >
              Research Content
            </label>
            <div className="profile-input-wrap">
              <textarea
                id="edit-research-content"
                value={editingResearchContent}
                onChange={(e) => setEditingResearchContent(e.target.value)}
                placeholder="Research content"
                className="profile-input min-h-40 px-3 py-2 text-md text-(--foreground) placeholder:text-(--text-muted) focus:border-(--foreground)"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingResearchId(null)}
              className="rounded-md border border-(--danger-border) px-4 py-2 text-sm font-semibold text-(--danger-text) transition hover:bg-(--danger-bg)"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!jobId && !jobData) return;
                setIsGenerating('research');
                try {
                  const requestBody = jobId
                    ? {
                        jobId,
                        userContext: editingResearchUserContext,
                      }
                    : {
                        jobData,
                        userContext: editingResearchUserContext,
                      };

                  const response = await fetch(
                    '/api/ai/company-research-draft',
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(requestBody),
                    },
                  );

                  if (!response.ok) {
                    const errorData = await response
                      .json()
                      .catch(() => ({ error: 'Unknown error' }));
                    throw new Error(
                      errorData.error || `HTTP ${response.status}`,
                    );
                  }

                  const data = await response.json();
                  setEditingResearchContent(data.research);
                } catch (error) {
                  const errorMessage =
                    error instanceof Error ? error.message : 'Unknown error';
                  alert(`Failed to regenerate research: ${errorMessage}`);
                } finally {
                  setIsGenerating(null);
                }
              }}
              disabled={isGenerating !== null || (!jobId && !jobData)}
              className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating === 'research'
                ? 'Regenerating...'
                : 'Regenerate Research'}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!editingResearchContent.trim()) return;
                setIsSavingResearch(true);
                try {
                  const response = await fetch(
                    `/api/documents/${editingResearchId}`,
                    {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        content: editingResearchContent,
                      }),
                    },
                  );

                  if (!response.ok) {
                    const errorData = await response
                      .json()
                      .catch(() => ({ error: 'Unknown error' }));
                    throw new Error(
                      errorData.error || `HTTP ${response.status}`,
                    );
                  }

                  setEditingResearchId(null);
                  setEditingResearchContent('');
                  setEditingResearchUserContext('');
                  onRefreshDocuments?.();
                } catch (error) {
                  const errorMessage =
                    error instanceof Error ? error.message : 'Unknown error';
                  alert(`Failed to save research: ${errorMessage}`);
                } finally {
                  setIsSavingResearch(false);
                }
              }}
              disabled={!editingResearchContent.trim() || isSavingResearch}
              className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg) disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingResearch ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
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
            const statusLabel = getStatusLabel(file.status);
            const statusClass = getStatusPillClass(file.status);
            const visibleTags = file.tags.slice(0, 2);
            const remainingTags = file.tags.length - visibleTags.length;
            return (
              <li
                key={file.id}
                className="item-card relative overflow-visible rounded-lg p-3"
              >
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-(--foreground)">
                        {file.title || 'Document'}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-(--surface-border) bg-(--surface-dimmed) px-2 py-0.5 text-xs font-medium text-(--text-muted)">
                        v{file.versionNumber}
                      </span>
                    </div>
                    {file.date ? (
                      <p className="text-xs text-(--text-muted)">{file.date}</p>
                    ) : null}
                    {file.notes ? (
                      <p className="mt-1 truncate text-sm text-(--text-muted)">
                        {file.notes}
                      </p>
                    ) : null}
                    {file.tags.length > 0 ? (
                      <div className="mt-2 flex items-center gap-1 overflow-hidden">
                        {visibleTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex shrink-0 items-center rounded-full border border-(--surface-border) px-2 py-0.5 text-xs font-semibold text-(--foreground)"
                          >
                            {tag}
                          </span>
                        ))}
                        {remainingTags > 0 ? (
                          <span className="inline-flex shrink-0 items-center rounded-full border border-(--surface-border) px-2 py-0.5 text-xs font-semibold text-(--text-muted)">
                            +{remainingTags} more
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="relative flex items-start justify-end overflow-visible">
                    <button
                      type="button"
                      onClick={() =>
                        setOptionsMenuId((current) =>
                          current === file.id ? null : file.id,
                        )
                      }
                      className="flex items-center gap-2 rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
                      aria-expanded={optionsMenuId === file.id}
                      aria-haspopup="menu"
                    >
                      Options
                      <span
                        className={`transition-transform ${
                          optionsMenuId === file.id ? 'rotate-180' : ''
                        }`}
                      >
                        ▼
                      </span>
                    </button>

                    {optionsMenuId === file.id && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-9999 mt-2 w-44 rounded-lg border border-(--surface-border) bg-(--background) p-2 shadow-xl"
                      >
                        <Link
                          href={`/documents/${file.id}/view`}
                          role="menuitem"
                          className="block rounded-md px-3 py-2 text-left text-xs font-semibold text-(--foreground) transition hover:bg-(--surface-hover)"
                          onClick={() => setOptionsMenuId(null)}
                        >
                          View/Download
                        </Link>

                        {isGenerated && file.documentType !== 'other' && (
                          <Link
                            href={`/documents/${file.id}/edit`}
                            role="menuitem"
                            className="block rounded-md px-3 py-2 text-left text-xs font-semibold text-(--foreground) transition hover:bg-(--surface-hover)"
                            onClick={() => setOptionsMenuId(null)}
                          >
                            Edit Document
                          </Link>
                        )}

                        {isGenerated && file.documentType === 'other' && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={async () => {
                              setOptionsMenuId(null);
                              setEditingResearchId(file.id);
                              // Fetch the full document content
                              try {
                                const res = await fetch(
                                  `/api/documents/${file.id}`,
                                );
                                if (res.ok) {
                                  const doc = (await res.json()) as {
                                    content?: string;
                                    notes?: string;
                                  };
                                  setEditingResearchContent(doc.content || '');
                                  setEditingResearchUserContext('');
                                } else {
                                  setEditingResearchContent('');
                                }
                              } catch (error) {
                                console.error(
                                  'Failed to load research document:',
                                  error,
                                );
                                setEditingResearchContent('');
                              }
                            }}
                            className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-(--foreground) transition hover:bg-(--surface-hover)"
                          >
                            Edit Document
                          </button>
                        )}

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOptionsMenuId(null);
                            onEditDocument(file.id);
                          }}
                          className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-(--foreground) transition hover:bg-(--surface-hover)"
                        >
                          Edit Details
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOptionsMenuId(null);
                            onRemoveDocument(file.id);
                          }}
                          className="block w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-(--danger-text) transition hover:bg-(--danger-bg)"
                        >
                          Remove
                        </button>
                      </div>
                    )}
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
