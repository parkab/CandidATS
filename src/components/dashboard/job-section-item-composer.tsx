import type { JobSectionItemDraft } from '@/lib/jobs/multi-step-form';

type SectionItemComposerProps = {
  itemLabel: string;
  titleId: string;
  dateId: string;
  notesId: string;
  itemDraft: JobSectionItemDraft;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
};

export default function SectionItemComposer({
  itemLabel,
  titleId,
  dateId,
  notesId,
  itemDraft,
  onTitleChange,
  onDateChange,
  onNotesChange,
  onClose,
  onSave,
  saveLabel,
}: SectionItemComposerProps) {
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
            value={itemDraft.title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="profile-input"
            placeholder={`Add a ${itemLabel}`}
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
            value={itemDraft.date}
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
            value={itemDraft.notes}
            onChange={(event) => onNotesChange(event.target.value)}
            className="profile-input profile-textarea"
            placeholder="Additional details"
          />
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
