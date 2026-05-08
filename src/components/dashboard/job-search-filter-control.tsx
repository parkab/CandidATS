'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { ApplicationStatus } from '@/lib/jobs/status';
import { getMixedStageColor } from '@/components/dashboard/job-multi-step-form-logic';

const STAGE_OPTIONS = [
  { value: 'all', label: 'All stages' },
  { value: 'Interested', label: 'Interested' },
  { value: 'Applied', label: 'Applied' },
  { value: 'Interview', label: 'Interview' },
  { value: 'Offer', label: 'Offer' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Archived', label: 'Archived' },
] as const;

const DEADLINE_OPTIONS = [
  { value: 'any', label: 'All deadlines' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past due' },
  { value: 'noDeadline', label: 'No deadline' },
] as const;

const STATUS_STAGES: ApplicationStatus[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
];

function getStageOptionColor(value: string) {
  return STATUS_STAGES.includes(value as ApplicationStatus)
    ? getMixedStageColor(value as ApplicationStatus)
    : value === 'Archived'
      ? `color-mix(in oklab, #ffa647 75%, var(--foreground))`
      : 'var(--foreground)';
}

const EVENT_OPTIONS = [
  { value: 'any', label: 'All events' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'none', label: 'Not upcoming' },
] as const;

const SORT_OPTIONS = [
  { value: 'lastActivity', label: 'Last activity' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'company', label: 'Company' },
  { value: 'createdDate', label: 'Created date' },
] as const;

export default function JobSearchFilterControl() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = useMemo(() => searchParams.get('q') ?? '', [searchParams]);
  const stage = useMemo(
    () => searchParams.get('stage') ?? 'all',
    [searchParams],
  );
  const deadlineState = useMemo(
    () => searchParams.get('deadlineState') ?? 'any',
    [searchParams],
  );
  const priorityOnly = useMemo(
    () => searchParams.get('priority') === 'true',
    [searchParams],
  );
  const eventsFilter = useMemo(
    () => searchParams.get('events') ?? 'any',
    [searchParams],
  );
  const selectedSort = useMemo(
    () => searchParams.get('sort') ?? 'lastActivity',
    [searchParams],
  );

  const [searchQuery, setSearchQuery] = useState(query);
  const [selectedStage, setSelectedStage] = useState(stage);
  const [selectedDeadlineState, setSelectedDeadlineState] =
    useState(deadlineState);
  const [isPriorityOnly, setIsPriorityOnly] = useState(priorityOnly);
  const [selectedEvents, setSelectedEvents] = useState(eventsFilter);
  const [selectedSortValue, setSelectedSortValue] = useState(selectedSort);

  const stageSelectColor = STATUS_STAGES.includes(
    selectedStage as ApplicationStatus,
  )
    ? getMixedStageColor(selectedStage as ApplicationStatus)
    : selectedStage === 'Archived'
      ? `color-mix(in oklab, #ffa647 75%, var(--foreground))`
    : 'var(--foreground)';

  useEffect(() => {
    setSearchQuery(query);
    setSelectedStage(stage);
    setSelectedDeadlineState(deadlineState);
    setIsPriorityOnly(priorityOnly);
    setSelectedEvents(eventsFilter);
    setSelectedSortValue(selectedSort);
  }, [query, stage, deadlineState, priorityOnly, eventsFilter, selectedSort]);

  const updateSearchParams = useCallback(
    (params: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(params)) {
        if (!value) {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      }

      const queryString = nextParams.toString();
      router.replace(`/dashboard${queryString ? `?${queryString}` : ''}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateSearchParams({
        q: searchQuery || null,
      });
    }, 150);

    return () => clearTimeout(timeout);
  }, [searchQuery, updateSearchParams]);

  useEffect(() => {
    updateSearchParams({
      stage: selectedStage || null,
      deadlineState: selectedDeadlineState || null,
      priority: isPriorityOnly ? 'true' : null,
      events: selectedEvents || null,
      sort: selectedSortValue || null,
    });
  }, [
    selectedStage,
    selectedDeadlineState,
    isPriorityOnly,
    selectedEvents,
    selectedSortValue,
    updateSearchParams,
  ]);

  return (
    <div className="rounded-3xl border border-(--surface-border) bg-(--surface) p-4 shadow-sm">
      <div className="grid gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-(--text-muted)">
            Search jobs
          </span>
          <div className="profile-input-wrap">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by title, company, location, or keywords"
              className="profile-input"
            />
          </div>
        </label>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-(--text-muted)">
              Stage
            </span>
            <div className="profile-input-wrap">
              <select
                value={selectedStage}
                onChange={(event) => setSelectedStage(event.target.value)}
                className="profile-input bg-(--surface)"
                style={{ color: stageSelectColor }}
              >
                {STAGE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    style={{ color: getStageOptionColor(option.value) }}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-(--text-muted)">
              Deadline
            </span>
            <div className="profile-input-wrap">
              <select
                value={selectedDeadlineState}
                onChange={(event) =>
                  setSelectedDeadlineState(event.target.value)
                }
                className="profile-input bg-(--surface)"
              >
                {DEADLINE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-(--text-muted)">
              Events
            </span>
            <div className="profile-input-wrap">
              <select
                value={selectedEvents}
                onChange={(event) => setSelectedEvents(event.target.value)}
                className="profile-input bg-(--surface)"
              >
                {EVENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-(--text-muted)">
              Priority
            </span>
            <label className="flex h-10 items-center gap-2 text-sm text-(--foreground)">
              <input
                type="checkbox"
                checked={isPriorityOnly}
                onChange={(event) => setIsPriorityOnly(event.target.checked)}
                className="h-4 w-4 rounded border-(--surface-border) bg-(--background) text-(--foreground) accent-(--foreground) focus:ring-2 focus:ring-(--foreground)"
              />
              Priority only
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-(--text-muted)">
              Sort by
            </span>
            <div className="profile-input-wrap">
              <select
                value={selectedSortValue}
                onChange={(event) => setSelectedSortValue(event.target.value)}
                className="profile-input bg-(--surface)"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
