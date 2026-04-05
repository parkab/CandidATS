import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const requestBody = await request.json().catch(() => null);

  if (!requestBody || typeof requestBody !== 'object') {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { email, password } = requestBody as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.session) {
      console.error('Supabase login error:', error);
      return NextResponse.json(
        { error: error?.message || 'Invalid email or password' },
        { status: 401 },
      );
    }

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
  } catch (err) {
    console.error('Unexpected login error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
