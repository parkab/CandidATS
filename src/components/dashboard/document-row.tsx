'use client';

import { useEffect, useRef, useState } from 'react';

type DocumentRowProps = {
  job: string;
  documentTitle: string;
  lastUpdated: string;
  status: 'Ready' | 'Needs review' | 'Draft';
};

const STATUS_STYLES: Record<DocumentRowProps['status'], string> = {
  Ready:
    'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300',
  'Needs review':
    'border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300',
  Draft:
    'border-slate-200/70 bg-slate-50 text-slate-700 dark:border-slate-400/40 dark:bg-slate-500/10 dark:text-slate-300',
};

export default function DocumentRow({
  job,
  documentTitle,
  lastUpdated,
  status,
}: DocumentRowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <tr className="border-t border-[--surface-border] transition hover:bg-[--surface-hover]">
      <td className="px-4 py-20 align-middle">
        <p className="text-sm font-semibold text-[--foreground]">{job}</p>
      </td>
      <td className="px-4 py-20 align-middle">
        <p className="text-sm font-medium text-[--foreground]">{documentTitle}</p>
      </td>
      <td className="px-4 py-20 align-middle text-sm text-[--foreground-muted]">
        {lastUpdated}
      </td>
      <td className="px-4 py-20 align-middle">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
        >
          {status}
        </span>
      </td>
      <td className="px-4 py-20 text-right align-middle">
        <div className="relative inline-block text-left" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[--surface-border] bg-[--surface] px-3 py-1.5 text-xs font-medium text-[--foreground] shadow-sm transition hover:bg-[--surface-hover] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1"
          >
            Actions
            <span
              aria-hidden
              className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
            >
              ▾
            </span>
          </button>

          {isMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-10 mt-1 min-w-[10rem] rounded-md border border-[--surface-border] bg-[--surface] p-1 shadow-md"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full cursor-pointer rounded px-3 py-2 text-left text-xs text-[--foreground] transition hover:bg-[--surface-hover] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
              >
                Open document
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
                className="block w-full cursor-pointer rounded px-3 py-2 text-left text-xs text-[--foreground] transition hover:bg-[--surface-hover] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
              >
                Open job
              </button>
            </div>
          ) : null}
        </div>
      </td>
    </tr>
  );
}