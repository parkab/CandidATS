'use client';

import GRADIENT_HEADING_CLASS from '@/components/dashboard/gradient';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function Settings() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted ? resolvedTheme !== 'light' : true;

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className={GRADIENT_HEADING_CLASS}>Settings</h1>
      </div>

      <div className="mx-auto mt-10 max-w-2xl">
        <h2 className="mb-3 text-left text-xl font-semibold text-(--foreground)">
          Accessibility
        </h2>

        <div className="rounded-2xl border border-(--surface-border) bg-(--surface) px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-(--foreground)">
                Dark Mode
              </p>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                aria-label="Toggle dark mode"
                checked={isDarkMode}
                onChange={(event) => {
                  setTheme(event.target.checked ? 'dark' : 'light');
                }}
              />
              <span className="h-7 w-12 rounded-full bg-(--toggle-track) transition-colors duration-200 peer-checked:bg-emerald-500/70" />
              <span className="pointer-events-none absolute left-1 h-5 w-5 rounded-full border border-(--action-border) bg-(--background) shadow transition-transform duration-200 peer-checked:translate-x-5" />
            </label>
          </div>
        </div>

        <h2 className="mb-3 mt-10 text-left text-xl font-semibold text-(--foreground)">
          Account Settings
        </h2>

        <div className="rounded-2xl border border-(--surface-border) bg-(--surface) px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.25)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-(--foreground)">
                Reset Password
              </p>
            </div>

            {/* TODO: Add password reset page */}
            <Link
              href="/settings/reset-password"
              className="rounded-md border border-(--action-border) bg-(--action-bg) px-4 py-2 text-sm font-medium text-(--foreground) transition hover:bg-(--action-hover)"
            >
              Reset
            </Link>
          </div>

          <div className="my-4 h-px w-full bg-(--surface-divider)" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-(--foreground)">
                Delete Account
              </p>
            </div>
            {/* TODO: Add delete account popup */}
            <button
              type="button"
              className="rounded-md border border-(--danger-border) bg-(--danger-bg) px-4 py-2 text-sm font-semibold text-(--danger-text) transition hover:bg-(--danger-hover)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
