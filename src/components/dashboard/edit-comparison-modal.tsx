'use client';

import { useEffect, useState } from 'react';

type ComparisonModalProps = {
  isOpen: boolean;
  original: string;
  edited: string;
  action: string;
  onAccept: (content: string) => void;
  onReject: () => void;
  isLoading?: boolean;
};

export default function ComparisonModal({
  isOpen,
  original,
  edited,
  action,
  onAccept,
  onReject,
  isLoading = false,
}: ComparisonModalProps) {
  const [scrollSync, setScrollSync] = useState(true);
  const [leftScroll, setLeftScroll] = useState(0);

  useEffect(() => {
    if (!scrollSync) return;

    const leftPanel = document.getElementById('comparison-left');
    const rightPanel = document.getElementById('comparison-right');

    const handleLeftScroll = () => {
      if (rightPanel && leftPanel) {
        const scrollRatio =
          leftPanel.scrollTop /
          (leftPanel.scrollHeight - leftPanel.clientHeight);
        rightPanel.scrollTop =
          scrollRatio * (rightPanel.scrollHeight - rightPanel.clientHeight);
      }
    };

    leftPanel?.addEventListener('scroll', handleLeftScroll);
    return () => leftPanel?.removeEventListener('scroll', handleLeftScroll);
  }, [scrollSync]);

  if (!isOpen) return null;

  const actionLabels: Record<string, string> = {
    rewrite: 'Rewritten Version',
    concise: 'Concise Version',
    detail: 'Detailed Version',
    tone: 'Tone-Adjusted Version',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-[--background] shadow-lg">
        {/* Header */}
        <div className="border-b border-[--surface-border] px-6 py-4">
          <h2 className="text-lg font-bold text-[--foreground]">
            Compare Changes - {actionLabels[action] || action}
          </h2>
          <p className="mt-1 text-sm text-[--text-muted]">
            Review the suggested changes and decide whether to accept or reject
            them
          </p>
        </div>

        {/* Comparison Content */}
        <div className="flex flex-1 gap-4 overflow-hidden p-6">
          {/* Original */}
          <div className="flex flex-1 flex-col rounded-md border border-[--surface-border] bg-[--surface-dimmed]">
            <div className="border-b border-[--surface-border] px-4 py-3">
              <h3 className="font-semibold text-[--foreground]">Original</h3>
            </div>
            <div
              id="comparison-left"
              className="flex-1 overflow-y-auto whitespace-pre-wrap p-4 text-sm text-[--foreground]"
            >
              {original}
            </div>
          </div>

          {/* Edited */}
          <div className="flex flex-1 flex-col rounded-md border border-[--surface-border] bg-[--surface-dimmed]">
            <div className="border-b border-[--surface-border] px-4 py-3">
              <h3 className="font-semibold text-[--foreground]">
                {actionLabels[action] || 'Suggested Changes'}
              </h3>
            </div>
            <div
              id="comparison-right"
              className="flex-1 overflow-y-auto whitespace-pre-wrap p-4 text-sm text-[--foreground]"
            >
              {edited}
            </div>
          </div>
        </div>

        {/* Footer with Controls */}
        <div className="border-t border-[--surface-border] px-6 py-4">
          <div className="mb-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[--foreground]">
              <input
                type="checkbox"
                checked={scrollSync}
                onChange={(e) => setScrollSync(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border border-[--surface-border]"
              />
              Sync scroll between panels
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onReject}
              disabled={isLoading}
              className="rounded-md border border-[--surface-border] px-4 py-2 text-sm font-semibold text-[--foreground] transition hover:bg-[--surface-hover] disabled:opacity-50"
            >
              Reject Changes
            </button>
            <button
              onClick={() => onAccept(edited)}
              disabled={isLoading}
              className="rounded-md bg-[--foreground] px-4 py-2 text-sm font-semibold text-[--background] transition hover:bg-[--inverse-hover] disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Accept Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
