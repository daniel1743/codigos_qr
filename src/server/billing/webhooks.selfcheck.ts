/**
 * CRIPQER BILLING V1 — webhook normalization selfcheck (PURE LOCAL).
 *
 * No network, no database, no provider SDK. Verifies the canonical webhook
 * normalization core and the idempotency bridge mapping using mock persistence
 * functions (the real canonical persistence functions are never invoked).
 *
 * Run: `node src/server/billing/webhooks.selfcheck.ts`
 */

import {
  createCanonicalIdempotencyBridge,
  intakePayPalEvent,
  intakeWebhookEvent,
  MERCADO_PAGO_STATUS,
  normalizePayPalEvent,
  normalizeStripeEvent,
  PAYPAL_STATUS,
  safeIso,
  STRIPE_SUBSCRIPTION_STATUS,
} from "./webhooks.ts";
import {
  BILLING_SUBSCRIPTION_STATUSES,
  type BillingEventRecord,
  type SafeBillingDiagnostic,
} from "../../lib/billing/billing.types.ts";

interface Result {
  name: string;
  ok: boolean;
}

const results: Result[] = [];
let failed = 0;

function check(name: string, ok: boolean): void {
  results.push({ name, ok });
  if (!ok) failed += 1;
}

/* -------------------------------- fixtures -------------------------------- */

const stripeSubscriptionEvent = {
  id: "evt_sub_1",
  type: "customer.subscription.updated",
  created: 1700000000,
  data: {
    object: {
      id: "sub_123",
      customer: "cus_123",
      currency: "usd",
      status: "active",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: "price_1", recurring: { interval: "month" } } }] },
    },
  },
};

const stripeInvoiceEvent = {
  id: "evt_inv_1",
  type: "invoice.paid",
  created: 1700000000,
  data: {
    object: {
      id: "in_123",
      customer: "cus_123",
      currency: "usd",
      subscription: "sub_456",
      lines: {
        data: [
          {
            period: { start: 1700000000, end: 1702592000 },
            price: { id: "price_1", recurring: { interval: "month" } },
          },
        ],
      },
    },
  },
};

const stripeInvoiceWithoutSubscription = {
  id: "evt_inv_2",
  type: "invoice.paid",
  created: 1700000000,
  data: { object: { id: "in_789", customer: "cus_123", currency: "usd" } },
};

const mercadoPagoNotification = {
  id: 987654,
  type: "payment",
  action: "payment.created",
  data: { id: "pay_123" },
};

const paypalSaleEvent = {
  id: "WH-sale-1",
  event_type: "PAYMENT.SALE.COMPLETED",
  create_time: "2024-01-01T00:00:00Z",
  resource: { id: "SALE123", amount: { currency: "USD", total: "10.00" } },
};

const paypalSubscriptionEvent = {
  id: "WH-sub-1",
  event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
  create_time: "2024-01-01T00:00:00Z",
  resource: {
    id: "I-SUB-123",
    plan_id: "P-123",
    status: "ACTIVE",
    subscriber: { payer_id: "payer-123" },
  },
};

/* ------------------------------ assertions -------------------------------- */

// 1. Stripe subscription event
{
  const n = normalizeStripeEvent(stripeSubscriptionEvent);
  check("stripe subscription: normalizes", n !== null);
  check("stripe subscription: provider is stripe", n?.provider === "stripe");
  check("stripe subscription: correct subscription id", n?.providerSubscriptionId === "sub_123");
  check("stripe subscription: canonical paid status", n?.status === "active");
  check("stripe subscription: billing interval", n?.billingInterval === "monthly");
}

// 2. Stripe invoice event
{
  const n = normalizeStripeEvent(stripeInvoiceEvent);
  check("stripe invoice: normalizes", n !== null);
  check("stripe invoice: uses subscription reference", n?.providerSubscriptionId === "sub_456");
  check("stripe invoice: invoice id NOT used as subscription id", n?.providerSubscriptionId !== "in_123");
}

// 3. Stripe invoice without subscription reference
{
  const n = normalizeStripeEvent(stripeInvoiceWithoutSubscription);
  check("stripe invoice (no sub): normalizes", n !== null);
  check("stripe invoice (no sub): no subscription id", n?.providerSubscriptionId === null);
  check("stripe invoice (no sub): requires authoritative lookup", n?.requiresAuthoritativeLookup === true);
}

// 4. Mercado Pago thin notification
{
  const intake = intakeWebhookEvent("mercado_pago", mercadoPagoNotification);
  check("mercado pago thin notification -> lookup_required", intake.kind === "lookup_required");
}

