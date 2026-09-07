/**
 * CRIPQER BILLING — CANONICAL PROVIDER HOST BOUNDARY SELFCHECK V1
 *
 * PURE LOCAL — no network, no database, no provider SDK, no secrets.
 * Exercises the provider boundary contract and registry against trusted
 * in-memory mock adapters only.
 *
 * Run: node src/server/billing/providers.selfcheck.ts
 *
 * Every amount / id / URL below is a TEST FIXTURE — not production data and
 * not provider credentials.
 */

import {
  DEFAULT_PROVIDER_REGISTRY,
  EMPTY_PROVIDER_REGISTRY,
  createProviderRegistry,
  webhookLookupFetchInput,
  type ProviderAdapter,
  type ProviderCancelInput,
  type ProviderChangePlanInput,
  type ProviderCheckoutStatus,
  type ProviderReactivateInput,
  type ProviderRegistry,
  type ProviderSubscriptionSnapshot,
} from "./providers.ts";

import type {
  ProviderSessionAdapter,
  ProviderSessionIntent,
  ProviderSessionResult,
  ResolvedOffer,
} from "./checkout.ts";

import type {
  ProviderResourceFetcher,
  ProviderResourceType,
  WebhookLookupInstruction,
  WebhookVerifier,
} from "./webhooks.ts";

import type { BillingProvider } from "../../lib/billing/billing.types.ts";

// ============================================================
// ASSERTION HELPERS
// ============================================================

let assertions = 0;

