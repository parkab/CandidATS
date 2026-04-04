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

  // Create user in Supabase Auth
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (error) {
    // Check if user already exists
    if (error.message.includes('already registered')) {
      return NextResponse.json(
        { message: 'Registration request received' },
        { status: 201 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    { message: 'Registration request received' },
    { status: 201 }
  );
}
