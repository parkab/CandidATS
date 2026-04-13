'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import JobFormStepper from '@/components/dashboard/job-form-stepper';
import {
  JOB_FORM_STEPS,
  REQUIRED_FIELD_MESSAGE,
  REQUIRED_OVERVIEW_FIELDS,
  type FinalSaveAdapter,
  type JobDocumentItemDraft,
  type JobFormStepId,
  type JobMultiStepDraft,
  type JobOverviewDraft,
  type JobSectionItemDraft,
  type RequiredOverviewFieldName,
  type StepSaveAdapter,
} from '@/lib/jobs/multi-step-form';
import DocumentsStepSection from './job-documents-step-section';
import ItemStepSection from './job-item-step-section';
import type {
  SectionComposerMode,
  SectionStep,
} from './job-multi-step-form-section-types';
import JobOverviewSection from './job-overview-section';
import {
  buildInitialDraft,
  createDocumentDraftItem,
  createSectionDraftItem,
  getMixedStageColor,
} from './job-multi-step-form-logic';

type JobMultiStepFormProps = {
  initialOverview: JobOverviewDraft;
  submitLabel?: string;
  onCancel: () => void;
  onFinalSave: FinalSaveAdapter;
  onStepSave?: StepSaveAdapter;
  initialDraft?: Partial<JobMultiStepDraft>;
  stickyFooter?: boolean;
  showFooterCancel?: boolean;
};

