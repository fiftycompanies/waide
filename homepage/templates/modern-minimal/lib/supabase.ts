import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase: SupabaseClient = supabaseUrl
  ? createClient(supabaseUrl, supabaseKey)
  : (null as unknown as SupabaseClient);
