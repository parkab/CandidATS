'use client';

import { GRADIENT_SUBHEADING_CLASS } from '@/components/dashboard/gradient';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';

export type ExperienceEntry = {
  id: string;
  type: string;
  title: string;
  organization: string;
  role: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
  accomplishments: string | null;
  sortOrder: number;
};

type ExperienceSectionProps = {
  initialExperiences: ExperienceEntry[];
};

type FormState = {
  type: string;
  title: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  accomplishments: string;
};

type FormErrors = {
  type?: string;
  title?: string;
  organization?: string;
  startDate?: string;
  submit?: string;
};

const EMPTY_FORM: FormState = {
  type: 'employment',
  title: '',
  organization: '',
  role: '',
  startDate: '',
  endDate: '',
  description: '',
  accomplishments: '',
};

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.type) errors.type = 'Please select a type.';
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (!form.organization.trim())
    errors.organization = 'Organization is required.';
  if (!form.startDate) errors.startDate = 'Start date is required.';
  return errors;
}

type ExperienceFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  error?: string;
  name: string;
  placeholder?: string;
  disabled?: boolean;
  textarea?: boolean;
  type?: string;
};

function ExperienceField({
  id,
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  disabled,
  textarea,
  type = 'text',
}: ExperienceFieldProps) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-(--foreground)">
        {label}
      </label>
      <div className="profile-input-wrap" data-error={Boolean(error)}>
        {textarea ? (
          <textarea
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            className="profile-input profile-textarea"
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
          />
        ) : (
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            className="profile-input"
            placeholder={placeholder}
            disabled={disabled}
          />
        )}
      </div>
      {error ? (
        <p className="text-xs font-medium text-(--danger-text)" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function ExperienceSection({
  initialExperiences,
}: ExperienceSectionProps) {
  const [experiences, setExperiences] =
    useState<ExperienceEntry[]>(initialExperiences);
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

  function openEditModal(entry: ExperienceEntry) {
    setForm({
      type: entry.type,
      title: entry.title,
      organization: entry.organization,
      role: entry.role ?? '',
      startDate: toDateInputValue(entry.startDate),
      endDate: toDateInputValue(entry.endDate),
      description: entry.description ?? '',
      accomplishments: entry.accomplishments ?? '',
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

  function onFieldChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
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
      type: form.type,
      title: form.title.trim(),
      organization: form.organization.trim(),
      role: form.role.trim() || null,
      startDate: form.startDate,
      endDate: form.endDate || null,
      description: form.description.trim() || null,
      accomplishments: form.accomplishments.trim() || null,
    };

    try {
      let response: Response;

      if (editingId) {
        response = await fetch(`/api/profile/experience/${editingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/profile/experience', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        setErrors({
          submit: 'Unable to save this experience. Please try again.',
        });
        setIsSaving(false);
        return;
      }

      const saved = (await response.json()) as ExperienceEntry;

      if (editingId) {
        setExperiences((prev) =>
          prev.map((e) => (e.id === editingId ? saved : e)),
        );
        setToast('Experience updated.');
      } else {
        setExperiences((prev) => [...prev, saved]);
        setToast('Experience added.');
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
      const response = await fetch(`/api/profile/experience/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        setToast('Unable to delete this experience.');
        setDeleteConfirmId(null);
        setIsDeleting(false);
        return;
      }
      setExperiences((prev) => prev.filter((e) => e.id !== id));
      setDeleteConfirmId(null);
      setToast('Experience removed.');
    } catch {
      setToast('Network issue. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    const index = experiences.findIndex((e) => e.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === experiences.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const next = [...experiences];

    // Swap positions in the array
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];

    // Reassign sortOrder by position so values are always unique
    const reordered = next.map((e, i) => ({ ...e, sortOrder: i }));
    setExperiences(reordered);

    await Promise.all([
      fetch(`/api/profile/experience/${reordered[index].id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sortOrder: reordered[index].sortOrder }),
      }),
      fetch(`/api/profile/experience/${reordered[swapIndex].id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sortOrder: reordered[swapIndex].sortOrder }),
      }),
    ]);
  }

  return (
    <article className="relative overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface) p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-(--foreground)">
          Experience
        </h3>
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-md border border-(--foreground) bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover)"
        >
          Add experience
        </button>
      </div>

      {experiences.length === 0 ? (
        <p className="text-sm text-(--text-muted)">
          No experience added yet. Add your first entry to get started.
        </p>
      ) : (
        <ul className="grid gap-4">
          {experiences.map((entry, index) => (
            <li
              key={entry.id}
              className="-mx-1 rounded-md border-b border-(--surface-divider) px-1 py-3 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-0.5">
                  <p className="text-sm font-semibold text-(--foreground)">
                    {entry.title}
                  </p>
                  <p className="text-sm text-(--text-muted)">
                    {entry.organization}
                    {entry.role ? ` · ${entry.role}` : ''}
                  </p>
                  <p className="text-xs text-(--text-muted)">
                    {toDateInputValue(entry.startDate)}
                    {' — '}
                    {entry.endDate
                      ? toDateInputValue(entry.endDate)
                      : 'Present'}
                  </p>
                  <span className="mt-1 inline-block w-fit rounded-full border border-(--surface-border) px-2 py-0.5 text-xs font-medium text-(--text-muted)">
                    {entry.type === 'employment' ? 'Employment' : 'Project'}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleReorder(entry.id, 'up')}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="rounded px-1.5 py-1 text-xs text-(--text-muted) transition hover:bg-(--action-bg) disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(entry.id, 'down')}
                    disabled={index === experiences.length - 1}
                    aria-label="Move down"
                    className="rounded px-1.5 py-1 text-xs text-(--text-muted) transition hover:bg-(--action-bg) disabled:opacity-30"
                  >
                    ↓
                  </button>
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
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close modal"
            className="absolute inset-0 bg-black/55"
          />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-(--surface-border) bg-(--background) shadow-2xl">
            <form
              onSubmit={handleSubmit}
              className="grid max-h-[88vh] gap-5 overflow-y-auto px-6 pb-6 pt-0"
            >
              <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-(--surface-divider) bg-(--background) px-6 pb-4 pt-6">
                <h3 className={GRADIENT_SUBHEADING_CLASS}>
                  {editingId ? 'Edit Experience' : 'Add Experience'}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-1.5">
                <label
                  htmlFor="type"
                  className="text-sm font-semibold text-(--foreground)"
                >
                  Type
                </label>
                <div
                  className="profile-input-wrap"
                  data-error={Boolean(errors.type)}
                >
                  <select
                    id="type"
                    name="type"
                    value={form.type}
                    onChange={onFieldChange}
                    className="profile-input"
                    disabled={isSaving}
                  >
                    <option value="employment">Employment</option>
                    <option value="project">Project</option>
                  </select>
                </div>
                {errors.type ? (
                  <p
                    className="text-xs font-medium text-(--danger-text)"
                    role="alert"
                  >
                    {errors.type}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ExperienceField
                  id="title"
                  label="Title / Role"
                  name="title"
                  value={form.title}
                  onChange={onFieldChange}
                  error={errors.title}
                  placeholder="Software Engineer"
                  disabled={isSaving}
                />
                <ExperienceField
                  id="organization"
                  label="Organization / Company"
                  name="organization"
                  value={form.organization}
                  onChange={onFieldChange}
                  error={errors.organization}
                  placeholder="Databricks"
                  disabled={isSaving}
                />
              </div>

              <ExperienceField
                id="role"
                label="Position (optional)"
                name="role"
                value={form.role}
                onChange={onFieldChange}
                placeholder="Tech Lead"
                disabled={isSaving}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <ExperienceField
                  id="startDate"
                  label="Start date"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={onFieldChange}
                  error={errors.startDate}
                  disabled={isSaving}
                />
                <ExperienceField
                  id="endDate"
                  label="End date (leave blank if current)"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={onFieldChange}
                  disabled={isSaving}
                />
              </div>

              <ExperienceField
                id="description"
                label="Description (optional)"
                name="description"
                value={form.description}
                onChange={onFieldChange}
                textarea
                placeholder="Brief overview of your responsibilities."
                disabled={isSaving}
              />

              <ExperienceField
                id="accomplishments"
                label="Accomplishments (optional)"
                name="accomplishments"
                value={form.accomplishments}
                onChange={onFieldChange}
                textarea
                placeholder="Key achievements, one per line."
                disabled={isSaving}
              />

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
          <button
            type="button"
            onClick={() => setDeleteConfirmId(null)}
            aria-label="Cancel delete"
            className="absolute inset-0 bg-black/55"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-(--surface-border) bg-(--background) p-6 shadow-2xl">
            <p className="text-sm font-semibold text-(--foreground)">
              Remove this experience?
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
