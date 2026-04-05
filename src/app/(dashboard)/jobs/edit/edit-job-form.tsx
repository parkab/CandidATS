'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type EditJobFormProps = {
  initialJob: {
    id: string;
    userId: string;
    title: string;
    company: string;
    location: string;
    stage: string;
    lastActivityDate: Date | string | null;
    deadline: Date | string | null;
    priority: boolean | null;
    jobDescription: string;
    compensation: string | null;
    applicationDate: Date | string | null;
    recruiterNotes: string | null;
    otherNotes: string;
  };
};

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

export default function EditJobForm({ initialJob }: EditJobFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      userId: initialJob.userId,
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

    const jobId = formData.get('jobId');

    if (typeof jobId !== 'string' || jobId.trim().length === 0) {
      setError('Job ID is required to update a job.');
      setIsSubmitting(false);
      return;
    }

    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId.trim())}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseBody = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(responseBody?.error ?? 'Unable to update job right now.');
      setIsSubmitting(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form
      className="mx-auto mt-10 grid w-full max-w-2xl gap-5 rounded-xl border border-(--surface-border) bg-(--background) p-6 shadow-sm"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="jobId" value={initialJob.id} />
      <input type="hidden" name="userId" value={initialJob.userId} />

      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm font-semibold text-(--foreground)">
          Job Position
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initialJob.title}
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
          placeholder="Software Engineer"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="company" className="text-sm font-semibold text-(--foreground)">
          Company Name
        </label>
        <input
          id="company"
          name="company"
          type="text"
          required
          defaultValue={initialJob.company}
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
          placeholder="Stripe"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="location" className="text-sm font-semibold text-(--foreground)">
          Location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          required
          defaultValue={initialJob.location}
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
          placeholder="San Francisco, CA"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="stage" className="text-sm font-semibold text-(--foreground)">
          Stage
        </label>
        <select
          id="stage"
          name="stage"
          required
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
          defaultValue={initialJob.stage}
        >
          <option value="Interested">Interested</option>
          <option value="Applied">Applied</option>
          <option value="Interview">Interview</option>
          <option value="Offer">Offer</option>
          <option value="Rejected">Rejected</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="last-activity-date"
          className="text-sm font-semibold text-(--foreground)"
        >
          Last Activity Date
        </label>
        <input
          id="last-activity-date"
          name="lastActivityDate"
          type="date"
          required
          defaultValue={toDateInputValue(initialJob.lastActivityDate)}
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="deadline" className="text-sm font-semibold text-(--foreground)">
          Deadline
        </label>
        <input
          id="deadline"
          name="deadline"
          type="date"
          defaultValue={toDateInputValue(initialJob.deadline)}
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
        />
      </div>

      <label
        htmlFor="priority"
        className="flex items-center gap-3 rounded-md border border-(--surface-border) px-3 py-2"
      >
        <input
          id="priority"
          name="priority"
          type="checkbox"
          defaultChecked={Boolean(initialJob.priority)}
          className="h-4 w-4 accent-(--foreground)"
        />
        <span className="text-sm font-semibold text-(--foreground)">
          Priority
        </span>
      </label>

      <div className="grid gap-2">
        <label
          htmlFor="job-description"
          className="text-sm font-semibold text-(--foreground)"
        >
          Job Description
        </label>
        <textarea
          id="job-description"
          name="jobDescription"
          rows={4}
          required
          defaultValue={initialJob.jobDescription}
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
          placeholder="Role summary, requirements, and responsibilities"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="compensation"
          className="text-sm font-semibold text-(--foreground)"
        >
          Compensation
        </label>
        <input
          id="compensation"
          name="compensation"
          type="text"
          defaultValue={initialJob.compensation ?? ''}
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
          placeholder="$180,000 base"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="application-date"
          className="text-sm font-semibold text-(--foreground)"
        >
          Application Date
        </label>
        <input
          id="application-date"
          name="applicationDate"
          type="date"
          required
          defaultValue={toDateInputValue(initialJob.applicationDate)}
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="recruiter-notes"
          className="text-sm font-semibold text-(--foreground)"
        >
          Recruiter Notes
        </label>
        <textarea
          id="recruiter-notes"
          name="recruiterNotes"
          rows={3}
          defaultValue={initialJob.recruiterNotes ?? ''}
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
          placeholder="Recruiter contact details and notes"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="other-notes"
          className="text-sm font-semibold text-(--foreground)"
        >
          Other Notes
        </label>
        <textarea
          id="other-notes"
          name="otherNotes"
          rows={4}
          required
          defaultValue={initialJob.otherNotes}
          className="w-full rounded-md border border-(--surface-border) bg-transparent px-3 py-2 text-sm outline-none transition focus:border-(--foreground)"
          placeholder="Anything else worth tracking"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 rounded-md bg-(--foreground) px-4 py-2.5 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Updating...' : 'Update Job Application'}
      </button>

      {error ? (
        <p className="text-sm font-medium text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}