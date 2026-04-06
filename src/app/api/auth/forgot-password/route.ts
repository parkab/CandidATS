import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateForgotPasswordPayload } from '@/lib/auth';

export async function POST(request: Request) {
  const requestBody = await request.json().catch(() => null);

  const validation = validateForgotPasswordPayload(requestBody);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { email } = validation.data;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/update-password`,
    });

    if (error) {
      console.error('Supabase forgot password error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send password reset email' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: 'Password reset email sent successfully',
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error in forgot-password:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
