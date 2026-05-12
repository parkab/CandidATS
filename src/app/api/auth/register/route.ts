import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin, getSupabaseClient } from '@/lib/supabase';
import { validateRegistrationPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/app/api/error-handler';
import { validationError, conflictError, serviceError, authError } from '@/lib/errors';
import { logger } from '@/lib/logger';

async function handler(request: NextRequest) {
  const requestBody = await request.json().catch(() => null);
  const validation = validateRegistrationPayload(requestBody);

  if (!validation.valid) {
    throw validationError(validation.error);
  }

  const { email, password, firstName, lastName } = validation.data;

  // Get the Supabase admin client (lazily initialized at runtime)
  const supabaseAdmin = getSupabaseAdmin();

  // Admin client is required for user registration
  if (!supabaseAdmin) {
    logger.error('supabaseAdmin client is not available; cannot create user');
    throw serviceError('Registration');
  }

  // Create user in Supabase Auth with auto-confirmation
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email so user can log in immediately
    user_metadata: {
      first_name: firstName || '',
      last_name: lastName || '',
    },
  });

  if (error) {
    logger.warn('Supabase registration error', {
      email,
      reason: error.message,
    });

    // Check if user already exists
    if (error.message?.includes('already registered')) {
      throw conflictError('Email already registered');
    }
    throw authError(error.message || 'Registration failed');
  }

  logger.info('User created in Supabase Auth', {
    userId: data.user.id,
    email,
  });

  // Sync user to Prisma database (log but don't fail if it happens)
  try {
    const now = new Date();
    await prisma.user.create({
      data: {
        id: data.user.id, // Use the Supabase auth user ID as the app user ID
        email, // Use the validated email from the request
        firstName: firstName || null,
        lastName: lastName || null,
        hashedPassword: '', // Supabase manages password; this field stores a sentinel value for Supabase-managed accounts
        updatedAt: now, // Current timestamp
      },
    });
    logger.info('User record created in database', { userId: data.user.id });
  } catch (dbError) {
    logger.error('Failed to create user record in database', dbError as Error, {
      userId: data.user.id,
      email,
    });
    // Don't fail - auth user exists, just DB sync issue
  }

  // Check if Supabase client is available for sign-in
  const supabase = getSupabaseClient();
  
  // Sign the user in immediately after registration
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    logger.warn('Failed to sign in after registration', {
      userId: data.user.id,
      email,
      reason: signInError?.message || 'No session returned',
    });

    // Auth user and DB user created, but couldn't sign them in
    return NextResponse.json(
      {
        message: 'Registration successful but automatic sign-in failed',
        user: {
          id: data?.user?.id,
          email: data?.user?.email,
        },
      },
      { status: 201 },
    );
  }

  logger.info('User registered and signed in successfully', {
    userId: data.user.id,
    email,
  });

  // Create response and set session cookies
  const response = NextResponse.json(
    {
      message: 'Registration successful',
      user: {
        id: data?.user?.id,
        email: data?.user?.email,
      },
    },
    { status: 201 },
  );

  // Set access token cookie
  if (signInData.session.access_token) {
    response.cookies.set('sb-access-token', signInData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: signInData.session.expires_in || 3600,
      path: '/',
    });
  }

  // Set refresh token cookie
  if (signInData.session.refresh_token) {
    response.cookies.set('sb-refresh-token', signInData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
  }

  return response;
}

export const POST = withErrorHandler(handler);
