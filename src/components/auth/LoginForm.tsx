'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GRADIENT_SUBHEADING_CLASS } from '@/components/dashboard/gradient';

type LoginFormState = {
  email: string;
  password: string;
};

type LoginFormErrors = {
  email?: string;
  password?: string;
  submit?: string;
};

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<LoginFormState>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
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
    if (errors[name as keyof LoginFormErrors]) {
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email.toLowerCase(),
          password: form.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors({
          submit: data.error || 'Login failed. Please try again.',
        });
        setIsLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch {
      setErrors({
        submit: 'An error occurred. Please try again.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className={GRADIENT_SUBHEADING_CLASS}>Welcome back</h1>
        <p className="mt-2 text-sm text-(--muted-foreground)">
          Sign in to your CandidATS account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errors.submit && (
          <div className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-(--foreground)"
          >
            Email
          </label>
          <div
            className="profile-input-wrap"
            data-error={Boolean(errors.email)}
          >
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              disabled={isLoading}
              className="profile-input"
              placeholder="you@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-(--danger-text)">{errors.email}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-(--foreground)"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-(--muted-foreground) hover:text-(--foreground) transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div
            className="profile-input-wrap"
            data-error={Boolean(errors.password)}
          >
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              disabled={isLoading}
              className="profile-input"
              placeholder="••••••••"
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-(--danger-text)">
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-md bg-(--foreground) px-4 py-2 font-medium text-(--background) hover:bg-(--inverse-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="text-center text-sm text-(--muted-foreground)">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-medium text-(--foreground) hover:underline visited:text-(--foreground)"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
