import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withErrorHandler } from '@/app/api/error-handler';
import { validationError, authError } from '@/lib/errors';
import { logger } from '@/lib/logger';

async function handler(request: NextRequest) {
  // Parse and validate request body
  const requestBody = await request.json().catch(() => null);

  if (!requestBody || typeof requestBody !== 'object') {
    throw validationError('Invalid request body');
  }

  const { email, password } = requestBody as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string') {
    throw validationError('Email and password are required');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if Supabase client is available
  if (!supabase) {
    throw new Error('Supabase authentication service is unavailable');
  }

  // Attempt login with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.session) {
    logger.warn('Login attempt failed', {
      email: normalizedEmail,
      reason: error?.message || 'No session returned',
    });
    throw authError('Invalid email or password');
  }

  logger.info('User logged in successfully', {
    userId: data.user.id,
    email: normalizedEmail,
  });

  const response = NextResponse.json(
    {
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.user_metadata?.first_name,
        lastName: data.user.user_metadata?.last_name,
      },
    },
    { status: 200 },
  );

  // Set Supabase session cookies (both access and refresh tokens)
  if (data.session.access_token) {
    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.session.expires_in || 3600,
      path: '/',
    });
  }

  if (data.session.refresh_token) {
    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  }

  return response;
}

export const POST = withErrorHandler(handler);
