import { createClient } from '@supabase/supabase-js';

// Lazy-initialized clients to support Vercel's build-time environment variable loading
// These are only initialized at runtime when first called, not at build time
let supabaseClient: ReturnType<typeof createClient> | null = null;
let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

/**
 * Lazily initialize and return the Supabase anon client
 * This client is used for authentication and public operations
 * Initialization is deferred until runtime to ensure env vars are available
 */
export function getSupabaseClient(): ReturnType<typeof createClient> {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase client initialization failed: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set at runtime'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

/**
 * Lazily initialize and return the Supabase admin client
 * This client is used for admin auth operations and requires service role key
 * Returns null if service role key is not available (non-critical for most operations)
 */
export function getSupabaseAdmin(): ReturnType<typeof createClient> | null {
  if (supabaseAdminClient !== undefined) {
    return supabaseAdminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRole) {
    supabaseAdminClient = null;
    return null;
  }

  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false },
  });

  return supabaseAdminClient;
}

// For backward compatibility, maintain named exports that use the lazy getters
export function getSupabase() {
  return getSupabaseClient();
}

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

  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase admin client is not configured');
  }

  return await admin.auth.getUser(accessToken);
}
