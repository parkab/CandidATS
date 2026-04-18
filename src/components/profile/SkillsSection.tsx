'use client';

import { GRADIENT_SUBHEADING_CLASS } from '@/components/dashboard/gradient';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';

export type SkillEntry = {
  id: string;
  name: string;
  category: string | null;
  proficiencyLabel: string | null;
  sortOrder: number;
};

type SkillsSectionProps = {
  initialSkills: SkillEntry[];
};

type FormState = {
  name: string;
  category: string;
  proficiencyLabel: string;
};

type FormErrors = {
  name?: string;
  submit?: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  proficiencyLabel: '',
};

const PROFICIENCY_OPTIONS = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Skill name is required.';
  return errors;
}

export default function SkillsSection({ initialSkills }: SkillsSectionProps) {
  const [skills, setSkills] = useState<SkillEntry[]>(initialSkills);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
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

  function openEditModal(entry: SkillEntry) {
    setForm({
      name: entry.name,
      category: entry.category ?? '',
      proficiencyLabel: entry.proficiencyLabel ?? '',
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
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
      name: form.name.trim(),
      category: form.category.trim() || null,
      proficiencyLabel: form.proficiencyLabel || null,
    };

    try {
      let response: Response;

      if (editingId) {
        response = await fetch(`/api/profile/skills/${editingId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/profile/skills', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        setErrors({ submit: 'Unable to save this skill. Please try again.' });
        setIsSaving(false);
        return;
      }

      const saved = (await response.json()) as SkillEntry;

      if (editingId) {
        setSkills((prev) => prev.map((s) => (s.id === editingId ? saved : s)));
        setToast('Skill updated.');
      } else {
        setSkills((prev) => [...prev, saved]);
        setToast('Skill added.');
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
      const response = await fetch(`/api/profile/skills/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        setToast('Unable to delete this skill.');
        setDeleteConfirmId(null);
        setIsDeleting(false);
        return;
      }
      setSkills((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirmId(null);
      setToast('Skill removed.');
    } catch {
      setToast('Network issue. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    if (isReordering) return;
    const index = skills.findIndex((s) => s.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === skills.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const next = [...skills];

    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];

    const reordered = next.map((s, i) => ({ ...s, sortOrder: i }));
    const previous = skills;
    setSkills(reordered);
    setIsReordering(true);

    try {
      const results = await Promise.all(
        reordered.map((s) =>
          fetch(`/api/profile/skills/${s.id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sortOrder: s.sortOrder }),
          }),
        ),
      );

      if (results.some((r) => !r.ok)) {
        setSkills(previous);
        setToast('Unable to save new order. Please try again.');
      }
    } catch {
      setSkills(previous);
      setToast('Network issue. Please try again.');
    } finally {
      setIsReordering(false);
    }
  }

  return (
    <article className="relative overflow-hidden rounded-2xl border border-(--surface-border) bg-(--surface) p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-(--foreground)">Skills</h3>
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-md border border-(--foreground) bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover)"
        >
          Add skill
        </button>
      </div>

      {skills.length === 0 ? (
        <p className="text-sm text-(--text-muted)">
          No skills added yet. Add your first skill to get started.
        </p>
      ) : (
        <ul className="grid gap-4">
          {skills.map((entry, index) => (
            <li
              key={entry.id}
              className="-mx-1 rounded-md border-b border-(--surface-divider) px-1 py-3 last:border-b-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-(--foreground)">
                    {entry.name}
                  </span>
                  {entry.category ? (
                    <span className="rounded-full border border-(--surface-border) px-2 py-0.5 text-xs font-medium text-(--text-muted)">
                      {entry.category}
                    </span>
                  ) : null}
                  {entry.proficiencyLabel ? (
                    <span className="rounded-full border border-(--surface-border) px-2 py-0.5 text-xs font-medium text-(--text-muted)">
                      {entry.proficiencyLabel}
                    </span>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleReorder(entry.id, 'up')}
                    disabled={index === 0 || isReordering}
                    aria-label="Move up"
                    className="rounded px-1.5 py-1 text-xs text-(--text-muted) transition hover:bg-(--action-bg) disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(entry.id, 'down')}
                    disabled={index === skills.length - 1 || isReordering}
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
          <div
            onClick={closeModal}
            aria-hidden="true"
            className="absolute inset-0 bg-black/55"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-modal-title"
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
                <h3 id="skill-modal-title" className={GRADIENT_SUBHEADING_CLASS}>
                  {editingId ? 'Edit Skill' : 'Add Skill'}
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

              {/* Name */}
              <div className="grid gap-1.5">
                <label
                  htmlFor="skill-name"
                  className="text-sm font-semibold text-(--foreground)"
                >
                  Skill name
                </label>
                <div className="profile-input-wrap" data-error={Boolean(errors.name)}>
                  <input
                    id="skill-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={onFieldChange}
                    className="profile-input"
                    placeholder="TypeScript"
                    disabled={isSaving}
                  />
                </div>
                {errors.name ? (
                  <p className="text-xs font-medium text-(--danger-text)" role="alert">
                    {errors.name}
                  </p>
                ) : null}
              </div>

              {/* Category */}
              <div className="grid gap-1.5">
                <label
                  htmlFor="skill-category"
                  className="text-sm font-semibold text-(--foreground)"
                >
                  Category (optional)
                </label>
                <div className="profile-input-wrap">
                  <input
                    id="skill-category"
                    name="category"
                    type="text"
                    value={form.category}
                    onChange={onFieldChange}
                    className="profile-input"
                    placeholder="Languages, Frameworks, Tools…"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Proficiency */}
              <div className="grid gap-1.5">
                <label
                  htmlFor="skill-proficiency"
                  className="text-sm font-semibold text-(--foreground)"
                >
                  Proficiency (optional)
                </label>
                <div className="profile-input-wrap">
                  <select
                    id="skill-proficiency"
                    name="proficiencyLabel"
                    value={form.proficiencyLabel}
                    onChange={onFieldChange}
                    className="profile-input"
                    disabled={isSaving}
                  >
                    {PROFICIENCY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === '' ? 'None' : opt}
                      </option>
                    ))}
                  </select>
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
            aria-labelledby="skill-delete-title"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setDeleteConfirmId(null);
              }
            }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-(--surface-border) bg-(--background) p-6 shadow-2xl"
          >
            <p id="skill-delete-title" className="text-sm font-semibold text-(--foreground)">
              Remove this skill?
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
