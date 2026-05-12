'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

type DocumentRowProps = {
  jobId: string | null;
  documentId: string;
  jobTitle: string;
  companyName: string;
  documentTitle: string;
  lastUpdated: string;
  status: 'Ready' | 'Needs review' | 'Draft' | 'Archived';
  docTypeLabel: string;
  tags: string[];
  versionNumber: number;
  onDuplicate?: () => void;
  onRename?: () => void;
  onEditDetails?: () => void;
  onDelete?: () => void;
};

const STATUS_STYLES: Record<DocumentRowProps['status'], string> = {
  Ready:
    'border-emerald-400/25 bg-emerald-500/10 text-(--foreground) ring-1 ring-inset ring-emerald-400/15',
  'Needs review':
    'border-amber-400/25 bg-amber-500/10 text-amber-100/95 ring-1 ring-inset ring-amber-400/15',
  Draft:
    'border-[--surface-border] bg-[--surface] text-[--text-muted] ring-1 ring-inset ring-[--surface-divider]',
  Archived:
    'border-[color-mix(in_oklab,var(--foreground)_22%,transparent)] bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color-mix(in_oklab,var(--foreground)_85%,var(--text-muted)_15%)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--foreground)_15%,transparent)]',
};

const MENU_MIN_WIDTH_PX = 208;
const MENU_GAP_PX = 6;
const VIEW_MARGIN = 10;

function IconDocument() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-[--text-muted]"
      aria-hidden
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-[--text-muted]"
      aria-hidden
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="opacity-75 transition group-hover/menu:opacity-100"
      aria-hidden
    >
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const MAX_TAG_CHIPS = 4;

