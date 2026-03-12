// Supabase Service (Admin) Client
// IMPORTANT: Server-side only! Never import in client components.
// Uses SUPABASE_SERVICE_KEY (no NEXT_PUBLIC_ prefix) to bypass RLS.

import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
