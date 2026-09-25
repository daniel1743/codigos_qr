import { getBrowserSupabaseClient } from "../supabase/client";
import { createCanonicalWriter, type CanonicalAnalyticsWriter } from "./canonical-writer";

let writer: CanonicalAnalyticsWriter | null = null;

/**
 * Memoized canonical writer bound to the browser Supabase client.
 *
 * The writer's own feature gate (see `feature-gate`) refuses to write unless the
 * runtime resolves to cripqer-qa, or to production with the global flag enabled
 * and the page allowlisted. This file is browser-only and is intentionally NOT
 * re-exported from `./index` so pure unit tests never pull in the Supabase
 * browser client.
 */
export function getBrowserCanonicalWriter(): CanonicalAnalyticsWriter {
  if (!writer) {
    writer = createCanonicalWriter({
      supabaseUrl: import.meta.env["VITE_SUPABASE_URL"],
      environment: import.meta.env,
      boundary: {
        rpc: async (fn, args) => {
          const { data, error } = await getBrowserSupabaseClient().rpc(fn, args);
          return { data, error };
        },
      },
    });
  }
  return writer;
}
