/**
 * CRIPQER BILLING — CANONICAL ENTITLEMENT RESOLVER CORE V1 (SERVER-SIDE ONLY)
 *
 * Resolves ONE canonical Billing subscription record — or its absence — into a
 * deterministic, provider-neutral, fail-closed entitlement state:
 *
 *     canonical subscription (BillingSubscriptionRecord | null)
 *               ↓
 *     entitlement lifecycle evaluation (status + plan validation)
 *               ↓
 *     effective tier
 *               ↓
 *     free | pro | business | enterprise
 *
 * Rules (fail-closed, free-by-default):
 *   - No subscription                                            → free
 *   - status "active" + canonical paid plan (pro/business/enterprise) → that paid tier
 *   - cancel_at_period_end on a still-active subscription        → still paid (no premature demote)
 *   - pending / past_due / paused / cancelled / expired          → free
 *   - unknown status                                             → free
 *   - invalid / missing plan on an otherwise-active subscription → free
 *
 * This module performs NO provider network calls, NO persistence queries, NO
 * writes, NO routes, and grants NO product features. The ONLY authority is the
 * supplied canonical subscription state. A browser "premium" flag, a provider
 * redirect/return state, an email allowlist, and any legacy manual premium flag
 * are NEVER consulted.
 *
 * Free is never persisted into `billing_subscriptions`; it exists only as an
 * entitlement / effective-tier result (absence of a qualifying paid row).
 *
 * The final product feature matrix (which capabilities each tier unlocks) is a
 * product/business decision and is intentionally NOT implemented here. This
 * module exposes only billing lifecycle state plus an optional, capability-
 * agnostic policy-adapter seam so a later product policy layer can map
 * `effectiveTier` to product capabilities without touching billing resolution.
 */

import {
  BILLING_PLAN_IDS,
  BILLING_SUBSCRIPTION_STATUSES,
} from "../../lib/billing/billing.types.ts";
import type {
  BillingPlanId,
  BillingSubscriptionRecord,
  BillingSubscriptionStatus,
} from "../../lib/billing/billing.types.ts";

/* ============================ result contract ============================ */

/**
 * Canonical effective account tier. `"free"` is derived (absence of a
 * qualifying paid subscription) and is never persisted.
 */
export type EffectiveTier = "free" | "pro" | "business" | "enterprise";

/**
 * Machine-readable reason for the resolution. Values are grounded strictly in
 * the ACTUAL canonical statuses defined in `billing.types.ts` (plus the
 * absence case and the plan-validation case). No status name is invented.
 */
export type EntitlementReason =
  | "NO_SUBSCRIPTION"
  | "ACTIVE_PAID_SUBSCRIPTION"
  | "PENDING"
  | "PAST_DUE"
  | "PAUSED"
  | "CANCELLED"
  | "EXPIRED"
  | "INVALID_PLAN"
  | "UNKNOWN_STATUS";

/**
 * Trusted billing entitlement state. Deterministic and pure: the same canonical
 * input always produces the same result. `hasPaidAccess` is true only when the
 * effective tier is a paid tier.
 */
export interface EntitlementResolution {
  /** Canonical effective tier: free | pro | business | enterprise. */
  effectiveTier: EffectiveTier;
  /** True only when a qualifying paid subscription is in effect. */
  hasPaidAccess: boolean;
  /** Canonical paid plan id when paid access is granted; otherwise null. */
  canonicalPlanId: BillingPlanId | null;
  /** Canonical subscription status when a record was supplied; otherwise null. */
  subscriptionStatus: BillingSubscriptionStatus | null;
  /** Whether the subscription is set to cancel at period end; null when no record. */
  cancelAtPeriodEnd: boolean | null;
  /** Canonical current period end when available; otherwise null. */
  currentPeriodEnd: string | null;
  /** Stable reason code for the resolution. */
  reason: EntitlementReason;
}

/* ======================= future policy adapter (seam) ===================== */

/**
 * Optional, capability-agnostic seam for a LATER product policy layer. A later
 * Cripqer layer may map an `effectiveTier` to product capabilities WITHOUT
 * modifying billing state resolution. The capability shape is intentionally
 * unspecified here so no product feature matrix is invented inside Billing.
 */
export interface EntitlementPolicyAdapter {
  mapEffectiveTier?(effectiveTier: EffectiveTier): unknown;
}