export default function JobMultiStepForm({
  initialOverview,
  submitLabel = 'Save changes',
  onCancel,
  onFinalSave,
  onStepSave,
  initialDraft,
  stickyFooter = false,
  showFooterCancel = true,
}: JobMultiStepFormProps) {
  const [activeStep, setActiveStep] = useState<JobFormStepId>('overview');
  const [draft, setDraft] = useState<JobMultiStepDraft>(() =>
    buildInitialDraft(initialOverview, initialDraft),
  );
  const [itemDraftByStep, setItemDraftByStep] = useState<
    Record<SectionStep, JobSectionItemDraft>
  >({
    timeline: createSectionDraftItem(),
    interviews: createSectionDraftItem(),
    followUps: createSectionDraftItem(),
  });
  const [composerOpenByStep, setComposerOpenByStep] = useState<
    Record<SectionStep, boolean>
  >({
    timeline: false,
    interviews: false,
    followUps: false,
  });
  const [composerModeByStep, setComposerModeByStep] = useState<
    Record<SectionStep, SectionComposerMode>
  >({
    timeline: 'add',
    interviews: 'add',
    followUps: 'add',
  });
  const [editingItemIdByStep, setEditingItemIdByStep] = useState<
    Record<SectionStep, string | null>
  >({
    timeline: null,
    interviews: null,
    followUps: null,
  });
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null,
  );
  const [documentComposerOpen, setDocumentComposerOpen] = useState(false);
  const [documentComposerMode, setDocumentComposerMode] =
    useState<SectionComposerMode>('add');
  const [documentDraft, setDocumentDraft] = useState<JobDocumentItemDraft>(() =>
    createDocumentDraftItem(),
  );
  const [pendingDocumentFile, setPendingDocumentFile] = useState<File | null>(
    null,
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RequiredOverviewFieldName, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const documentObjectUrlsRef = useRef<string[]>([]);

  const activeStepIndex = JOB_FORM_STEPS.findIndex(
    (step) => step.id === activeStep,
  );
  const isLastStep = activeStepIndex === JOB_FORM_STEPS.length - 1;

  function clearFieldError(fieldName: RequiredOverviewFieldName) {
    setFieldErrors((previous) => {
      if (!previous[fieldName]) {
        return previous;
      }

      return {
        ...previous,
        [fieldName]: undefined,
      };
    });
  }

  function setOverviewField<K extends keyof JobOverviewDraft>(
    fieldName: K,
    value: JobOverviewDraft[K],
  ) {
    setDraft((previous) => ({
      ...previous,
      overview: {
        ...previous.overview,
        [fieldName]: value,
      },
    }));

    if (fieldName in fieldErrors) {
      clearFieldError(fieldName as RequiredOverviewFieldName);
    }
  }

  function validateOverview() {
    const missingFields = REQUIRED_OVERVIEW_FIELDS.filter((fieldName) => {
      const value = draft.overview[fieldName];
      if (typeof value === 'string') {
        return value.trim().length === 0;
      }

      return value === null || value === undefined;
    });

    if (missingFields.length === 0) {
      setFieldErrors({});
      return true;
    }

    setFieldErrors(
      missingFields.reduce<Partial<Record<RequiredOverviewFieldName, string>>>(
        (accumulator, fieldName) => {
          accumulator[fieldName] = REQUIRED_FIELD_MESSAGE;
          return accumulator;
        },
        {},
      ),
    );

    return false;
  }

  async function saveCurrentStep(step: JobFormStepId) {
    if (!onStepSave) {
      return;
    }

    await onStepSave({ step, draft });
  }

  async function handleNext() {
    setError(null);

    if (activeStep === 'overview' && !validateOverview()) {
      return;
    }

    try {
      setIsSaving(true);
      await saveCurrentStep(activeStep);
      const nextStep = JOB_FORM_STEPS[activeStepIndex + 1];
      if (nextStep) {
        setActiveStep(nextStep.id);
      }
    } catch (caughtError) {
      const fallbackMessage = 'Unable to save this step right now.';
      const message =
        caughtError instanceof Error && caughtError.message.trim().length > 0
          ? caughtError.message
          : fallbackMessage;
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveChanges() {
    setError(null);

    if (!validateOverview()) {
      setActiveStep('overview');
      return;
    }

    try {
      setIsSaving(true);
      await onFinalSave(draft);
    } catch (caughtError) {
      const fallbackMessage = 'Unable to save changes right now.';
      const message =
        caughtError instanceof Error && caughtError.message.trim().length > 0
          ? caughtError.message
          : fallbackMessage;
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function setSectionItemField(
    step: SectionStep,
    fieldName: keyof JobSectionItemDraft,
    value: string,
  ) {
    setItemDraftByStep((previous) => ({
      ...previous,
      [step]: {
        ...previous[step],
        [fieldName]: value,
      },
    }));
  }

  function saveSectionItem(step: SectionStep) {
    const item = itemDraftByStep[step];
    const mode = composerModeByStep[step];
    const editingItemId = editingItemIdByStep[step];

    if (item.title.trim().length === 0 && item.notes.trim().length === 0) {
      return;
    }

    const sanitizedItem = {
      ...item,
      title: item.title.trim(),
      notes: item.notes.trim(),
    };

    setDraft((previous) => ({
      ...previous,
      [step]:
        mode === 'edit' && editingItemId
          ? previous[step].map((existingItem) =>
              existingItem.id === editingItemId ? sanitizedItem : existingItem,
            )
          : [...previous[step], sanitizedItem],
    }));

    setItemDraftByStep((previous) => ({
      ...previous,
      [step]: createSectionDraftItem(),
    }));
    setComposerOpenByStep((previous) => ({
      ...previous,
      [step]: false,
    }));
    setComposerModeByStep((previous) => ({
      ...previous,
      [step]: 'add',
    }));
    setEditingItemIdByStep((previous) => ({
      ...previous,
      [step]: null,
    }));
  }

  function removeSectionItem(step: SectionStep, id: string) {
    setDraft((previous) => ({
      ...previous,
      [step]: previous[step].filter((item) => item.id !== id),
    }));
  }

  function openSectionComposer(step: SectionStep) {
    setItemDraftByStep((previous) => ({
      ...previous,
      [step]: createSectionDraftItem(),
    }));
    setComposerOpenByStep((previous) => ({
      ...previous,
      [step]: true,
    }));
    setComposerModeByStep((previous) => ({
      ...previous,
      [step]: 'add',
    }));
    setEditingItemIdByStep((previous) => ({
      ...previous,
      [step]: null,
    }));
  }

  function openEditSectionItem(step: SectionStep, id: string) {
    const existingItem = draft[step].find((item) => item.id === id);
    if (!existingItem) {
      return;
    }

    setItemDraftByStep((previous) => ({
      ...previous,
      [step]: { ...existingItem },
    }));
    setComposerOpenByStep((previous) => ({
      ...previous,
      [step]: true,
    }));
    setComposerModeByStep((previous) => ({
      ...previous,
      [step]: 'edit',
    }));
    setEditingItemIdByStep((previous) => ({
      ...previous,
      [step]: id,
    }));
  }

  function closeSectionComposer(step: SectionStep) {
    setComposerOpenByStep((previous) => ({
      ...previous,
      [step]: false,
    }));
    setComposerModeByStep((previous) => ({
      ...previous,
      [step]: 'add',
    }));
    setEditingItemIdByStep((previous) => ({
      ...previous,
      [step]: null,
    }));
    setItemDraftByStep((previous) => ({
      ...previous,
      [step]: createSectionDraftItem(),
    }));
  }

  function setDocumentDraftField<K extends keyof JobDocumentItemDraft>(
    fieldName: K,
    value: JobDocumentItemDraft[K],
  ) {
    setDocumentDraft((previous) => ({
      ...previous,
      [fieldName]: value,
    }));
  }

  function openDocumentComposer() {
    setDocumentComposerOpen(true);
    setDocumentComposerMode('add');
    setEditingDocumentId(null);
    setDocumentDraft(createDocumentDraftItem());
    setPendingDocumentFile(null);
  }

  function openEditDocument(id: string) {
    const existingDocument = draft.documents.files.find(
      (file) => file.id === id,
    );
    if (!existingDocument) {
      return;
    }

    setDocumentComposerOpen(true);
    setDocumentComposerMode('edit');
    setEditingDocumentId(id);
    setDocumentDraft({ ...existingDocument });
    setPendingDocumentFile(null);
  }

  function closeDocumentComposer() {
    setDocumentComposerOpen(false);
    setDocumentComposerMode('add');
    setEditingDocumentId(null);
    setDocumentDraft(createDocumentDraftItem());
    setPendingDocumentFile(null);
  }

  function onDocumentFileSelected(file: File | null) {
    setPendingDocumentFile(file);
    if (!file) {
      return;
    }

    setDocumentDraft((previous) => ({
      ...previous,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    }));
  }

  function saveDocumentItem() {
    if (documentDraft.name.trim().length === 0) {
      return;
    }

    const existingDocument =
      documentComposerMode === 'edit' && editingDocumentId
        ? draft.documents.files.find((file) => file.id === editingDocumentId)
        : null;

    const nextObjectUrl = pendingDocumentFile
      ? URL.createObjectURL(pendingDocumentFile)
      : existingDocument?.objectUrl;

    const sanitizedDocument: JobDocumentItemDraft = {
      ...documentDraft,
      id: existingDocument?.id ?? documentDraft.id,
      title: documentDraft.title.trim(),
      date: documentDraft.date,
      notes: documentDraft.notes.trim(),
      name: documentDraft.name,
      size: documentDraft.size,
      mimeType: documentDraft.mimeType,
      objectUrl: nextObjectUrl,
    };

    if (
      existingDocument?.objectUrl &&
      pendingDocumentFile &&
      existingDocument.objectUrl !== nextObjectUrl
    ) {
      URL.revokeObjectURL(existingDocument.objectUrl);
    }

    setDraft((previous) => ({
      ...previous,
      documents: {
        files:
          documentComposerMode === 'edit' && editingDocumentId
            ? previous.documents.files.map((existingFile) =>
                existingFile.id === editingDocumentId
                  ? sanitizedDocument
                  : existingFile,
              )
            : [...previous.documents.files, sanitizedDocument],
      },
    }));

    closeDocumentComposer();
  }

  function viewDocument(id: string) {
    const existingDocument = draft.documents.files.find(
      (file) => file.id === id,
    );
    if (!existingDocument?.objectUrl) {
      return;
    }

    window.open(existingDocument.objectUrl, '_blank', 'noopener,noreferrer');
  }

  function removeDocument(id: string) {
    setDraft((previous) => {
      const removedDocument = previous.documents.files.find(
        (file) => file.id === id,
      );
      if (removedDocument?.objectUrl) {
        URL.revokeObjectURL(removedDocument.objectUrl);
      }

      return {
        ...previous,
        documents: {
          files: previous.documents.files.filter((file) => file.id !== id),
        },
      };
    });

    if (editingDocumentId === id) {
      closeDocumentComposer();
    }
  }

  const sectionTitle = useMemo(() => {
    return JOB_FORM_STEPS.find((step) => step.id === activeStep)?.label;
  }, [activeStep]);

  useEffect(() => {
    documentObjectUrlsRef.current = draft.documents.files
      .map((file) => file.objectUrl)
      .filter((value): value is string => Boolean(value));
  }, [draft.documents.files]);

  useEffect(() => {
    return () => {
      const uniqueObjectUrls = new Set(documentObjectUrlsRef.current);
      uniqueObjectUrls.forEach((objectUrl) => {
        URL.revokeObjectURL(objectUrl);
      });
    };
  }, []);

  useEffect(() => {
    setComposerOpenByStep({
      timeline: false,
      interviews: false,
      followUps: false,
    });
    setComposerModeByStep({
      timeline: 'add',
      interviews: 'add',
      followUps: 'add',
    });
    setEditingItemIdByStep({
      timeline: null,
      interviews: null,
      followUps: null,
    });
    setEditingDocumentId(null);
    setDocumentComposerOpen(false);
    setDocumentComposerMode('add');
    setDocumentDraft(createDocumentDraftItem());
    setPendingDocumentFile(null);
  }, [activeStep]);

  return (
    <div
      className={
        stickyFooter
          ? 'mx-auto grid h-full min-h-0 w-full max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-6'
          : 'mx-auto grid w-full max-w-2xl gap-6'
      }
    >
      <JobFormStepper activeStep={activeStep} onStepChange={setActiveStep} />

      <div className={stickyFooter ? 'min-h-0 overflow-y-auto pr-1 pb-4' : ''}>
        <section className="grid gap-4" aria-live="polite">
          <h3 className="text-center text-base font-semibold text-(--foreground)">
            {sectionTitle}
          </h3>

          {activeStep === 'overview' ? (
            <JobOverviewSection
              overview={draft.overview}
              fieldErrors={fieldErrors}
              setOverviewField={setOverviewField}
              getMixedStageColor={getMixedStageColor}
            />
          ) : null}

          {activeStep === 'timeline' ? (
            <ItemStepSection
              stepId="timeline"
              addButtonLabel="+ Add Event"
              itemLabel="event"
              items={draft.timeline}
              itemDraft={itemDraftByStep.timeline}
              isComposerOpen={composerOpenByStep.timeline}
              composerMode={composerModeByStep.timeline}
              editingItemId={editingItemIdByStep.timeline}
              onOpenComposer={openSectionComposer}
              onEditItem={openEditSectionItem}
              onCloseComposer={closeSectionComposer}
              onDraftChange={setSectionItemField}
              onSaveItem={saveSectionItem}
              onRemoveItem={removeSectionItem}
            />
          ) : null}

          {activeStep === 'interviews' ? (
            <ItemStepSection
              stepId="interviews"
              addButtonLabel="+ Add Interview"
              itemLabel="interview"
              items={draft.interviews}
              itemDraft={itemDraftByStep.interviews}
              isComposerOpen={composerOpenByStep.interviews}
              composerMode={composerModeByStep.interviews}
              editingItemId={editingItemIdByStep.interviews}
              onOpenComposer={openSectionComposer}
              onEditItem={openEditSectionItem}
              onCloseComposer={closeSectionComposer}
              onDraftChange={setSectionItemField}
              onSaveItem={saveSectionItem}
              onRemoveItem={removeSectionItem}
            />
          ) : null}

          {activeStep === 'followUps' ? (
            <ItemStepSection
              stepId="followUps"
              addButtonLabel="+ Add Follow-up"
              itemLabel="follow-up"
              items={draft.followUps}
              itemDraft={itemDraftByStep.followUps}
              isComposerOpen={composerOpenByStep.followUps}
              composerMode={composerModeByStep.followUps}
              editingItemId={editingItemIdByStep.followUps}
              onOpenComposer={openSectionComposer}
              onEditItem={openEditSectionItem}
              onCloseComposer={closeSectionComposer}
              onDraftChange={setSectionItemField}
              onSaveItem={saveSectionItem}
              onRemoveItem={removeSectionItem}
            />
          ) : null}

          {activeStep === 'documents' ? (
            <DocumentsStepSection
              files={draft.documents.files}
              documentDraft={documentDraft}
              isComposerOpen={documentComposerOpen}
              composerMode={documentComposerMode}
              editingDocumentId={editingDocumentId}
              onOpenComposer={openDocumentComposer}
              onEditDocument={openEditDocument}
              onCloseComposer={closeDocumentComposer}
              onDocumentDraftChange={setDocumentDraftField}
              onDocumentFileSelected={onDocumentFileSelected}
              onSaveDocument={saveDocumentItem}
              onViewDocument={viewDocument}
              onRemoveDocument={removeDocument}
            />
          ) : null}
        </section>
      </div>

      <div
        className={
          stickyFooter
            ? 'z-20 flex flex-wrap items-center justify-end gap-3 border-t border-(--surface-divider) bg-(--background) pt-3 pb-0'
            : 'flex flex-wrap items-center justify-end gap-3 border-t border-(--surface-divider) pt-3 pb-0'
        }
      >
        {showFooterCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-md border border-(--danger-border) px-4 py-2 text-sm font-semibold text-(--danger-text) transition hover:bg-(--danger-bg) disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleNext}
          disabled={isSaving || isLastStep}
          className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg) disabled:cursor-not-allowed disabled:opacity-70"
        >
          Next
        </button>
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="rounded-md bg-(--foreground) px-5 py-2.5 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Saving...' : submitLabel}
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-(--danger-text)" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
