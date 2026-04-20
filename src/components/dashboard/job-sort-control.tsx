'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const SORT_OPTIONS = [
  { value: 'lastActivity', label: 'Last activity' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'company', label: 'Company' },
  { value: 'createdDate', label: 'Created date' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['value'];

export default function JobSortControl() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedSort = useMemo(() => {
    const currentSort = searchParams.get('sort');

    if (
      currentSort === 'deadline' ||
      currentSort === 'company' ||
      currentSort === 'createdDate' ||
      currentSort === 'lastActivity'
    ) {
      return currentSort;
    }

    return 'lastActivity';
  }, [searchParams]);

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', event.target.value);

    router.replace(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <label
        className="text-sm font-medium text-(--text-muted)"
        htmlFor="job-sort-select"
      >
        Sort by
      </label>
      <select
        id="job-sort-select"
        value={selectedSort}
        onChange={handleSortChange}
        className="rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-sm text-(--text-default) focus:outline-none focus:ring-2 focus:ring-(--foreground)"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