/* ============================= runtime guards ============================ */

function isCanonicalSubscriptionStatus(
  value: unknown,
): value is BillingSubscriptionStatus {
  return (
    typeof value === "string" &&
    (BILLING_SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
  );
}

function isCanonicalPlanId(value: unknown): value is BillingPlanId {
  return (
    typeof value === "string" &&
    (BILLING_PLAN_IDS as readonly string[]).includes(value)
  );
}


/* ============================= status policy ============================= */

/**
 * Which canonical statuses grant paid access. Only `"active"` clearly represents
 * currently-active paid access. `cancel_at_period_end` does NOT demote an active
 * subscription early (no premature downgrade before the canonical paid state
 * actually expires). All other statuses fail closed to free.
 */
const PAID_GRANTING_STATUS: ReadonlySet<BillingSubscriptionStatus> = new Set([
  "active",
]);

/** Map each non-granting canonical status to a stable reason code. */
function reasonForNonActiveStatus(
  status: BillingSubscriptionStatus,
): EntitlementReason {
  switch (status) {
    case "pending":
      return "PENDING";
    case "past_due":
      return "PAST_DUE";
    case "paused":
      return "PAUSED";
    case "cancelled":
      return "CANCELLED";
    case "expired":
      return "EXPIRED";
    case "active":
      // Unreachable: "active" is a granting status handled before this call.
      return "ACTIVE_PAID_SUBSCRIPTION";
  }
}

/* ============================== resolver core ============================ */

/**
 * Resolve a canonical Billing subscription record (or its absence) into a
 * trusted entitlement state.
 *
 * PURE and SYNCHRONOUS: no network, no persistence, no writes, no feature
 * grants. Free is the default. The ONLY authority is the supplied canonical
 * subscription state — a browser premium flag, provider redirect state, email
 * allowlist, or legacy manual flag is never consulted (and is not even an
 * input).
 *
 * @param subscription The canonical subscription record, or null/undefined when
 *   none exists (canonical "free").
 */
export function resolveEntitlement(
  subscription: BillingSubscriptionRecord | null | undefined,
): EntitlementResolution {
  // 1. No subscription → free (absence of qualifying paid subscription).
  if (subscription == null) {
    return {
      effectiveTier: "free",
      hasPaidAccess: false,
      canonicalPlanId: null,
      subscriptionStatus: null,
      cancelAtPeriodEnd: null,
      currentPeriodEnd: null,
      reason: "NO_SUBSCRIPTION",
    };
  }

  const status = subscription.status;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;
  const currentPeriodEnd =
    typeof subscription.current_period_end === "string"
      ? subscription.current_period_end
      : null;

  // 2. Unknown / non-canonical status → fail closed to free.
  if (!isCanonicalSubscriptionStatus(status)) {
    return {
      effectiveTier: "free",
      hasPaidAccess: false,
      canonicalPlanId: null,
      subscriptionStatus: null,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      reason: "UNKNOWN_STATUS",
    };
  }

  // 3. Non-qualifying status → free (no grace period is invented for past_due;
  //    pending/paused/cancelled/expired never grant paid access).
  if (!PAID_GRANTING_STATUS.has(status)) {
    return {
      effectiveTier: "free",
      hasPaidAccess: false,
      canonicalPlanId: null,
      subscriptionStatus: status,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      reason: reasonForNonActiveStatus(status),
    };
  }

  // 4. Status is "active" but the plan is missing/invalid → free. Plan is NEVER
  //    inferred from amount, currency, provider, or providerPlanId.
  const planId = subscription.plan_id;
  if (!isCanonicalPlanId(planId)) {
    return {
      effectiveTier: "free",
      hasPaidAccess: false,
      canonicalPlanId: null,
      subscriptionStatus: status,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      reason: "INVALID_PLAN",
    };
  }

  // 5. Active + canonical paid plan → paid access to that tier.
  //    cancel_at_period_end is preserved for diagnostics but does NOT demote
  //    while the subscription is still in the active qualifying state.
  return {
    effectiveTier: planId,
    hasPaidAccess: true,
    canonicalPlanId: planId,
    subscriptionStatus: status,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    reason: "ACTIVE_PAID_SUBSCRIPTION",
  };
}
