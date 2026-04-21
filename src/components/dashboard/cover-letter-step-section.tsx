'use client';

import { useState } from 'react';
import type { JobCoverLetterDraft } from '@/lib/jobs/multi-step-form';
import ComparisonModal from './edit-comparison-modal';

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
  onRefreshDocuments?: () => void;
  onSavedAsDocument?: (content: string) => void;
};

export default function CoverLetterStepSection({
  coverLetter,
  jobId,
  jobData,
  onCoverLetterChange,
  onRefreshDocuments,
  onSavedAsDocument,
}: CoverLetterStepSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    original: string;
    edited: string;
    action: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  async function editContent(
    action: 'rewrite' | 'concise' | 'detail' | 'tone',
  ) {
    const textArea = document.getElementById(
      'cover-letter-content',
    ) as HTMLTextAreaElement;
    if (!textArea) return;

    const selection = window.getSelection();
    const selectedContent = selection?.toString() || coverLetter.content;

    if (!selectedContent) {
      alert(
        'Please select text to edit or the entire cover letter will be edited',
      );
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
      'cover-letter-content',
    ) as HTMLTextAreaElement;
    if (!textArea) return;

    const selection = window.getSelection();
    const selectedText = selection?.toString();

    if (selectedText && selectedText.length > 0) {
      // Replace selected text with edited content
      const newContent = coverLetter.content.replace(
        selectedText,
        editedContent,
      );
      onCoverLetterChange(newContent);
    } else {
      // Replace entire content
      onCoverLetterChange(editedContent);
    }

    setShowComparison(false);
    setComparisonData(null);
  }

  function handleRejectChanges() {
    setShowComparison(false);
    setComparisonData(null);
  }

  async function saveCoverLetter() {
    if (!jobId || !coverLetter.content.trim()) {
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
          title: `Cover Letter for ${jobData?.company_name || 'Unknown Company'} - ${new Date().toLocaleDateString()}`,
          content: coverLetter.content,
          type: 'cover_letter',
          jobId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save cover letter');
      }

      // Refresh documents if callback provided
      if (onRefreshDocuments) {
        onRefreshDocuments();
      }

      if (onSavedAsDocument) {
        onSavedAsDocument(coverLetter.content);
      }
    } catch (error) {
      console.error('Error saving cover letter:', error);
      alert('Failed to save cover letter. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-(--foreground)">
          AI-Generated Cover Letter
        </h4>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={generateCoverLetter}
              disabled={isDisabled}
              title="Generate a tailored cover letter for this job"
              className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition-all hover:-translate-y-0.5 hover:bg-(--inverse-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Cover Letter'}
            </button>
            <button
              type="button"
              onClick={saveCoverLetter}
              disabled={!coverLetter.content.trim() || isSaving}
              title="Save this cover letter to the job documents list"
              className="rounded-md border border-(--surface-border) bg-(--background) px-4 py-2 text-sm font-semibold text-(--foreground) transition-all hover:-translate-y-0.5 hover:border-(--foreground) hover:bg-(--surface-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Cover Letter'}
            </button>
          </div>
          {isDisabled && (
            <p className="text-xs text-(--text-muted)">
              {!jobId && !jobData ? 'Job details required' : ''}
            </p>
          )}
          <p className="text-xs text-(--text-muted)">
            Saved cover letters appear in the job documents list below.
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="cover-letter-content"
            className="text-sm font-semibold text-(--foreground)"
          >
            Cover Letter Content
          </label>
          {coverLetter.content && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editContent('rewrite')}
                disabled={isEditing || isGenerating}
                className="rounded px-2 py-1 text-xs font-medium text-[--foreground] transition-all hover:-translate-y-0.5 hover:bg-[--surface-hover] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                title="Rewrite selected text or entire cover letter"
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
          id="cover-letter-content"
          value={coverLetter.content}
          onChange={(event) => onCoverLetterChange(event.target.value)}
          placeholder="Your AI-generated cover letter will appear here. Select any text and use the action buttons to refine it."
          className="min-h-[100px] w-full resize-y rounded-md border border-(--surface-border) bg-(--background) p-3 text-sm text-(--foreground) placeholder:text-(--text-muted) focus:border-(--foreground) focus:outline-none disabled:opacity-50"
          disabled={isGenerating || isEditing}
        />
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-(--text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent"></div>
          Generating cover letter with AI...
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
