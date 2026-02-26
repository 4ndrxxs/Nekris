import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Graceful degradation: return null if env vars missing
export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Singleton for client-side usage
let _client: ReturnType<typeof getSupabaseClient> = undefined as never;
export function supabase() {
  if (_client === (undefined as never)) {
    _client = getSupabaseClient();
  }
  return _client;
}
