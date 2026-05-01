'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { JobResumeDraft } from '@/lib/jobs/multi-step-form';

type ResumeStepSectionProps = {
  resume: JobResumeDraft;
  jobId?: string;
  jobData?: {
    title: string;
    company_name: string;
    location: string;
    job_description: string;
  };
  onResumeChange: (content: string) => void;
  onRefreshDocuments?: () => void;
  onSavedAsDocument?: (content: string) => void;
};

export default function ResumeStepSection({
  jobId,
  jobData,
}: ResumeStepSectionProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const isDisabled = isGenerating || (!jobId && !jobData);

  async function generateResume() {
    if (!jobId && !jobData) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const aiRes = await fetch('/api/ai/resume-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobId ? { jobId } : { jobData }),
      });
      if (!aiRes.ok) {
        const err = (await aiRes.json().catch(() => ({ error: 'Generation failed' }))) as {
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
          title: `Resume — ${jobData?.company_name ?? 'Draft'} ${new Date().toLocaleDateString()}`,
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
      setGenerateError(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-(--foreground)">AI Resume Generator</h4>
          <p className="mt-1 text-xs text-(--text-muted)">
            Generates a tailored resume based on your profile and this job, then opens it in the
            document editor where you can refine and save it as a PDF.
          </p>
          {isDisabled && !isGenerating && (
            <p className="mt-1 text-xs text-(--text-muted)">
              {!jobId && !jobData ? 'Job data required.' : 'Save the job to enable generation.'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={generateResume}
          disabled={isDisabled}
          className="shrink-0 rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition-all hover:-translate-y-0.5 hover:bg-(--inverse-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate Resume'}
        </button>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-(--text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent" />
          Generating resume with AI — this may take a moment...
        </div>
      )}

      {generateError && (
        <p className="rounded-md border border-(--danger-border) bg-(--danger-bg) px-3 py-2 text-sm text-(--danger-text)">
          {generateError}
        </p>
      )}
    </div>
  );
}
