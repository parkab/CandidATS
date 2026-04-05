'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type ForgotPasswordFormState = {
  email: string;
};

type ForgotPasswordFormErrors = {
  email?: string;
  submit?: string;
};

export default function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form, setForm] = useState<ForgotPasswordFormState>({
    email: '',
  });
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: ForgotPasswordFormErrors = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
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
    // Clear error for this field when user starts typing
    if (errors[name as keyof ForgotPasswordFormErrors]) {
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

    setIsLoading(true);
    setErrors({});

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email.toLowerCase(), {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/update-password`,
      });

      if (error) {
        console.error('Reset password error:', error);
        setErrors({
          submit: error.message || 'Failed to send reset email. Please try again.',
        });
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrors({
        submit: 'An error occurred. Please try again.',
      });
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-(--foreground)">Check your email</h1>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            We&apos;ve sent a password reset link to {form.email}
          </p>
        </div>

        <div className="rounded-md border border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Click the link in the email to reset your password. The link will expire in 24 hours.
        </div>

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

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-(--foreground)">Reset your password</h1>
        <p className="mt-2 text-sm text-(--muted-foreground)">
          Enter your email and we&apos;ll send you a link to reset it
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errors.submit && (
          <div className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-(--foreground)">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            disabled={isLoading}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-(--foreground) placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 ${
              errors.email
                ? 'border-red-500 focus:ring-red-500'
                : 'border-(--surface-border) focus:ring-(--accent)'
            }`}
            placeholder="you@example.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-md bg-(--foreground) px-4 py-2 font-medium text-(--background) hover:bg-(--inverse-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Sending...' : 'Send reset link'}
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
