/**
 * CRIPQER BILLING — B0 · CANONICAL PLAN SERVICE (SERVER-SIDE ONLY)
 *
 * THE single place where "is this user Pro?" is decided.
 *
 * Before B0 there were five parallel notions of a paying user, and the browser
 * itself decided Premium in `QRStudio` by reading `premium_users` directly and
 * consulting a hardcoded e-mail allowlist. That is what this module replaces.
 *
 * Contract:
 *
 *     trusted canonical userId
 *              ↓
 *     Billing Core reads the two legitimate SOURCES
 *        · billing_subscriptions   (a real paid subscription)
 *        · billing_grants          (invitation / admin / promotion / legacy)
 *              ↓
 *     resolveEntitlementWithGrants(...)      (the ONE resolver)
 *              ↓
 *     { free | pro | business | enterprise }  +  isPro
 *
 * Rules this module enforces:
 *   · The userId is TRUSTED and server-supplied. A browser id, an e-mail, a
 *     localStorage flag or a query-string "premium" are never read — they are
 *     not even parameters.
 *   · The entitlement is READ-ONLY here. Nothing in this module writes grants,
 *     subscriptions or entitlements.
 *   · It is FAIL-CLOSED: any missing input resolves to `free`, and a lookup
 *     failure throws rather than inventing access. Callers that must not break
 *     (the landing bot) catch and degrade to `free` themselves.
 *   · It is provider-neutral: no provider decides anything here. Providers
 *     report events; this module decides. That is the whole point of B0.5.
 */

import type {
  BillingGrantRecord,
  BillingSubscriptionRecord,
} from "../../lib/billing/billing.types.ts";
import { resolveEntitlementWithGrants, type EntitlementResolution } from "./entitlements.ts";

/* ============================ result contract =========================== */

/** The canonical answer the UI is allowed to consume. */
export interface PlanDecision extends EntitlementResolution {
  /**
   * The single boolean every UI surface should branch on. Derived, never
   * stored: it is exactly `hasPaidAccess`, named for the product vocabulary.
   */
  isPro: boolean;
}

/**
 * The two read seams this service needs. Declared as a dependency object so the
 * decision logic is testable with pure local fixtures — no network, no DB.
 */
export interface PlanServiceDeps {
  getSubscription(userId: string): Promise<BillingSubscriptionRecord | null>;
  getGrants(userId: string): Promise<BillingGrantRecord[]>;
  /**
   * B0.3 — TEMPORARY compatibility source.
   *
   * `premium_users` held real grants that no one has migrated yet. Reading them
   * here keeps existing users from losing access the day the browser stopped
   * deciding. The rows enter the resolver as ordinary `legacy_premium` grants, so
   * there is still exactly ONE decision — the source is extra, the authority is
   * not.
   *
   * Delete this seam (and its default wiring) once the backfill in the B0
   * close-out has been applied.
   */
  getLegacyGrants?: (userId: string) => Promise<BillingGrantRecord[]>;
}

/* ============================ default wiring ============================ */

/**
 * Production seam: the canonical persistence primitives, resolved lazily so a
 * caller that injects its own deps never touches the database module.
 */
async function defaultDeps(): Promise<PlanServiceDeps> {
  const persistence = await import("./persistence.ts");
  return {
    getSubscription: (userId) => persistence.getCanonicalSubscriptionForUser(userId),
    getGrants: (userId) => persistence.getGrantsForUser(userId),
    getLegacyGrants: (userId) => persistence.getLegacyPremiumGrants(userId),
  };
}

/* ============================== the decision ============================ */

/**
 * Resolves the canonical plan decision for a TRUSTED user id.
 *
 * This is the only function any consumer should call. If a new surface needs to
 * know whether a user is Pro, it calls this — it does not read a table, and it
 * does not consult a flag.
 */
export async function resolveUserPlan(
  userId: string | null | undefined,
  deps?: PlanServiceDeps,
): Promise<PlanDecision> {
  // No trusted identity → free. Never "unknown", never an exception: a missing
  // user is the normal case for an anonymous visitor.
  if (typeof userId !== "string" || userId.trim() === "") {
    return toDecision(resolveEntitlementWithGrants({ subscription: null, grants: [] }));
  }

  const resolved = deps ?? (await defaultDeps());
  const [subscription, grants, legacyGrants] = await Promise.all([
    resolved.getSubscription(userId),
    resolved.getGrants(userId),
    // Optional seam: an injected deps object in a test may omit it. Production
    // always supplies it (see `defaultDeps`).
    resolved.getLegacyGrants ? resolved.getLegacyGrants(userId) : Promise.resolve([]),
  ]);

  // Legacy rows are ordinary grants by the time they reach the resolver, so the
  // decision stays in ONE place.
  return toDecision(
    resolveEntitlementWithGrants({
      subscription,
      grants: [...grants, ...legacyGrants],
    }),
  );
}

function toDecision(resolution: EntitlementResolution): PlanDecision {
  return { ...resolution, isPro: resolution.hasPaidAccess };
}

/**
 * Convenience for callers that only need the boolean (a lock icon, a quota).
 * Same decision, narrower surface — it does NOT skip any source.
 */
export async function isUserPro(
  userId: string | null | undefined,
  deps?: PlanServiceDeps,
): Promise<boolean> {
  return (await resolveUserPlan(userId, deps)).isPro;
}
