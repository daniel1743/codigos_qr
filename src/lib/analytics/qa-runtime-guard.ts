/**
 * Runtime classification for the Analytics V1.1 canonical writer.
 *
 * Dependency-free helper that maps a Supabase URL to `qa`, `production`, or
 * `unknown`. This module only classifies; the feature-gate decision lives in
 * `feature-gate.ts` (QA is allowed, production requires an explicit page-scoped
 * allowlist + global flag, unknown is denied).
 */

export const QA_PROJECT_REF = "tjigzcyoogmvdkivypym";
export const PRODUCTION_PROJECT_REF = "mlinfiuhkxdhlveflbkj";

export type QaRuntimeVerdict = "qa" | "production" | "unknown";

/** Extract a Supabase project ref from a `*.supabase.co` URL (or null). */
export function extractSupabaseProjectRef(supabaseUrl: string | null | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    const host = new URL(supabaseUrl).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]{20})\.supabase\.co$/i);
    return match ? (match[1] ?? null) : null;
  } catch {
    return null;
  }
}

/** Classify a runtime Supabase URL against the known QA and production refs. */
export function classifyRuntime(supabaseUrl: string | null | undefined): QaRuntimeVerdict {
  const ref = extractSupabaseProjectRef(supabaseUrl);
  if (ref === PRODUCTION_PROJECT_REF) return "production";
  if (ref === QA_PROJECT_REF) return "qa";
  return "unknown";
}
