'use client';

import { useRef } from 'react';
import type { JobDocumentItemDraft } from '@/lib/jobs/multi-step-form';

type DocumentItemComposerProps = {
  titleId: string;
  dateId: string;
  notesId: string;
  fileId: string;
  documentDraft: JobDocumentItemDraft;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
};

export default function DocumentItemComposer({
  titleId,
  dateId,
  notesId,
  fileId,
  documentDraft,
  onTitleChange,
  onDateChange,
  onNotesChange,
  onFileChange,
  onClose,
  onSave,
  saveLabel,
}: DocumentItemComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="grid gap-4 rounded-lg border border-(--surface-border) bg-(--background) p-4">
      <div className="grid gap-1.5">
        <label
          htmlFor={titleId}
          className="text-sm font-semibold text-(--foreground)"
        >
          Title
        </label>
        <div className="profile-input-wrap">
          <input
            id={titleId}
            type="text"
            value={documentDraft.title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="profile-input"
            placeholder="Document title"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor={dateId}
          className="text-sm font-semibold text-(--foreground)"
        >
          Date
        </label>
        <div className="profile-input-wrap">
          <input
            id={dateId}
            type="date"
            value={documentDraft.date}
            onChange={(event) => onDateChange(event.target.value)}
            className="profile-input"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor={notesId}
          className="text-sm font-semibold text-(--foreground)"
        >
          Notes
        </label>
        <div className="profile-input-wrap">
          <textarea
            id={notesId}
            rows={3}
            value={documentDraft.notes}
            onChange={(event) => onNotesChange(event.target.value)}
            className="profile-input profile-textarea"
            placeholder="Document context or notes"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor={fileId}
          className="text-sm font-semibold text-(--foreground)"
        >
          Upload document
        </label>
        <div className="grid gap-2">
          <input
            id={fileId}
            ref={(el) => {
              fileInputRef.current = el;
            }}
            type="file"
            onChange={(event) =>
              onFileChange(event.currentTarget.files?.[0] ?? null)
            }
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover)"
            >
              Choose file
            </button>
            {documentDraft.name ? (
              <p className="text-xs text-(--text-muted)">
                {documentDraft.name}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-(--danger-border) px-4 py-2 text-sm font-semibold text-(--danger-text) transition hover:bg-(--danger-bg)"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
