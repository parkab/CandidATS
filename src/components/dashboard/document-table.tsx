'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import DocumentRow from './document-row';

type ApiJobSummary = {
  id: string;
  title: string;
  company_name: string;
};

type ApiDocument = {
  id: string;
  job_id: string;
  title: string;
  type?: string;
  status: string;
  tags?: string[];
  updated_at: string;
};

type DocType = 'resume' | 'cover_letter' | 'other';
type ApiStatus = 'draft' | 'ready' | 'archived';

type ListRow = {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  documentTitle: string;
  lastUpdated: string;
  updatedAt: string;
  status: 'Ready' | 'Needs review' | 'Draft' | 'Archived';
  statusRaw: ApiStatus;
  docType: DocType;
  tags: string[];
};

type TypeFilter = 'all' | DocType;
type StatusFilter = 'all' | ApiStatus;

const DEFAULT_SORT_PRIMARY: 'date' | 'title' = 'date';
const DEFAULT_DATE_ORDER: 'asc' | 'desc' = 'desc';
const DEFAULT_TITLE_ORDER: 'asc' | 'desc' = 'asc';

function mapApiStatus(status: string): ListRow['status'] {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'draft':
      return 'Draft';
    case 'archived':
      return 'Archived';
    default:
      return 'Draft';
  }
}

function mapApiStatusRaw(status: string): ApiStatus {
  if (status === 'ready' || status === 'archived') return status;
  return 'draft';
}

