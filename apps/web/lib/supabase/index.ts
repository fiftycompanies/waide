// Supabase Client Exports
// Re-export all Supabase utilities

export { createClient as createBrowserClient, getSupabaseClient } from './client';
export { createClient as createServerClient, getCurrentUser, getSession } from './server';
export { updateSession } from './middleware';
