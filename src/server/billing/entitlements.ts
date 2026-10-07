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
  BILLING_GRANT_SOURCES,
  BILLING_PLAN_IDS,
  BILLING_SUBSCRIPTION_STATUSES,
} from "../../lib/billing/billing.types.ts";
import type {
  BillingGrantRecord,
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
  | "UNKNOWN_STATUS"
  // B0 — a non-subscription source (invitation / admin / promotion / legacy)
  // is what grants paid access.
  | "ACTIVE_GRANT";

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

function isCanonicalSubscriptionStatus(value: unknown): value is BillingSubscriptionStatus {
  return (
    typeof value === "string" &&
    (BILLING_SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
  );
}

function isCanonicalPlanId(value: unknown): value is BillingPlanId {
  return typeof value === "string" && (BILLING_PLAN_IDS as readonly string[]).includes(value);
}

/* ============================= status policy ============================= */

/**
 * Which canonical statuses grant paid access. Only `"active"` clearly represents
 * currently-active paid access. `cancel_at_period_end` does NOT demote an active
 * subscription early (no premature downgrade before the canonical paid state
 * actually expires). All other statuses fail closed to free.
 */
const PAID_GRANTING_STATUS: ReadonlySet<BillingSubscriptionStatus> = new Set(["active"]);

/** Map each non-granting canonical status to a stable reason code. */
function reasonForNonActiveStatus(status: BillingSubscriptionStatus): EntitlementReason {
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
    typeof subscription.current_period_end === "string" ? subscription.current_period_end : null;

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

/* ===================== B0 — grants as a second source ==================== */

/**
 * Canonical tier ranking, used ONLY to pick between two grants that are both
 * valid. Enterprise > business > pro. Higher wins.
 */
const PLAN_RANK: Record<BillingPlanId, number> = { pro: 1, business: 2, enterprise: 3 };

function isCanonicalGrantSource(value: unknown): value is BillingGrantRecord["grant_source"] {
  return typeof value === "string" && (BILLING_GRANT_SOURCES as readonly string[]).includes(value);
}

/** Milliseconds since epoch, or null when absent/unparseable. */
function parseInstant(value: string | null | undefined): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Whether a grant is in force at `now`.
 *
 * A grant with `expires_at === null` is PERMANENT and therefore active. A grant
 * whose `expires_at` is in the future is active. A revoked grant never is.
 * Anything malformed fails closed.
 */
export function isGrantActive(grant: BillingGrantRecord, now: number = Date.now()): boolean {
  if (grant == null) return false;
  if (grant.revoked_at !== null && grant.revoked_at !== undefined) return false;
  if (!isCanonicalPlanId(grant.plan_id)) return false;
  if (!isCanonicalGrantSource(grant.grant_source)) return false;

  const expiresAt = grant.expires_at;
  if (expiresAt === null || expiresAt === undefined) return true; // permanent
  const ms = parseInstant(expiresAt);
  if (ms === null) return false; // unparseable → fail closed
  return ms > now;
}

/**
 * Picks the strongest active grant: highest plan rank first, then the one that
 * runs longest (a permanent grant beats any dated one).
 */
export function selectStrongestActiveGrant(
  grants: readonly BillingGrantRecord[] | null | undefined,
  now: number = Date.now(),
): BillingGrantRecord | null {
  if (!Array.isArray(grants) || grants.length === 0) return null;

  let best: BillingGrantRecord | null = null;
  let bestRank = -1;
  let bestExpiry = Number.NEGATIVE_INFINITY;

  for (const grant of grants) {
    if (!isGrantActive(grant, now)) continue;
    const rank = PLAN_RANK[grant.plan_id as BillingPlanId] ?? -1;
    if (rank < 0) continue;
    // `null` expiry means permanent → treat as +Infinity for the comparison.
    const expiry =
      grant.expires_at == null
        ? Number.POSITIVE_INFINITY
        : (parseInstant(grant.expires_at) ?? Number.NEGATIVE_INFINITY);

    if (rank > bestRank || (rank === bestRank && expiry > bestExpiry)) {
      best = grant;
      bestRank = rank;
      bestExpiry = expiry;
    }
  }

  return best;
}

export interface GrantAwareEntitlementInput {
  /** The canonical paid subscription row, or null when there is none. */
  subscription: BillingSubscriptionRecord | null | undefined;
  /** Every grant row for the user, active or not — filtering happens here. */
  grants?: readonly BillingGrantRecord[] | null | undefined;
  /** Injectable clock for deterministic tests. */
  now?: Date | string | number;
}

function toMillis(now: GrantAwareEntitlementInput["now"]): number {
  if (now === undefined) return Date.now();
  if (now instanceof Date) return now.getTime();
  if (typeof now === "number") return now;
  const ms = Date.parse(now);
  return Number.isFinite(ms) ? ms : Date.now();
}

/**
 * THE canonical Free/Pro decision (B0).
 *
 * This is the single function every consumer must use. It composes the two
 * legitimate sources of paid access:
 *
 *   1. an active PAID subscription   (delegated to `resolveEntitlement`)
 *   2. an active GRANT               (invitation / admin / promotion / legacy)
 *
 * Precedence: the subscription wins when it grants access, because it is the
 * state with a real billing lifecycle behind it. Otherwise the strongest active
 * grant decides. When neither grants, the result is `free` and the reason is the
 * subscription's own diagnostic (PENDING / PAST_DUE / …) so the cause is not
 * lost; with no subscription at all and no grant, the reason is NO_SUBSCRIPTION.
 *
 * PURE and SYNCHRONOUS. It reads no browser flag, no e-mail, no localStorage and
 * no query string — callers pass already-fetched canonical rows.
 */
export function resolveEntitlementWithGrants(
  input: GrantAwareEntitlementInput,
): EntitlementResolution {
  const nowMs = toMillis(input.now);

  const fromSubscription = resolveEntitlement(input.subscription);
  if (fromSubscription.hasPaidAccess) return fromSubscription;

  const grant = selectStrongestActiveGrant(input.grants, nowMs);
  if (grant) {
    return {
      effectiveTier: grant.plan_id,
      hasPaidAccess: true,
      canonicalPlanId: grant.plan_id,
      subscriptionStatus: fromSubscription.subscriptionStatus,
      cancelAtPeriodEnd: fromSubscription.cancelAtPeriodEnd,
      // The grant's own end date is the meaningful horizon when there is no
      // subscription; fall back to the subscription's period if the grant is
      // permanent and a subscription period exists for diagnostics.
      currentPeriodEnd: grant.expires_at ?? fromSubscription.currentPeriodEnd,
      reason: "ACTIVE_GRANT",
    };
  }

  // Free. Keep the subscription's diagnostic when there was one — losing it
  // would turn "past_due" into a generic "no subscription".
  return fromSubscription;
}
