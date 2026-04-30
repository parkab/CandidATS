'use client';

import { useState } from 'react';
import type { JobCompanyResearchDraft } from '@/lib/jobs/multi-step-form';
import ComparisonModal from './edit-comparison-modal';

type CompanyResearchStepSectionProps = {
  companyResearch: JobCompanyResearchDraft;
  jobId?: string;
  jobData?: {
    title: string;
    company_name: string;
    location: string;
    job_description: string;
  };
  onCompanyResearchChange: (content: string) => void;
  onUserContextChange: (context: string) => void;
  onRefreshDocuments?: () => void;
  onSavedAsDocument?: (content: string) => void;
};

export default function CompanyResearchStepSection({
  companyResearch,
  jobId,
  jobData,
  onCompanyResearchChange,
  onUserContextChange,
  onRefreshDocuments,
  onSavedAsDocument,
}: CompanyResearchStepSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    original: string;
    edited: string;
    action: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Safety check in case companyResearch is not properly initialized
  if (!companyResearch) {
    return (
      <div className="grid gap-4">
        <p>Loading company research section...</p>
      </div>
    );
  }

  async function generateCompanyResearch() {
    console.log('Generate company research clicked');
    console.log('jobId:', jobId);
    console.log('jobData:', jobData);

    if (!jobId && !jobData) {
      console.log('No job data available');
      return;
    }

    setIsGenerating(true);
    try {
      const requestBody = jobId
        ? {
            jobId,
            userContext: companyResearch.userContext || '',
          }
        : {
            jobData: {
              ...jobData,
              company_name: jobData?.company_name,
            },
            userContext: companyResearch.userContext || '',
          };

      console.log('Sending request:', requestBody);

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
      console.log('API Response:', data);
      if (data.error) {
        throw new Error(data.error);
      }
      console.log('Company research content:', data.research);
      console.log('Calling onCompanyResearchChange with:', data.research);
      onCompanyResearchChange(data.research);
    } catch (error) {
      console.error('Error generating company research:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // Show error in the research content
      onCompanyResearchChange(
        `Error generating company research: ${errorMessage}`,
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const isDisabled = isGenerating || (!jobId && !jobData);

  async function editContent(
    action: 'rewrite' | 'concise' | 'detail' | 'tone',
  ) {
    const textArea = document.getElementById(
      'company-research-content',
    ) as HTMLTextAreaElement;
    if (!textArea) return;

    const selection = window.getSelection();
    const selectedContent = selection?.toString() || companyResearch.content;

    if (!selectedContent) {
      alert('Please select text to edit or the entire research will be edited');
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
          context: `Company: ${jobData?.company_name}, Position: ${jobData?.title}`,
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
      'company-research-content',
    ) as HTMLTextAreaElement;
    if (!textArea) return;

    const selection = window.getSelection();
    const selectedText = selection?.toString();

    if (selectedText && selectedText.length > 0) {
      // Replace selected text with edited content
      const newContent = companyResearch.content.replace(
        selectedText,
        editedContent,
      );
      onCompanyResearchChange(newContent);
    } else {
      // Replace entire content
      onCompanyResearchChange(editedContent);
    }

    setShowComparison(false);
    setComparisonData(null);
  }

  function handleRejectChanges() {
    setShowComparison(false);
    setComparisonData(null);
  }

  async function saveResearch() {
    if (!jobId || !companyResearch.content.trim()) {
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
          title: `Company Research for ${jobData?.company_name || 'Unknown Company'} - ${new Date().toLocaleDateString()}`,
          content: companyResearch.content,
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

      const data = await response.json();
      console.log('Saved document:', data);
      onSavedAsDocument?.(companyResearch.content);
      onRefreshDocuments?.();
    } catch (error) {
      console.error('Error saving company research:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save research: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      {/* User Context Input Section */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="user-context"
            className="text-sm font-semibold text-(--foreground)"
          >
            Research Focus (Optional)
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={generateCompanyResearch}
              disabled={isDisabled}
              title="Generate research for this company"
              className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition-all hover:-translate-y-0.5 hover:bg-(--inverse-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? 'Researching...' : 'Generate Research'}
            </button>
            <button
              type="button"
              onClick={saveResearch}
              disabled={!companyResearch.content.trim() || isSaving}
              title="Save this research to the job documents list"
              className="rounded-md border border-(--surface-border) bg-(--background) px-4 py-2 text-sm font-semibold text-(--foreground) transition-all hover:-translate-y-0.5 hover:border-(--foreground) hover:bg-(--surface-hover) hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Research'}
            </button>
          </div>
        </div>
        <p className="text-xs text-(--text-muted)">
          Optionally specify what you&apos;d like to research about the company
          (e.g., &quot;work-life balance&quot;, &quot;recent acquisitions&quot;,
          &quot;company culture&quot;). Leave blank for general overview.
        </p>
        <textarea
          id="user-context"
          value={companyResearch.userContext}
          onChange={(e) => onUserContextChange(e.target.value)}
          placeholder="E.g.: What is their work-life balance like? How do they treat remote employees? Tell me about their recent pivot to AI..."
          className="min-h-20 w-full rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-sm text-(--foreground) placeholder:text-(--text-muted) focus:border-(--foreground) focus:outline-none"
          disabled={isGenerating}
        />
        {isDisabled && !isGenerating && (
          <p className="text-xs text-(--text-muted)">
            {!jobId && !jobData
              ? 'Job data required'
              : 'Save the job first to enable research generation'}
          </p>
        )}
        <p className="text-xs text-(--text-muted)">
          Saved research appears in the job documents list below.
        </p>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-sm text-(--text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent"></div>
          Researching company with AI...
        </div>
      )}

      {/* Company Research Content Section */}
      {companyResearch.content && (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="company-research-content"
              className="text-sm font-semibold text-(--foreground)"
            >
              Research Results
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editContent('rewrite')}
                disabled={isEditing || isGenerating}
                className="rounded px-2 py-1 text-xs font-medium text-[--foreground] transition-all hover:-translate-y-0.5 hover:bg-[--surface-hover] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                title="Rewrite selected text or entire research"
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
          </div>
          <textarea
            id="company-research-content"
            value={companyResearch.content}
            onChange={(e) => onCompanyResearchChange(e.target.value)}
            placeholder="Your company research will appear here..."
            className="min-h-[400px] w-full rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-sm text-(--foreground) placeholder:text-(--text-muted) focus:border-(--foreground) focus:outline-none"
            disabled={isGenerating || isEditing}
          />
          {companyResearch.content && (
            <p className="text-xs text-(--text-muted)">
              Research content length: {companyResearch.content.length}
            </p>
          )}
        </div>
      )}

      {isEditing && (
        <div className="flex items-center gap-2 text-sm text-(--text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--foreground) border-t-transparent"></div>
          Editing content with AI...
        </div>
      )}

      {/* Comparison Modal */}
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
