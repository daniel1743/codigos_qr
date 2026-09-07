/**
 * CRIPQER BILLING — SUBSCRIPTION APPLICATION CORE V1 SELFCHECK
 *
 * PURE-LOCAL: no network, no database, no provider SDK. Every dependency is a
 * local mock. Run with:
 *
 *   node src/server/billing/application.selfcheck.ts
 */

import {
  BILLING_PLAN_IDS,
  BILLING_SUBSCRIPTION_STATUSES,
} from "../../lib/billing/billing.types.ts";
import type {
  BillingCustomerRecord,
  BillingPlanId,
  BillingProvider,
  BillingSubscriptionRecord,
  BillingSubscriptionStatus,
} from "../../lib/billing/billing.types.ts";
import type { NormalizedBillingEvent } from "./webhooks.ts";
import {
  applyNormalizedEvent,
  EMPTY_PLAN_RESOLVER,
  type ApplicationDeps,
  type ApplicationResult,
  type ApplicationStore,
  type BillingPlanResolver,
} from "./application.ts";

/* ------------------------------ assertion ------------------------------- */

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean): void {
  if (cond) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(name);
  }
}

function eq(name: string, actual: unknown, expected: unknown): void {
  check(`${name} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`, actual === expected);
}

/* ------------------------------- fixtures ------------------------------- */

function makeEvent(
  overrides: Partial<NormalizedBillingEvent> = {},
): NormalizedBillingEvent {
  return {
    eventId: "evt_1",
    provider: "stripe",
    type: "SUBSCRIPTION_ACTIVATED",
    occurredAt: "2026-06-09T00:00:00.000Z",
    providerCustomerId: null,
    providerSubscriptionId: null,
    providerPlanId: null,
    billingInterval: null,
    currency: null,
    status: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: null,
    requiresAuthoritativeLookup: false,
    ...overrides,
  };
}

interface MockState {
  subscriptions: BillingSubscriptionRecord[];
  customers: BillingCustomerRecord[];
  subscriptionUpserts: number;
  customerUpserts: number;
}

function makeStore(initial?: {
  subscriptions?: BillingSubscriptionRecord[];
  customers?: BillingCustomerRecord[];
}): { store: ApplicationStore; state: MockState } {
  const state: MockState = {
    subscriptions: [...(initial?.subscriptions ?? [])],
    customers: [...(initial?.customers ?? [])],
    subscriptionUpserts: 0,
    customerUpserts: 0,
  };

  const store: ApplicationStore = {
    async getSubscriptionByProviderId(provider, providerSubscriptionId) {
      return (
        state.subscriptions.find(
          (s) =>
            s.provider === provider &&
            s.provider_subscription_id === providerSubscriptionId,
        ) ?? null
      );
    },
    async upsertNormalizedSubscription(input) {
      state.subscriptionUpserts += 1;
      const existing = state.subscriptions.find(
        (s) =>
          s.provider === input.provider &&
          s.provider_subscription_id === input.provider_subscription_id,
      );
      if (existing) {
        Object.assign(existing, input);
        return existing;
      }
      const record: BillingSubscriptionRecord = {
        id: `sub_${state.subscriptions.length + 1}`,
        created_at: "2026-06-09T00:00:00.000Z",
        updated_at: "2026-06-09T00:00:00.000Z",
        ...input,
      };
      state.subscriptions.push(record);
      return record;
    },
    async getBillingCustomer(userId, provider) {
      return (
        state.customers.find(
          (c) => c.user_id === userId && c.provider === provider,
        ) ?? null
      );
    },
    async upsertBillingCustomer(input) {
      state.customerUpserts += 1;
      const existing = state.customers.find(
        (c) => c.user_id === input.user_id && c.provider === input.provider,
      );
      if (existing) {
        Object.assign(existing, input);
        return existing;
      }
      const record: BillingCustomerRecord = {
        id: `cust_${state.customers.length + 1}`,
        created_at: "2026-06-09T00:00:00.000Z",
        updated_at: "2026-06-09T00:00:00.000Z",
        ...input,
      };
      state.customers.push(record);
      return record;
    },
  };

  return { store, state };
}

const proResolver: BillingPlanResolver = {
  resolvePlan: (_provider, providerPlanId) => {
    if (providerPlanId === "plan_pro") return "pro";
    if (providerPlanId === "plan_business") return "business";
    if (providerPlanId === "plan_enterprise") return "enterprise";
    return null;
  },
};

function makeSub(overrides: Partial<BillingSubscriptionRecord> = {}): BillingSubscriptionRecord {
  return {
    id: "sub_existing",
    user_id: "user_existing",
    plan_id: "pro",
    provider: "stripe",
    billing_customer_id: null,
    provider_customer_id: null,
    provider_subscription_id: "sub_existing",
    billing_interval: "monthly",
    currency: "USD",
    status: "active",
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    payment_method_label: null,
    created_at: "2026-06-09T00:00:00.000Z",
    updated_at: "2026-06-09T00:00:00.000Z",
    ...overrides,
  };
}

