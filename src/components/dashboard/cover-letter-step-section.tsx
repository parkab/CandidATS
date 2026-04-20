'use client';

import { useState } from 'react';
import type { JobCoverLetterDraft } from '@/lib/jobs/multi-step-form';

type CoverLetterStepSectionProps = {
  coverLetter: JobCoverLetterDraft;
  jobId?: string;
  jobData?: {
    title: string;
    company_name: string;
    location: string;
    job_description: string;
  };
  onCoverLetterChange: (content: string) => void;
};

export default function CoverLetterStepSection({
  coverLetter,
  jobId,
  jobData,
  onCoverLetterChange,
}: CoverLetterStepSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Safety check in case coverLetter is not properly initialized
  if (!coverLetter) {
    return (
      <div className="grid gap-4">
        <p>Loading cover letter section...</p>
      </div>
    );
  }

  async function generateCoverLetter() {
    console.log('Generate cover letter clicked');
    console.log('jobId:', jobId);
    console.log('jobData:', jobData);

    if (!jobId && !jobData) {
      console.log('No job data available');
      return;
    }

    setIsGenerating(true);
    try {
      const requestBody = jobId
        ? { jobId }
        : { jobData: { ...jobData, company_name: jobData?.company_name } };

      console.log('Sending request:', requestBody);

      const response = await fetch('/api/ai/cover-letter-draft', {
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
      console.log('API Response:', data);
      if (data.error) {
        throw new Error(data.error);
      }
      console.log('Cover letter content:', data.coverLetter);
      console.log('Calling onCoverLetterChange with:', data.coverLetter);
      onCoverLetterChange(data.coverLetter);
    } catch (error) {
      console.error('Error generating cover letter:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // Show error in the cover letter content
      onCoverLetterChange(`Error generating cover letter: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  }

  const isDisabled = isGenerating || (!jobId && !jobData);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-(--foreground)">
          AI-Generated Cover Letter
        </h4>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={generateCoverLetter}
            disabled={isDisabled}
            className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Cover Letter'}
          </button>
          {isDisabled && (
            <p className="text-xs text-(--text-muted)">
              {!jobId && !jobData ? 'Job details required' : ''}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-2">
        <textarea
          value={coverLetter.content}
          onChange={(event) => onCoverLetterChange(event.target.value)}
          placeholder="Your AI-generated cover letter will appear here..."
          className="min-h-[400px] w-full resize-y rounded-md border border-(--border) bg-(--background) p-3 text-sm text-(--foreground) placeholder-(--text-muted) focus:border-(--ring) focus:outline-none"
        />
      </div>
    </div>
  );
}
