import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateRegistrationPayload } from '@/lib/auth';

export async function POST(request: Request) {
  const requestBody = await request.json().catch(() => null);
  const validation = validateRegistrationPayload(requestBody);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { email, password, firstName, lastName } = validation.data;

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
          { message: 'Registration request received' },
          { status: 201 }
        );
      }
      return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: data?.user?.id,
          email: data?.user?.email,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Unexpected registration error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
