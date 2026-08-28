import { createBrowserClient } from "@supabase/ssr";
import { env } from "../env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabaseClient() {
  // Never create the browser client during server rendering. It is only used
  // from useEffect/event handlers (client-side), but many components call this
  // in their render body. Creating it on the server reads VITE_SUPABASE_URL /
  // VITE_SUPABASE_ANON_KEY and throws if those env vars are missing in
  // production, which 500s every SSR page (including "/").
  if (typeof window === "undefined") {
    return null as unknown as ReturnType<typeof createBrowserClient>;
  }
  if (!browserClient) {
    browserClient = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return browserClient;
}
