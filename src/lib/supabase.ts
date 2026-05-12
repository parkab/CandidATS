import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Anon client requires public URL and key (used for auth and public operations)
let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not available. Supabase client will be unavailable during build.',
  );
}

export { supabase };

// Admin client is optional (only required for admin auth operations and protected endpoints)
// If service role key is unavailable, supabaseAdmin will be null
let supabaseAdminClient: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseServiceRole) {
  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false },
  });
}

export const supabaseAdmin = supabaseAdminClient;

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
  return cookies['sb-access-token'] ?? null;
}

export async function getSupabaseUserFromRequest(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return { data: null, error: { message: 'Unauthorized' } };
  }

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured');
  }

  return await supabaseAdmin.auth.getUser(accessToken);
}