// 5. PayPal sale event
{
  const n = normalizePayPalEvent(paypalSaleEvent);
  check("paypal sale: normalizes", n !== null);
  check(
    "paypal sale: sale id NOT used as subscription id",
    n?.providerSubscriptionId === null && n?.providerSubscriptionId !== "SALE123",
  );
  check("paypal sale: requires authoritative lookup", n?.requiresAuthoritativeLookup === true);
  const intake = intakePayPalEvent(paypalSaleEvent);
  check("paypal sale -> lookup_required", intake.kind === "lookup_required");
}

// 6. PayPal subscription event
{
  const n = normalizePayPalEvent(paypalSubscriptionEvent);
  check("paypal subscription: normalizes", n !== null);
  check("paypal subscription: subscription id recognized", n?.providerSubscriptionId === "I-SUB-123");
  check("paypal subscription: canonical paid status", n?.status === "active");
}

// 7. safeIso — never throws, returns null for invalid input
{
  let threw = false;
  try {
    check("safeIso invalid string -> null", safeIso("not-a-date") === null);
    check("safeIso null -> null", safeIso(null) === null);
    check("safeIso undefined -> null", safeIso(undefined) === null);
    check("safeIso empty string -> null", safeIso("") === null);
    check("safeIso NaN -> null", safeIso(Number.NaN) === null);
    check("safeIso object -> null", safeIso({}) === null);
    check("safeIso valid ISO -> non-null", safeIso("2024-01-01T00:00:00Z") !== null);
    check("safeIso unix seconds -> non-null", safeIso(1700000000) !== null);
  } catch {
    threw = true;
  }
  check("safeIso never throws", !threw);
}

// 8. free status is never emitted as a canonical paid subscription status
{
  const canonical: readonly string[] = BILLING_SUBSCRIPTION_STATUSES;
  check("canonical statuses exclude 'free'", !canonical.includes("free"));
  const allMapped: string[] = [
    ...Object.values(STRIPE_SUBSCRIPTION_STATUS),
    ...Object.values(MERCADO_PAGO_STATUS),
    ...Object.values(PAYPAL_STATUS),
  ];
  check("status maps never emit 'free'", !allMapped.includes("free"));
  check(
    "status maps emit only canonical statuses",
    allMapped.every((s) => canonical.includes(s)),
  );
}

/* ----------------------- idempotency bridge mapping ----------------------- */

async function idempotencyChecks(): Promise<void> {
  const eventRecord: BillingEventRecord = {
    id: "mock-id",
    provider: "stripe",
    event_id: "evt_1",
    status: "processed",
    received_at: "2024-01-01T00:00:00.000Z",
    processed_at: "2024-01-01T00:00:01.000Z",
    error_code: null,
    diagnostic_reference: null,
  };

  const order: string[] = [];
  const failedDiagnostics: SafeBillingDiagnostic[] = [];

  const bridge = createCanonicalIdempotencyBridge({
    claimBillingEvent: async (provider, eventId) => {
      order.push(`claim:${provider}:${eventId}`);
      return true;
    },
    markBillingEventProcessed: async (provider, eventId) => {
      order.push(`processed:${provider}:${eventId}`);
      return eventRecord;
    },
    markBillingEventFailed: async (provider, eventId, diagnostic) => {
      order.push(`failed:${provider}:${eventId}`);
      failedDiagnostics.push(diagnostic);
      return eventRecord;
    },
  });

  const claimed = await bridge.claim("stripe", "evt_1");
  await bridge.markProcessed("stripe", "evt_1");
  await bridge.release("stripe", "evt_2");

  check("bridge claim -> claimBillingEvent", claimed === true && order[0] === "claim:stripe:evt_1");
  check("bridge markProcessed -> markBillingEventProcessed", order[1] === "processed:stripe:evt_1");
  check("bridge release -> markBillingEventFailed", order[2] === "failed:stripe:evt_2");
  check("bridge release emits a diagnostic", failedDiagnostics[0]?.error_code === "WEBHOOK_APPLY_FAILED");
}

/* --------------------------------- main ----------------------------------- */

async function main(): Promise<void> {
  await idempotencyChecks();

  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
  }

  const passed = results.length - failed;
  console.log(`\n${passed}/${results.length} checks passed.`);

  if (failed > 0) {
    console.error(`SELFCHECK FAILED: ${failed} failing check(s).`);
    throw new Error(`SELFCHECK FAILED: ${failed} failing check(s).`);
  }
  console.log("SELFCHECK PASSED");
}

void main().catch((err: unknown) => {
  console.error("SELFCHECK ERROR", err);
  // Re-throw so Node exits with a non-zero code (unhandled rejection).
  throw err;
});


