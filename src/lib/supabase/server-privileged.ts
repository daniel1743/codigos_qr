// Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

/**
 * Creates a privileged Supabase client using the service role key.
 * This client is ONLY intended to be used on the server-side
 * (e.g. inside TanStack Start server functions) and should NEVER
 * be imported or exposed to the browser.
 */
export function getPrivilegedSupabaseClient() {
  const serviceRoleKey = 
    (typeof process !== 'undefined' && process.env ? process.env['SUPABASE_SERVICE_ROLE_KEY'] : '') || 
    (import.meta.env ? import.meta.env['SUPABASE_SERVICE_ROLE_KEY'] : '') || 
    "";
  
  if (!serviceRoleKey) {
    console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing on the server. Signed URLs may fail. Falling back to anon client.");
    return createClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  
  return createClient(env.supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
