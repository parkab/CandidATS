import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const requestBody = await request.json().catch(() => null);

  if (!requestBody || typeof requestBody !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password } = requestBody as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message || 'Invalid email or password' },
      { status: 401 }
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
    { status: 200 }
  );

  // Set Supabase session cookie
  if (data.session.access_token) {
    response.cookies.set('sb-auth-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.session.expires_in || 3600,
      path: '/',
    });
  }

  return response;
}
