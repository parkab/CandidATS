import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { validateRegistrationPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const requestBody = await request.json().catch(() => null);
  const validation = validateRegistrationPayload(requestBody);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { email, password, firstName, lastName } = validation.data;

  // Admin client is required for user registration
  if (!supabaseAdmin) {
    console.error('supabaseAdmin client is not available; cannot create user');
    return NextResponse.json(
      { error: 'Registration service is currently unavailable' },
      { status: 503 }
    );
  }

  try {
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
      console.error('Supabase registration error:', error);
      // Check if user already exists
      if (error.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 400 });
    }

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
    } catch (dbError) {
      console.error('Failed to create user record in database:', dbError);
      // Log but don't fail - auth user exists, just DB sync issue
    }

    // Sign the user in immediately after registration
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      console.error('Failed to sign in after registration:', signInError);
      // Auth user and DB user created, but couldn't sign them in
      return NextResponse.json(
        {
          message: 'Registration successful but automatic sign-in failed',
          user: {
            id: data?.user?.id,
            email: data?.user?.email,
          },
        },
        { status: 201 }
      );
    }

    // Create response and set session cookies
    const response = NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: data?.user?.id,
          email: data?.user?.email,
        },
      },
      { status: 201 }
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
  } catch (err) {
    console.error('Unexpected registration error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
