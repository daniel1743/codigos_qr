/**
 * CRIPQER BILLING — CANONICAL SUBSCRIPTION APPLICATION CORE V1
 * (SERVER-SIDE ONLY)
 *
 * This layer consumes already-verified / already-normalized Billing events
 * (`NormalizedBillingEvent` from the frozen webhook normalization core) and
 * safely applies authoritative PAID subscription state to Cripqer's canonical
 * persistence (`billing_customers` / `billing_subscriptions`).
 *
 * It performs NO provider network calls, NO webhook signature verification,
 * NO HTTP routes, and NO product-entitlement activation. Idempotency is owned
 * by the host webhook pipeline (the frozen idempotency bridge); this module
 * introduces no second event store.
 *
 * Free is represented canonically as the ABSENCE of a paid subscription row.
 * This module never persists a `"free"` plan or a `"free"` status.
 *
 * The module is built on a dependency-injection seam so it can be exercised
 * with pure local mocks (no network, no DB) and so the host can wire the real
 * canonical persistence primitives without this module depending on them
 * directly. It mirrors the ACTUAL signatures in the frozen persistence module.
 */

import {
  BILLING_PLAN_IDS,
  BILLING_PROVIDERS,
  BILLING_SUBSCRIPTION_STATUSES,
} from "../../lib/billing/billing.types.ts";
import type {
  BillingCustomerRecord,
  BillingPlanId,
  BillingProvider,
  BillingSubscriptionRecord,
  BillingSubscriptionStatus,
  NormalizedSubscriptionInput,
} from "../../lib/billing/billing.types.ts";
import type { NormalizedBillingEvent } from "./webhooks.ts";

/* ============================ result contract ============================ */

/**
 * Canonical application outcome. The status is the machine-readable decision;
 * `code` carries the human/machine reason. No raw provider payload is ever
 * returned or persisted.
 */
export type ApplicationResultStatus =
  | "APPLIED"
  | "LOOKUP_REQUIRED"
  | "OWNER_REQUIRED"
  | "PLAN_MAPPING_REQUIRED"
  | "IGNORED"
  | "REJECTED";

export interface ApplicationResult {
  status: ApplicationResultStatus;
  provider: BillingProvider;
  eventId: string;
  providerSubscriptionId: string | null;
  /** Canonical Cripqer user id — present only when ownership was proven. */
  userId: string | null;
  /** Stable reason code (e.g. "PLAN_MAPPING_REQUIRED", "OWNER_REQUIRED"). */
  code: string;
}

/* =========================== dependency seams ============================ */

/**
 * Mirrors the frozen canonical persistence primitives exactly. The host wires
 * the real functions (or a Supabase client) in a later phase; this module never
 * touches the DB itself.
 */
export interface ApplicationStore {
  getSubscriptionByProviderId(
    provider: BillingProvider,
    providerSubscriptionId: string,
  ): Promise<BillingSubscriptionRecord | null>;
  upsertNormalizedSubscription(
    input: NormalizedSubscriptionInput,
  ): Promise<BillingSubscriptionRecord>;
  getBillingCustomer(
    userId: string,
    provider: BillingProvider,
  ): Promise<BillingCustomerRecord | null>;
  upsertBillingCustomer(input: {
    user_id: string;
    provider: BillingProvider;
    provider_customer_id: string;
  }): Promise<BillingCustomerRecord>;
}

/**
 * Maps a provider plan reference (`providerPlanId`) to a canonical paid plan.
 * This module NEVER invents this mapping; the host supplies it. Returning
 * `null` fails closed as `PLAN_MAPPING_REQUIRED`.
 */
export interface BillingPlanResolver {
  resolvePlan(
    provider: BillingProvider,
    providerPlanId: string | null,
  ): BillingPlanId | null;
}

export interface ApplicationDeps {
  store: ApplicationStore;
  planResolver: BillingPlanResolver;
}

/**
 * Host application context. `trustedUserId` is the ONLY way the caller may
 * supply authoritative ownership; it is otherwise proven from canonical
 * persistence (an already-associated subscription).
 */
export interface ApplicationContext {
  trustedUserId?: string | null;
}

/**
 * Default fail-closed plan resolver: no provider plan is mappable until the
 * host injects an explicitly-approved mapping. This mirrors the Server Catalog
 * "empty registry fails closed" posture.
 */
export const EMPTY_PLAN_RESOLVER: BillingPlanResolver = {
  resolvePlan: () => null,
};

/* ============================ runtime guards ============================= */

function isCanonicalProvider(value: unknown): value is BillingProvider {
  return (
    typeof value === "string" &&
    (BILLING_PROVIDERS as readonly string[]).includes(value)
  );
}

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

/* ========================== ownership resolution ========================= */

/**
 * Ownership is proven from, in order of precedence:
 *   1. a trusted user id supplied by the host application context;
 *   2. an already-associated canonical subscription (provider-scoped).
 *
 * The provider event by itself never invents the Cripqer user owner. Email
 * matching, provider metadata, and browser-supplied ids are never consulted.
 */