function assert(condition: unknown, message: string): asserts condition {
  assertions++;
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

function assertNull(value: unknown, message: string): void {
  assertions++;
  if (value !== null) {
    throw new Error(`ASSERTION FAILED: ${message} (expected null, got ${JSON.stringify(value)})`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assertions++;
  if (actual !== expected) {
    throw new Error(
      `ASSERTION FAILED: ${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
    );
  }
}

// ============================================================
// FIXTURE HELPERS
// ============================================================

function makeOffer(overrides: Partial<ResolvedOffer> = {}): ResolvedOffer {
  return {
    planId: "pro",
    billingInterval: "monthly",
    provider: "stripe",
    currency: "USD",
    amount: 2500,
    providerOfferReference: "stripe_pro_monthly",
    ...overrides,
  };
}

function makeIntent(
  overrides: Partial<ProviderSessionIntent> = {},
): ProviderSessionIntent {
  return {
    checkoutId: "chk_canonical_1",
    offer: makeOffer(),
    userId: "user_trusted_1",
    email: "user@example.com",
    returnUrl: "https://app.example.com/billing?return=1",
    cancelUrl: "https://app.example.com/billing?cancel=1",
    ...overrides,
  };
}


// ============================================================
// MOCK ADAPTER
// ============================================================

interface MockCalls {
  createSession: ProviderSessionIntent[];
  getCheckoutStatus: string[];
  getSubscription: string[];
  changePlan: ProviderChangePlanInput[];
  cancel: ProviderCancelInput[];
  reactivate: ProviderReactivateInput[];
  verify: Array<{ rawBody: string; headers: Record<string, string> }>;
  fetchResource: Array<{
    provider: BillingProvider;
    resourceType: ProviderResourceType;
    resourceId: string;
  }>;
}

function makeMockAdapter(provider: BillingProvider): ProviderAdapter & { calls: MockCalls } {
  const calls: MockCalls = {
    createSession: [],
    getCheckoutStatus: [],
    getSubscription: [],
    changePlan: [],
    cancel: [],
    reactivate: [],
    verify: [],
    fetchResource: [],
  };

  const verifier: WebhookVerifier = {
    verify(rawBody, headers) {
      calls.verify.push({ rawBody, headers });
      return true;
    },
  };

  const fetcher: ProviderResourceFetcher = {
    async fetchResource(p, resourceType, resourceId) {
      calls.fetchResource.push({ provider: p, resourceType, resourceId });
      return { id: resourceId, resourceType };
    },
  };

  const adapter: ProviderAdapter = {
    provider,
    async createSession(intent) {
      calls.createSession.push(intent);
      const providerCheckoutId = `${provider}_chk_${intent.checkoutId}`;
      return {
        providerCheckoutId,
        redirectUrl: `https://provider.test/redirect/${providerCheckoutId}`,
        provider,
      };
    },
    async getCheckoutStatus(providerCheckoutId) {
      calls.getCheckoutStatus.push(providerCheckoutId);
      return {
        providerCheckoutId,
        state: "success",
        providerSubscriptionId: `${provider}_sub_123`,
        requiresAuthoritativeLookup: false,
      };
    },
    async getSubscription(providerSubscriptionId) {
      calls.getSubscription.push(providerSubscriptionId);
      return {
        providerSubscriptionId,
        providerCustomerId: `${provider}_cus_1`,
        providerPlanId: `${provider}_plan_1`,
        billingInterval: "monthly",
        currency: "USD",
        status: "active",
        currentPeriodStart: "2026-01-01T00:00:00.000Z",
        currentPeriodEnd: "2026-02-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        requiresAuthoritativeLookup: false,
      };
    },
    async changePlan(input) {
      calls.changePlan.push(input);
      return {
        providerSubscriptionId: input.providerSubscriptionId,
        providerCustomerId: `${provider}_cus_1`,
        providerPlanId: input.targetOffer.providerOfferReference,
        billingInterval: input.targetOffer.billingInterval,
        currency: input.targetOffer.currency,
        status: "active",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        requiresAuthoritativeLookup: false,
      };
    },
    async cancel(input) {
      calls.cancel.push(input);
      return {
        providerSubscriptionId: input.providerSubscriptionId,
        providerCustomerId: `${provider}_cus_1`,
        providerPlanId: `${provider}_plan_1`,
        billingInterval: "monthly",
        currency: "USD",
        status: "cancelled",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: input.atPeriodEnd ?? true,
        requiresAuthoritativeLookup: false,
      };
    },
    async reactivate(input) {
      calls.reactivate.push(input);
      return {
        providerSubscriptionId: input.providerSubscriptionId,
        providerCustomerId: `${provider}_cus_1`,
        providerPlanId: `${provider}_plan_1`,
        billingInterval: "monthly",
        currency: "USD",
        status: "active",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        requiresAuthoritativeLookup: false,
      };
    },
    verifier,
    fetcher,
  };

  return { ...adapter, calls };
}

// ============================================================
// TEST CASES
// ============================================================

function testRegistryEmptyFailsClosed(): void {
  const reg: ProviderRegistry = EMPTY_PROVIDER_REGISTRY;
  assertNull(reg.getAdapter("stripe"), "empty registry: Stripe unavailable");
  assertNull(reg.getAdapter("mercado_pago"), "empty registry: Mercado Pago unavailable");
  assertNull(reg.getAdapter("paypal"), "empty registry: PayPal unavailable");
  assert(DEFAULT_PROVIDER_REGISTRY.getAdapter("stripe") === null, "default registry has no Stripe adapter");
}

function testRegistryResolution(): void {
  const stripe = makeMockAdapter("stripe");
  const mp = makeMockAdapter("mercado_pago");
  const paypal = makeMockAdapter("paypal");

  const reg = createProviderRegistry({
    stripe,
    mercado_pago: mp,
    paypal,
  });

  assert(reg.getAdapter("stripe") === stripe, "configured Stripe adapter resolves");
  assert(reg.getAdapter("mercado_pago") === mp, "configured Mercado Pago adapter resolves");
  assert(reg.getAdapter("paypal") === paypal, "configured PayPal adapter resolves");
}

function testNoFallback(): void {
  const stripeOnly = createProviderRegistry({ stripe: makeMockAdapter("stripe") });
  assertNull(stripeOnly.getAdapter("paypal"), "missing Stripe does not fallback to PayPal (Stripe-only registry)");
  assertNull(stripeOnly.getAdapter("mercado_pago"), "missing Mercado Pago does not fallback to Stripe (Stripe-only registry)");

  const mpOnly = createProviderRegistry({ mercado_pago: makeMockAdapter("mercado_pago") });
  assertNull(mpOnly.getAdapter("stripe"), "missing Stripe does not fallback to Mercado Pago");
  assertNull(mpOnly.getAdapter("paypal"), "missing PayPal does not fallback to Mercado Pago");
}

async function testCheckoutCompatibility(): Promise<void> {
  const adapter = makeMockAdapter("stripe");

  // Structural: any ProviderAdapter is a valid ProviderSessionAdapter.
  const asSessionAdapter: ProviderSessionAdapter = adapter;

  const intent = makeIntent();
  const result: ProviderSessionResult = await asSessionAdapter.createSession(intent);

  assertEqual(result.provider, "stripe", "provider propagated");
  assert(
    result.providerCheckoutId !== intent.checkoutId,
    "providerCheckoutId distinct from canonical checkoutId",
  );

  const received = adapter.calls.createSession[0];
  assert(received !== undefined, "createSession received an intent");
  assertEqual(received.checkoutId, "chk_canonical_1", "canonical checkoutId propagated");
  assertEqual(received.userId, "user_trusted_1", "trusted userId propagated");
  assertEqual(received.email, "user@example.com", "email propagated");
  assertEqual(received.returnUrl, intent.returnUrl, "server returnUrl propagated");
  assertEqual(received.cancelUrl, intent.cancelUrl, "server cancelUrl propagated");

  // Server-resolved offer passed through unchanged.
  assertEqual(received.offer.amount, 2500, "server ResolvedOffer amount passed unchanged");
  assertEqual(received.offer.currency, "USD", "server ResolvedOffer currency passed unchanged");
  assertEqual(
    received.offer.providerOfferReference,
    "stripe_pro_monthly",
    "server ResolvedOffer reference passed unchanged",
  );
}

function testMoneySecurity(): void {
  const intent = makeIntent();
  const asRecord = intent as unknown as Record<string, unknown>;

  // The session intent carries NO browser price authority.
  assert(!("amount" in asRecord), "no browser amount on session intent");
  assert(!("currency" in asRecord), "no browser currency on session intent");
  assert(!("providerPriceId" in asRecord), "no browser provider price id on session intent");
  assert(!("priceId" in asRecord), "no browser price id on session intent");

  // Money lives only inside the server-resolved offer.
  const offer = intent.offer;
  assertEqual(offer.amount, 2500, "amount sourced only from server offer");
  assertEqual(offer.currency, "USD", "currency sourced only from server offer");
}


async function testWebhookCompatibility(): Promise<void> {
  const adapter = makeMockAdapter("stripe");

  // verifier satisfies the frozen WebhookVerifier seam.
  const verifier: WebhookVerifier = adapter.verifier;
  const verified = await verifier.verify("raw-body", { "stripe-signature": "sig" });
  assertEqual(verified, true, "verifier.verify callable and returns boolean");

  // fetcher satisfies the frozen ProviderResourceFetcher seam.
  const fetcher: ProviderResourceFetcher = adapter.fetcher;
  const resource = await fetcher.fetchResource("stripe", "subscription", "sub_123");
  assert(resource !== undefined, "fetcher.fetchResource callable");

  // WebhookLookupInstruction bridges to fetcher input.
  const lookup: WebhookLookupInstruction = {
    eventId: "evt_1",
    provider: "stripe",
    resourceType: "subscription",
    resourceId: "sub_123",
    occurredAt: "2026-01-01T00:00:00.000Z",
  };
  const args = webhookLookupFetchInput(lookup);
  assert(args !== null, "lookup with resourceId produces fetch args");
  assertEqual(args.resourceType, "subscription", "lookup resourceType propagated");
  assertEqual(args.resourceId, "sub_123", "lookup resourceId propagated");
  assertNull(
    webhookLookupFetchInput({ ...lookup, resourceId: null }),
    "lookup without resourceId fails closed (null)",
  );
}

async function testIdentifierIntegrity(): Promise<void> {
  const adapter = makeMockAdapter("stripe");
  const intent = makeIntent();

  const result = await adapter.createSession(intent);
  const checkout = await adapter.getCheckoutStatus(result.providerCheckoutId);
  const sub = await adapter.getSubscription(checkout.providerSubscriptionId ?? "");

  // canonical checkoutId is not provider checkoutId.
  assert(
    result.providerCheckoutId !== intent.checkoutId,
    "canonical checkoutId distinct from provider checkoutId",
  );
  // provider checkoutId is not provider subscriptionId.
  assert(
    checkout.providerCheckoutId !== checkout.providerSubscriptionId,
    "providerCheckoutId distinct from providerSubscriptionId",
  );
  // provider subscriptionId is not provider customerId.
  assert(
    checkout.providerSubscriptionId !== sub?.providerCustomerId,
    "providerSubscriptionId distinct from providerCustomerId",
  );

  // Sale / invoice ids are fetched under their own resource type, never as
  // a subscription.
  await adapter.fetcher.fetchResource("paypal", "sale", "sale_1");
  await adapter.fetcher.fetchResource("stripe", "invoice", "inv_1");
  const saleCall = adapter.calls.fetchResource.find((c) => c.resourceType === "sale");
  const invoiceCall = adapter.calls.fetchResource.find((c) => c.resourceType === "invoice");
  assert(saleCall !== undefined && saleCall.resourceId === "sale_1", "sale id fetched as sale, not subscription");
  assert(invoiceCall !== undefined && invoiceCall.resourceId === "inv_1", "invoice id fetched as invoice, not subscription");
}

function testUnconfiguredFailsClosed(): void {
  const reg = createProviderRegistry({ stripe: makeMockAdapter("stripe") });
  assertNull(reg.getAdapter("mercado_pago"), "unconfigured Mercado Pago fails closed");
  assertNull(reg.getAdapter("paypal"), "unconfigured PayPal fails closed");
}

async function testPlanChangeContract(): Promise<void> {
  const adapter = makeMockAdapter("mercado_pago");
  const targetOffer: ResolvedOffer = {
    planId: "business",
    billingInterval: "yearly",
    provider: "mercado_pago",
    currency: "USD",
    amount: 5000,
    providerOfferReference: "mp_business_yearly",
  };

  const snap = await adapter.changePlan({
    providerSubscriptionId: "mp_sub_1",
    targetOffer,
  });

  assertEqual(snap.providerSubscriptionId, "mp_sub_1", "changePlan preserves subscription id");
  assertEqual(snap.billingInterval, "yearly", "changePlan applies target interval");
  assertEqual(
    snap.providerPlanId,
    targetOffer.providerOfferReference,
    "changePlan uses server-resolved offer reference",
  );
  assertEqual(adapter.calls.changePlan.length, 1, "changePlan invoked once");
}

async function testManagementContracts(): Promise<void> {
  const adapter = makeMockAdapter("stripe");

  const cancelSnap = await adapter.cancel({
    providerSubscriptionId: "sub_1",
    atPeriodEnd: true,
  });
  assertEqual(cancelSnap.cancelAtPeriodEnd, true, "cancel honors atPeriodEnd semantics");
  assertEqual(cancelSnap.status, "cancelled", "cancel returns cancelled state");

  const reactSnap = await adapter.reactivate({ providerSubscriptionId: "sub_1" });
  assertEqual(reactSnap.status, "active", "reactivate returns active state");
  assertEqual(reactSnap.cancelAtPeriodEnd, false, "reactivate clears scheduled cancellation");

  assertEqual(adapter.calls.cancel.length, 1, "cancel invoked once");
  assertEqual(adapter.calls.reactivate.length, 1, "reactivate invoked once");
}

async function testNoNetwork(): Promise<void> {
  const adapter = makeMockAdapter("stripe");
  const g = globalThis as { fetch?: unknown };
  const originalFetch = g.fetch;
  let called = false;
  g.fetch = () => {
    called = true;
    throw new Error("network call attempted");
  };

  try {
    await adapter.createSession(makeIntent());
    await adapter.getCheckoutStatus("stripe_chk_1");
    await adapter.getSubscription("sub_1");
    await adapter.fetcher.fetchResource("stripe", "subscription", "sub_1");
    await adapter.verifier.verify("body", {});
    assert(!called, "no provider network call was attempted");
  } finally {
    if (originalFetch === undefined) {
      delete g.fetch;
    } else {
      g.fetch = originalFetch;
    }
  }
}


// ============================================================
// RUNNER
// ============================================================

async function run(): Promise<void> {
  const tests: Array<[string, () => void | Promise<void>]> = [
    ["registry_empty_fails_closed", testRegistryEmptyFailsClosed],
    ["registry_resolution", testRegistryResolution],
    ["no_fallback", testNoFallback],
    ["checkout_compatibility", testCheckoutCompatibility],
    ["money_security", testMoneySecurity],
    ["webhook_compatibility", testWebhookCompatibility],
    ["identifier_integrity", testIdentifierIntegrity],
    ["unconfigured_fails_closed", testUnconfiguredFailsClosed],
    ["plan_change_contract", testPlanChangeContract],
    ["management_contracts", testManagementContracts],
    ["no_network", testNoNetwork],
  ];

  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`PASS  ${name}`);
    } catch (err) {
      failed++;
      console.error(`FAIL  ${name}: ${(err as Error).message}`);
    }
  }

  console.log(
    `\nSELFCHECK COMPLETE — ${assertions} assertions, ${tests.length} cases, ${failed} failed`,
  );
  if (failed > 0) {
    throw new Error(`SELFCHECK FAILED: ${failed}/${tests.length} cases failed`);
  }
}

await run();

