import bcrypt from 'bcryptjs';

export interface RegistrationPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface UpdatePasswordPayload {
  password: string;
}

export type ForgotPasswordValidationResult =
  | { valid: true; data: ForgotPasswordPayload }
  | { valid: false; error: string };

export type UpdatePasswordValidationResult =
  | { valid: true; data: UpdatePasswordPayload }
  | { valid: false; error: string };

export type ValidationResult =
  | { valid: true; data: RegistrationPayload }
  | { valid: false; error: string };

export function validateRegistrationPayload(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const payload = input as Record<string, unknown>;
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const firstName =
    typeof payload.firstName === 'string'
      ? payload.firstName.trim()
      : undefined;
  const lastName =
    typeof payload.lastName === 'string' ? payload.lastName.trim() : undefined;

  if (!email || !EMAIL_REGEX.test(email.toLowerCase())) {
    return { valid: false, error: 'A valid email is required' };
  }

  if (!password || password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  return {
    valid: true,
    data: {
      email: email.toLowerCase(),
      password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    },
  };
}

export function validateForgotPasswordPayload(
  input: unknown,
): ForgotPasswordValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const payload = input as Record<string, unknown>;
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';

  if (!email || !EMAIL_REGEX.test(email.toLowerCase())) {
    return { valid: false, error: 'A valid email is required' };
  }

  return {
    valid: true,
    data: {
      email: email.toLowerCase(),
    },
  };
}

export function validateUpdatePasswordPayload(
  input: unknown,
): UpdatePasswordValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const payload = input as Record<string, unknown>;
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (!password || password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters long',
    };
  }

  return {
    valid: true,
    data: {
      password,
    },
  };
}
