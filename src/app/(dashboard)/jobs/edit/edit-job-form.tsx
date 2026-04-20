'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import JobMultiStepForm from '@/components/dashboard/job-multi-step-form';
import DeleteJobDialog from '@/components/dashboard/delete-job-dialog';
import type {
  JobMultiStepDraft,
  JobOverviewDraft,
  JobSectionItemDraft,
} from '@/lib/jobs/multi-step-form';
import type { ApplicationStatus } from '@/lib/jobs/status';

type EditJobFormProps = {
  inModal?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialJob: {
    id: string;
    title: string;
    company: string;
    location: string;
    stage: string;
    lastActivityDate: Date | string | null;
    deadline: Date | string | null;
    priority: boolean | null;
    jobDescription: string | null;
    compensation: string | null;
    applicationDate: Date | string | null;
    recruiterNotes: string | null;
    otherNotes: string | null;
  };
  initialTimeline?: JobSectionItemDraft[];
  initialInterviews?: JobSectionItemDraft[];
  initialFollowUps?: JobSectionItemDraft[];
};

const STAGE_OPTIONS: ApplicationStatus[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
];

function toDateInputValue(value: Date | string | null) {
  if (!value) {
    return '';
  }

  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0];
}

function toStageValue(stage: string): ApplicationStatus {
  return STAGE_OPTIONS.includes(stage as ApplicationStatus)
    ? (stage as ApplicationStatus)
    : 'Interested';
}

function toOptionalString(value: string) {
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function toOverviewDraft(
  initialJob: EditJobFormProps['initialJob'],
): JobOverviewDraft {
  return {
    id: initialJob.id,
    title: initialJob.title,
    company: initialJob.company,
    location: initialJob.location,
    stage: toStageValue(initialJob.stage),
    lastActivityDate: toDateInputValue(initialJob.lastActivityDate),
    deadline: toDateInputValue(initialJob.deadline),
    priority: Boolean(initialJob.priority),
    jobDescription: initialJob.jobDescription ?? '',
    compensation: initialJob.compensation ?? '',
    applicationDate: toDateInputValue(initialJob.applicationDate),
    recruiterNotes: initialJob.recruiterNotes ?? '',
    otherNotes: initialJob.otherNotes ?? '',
  };
}

export default function EditJobForm({
  inModal = false,
  onSuccess,
  onCancel,
  initialJob,
  initialTimeline = [],
  initialInterviews = [],
  initialFollowUps = [],
}: EditJobFormProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }

    if (inModal) {
      onSuccess?.();
      return;
    }

    router.push('/dashboard');
  }

  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const jobId = initialJob.id.trim();

      if (!jobId) {
        throw new Error('Job ID is required to delete a job.');
      }

      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
      });

      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          responseBody?.error ?? 'Unable to delete job right now.',
        );
      }

      // Close modal if in modal view
      if (inModal) {
        onSuccess?.();
      }

      // Navigate back to dashboard and refresh data
      if (!inModal) {
        router.push('/dashboard');
      }

      // Refresh to update metrics and jobs list
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred.';
      setDeleteError(errorMessage);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleFinalSave(draft: JobMultiStepDraft) {
    const jobId = draft.overview.id?.trim();

    if (!jobId) {
      throw new Error('Job ID is required to update a job.');
    }

    const payload = {
      title: draft.overview.title,
      company: draft.overview.company,
      location: draft.overview.location,
      stage: draft.overview.stage,
      lastActivityDate: draft.overview.lastActivityDate,
      deadline: toOptionalString(draft.overview.deadline),
      priority: draft.overview.priority,
      jobDescription: toOptionalString(draft.overview.jobDescription),
      compensation: toOptionalString(draft.overview.compensation),
      applicationDate: toOptionalString(draft.overview.applicationDate),
      recruiterNotes: toOptionalString(draft.overview.recruiterNotes),
      otherNotes: toOptionalString(draft.overview.otherNotes),
      timeline: draft.timeline,
      interviews: draft.interviews,
      followUps: draft.followUps,
      documents: draft.documents,
    };

    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseBody = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(responseBody?.error ?? 'Unable to update job right now.');
    }

    onSuccess?.();
    if (!inModal) {
      router.push('/dashboard');
    }
    router.refresh();
  }

  return (
    <>
      <JobMultiStepForm
        initialOverview={toOverviewDraft(initialJob)}
        initialDraft={{
          timeline: initialTimeline,
          interviews: initialInterviews,
          followUps: initialFollowUps,
        }}
        submitLabel="Save changes"
        onCancel={handleCancel}
        onFinalSave={handleFinalSave}
        onDelete={() => setIsDeleteDialogOpen(true)}
        stickyFooter={inModal}
        showFooterCancel={!inModal}
        deleteError={deleteError}
        isDeleting={isDeleting}
      />
      <DeleteJobDialog
        jobId={initialJob.id}
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        jobTitle={initialJob.title}
        companyName={initialJob.company}
      />
    </>
  );
}
