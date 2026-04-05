import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateUpdatePasswordPayload } from '@/lib/auth';

export async function POST(request: Request) {
  const requestBody = await request.json().catch(() => null);

  const validation = validateUpdatePasswordPayload(requestBody);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { password } = validation.data;

  try {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error('Supabase update password error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update password' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: 'Password updated successfully',
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Unexpected error in update-password:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
