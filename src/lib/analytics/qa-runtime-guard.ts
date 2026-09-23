/**
 * QA-only runtime guard for the Analytics V1.1 canonical writer.
 *
 * This module prevents the canonical writer from ever running against the
 * production Supabase project. It is intentionally dependency-free so it can
 * be unit-tested in isolation.
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

/** True only when the runtime resolves to the dedicated cripqer-qa project. */
export function isQaAnalyticsRuntime(supabaseUrl: string | null | undefined): boolean {
  return classifyRuntime(supabaseUrl) === "qa";
}

/**
 * Assert that the runtime is the QA project. Throws (refuses to write) when the
 * runtime points to production or to any unknown project.
 */
export function assertQaRuntime(supabaseUrl: string | null | undefined): void {
  const verdict = classifyRuntime(supabaseUrl);
  if (verdict === "production") {
    throw new Error(
      "STOP_IMMEDIATELY: Analytics V1.1 canonical writer resolved to the production " +
        `Supabase project (${PRODUCTION_PROJECT_REF}). Refusing to write.`,
    );
  }
  if (verdict !== "qa") {
    throw new Error(
      "Analytics V1.1 canonical writer is QA-only: the runtime Supabase project is " +
        `not cripqer-qa (${QA_PROJECT_REF}).`,
    );
  }
}
