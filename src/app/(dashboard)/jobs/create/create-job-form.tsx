'use client';

import { useRouter } from 'next/navigation';
import JobMultiStepForm from '@/components/dashboard/job-multi-step-form';
import type {
  JobMultiStepDraft,
  JobOverviewDraft,
} from '@/lib/jobs/multi-step-form';

type CreateJobFormProps = {
  inModal?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const EMPTY_OVERVIEW_DRAFT: JobOverviewDraft = {
  title: '',
  company: '',
  location: '',
  stage: 'Interested',
  lastActivityDate: '',
  deadline: '',
  priority: false,
  jobDescription: '',
  compensation: '',
  applicationDate: '',
  recruiterNotes: '',
  otherNotes: '',
};

function toOptionalString(value: string) {
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export default function CreateJobForm({
  inModal = false,
  onSuccess,
  onCancel,
}: CreateJobFormProps) {
  const router = useRouter();

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

  async function handleFinalSave(draft: JobMultiStepDraft) {
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
      // These frontend-only section arrays are intentionally left for backend integration.
      timeline: draft.timeline,
      interviews: draft.interviews,
      followUps: draft.followUps,
      documents: draft.documents,
    };

    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseBody = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(responseBody?.error ?? 'Unable to create job right now.');
    }

    onSuccess?.();
    if (!inModal) {
      router.push('/dashboard');
    }
    router.refresh();
  }

  return (
    <JobMultiStepForm
      initialOverview={EMPTY_OVERVIEW_DRAFT}
      submitLabel="Create job"
      onCancel={handleCancel}
      onFinalSave={handleFinalSave}
      stickyFooter={inModal}
      showFooterCancel={!inModal}
    />
  );
}
