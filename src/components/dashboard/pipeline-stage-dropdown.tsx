'use client';

import { useState } from 'react';
import { APPLICATION_STATUS_COLOR, type ApplicationStatus } from '@/lib/jobs/status';

type PipelineStageDropdownProps = {
  currentStage: ApplicationStatus;
  jobId: string;
  onStageChange: (newStage: ApplicationStatus) => Promise<void>;
  disabled?: boolean;
};

const STAGES: ApplicationStatus[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

export default function PipelineStageDropdown({
  currentStage,
  onStageChange,
  disabled = false,
}: PipelineStageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStageSelect(newStage: ApplicationStatus) {
    if (newStage === currentStage || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onStageChange(newStage);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stage');
      console.error('Error updating stage:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const currentColor = APPLICATION_STATUS_COLOR[currentStage];

  return (
    <div 
      className="relative inline-block w-full"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!isLoading && !disabled) {
            setIsOpen(!isOpen);
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={disabled || isLoading}
        className="w-full rounded-md px-2.5 py-1 text-sm leading-none font-bold text-(--background) transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2"
        style={{
          backgroundColor: `${currentColor}8C`,
          borderColor: currentColor,
          border: '1px solid',
        }}
        title={error || `Current stage: ${currentStage}`}
      >
        <span className="flex-1 text-left">{currentStage}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div 
          className="absolute right-0 left-0 top-full mt-1 z-50 border border-gray-200 rounded-md bg-white shadow-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {STAGES.map((stage) => {
            const stageColor = APPLICATION_STATUS_COLOR[stage];
            const isSelected = stage === currentStage;

            return (
              <button
                key={stage}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStageSelect(stage);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={isLoading}
                className={`w-full px-3 py-2 text-left text-sm font-medium transition-colors duration-150 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: stageColor }}
                />
                <span className={isSelected ? 'font-bold' : ''}>{stage}</span>
                {isSelected && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="absolute top-full mt-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 w-full z-40">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 rounded-md bg-white/30 flex items-center justify-center z-40">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
