// Supabase Browser Client
// Use this client in Client Components

import { createBrowserClient } from '@supabase/ssr';

// Database type (Vercel standalone deployment fix)
// TODO: Generate proper types with `npx supabase gen types typescript`
type Database = Record<string, unknown>;

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton instance for client-side use
let clientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
