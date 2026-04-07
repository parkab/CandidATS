'use client';

import { useMemo, useState } from 'react';
import type { ApplicationStatus } from '@/lib/jobs/status';
import PolaroidAddCard from '@/components/dashboard/polaroid-add-card';
import PolaroidCard from '@/components/dashboard/polaroid-card';
import CreateJobForm from '@/app/(dashboard)/jobs/create/create-job-form';
import EditJobForm from '@/app/(dashboard)/jobs/edit/edit-job-form';

type DashboardJobForModal = {
  id: string;
  company: string;
  title: string;
  location: string;
  status: ApplicationStatus;
  lastActivityDateLabel: string;
  angle: number;
  formData: {
    id: string;
    title: string;
    company: string;
    location: string;
    stage: string;
    lastActivityDate: string;
    deadline: string | null;
    priority: boolean | null;
    jobDescription: string | null;
    compensation: string | null;
    applicationDate: string | null;
    recruiterNotes: string | null;
    otherNotes: string | null;
  };
};

type JobsModalGridProps = {
  jobs: DashboardJobForModal[];
};

type ModalState = { type: 'create' } | { type: 'edit'; jobId: string } | null;

export default function JobsModalGrid({ jobs }: JobsModalGridProps) {
  const [modalState, setModalState] = useState<ModalState>(null);

  const selectedJob = useMemo(() => {
    if (!modalState || modalState.type !== 'edit') {
      return null;
    }

    return jobs.find((job) => job.id === modalState.jobId) ?? null;
  }, [jobs, modalState]);

  function closeModal() {
    setModalState(null);
  }

  return (
    <>
      <div className="mx-auto mt-12 grid max-w-6xl gap-8 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        <button
          type="button"
          onClick={() => setModalState({ type: 'create' })}
          className="block rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--foreground)"
        >
          <PolaroidAddCard />
        </button>

        {jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => setModalState({ type: 'edit', jobId: job.id })}
            className="block rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--foreground)"
          >
            <PolaroidCard
              company={job.company}
              location={job.location}
              position={job.title}
              lastActivityDate={job.lastActivityDateLabel}
              status={job.status}
              angle={job.angle}
            />
          </button>
        ))}
      </div>

      {modalState ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close jobs modal"
            className="absolute inset-0 bg-black/55"
          />

          <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-(--surface-border) bg-(--background) shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--surface-divider) p-6 pb-4">
              <div className="text-left">
                <h2 className="text-xl font-semibold text-(--foreground)">
                  {modalState.type === 'create'
                    ? 'Create a Job Application'
                    : 'Edit Job Application'}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
              >
                Cancel
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-6">
              {modalState.type === 'create' ? (
                <CreateJobForm inModal onSuccess={closeModal} />
              ) : selectedJob ? (
                <EditJobForm
                  inModal
                  onSuccess={closeModal}
                  initialJob={selectedJob.formData}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
