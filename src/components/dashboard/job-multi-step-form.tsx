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
import InterviewStepSection from './interview-step-section';
import type {
  SectionComposerMode,
  SectionStep,
} from './job-multi-step-form-section-types';
import JobOverviewSection from './job-overview-section';
import ResumeStepSection from './resume-step-section';
import CoverLetterStepSection from './cover-letter-step-section';
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
  onDelete?: () => void;
  deleteError?: string | null;
  isDeleting?: boolean;
  onDocumentsChanged?: () => void;
  initialDraft?: Partial<JobMultiStepDraft>;
  stickyFooter?: boolean;
  showFooterCancel?: boolean;
};

type PersistedDocument = {
  id: string;
  title: string;
  content: string;
  type: 'resume' | 'cover_letter' | 'other';
  status: 'draft' | 'ready' | 'archived';
  tags: string[];
  created_at: string;
  storage: {
    path: string;
    fileName: string;
    mimeType: string;
    size: number;
    note?: string;
    signedUrl: string | null;
  } | null;
};

function revokeObjectUrlIfBlob(objectUrl?: string) {
  if (!objectUrl || !objectUrl.startsWith('blob:')) {
    return;
  }

  URL.revokeObjectURL(objectUrl);
}

export default function JobMultiStepForm({
  initialOverview,
  submitLabel = 'Save changes',
  onCancel,
  onFinalSave,
  onStepSave,
  onDelete,
  deleteError,
  isDeleting = false,
  onDocumentsChanged,
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
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsRefreshToken, setDocumentsRefreshToken] = useState(0);

  function addAiGeneratedDocument(
    type: 'resume' | 'cover_letter',
    content: string,
  ) {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const title = type === 'resume' ? 'Resume' : 'Cover Letter';
    const notes =
      type === 'resume' ? 'AI-generated resume' : 'AI-generated cover letter';
    const fileName =
      type === 'resume' ? `resume-${today}.md` : `cover-letter-${today}.md`;
    const markdownFile = new File([trimmedContent], fileName, {
      type: 'text/markdown',
    });
    const objectUrl = URL.createObjectURL(markdownFile);

    const documentItem: JobDocumentItemDraft = {
      id: crypto.randomUUID(),
      title,
      date: today,
      notes,
      documentType: type,
      status: 'ready',
      tags: ['ai-generated', type === 'resume' ? 'resume' : 'cover-letter'],
      name: markdownFile.name,
      size: markdownFile.size,
      mimeType: markdownFile.type,
      objectUrl,
    };

    setDraft((previous) => ({
      ...previous,
      documents: {
        files: [...previous.documents.files, documentItem],
      },
    }));
  }

  function refreshDocuments() {
    setDocumentsRefreshToken((previous) => previous + 1);
    onDocumentsChanged?.();
  }
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

  async function saveDocumentItem() {
    if (documentDraft.name.trim().length === 0) {
      return;
    }

    const jobId = draft.overview.id?.trim();
    if (!jobId) {
      setDocumentsError('Save the job first before adding persistent documents.');
      return;
    }

    const existingDocument =
      documentComposerMode === 'edit' && editingDocumentId
        ? draft.documents.files.find((file) => file.id === editingDocumentId)
        : null;

    setDocumentsError(null);
    setDocumentsLoading(true);

    try {
      let response: Response;

      if (pendingDocumentFile) {
        const formData = new FormData();
        formData.append('jobId', jobId);
        formData.append('title', documentDraft.title.trim());
        formData.append('type', documentDraft.documentType);
        formData.append('status', documentDraft.status);
        documentDraft.tags.forEach((tag) => {
          formData.append('tags', tag);
        });
        formData.append('note', documentDraft.notes.trim());
        formData.append('file', pendingDocumentFile);

        response = await fetch(
          existingDocument
            ? `/api/documents/${encodeURIComponent(existingDocument.id)}`
            : '/api/documents',
          {
            method: existingDocument ? 'PATCH' : 'POST',
            body: formData,
          },
        );
      } else {
        response = await fetch(
          existingDocument
            ? `/api/documents/${encodeURIComponent(existingDocument.id)}`
            : '/api/documents',
          {
            method: existingDocument ? 'PATCH' : 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jobId,
              title: documentDraft.title.trim() || documentDraft.name,
              type: documentDraft.documentType,
              status: documentDraft.status,
              tags: documentDraft.tags,
              note: documentDraft.notes.trim(),
              content:
                existingDocument || documentDraft.notes.trim().length === 0
                  ? undefined
                  : documentDraft.notes.trim(),
            }),
          },
        );
      }

      if (!response.ok) {
        throw new Error('Unable to save document.');
      }

      closeDocumentComposer();
      refreshDocuments();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message.trim().length > 0
          ? caughtError.message
          : 'Unable to save document.';
      setDocumentsError(message);
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function viewDocument(id: string) {
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error('Unable to retrieve document.');
      }

      const payload = (await response.json()) as {
        document?: PersistedDocument;
      };

      const document = payload.document;
      if (!document) {
        return;
      }

      if (document.storage?.signedUrl) {
        window.open(document.storage.signedUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const objectUrl = URL.createObjectURL(
        new Blob([document.content], { type: 'text/plain' }),
      );
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 60_000);
    } catch {
      setDocumentsError('Unable to retrieve document.');
    }
  }

  async function removeDocument(id: string) {
    try {
      setDocumentsError(null);
      const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Unable to delete document.');
      }

      setDraft((previous) => {
        const removedDocument = previous.documents.files.find(
          (file) => file.id === id,
        );
        revokeObjectUrlIfBlob(removedDocument?.objectUrl);

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
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message.trim().length > 0
          ? caughtError.message
          : 'Unable to delete document.';
      setDocumentsError(message);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadPersistedDocuments() {
      const jobId = draft.overview.id?.trim();

      if (!jobId) {
        setDocumentsLoading(false);
        setDocumentsError(null);
        return;
      }

      setDocumentsLoading(true);
      setDocumentsError(null);

      try {
        const response = await fetch(
          `/api/documents?jobId=${encodeURIComponent(jobId)}`,
        );

        if (!response.ok) {
          throw new Error('Unable to load persisted documents.');
        }

        const payload = (await response.json()) as {
          documents?: PersistedDocument[];
        };
        const persistedDocuments = Array.isArray(payload.documents)
          ? payload.documents
          : [];

        if (isCancelled) {
          return;
        }

        const nextFiles: JobDocumentItemDraft[] = persistedDocuments.map(
          (document) => {
            const createdDate = new Date(document.created_at);
            const date = Number.isNaN(createdDate.getTime())
              ? ''
              : createdDate.toISOString().split('T')[0];
            const contentBlob = new Blob([document.content], {
              type: 'text/plain',
            });

            return {
              id: document.id,
              title: document.title,
              date,
              documentType: document.type,
              status: document.status,
              tags: Array.isArray(document.tags) ? document.tags : [],
              notes:
                document.storage?.note ??
                (document.type === 'resume'
                  ? 'Saved resume'
                  : document.type === 'cover_letter'
                    ? 'Saved cover letter'
                    : 'Saved document'),
              name: document.storage?.fileName ?? `${document.title}.txt`,
              size: document.storage?.size ?? contentBlob.size,
              mimeType: document.storage?.mimeType ?? 'text/plain',
              objectUrl:
                document.storage?.signedUrl ?? URL.createObjectURL(contentBlob),
              storagePath: document.storage?.path,
            };
          },
        );

        setDraft((previous) => {
          const nextObjectUrls = new Set(
            nextFiles
              .map((file) => file.objectUrl)
              .filter((value): value is string => Boolean(value)),
          );

          previous.documents.files.forEach((file) => {
            if (file.objectUrl && !nextObjectUrls.has(file.objectUrl)) {
              revokeObjectUrlIfBlob(file.objectUrl);
            }
          });

          return {
            ...previous,
            documents: {
              files: nextFiles,
            },
          };
        });
      } catch (caughtError) {
        if (isCancelled) {
          return;
        }

        const message =
          caughtError instanceof Error && caughtError.message.trim().length > 0
            ? caughtError.message
            : 'Unable to load persisted documents.';
        setDocumentsError(message);
      } finally {
        if (!isCancelled) {
          setDocumentsLoading(false);
        }
      }
    }

    loadPersistedDocuments();

    return () => {
      isCancelled = true;
    };
  }, [draft.overview.id, documentsRefreshToken]);

  const sectionTitle = useMemo(() => {
    return JOB_FORM_STEPS.find((step) => step.id === activeStep)?.label;
  }, [activeStep]);

  // Re-initialize draft only when job ID changes (switching between different jobs)
  // We watch initialOverview.id to detect when user switches to a different job
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setDraft(buildInitialDraft(initialOverview, initialDraft));
    setActiveStep('overview');
  }, [initialOverview.id]);

  useEffect(() => {
    documentObjectUrlsRef.current = draft.documents.files
      .map((file) => file.objectUrl)
      .filter((value): value is string => Boolean(value));
  }, [draft.documents.files]);

  useEffect(() => {
    return () => {
      const uniqueObjectUrls = new Set(documentObjectUrlsRef.current);
      uniqueObjectUrls.forEach((objectUrl) => {
        revokeObjectUrlIfBlob(objectUrl);
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
            <InterviewStepSection
              stepId="interviews"
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
              isLoading={documentsLoading}
              loadError={documentsError}
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

          {activeStep === 'resume' ? (
            <ResumeStepSection
              resume={draft.resume}
              jobId={draft.overview.id}
              jobData={{
                title: draft.overview.title,
                company_name: draft.overview.company,
                location: draft.overview.location,
                job_description: draft.overview.jobDescription,
              }}
              onResumeChange={(content) =>
                setDraft((previous) => ({
                  ...previous,
                  resume: {
                    ...previous.resume,
                    content,
                  },
                }))
              }
              onRefreshDocuments={refreshDocuments}
              onSavedAsDocument={(content) =>
                addAiGeneratedDocument('resume', content)
              }
            />
          ) : null}

          {activeStep === 'coverLetter' ? (
            <CoverLetterStepSection
              coverLetter={draft.coverLetter}
              jobId={draft.overview.id}
              jobData={{
                title: draft.overview.title,
                company_name: draft.overview.company,
                location: draft.overview.location,
                job_description: draft.overview.jobDescription,
              }}
              onCoverLetterChange={(content) =>
                setDraft((previous) => ({
                  ...previous,
                  coverLetter: {
                    ...previous.coverLetter,
                    content,
                  },
                }))
              }
              onRefreshDocuments={refreshDocuments}
              onSavedAsDocument={(content) =>
                addAiGeneratedDocument('cover_letter', content)
              }
            />
          ) : null}
        </section>
      </div>

      <div
        className={
          stickyFooter
            ? 'z-20 flex flex-wrap items-center justify-between gap-3 border-t border-(--surface-divider) bg-(--background) pt-3 pb-0'
            : 'flex flex-wrap items-center justify-between gap-3 border-t border-(--surface-divider) pt-3 pb-0'
        }
      >
        <div className="flex gap-2">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSaving || isDeleting}
              className="rounded-md border border-(--danger-border) px-4 py-2 text-sm font-semibold text-(--danger-text) transition hover:bg-(--danger-bg) disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeleting ? 'Deleting...' : 'Delete Job'}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {showFooterCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving || isDeleting}
              className="rounded-md border border-(--danger-border) px-4 py-2 text-sm font-semibold text-(--danger-text) transition hover:bg-(--danger-bg) disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleNext}
            disabled={isSaving || isDeleting || isLastStep}
            className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg) disabled:cursor-not-allowed disabled:opacity-70"
          >
            Next
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving || isDeleting}
            className="rounded-md bg-(--foreground) px-5 py-2.5 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>

      {error || deleteError ? (
        <p className="text-sm font-medium text-(--danger-text)" role="alert">
          {error || deleteError}
        </p>
      ) : null}
    </div>
  );
}
