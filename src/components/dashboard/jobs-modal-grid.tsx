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
import { GRADIENT_SUBHEADING_CLASS } from '@/components/dashboard/gradient';
import CreateJobForm from '@/app/(dashboard)/jobs/create/create-job-form';
import EditJobForm from '@/app/(dashboard)/jobs/edit/edit-job-form';

type DashboardJobForModal = {
  id: string;
  company: string;
  title: string;
  location: string;
  archived: boolean;
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
    archived: boolean;
  };
  timeline: Array<{
    id: string;
    title: string;
    date: string;
    notes: string;
  }>;
  interviews: Array<{
    id: string;
    title: string;
    date: string;
    notes: string;
  }>;
  followUps: Array<{
    id: string;
    title: string;
    date: string;
    notes: string;
  }>;
};

type ModalState = { type: 'create' } | { type: 'edit'; jobId: string } | null;

export default function JobsModalGrid({
  initialJobs,
}: {
  initialJobs: DashboardJobForModal[];
}) {
  const [jobs, setJobs] = useState<DashboardJobForModal[]>(initialJobs);
  const [showArchived, setShowArchived] = useState(false);
  const [modalState, setModalState] = useState<ModalState>(null);

  // Keep jobs in sync when the parent re-fetches (e.g. after router.refresh())
  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);
  const dialogTitleId = useId();
  const modalRef = useRef<HTMLElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const selectedJob = useMemo(() => {
    if (!modalState || modalState.type !== 'edit') {
      return null;
    }

    return jobs.find((job) => job.id === modalState.jobId) ?? null;
  }, [jobs, modalState]);

  const visibleJobs = useMemo(
    () => (showArchived ? jobs : jobs.filter((job) => !job.archived)),
    [jobs, showArchived],
  );

  function closeModal() {
    setModalState(null);

    const lastTrigger = lastTriggerRef.current;
    if (lastTrigger) {
      requestAnimationFrame(() => {
        lastTrigger.focus();
      });
    }
  }

  function openCreateModal(trigger: HTMLElement) {
    lastTriggerRef.current = trigger;
    setModalState({ type: 'create' });
  }

  function openEditModal(trigger: HTMLElement, jobId: string) {
    lastTriggerRef.current = trigger;
    setModalState({ type: 'edit', jobId });
  }

  async function handleStageChange(jobId: string, newStage: ApplicationStatus) {
    const oldJob = jobs.find((job) => job.id === jobId);
    if (!oldJob) {
      throw new Error('Job not found');
    }

    // Optimistic update — locate by id inside the updater to avoid stale index
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: newStage,
              formData: { ...job.formData, stage: newStage },
            }
          : job,
      ),
    );

    // API call
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: oldJob.formData.title,
          company: oldJob.formData.company,
          location: oldJob.formData.location,
          stage: newStage,
          lastActivityDate: oldJob.formData.lastActivityDate,
          deadline: oldJob.formData.deadline,
          priority: oldJob.formData.priority,
          jobDescription: oldJob.formData.jobDescription,
          compensation: oldJob.formData.compensation,
          applicationDate: oldJob.formData.applicationDate,
          recruiterNotes: oldJob.formData.recruiterNotes,
          otherNotes: oldJob.formData.otherNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update job stage');
      }
    } catch (error) {
      // Revert optimistic update — locate by id inside the updater to avoid stale index
      setJobs((prevJobs) =>
        prevJobs.map((job) => (job.id === jobId ? oldJob : job)),
      );
      throw error;
    }
  }

  async function handleArchiveStateChange(
    jobId: string,
    nextArchived: boolean,
  ) {
    const oldJob = jobs.find((job) => job.id === jobId);
    if (!oldJob) {
      throw new Error('Job not found');
    }

    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              archived: nextArchived,
              formData: { ...job.formData, archived: nextArchived },
            }
          : job,
      ),
    );

    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: oldJob.formData.title,
          company: oldJob.formData.company,
          location: oldJob.formData.location,
          stage: oldJob.formData.stage,
          lastActivityDate: oldJob.formData.lastActivityDate,
          deadline: oldJob.formData.deadline,
          priority: oldJob.formData.priority,
          jobDescription: oldJob.formData.jobDescription,
          compensation: oldJob.formData.compensation,
          applicationDate: oldJob.formData.applicationDate,
          recruiterNotes: oldJob.formData.recruiterNotes,
          otherNotes: oldJob.formData.otherNotes,
          archived: nextArchived,
        }),
      });

      if (!response.ok) {
        throw new Error(
          nextArchived ? 'Failed to archive job' : 'Failed to restore job',
        );
      }
    } catch (error) {
      setJobs((prevJobs) =>
        prevJobs.map((job) => (job.id === jobId ? oldJob : job)),
      );
      throw error;
    }
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
      <div className="mx-auto mt-10 flex max-w-6xl items-center justify-end">
        <button
          type="button"
          onClick={() => setShowArchived((current) => !current)}
          className="cursor-pointer rounded-md border border-(--surface-border) bg-[linear-gradient(110deg,var(--background)_0%,var(--background)_48%,#ffa647_66%,#70e2ff_84%,#cd93ff_100%)] bg-size-[220%_100%] bg-position-[0%_0%] px-4 py-2 text-sm font-semibold text-(--foreground) transition-[background-position,color] duration-500 hover:bg-position-[100%_0%] hover:text-[#111111]"
        >
          {showArchived ? 'Hide archived cards' : 'Show archived cards'}
        </button>
      </div>
      <div className="mx-auto mt-12 grid max-w-6xl gap-8 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
        <button
          type="button"
          onClick={(event) => openCreateModal(event.currentTarget)}
          className="block rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--foreground)"
        >
          <PolaroidAddCard />
        </button>

        {visibleJobs.map((job) => (
          <div
            key={job.id}
            role="button"
            tabIndex={0}
            onClick={(event) => openEditModal(event.currentTarget, job.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openEditModal(event.currentTarget, job.id);
              }
            }}
            className="block rounded-sm text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--foreground)"
          >
            <PolaroidCard
              company={job.company}
              location={job.location}
              position={job.title}
              lastActivityDate={job.lastActivityDateLabel}
              status={job.status}
              archived={job.archived}
              angle={job.angle}
              jobId={job.id}
              onStageChange={(newStage) => handleStageChange(job.id, newStage)}
              onToggleArchive={(nextArchived) =>
                handleArchiveStateChange(job.id, nextArchived)
              }
            />
          </div>
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
            tabIndex={-1}
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-(--surface-border) bg-(--background) shadow-2xl"
            onKeyDown={handleDialogKeyDown}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--surface-divider) p-6 pb-4">
              <div className="text-left">
                <h2 id={dialogTitleId} className={GRADIENT_SUBHEADING_CLASS}>
                  {modalState.type === 'create'
                    ? 'Create a Job Application'
                    : 'Edit Job Application'}
                </h2>
              </div>

              <button
                ref={cancelButtonRef}
                type="button"
                onClick={closeModal}
                className="rounded-md border border-(--danger-border) px-4 py-2 text-sm font-semibold text-(--danger-text) transition hover:bg-(--danger-bg)"
              >
                Cancel
              </button>
            </div>

            <div className="h-[80vh] max-h-[80vh] overflow-hidden p-6">
              {modalState.type === 'create' ? (
                <CreateJobForm
                  inModal
                  onSuccess={closeModal}
                  onCancel={closeModal}
                />
              ) : selectedJob ? (
                <EditJobForm
                  inModal
                  onSuccess={closeModal}
                  onCancel={closeModal}
                  initialJob={selectedJob.formData}
                  initialTimeline={selectedJob.timeline}
                  initialInterviews={selectedJob.interviews}
                  initialFollowUps={selectedJob.followUps}
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
