'use client';

import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  const dialogTitleId = useId();
  const modalRef = useRef<HTMLElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const selectedJob = useMemo(() => {
    if (!modalState || modalState.type !== 'edit') {
      return null;
    }

    return jobs.find((job) => job.id === modalState.jobId) ?? null;
  }, [jobs, modalState]);

  function closeModal() {
    setModalState(null);

    const lastTrigger = lastTriggerRef.current;
    if (lastTrigger) {
      requestAnimationFrame(() => {
        lastTrigger.focus();
      });
    }
  }

  function openCreateModal(trigger: HTMLButtonElement) {
    lastTriggerRef.current = trigger;
    setModalState({ type: 'create' });
  }

  function openEditModal(trigger: HTMLButtonElement, jobId: string) {
    lastTriggerRef.current = trigger;
    setModalState({ type: 'edit', jobId });
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== 'Tab' || !modalRef.current) {
      return;
    }

    const focusableElements = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    if (focusableElements.length === 0) {
      return;
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;

    if (event.shiftKey && activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  }

  useEffect(() => {
    if (!modalState) {
      return;
    }

    requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });
  }, [modalState]);

  return (
    <>
      <div className="mx-auto mt-12 grid max-w-6xl gap-8 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        <button
          type="button"
          onClick={(event) => openCreateModal(event.currentTarget)}
          className="block rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--foreground)"
        >
          <PolaroidAddCard />
        </button>

        {jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={(event) => openEditModal(event.currentTarget, job.id)}
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

          <section
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-(--surface-border) bg-(--background) shadow-2xl"
            onKeyDown={handleDialogKeyDown}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--surface-divider) p-6 pb-4">
              <div className="text-left">
                <h2
                  id={dialogTitleId}
                  className="text-xl font-semibold text-(--foreground)"
                >
                  {modalState.type === 'create'
                    ? 'Create a Job Application'
                    : 'Edit Job Application'}
                </h2>
              </div>

              <button
                ref={cancelButtonRef}
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
          </section>
        </div>
      ) : null}
    </>
  );
}
