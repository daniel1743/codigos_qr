/**
 * PHASE 3A/3C — PURE gate semantics for the canonical public resolution wiring.
 *
 * Dependency-free and env-agnostic on purpose: it never reads `import.meta.env`
 * nor `process.env`, and never mentions an environment variable name. The
 * server-only boundary (`canonicalPublicResolution-server.ts`) owns the env
 * names and feeds the raw values in, so this file is unit-testable AND can never
 * drag configuration into a client bundle.
 *
 * It mirrors the EXISTING Cripqer flag vocabulary (see
 * `src/lib/analytics/feature-gate.ts`) — not a second flag system.
 * Deliberate difference: it does NOT copy the QA permissive shortcut. With the
 * flag OFF the public routes must behave EXACTLY as today, in every runtime.
 *
 * Defaults: OFF. Enabling requires BOTH `= "true"` and a non-empty allowlist.
 */
export interface CanonicalPublicResolutionGateInput {
  /** Raw `CANONICAL_PUBLIC_RESOLUTION_ENABLED` value (server env only). */
  flagValue: unknown;
  /** Raw `CANONICAL_PUBLIC_RESOLUTION_ALLOWLIST` value (server env only). */
  allowlistValue: unknown;
  /**
   * Identifiers that describe THIS visit, cheapest first. Public routes pass the
   * entry-point identity they already resolved (profile public id and/or slug),
   * so the gate needs no extra query. An empty fingerprint simply stays OFF.
   */
  identifiers: readonly (string | null | undefined)[];
}

/**
 * Parse a comma-separated allowlist into trimmed, non-empty entries. A
 * malformed (non-string) value yields an empty set so the gate denies safely.
 */
export function parseCanonicalPublicResolutionAllowlist(value: unknown): Set<string> {
  if (typeof value !== "string") return new Set();
  const result = new Set<string>();
  for (const entry of value.split(",")) {
    const trimmed = entry.trim();
    if (trimmed) result.add(trimmed);
  }
  return result;
}

/**
 * Global switch only (no allowlist). With the flag absent, empty or anything
 * other than exactly "true" it is `false`, so the default is always OFF.
 */
export function isCanonicalPublicResolutionFlagOn(flagValue: unknown): boolean {
  return flagValue === "true";
}

/**
 * True only when the flag is exactly "true" AND at least one visit identifier is
 * allowlisted. Never throws, never guesses.
 */
export function isCanonicalPublicResolutionEnabled(
  input: CanonicalPublicResolutionGateInput,
): boolean {
  if (!isCanonicalPublicResolutionFlagOn(input.flagValue)) return false;

  const allowed = parseCanonicalPublicResolutionAllowlist(input.allowlistValue);
  if (allowed.size === 0) return false;

  return input.identifiers.some(
    (identifier) => typeof identifier === "string" && allowed.has(identifier.trim()),
  );
}
