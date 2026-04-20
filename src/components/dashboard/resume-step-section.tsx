'use client';

import { useState } from 'react';
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
};

export default function ResumeStepSection({
  resume,
  jobId,
  jobData,
  onResumeChange,
}: ResumeStepSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Safety check in case resume is not properly initialized
  if (!resume) {
    return (
      <div className="grid gap-4">
        <p>Loading resume section...</p>
      </div>
    );
  }

  async function generateResume() {
    console.log('Generate resume clicked');
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

      const response = await fetch('/api/ai/resume-draft', {
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
      console.log('Resume content:', data.resume);
      console.log('Calling onResumeChange with:', data.resume);
      onResumeChange(data.resume);
    } catch (error) {
      console.error('Error generating resume:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // Show error in the resume content
      onResumeChange(`Error generating resume: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  }

  const isDisabled = isGenerating || (!jobId && !jobData);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-(--foreground)">
          AI-Generated Resume
        </h4>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={generateResume}
            disabled={isDisabled}
            className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Resume'}
          </button>
          {isDisabled && !isGenerating && (
            <p className="text-xs text-(--text-muted)">
              {!jobId && !jobData
                ? 'Job data required'
                : 'Save the job first to enable resume generation'}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="resume-content"
          className="text-sm font-semibold text-(--foreground)"
        >
          Resume Content
        </label>
        <textarea
          id="resume-content"
          value={resume.content}
          onChange={(e) => onResumeChange(e.target.value)}
          placeholder="Your AI-generated resume will appear here. You can edit it as needed."
          className="min-h-[400px] w-full rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-sm text-(--foreground) placeholder:text-(--text-muted) focus:border-(--foreground) focus:outline-none"
          disabled={isGenerating}
        />
        {resume.content && (
          <p>Resume content length: {resume.content.length}</p>
        )}
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-(--text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent"></div>
          Generating resume with AI...
        </div>
      )}
    </div>
  );
}