/* -------------------------------- cases --------------------------------- */

async function caseActivePro(): Promise<void> {
  const { store, state } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  const event = makeEvent({
    providerSubscriptionId: "sub_1",
    providerCustomerId: "cus_1",
    providerPlanId: "plan_pro",
    billingInterval: "monthly",
    currency: "USD",
    status: "active",
    currentPeriodStart: "2026-06-01T00:00:00.000Z",
    currentPeriodEnd: "2026-07-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
  });
  const res = await applyNormalizedEvent(deps, event, { trustedUserId: "user_1" });
  eq("active_pro.status", res.status, "APPLIED");
  eq("active_pro.userId", res.userId, "user_1");
  eq("active_pro.sub_upserts", state.subscriptionUpserts, 1);
  eq("active_pro.customer_upserts", state.customerUpserts, 1);
  const sub = state.subscriptions[0];
  check("active_pro.sub_exists", !!sub);
  if (sub) {
    eq("active_pro.plan_id", sub.plan_id, "pro");
    eq("active_pro.status", sub.status, "active");
    eq("active_pro.provider_subscription_id", sub.provider_subscription_id, "sub_1");
    eq("active_pro.user_id", sub.user_id, "user_1");
    eq("active_pro.billing_interval", sub.billing_interval, "monthly");
    eq("active_pro.currency", sub.currency, "USD");
    eq("active_pro.cancel_at_period_end", sub.cancel_at_period_end, false);
    eq("active_pro.billing_customer_id", sub.billing_customer_id, "cust_1");
    eq("active_pro.provider_customer_id", sub.provider_customer_id, "cus_1");
  }
}

async function caseBusinessSubscription(): Promise<void> {
  const { store, state } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  const event = makeEvent({
    provider: "stripe",
    providerSubscriptionId: "sub_biz",
    providerPlanId: "plan_business",
    billingInterval: "yearly",
    currency: "USD",
    status: "active",
  });
  const res = await applyNormalizedEvent(deps, event, { trustedUserId: "user_1" });
  eq("business.status", res.status, "APPLIED");
  eq("business.plan_id", state.subscriptions[0]?.plan_id, "business");
}

async function caseCancelledSubscription(): Promise<void> {
  const { store, state } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  const event = makeEvent({
    type: "SUBSCRIPTION_CANCELLED",
    providerSubscriptionId: "sub_cx",
    providerPlanId: "plan_pro",
    status: "cancelled",
    cancelAtPeriodEnd: true,
  });
  const res = await applyNormalizedEvent(deps, event, { trustedUserId: "user_1" });
  eq("cancelled.status", res.status, "APPLIED");
  eq("cancelled.record.status", state.subscriptions[0]?.status, "cancelled");
  eq("cancelled.record.plan_id", state.subscriptions[0]?.plan_id, "pro");
  eq("cancelled.record.cancel_at_period_end", state.subscriptions[0]?.cancel_at_period_end, true);
}

async function caseCustomerOnly(): Promise<void> {
  const { store, state } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  const event = makeEvent({
    providerSubscriptionId: null,
    providerCustomerId: "cus_2",
    status: null,
  });
  const res = await applyNormalizedEvent(deps, event, { trustedUserId: "user_2" });
  eq("customer.status", res.status, "APPLIED");
  eq("customer.customer_upserts", state.customerUpserts, 1);
  eq("customer.sub_upserts", state.subscriptionUpserts, 0);
  eq("customer.provider_customer_id", state.customers[0]?.provider_customer_id, "cus_2");
  eq("customer.user_id", state.customers[0]?.user_id, "user_2");
}

async function caseLookupRequired(): Promise<void> {
  const { store, state } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  const event = makeEvent({
    requiresAuthoritativeLookup: true,
    providerSubscriptionId: "sub_lk",
    providerPlanId: "plan_pro",
    status: "active",
  });
  const res = await applyNormalizedEvent(deps, event, { trustedUserId: "user_1" });
  eq("lookup.status", res.status, "LOOKUP_REQUIRED");
  eq("lookup.sub_upserts", state.subscriptionUpserts, 0);
  eq("lookup.customer_upserts", state.customerUpserts, 0);
}

async function caseMissingSubscriptionId(): Promise<void> {
  const { store, state } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  const event = makeEvent({
    providerSubscriptionId: null,
    providerPlanId: "plan_pro",
    status: "active",
  });
  const res = await applyNormalizedEvent(deps, event, { trustedUserId: "user_1" });
  eq("missing_id.status", res.status, "REJECTED");
  eq("missing_id.code", res.code, "MISSING_SUBSCRIPTION_ID");
  eq("missing_id.sub_upserts", state.subscriptionUpserts, 0);
  eq("missing_id.customer_upserts", state.customerUpserts, 0);
}

