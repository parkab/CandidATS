import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export interface SessionData {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) {
    return null;
  }

  // Admin client must be available to validate the session token
  if (!supabaseAdmin) {
    console.warn(
      'supabaseAdmin client is not available; cannot retrieve session',
    );
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !data.user) {
      return null;
    }

    const user = data.user;
    const firstName = user.user_metadata?.first_name;
    const lastName = user.user_metadata?.last_name;

    return {
      userId: user.id,
      email: user.email || '',
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    };
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: 'sb-access-token', path: '/' });
  cookieStore.delete({ name: 'sb-refresh-token', path: '/' });
}
