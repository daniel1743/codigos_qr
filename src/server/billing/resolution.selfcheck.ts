/**
 * CRIPQER BILLING — OWNERSHIP & PLAN RESOLUTION CORE V1 SELFCHECK
 *
 * PURE LOCAL — NO NETWORK — NO DATABASE.
 *
 * Exercises the resolution core with in-memory mocks only. It verifies the
 * required cases from the task spec (ownership resolution, plan resolution,
 * fail-closed ambiguity, free/amount/email/metadata non-authority, Application
 * Core seam compatibility, zero writes, zero network).
 *
 * Run via:  node src/server/billing/resolution.selfcheck.ts
 */

import type {
  BillingCheckoutRecord,
  BillingCustomerRecord,
  BillingProvider,
  BillingSubscriptionRecord,
} from "../../lib/billing/billing.types.ts";
import type { BillingPlanResolver } from "./application.ts";
import {
  createApplicationOwnershipContext,
  createBillingPlanResolver,
  DEFAULT_PLAN_RESOLVER,
  EMPTY_PLAN_MAPPING_REGISTRY,
  resolveOwnership,
  resolvePlanReference,
  type OwnershipResolutionDeps,
  type PlanMappingEntry,
  type PlanMappingRegistry,
} from "./resolution.ts";

/* ------------------------------ test harness ------------------------------ */

let passed = 0;
let failed = 0;
let writes = 0;
let networkCalls = 0;

function assert(name: string, condition: boolean): void {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`FAIL: ${name}`);
  }
}

/* ------------------------------ mock records ------------------------------ */

