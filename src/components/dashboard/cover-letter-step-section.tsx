'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type CoverLetterStepSectionProps = {
  jobId?: string;
  jobData?: {
    title: string;
    company_name: string;
    location: string;
    job_description: string;
  };
};

export default function CoverLetterStepSection({
  jobId,
  jobData,
}: CoverLetterStepSectionProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const isDisabled = isGenerating || (!jobId && !jobData);

  async function generateCoverLetter() {
    if (!jobId && !jobData) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const aiRes = await fetch('/api/ai/cover-letter-draft', {
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
        setGenerateError('Save the job first to open the cover letter editor.');
        return;
      }

      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          type: 'cover_letter',
          title: `Cover Letter — ${jobData?.company_name ?? 'Draft'} ${new Date().toLocaleDateString()}`,
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
          <h4 className="text-sm font-semibold text-(--foreground)">AI Cover Letter Generator</h4>
          <p className="mt-1 text-xs text-(--text-muted)">
            Generates a tailored cover letter based on your profile and this job, then opens it in
            the document editor where you can refine and save it as a PDF.
          </p>
          {isDisabled && !isGenerating && (
            <p className="mt-1 text-xs text-(--text-muted)">
              {!jobId && !jobData ? 'Job data required.' : 'Save the job to enable generation.'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={generateCoverLetter}
          disabled={isDisabled}
          className="shrink-0 rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition-all hover:-translate-y-0.5 hover:bg-(--inverse-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate Cover Letter'}
        </button>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-(--text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent" />
          Generating cover letter with AI — this may take a moment...
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