async function caseFreeNeverPersisted(): Promise<void> {
  check("free.not_in_plans", !BILLING_PLAN_IDS.includes("free" as BillingPlanId));
  check("free.not_in_statuses", !BILLING_SUBSCRIPTION_STATUSES.includes("free" as BillingSubscriptionStatus));

  const { store, state } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  const event = makeEvent({
    providerSubscriptionId: "sub_free",
    providerPlanId: "plan_pro",
    status: "free" as unknown as BillingSubscriptionStatus,
  });
  const res = await applyNormalizedEvent(deps, event, { trustedUserId: "user_1" });
  eq("free.status_rejected", res.status, "REJECTED");
  eq("free.code", res.code, "UNSUPPORTED_STATUS");
  eq("free.sub_upserts", state.subscriptionUpserts, 0);
}

async function caseOwner(): Promise<void> {
  const { store: s1, state: st1 } = makeStore();
  const d1: ApplicationDeps = { store: s1, planResolver: proResolver };
  const r1 = await applyNormalizedEvent(
    d1,
    makeEvent({
      providerSubscriptionId: "sub_new",
      providerPlanId: "plan_pro",
      status: "active",
    }),
    {},
  );
  eq("owner.missing.status", r1.status, "OWNER_REQUIRED");
  eq("owner.missing.sub_upserts", st1.subscriptionUpserts, 0);

  const { store: s2, state: st2 } = makeStore({
    subscriptions: [
      makeSub({ provider_subscription_id: "sub_known", user_id: "user_known" }),
    ],
  });
  const d2: ApplicationDeps = { store: s2, planResolver: proResolver };
  const r2 = await applyNormalizedEvent(
    d2,
    makeEvent({
      providerSubscriptionId: "sub_known",
      providerPlanId: "plan_pro",
      status: "active",
    }),
    {},
  );
  eq("owner.existing.status", r2.status, "APPLIED");
  eq("owner.existing.userId", r2.userId, "user_known");
  eq("owner.existing.upserts", st2.subscriptionUpserts, 1);
  eq("owner.existing.user_id", st2.subscriptions[0]?.user_id, "user_known");

  const event = makeEvent({
    providerSubscriptionId: "sub_1",
    providerPlanId: "plan_pro",
    status: "active",
  });
  check("owner.no_user_id_field", !("userId" in event));
  check("owner.no_email_field", !("email" in event));
}

async function casePlan(): Promise<void> {
  const { store: s1, state: st1 } = makeStore();
  const d1: ApplicationDeps = { store: s1, planResolver: proResolver };
  await applyNormalizedEvent(
    d1,
    makeEvent({
      providerSubscriptionId: "sub_1",
      providerPlanId: "plan_pro",
      status: "active",
    }),
    { trustedUserId: "user_1" },
  );
  eq("plan.canonical.plan_id", st1.subscriptions[0]?.plan_id, "pro");

  const { store: s2, state: st2 } = makeStore();
  const d2: ApplicationDeps = { store: s2, planResolver: proResolver };
  const r2 = await applyNormalizedEvent(
    d2,
    makeEvent({
      providerSubscriptionId: "sub_1",
      providerPlanId: "plan_unknown",
      status: "active",
    }),
    { trustedUserId: "user_1" },
  );
  eq("plan.unknown.status", r2.status, "PLAN_MAPPING_REQUIRED");
  eq("plan.unknown.sub_upserts", st2.subscriptionUpserts, 0);

  const { store: s3, state: st3 } = makeStore();
  const d3: ApplicationDeps = { store: s3, planResolver: EMPTY_PLAN_RESOLVER };
  const r3 = await applyNormalizedEvent(
    d3,
    makeEvent({
      providerSubscriptionId: "sub_1",
      providerPlanId: "plan_pro",
      status: "active",
    }),
    { trustedUserId: "user_1" },
  );
  eq("plan.empty.status", r3.status, "PLAN_MAPPING_REQUIRED");
  eq("plan.empty.sub_upserts", st3.subscriptionUpserts, 0);

  const event = makeEvent({
    providerSubscriptionId: "sub_1",
    providerPlanId: "plan_pro",
    status: "active",
  });
  check("plan.no_amount_field", !("amount" in event));

  let capturedPlanId: string | null = null;
  let capturedProvider: BillingProvider | null = null;
  const recordingResolver: BillingPlanResolver = {
    resolvePlan: (provider, providerPlanId) => {
      capturedProvider = provider;
      capturedPlanId = providerPlanId;
      return "pro";
    },
  };
  const { store: s4 } = makeStore();
  await applyNormalizedEvent(
    { store: s4, planResolver: recordingResolver },
    makeEvent({
      providerSubscriptionId: "sub_1",
      providerPlanId: "plan_pro",
      status: "active",
    }),
    { trustedUserId: "user_1" },
  );
  eq("plan.resolver.sees_plan_ref", capturedPlanId, "plan_pro");
  eq("plan.resolver.sees_provider", capturedProvider, "stripe");
}

