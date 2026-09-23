import { getBrowserSupabaseClient } from "../supabase/client";
import { createCanonicalWriter, type CanonicalAnalyticsWriter } from "./canonical-writer";

let writer: CanonicalAnalyticsWriter | null = null;

/**
 * Memoized canonical writer bound to the browser Supabase client.
 *
 * The writer's own QA runtime gate (see `qa-runtime-guard`) guarantees that it
 * refuses to write unless `VITE_SUPABASE_URL` resolves to cripqer-qa. This file
 * is browser-only and is intentionally NOT re-exported from `./index` so pure
 * unit tests never pull in the Supabase browser client.
 */
export function getBrowserCanonicalWriter(): CanonicalAnalyticsWriter {
  if (!writer) {
    writer = createCanonicalWriter({
      supabaseUrl: import.meta.env["VITE_SUPABASE_URL"],
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
