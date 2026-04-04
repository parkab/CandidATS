import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRole) {
  throw new Error('SUPABASE client environment variables are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
});

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .reduce<Record<string, string>>((acc, cookie) => {
      const [name, ...rest] = cookie.split('=');
      acc[name] = rest.join('=');
      return acc;
    }, {});
}

export function getAccessTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  return cookies['sb-auth-token'] ?? null;
}

export async function getSupabaseUserFromRequest(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

  return await supabaseAdmin.auth.getUser(accessToken);
}
