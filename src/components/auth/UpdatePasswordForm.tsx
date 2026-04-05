'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type UpdatePasswordFormState = {
  password: string;
  confirmPassword: string;
};

type UpdatePasswordFormErrors = {
  password?: string;
  confirmPassword?: string;
  submit?: string;
};

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [form, setForm] = useState<UpdatePasswordFormState>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<UpdatePasswordFormErrors>({});

  // Check if user has a valid session (created by clicking the recovery link)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setErrors({
            submit: 'No active session. Please click the password reset link in your email.',
          });
          setIsLoading(false);
          return;
        }

        setHasSession(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Session check error:', err);
        setErrors({
          submit: 'An error occurred. Please try again.',
        });
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: UpdatePasswordFormErrors = {};

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof UpdatePasswordFormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsFormSubmitting(true);
    setErrors({});

    try {
      const { error } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (error) {
        console.error('Update password error:', error);
        setErrors({
          submit: error.message || 'Failed to update password. Please try again.',
        });
        setIsFormSubmitting(false);
        return;
      }

      // Success - redirect to login
      router.push('/login');
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrors({
        submit: 'An error occurred. Please try again.',
      });
      setIsFormSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-(--foreground)">Verifying...</h1>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            Please wait while we verify your reset link
          </p>
        </div>
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-(--surface-border) border-t-(--accent)" />
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-(--foreground)">Invalid Link</h1>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            Your password reset link is invalid or has expired
          </p>
        </div>

        {errors.submit && (
          <div className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        <div className="text-center">
          <Link
            href="/forgot-password"
            className="font-medium text-(--foreground) hover:underline"
          >
            Request a new password reset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-(--foreground)">Set your new password</h1>
        <p className="mt-2 text-sm text-(--muted-foreground)">
          Enter a new password for your CandidATS account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errors.submit && (
          <div className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-(--foreground)">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            disabled={isFormSubmitting}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-(--foreground) placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 ${
              errors.password
                ? 'border-red-500 focus:ring-red-500'
                : 'border-(--surface-border) focus:ring-(--accent)'
            }`}
            placeholder="••••••••"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          <p className="mt-1 text-xs text-(--muted-foreground)">Must be at least 8 characters</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-(--foreground)">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            disabled={isFormSubmitting}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-(--foreground) placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 ${
              errors.confirmPassword
                ? 'border-red-500 focus:ring-red-500'
                : 'border-(--surface-border) focus:ring-(--accent)'
            }`}
            placeholder="••••••••"
          />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={isFormSubmitting}
          className="mt-2 rounded-md bg-(--foreground) px-4 py-2 font-medium text-(--background) hover:bg-(--inverse-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isFormSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>

      <div className="text-center text-sm text-(--muted-foreground)">
        Remember your password?{' '}
        <Link
          href="/login"
          className="font-medium text-(--foreground) hover:underline visited:text-(--foreground)"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
