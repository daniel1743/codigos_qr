/**
 * CRIPQER Analytics V1.1 — production feature gate for the canonical writer.
 *
 * QA keeps its existing permissive semantics. Production is fail-closed:
 * canonical writes are allowed only when an explicit and valid configuration
 * exists.
 *
 * Production contract:
 *   1. VITE_ANALYTICS_CANONICAL_ENABLED must be exactly "true".
 *   2. Then either:
 *      a. VITE_ANALYTICS_CANONICAL_GLOBAL_ENABLED is exactly "true"
 *         (explicit global rollout), OR
 *      b. the page's public_id is present in a non-empty, well-formed
 *         VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST.
 *
 * Missing, empty, whitespace-only, non-string or malformed allowlists deny
 * canonical writes. "*" is a literal entry, never a wildcard. Unknown runtimes
 * are always denied.
 */

import { classifyRuntime } from "./qa-runtime-guard";

export const CANONICAL_ANALYTICS_ENABLED_KEY = "VITE_ANALYTICS_CANONICAL_ENABLED";
export const CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY = "VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST";
export const CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY =
  "VITE_ANALYTICS_CANONICAL_GLOBAL_ENABLED";

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

  // Production requires the global flag.
  const environment = context.environment ?? {};
  if (environment[CANONICAL_ANALYTICS_ENABLED_KEY] !== "true") return false;

  // A global rollout requires its own explicit flag. It is never inferred from
  // an empty, malformed or wildcard allowlist.
  const rawAllowlist = environment[CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY];
  if (
    environment[CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY] === "true" &&
    (rawAllowlist === undefined || typeof rawAllowlist === "string")
  ) {
    return true;
  }

  // Production otherwise requires an explicit page allowlist.
  const allowlist = parseCanonicalPageAllowlist(rawAllowlist);
  if (allowlist.size === 0) return false;

  // Allowlist is defined and non-empty: require the page to be in it.
  if (!context.publicId) return false;
  return allowlist.has(context.publicId);
}

/** Throw unless canonical tracking is allowed for the given runtime + page. */
export function assertCanonicalAnalyticsAllowed(context: CanonicalAnalyticsGateContext): void {
  if (!isCanonicalAnalyticsEnabled(context)) {
    throw new Error(
      "Canonical Analytics V1.1 is disabled for this runtime/page. " +
        "Production writes require VITE_ANALYTICS_CANONICAL_ENABLED=true and either " +
        "VITE_ANALYTICS_CANONICAL_GLOBAL_ENABLED=true or an allowlisted page public_id.",
    );
  }
}