export default function DocumentRow({
  jobId,
  documentId,
  jobTitle,
  companyName,
  documentTitle,
  lastUpdated,
  status,
  docTypeLabel,
  tags,
  versionNumber,
  onDuplicate,
  onRename,
  onEditDetails,
  onDelete,
}: DocumentRowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const pendingInitialFocusRef = useRef<'first' | 'last'>('first');

  const documentHref = `/documents/${encodeURIComponent(documentId)}/view`;
  const jobHref = jobId
    ? `/dashboard?openJob=${encodeURIComponent(jobId)}&tab=documents`
    : null;

  const computeMenuLayout = useCallback((menuEl: HTMLDivElement | null) => {
    const btn = buttonRef.current;
    if (!btn) return null;

    const rect = btn.getBoundingClientRect();
    const measuredW = menuEl?.offsetWidth ?? MENU_MIN_WIDTH_PX;
    const minWidth = Math.max(
      MENU_MIN_WIDTH_PX,
      measuredW,
      Math.ceil(rect.width),
    );
    const menuHeight = menuEl?.offsetHeight ?? 96;

    let left = rect.right - minWidth;
    left = clamp(left, VIEW_MARGIN, window.innerWidth - minWidth - VIEW_MARGIN);

    const spaceBelow = window.innerHeight - rect.bottom - VIEW_MARGIN;
    const spaceAbove = rect.top - VIEW_MARGIN;
    const fitsBelow = spaceBelow >= menuHeight + MENU_GAP_PX;
    const fitsAbove = spaceAbove >= menuHeight + MENU_GAP_PX;

    let top: number;
    if (fitsBelow || !fitsAbove) {
      top = rect.bottom + MENU_GAP_PX;
      if (top + menuHeight > window.innerHeight - VIEW_MARGIN) {
        top = window.innerHeight - VIEW_MARGIN - menuHeight;
      }
    } else {
      top = rect.top - MENU_GAP_PX - menuHeight;
    }

    top = clamp(
      top,
      VIEW_MARGIN,
      window.innerHeight - menuHeight - VIEW_MARGIN,
    );

    return { top, left, minWidth };
  }, []);

  const updateMenuPosition = useCallback(() => {
    const next = computeMenuLayout(menuPanelRef.current);
    if (next) setMenuStyle(next);
  }, [computeMenuLayout]);

  const focusMenuItem = useCallback((target: 'first' | 'last' | number) => {
    const menuItems = menuPanelRef.current?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])',
    );
    if (!menuItems || menuItems.length === 0) return;

    if (target === 'first') {
      menuItems[0]?.focus();
      return;
    }
    if (target === 'last') {
      menuItems[menuItems.length - 1]?.focus();
      return;
    }

    const index =
      ((target % menuItems.length) + menuItems.length) % menuItems.length;
    menuItems[index]?.focus();
  }, []);

  function openMenuFromButton(initialFocus: 'first' | 'last' = 'first') {
    const btn = buttonRef.current;
    pendingInitialFocusRef.current = initialFocus;
    if (!btn) {
      setIsMenuOpen(true);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const minWidth = Math.max(MENU_MIN_WIDTH_PX, Math.ceil(rect.width));
    let left = rect.right - minWidth;
    left = clamp(left, VIEW_MARGIN, window.innerWidth - minWidth - VIEW_MARGIN);

    const estH = 96;
    let top = rect.bottom + MENU_GAP_PX;
    if (
      rect.bottom + MENU_GAP_PX + estH > window.innerHeight - VIEW_MARGIN &&
      rect.top > estH + VIEW_MARGIN
    ) {
      top = rect.top - MENU_GAP_PX - estH;
    }
    top = clamp(top, VIEW_MARGIN, window.innerHeight - estH - VIEW_MARGIN);

    setMenuStyle({ top, left, minWidth });
    setIsMenuOpen(true);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isMenuOpen || !mounted) {
      setMenuStyle(null);
      return;
    }

    updateMenuPosition();
    const id = requestAnimationFrame(() => updateMenuPosition());
    return () => cancelAnimationFrame(id);
  }, [isMenuOpen, mounted, updateMenuPosition]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const onReposition = () => updateMenuPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [isMenuOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const id = requestAnimationFrame(() => {
      focusMenuItem(pendingInitialFocusRef.current);
    });
    return () => cancelAnimationFrame(id);
  }, [focusMenuItem, isMenuOpen]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuPanelRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };

    if (!isMenuOpen) return;

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isMenuOpen]);

  const jobLine =
    companyName.trim().length > 0
      ? `${jobTitle} · ${companyName.trim()}`
      : jobTitle;

  const itemClass =
    'flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-[--foreground] outline-none transition-colors hover:bg-[var(--popover-hover)] focus-visible:bg-[var(--popover-hover)]';

  const menuPanel =
    isMenuOpen && mounted && menuStyle ? (
      <div
        ref={menuPanelRef}
        role="menu"
        aria-orientation="vertical"
        onKeyDown={(event) => {
          const menuItems = menuPanelRef.current?.querySelectorAll<HTMLElement>(
            '[role="menuitem"]:not([aria-disabled="true"])',
          );
          if (!menuItems || menuItems.length === 0) return;

          const currentIndex = Array.from(menuItems).findIndex(
            (item) => item === document.activeElement,
          );

          if (event.key === 'Escape') {
            event.preventDefault();
            setIsMenuOpen(false);
            buttonRef.current?.focus();
            return;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
            focusMenuItem(nextIndex);
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            const nextIndex =
              currentIndex < 0 ? menuItems.length - 1 : currentIndex - 1;
            focusMenuItem(nextIndex);
            return;
          }

          if (event.key === 'Home') {
            event.preventDefault();
            focusMenuItem('first');
            return;
          }

          if (event.key === 'End') {
            event.preventDefault();
            focusMenuItem('last');
            return;
          }

          if (event.key === 'Tab') {
            setIsMenuOpen(false);
          }
        }}
        className="fixed z-[200] overflow-hidden rounded-2xl border border-solid p-1 opacity-100 [background-color:var(--popover-bg)] [border-color:var(--popover-border)] [box-shadow:var(--popover-shadow)]"
        style={{
          top: menuStyle.top,
          left: menuStyle.left,
          minWidth: menuStyle.minWidth,
        }}
      >
        <Link
          href={documentHref}
          role="menuitem"
          onClick={() => setIsMenuOpen(false)}
          className={`${itemClass} rounded-xl`}
        >
          <IconDocument />
          <span className="min-w-0">View/Download Document</span>
        </Link>
        {onDuplicate ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsMenuOpen(false);
              onDuplicate();
            }}
            className={`${itemClass} w-full rounded-xl border-0 bg-transparent text-left font-[inherit]`}
          >
            <span className="min-w-0">Duplicate…</span>
          </button>
        ) : null}
        {onRename ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsMenuOpen(false);
              onRename();
            }}
            className={`${itemClass} w-full rounded-xl border-0 bg-transparent text-left font-[inherit]`}
          >
            <span className="min-w-0">Rename…</span>
          </button>
        ) : null}
        {onEditDetails ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsMenuOpen(false);
              onEditDetails();
            }}
            className={`${itemClass} w-full rounded-xl border-0 bg-transparent text-left font-[inherit]`}
          >
            <span className="min-w-0">Edit details…</span>
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsMenuOpen(false);
              onDelete();
            }}
            className={`${itemClass} w-full rounded-xl border-0 bg-transparent text-left font-[inherit]`}
            style={{ color: 'var(--danger-text)' }}
          >
            <span className="min-w-0">Delete…</span>
          </button>
        ) : null}
        <div
          className="mx-1.5 h-px [background-color:var(--popover-border)]"
          role="separator"
        />
        {jobHref ? (
          <Link
            href={jobHref}
            role="menuitem"
            onClick={() => setIsMenuOpen(false)}
            className={`${itemClass} rounded-xl`}
          >
            <IconBriefcase />
            <span className="min-w-0">Open job</span>
          </Link>
        ) : null}
      </div>
    ) : null;

  return (
    <li>
      <div className="relative overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface) p-6 shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[linear-gradient(to_right,#ff75c3_0%,#ffa647_20%,#ffe83f_40%,#9fff5b_60%,#70e2ff_80%,#cd93ff_100%)]"
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Link
              href={documentHref}
              className="block font-semibold leading-snug text-[--foreground] underline-offset-2 transition hover:underline"
            >
              <span className="line-clamp-2 sm:line-clamp-1">
                {documentTitle}
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-(--text-muted)">
              {jobLine}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="inline-flex max-w-[10rem] truncate rounded-full border border-[--surface-border] px-2 py-0.5 text-xs font-semibold text-[--foreground]">
                {docTypeLabel}
              </span>
              <span className="inline-flex rounded-full border border-(--surface-border) bg-(--surface-dimmed) px-2 py-0.5 text-xs font-medium text-(--text-muted)">
                v{versionNumber}
              </span>
              {tags.slice(0, MAX_TAG_CHIPS).map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="inline-block w-fit rounded-full border border-(--surface-border) px-2 py-0.5 text-xs font-medium text-(--text-muted)"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
              {tags.length > MAX_TAG_CHIPS ? (
                <span className="text-xs text-(--text-muted)">
                  +{tags.length - MAX_TAG_CHIPS} more
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 sm:gap-4">
            <span className="text-xs text-(--text-muted) -ml-2 sm:ml-0">
              {lastUpdated}
            </span>
            <span
              className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
            >
              {status}
            </span>

            <div className="relative ml-auto sm:ml-0">
              <button
                ref={buttonRef}
                type="button"
                onKeyDown={(event) => {
                  if (isMenuOpen) return;

                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    openMenuFromButton('first');
                    return;
                  }

                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    openMenuFromButton('last');
                    return;
                  }

                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openMenuFromButton('first');
                  }
                }}
                onClick={() => {
                  if (isMenuOpen) {
                    setIsMenuOpen(false);
                    return;
                  }
                  openMenuFromButton();
                }}
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                aria-label="Document actions"
                className={`group/menu flex cursor-pointer items-center justify-center rounded-xl border p-2 text-[--foreground] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,#70e2ff_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[--background] ${
                  isMenuOpen
                    ? 'border-[--action-border] bg-[--action-bg] shadow-sm'
                    : 'border-transparent hover:border-[--surface-border] hover:bg-[color-mix(in_oklab,var(--foreground)_6%,var(--background))]'
                }`}
              >
                <MoreIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {mounted && menuPanel ? createPortal(menuPanel, document.body) : null}
    </li>
  );
}
