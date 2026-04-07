'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  APPLICATION_STATUS_COLOR,
  type ApplicationStatus,
} from '@/lib/jobs/status';

const STAGE_OPTIONS: ApplicationStatus[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

const REQUIRED_FIELD_NAMES = [
  'title',
  'company',
  'location',
  'stage',
  'lastActivityDate',
] as const;

type RequiredFieldName = (typeof REQUIRED_FIELD_NAMES)[number];

const REQUIRED_FIELD_MESSAGE = 'This field is required.';

type CreateJobFormProps = {
  inModal?: boolean;
  onSuccess?: () => void;
};

export default function CreateJobForm({
  inModal = false,
  onSuccess,
}: CreateJobFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RequiredFieldName, string>>
  >({});
  const [selectedStage, setSelectedStage] =
    useState<ApplicationStatus>('Interested');

  function getRequiredFieldValue(
    formData: FormData,
    fieldName: RequiredFieldName,
  ) {
    const value = formData.get(fieldName);
    return typeof value === 'string' ? value.trim() : '';
  }

  function clearFieldError(fieldName: RequiredFieldName) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    const missingFields = REQUIRED_FIELD_NAMES.filter(
      (fieldName) => getRequiredFieldValue(formData, fieldName).length === 0,
    );

    if (missingFields.length > 0) {
      setFieldErrors(
        missingFields.reduce<Partial<Record<RequiredFieldName, string>>>(
          (accumulator, fieldName) => {
            accumulator[fieldName] = REQUIRED_FIELD_MESSAGE;
            return accumulator;
          },
          {},
        ),
      );
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const payload = {
      title: formData.get('title'),
      company: formData.get('company'),
      location: formData.get('location'),
      stage: formData.get('stage'),
      lastActivityDate: formData.get('lastActivityDate'),
      deadline: formData.get('deadline'),
      priority: formData.get('priority') === 'on',
      jobDescription: formData.get('jobDescription'),
      compensation: formData.get('compensation'),
      applicationDate: formData.get('applicationDate'),
      recruiterNotes: formData.get('recruiterNotes'),
      otherNotes: formData.get('otherNotes'),
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
      setError(responseBody?.error ?? 'Unable to create job right now.');
      setIsSubmitting(false);
      return;
    }

    onSuccess?.();
    if (!inModal) {
      router.push('/dashboard');
    }
    router.refresh();
  }

  return (
    <form
      className={
        inModal
          ? 'mx-auto grid w-full max-w-2xl gap-6'
          : 'mx-auto mt-10 grid w-full max-w-2xl gap-6 rounded-xl border border-(--surface-border) bg-(--background) p-6 shadow-sm'
      }
      onSubmit={handleSubmit}
      noValidate
    >
      <section className="grid gap-4">
        <div className="grid gap-1.5">
          <label
            htmlFor="title"
            className="text-sm font-semibold text-(--foreground)"
          >
            Job Position
            <span className="ml-1 text-(--danger-text)" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> required</span>
          </label>
          <div
            className="profile-input-wrap"
            data-error={Boolean(fieldErrors.title)}
          >
            <input
              id="title"
              name="title"
              type="text"
              required
              className="profile-input"
              placeholder="Software Engineer"
              onChange={() => clearFieldError('title')}
            />
          </div>
          {fieldErrors.title ? (
            <p
              className="text-xs font-medium text-(--danger-text)"
              role="alert"
            >
              {fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="company"
            className="text-sm font-semibold text-(--foreground)"
          >
            Company Name
            <span className="ml-1 text-(--danger-text)" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> required</span>
          </label>
          <div
            className="profile-input-wrap"
            data-error={Boolean(fieldErrors.company)}
          >
            <input
              id="company"
              name="company"
              type="text"
              required
              className="profile-input"
              placeholder="Google"
              onChange={() => clearFieldError('company')}
            />
          </div>
          {fieldErrors.company ? (
            <p
              className="text-xs font-medium text-(--danger-text)"
              role="alert"
            >
              {fieldErrors.company}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="location"
            className="text-sm font-semibold text-(--foreground)"
          >
            Location
            <span className="ml-1 text-(--danger-text)" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> required</span>
          </label>
          <div
            className="profile-input-wrap"
            data-error={Boolean(fieldErrors.location)}
          >
            <input
              id="location"
              name="location"
              type="text"
              required
              className="profile-input"
              placeholder="New York, NY"
              onChange={() => clearFieldError('location')}
            />
          </div>
          {fieldErrors.location ? (
            <p
              className="text-xs font-medium text-(--danger-text)"
              role="alert"
            >
              {fieldErrors.location}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="stage"
            className="text-sm font-semibold text-(--foreground)"
          >
            Stage
            <span className="ml-1 text-(--danger-text)" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> required</span>
          </label>
          <div
            className="profile-input-wrap"
            data-error={Boolean(fieldErrors.stage)}
          >
            <select
              id="stage"
              name="stage"
              required
              className="profile-input"
              value={selectedStage}
              onChange={(event) => {
                setSelectedStage(event.target.value as ApplicationStatus);
                clearFieldError('stage');
              }}
              style={{ color: APPLICATION_STATUS_COLOR[selectedStage] }}
            >
              {STAGE_OPTIONS.map((stage) => (
                <option
                  key={stage}
                  value={stage}
                  style={{ color: APPLICATION_STATUS_COLOR[stage] }}
                >
                  {stage}
                </option>
              ))}
            </select>
          </div>
          {fieldErrors.stage ? (
            <p
              className="text-xs font-medium text-(--danger-text)"
              role="alert"
            >
              {fieldErrors.stage}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="last-activity-date"
            className="text-sm font-semibold text-(--foreground)"
          >
            Last Activity Date
            <span className="ml-1 text-(--danger-text)" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> required</span>
          </label>
          <div
            className="profile-input-wrap"
            data-error={Boolean(fieldErrors.lastActivityDate)}
          >
            <input
              id="last-activity-date"
              name="lastActivityDate"
              type="date"
              required
              className="profile-input"
              onChange={() => clearFieldError('lastActivityDate')}
            />
          </div>
          {fieldErrors.lastActivityDate ? (
            <p
              className="text-xs font-medium text-(--danger-text)"
              role="alert"
            >
              {fieldErrors.lastActivityDate}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="deadline"
            className="text-sm font-semibold text-(--foreground)"
          >
            Deadline
          </label>
          <div className="profile-input-wrap">
            <input
              id="deadline"
              name="deadline"
              type="date"
              className="profile-input"
            />
          </div>
        </div>

        <label
          htmlFor="priority"
          className="flex items-center gap-3 rounded-md border border-(--surface-border) px-3 py-2"
        >
          <input
            id="priority"
            name="priority"
            type="checkbox"
            className="h-4 w-4 accent-(--foreground)"
          />
          <span className="text-sm font-semibold text-(--foreground)">
            Priority
          </span>
        </label>

        <div className="grid gap-1.5">
          <label
            htmlFor="job-description"
            className="text-sm font-semibold text-(--foreground)"
          >
            Job Description
          </label>
          <div className="profile-input-wrap">
            <textarea
              id="job-description"
              name="jobDescription"
              rows={4}
              className="profile-input profile-textarea"
              placeholder="Role summary, requirements, and responsibilities"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="compensation"
            className="text-sm font-semibold text-(--foreground)"
          >
            Compensation
          </label>
          <div className="profile-input-wrap">
            <input
              id="compensation"
              name="compensation"
              type="text"
              className="profile-input"
              placeholder="$200,000 base + $50,000 bonus"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="application-date"
            className="text-sm font-semibold text-(--foreground)"
          >
            Application Date
          </label>
          <div className="profile-input-wrap">
            <input
              id="application-date"
              name="applicationDate"
              type="date"
              className="profile-input"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="recruiter-notes"
            className="text-sm font-semibold text-(--foreground)"
          >
            Recruiter Notes
          </label>
          <div className="profile-input-wrap">
            <textarea
              id="recruiter-notes"
              name="recruiterNotes"
              rows={3}
              className="profile-input profile-textarea"
              placeholder="Recruiter contact details and notes"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor="other-notes"
            className="text-sm font-semibold text-(--foreground)"
          >
            Other Notes
          </label>
          <div className="profile-input-wrap">
            <textarea
              id="other-notes"
              name="otherNotes"
              rows={4}
              className="profile-input profile-textarea"
              placeholder="Anything else worth tracking"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-(--foreground) px-5 py-2.5 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Creating...' : 'Create job'}
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-(--danger-text)" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