function parseDocType(value: unknown): DocType {
  if (value === 'resume' || value === 'cover_letter' || value === 'other') {
    return value;
  }
  return 'other';
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function formatUpdatedAt(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value;
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function startOfDayLocal(ymd: string): Date | null {
  const trimmed = ymd.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function endOfDayLocal(ymd: string): Date | null {
  const trimmed = ymd.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function parseTagNeedles(raw: string): string[] {
  const parts = raw
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

function docTypeLabel(docType: DocType): string {
  switch (docType) {
    case 'resume':
      return 'Resume';
    case 'cover_letter':
      return 'Cover letter';
    default:
      return 'Other';
  }
}

const selectControlClass = 'library-filter-select';

const inputControlClass = 'library-filter-input';

function DocumentListSkeleton() {
  return (
    <ul className="flex flex-col gap-3 px-1 sm:px-0">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="animate-pulse rounded-2xl border border-[--surface-border] bg-[--surface] p-5"
        >
          <div className="h-4 max-w-md w-[66%] rounded-md bg-[color-mix(in_oklab,var(--foreground)_12%,transparent)]" />
          <div className="mt-3 h-3 max-w-xs w-1/2 rounded-md bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)]" />
          <div className="mt-5 flex gap-3">
            <div className="h-5 w-16 rounded-full bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)]" />
            <div className="h-5 w-20 rounded-full bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)]" />
            <div className="ml-auto h-9 w-9 rounded-xl bg-[color-mix(in_oklab,var(--foreground)_10%,transparent)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function DocumentTable() {
  const [allRows, setAllRows] = useState<ListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tagQuery, setTagQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortPrimary, setSortPrimary] = useState<'date' | 'title'>(DEFAULT_SORT_PRIMARY);
  const [dateOrder, setDateOrder] = useState<'asc' | 'desc'>(DEFAULT_DATE_ORDER);
  const [titleOrder, setTitleOrder] = useState<'asc' | 'desc'>(DEFAULT_TITLE_ORDER);

  const [jobSelectOptions, setJobSelectOptions] = useState<ApiJobSummary[]>([]);
  const [duplicateRow, setDuplicateRow] = useState<ListRow | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [duplicateJobId, setDuplicateJobId] = useState('');
  const [duplicateBusy, setDuplicateBusy] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [renameRow, setRenameRow] = useState<ListRow | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const dupDialogTitleId = useId();
  const renDialogTitleId = useId();

  const loadDocuments = useCallback(
    async (signal: AbortSignal, silent = false) => {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const jobsRes = await fetch('/api/jobs', { signal });

        if (!jobsRes.ok) {
          const body = await jobsRes.json().catch(() => null);
          const message =
            typeof body?.error === 'string' ? body.error : 'Unable to load jobs.';
          throw new Error(message);
        }

        const jobsPayload = (await jobsRes.json()) as {
          jobIds?: string[];
          jobs?: ApiJobSummary[];
        };

        const jobIds = Array.isArray(jobsPayload.jobIds) ? jobsPayload.jobIds : [];
        const jobById = new Map<string, { title: string; company_name: string }>();

        const rawJobs = jobsPayload.jobs ?? [];

        for (const job of rawJobs) {
          if (job?.id) {
            jobById.set(job.id, {
              title: typeof job.title === 'string' ? job.title : 'Untitled role',
              company_name:
                typeof job.company_name === 'string' ? job.company_name : '',
            });
          }
        }

        for (const id of jobIds) {
          if (!jobById.has(id)) {
            jobById.set(id, { title: 'Job', company_name: id });
          }
        }

        const selectOpts: ApiJobSummary[] = jobIds.map((id) => {
          const m = jobById.get(id) ?? { title: 'Job', company_name: '' };
          return {
            id,
            title: m.title,
            company_name: m.company_name,
          };
        });
        selectOpts.sort((a, b) => {
          const ta = `${a.title} ${a.company_name}`;
          const tb = `${b.title} ${b.company_name}`;
          return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
        });

        const combined: ListRow[] = [];

        await Promise.all(
          jobIds.map(async (jobId) => {
            const docRes = await fetch(
              `/api/documents?jobId=${encodeURIComponent(jobId)}`,
              { signal },
            );

            if (!docRes.ok) {
              const body = await docRes.json().catch(() => null);
              const message =
                typeof body?.error === 'string'
                  ? body.error
                  : 'Unable to load documents for a job.';
              throw new Error(message);
            }

            const data = (await docRes.json()) as { documents?: ApiDocument[] };
            const documents = Array.isArray(data.documents) ? data.documents : [];
            const jobMeta =
              jobById.get(jobId) ?? { title: 'Job', company_name: '' };

            for (const doc of documents) {
              if (!doc?.id) continue;
              const updatedAt =
                typeof doc.updated_at === 'string' ? doc.updated_at : '';
              const rawStatus = typeof doc.status === 'string' ? doc.status : 'draft';

              combined.push({
                id: doc.id,
                jobId,
                jobTitle: jobMeta.title,
                companyName: jobMeta.company_name,
                documentTitle:
                  typeof doc.title === 'string' && doc.title.trim().length > 0
                    ? doc.title
                    : 'Untitled document',
                lastUpdated: formatUpdatedAt(updatedAt),
                updatedAt,
                status: mapApiStatus(rawStatus),
                statusRaw: mapApiStatusRaw(rawStatus),
                docType: parseDocType(doc.type),
                tags: normalizeTags(doc.tags),
              });
            }
          }),
        );

        combined.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );

        if (!signal.aborted) {
          setAllRows(combined);
          setJobSelectOptions(selectOpts);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        if (!signal.aborted) {
          setError(err instanceof Error ? err.message : 'Something went wrong.');
          setAllRows([]);
        }
      } finally {
        if (!signal.aborted && !silent) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadDocuments(ac.signal, false);
    return () => ac.abort();
  }, [loadDocuments]);

  function openDuplicateDialog(row: ListRow) {
    setDuplicateError(null);
    setDuplicateRow(row);
    setDuplicateTitle(`${row.documentTitle} (copy)`);
    setDuplicateJobId(row.jobId);
  }

  function closeDuplicateDialog() {
    setDuplicateRow(null);
    setDuplicateError(null);
    setDuplicateBusy(false);
  }

  async function submitDuplicate() {
    if (!duplicateRow) return;
    const title = duplicateTitle.trim();
    if (!title) {
      setDuplicateError('Enter a document name.');
      return;
    }
    if (!duplicateJobId) {
      setDuplicateError('Select a job.');
      return;
    }

    setDuplicateBusy(true);
    setDuplicateError(null);
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(duplicateRow.id)}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, jobId: duplicateJobId }),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof body?.error === 'string' ? body.error : 'Could not duplicate document.';
        throw new Error(message);
      }
      closeDuplicateDialog();
      const ac = new AbortController();
      await loadDocuments(ac.signal, true);
    } catch (err: unknown) {
      setDuplicateError(err instanceof Error ? err.message : 'Could not duplicate document.');
    } finally {
      setDuplicateBusy(false);
    }
  }

  function openRenameDialog(row: ListRow) {
    setRenameError(null);
    setRenameRow(row);
    setRenameTitle(row.documentTitle);
  }

  function closeRenameDialog() {
    setRenameRow(null);
    setRenameError(null);
    setRenameBusy(false);
  }

  async function submitRename() {
    if (!renameRow) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError('Enter a document name.');
      return;
    }

    setRenameBusy(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(renameRow.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          typeof body?.error === 'string' ? body.error : 'Could not rename document.';
        throw new Error(message);
      }
      closeRenameDialog();
      const ac = new AbortController();
      await loadDocuments(ac.signal, true);
    } catch (err: unknown) {
      setRenameError(err instanceof Error ? err.message : 'Could not rename document.');
    } finally {
      setRenameBusy(false);
    }
  }

  const displayRows = useMemo(() => {
    const tagNeedles = parseTagNeedles(tagQuery);
    const from = startOfDayLocal(dateFrom);
    const to = endOfDayLocal(dateTo);

    const filtered = allRows.filter((row) => {
      if (typeFilter !== 'all' && row.docType !== typeFilter) {
        return false;
      }
      if (statusFilter !== 'all' && row.statusRaw !== statusFilter) {
        return false;
      }
      if (tagNeedles.length > 0) {
        const tagsLower = row.tags.map((t) => t.toLowerCase());
        const allMatch = tagNeedles.every((needle) =>
          tagsLower.some((t) => t.includes(needle)),
        );
        if (!allMatch) return false;
      }
      const docTime = new Date(row.updatedAt).getTime();
      if (Number.isNaN(docTime)) return false;
      if (from !== null && docTime < from.getTime()) {
        return false;
      }
      if (to !== null && docTime > to.getTime()) {
        return false;
      }
      return true;
    });

    const cmpDate = (a: ListRow, b: ListRow) => {
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      return dateOrder === 'desc' ? tb - ta : ta - tb;
    };
    const cmpTitle = (a: ListRow, b: ListRow) => {
      const c = a.documentTitle.localeCompare(b.documentTitle, undefined, {
        sensitivity: 'base',
      });
      return titleOrder === 'desc' ? -c : c;
    };
    const tieTitleAsc = (a: ListRow, b: ListRow) =>
      a.documentTitle.localeCompare(b.documentTitle, undefined, {
        sensitivity: 'base',
      });
    const tieDateNewest = (a: ListRow, b: ListRow) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

    const sorted = [...filtered].sort((a, b) => {
      if (sortPrimary === 'date') {
        const d = cmpDate(a, b);
        if (d !== 0) return d;
        return tieTitleAsc(a, b);
      }
      const t = cmpTitle(a, b);
      if (t !== 0) return t;
      return tieDateNewest(a, b);
    });

    return sorted;
  }, [
    allRows,
    typeFilter,
    statusFilter,
    tagQuery,
    dateFrom,
    dateTo,
    sortPrimary,
    dateOrder,
    titleOrder,
  ]);

  const isDefaultSort =
    sortPrimary === DEFAULT_SORT_PRIMARY &&
    (sortPrimary === 'date'
      ? dateOrder === DEFAULT_DATE_ORDER
      : titleOrder === DEFAULT_TITLE_ORDER);

  const hasNonDefaultView =
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    tagQuery.trim().length > 0 ||
    dateFrom.trim().length > 0 ||
    dateTo.trim().length > 0 ||
    !isDefaultSort;

  function resetFilters() {
    setTypeFilter('all');
    setStatusFilter('all');
    setTagQuery('');
    setDateFrom('');
    setDateTo('');
    setSortPrimary(DEFAULT_SORT_PRIMARY);
    setDateOrder(DEFAULT_DATE_ORDER);
    setTitleOrder(DEFAULT_TITLE_ORDER);
  }

  const countLabel = hasNonDefaultView
    ? displayRows.length === allRows.length && allRows.length === 1
      ? '1 of 1 document'
      : `${displayRows.length} of ${allRows.length} documents`
    : allRows.length === 1
      ? '1 document'
      : `${allRows.length} documents`;

  const showFilterBar = !isLoading && !error && allRows.length > 0;

  return (
    <div className="mx-auto mt-10 w-full max-w-3xl px-1 sm:mt-12 sm:px-0">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-[--foreground] sm:text-3xl">
              Library
            </h2>
            {!isLoading && !error ? (
              <span className="text-sm font-medium text-[--text-muted]">{countLabel}</span>
            ) : null}
          </div>
          <p className="max-w-lg text-sm leading-relaxed text-[--text-muted]">
            Filter and sort everything you have uploaded or drafted for your applications.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 cursor-pointer rounded-xl border border-[--action-border] bg-[--action-bg] px-4 py-2.5 text-sm font-semibold text-[--foreground] shadow-sm transition hover:bg-[--action-hover] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,#70e2ff_50%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[--background]"
        >
          Upload
        </button>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-[--danger-border] bg-[--danger-bg] px-5 py-4 text-center text-sm leading-relaxed text-[--danger-text]"
        >
          {error}
        </div>
      ) : null}

      {!error && isLoading ? (
        <div role="status" aria-live="polite" aria-label="Loading documents">
          <DocumentListSkeleton />
        </div>
      ) : null}

      {showFilterBar ? (
        <div
          className="library-filter-panel mb-6 space-y-3 rounded-2xl border border-[--surface-border] bg-[--surface] p-4 sm:p-5"
          role="search"
          aria-label="Document filters"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[--text-muted]">
              Type
              <select
                className={selectControlClass}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              >
                <option value="all">All types</option>
                <option value="resume">Resume</option>
                <option value="cover_letter">Cover letter</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[--text-muted]">
              Status
              <select
                className={selectControlClass}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-[2] flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[--text-muted]">
              Tags (all must match)
              <input
                type="search"
                className={inputControlClass}
                placeholder="e.g. draft, remote — comma or space"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[--text-muted]">
              Updated from
              <input
                type="date"
                className={inputControlClass}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="flex min-w-[9rem] flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[--text-muted]">
              Updated to
              <input
                type="date"
                className={inputControlClass}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[--text-muted]">
              Sort by
              <select
                className={selectControlClass}
                value={sortPrimary}
                onChange={(e) =>
                  setSortPrimary(e.target.value as 'date' | 'title')
                }
              >
                <option value="date">Updated date</option>
                <option value="title">Document title</option>
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium uppercase tracking-wide text-[--text-muted]">
              {sortPrimary === 'date' ? 'Date order' : 'Title order'}
              <select
                className={selectControlClass}
                value={sortPrimary === 'date' ? dateOrder : titleOrder}
                onChange={(e) => {
                  const v = e.target.value as 'asc' | 'desc';
                  if (sortPrimary === 'date') {
                    setDateOrder(v);
                  } else {
                    setTitleOrder(v);
                  }
                }}
              >
                {sortPrimary === 'date' ? (
                  <>
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </>
                ) : (
                  <>
                    <option value="asc">A → Z</option>
                    <option value="desc">Z → A</option>
                  </>
                )}
              </select>
            </label>
            {hasNonDefaultView ? (
              <button
                type="button"
                onClick={resetFilters}
                className="cursor-pointer rounded-lg border border-[--action-border] bg-[--action-bg] px-3 py-2 text-sm font-semibold text-[--foreground] transition hover:bg-[--action-hover] sm:ml-auto sm:self-end"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!error && !isLoading && allRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[--surface-border] bg-[color-mix(in_oklab,var(--foreground)_3%,var(--background))] px-6 py-14 text-center">
          <p className="text-base font-medium text-[--foreground]">No documents yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[--text-muted]">
            When you add files from a job application, they will show up here
            automatically.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-xl border border-[--action-border] bg-[--action-bg] px-4 py-2.5 text-sm font-semibold text-[--foreground] transition hover:bg-[--action-hover]"
          >
            Go to dashboard
          </Link>
        </div>
      ) : null}

      {!error && !isLoading && allRows.length > 0 && displayRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[--surface-border] bg-[color-mix(in_oklab,var(--foreground)_3%,var(--background))] px-6 py-12 text-center">
          <p className="text-base font-medium text-[--foreground]">
            No documents match
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[--text-muted]">
            Try widening your filters or reset to see all {allRows.length} documents.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 cursor-pointer rounded-xl border border-[--action-border] bg-[--action-bg] px-4 py-2.5 text-sm font-semibold text-[--foreground] transition hover:bg-[--action-hover]"
          >
            Reset filters
          </button>
        </div>
      ) : null}

      {!error && !isLoading && allRows.length > 0 && displayRows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {displayRows.map((doc) => (
            <DocumentRow
              key={doc.id}
              jobId={doc.jobId}
              documentId={doc.id}
              jobTitle={doc.jobTitle}
              companyName={doc.companyName}
              documentTitle={doc.documentTitle}
              lastUpdated={doc.lastUpdated}
              status={doc.status}
              docTypeLabel={docTypeLabel(doc.docType)}
              tags={doc.tags}
              onDuplicate={() => openDuplicateDialog(doc)}
              onRename={() => openRenameDialog(doc)}
            />
          ))}
        </ul>
      ) : null}

      {duplicateRow ? (
        <div className="fixed inset-0 z-[250] grid place-items-center p-4">
          <button
            type="button"
            onClick={closeDuplicateDialog}
            aria-label="Close duplicate dialog"
            className="absolute inset-0 bg-black/55"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={dupDialogTitleId}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[--surface-border] bg-[var(--popover-bg)] shadow-2xl [background-clip:padding-box]"
          >
            <div className="border-b border-[--surface-divider] p-5">
              <h2
                id={dupDialogTitleId}
                className="text-lg font-semibold tracking-tight text-[--foreground]"
              >
                Duplicate document
              </h2>
              <p className="mt-1 text-sm text-[--text-muted]">
                Choose a name and the job this copy belongs to.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-[--foreground]">
                Name
                <input
                  type="text"
                  value={duplicateTitle}
                  onChange={(e) => setDuplicateTitle(e.target.value)}
                  className="library-filter-input rounded-xl"
                  autoComplete="off"
                  disabled={duplicateBusy}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-[--foreground]">
                Job
                <select
                  className="library-filter-select rounded-xl"
                  value={duplicateJobId}
                  onChange={(e) => setDuplicateJobId(e.target.value)}
                  disabled={duplicateBusy}
                >
                  {jobSelectOptions.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                      {job.company_name.trim().length > 0
                        ? ` · ${job.company_name.trim()}`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              {duplicateError ? (
                <p
                  role="alert"
                  className="text-sm font-medium text-[--danger-text]"
                >
                  {duplicateError}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[--surface-border] bg-[var(--popover-bg)] p-4">
              <button
                type="button"
                onClick={closeDuplicateDialog}
                disabled={duplicateBusy}
                className="cursor-pointer rounded-lg border border-[--surface-border] bg-[var(--popover-bg)] px-4 py-2 text-sm font-semibold text-[--foreground] transition hover:bg-[var(--surface)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitDuplicate()}
                disabled={duplicateBusy}
                className="cursor-pointer rounded-lg border border-[--action-border] bg-[--action-bg] px-4 py-2 text-sm font-semibold text-[--foreground] transition hover:bg-[--action-hover] disabled:opacity-50"
              >
                {duplicateBusy ? 'Duplicating…' : 'Duplicate'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {renameRow ? (
        <div className="fixed inset-0 z-[250] grid place-items-center p-4">
          <button
            type="button"
            onClick={closeRenameDialog}
            aria-label="Close rename dialog"
            className="absolute inset-0 bg-black/55"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={renDialogTitleId}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[--surface-border] bg-[var(--popover-bg)] shadow-2xl [background-clip:padding-box]"
          >
            <div className="border-b border-[--surface-divider] p-5">
              <h2
                id={renDialogTitleId}
                className="text-lg font-semibold tracking-tight text-[--foreground]"
              >
                Rename document
              </h2>
            </div>
            <div className="space-y-4 p-5">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-[--foreground]">
                Name
                <input
                  type="text"
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  className="library-filter-input rounded-xl"
                  autoComplete="off"
                  disabled={renameBusy}
                />
              </label>
              {renameError ? (
                <p
                  role="alert"
                  className="text-sm font-medium text-[--danger-text]"
                >
                  {renameError}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[--surface-border] bg-[var(--popover-bg)] p-4">
              <button
                type="button"
                onClick={closeRenameDialog}
                disabled={renameBusy}
                className="cursor-pointer rounded-lg border border-[--surface-border] bg-[var(--popover-bg)] px-4 py-2 text-sm font-semibold text-[--foreground] transition hover:bg-[var(--surface)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitRename()}
                disabled={renameBusy}
                className="cursor-pointer rounded-lg border border-[--action-border] bg-[--action-bg] px-4 py-2 text-sm font-semibold text-[--foreground] transition hover:bg-[--action-hover] disabled:opacity-50"
              >
                {renameBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
