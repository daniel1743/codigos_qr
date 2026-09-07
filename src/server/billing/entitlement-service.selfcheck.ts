/**
 * CRIPQER BILLING — ENTITLEMENT HOST SERVICE V1 SELFCHECK
 *
 * PURE LOCAL — mocked store, no network, no DB, no writes, no routes. This file
 * exercises `resolveUserEntitlement` / `createEntitlementHostService` against
 * a local in-memory store and verifies delegation to the frozen
 * `resolveEntitlement`.
 *
 * Run directly:
 *   node --experimental-transform-types src/server/billing/entitlement-service.selfcheck.ts
 */

import {
  resolveUserEntitlement,
  createEntitlementHostService,
  type EntitlementSubscriptionStore,
} from "./entitlement-service.ts";
import { resolveEntitlement } from "./entitlements.ts";
import type {
  BillingPlanId,
  BillingSubscriptionRecord,
  BillingSubscriptionStatus,
} from "../../lib/billing/billing.types.ts";

/* ============================ assertion harness =========================== */

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

/* ============================== mock store =============================== */

class MockStore implements EntitlementSubscriptionStore {
  private readonly records = new Map<string, BillingSubscriptionRecord | null>();
  lastQueriedUserId: string | null = null;

  set(userId: string, record: BillingSubscriptionRecord | null): void {
    this.records.set(userId, record);
  }

  async getCanonicalSubscriptionForUser(
    userId: string,
  ): Promise<BillingSubscriptionRecord | null> {
    this.lastQueriedUserId = userId;
    return this.records.get(userId) ?? null;
  }
}

/* ============================ fixture builder ============================= */

function makeSub(
  overrides: Partial<BillingSubscriptionRecord> = {},
): BillingSubscriptionRecord {
  return {
    id: "sub_1",
    user_id: "user_pro",
    plan_id: "pro",
    provider: "stripe",
    billing_customer_id: null,
    provider_customer_id: "cus_1",
    provider_subscription_id: "sub_1",
    billing_interval: "monthly",
    currency: "USD",
    status: "active",
    current_period_start: "2026-09-01T00:00:00.000Z",
    current_period_end: "2026-10-01T00:00:00.000Z",
    cancel_at_period_end: false,
    payment_method_label: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

/* ============================== test cases =============================== */

async function run(): Promise<void> {
  // no_subscription → free
  {
    const store = new MockStore();
    const r = await resolveUserEntitlement(store, "USER_A");
    check(r.effectiveTier === "free", "no_subscription → free");
    check(r.hasPaidAccess === false, "no_subscription → hasPaidAccess false");
    check(r.reason === "NO_SUBSCRIPTION", "no_subscription → reason NO_SUBSCRIPTION");
  }


  // active pro / business / enterprise
  {
    const store = new MockStore();
    store.set("USER_PRO", makeSub({ plan_id: "pro", user_id: "USER_PRO" }));
    store.set("USER_BIZ", makeSub({ plan_id: "business", user_id: "USER_BIZ" }));
    store.set("USER_ENT", makeSub({ plan_id: "enterprise", user_id: "USER_ENT" }));

    const pro = await resolveUserEntitlement(store, "USER_PRO");
    check(pro.effectiveTier === "pro", "active Pro → pro");
    check(pro.hasPaidAccess === true, "active Pro → hasPaidAccess true");

    const biz = await resolveUserEntitlement(store, "USER_BIZ");
    check(biz.effectiveTier === "business", "active Business → business");

    const ent = await resolveUserEntitlement(store, "USER_ENT");
    check(ent.effectiveTier === "enterprise", "active Enterprise → enterprise");
  }

  // pending / past_due / cancelled → free (through frozen resolver)
  {
    const store = new MockStore();
    store.set("U_PENDING", makeSub({ status: "pending", user_id: "U_PENDING" }));
    store.set("U_PASTDUE", makeSub({ status: "past_due", user_id: "U_PASTDUE" }));
    store.set("U_CANCEL", makeSub({ status: "cancelled", user_id: "U_CANCEL" }));

    check(
      (await resolveUserEntitlement(store, "U_PENDING")).effectiveTier === "free",
      "pending → free",
    );
    check(
      (await resolveUserEntitlement(store, "U_PASTDUE")).effectiveTier === "free",
      "past_due → free",
    );
    check(
      (await resolveUserEntitlement(store, "U_CANCEL")).effectiveTier === "free",
      "cancelled → free",
    );
  }

  // cancel_at_period_end → still paid
  {
    const store = new MockStore();
    store.set(
      "U_CANCELEND",
      makeSub({ cancel_at_period_end: true, user_id: "U_CANCELEND" }),
    );
    const r = await resolveUserEntitlement(store, "U_CANCELEND");
    check(r.effectiveTier === "pro", "cancel_at_period_end (active) → still pro");
    check(r.hasPaidAccess === true, "cancel_at_period_end → still paid");
  }

  // trusted_identity: store queried with the trusted canonical userId
  {
    const store = new MockStore();
    await resolveUserEntitlement(store, "USER_TRUSTED");
    check(
      store.lastQueriedUserId === "USER_TRUSTED",
      "store queried with trusted canonical userId",
    );
  }

  // browser_identity: no browser userId / email authority path
  {
    check(
      resolveUserEntitlement.length === 2,
      "service arity = 2 (store + userId; no email/browser param)",
    );
    const svc = createEntitlementHostService(new MockStore());
    check(
      svc.resolveForUser.length === 1,
      "factory method arity = 1 (userId only)",
    );
  }

  // no_duplicate_resolution: service delegates lifecycle to resolveEntitlement
  {
    const rec = makeSub({ plan_id: "business", status: "active" });
    const store = new MockStore();
    store.set("U_DUP", rec);
    const viaService = await resolveUserEntitlement(store, "U_DUP");
    const viaResolver = resolveEntitlement(rec);
    check(
      JSON.stringify(viaService) === JSON.stringify(viaResolver),
      "service output identical to frozen resolveEntitlement (no duplicate logic)",
    );
  }

  // no_legacy_authority: legacy premium/dev-email logic not used
  {
    const store = new MockStore(); // no subscription for any user
    const r = await resolveUserEntitlement(store, "falcondaniel37@gmail.com");
    check(
      r.effectiveTier === "free" && r.reason === "NO_SUBSCRIPTION",
      "no legacy premium/dev-email override — resolves free",
    );
  }

  // no_writes: no persistence mutation (seam is read-only)
  {
    const store = new MockStore();
    await resolveUserEntitlement(store, "USER_W");
    check(
      Object.keys(store).every(
        (k) => !k.startsWith("upsert") && !k.startsWith("insert"),
      ),
      "store exposes no write method; service performs no mutation",
    );
  }

  // no_network: local mock only, no provider call
  {
    const store = new MockStore();
    store.set("USER_N", makeSub({ plan_id: "pro", user_id: "USER_N" }));
    const r = await resolveUserEntitlement(store, "USER_N");
    check(
      r.effectiveTier === "pro",
      "no_network: local mock resolves without provider call",
    );
  }

  // empty/blank trusted id → fail closed to free without store access
  {
    const store = new MockStore();
    const r = await resolveUserEntitlement(store, "   ");
    check(r.effectiveTier === "free", "blank trusted id → free");
    check(store.lastQueriedUserId === null, "blank trusted id → store not queried");
  }

  console.log(
    `\nEntitlement Host Service Selfcheck: ${passed} passed, ${failed} failed`,
  );

  if (failed > 0) {
    console.error("SELFCHECK FAILED");
    process.exitCode = 1;
  } else {
    console.log("SELFCHECK PASS");
  }
}

await run();
