/**
 * PHASE 3A — pure routing decision for the public entry points.
 *
 * Extracted from the routes so the decision is unit-testable without a router,
 * a browser or a database. The routes stay thin: they resolve the entry-point
 * identity they already had (no extra query) and ask this module what to do.
 *
 * Contract:
 *   - `enabled === false` → `render-legacy` and the port is NEVER built, so the
 *     current public behaviour is untouched byte for byte.
 *   - `enabled === true`  → the canonical resolver decides: a published modern
 *     page wins; an unmigrated profile stays legacy; infrastructure errors are
 *     propagated (never a silent fallback).
 */
import {
  resolveCanonicalPublicPage,
  type CanonicalPublicPagePort,
  type PublicEntryIdentifier,
} from "./resolveCanonicalPublicPage";

/**
 * Query parameters worth preserving across the canonical redirect. Everything
 * else is dropped (the redirect must not invent state). QR analytics keeps its
 * own boundaries: the decision never sends visitors through `/q` or `/p`.
 */
export const TRACKING_SEARCH_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "source",
  "campaign",
  "ref",
  "qr",
  "qr_id",
  "fbclid",
  "gclid",
] as const;

/** Keep only the tracking parameters, as trimmed non-empty strings. */
export function pickTrackingSearch(search: unknown): Record<string, string> | undefined {
  if (!search || typeof search !== "object") return undefined;
  const source = search as Record<string, unknown>;
  const picked: Record<string, string> = {};
  for (const key of TRACKING_SEARCH_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) picked[key] = value;
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
}

export type PublicEntryRouteDecision =
  | { kind: "render-legacy" }
  | {
      kind: "redirect-to-page";
      /** Canonical identity the visitor must end up on. */
      pagePublicId: string;
      pageSlug: string | null;
      /** Always `/pg/{pagePublicId}` — never `/q`, `/p` or the alias itself. */
      path: string;
      search?: Record<string, string>;
    }
  | { kind: "not-found" };

export interface DecidePublicEntryRouteInput {
  /** Result of `isCanonicalPublicResolutionEnabled` for this visit. */
  enabled: boolean;
  /** Entry-point identity the route already knows. */
  identifier: PublicEntryIdentifier;
  /** Built lazily — only touched when the flag is ON. */
  createPort: () => CanonicalPublicPagePort;
  /** Current search params (validated pass-through) for tracking preservation. */
  search?: unknown;
}

export async function decidePublicEntryRoute(
  input: DecidePublicEntryRouteInput,
): Promise<PublicEntryRouteDecision> {
  // OFF → identical legacy behaviour and zero extra queries.
  if (!input.enabled) return { kind: "render-legacy" };

  const target = await resolveCanonicalPublicPage(input.createPort(), input.identifier);

  if (target.kind === "not-found") return { kind: "not-found" };
  if (target.kind === "legacy-profile") return { kind: "render-legacy" };

  // Loop guard: an identity must never be redirected to itself.
  if (
    input.identifier.kind === "page-public-id" &&
    target.pagePublicId === input.identifier.value.trim()
  ) {
    return { kind: "render-legacy" };
  }

  const search = pickTrackingSearch(input.search);
  return {
    kind: "redirect-to-page",
    pagePublicId: target.pagePublicId,
    pageSlug: target.pageSlug,
    path: target.canonicalPath,
    ...(search ? { search } : {}),
  };
}
