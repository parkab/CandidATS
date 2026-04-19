'use client';

import { GRADIENT_SUBHEADING_CLASS } from '@/components/dashboard/gradient';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { WORK_MODE_VALUES } from '@/lib/profile/careerPreferences';
import type { WorkMode } from '@/lib/profile/careerPreferences';

export type CareerPreferencesData = {
  targetRoles: string | null;
  targetLocations: string | null;
  workMode: string | null;
  salaryPreference: string | null;
};

type CareerPreferencesSectionProps = {
  initialData: CareerPreferencesData | null;
};

type FormState = {
  targetRoles: string;
  targetLocations: string;
  workMode: string;
  salaryPreference: string;
};

type FormErrors = {
  submit?: string;
};

function toFormState(data: CareerPreferencesData | null): FormState {
  return {
    targetRoles: data?.targetRoles ?? '',
    targetLocations: data?.targetLocations ?? '',
    workMode: data?.workMode ?? '',
    salaryPreference: data?.salaryPreference ?? '',
  };
}

export default function CareerPreferencesSection({ initialData }: CareerPreferencesSectionProps) {
  const [data, setData] = useState<CareerPreferencesData | null>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(toFormState(initialData));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setIsToastVisible(false);
      return;
    }
    setIsToastVisible(true);
    const fade = setTimeout(() => setIsToastVisible(false), 3200);
    const clear = setTimeout(() => setToast(null), 3800);
    return () => {
      clearTimeout(fade);
      clearTimeout(clear);
    };
  }, [toast]);

  function openModal() {
    setForm(toFormState(data));
    setErrors({});
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setErrors({});
  }

  function onFieldChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setIsSaving(true);

    const payload: Record<string, string | null> = {
      targetRoles: form.targetRoles.trim() || null,
      targetLocations: form.targetLocations.trim() || null,
      workMode: (form.workMode as WorkMode) || null,
      salaryPreference: form.salaryPreference.trim() || null,
    };

    try {
      const response = await fetch('/api/profile/career-preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setErrors({ submit: 'Unable to save preferences. Please try again.' });
        setIsSaving(false);
        return;
      }

      const saved = (await response.json()) as CareerPreferencesData;
      setData(saved);
      setToast('Preferences saved.');
      closeModal();
    } catch {
      setErrors({ submit: 'Network issue. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }

  const hasAnyData =
    data?.targetRoles || data?.targetLocations || data?.workMode || data?.salaryPreference;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface) p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-(--foreground)">Career Preferences</h3>
        <button
          type="button"
          onClick={openModal}
          className="rounded-md border border-(--foreground) bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover)"
        >
          Edit preferences
        </button>
      </div>

      {!hasAnyData ? (
        <p className="text-sm text-(--text-muted)">
          No preferences set yet. Edit to add your career preferences.
        </p>
      ) : (
        <dl className="grid gap-3">
          {data?.targetRoles ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
                Target roles
              </dt>
              <dd className="mt-0.5 text-sm text-(--foreground)">{data.targetRoles}</dd>
            </div>
          ) : null}
          {data?.targetLocations ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
                Target locations
              </dt>
              <dd className="mt-0.5 text-sm text-(--foreground)">{data.targetLocations}</dd>
            </div>
          ) : null}
          {data?.workMode ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
                Work mode
              </dt>
              <dd className="mt-0.5 text-sm text-(--foreground)">{data.workMode}</dd>
            </div>
          ) : null}
          {data?.salaryPreference ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
                Salary preference
              </dt>
              <dd className="mt-0.5 text-sm text-(--foreground)">{data.salaryPreference}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {/* Edit modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            onClick={closeModal}
            aria-hidden="true"
            className="absolute inset-0 bg-black/55"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="career-prefs-modal-title"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
              }
            }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-(--surface-border) bg-(--background) shadow-2xl"
          >
            <form
              onSubmit={handleSubmit}
              className="grid gap-5 px-6 pb-6 pt-0"
            >
              <div className="flex items-center justify-between gap-3 border-b border-(--surface-divider) pb-4 pt-6">
                <h3 id="career-prefs-modal-title" className={GRADIENT_SUBHEADING_CLASS}>
                  Career Preferences
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  autoFocus
                  className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
                >
                  Cancel
                </button>
              </div>

              {/* Target roles */}
              <div className="grid gap-1.5">
                <label
                  htmlFor="cp-targetRoles"
                  className="text-sm font-semibold text-(--foreground)"
                >
                  Target roles (optional)
                </label>
                <div className="profile-input-wrap">
                  <textarea
                    id="cp-targetRoles"
                    name="targetRoles"
                    value={form.targetRoles}
                    onChange={onFieldChange}
                    rows={2}
                    className="profile-input resize-none"
                    placeholder="Software Engineer, Frontend Developer…"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Target locations */}
              <div className="grid gap-1.5">
                <label
                  htmlFor="cp-targetLocations"
                  className="text-sm font-semibold text-(--foreground)"
                >
                  Target locations (optional)
                </label>
                <div className="profile-input-wrap">
                  <input
                    id="cp-targetLocations"
                    name="targetLocations"
                    type="text"
                    value={form.targetLocations}
                    onChange={onFieldChange}
                    className="profile-input"
                    placeholder="New York, NY; Remote…"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Work mode */}
              <div className="grid gap-1.5">
                <label
                  htmlFor="cp-workMode"
                  className="text-sm font-semibold text-(--foreground)"
                >
                  Work mode (optional)
                </label>
                <div className="profile-input-wrap">
                  <select
                    id="cp-workMode"
                    name="workMode"
                    value={form.workMode}
                    onChange={onFieldChange}
                    className="profile-input"
                    disabled={isSaving}
                  >
                    <option value="">None</option>
                    {WORK_MODE_VALUES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Salary preference */}
              <div className="grid gap-1.5">
                <label
                  htmlFor="cp-salaryPreference"
                  className="text-sm font-semibold text-(--foreground)"
                >
                  Salary preference (optional)
                </label>
                <div className="profile-input-wrap">
                  <input
                    id="cp-salaryPreference"
                    name="salaryPreference"
                    type="text"
                    value={form.salaryPreference}
                    onChange={onFieldChange}
                    className="profile-input"
                    placeholder="$120,000 – $150,000…"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-(--foreground) px-5 py-2.5 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>

              {errors.submit ? (
                <p className="text-sm font-medium text-(--danger-text)" role="alert">
                  {errors.submit}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}

      {/* Toast notification */}
      {toast ? (
        <div
          className={`pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-opacity duration-500 ${
            isToastVisible ? 'opacity-100' : 'opacity-0'
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="max-w-md rounded-md border border-(--surface-border) bg-(--surface) px-4 py-3 text-sm font-medium text-(--foreground) shadow-md">
            {toast}
          </p>
        </div>
      ) : null}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-[linear-gradient(to_right,#ff75c3_0%,#ffa647_20%,#ffe83f_40%,#9fff5b_60%,#70e2ff_80%,#cd93ff_100%)]"
      />
    </article>
  );
}