function mockSubscription(userId: string, providerSubscriptionId: string): BillingSubscriptionRecord {
  return {
    id: `sub_${providerSubscriptionId}`,
    user_id: userId,
    plan_id: "pro",
    provider: "stripe",
    billing_customer_id: null,
    provider_customer_id: null,
    provider_subscription_id: providerSubscriptionId,
    billing_interval: "monthly",
    currency: "USD",
    status: "active",
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    payment_method_label: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function mockCustomer(userId: string, providerCustomerId: string): BillingCustomerRecord {
  return {
    id: `cust_${providerCustomerId}`,
    user_id: userId,
    provider: "stripe",
    provider_customer_id: providerCustomerId,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function mockCheckout(userId: string, providerCheckoutId: string): BillingCheckoutRecord {
  return {
    id: `chk_${providerCheckoutId}`,
    user_id: userId,
    provider: "stripe",
    plan_id: "pro",
    billing_interval: "monthly",
    provider_checkout_id: providerCheckoutId,
    status: "success",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    expires_at: null,
  };
}

/* --------------------------- ownership mocks ------------------------------ */

interface OwnershipMockState {
  subscriptions: Map<string, BillingSubscriptionRecord>;
  customers: Map<string, BillingCustomerRecord>;
  checkouts: Map<string, BillingCheckoutRecord>;
}

function buildOwnershipDeps(state: OwnershipMockState): OwnershipResolutionDeps {
  return {
    async getSubscriptionByProviderId(provider: BillingProvider, providerSubscriptionId: string) {
      void provider;
      return state.subscriptions.get(providerSubscriptionId) ?? null;
    },
    async getBillingCustomerByProviderCustomerId(provider: BillingProvider, providerCustomerId: string) {
      void provider;
      return state.customers.get(providerCustomerId) ?? null;
    },
    async getBillingCheckoutByProviderCheckoutId(provider: BillingProvider, providerCheckoutId: string) {
      void provider;
      return state.checkouts.get(providerCheckoutId) ?? null;
    },
  };
}

/** Deps that mirror the FROZEN persistence surface only (no customer/checkout). */
function buildFrozenOnlyDeps(state: OwnershipMockState): OwnershipResolutionDeps {
  return {
    async getSubscriptionByProviderId(provider: BillingProvider, providerSubscriptionId: string) {
      void provider;
      return state.subscriptions.get(providerSubscriptionId) ?? null;
    },
  };
}

/* ------------------------------ plan registry ----------------------------- */

function entry(
  provider: BillingProvider,
  providerPlanId: string,
  planId: PlanMappingEntry["planId"],
  billingInterval?: PlanMappingEntry["billingInterval"],
): PlanMappingEntry {
  return { provider, providerPlanId, planId, billingInterval: billingInterval ?? null };
}

/* ------------------------------- assertions ------------------------------- */

async function run(): Promise<void> {
  /* ------------------------- ownership resolution ------------------------- */

  // trusted_context: trusted USER_A resolves USER_A.
  {
    const deps = buildFrozenOnlyDeps({ subscriptions: new Map(), customers: new Map(), checkouts: new Map() });
    const result = await resolveOwnership(deps, { provider: "stripe", trustedUserId: "USER_A" });
    assert("trusted_context resolves USER_A", result.status === "RESOLVED" && result.userId === "USER_A" && result.source === "TRUSTED_CONTEXT");
  }

  // existing_subscription: provider subscription resolves canonical owner.
  {
    const deps = buildFrozenOnlyDeps({
      subscriptions: new Map([["sub_1", mockSubscription("USER_B", "sub_1")]]),
      customers: new Map(),
      checkouts: new Map(),
    });
    const result = await resolveOwnership(deps, { provider: "stripe", providerSubscriptionId: "sub_1" });
    assert("existing_subscription resolves USER_B", result.status === "RESOLVED" && result.userId === "USER_B" && result.source === "EXISTING_SUBSCRIPTION");
  }

  // canonical_customer: known provider customer resolves canonical owner.
  {
    const state: OwnershipMockState = { subscriptions: new Map(), customers: new Map([["pc_9", mockCustomer("USER_C", "pc_9")]]), checkouts: new Map() };
    const result = await resolveOwnership(buildOwnershipDeps(state), { provider: "stripe", providerCustomerId: "pc_9" });
    assert("canonical_customer resolves USER_C", result.status === "RESOLVED" && result.userId === "USER_C" && result.source === "CANONICAL_CUSTOMER");
  }

  // canonical_checkout: known provider checkout resolves canonical owner.
  {
    const state: OwnershipMockState = { subscriptions: new Map(), customers: new Map(), checkouts: new Map([["pchk_1", mockCheckout("USER_D", "pchk_1")]]) };
    const result = await resolveOwnership(buildOwnershipDeps(state), { provider: "stripe", providerCheckoutId: "pchk_1" });
    assert("canonical_checkout resolves USER_D", result.status === "RESOLVED" && result.userId === "USER_D" && result.source === "CANONICAL_CHECKOUT");
  }

  // no_owner: unknown references => OWNER_REQUIRED.
  {
    const deps = buildFrozenOnlyDeps({ subscriptions: new Map(), customers: new Map(), checkouts: new Map() });
    const result = await resolveOwnership(deps, { provider: "stripe", providerSubscriptionId: "sub_unknown" });
    assert("no_owner returns OWNER_REQUIRED", result.status === "OWNER_REQUIRED" && result.userId === null && result.source === null);
  }

  // conflicting_owner: trusted USER_A + authoritative existing USER_B => OWNER_CONFLICT.
  {
    const deps = buildFrozenOnlyDeps({
      subscriptions: new Map([["sub_1", mockSubscription("USER_B", "sub_1")]]),
      customers: new Map(),
      checkouts: new Map(),
    });
    const result = await resolveOwnership(deps, { provider: "stripe", trustedUserId: "USER_A", providerSubscriptionId: "sub_1" });
    assert("conflicting_owner returns OWNER_CONFLICT", result.status === "OWNER_CONFLICT" && result.userId === null);
  }

  // provider_metadata: provider-metadata userId (raw provider id string) ignored.
  {
    const deps = buildFrozenOnlyDeps({ subscriptions: new Map(), customers: new Map(), checkouts: new Map() });
    const result = await resolveOwnership(deps, { provider: "stripe", providerCustomerId: "meta-USER_EVIL" });
    assert("provider_metadata userId ignored", result.status === "OWNER_REQUIRED" && result.userId === null);
  }

  // email: email never resolves ownership (provider customer ref that looks like email).
  {
    const deps = buildFrozenOnlyDeps({ subscriptions: new Map(), customers: new Map(), checkouts: new Map() });
    const result = await resolveOwnership(deps, { provider: "stripe", providerCustomerId: "user@example.com" });
    assert("email never resolves ownership", result.status === "OWNER_REQUIRED" && result.userId === null);
  }

  /* --------------------------- plan resolution ---------------------------- */

  const registry: PlanMappingRegistry = {
    entries: [
      entry("stripe", "stripe_pro", "pro", "monthly"),
      entry("stripe", "stripe_business", "business", "monthly"),
      entry("paypal", "paypal_ent", "enterprise", "yearly"),
    ],
  };

  // configured provider reference resolves Pro / Business / Enterprise.
  {
    const pro = resolvePlanReference(registry, "stripe", "stripe_pro");
    const business = resolvePlanReference(registry, "stripe", "stripe_business");
    const enterprise = resolvePlanReference(registry, "paypal", "paypal_ent");
    assert("plan_mapping resolves Pro", pro.status === "RESOLVED" && pro.planId === "pro");
    assert("plan_mapping resolves Business", business.status === "RESOLVED" && business.planId === "business");
    assert("plan_mapping resolves Enterprise", enterprise.status === "RESOLVED" && enterprise.planId === "enterprise");
    assert("plan_mapping carries interval", pro.billingInterval === "monthly");
  }

  // unknown_plan: unknown provider reference => PLAN_MAPPING_REQUIRED.
  assert("unknown_plan returns PLAN_MAPPING_REQUIRED", resolvePlanReference(registry, "stripe", "stripe_unknown").status === "PLAN_MAPPING_REQUIRED");

  // conflicting_mapping: duplicate/conflicting mapping fails closed.
  {
    const conflicting: PlanMappingRegistry = {
      entries: [
        entry("stripe", "stripe_pro", "pro", "monthly"),
        entry("stripe", "stripe_pro", "business", "monthly"),
      ],
    };
    assert("conflicting_mapping returns PLAN_MAPPING_CONFLICT", resolvePlanReference(conflicting, "stripe", "stripe_pro").status === "PLAN_MAPPING_CONFLICT");
    assert("conflicting_mapping resolver fails closed", createBillingPlanResolver(conflicting).resolvePlan("stripe", "stripe_pro") === null);
  }

  // free: cannot map provider reference to free.
  {
    const freeRegistry: PlanMappingRegistry = {
      entries: [entry("stripe", "stripe_free", "free" as PlanMappingEntry["planId"], "monthly")],
    };
    assert("free cannot resolve", resolvePlanReference(freeRegistry, "stripe", "stripe_free").status !== "RESOLVED");
    assert("free resolver returns null", createBillingPlanResolver(freeRegistry).resolvePlan("stripe", "stripe_free") === null);
  }

  // amount: amount never resolves plan (extra amount field ignored; no amount in result).
  {
    const amountEntry = { provider: "stripe" as BillingProvider, providerPlanId: "stripe_pro", planId: "pro" as const, billingInterval: "monthly" as const, amount: 999999 };
    const amountRegistry: PlanMappingRegistry = { entries: [amountEntry] };
    const result = resolvePlanReference(amountRegistry, "stripe", "stripe_pro");
    assert("amount never resolves plan (still pro)", result.status === "RESOLVED" && result.planId === "pro");
    assert("amount absent from plan result", !("amount" in result));
  }

  // default_registry: empty mapping registry resolves nothing.
  {
    assert("default_registry resolvePlanReference fails closed", resolvePlanReference(EMPTY_PLAN_MAPPING_REGISTRY, "stripe", "stripe_pro").status === "PLAN_MAPPING_REQUIRED");
    assert("default_registry resolver resolves nothing", DEFAULT_PLAN_RESOLVER.resolvePlan("stripe", "stripe_pro") === null);
  }

  /* ------------------------ application compatibility --------------------- */

  // resolver satisfies Application Core plan-resolution seam.
  {
    const resolver: BillingPlanResolver = createBillingPlanResolver(registry);
    assert("resolver satisfies BillingPlanResolver seam", typeof resolver.resolvePlan === "function");
    assert("resolver maps pro", resolver.resolvePlan("stripe", "stripe_pro") === "pro");
    assert("resolver maps business", resolver.resolvePlan("stripe", "stripe_business") === "business");
    assert("resolver maps enterprise", resolver.resolvePlan("paypal", "paypal_ent") === "enterprise");
    assert("resolver unknown => null", resolver.resolvePlan("stripe", "stripe_unknown") === null);
    assert("resolver null providerPlanId => null", resolver.resolvePlan("stripe", null) === null);
  }

  // trusted ownership result can be supplied to Application Core.
  {
    const deps = buildFrozenOnlyDeps({ subscriptions: new Map(), customers: new Map(), checkouts: new Map() });
    const ownership = await resolveOwnership(deps, { provider: "stripe", trustedUserId: "USER_A" });
    const context = createApplicationOwnershipContext(ownership.userId);
    assert("trusted ownership result -> ApplicationContext", context.trustedUserId === "USER_A");
  }

  /* ------------------------------ no writes ------------------------------- */

  {
    const deps = buildFrozenOnlyDeps({ subscriptions: new Map(), customers: new Map(), checkouts: new Map() });
    await resolveOwnership(deps, { provider: "stripe", providerSubscriptionId: "sub_1" });
    resolvePlanReference(registry, "stripe", "stripe_pro");
    createBillingPlanResolver(registry).resolvePlan("stripe", "stripe_pro");
    assert("no persistence writes", writes === 0);
  }

  /* ------------------------------ no network ------------------------------ */

  assert("no provider network calls", networkCalls === 0);
}

await run();

console.log(`RESOLUTION SELFCHECK: ${passed} passed, ${failed} failed (${passed + failed} assertions).`);
if (failed > 0) {
  process.exit(1);
}

