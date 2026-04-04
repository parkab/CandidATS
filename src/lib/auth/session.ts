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
  const authToken = cookieStore.get('sb-auth-token')?.value;

  if (!authToken) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(authToken);

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
  cookieStore.delete('sb-auth-token');
}
