'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
        <h1 className="text-3xl font-bold text-(--foreground)">Welcome back</h1>
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
            className="block text-sm font-medium text-(--foreground)"
          >
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
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-(--foreground)"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            disabled={isLoading}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-(--foreground) placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 ${
              errors.password
                ? 'border-red-500 focus:ring-red-500'
                : 'border-(--surface-border) focus:ring-(--accent)'
            }`}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password}</p>
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
