import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
}

/**
 * Create Supabase client for client-side usage
 */
export function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Create Supabase client for server-side usage (with service role key)
 */
export function createSupabaseServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured. Required for server-side operations.');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

