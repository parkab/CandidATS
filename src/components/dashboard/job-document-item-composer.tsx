'use client';

import { useRef, useState } from 'react';
import type { JobDocumentItemDraft } from '@/lib/jobs/multi-step-form';

type DocumentItemComposerProps = {
  titleId: string;
  dateId: string;
  notesId: string;
  statusId: string;
  tagsId: string;
  fileId: string;
  documentDraft: JobDocumentItemDraft;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onDocumentTypeChange: (value: 'resume' | 'cover_letter' | 'other') => void;
  onStatusChange: (value: 'draft' | 'ready' | 'archived') => void;
  onTagsChange: (value: string[]) => void;
  onFileChange: (file: File | null) => void;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
};

export default function DocumentItemComposer({
  titleId,
  dateId,
  notesId,
  statusId,
  tagsId,
  fileId,
  documentDraft,
  onTitleChange,
  onDateChange,
  onNotesChange,
  onDocumentTypeChange,
  onStatusChange,
  onTagsChange,
  onFileChange,
  onClose,
  onSave,
  saveLabel,
}: DocumentItemComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [newTag, setNewTag] = useState('');

  function addTag() {
    const tag = newTag.trim();
    if (!tag) return;
    if (!documentDraft.tags.includes(tag)) {
      onTagsChange([...documentDraft.tags, tag]);
    }
    setNewTag('');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag();
    }
  }

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
        <label className="text-sm font-semibold text-(--foreground)">
          Category
        </label>
        <div className="profile-input-wrap">
          <select
            value={documentDraft.documentType}
            onChange={(event) =>
              onDocumentTypeChange(
                event.target.value as 'resume' | 'cover_letter' | 'other',
              )
            }
            className="profile-input"
          >
            <option value="resume">Resume</option>
            <option value="cover_letter">Cover letter</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor={statusId}
          className="text-sm font-semibold text-(--foreground)"
        >
          Status
        </label>
        <div className="profile-input-wrap">
          <select
            id={statusId}
            value={documentDraft.status}
            onChange={(event) =>
              onStatusChange(
                event.target.value as 'draft' | 'ready' | 'archived',
              )
            }
            className="profile-input"
          >
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="archived">Archived</option>
          </select>
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

      <div className="grid gap-1.5">
        <label
          htmlFor={tagsId}
          className="text-sm font-semibold text-(--foreground)"
        >
          Tags
        </label>
        <div className="grid gap-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <div className="profile-input-wrap flex-1 min-w-0">
              <input
                id={tagsId}
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                className="profile-input"
                placeholder="eg: interview"
                aria-label="Add tag input"
              />
            </div>
            <button
              type="button"
              onClick={addTag}
              className="flex-none rounded-md border border-(--action-border) px-3 py-1 text-sm font-semibold transition hover:bg-(--action-bg)"
            >
              Add
            </button>
          </div>

          <div className="max-h-24 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-2">
            {documentDraft.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-(--surface) px-3 py-1 text-xs"
              >
                <span className="break-all">{tag}</span>
                <button
                  type="button"
                  onClick={() =>
                    onTagsChange(documentDraft.tags.filter((t) => t !== tag))
                  }
                  className="ml-1 text-(--danger-text)"
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            </div>
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
