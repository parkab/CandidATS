import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/session';

export async function POST() {
  await deleteSession();

  const response = NextResponse.json(
    { message: 'Logged out successfully' },
    { status: 200 },
  );

  response.cookies.set('sb-access-token', '', { path: '/', maxAge: 0 });
  response.cookies.set('sb-refresh-token', '', { path: '/', maxAge: 0 });
  response.cookies.set('sb-auth-token', '', { path: '/', maxAge: 0 });
  return response;
}