async function caseIdentifiers(): Promise<void> {
  const { store, state } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  const event = makeEvent({
    eventId: "evt_999",
    providerSubscriptionId: "sub_999",
    providerPlanId: "plan_pro",
    status: "active",
  });
  const res = await applyNormalizedEvent(deps, event, { trustedUserId: "user_1" });
  eq("identifiers.status", res.status, "APPLIED");
  const sub = state.subscriptions[0];
  check("identifiers.sub_exists", !!sub);
  if (sub) {
    eq("identifiers.provider_subscription_id", sub.provider_subscription_id, "sub_999");
    check("identifiers.not_event_id", sub.provider_subscription_id !== "evt_999");
    check("identifiers.event_id_distinct", sub.provider_subscription_id !== event.eventId);
  }
  // The normalized event shape never carries these non-subscription identifiers.
  check("identifiers.no_invoice_id", !("invoiceId" in event));
  check("identifiers.no_sale_id", !("saleId" in event));
  check("identifiers.no_payment_id", !("paymentId" in event));
  check("identifiers.no_checkout_id", !("checkoutId" in event));
}

async function caseUnsupportedStatus(): Promise<void> {
  const { store, state } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  const event = makeEvent({
    providerSubscriptionId: "sub_1",
    providerPlanId: "plan_pro",
    status: "garbage" as unknown as BillingSubscriptionStatus,
  });
  const res = await applyNormalizedEvent(deps, event, { trustedUserId: "user_1" });
  eq("status.rejected", res.status, "REJECTED");
  eq("status.code", res.code, "UNSUPPORTED_STATUS");
  eq("status.sub_upserts", state.subscriptionUpserts, 0);
}

async function caseNoRawPayload(): Promise<void> {
  const { store, state } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  const event = makeEvent({
    providerSubscriptionId: "sub_1",
    providerPlanId: "plan_pro",
    status: "active",
  });
  const res: ApplicationResult = await applyNormalizedEvent(deps, event, {
    trustedUserId: "user_1",
  });
  check("raw.not_in_result", !("raw" in res));
  check("raw.no_payload_key", !("payload" in res));
  const sub = state.subscriptions[0];
  if (sub) {
    check("raw.not_in_subscription", !("raw" in sub));
  }
  const customer = state.customers[0];
  if (customer) {
    check("raw.not_in_customer", !("raw" in customer));
  }
}

async function caseNoNetwork(): Promise<void> {
  // The only dependencies invoked are the injected store and plan resolver;
  // there is no fetch/SDK path reachable from the application core.
  const { store } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  check("nonetwork.no_fetch_in_deps", !("fetch" in deps));
  check("nonetwork.no_sdk_in_deps", !("sdk" in deps) && !("client" in deps));
  const res = await applyNormalizedEvent(
    deps,
    makeEvent({
      providerSubscriptionId: "sub_1",
      providerPlanId: "plan_pro",
      status: "active",
    }),
    { trustedUserId: "user_1" },
  );
  eq("nonetwork.status", res.status, "APPLIED");
}

async function caseNoEntitlement(): Promise<void> {
  const { store } = makeStore();
  const deps: ApplicationDeps = { store, planResolver: proResolver };
  check("entitlement.no_grant_in_deps", !("grantEntitlement" in deps));
  check("entitlement.no_entitlements_in_deps", !("entitlements" in deps));
  const res = await applyNormalizedEvent(
    deps,
    makeEvent({
      providerSubscriptionId: "sub_1",
      providerPlanId: "plan_pro",
      status: "active",
    }),
    { trustedUserId: "user_1" },
  );
  check("entitlement.no_feature_in_result", !("features" in res) && !("entitlements" in res));
}

/* -------------------------------- runner --------------------------------- */

async function main(): Promise<void> {
  await caseActivePro();
  await caseBusinessSubscription();
  await caseCancelledSubscription();
  await caseCustomerOnly();
  await caseLookupRequired();
  await caseMissingSubscriptionId();
  await caseFreeNeverPersisted();
  await caseOwner();
  await casePlan();
  await caseIdentifiers();
  await caseUnsupportedStatus();
  await caseNoRawPayload();
  await caseNoNetwork();
  await caseNoEntitlement();

  console.log(`\nSELFCHECK: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    for (const f of failures) {
      console.log(`  FAIL: ${f}`);
    }
    throw new Error(`SELFCHECK FAILED: ${failed} assertion(s) failed.`);
  }
}

await main();
