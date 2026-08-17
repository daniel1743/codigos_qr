import { createBrowserClient } from "@supabase/ssr";
import { env } from "../env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return browserClient;
}
