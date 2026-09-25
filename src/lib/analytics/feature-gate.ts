/**
 * CRIPQER Analytics V1.1 — production feature gate for the canonical writer.
 *
 * Replaces the old hard QA-only guard. Canonical tracking is now allowed only
 * when:
 *   - the runtime resolves to the dedicated QA project (existing QA semantics),
 *     OR
 *   - the runtime resolves to production AND the global flag is enabled AND the
 *     current page is explicitly allowlisted.
 *
 * The production default is OFF: an absent/malformed flag or an absent/empty
 * allowlist denies canonical writes. Unknown projects are always denied.
 */

import { classifyRuntime } from "./qa-runtime-guard";

export const CANONICAL_ANALYTICS_ENABLED_KEY = "VITE_ANALYTICS_CANONICAL_ENABLED";
export const CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY = "VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST";

/** Minimal environment contract for the gate (kept dependency-free for tests). */
export interface CanonicalAnalyticsEnvironment {
  readonly [key: string]: unknown;
}

export interface CanonicalAnalyticsGateContext {
  supabaseUrl?: string | null;
  publicId?: string | null;
  environment?: CanonicalAnalyticsEnvironment;
}

/**
 * Parse a comma-separated allowlist into a set of trimmed, non-empty entries.
 * A malformed (non-string) value yields an empty set so the gate denies safely.
 */
export function parseCanonicalPageAllowlist(value: unknown): Set<string> {
  if (typeof value !== "string") return new Set();
  const result = new Set<string>();
  for (const entry of value.split(",")) {
    const trimmed = entry.trim();
    if (trimmed) result.add(trimmed);
  }
  return result;
}

/** True only when canonical tracking is allowed for the given runtime + page. */
export function isCanonicalAnalyticsEnabled(context: CanonicalAnalyticsGateContext): boolean {
  const verdict = classifyRuntime(context.supabaseUrl);

  // QA keeps its existing permissive semantics (the dedicated test project).
  if (verdict === "qa") return true;

  // Only production is eligible for the feature gate; unknown projects are
  // always denied (never "production just because it isn't QA").
  if (verdict !== "production") return false;

  // Production requires BOTH the global flag and an explicit page allowlist.
  const environment = context.environment ?? {};
  if (environment[CANONICAL_ANALYTICS_ENABLED_KEY] !== "true") return false;
  if (!context.publicId) return false;
  return parseCanonicalPageAllowlist(environment[CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]).has(
    context.publicId,
  );
}

/** Throw unless canonical tracking is allowed for the given runtime + page. */
export function assertCanonicalAnalyticsAllowed(context: CanonicalAnalyticsGateContext): void {
  if (!isCanonicalAnalyticsEnabled(context)) {
    throw new Error(
      "Canonical Analytics V1.1 is disabled for this runtime/page. " +
        "Production writes require VITE_ANALYTICS_CANONICAL_ENABLED=true and an allowlisted page.",
    );
  }
}
