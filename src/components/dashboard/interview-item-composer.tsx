import type { JobSectionItemDraft } from '@/lib/jobs/multi-step-form';

type InterviewItemComposerProps = {
  itemDraft: JobSectionItemDraft;
  onRoundTypeChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
};

export default function InterviewItemComposer({
  itemDraft,
  onRoundTypeChange,
  onDateChange,
  onNotesChange,
  onClose,
  onSave,
  saveLabel,
}: InterviewItemComposerProps) {
  const roundTypeId = 'interview-round-type';
  const dateId = 'interview-date';
  const notesId = 'interview-notes';

  return (
    <div className="grid gap-4 rounded-lg border border-(--surface-border) bg-(--background) p-4">
      <div className="grid gap-1.5">
        <label
          htmlFor={roundTypeId}
          className="text-sm font-semibold text-(--foreground)"
        >
          Round Type
        </label>
        <div className="profile-input-wrap">
          <input
            id={roundTypeId}
            type="text"
            value={itemDraft.title}
            onChange={(event) => onRoundTypeChange(event.target.value)}
            className="profile-input"
            placeholder="e.g., Phone Screen, Technical, Behavioral"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor={dateId}
          className="text-sm font-semibold text-(--foreground)"
        >
          Date/Time
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
            placeholder="Interview details, interviewer names, or outcomes"
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
