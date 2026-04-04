'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
};

type ErrorState = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  submit?: string;
};

export default function RegistrationForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<ErrorState>({});

  const validateForm = (): boolean => {
    const newErrors: ErrorState = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!form.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!form.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
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
    if (errors[name as keyof ErrorState]) {
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email.toLowerCase(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrors({
          submit: data.error || 'Registration failed. Please try again.',
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
        <h1 className="text-3xl font-bold text-(--foreground)">Create your account</h1>
        <p className="mt-2 text-sm text-(--muted-foreground)">
          Get started with CandidATS to manage your hiring process
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errors.submit && (
          <div className="rounded-md border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="firstName" className="block text-sm font-medium text-(--foreground)">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange}
              disabled={isLoading}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-(--foreground) placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 ${
                errors.firstName
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-(--surface-border) focus:ring-(--accent)'
              }`}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
            )}
          </div>

          <div className="flex-1">
            <label htmlFor="lastName" className="block text-sm font-medium text-(--foreground)">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange}
              disabled={isLoading}
              className={`mt-1 block w-full rounded-md border px-3 py-2 text-(--foreground) placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 ${
                errors.lastName
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-(--surface-border) focus:ring-(--accent)'
              }`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
            )}
          </div>
        </div>

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
            placeholder="john@example.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

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
            disabled={isLoading}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-(--foreground) placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 ${
              errors.password
                ? 'border-red-500 focus:ring-red-500'
                : 'border-(--surface-border) focus:ring-(--accent)'
            }`}
            placeholder="At least 8 characters"
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-(--foreground)"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-(--foreground) placeholder:text-(--muted-foreground) focus:outline-none focus:ring-2 ${
              errors.confirmPassword
                ? 'border-red-500 focus:ring-red-500'
                : 'border-(--surface-border) focus:ring-(--accent)'
            }`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-md bg-(--foreground) px-4 py-2 font-medium text-(--background) hover:bg-(--inverse-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <div className="text-center text-sm text-(--muted-foreground)">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-(--foreground) hover:underline visited:text-(--foreground)"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
