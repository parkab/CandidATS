import type { JobSectionItemDraft } from '@/lib/jobs/multi-step-form';
import type {
  SectionComposerMode,
  SectionStep,
} from './job-multi-step-form-section-types';
import SectionItemComposer from './job-section-item-composer';
import {
  extractIdMarker,
  extractNotesContent,
} from '@/lib/utils/timelineNotes';

const TIMELINE_EVENT_LABELS: Record<string, string> = {
  job_created: 'Job Created',
  stage_changed: 'Stage Changed',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  offer_received: 'Offer Received',
  follow_up_created: 'Follow-up Created',
  follow_up_completed: 'Follow-up Completed',
  note_added: 'Note Added',
  application_submitted: 'Application Submitted',
};

function formatTimelineTitle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const normalized = trimmed.toLowerCase();
  if (TIMELINE_EVENT_LABELS[normalized]) {
    return TIMELINE_EVENT_LABELS[normalized];
  }
  // Only convert to title case if the string is in snake_case format
  // Snake case: contains underscores and is all lowercase
  const isSnakeCase = /^[a-z0-9_]+$/.test(trimmed);
  if (isSnakeCase) {
    return trimmed
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  // If not snake_case, return as-is
  return trimmed;
}

function toItemTimestamp(date: string) {
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function toDateInputValue(value: string) {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toISOString().split('T')[0];
}

function formatDisplayDate(value: string) {
  return toDateInputValue(value);
}

function mergeDateWithNow(dateValue: string) {
  if (!dateValue) {
    return '';
  }
  // dateValue is in the format "YYYY-MM-DD" from the date input
  // Create ISO string directly at midnight UTC without timezone manipulation
  const [year, month, day] = dateValue.split('-').map((part) => Number(part));
  if (!year || !month || !day) {
    return dateValue;
  }
  // Return ISO string for the selected date at midnight UTC
  const isoString = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`;
  return isoString;
}

type ItemStepSectionProps = {
  stepId: SectionStep;
  addButtonLabel: string;
  itemLabel: string;
  items: JobSectionItemDraft[];
  itemDraft: JobSectionItemDraft;
  isComposerOpen: boolean;
  composerMode: SectionComposerMode;
  editingItemId: string | null;
  onOpenComposer: (step: SectionStep) => void;
  onEditItem: (step: SectionStep, id: string) => void;
  onCloseComposer: (step: SectionStep) => void;
  onDraftChange: (
    step: SectionStep,
    fieldName: keyof JobSectionItemDraft,
    value: string,
  ) => void;
  onSaveItem: (step: SectionStep) => void;
  onRemoveItem: (step: SectionStep, id: string) => void;
};

export default function ItemStepSection({
  stepId,
  addButtonLabel,
  itemLabel,
  items,
  itemDraft,
  isComposerOpen,
  composerMode,
  editingItemId,
  onOpenComposer,
  onEditItem,
  onCloseComposer,
  onDraftChange,
  onSaveItem,
  onRemoveItem,
}: ItemStepSectionProps) {
  const titleId = `${stepId}-title`;
  const dateId = `${stepId}-date`;
  const notesId = `${stepId}-notes`;
  const sortedItems = [...items].sort((a, b) => {
    const diff = toItemTimestamp(b.date) - toItemTimestamp(a.date);
    if (diff !== 0) {
      return diff;
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <section className="grid gap-4">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => onOpenComposer(stepId)}
          className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover)"
        >
          {addButtonLabel}
        </button>
      </div>

      {isComposerOpen && composerMode === 'add' ? (
        <SectionItemComposer
          itemLabel={itemLabel}
          titleId={titleId}
          dateId={dateId}
          notesId={notesId}
          itemDraft={itemDraft}
          onTitleChange={(value) => onDraftChange(stepId, 'title', value)}
          onDateChange={(value) =>
            onDraftChange(stepId, 'date', mergeDateWithNow(value))
          }
          onNotesChange={(value) => onDraftChange(stepId, 'notes', value)}
          onClose={() => onCloseComposer(stepId)}
          onSave={() => onSaveItem(stepId)}
          saveLabel={`Add ${itemLabel}`}
        />
      ) : null}

      {sortedItems.length > 0 ? (
        <ul className="grid gap-3" aria-label={`${itemLabel} items`}>
          {sortedItems.map((item) => (
            <li key={item.id} className="item-card rounded-lg p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="w-28 shrink-0 text-left">
                    <p
                      className={`text-base font-semibold ${
                        formatDisplayDate(item.date)
                          ? 'text-(--foreground)'
                          : 'text-(--text-muted)'
                      }`}
                    >
                      {formatDisplayDate(item.date) || 'No date'}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-(--foreground)">
                      {stepId === 'timeline'
                        ? formatTimelineTitle(item.title) || '(Untitled item)'
                        : item.title || '(Untitled item)'}
                    </p>
                    {item.notes ? (
                      <p className="mt-1 truncate text-sm text-(--text-muted)">
                        {stepId === 'timeline'
                          ? extractNotesContent(item.notes)
                          : item.notes}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    // For timeline items, hide edit/delete buttons if auto-generated (has ID marker)
                    if (
                      stepId === 'timeline' &&
                      item.notes &&
                      extractIdMarker(item.notes)
                    ) {
                      return null;
                    }
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditItem(stepId, item.id)}
                          className="rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(stepId, item.id)}
                          className="rounded-md border border-(--danger-border) px-3 py-1.5 text-xs font-semibold text-(--danger-text) transition hover:bg-(--danger-bg)"
                        >
                          Remove
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {isComposerOpen &&
              composerMode === 'edit' &&
              editingItemId === item.id ? (
                <div className="mt-3 border-t border-(--surface-divider) pt-3">
                  <SectionItemComposer
                    itemLabel={itemLabel}
                    titleId={titleId}
                    dateId={dateId}
                    notesId={notesId}
                    itemDraft={itemDraft}
                    onTitleChange={(value) =>
                      onDraftChange(stepId, 'title', value)
                    }
                    onDateChange={(value) =>
                      onDraftChange(stepId, 'date', mergeDateWithNow(value))
                    }
                    onNotesChange={(value) =>
                      onDraftChange(stepId, 'notes', value)
                    }
                    onClose={() => onCloseComposer(stepId)}
                    onSave={() => onSaveItem(stepId)}
                    saveLabel={`Save ${itemLabel}`}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-(--text-muted)">
          No {itemLabel} items added yet.
        </p>
      )}
    </section>
  );
}
