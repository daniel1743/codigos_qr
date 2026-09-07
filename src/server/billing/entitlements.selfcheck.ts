/**
 * CRIPQER BILLING — ENTITLEMENT RESOLVER CORE V1 SELFCHECK
 *
 * PURE LOCAL — no network, no DB, no writes, no routes. This file exercises
 * `resolveEntitlement` against canonical subscription inputs and fails loudly
 * on any regression.
 *
 * Run directly:
 *   node src/server/billing/entitlements.selfcheck.ts
 */

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

function expectTier(
  result: ReturnType<typeof resolveEntitlement>,
  tier: string,
  hasPaidAccess: boolean,
  label: string,
): void {
  check(result.effectiveTier === tier, `${label} → effectiveTier = ${tier}`);
  check(
    result.hasPaidAccess === hasPaidAccess,
    `${label} → hasPaidAccess = ${hasPaidAccess}`,
  );
}

/* ============================ fixture builder ============================= */

function makeSub(
  overrides: Partial<BillingSubscriptionRecord> = {},
): BillingSubscriptionRecord {
  return {
    id: "sub_1",
    user_id: "user_1",
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

/* ============================ required cases ============================== */

// no_subscription
{
  const r = resolveEntitlement(null);
  expectTier(r, "free", false, "no_subscription (null)");
  check(r.reason === "NO_SUBSCRIPTION", "no_subscription reason = NO_SUBSCRIPTION");
}
{
  const r = resolveEntitlement(undefined);
  expectTier(r, "free", false, "no_subscription (undefined)");
  check(r.reason === "NO_SUBSCRIPTION", "no_subscription (undefined) reason");
}

// active_pro / business / enterprise
expectTier(resolveEntitlement(makeSub({ plan_id: "pro" })), "pro", true, "active_pro");
expectTier(
  resolveEntitlement(makeSub({ plan_id: "business" })),
  "business",
  true,
  "active_business",
);
expectTier(
  resolveEntitlement(makeSub({ plan_id: "enterprise" })),
  "enterprise",
  true,
  "active_enterprise",
);

// cancel_at_period_end: still-active must NOT lose paid tier
{
  const r = resolveEntitlement(makeSub({ cancel_at_period_end: true }));
  expectTier(r, "pro", true, "cancel_at_period_end (still active)");
  check(r.cancelAtPeriodEnd === true, "cancel_at_period_end flag preserved");
}

// pending → no paid access
{
  const r = resolveEntitlement(makeSub({ status: "pending" }));
  expectTier(r, "free", false, "pending");
  check(r.reason === "PENDING", "pending reason = PENDING");
}

// past_due → no grace period invented → free
{
  const r = resolveEntitlement(makeSub({ status: "past_due" }));
  expectTier(r, "free", false, "past_due");
  check(r.reason === "PAST_DUE", "past_due reason = PAST_DUE");
}

// paused → free (not "currently-active paid access")
{
  const r = resolveEntitlement(makeSub({ status: "paused" }));
  expectTier(r, "free", false, "paused");
  check(r.reason === "PAUSED", "paused reason = PAUSED");
}

// terminal states → no paid access
{
  const rCancelled = resolveEntitlement(makeSub({ status: "cancelled" }));
  expectTier(rCancelled, "free", false, "cancelled (terminal)");
  check(rCancelled.reason === "CANCELLED", "cancelled reason = CANCELLED");

  const rExpired = resolveEntitlement(makeSub({ status: "expired" }));
  expectTier(rExpired, "free", false, "expired (terminal)");
  check(rExpired.reason === "EXPIRED", "expired reason = EXPIRED");
}

// invalid plan → fail closed to free
{
  const r = resolveEntitlement(
    makeSub({ plan_id: "premium" as unknown as BillingPlanId }),
  );
  expectTier(r, "free", false, "invalid_plan");
  check(r.reason === "INVALID_PLAN", "invalid_plan reason = INVALID_PLAN");
}

// unknown status → fail closed to free
{
  const r = resolveEntitlement(
    makeSub({ status: "trialing" as unknown as BillingSubscriptionStatus }),
  );
  expectTier(r, "free", false, "unknown_status");
  check(r.reason === "UNKNOWN_STATUS", "unknown_status reason = UNKNOWN_STATUS");
}

/* ============================ no inference ================================ */

// provider cannot determine tier (same plan_id, different provider)
{
  const a = resolveEntitlement(makeSub({ plan_id: "pro", provider: "stripe" }));
  const b = resolveEntitlement(
    makeSub({ plan_id: "pro", provider: "mercado_pago" }),
  );
  check(a.effectiveTier === b.effectiveTier, "provider-neutral: same tier");
}

// currency cannot determine tier (no amount input exists; currency ignored)
{
  const a = resolveEntitlement(makeSub({ plan_id: "business", currency: "USD" }));
  const b = resolveEntitlement(makeSub({ plan_id: "business", currency: "ARS" }));
  check(
    a.effectiveTier === "business" && b.effectiveTier === "business",
    "currency/amount never determines tier",
  );
}

// providerPlanId / provider_subscription_id cannot determine tier
{
  const a = resolveEntitlement(makeSub({ provider_subscription_id: "sub_1" }));
  const b = resolveEntitlement(makeSub({ provider_subscription_id: "sub_2" }));
  check(
    a.effectiveTier === b.effectiveTier,
    "provider_subscription_id never determines tier",
  );
}

/* ==================== browser / return-state authority ==================== */

// The resolver has a single input (the canonical record). No browser flag or
// provider return state is accepted.
{
  check(
    resolveEntitlement.length === 1,
    "resolver arity = 1 (no browser flag / return state parameter)",
  );
  const r = resolveEntitlement(makeSub({ status: "active", plan_id: "pro" }));
  check(
    !(r instanceof Promise),
    "resolver is synchronous (pure) — no async side channel",
  );
}

/* ============================ determinism ================================= */

{
  const rec = makeSub({ plan_id: "enterprise", cancel_at_period_end: true });
  const a = JSON.stringify(resolveEntitlement(rec));
  const b = JSON.stringify(resolveEntitlement({ ...rec }));
  check(a === b, "deterministic: same input → same result");
}

/* ============================ no writes / no network ====================== */

{
  // The resolver only imports canonical types (const arrays + type-only). It
  // performs no persistence or provider calls; its result is a plain object.
  const r = resolveEntitlement(makeSub());
  check(
    typeof r === "object" && r !== null && !(r instanceof Promise),
    "no DB / provider call — result is a plain synchronous object",
  );
}

/* ============================== summary =================================== */

console.log(`\nEntitlement Resolver Selfcheck: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error("SELFCHECK FAILED");
  process.exitCode = 1;
} else {
  console.log("SELFCHECK PASS");
}

