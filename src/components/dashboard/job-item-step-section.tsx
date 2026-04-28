import type { JobSectionItemDraft } from '@/lib/jobs/multi-step-form';
import type {
  SectionComposerMode,
  SectionStep,
} from './job-multi-step-form-section-types';
import SectionItemComposer from './job-section-item-composer';
import { extractIdMarker, extractNotesContent } from '@/lib/utils/timelineNotes';

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
          onDateChange={(value) => onDraftChange(stepId, 'date', value)}
          onNotesChange={(value) => onDraftChange(stepId, 'notes', value)}
          onClose={() => onCloseComposer(stepId)}
          onSave={() => onSaveItem(stepId)}
          saveLabel={`Add ${itemLabel}`}
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="grid gap-3" aria-label={`${itemLabel} items`}>
          {items.map((item) => (
            <li key={item.id} className="item-card rounded-lg p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-(--foreground)">
                    {item.title || '(Untitled item)'}
                  </p>
                  {item.date ? (
                    <p className="text-xs text-(--text-muted)">{item.date}</p>
                  ) : null}
                  {item.notes ? (
                    <p className="mt-1 text-sm text-(--text-muted)">
                      {stepId === 'timeline'
                        ? extractNotesContent(item.notes)
                        : item.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    // For timeline items, hide edit/delete buttons if auto-generated (has ID marker)
                    if (stepId === 'timeline' && item.notes && extractIdMarker(item.notes)) {
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
                      onDraftChange(stepId, 'date', value)
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
