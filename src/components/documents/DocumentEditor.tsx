'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ResumeData, CoverLetterData } from '@/lib/latex/types';
import ResumeForm from '@/components/documents/ResumeForm';
import CoverLetterForm from '@/components/documents/CoverLetterForm';

type TemplateName = 'jakes-resume' | 'jakes-cover-letter';

type DraftData =
  | { templateName: 'jakes-resume'; structuredData: ResumeData }
  | { templateName: 'jakes-cover-letter'; structuredData: CoverLetterData };

type StatusMsg = { type: 'success' | 'error'; text: string };

type VersionPayload = {
  templateName: string;
  structuredData: unknown;
} | null;

export default function DocumentEditor({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<StatusMsg | null>(null);

  useEffect(() => {
    const pendingKey = `pendingDraft_${documentId}`;
    const pending = sessionStorage.getItem(pendingKey);
    if (pending) {
      try {
        const parsed = JSON.parse(pending) as DraftData;
        setDraft(parsed);
        setLoading(false);
        return;
      } catch {
        sessionStorage.removeItem(pendingKey);
      }
    }

    fetch(`/api/documents/${documentId}/version`)
      .then((res) => res.json())
      .then((data: { version: VersionPayload }) => {
        if (data.version) {
          setDraft({
            templateName: data.version.templateName as TemplateName,
            structuredData: data.version.structuredData,
          } as DraftData);
        } else {
          setLoadError('No document data found. Please go back and regenerate.');
        }
      })
      .catch(() => setLoadError('Failed to load document.'))
      .finally(() => setLoading(false));
  }, [documentId]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  function showStatus(msg: StatusMsg) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  }

  async function handlePreview() {
    if (!draft) return;
    setIsPreviewing(true);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    try {
      const res = await fetch(`/api/documents/${documentId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: draft.templateName,
          structuredData: draft.structuredData,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: 'Preview failed' }))) as {
          error: string;
        };
        throw new Error(err.error);
      }
      const blob = await res.blob();
      setPdfBlobUrl(URL.createObjectURL(blob));
    } catch (err) {
      showStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Preview failed',
      });
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/version`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: draft.templateName,
          structuredData: draft.structuredData,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: 'Save failed' }))) as {
          error: string;
        };
        throw new Error(err.error);
      }
      sessionStorage.removeItem(`pendingDraft_${documentId}`);
      showStatus({ type: 'success', text: 'Document saved.' });
    } catch (err) {
      showStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveNewVersion() {
    if (!draft) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: draft.templateName,
          structuredData: draft.structuredData,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: 'Save failed' }))) as {
          error: string;
        };
        throw new Error(err.error);
      }
      sessionStorage.removeItem(`pendingDraft_${documentId}`);
      showStatus({ type: 'success', text: 'New version saved.' });
    } catch (err) {
      showStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDownload() {
    if (!draft) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: draft.templateName,
          structuredData: draft.structuredData,
        }),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${draft.templateName === 'jakes-resume' ? 'resume' : 'cover-letter'}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      showStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Download failed',
      });
    }
  }

  function renderForm() {
    if (!draft) return null;
    if (draft.templateName === 'jakes-resume') {
      return (
        <ResumeForm
          data={draft.structuredData}
          onChange={(data) => setDraft({ templateName: 'jakes-resume', structuredData: data })}
        />
      );
    }
    return (
      <CoverLetterForm
        data={draft.structuredData}
        onChange={(data) =>
          setDraft({ templateName: 'jakes-cover-letter', structuredData: data })
        }
      />
    );
  }

  const docTypeLabel = draft?.templateName === 'jakes-resume' ? 'Resume' : 'Cover Letter';
  const templateLabel =
    draft?.templateName === 'jakes-resume' ? "Jake's Resume" : "Jake's Cover Letter";
  const busy = isPreviewing || isSaving;

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

  if (loadError) {
    return (
      <div className="flex h-[calc(100vh-5rem)] flex-col items-center justify-center gap-4">
        <p className="text-sm text-(--danger-text)">{loadError}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-(--surface-border) px-4 py-2 text-sm font-semibold text-(--foreground) hover:bg-(--surface-hover)"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-(--surface-border) bg-(--background) px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded px-2 py-1 text-sm text-(--text-muted) hover:bg-(--surface-hover)"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-(--foreground)">{docTypeLabel} Editor</span>
          <span className="rounded-full border border-(--surface-border) px-2 py-0.5 text-xs text-(--text-muted)">
            {templateLabel}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={busy}
            className="rounded-md bg-(--foreground) px-3 py-1.5 text-sm font-semibold text-(--background) transition-all hover:-translate-y-0.5 hover:bg-(--inverse-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPreviewing ? 'Compiling...' : 'Regenerate Preview'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="rounded-md border border-(--surface-border) bg-(--background) px-3 py-1.5 text-sm font-semibold text-(--foreground) transition-all hover:-translate-y-0.5 hover:border-(--foreground) hover:bg-(--surface-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleSaveNewVersion}
            disabled={busy}
            className="rounded-md border border-(--surface-border) bg-(--background) px-3 py-1.5 text-sm font-semibold text-(--foreground) transition-all hover:-translate-y-0.5 hover:border-(--foreground) hover:bg-(--surface-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save as New Version
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="rounded-md border border-(--surface-border) bg-(--background) px-3 py-1.5 text-sm font-semibold text-(--foreground) transition-all hover:-translate-y-0.5 hover:border-(--foreground) hover:bg-(--surface-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div
          className={`px-4 py-2 text-sm font-medium ${
            statusMsg.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
              : 'bg-(--danger-bg) text-(--danger-text)'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Split view */}
      <div className="flex min-h-0 flex-1">
        {/* Form panel */}
        <div className="w-1/2 overflow-y-auto border-r border-(--surface-border) p-4">
          {renderForm()}
        </div>

        {/* Preview panel */}
        <div className="flex w-1/2 flex-col overflow-hidden bg-(--surface)">
          {pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              className="h-full w-full border-none"
              title="PDF Preview"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-(--text-muted)">
              {isPreviewing ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent" />
                  <span>Compiling PDF...</span>
                </>
              ) : (
                <>
                  <p>No preview yet.</p>
                  <p className="text-xs">Edit the form, then click &quot;Regenerate Preview&quot;.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
