/**
 * CRIPQER BILLING — CANONICAL ENTITLEMENT HOST SERVICE V1 (SERVER-SIDE ONLY)
 *
 * Minimal orchestration layer that resolves a TRUSTED server-side canonical
 * userId into a canonical Billing entitlement state:
 *
 *     trusted canonical userId
 *              ↓
 *     canonical subscription lookup (frozen persistence primitive)
 *              ↓
 *     resolveEntitlement(...)          (frozen Entitlement Resolver Core V1)
 *              ↓
 *     EntitlementResolution
 *              ↓
 *     effectiveTier: free | pro | business | enterprise
 *
 * This module OWNS ONLY the lookup + delegation. It does NOT implement the
 * product feature matrix, does NOT mutate subscriptions, does NOT persist
 * entitlements, does NOT connect providers, does NOT touch UI, and does NOT
 * consult the legacy `src/lib/entitlements.ts` premium/dev-email override.
 *
 * The ONLY authority is the canonical subscription state, resolved through the
 * frozen `resolveEntitlement`. A browser userId, an email, provider metadata,
 * localStorage, or a query-string premium flag are NEVER accepted as authority.
 *
 * A trusted userId is supplied by the host (e.g. derived from the frozen Auth
 * Boundary's `requireBillingUser().userId`). This module introduces no public
 * HTTP route and no browser-facing API.
 */

import type { BillingSubscriptionRecord } from "../../lib/billing/billing.types.ts";
import {
  resolveEntitlement,
  type EntitlementResolution,
} from "./entitlements.ts";

/* ============================ dependency seam ============================ */

/**
 * Minimal read-only seam that mirrors the frozen canonical persistence
 * primitive `getCanonicalSubscriptionForUser(userId)`. The host wires the real
 * function (or a Supabase-bound adapter) in a later phase; this module never
 * touches the DB itself and never writes. No duplicate persistence types are
 * declared here — `BillingSubscriptionRecord` is the actual canonical type.
 */
export interface EntitlementSubscriptionStore {
  getCanonicalSubscriptionForUser(
    userId: string,
  ): Promise<BillingSubscriptionRecord | null>;
}

/* ============================= host service ============================== */

/**
 * Resolve the effective entitlement tier for a TRUSTED canonical userId.
 *
 * PURE orchestration: it performs exactly one read (the canonical subscription
 * lookup) and delegates ALL lifecycle/plan logic to the frozen
 * `resolveEntitlement`. It never re-implements active/past_due/cancelled rules,
 * plan validation, grace periods, or tier logic.
 *
 * @param store           The subscription store seam (frozen persistence).
 * @param trustedUserId   A trusted server-side canonical userId (from the Auth
 *                        Boundary). Not a browser/email value.
 */
export async function resolveUserEntitlement(
  store: EntitlementSubscriptionStore,
  trustedUserId: string,
): Promise<EntitlementResolution> {
  // Trusted-identity gate: only a non-empty canonical userId may drive a
  // lookup. Anything else fails closed to free WITHOUT touching the store.
  if (typeof trustedUserId !== "string" || trustedUserId.trim().length === 0) {
    return resolveEntitlement(null);
  }

  const subscription = await store.getCanonicalSubscriptionForUser(
    trustedUserId,
  );

  return resolveEntitlement(subscription);
}

/**
 * Convenience factory returning a small host-service object. Kept for the
 * dependency-injection seam used by the selfcheck; production wiring may call
 * `resolveUserEntitlement` directly with the frozen persistence primitive.
 */
export function createEntitlementHostService(
  store: EntitlementSubscriptionStore,
): {
  resolveForUser(trustedUserId: string): Promise<EntitlementResolution>;
} {
  return {
    resolveForUser(trustedUserId: string): Promise<EntitlementResolution> {
      return resolveUserEntitlement(store, trustedUserId);
    },
  };
}
