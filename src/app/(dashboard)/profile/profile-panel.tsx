'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ProfilePanelProps = {
  initialProfile: {
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string | null;
    phone: string;
    location: string;
    linkedIn: string;
    headline: string;
    bio: string;
  };
};

type EditableFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  headline: string;
  bio: string;
};

type FormErrors = {
  firstName?: string;
  lastName?: string;
  submit?: string;
};

function buildInitialForm(
  profile: ProfilePanelProps['initialProfile'],
): EditableFormState {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedIn: profile.linkedIn,
    headline: profile.headline,
    bio: profile.bio,
  };
}

function validatePrimaryFields(form: EditableFormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }

  return errors;
}

type ProfileFieldProps = {
  id: string;
  label: string;
  name: keyof EditableFormState;
  value: string;
  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  textarea?: boolean;
  rows?: number;
};

function ProfileField({
  id,
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  disabled,
  readOnly,
  textarea,
  rows = 4,
}: ProfileFieldProps) {
  const inputClassName = textarea
    ? 'profile-input profile-textarea'
    : 'profile-input';

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
            className={inputClassName}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            rows={rows}
          />
        ) : (
          <input
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            className={inputClassName}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
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

type DetailRowProps = {
  label: string;
  value: string;
  subdued?: boolean;
};

function DetailRow({ label, value, subdued }: DetailRowProps) {
  return (
    <div className="grid gap-1 border-b border-(--surface-divider) py-3 last:border-b-0 md:grid-cols-[10rem_1fr] md:items-start md:gap-4">
      <p className="text-sm font-medium text-(--foreground)">{label}</p>
      <p
        className={
          subdued
            ? 'text-sm leading-relaxed text-(--text-muted)'
            : 'text-sm leading-relaxed text-(--foreground)'
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function ProfilePanel({ initialProfile }: ProfilePanelProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState<EditableFormState>(
    buildInitialForm(initialProfile),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaveMessageVisible, setIsSaveMessageVisible] =
    useState<boolean>(false);

  useEffect(() => {
    if (!saveMessage) {
      setIsSaveMessageVisible(false);
      return;
    }

    setIsSaveMessageVisible(true);

    const fadeTimer = setTimeout(() => {
      setIsSaveMessageVisible(false);
    }, 3200);

    const removeTimer = setTimeout(() => {
      setSaveMessage(null);
    }, 3800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [saveMessage]);

  const fullName = useMemo(() => {
    const combined = `${profile.firstName} ${profile.lastName}`.trim();
    return combined.length > 0 ? combined : 'Your profile';
  }, [profile.firstName, profile.lastName]);

  const displayedDetails = useMemo(
    () => ({
      phone: profile.phone,
      location: profile.location,
      linkedIn: profile.linkedIn,
      headline: profile.headline,
      bio: profile.bio,
    }),
    [
      profile.bio,
      profile.headline,
      profile.linkedIn,
      profile.location,
      profile.phone,
    ],
  );

  const resetFromProfile = (nextProfile = profile) => {
    setForm(buildInitialForm(nextProfile));
    setErrors({});
  };

  const onFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errors[name as keyof FormErrors]) {
      setErrors((previous) => ({
        ...previous,
        [name]: undefined,
      }));
    }
  };

  const onCancel = () => {
    resetFromProfile();
    setIsEditing(false);
    setSaveMessage(null);
  };

  const onStartEditing = () => {
    resetFromProfile();
    setIsEditing(true);
    setSaveMessage(null);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage(null);

    const nextErrors = validatePrimaryFields(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          location: form.location,
          linkedIn: form.linkedIn,
          headline: form.headline,
          bio: form.bio,
        }),
      });

      const responseBody = (await response.json().catch(() => null)) as {
        firstName?: string;
        lastName?: string;
        email?: string;
        Profile?: {
          phone?: string | null;
          location?: string | null;
          linkedIn?: string | null;
          headline?: string | null;
          bio?: string | null;
        };
        error?: string;
      } | null;

      if (!response.ok) {
        setErrors({
          submit: 'Unable to save your profile right now.',
        });
        setIsSaving(false);
        return;
      }

      const updatedProfile = {
        ...profile,
        firstName: responseBody?.firstName ?? form.firstName.trim(),
        lastName: responseBody?.lastName ?? form.lastName.trim(),
        email: responseBody?.email ?? profile.email,
        phone: responseBody?.Profile?.phone ?? form.phone.trim(),
        location: responseBody?.Profile?.location ?? form.location.trim(),
        linkedIn: responseBody?.Profile?.linkedIn ?? form.linkedIn.trim(),
        headline: responseBody?.Profile?.headline ?? form.headline.trim(),
        bio: responseBody?.Profile?.bio ?? form.bio.trim(),
      };

      setProfile(updatedProfile);
      setForm((previous) => ({
        ...previous,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        location: updatedProfile.location,
        linkedIn: updatedProfile.linkedIn,
        headline: updatedProfile.headline,
        bio: updatedProfile.bio,
      }));
      setIsEditing(false);
      setSaveMessage('Profile updated.');
      router.refresh();
    } catch {
      setErrors({ submit: 'Network issue while saving your profile.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto mt-10 grid w-full max-w-4xl gap-6">
      <article className="rounded-2xl border border-black/15 bg-[linear-gradient(to_right,rgba(255,117,195,0.62)_0%,rgba(255,166,71,0.62)_20%,rgba(255,232,63,0.62)_40%,rgba(159,255,91,0.62)_60%,rgba(112,226,255,0.62)_80%,rgba(205,147,255,0.62)_100%)] p-6 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-black">
              {fullName}
            </h2>
            <p className="mt-1 text-sm font-medium text-black">
              {profile.email}
            </p>
          </div>

          <button
            type="button"
            onClick={onStartEditing}
            className="rounded-md border border-black/25 bg-white/80 px-4 py-2 text-sm font-semibold text-[#111111] transition hover:bg-white"
          >
            Edit profile
          </button>
        </div>
      </article>

      <article className="rounded-2xl border border-(--surface-border) bg-(--surface) p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-(--foreground)">
            Professional Details
          </h3>
          <p className="text-xs font-medium text-(--text-muted)">
            Professional details are hardcoded for this version.
          </p>
        </div>

        <div className="grid">
          <DetailRow
            label="Phone"
            value={displayedDetails.phone || 'Not provided'}
            subdued
          />
          <DetailRow
            label="Location"
            value={displayedDetails.location || 'Not provided'}
            subdued
          />
          <DetailRow
            label="LinkedIn"
            value={displayedDetails.linkedIn || 'Not provided'}
            subdued
          />
          <DetailRow
            label="Headline"
            value={displayedDetails.headline || 'Not provided'}
            subdued
          />
          <DetailRow
            label="Bio"
            value={displayedDetails.bio || 'Not provided'}
            subdued
          />
        </div>
      </article>

      {isEditing ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close edit profile modal"
            className="absolute inset-0 bg-black/55"
          />

          <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-(--surface-border) bg-(--background) shadow-2xl">
            <form
              onSubmit={handleSubmit}
              className="grid max-h-[88vh] gap-6 overflow-y-auto p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--surface-divider) pb-4">
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-(--foreground)">
                    Edit Profile
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg)"
                >
                  Cancel
                </button>
              </div>

              <section className="grid gap-4">
                <p className="text-sm font-medium text-(--foreground)">
                  Core Account
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <ProfileField
                    id="firstName"
                    label="First name"
                    name="firstName"
                    value={form.firstName}
                    onChange={onFieldChange}
                    error={errors.firstName}
                    placeholder="Jane"
                    disabled={isSaving}
                  />
                  <ProfileField
                    id="lastName"
                    label="Last name"
                    name="lastName"
                    value={form.lastName}
                    onChange={onFieldChange}
                    error={errors.lastName}
                    placeholder="Doe"
                    disabled={isSaving}
                  />
                </div>

                <ProfileField
                  id="email"
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={onFieldChange}
                  readOnly
                  disabled
                />
                <p className="text-xs font-medium text-(--text-muted)">
                  Email is locked for authentication consistency.
                </p>
              </section>

              <section className="grid gap-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-(--foreground)">
                    Professional Details
                  </p>
                  <p className="text-xs font-medium text-(--text-muted)">
                    Hardcoded preview fields in this version. Not persisted yet.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ProfileField
                    id="phone"
                    label="Phone"
                    name="phone"
                    value={form.phone}
                    onChange={onFieldChange}
                    placeholder="(555) 123-4567"
                    disabled={isSaving}
                  />
                  <ProfileField
                    id="location"
                    label="Location"
                    name="location"
                    value={form.location}
                    onChange={onFieldChange}
                    placeholder="Boston, MA"
                    disabled={isSaving}
                  />
                </div>

                <ProfileField
                  id="linkedIn"
                  label="LinkedIn"
                  name="linkedIn"
                  value={form.linkedIn}
                  onChange={onFieldChange}
                  placeholder="https://www.linkedin.com/in/your-handle"
                  disabled={isSaving}
                />

                <ProfileField
                  id="headline"
                  label="Headline"
                  name="headline"
                  value={form.headline}
                  onChange={onFieldChange}
                  placeholder="Frontend Engineer focused on accessible product design"
                  disabled={isSaving}
                />

                <ProfileField
                  id="bio"
                  label="Bio"
                  name="bio"
                  value={form.bio}
                  onChange={onFieldChange}
                  textarea
                  rows={5}
                  placeholder="Share your strengths, priorities, and what kind of roles you are targeting."
                  disabled={isSaving}
                />
              </section>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="rounded-md border border-(--action-border) px-4 py-2.5 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg) disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-(--foreground) px-5 py-2.5 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
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

      {saveMessage ? (
        <div
          className={`pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-opacity duration-500 ${
            isSaveMessageVisible ? 'opacity-100' : 'opacity-0'
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="max-w-md rounded-md border border-(--surface-border) bg-(--surface) px-4 py-3 text-sm font-medium text-(--foreground) shadow-md">
            {saveMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}
