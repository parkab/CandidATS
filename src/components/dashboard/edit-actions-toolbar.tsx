'use client';

import { useState, useRef, useEffect } from 'react';

type EditActionsToolbarProps = {
  onAction: (action: 'rewrite' | 'concise' | 'detail' | 'tone') => void;
  isLoading: boolean;
  selectedText: string;
};

export default function EditActionsToolbar({
  onAction,
  isLoading,
  selectedText,
}: EditActionsToolbarProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textarea = document.getElementById('content-textarea');
    if (!textarea) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        setShowToolbar(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setPosition({
        top: rect.top + window.scrollY - 10,
        left: rect.left + window.scrollX,
      });
      setShowToolbar(true);
    };

    textarea.addEventListener('mouseup', handleSelection);
    textarea.addEventListener('touchend', handleSelection);

    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        setShowToolbar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      textarea.removeEventListener('mouseup', handleSelection);
      textarea.removeEventListener('touchend', handleSelection);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const actionButtons = [
    { label: 'Rewrite', action: 'rewrite' as const, icon: '✏️' },
    { label: 'Concise', action: 'concise' as const, icon: '📉' },
    { label: 'Add Detail', action: 'detail' as const, icon: '📈' },
    { label: 'Adjust Tone', action: 'tone' as const, icon: '🎯' },
  ];

  if (!showToolbar || !position) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-40 flex gap-1 rounded-lg border border-[--surface-border] bg-[--background] p-2 shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: 'max-content',
      }}
    >
      {actionButtons.map((btn) => (
        <button
          key={btn.action}
          onClick={() => {
            onAction(btn.action);
            setShowToolbar(false);
          }}
          disabled={isLoading}
          className="flex items-center gap-2 rounded px-3 py-2 text-xs font-medium text-[--foreground] transition hover:bg-[--surface-hover] disabled:opacity-50"
          title={`${btn.label}: Apply AI to rewrite this section`}
        >
          <span>{btn.icon}</span>
          <span className="hidden sm:inline">{btn.label}</span>
        </button>
      ))}
    </div>
  );
}
