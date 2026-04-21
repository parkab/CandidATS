'use client';

import { GRADIENT_SUBHEADING_CLASS } from '@/components/dashboard/gradient';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';

export type EducationEntry = {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string | null;
  honors: string | null;
  gpa: string | null;
};

type EducationSectionProps = {
  initialEducation: EducationEntry[];
  onCompletionChange?: (isComplete: boolean) => void;
};

type FormState = {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  honors: string;
  gpa: string;
};

type FormErrors = {
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  submit?: string;
};

const EMPTY_FORM: FormState = {
  institution: '',
  degree: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: '',
  honors: '',
  gpa: '',
};

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function sortEducation(list: EducationEntry[]): EducationEntry[] {
  return [...list].sort((a, b) => {
    const dateDiff = b.startDate.localeCompare(a.startDate);
    if (dateDiff !== 0) return dateDiff;
    return a.id.localeCompare(b.id);
  });
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.institution.trim()) errors.institution = 'Institution is required.';
  if (!form.degree.trim()) errors.degree = 'Degree is required.';
  if (!form.fieldOfStudy.trim())
    errors.fieldOfStudy = 'Field of study is required.';
  if (!form.startDate) errors.startDate = 'Start date is required.';
  return errors;
}

export default function EducationSection({
  initialEducation,
  onCompletionChange,
}: EducationSectionProps) {
  const [education, setEducation] = useState<EducationEntry[]>(initialEducation);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);

  useEffect(() => {
    onCompletionChange?.(education.length > 0);
  }, [education.length, onCompletionChange]);

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

  function openAddModal() {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingId(null);
    setIsModalOpen(true);
  }

  function openEditModal(entry: EducationEntry) {
    setForm({
      institution: entry.institution,
      degree: entry.degree,
      fieldOfStudy: entry.fieldOfStudy,
      startDate: toDateInputValue(entry.startDate),
      endDate: toDateInputValue(entry.endDate),
      honors: entry.honors ?? '',
      gpa: entry.gpa ?? '',
    });
    setErrors({});
    setEditingId(entry.id);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setErrors({});
  }

  function onFieldChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setIsSaving(true);

    const payload = {
      institution: form.institution.trim(),
      degree: form.degree.trim(),
      fieldOfStudy: form.fieldOfStudy.trim(),
      startDate: form.startDate,
      endDate: form.endDate || null,
      honors: form.honors.trim() || null,
      gpa: form.gpa.trim() || null,
    };

    try {
      let response: Response;

      if (editingId) {
        response = await fetch(`/api/profile/education/${editingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/profile/education', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        setErrors({ submit: 'Unable to save this record. Please try again.' });
        setIsSaving(false);
        return;
      }

      const saved = (await response.json()) as EducationEntry;

      if (editingId) {
        setEducation((prev) =>
          sortEducation(prev.map((e) => (e.id === editingId ? saved : e))),
        );
        setToast('Education updated.');
      } else {
        setEducation((prev) => sortEducation([...prev, saved]));
        setToast('Education added.');
      }

      closeModal();
    } catch {
      setErrors({ submit: 'Network issue. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/profile/education/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        setToast('Unable to delete this record.');
        setDeleteConfirmId(null);
        setIsDeleting(false);
        return;
      }
      setEducation((prev) => prev.filter((e) => e.id !== id));
      setDeleteConfirmId(null);
      setToast('Education removed.');
    } catch {
      setToast('Network issue. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="relative overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface) p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-(--foreground)">Education</h3>
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-md border border-(--foreground) bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover)"
        >
          Add education
        </button>
      </div>

      {education.length === 0 ? (
        <p className="text-sm text-(--text-muted)">
          No education added yet. Add your first entry to get started.
        </p>
      ) : (
        <ul className="grid gap-4">
          {education.map((entry) => (
            <li
              key={entry.id}
              className="-mx-1 rounded-md border-b border-(--surface-divider) px-1 py-3 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-0.5">
                  <p className="text-sm font-semibold text-(--foreground)">
                    {entry.institution}
                  </p>
                  <p className="text-sm text-(--text-muted)">
                    {entry.degree} — {entry.fieldOfStudy}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    {toDateInputValue(entry.startDate)}
                    {' — '}
                    {entry.endDate
                      ? toDateInputValue(entry.endDate)
                      : 'Present'}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {entry.honors ? (
                      <span className="inline-block w-fit rounded-full border border-(--surface-border) px-2 py-0.5 text-xs font-medium text-(--text-muted)">
                        {entry.honors}
                      </span>
                    ) : null}
                    {entry.gpa ? (
                      <span className="inline-block w-fit rounded-full border border-(--surface-border) px-2 py-0.5 text-xs font-medium text-(--text-muted)">
                        GPA: {entry.gpa}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(entry)}
                    className="rounded-md border border-(--action-border) px-3 py-1.5 text-xs font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(entry.id)}
                    className="rounded-md border border-(--danger-text) px-3 py-1.5 text-xs font-semibold text-(--danger-text) transition hover:bg-(--danger-text) hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add / Edit modal */}
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
            aria-labelledby="education-modal-title"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
              }
            }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-(--surface-border) bg-(--background) shadow-2xl"
          >
            <form
              onSubmit={handleSubmit}
              className="grid max-h-[88vh] gap-5 overflow-y-auto px-6 pb-6 pt-0"
            >
              <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-(--surface-divider) bg-(--background) px-6 pb-4 pt-6">
                <h3
                  id="education-modal-title"
                  className={GRADIENT_SUBHEADING_CLASS}
                >
                  {editingId ? 'Edit Education' : 'Add Education'}
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

              {/* Institution */}
              <div className="grid gap-1.5">
                <label
                  htmlFor="edu-institution"
                  className="text-sm font-semibold text-(--foreground)"
                >
                  Institution
                </label>
                <div
                  className="profile-input-wrap"
                  data-error={Boolean(errors.institution)}
                >
                  <input
                    id="edu-institution"
                    name="institution"
                    type="text"
                    value={form.institution}
                    onChange={onFieldChange}
                    className="profile-input"
                    placeholder="New Jersey Institute of Technology"
                    disabled={isSaving}
                  />
                </div>
                {errors.institution ? (
                  <p
                    className="text-xs font-medium text-(--danger-text)"
                    role="alert"
                  >
                    {errors.institution}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Degree */}
                <div className="grid gap-1.5">
                  <label
                    htmlFor="edu-degree"
                    className="text-sm font-semibold text-(--foreground)"
                  >
                    Degree
                  </label>
                  <div
                    className="profile-input-wrap"
                    data-error={Boolean(errors.degree)}
                  >
                    <input
                      id="edu-degree"
                      name="degree"
                      type="text"
                      value={form.degree}
                      onChange={onFieldChange}
                      className="profile-input"
                      placeholder="Bachelor of Science"
                      disabled={isSaving}
                    />
                  </div>
                  {errors.degree ? (
                    <p
                      className="text-xs font-medium text-(--danger-text)"
                      role="alert"
                    >
                      {errors.degree}
                    </p>
                  ) : null}
                </div>

                {/* Field of Study */}
                <div className="grid gap-1.5">
                  <label
                    htmlFor="edu-fieldOfStudy"
                    className="text-sm font-semibold text-(--foreground)"
                  >
                    Field of study
                  </label>
                  <div
                    className="profile-input-wrap"
                    data-error={Boolean(errors.fieldOfStudy)}
                  >
                    <input
                      id="edu-fieldOfStudy"
                      name="fieldOfStudy"
                      type="text"
                      value={form.fieldOfStudy}
                      onChange={onFieldChange}
                      className="profile-input"
                      placeholder="Computer Science"
                      disabled={isSaving}
                    />
                  </div>
                  {errors.fieldOfStudy ? (
                    <p
                      className="text-xs font-medium text-(--danger-text)"
                      role="alert"
                    >
                      {errors.fieldOfStudy}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Start Date */}
                <div className="grid gap-1.5">
                  <label
                    htmlFor="edu-startDate"
                    className="text-sm font-semibold text-(--foreground)"
                  >
                    Start date
                  </label>
                  <div
                    className="profile-input-wrap"
                    data-error={Boolean(errors.startDate)}
                  >
                    <input
                      id="edu-startDate"
                      name="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={onFieldChange}
                      className="profile-input"
                      disabled={isSaving}
                    />
                  </div>
                  {errors.startDate ? (
                    <p
                      className="text-xs font-medium text-(--danger-text)"
                      role="alert"
                    >
                      {errors.startDate}
                    </p>
                  ) : null}
                </div>

                {/* End Date */}
                <div className="grid gap-1.5">
                  <label
                    htmlFor="edu-endDate"
                    className="text-sm font-semibold text-(--foreground)"
                  >
                    End date (leave blank if current)
                  </label>
                  <div className="profile-input-wrap">
                    <input
                      id="edu-endDate"
                      name="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={onFieldChange}
                      className="profile-input"
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Honors */}
                <div className="grid gap-1.5">
                  <label
                    htmlFor="edu-honors"
                    className="text-sm font-semibold text-(--foreground)"
                  >
                    Honors (optional)
                  </label>
                  <div className="profile-input-wrap">
                    <input
                      id="edu-honors"
                      name="honors"
                      type="text"
                      value={form.honors}
                      onChange={onFieldChange}
                      className="profile-input"
                      placeholder="Summa Cum Laude"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* GPA */}
                <div className="grid gap-1.5">
                  <label
                    htmlFor="edu-gpa"
                    className="text-sm font-semibold text-(--foreground)"
                  >
                    GPA (optional)
                  </label>
                  <div className="profile-input-wrap">
                    <input
                      id="edu-gpa"
                      name="gpa"
                      type="text"
                      value={form.gpa}
                      onChange={onFieldChange}
                      className="profile-input"
                      placeholder="3.9/4.0"
                      disabled={isSaving}
                    />
                  </div>
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
                <p
                  className="text-sm font-medium text-(--danger-text)"
                  role="alert"
                >
                  {errors.submit}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}

      {/* Delete confirmation */}
      {deleteConfirmId ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            onClick={() => setDeleteConfirmId(null)}
            aria-hidden="true"
            className="absolute inset-0 bg-black/55"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edu-delete-title"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setDeleteConfirmId(null);
              }
            }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-(--surface-border) bg-(--background) p-6 shadow-2xl"
          >
            <p
              id="edu-delete-title"
              className="text-sm font-semibold text-(--foreground)"
            >
              Remove this education record?
            </p>
            <p className="mt-1 text-sm text-(--text-muted)">
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="rounded-md bg-(--danger-text) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
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
