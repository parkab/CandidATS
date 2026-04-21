'use client';

import { useState } from 'react';
import type { JobResumeDraft } from '@/lib/jobs/multi-step-form';
import ComparisonModal from './edit-comparison-modal';

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
  resume,
  jobId,
  jobData,
  onResumeChange,
  onRefreshDocuments,
  onSavedAsDocument,
}: ResumeStepSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    original: string;
    edited: string;
    action: string;
  } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  async function editContent(
    action: 'rewrite' | 'concise' | 'detail' | 'tone',
  ) {
    const textArea = document.getElementById(
      'resume-content',
    ) as HTMLTextAreaElement;
    if (!textArea) return;

    const selection = window.getSelection();
    const selectedContent = selection?.toString() || resume.content;

    if (!selectedContent) {
      alert('Please select text to edit or the entire resume will be edited');
      return;
    }

    setIsEditing(true);
    try {
      const response = await fetch('/api/ai/edit-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: selectedContent,
          action,
          context: `Job: ${jobData?.title} at ${jobData?.company_name}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setComparisonData({
        original: data.original,
        edited: data.edited,
        action: data.action,
      });
      setShowComparison(true);
    } catch (error) {
      console.error('Error editing content:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to edit content: ${errorMessage}`);
    } finally {
      setIsEditing(false);
    }
  }

  function handleAcceptChanges(editedContent: string) {
    const textArea = document.getElementById(
      'resume-content',
    ) as HTMLTextAreaElement;
    if (!textArea) return;

    const selection = window.getSelection();
    const selectedText = selection?.toString();

    if (selectedText && selectedText.length > 0) {
      // Replace selected text with edited content
      const newContent = resume.content.replace(selectedText, editedContent);
      onResumeChange(newContent);
    } else {
      // Replace entire content
      onResumeChange(editedContent);
    }

    setShowComparison(false);
    setComparisonData(null);
  }

  function handleRejectChanges() {
    setShowComparison(false);
    setComparisonData(null);
  }

  async function saveResume() {
    if (!jobId || !resume.content.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Resume for ${jobData?.company_name || 'Unknown Company'} - ${new Date().toLocaleDateString()}`,
          content: resume.content,
          type: 'resume',
          jobId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save resume');
      }

      // Refresh documents if callback provided
      if (onRefreshDocuments) {
        onRefreshDocuments();
      }

      if (onSavedAsDocument) {
        onSavedAsDocument(resume.content);
      }

      // Show success message
    } catch (error) {
      console.error('Error saving resume:', error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-(--foreground)">
          AI-Generated Resume
        </h4>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={generateResume}
              disabled={isDisabled}
              title="Generate a tailored resume for this job"
              className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition-all hover:-translate-y-0.5 hover:bg-(--inverse-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Resume'}
            </button>
            <button
              type="button"
              onClick={saveResume}
              disabled={!resume.content.trim() || isSaving}
              title="Save this resume to the job documents list"
              className="rounded-md border border-(--surface-border) bg-(--background) px-4 py-2 text-sm font-semibold text-(--foreground) transition-all hover:-translate-y-0.5 hover:border-(--foreground) hover:bg-(--surface-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Resume'}
            </button>
          </div>
          {isDisabled && !isGenerating && (
            <p className="text-xs text-(--text-muted)">
              {!jobId && !jobData
                ? 'Job data required'
                : 'Save the job first to enable resume generation'}
            </p>
          )}
          <p className="text-xs text-(--text-muted)">
            Saved resumes appear in the job documents list below.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="resume-content"
            className="text-sm font-semibold text-(--foreground)"
          >
            Resume Content
          </label>
          {resume.content && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editContent('rewrite')}
                disabled={isEditing || isGenerating}
                className="rounded px-2 py-1 text-xs font-medium text-[--foreground] transition-all hover:-translate-y-0.5 hover:bg-[--surface-hover] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                title="Rewrite selected text or entire resume"
              >
                ✏️ Rewrite
              </button>
              <button
                type="button"
                onClick={() => editContent('concise')}
                disabled={isEditing || isGenerating}
                className="rounded px-2 py-1 text-xs font-medium text-[--foreground] transition-all hover:-translate-y-0.5 hover:bg-[--surface-hover] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                title="Make selected text more concise"
              >
                📉 Concise
              </button>
              <button
                type="button"
                onClick={() => editContent('detail')}
                disabled={isEditing || isGenerating}
                className="rounded px-2 py-1 text-xs font-medium text-[--foreground] transition-all hover:-translate-y-0.5 hover:bg-[--surface-hover] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                title="Add more details to selected text"
              >
                📈 Detail
              </button>
              <button
                type="button"
                onClick={() => editContent('tone')}
                disabled={isEditing || isGenerating}
                className="rounded px-2 py-1 text-xs font-medium text-[--foreground] transition-all hover:-translate-y-0.5 hover:bg-[--surface-hover] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                title="Adjust tone of selected text"
              >
                🎯 Tone
              </button>
            </div>
          )}
        </div>
        <textarea
          id="resume-content"
          value={resume.content}
          onChange={(e) => onResumeChange(e.target.value)}
          placeholder="Your AI-generated resume will appear here. You can edit it as needed. Select any text and use the action buttons to refine it."
          className="min-h-[400px] w-full rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-sm text-(--foreground) placeholder:text-(--text-muted) focus:border-(--foreground) focus:outline-none"
          disabled={isGenerating || isEditing}
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

      {isEditing && (
        <div className="flex items-center gap-2 text-sm text-(--text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent"></div>
          Editing content with AI...
        </div>
      )}

      {comparisonData && (
        <ComparisonModal
          isOpen={showComparison}
          original={comparisonData.original}
          edited={comparisonData.edited}
          action={comparisonData.action}
          onAccept={handleAcceptChanges}
          onReject={handleRejectChanges}
          isLoading={isEditing}
        />
      )}
    </div>
  );
}
