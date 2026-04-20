'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

export default function JobSearchFilterControl() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = useMemo(() => searchParams.get('q') ?? '', [searchParams]);
  const stage = useMemo(
    () => searchParams.get('stage') ?? 'all',
    [searchParams],
  );
  const location = useMemo(
    () => searchParams.get('location') ?? '',
    [searchParams],
  );
  const deadlineState = useMemo(
    () => searchParams.get('deadlineState') ?? 'any',
    [searchParams],
  );

  const [searchQuery, setSearchQuery] = useState(query);
  const [selectedStage, setSelectedStage] = useState(stage);
  const [selectedLocation, setSelectedLocation] = useState(location);
  const [selectedDeadlineState, setSelectedDeadlineState] =
    useState(deadlineState);

  useEffect(() => {
    setSearchQuery(query);
    setSelectedStage(stage);
    setSelectedLocation(location);
    setSelectedDeadlineState(deadlineState);
  }, [query, stage, location, deadlineState]);

  function updateSearchParams(params: Record<string, string | null>) {
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
  }

  function handleSearch() {
    updateSearchParams({
      q: searchQuery || null,
      stage: selectedStage || null,
      location: selectedLocation || null,
      deadlineState: selectedDeadlineState || null,
    });
  }

  return (
    <div className="rounded-3xl border border-(--surface-border) bg-(--surface-muted) p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-(--text-muted)">
            Search jobs
          </span>
          <div className="flex w-full items-end justify-between gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="Search by title, company, or keywords"
              className="min-w-0 flex-1 rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:border-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--foreground)"
            />
            <button
              onClick={handleSearch}
              className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-medium text-(--background) hover:bg-(--inverse-hover) focus:outline-none focus:ring-2 focus:ring-(--foreground) focus:ring-offset-2"
            >
              Apply filters
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-(--text-muted)">Stage</span>
          <select
            value={selectedStage}
            onChange={(event) => setSelectedStage(event.target.value)}
            className="rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:border-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--foreground)"
          >
            {STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-(--text-muted)">
              Location
            </span>
            <input
              type="text"
              value={selectedLocation}
              onChange={(event) => setSelectedLocation(event.target.value)}
              placeholder="Enter a location"
              className="w-full rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:border-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--foreground)"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-(--text-muted)">
              Deadline
            </span>
            <select
              value={selectedDeadlineState}
              onChange={(event) => setSelectedDeadlineState(event.target.value)}
              className="rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-sm text-(--foreground) focus:border-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--foreground)"
            >
              {DEADLINE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