async function resolveOwner(
  deps: ApplicationDeps,
  provider: BillingProvider,
  providerSubscriptionId: string | null,
  trustedUserId: string | null,
): Promise<string | null> {
  if (typeof trustedUserId === "string" && trustedUserId.trim().length > 0) {
    return trustedUserId;
  }

  if (
    typeof providerSubscriptionId === "string" &&
    providerSubscriptionId.length > 0
  ) {
    const existing = await deps.store.getSubscriptionByProviderId(
      provider,
      providerSubscriptionId,
    );
    if (
      existing &&
      typeof existing.user_id === "string" &&
      existing.user_id.length > 0
    ) {
      return existing.user_id;
    }
  }

  return null;
}

/* ============================ application core =========================== */

/**
 * Apply a normalized, authoritative billing event to canonical persistence.
 *
 * Applies PAID subscription state ONLY when:
 *   - an authoritative provider lookup is not pending;
 *   - the provider identity is canonical;
 *   - the provider subscription identity is valid (for subscription state);
 *   - the status is a canonical PAID status;
 *   - the plan is canonically resolvable (never inferred);
 *   - ownership is proven.
 *
 * Otherwise it returns an explicit non-applied result — never guessing.
 */
export async function applyNormalizedEvent(
  deps: ApplicationDeps,
  event: NormalizedBillingEvent,
  context: ApplicationContext = {},
): Promise<ApplicationResult> {
  const provider = event.provider;
  const eventId = event.eventId;
  const providerSubscriptionId = event.providerSubscriptionId;
  const providerCustomerId = event.providerCustomerId;

  const result = (
    status: ApplicationResultStatus,
    code: string,
    userId: string | null,
  ): ApplicationResult => ({
    status,
    provider,
    eventId,
    providerSubscriptionId,
    userId,
    code,
  });

  // 1. Authoritative lookup gate — never write subscription state.
  if (event.requiresAuthoritativeLookup) {
    return result("LOOKUP_REQUIRED", "LOOKUP_REQUIRED", null);
  }

  // 2. Provider identity must be canonical.
  if (!isCanonicalProvider(provider)) {
    return result("REJECTED", "INVALID_PROVIDER", null);
  }

  const hasSubscriptionState = event.status !== null;
  const hasCustomerIdentity =
    typeof providerCustomerId === "string" && providerCustomerId.length > 0;

  // 3. Nothing to apply.
  if (!hasSubscriptionState && !hasCustomerIdentity) {
    return result("IGNORED", "NOTHING_TO_APPLY", null);
  }

  let planId: BillingPlanId | null = null;
  let statusToApply: BillingSubscriptionStatus | null = null;

  if (hasSubscriptionState) {
    // 4. Subscription identity required for subscription state.
    if (
      typeof providerSubscriptionId !== "string" ||
      providerSubscriptionId.length === 0
    ) {
      return result("REJECTED", "MISSING_SUBSCRIPTION_ID", null);
    }

    // 5. Status must be a canonical PAID status (never "free").
    const status = event.status;
    if (!isCanonicalSubscriptionStatus(status)) {
      return result("REJECTED", "UNSUPPORTED_STATUS", null);
    }
    statusToApply = status;

    // 6. Plan resolution — never inferred from amount/currency/event name.
    const resolved = deps.planResolver.resolvePlan(
      provider,
      event.providerPlanId,
    );
    if (!isCanonicalPlanId(resolved)) {
      return result("PLAN_MAPPING_REQUIRED", "PLAN_MAPPING_REQUIRED", null);
    }
    planId = resolved;
  }

  // 7. Ownership resolution.
  const userId = await resolveOwner(
    deps,
    provider,
    providerSubscriptionId,
    context.trustedUserId ?? null,
  );
  if (userId === null) {
    return result("OWNER_REQUIRED", "OWNER_REQUIRED", null);
  }

  // 8. Customer application — only when provider customer identity is known.
  let billingCustomerId: string | null = null;
  if (hasCustomerIdentity && typeof providerCustomerId === "string") {
    const customer = await deps.store.upsertBillingCustomer({
      user_id: userId,
      provider,
      provider_customer_id: providerCustomerId,
    });
    billingCustomerId = customer.id;
  }

  // 9. Subscription application — paid state only; never a "free" row.
  if (hasSubscriptionState && planId !== null && statusToApply !== null) {
    const input: NormalizedSubscriptionInput = {
      user_id: userId,
      plan_id: planId,
      provider,
      billing_customer_id: billingCustomerId,
      provider_customer_id: providerCustomerId,
      provider_subscription_id: providerSubscriptionId,
      billing_interval: event.billingInterval,
      currency: event.currency,
      status: statusToApply,
      current_period_start: event.currentPeriodStart,
      current_period_end: event.currentPeriodEnd,
      cancel_at_period_end: event.cancelAtPeriodEnd ?? false,
      payment_method_label: null,
    };
    await deps.store.upsertNormalizedSubscription(input);
  }

  return result("APPLIED", "APPLIED", userId);
}


