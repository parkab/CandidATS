import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/session';

export async function POST() {
  await deleteSession();
  
  const response = NextResponse.json(
    { message: 'Logged out successfully' },
    { status: 200 }
  );

  response.cookies.delete('sb-auth-token');
  return response;
}
