/**
 * CRIPQER BILLING — CANONICAL CHECKOUT HOST CORE V1 — SELFCHECK
 *
 * PURE_LOCAL_MOCKED_NO_NETWORK_NO_DB.
 *
 * Exercises the checkout host domain with in-memory mocks only. No provider
 * network call, no database write, no Supabase, no Auth boundary invocation.
 *
 * Run: node src/server/billing/checkout.selfcheck.ts
 */

import {
  createCheckout,
  getCheckoutStatus,
  handleCheckoutReturn,
  startProviderSession,
  markCheckoutPending,
  parseCheckoutRequest,
  isPersistableCheckoutStatus,
  isUiOnlyCheckoutState,
  CheckoutValidationError,
  CheckoutNotFoundError,
  CheckoutOfferUnavailableError,
  type CheckoutHostDeps,
  type CheckoutStore,
  type CheckoutUserSource,
  type BillingCatalogResolver,
  type ProviderSessionAdapter,
  type ProviderSessionIntent,
  type ResolvedOffer,
} from "./checkout.ts";

import type {
  BillingCheckoutRecord,
  BillingCheckoutInput,
} from "../../lib/billing/billing.types.ts";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let passed = 0;

function ok(cond: unknown, label: string): void {
  if (!cond) {
    throw new Error(`SELFCHECK FAIL: ${label}`);
  }
  passed += 1;
}

function expectThrow(
  fn: () => Promise<unknown>,
  errorCtor: new (message: string) => Error,
  label: string,
): Promise<void> {
  return fn().then(
    () => {
      throw new Error(`SELFCHECK FAIL (expected throw): ${label}`);
    },
    (err) => {
      ok(err instanceof errorCtor, `${label} (threw ${errorCtor.name})`);
    },
  );
}

// ---------------------------------------------------------------------------
// Mocks (pure, in-memory)
// ---------------------------------------------------------------------------

function makeUser(userId: string, email: string | null): CheckoutUserSource {
  return { requireUser: async () => ({ userId, email }) };
}

const PRICES: Record<
  string,
  { currency: string; amount: number; providerOfferReference: string }
> = {
  "pro|monthly|stripe": { currency: "USD", amount: 2900, providerOfferReference: "price_pro_monthly_stripe" },
  "business|yearly|mercado_pago": { currency: "USD", amount: 99000, providerOfferReference: "price_business_yearly_mp" },
  "pro|yearly|paypal": { currency: "USD", amount: 29000, providerOfferReference: "price_pro_yearly_paypal" },
};

function makeCatalog(): BillingCatalogResolver {
  return {
    async resolveOffer({ planId, billingInterval, provider }): Promise<ResolvedOffer | null> {
      const p = PRICES[`${planId}|${billingInterval}|${provider}`];
      if (!p) return null;
      return {
        planId,
        billingInterval,
        provider,
        currency: p.currency,
        amount: p.amount,
        providerOfferReference: p.providerOfferReference,
      };
    },
  };
}

function makeStore(): CheckoutStore & { rows: Map<string, BillingCheckoutRecord> } {
  const rows = new Map<string, BillingCheckoutRecord>();
  let seq = 0;
  return {
    rows,
    async createCheckout(input: BillingCheckoutInput): Promise<BillingCheckoutRecord> {
      seq += 1;
      const id = `chk_${seq}`;
      const now = new Date().toISOString();
      const record: BillingCheckoutRecord = { ...input, id, created_at: now, updated_at: now };
      rows.set(id, record);
      return record;
    },
    async getCheckoutForUser(checkoutId: string, userId: string): Promise<BillingCheckoutRecord | null> {
      const r = rows.get(checkoutId);
      if (!r || r.user_id !== userId) return null;
      return r;
    },
    async updateCheckoutStatus(checkoutId: string, userId: string, status): Promise<BillingCheckoutRecord> {
      const r = rows.get(checkoutId);
      if (!r || r.user_id !== userId) throw new Error("Checkout not found for user");
      const updated: BillingCheckoutRecord = { ...r, status, updated_at: new Date().toISOString() };
      rows.set(checkoutId, updated);
      return updated;
    },
  };
}

function makeDeps(
  userId: string,
  email: string | null,
  store: CheckoutStore,
  returnUrl?: string | null,
  cancelUrl?: string | null,
): CheckoutHostDeps {
  return {
    userSource: makeUser(userId, email),
    catalog: makeCatalog(),
    store,
    returnUrl: returnUrl ?? null,
    cancelUrl: cancelUrl ?? null,
  };
}

function makeSessionAdapter(): {
  adapter: ProviderSessionAdapter;
  captured: () => ProviderSessionIntent | null;
} {
  let captured: ProviderSessionIntent | null = null;
  const adapter: ProviderSessionAdapter = {
    async createSession(intent: ProviderSessionIntent) {
      captured = intent;
      return {
        providerCheckoutId: "prov_session_1",
        redirectUrl: "https://provider.example.test/session",
        provider: intent.offer.provider,
      };
    },
  };
  return { adapter, captured: () => captured };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testTrustedUser(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);
  const d = await createCheckout(deps, { planId: "pro", billingInterval: "monthly", provider: "stripe" });
  ok(d.userId === "user_a", "trusted user id becomes checkout owner");
}

async function testForgedUser(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);
  const d = await createCheckout(deps, { planId: "pro", billingInterval: "monthly", provider: "stripe", userId: "evil_user" });
  ok(d.userId === "user_a", "client-supplied userId is ignored");
  ok(d.userId !== "evil_user", "foreign userId never becomes authority");
}

async function testValidCheckouts(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);

  const a = await createCheckout(deps, { planId: "pro", billingInterval: "monthly", provider: "stripe" });
  ok(a.planId === "pro" && a.billingInterval === "monthly" && a.provider === "stripe", "Pro monthly Stripe accepted");
  ok(a.currency === "USD" && a.amount === 2900, "Pro monthly Stripe server price");
  ok(a.status === "processing", "Pro monthly Stripe status=processing");

  const b = await createCheckout(deps, { planId: "business", billingInterval: "yearly", provider: "mercado_pago" });
  ok(b.planId === "business" && b.billingInterval === "yearly" && b.provider === "mercado_pago", "Business yearly Mercado Pago accepted");
  ok(b.amount === 99000, "Business yearly MP server price");

  const c = await createCheckout(deps, { planId: "pro", billingInterval: "yearly", provider: "paypal" });
  ok(c.planId === "pro" && c.billingInterval === "yearly" && c.provider === "paypal", "Pro yearly PayPal accepted");
  ok(c.amount === 29000, "Pro yearly PayPal server price");
}

async function testFreeRejected(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);
  await expectThrow(() => createCheckout(deps, { planId: "free", billingInterval: "monthly", provider: "stripe" }), CheckoutValidationError, "free checkout rejected");
  ok(store.rows.size === 0, "free checkout creates no row");
}

async function testInvalidInputs(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);
  await expectThrow(() => createCheckout(deps, { planId: "agency", billingInterval: "monthly", provider: "stripe" }), CheckoutValidationError, "invalid plan rejected");
  await expectThrow(() => createCheckout(deps, { planId: "pro", billingInterval: "weekly", provider: "stripe" }), CheckoutValidationError, "invalid interval rejected");
  await expectThrow(() => createCheckout(deps, { planId: "pro", billingInterval: "monthly", provider: "cash" }), CheckoutValidationError, "invalid provider rejected");
  await expectThrow(() => createCheckout(deps, { planId: 123, billingInterval: "monthly", provider: "stripe" }), CheckoutValidationError, "non-string plan rejected");
  ok(store.rows.size === 0, "invalid inputs create no rows");
}

async function testOfferUnavailable(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);
  // "enterprise" is a canonical plan id but has no catalog entry -> fail closed.
  await expectThrow(() => createCheckout(deps, { planId: "enterprise", billingInterval: "monthly", provider: "stripe" }), CheckoutOfferUnavailableError, "unknown offer fails closed");
  ok(store.rows.size === 0, "unavailable offer creates no row");
}

async function testClientPriceIgnored(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);
  const d = await createCheckout(deps, {
    planId: "pro",
    billingInterval: "monthly",
    provider: "stripe",
    amount: 1,
    currency: "XYZ",
    providerPriceId: "hacker_price",
  });
  ok(d.amount === 2900, "client amount not authoritative (server amount wins)");
  ok(d.currency === "USD", "client currency not authoritative");
  ok(d.providerOfferReference === "price_pro_monthly_stripe", "client price id not authoritative");
}

async function testDurableId(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);
  const d = await createCheckout(deps, { planId: "pro", billingInterval: "monthly", provider: "stripe" });
  ok(d.checkoutId === "chk_1", "canonical checkout id returned as checkoutId");
  ok(typeof d.checkoutId === "string" && d.checkoutId.length > 0, "checkoutId is a durable opaque string");
}

async function testOwnership(): Promise<void> {
  const store = makeStore();
  const depsA = makeDeps("user_a", "a@example.test", store);
  const created = await createCheckout(depsA, { planId: "pro", billingInterval: "monthly", provider: "stripe" });

  const snap = await getCheckoutStatus(depsA, created.checkoutId);
  ok(snap.checkoutId === created.checkoutId, "owner can fetch own checkout");

  const depsB = makeDeps("user_b", "b@example.test", store);
  await expectThrow(() => getCheckoutStatus(depsB, created.checkoutId), CheckoutNotFoundError, "USER_A checkout not visible to USER_B");
}

async function testReturnFlow(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);
  const created = await createCheckout(deps, { planId: "pro", billingInterval: "monthly", provider: "stripe" });

  // A return URL is only a read-only status query; `success=true` is never
  // accepted as payment authority and never mutates paid state.
  const snap = await handleCheckoutReturn(deps, created.checkoutId);
  ok(snap.status === "processing", "return flow does not activate paid state");
  ok(snap.status !== "success", "return flow never sets success");

  const stored = store.rows.get(created.checkoutId);
  ok(stored !== undefined && stored.status === "processing", "return flow leaves persisted status unchanged");
}

async function testUiStatesNotPersisted(): Promise<void> {
  ok(isPersistableCheckoutStatus("processing") === true, "processing is persistable");
  ok(isPersistableCheckoutStatus("pending") === true, "pending is persistable");
  ok(isPersistableCheckoutStatus("idle") === false, "idle is NOT persistable");
  ok(isPersistableCheckoutStatus("redirecting") === false, "redirecting is NOT persistable");
  ok(isUiOnlyCheckoutState("idle") === true, "idle is a UI-only state");
  ok(isUiOnlyCheckoutState("redirecting") === true, "redirecting is a UI-only state");

  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);
  const d = await createCheckout(deps, { planId: "pro", billingInterval: "monthly", provider: "stripe" });
  ok(d.status === "processing", "createCheckout starts at a canonical status, never idle/redirecting");
  const stored = store.rows.get(d.checkoutId);
  ok(stored !== undefined && isPersistableCheckoutStatus(stored.status), "idle/redirecting never persisted");
}

async function testProviderSessionBoundary(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store, "https://app.example.test/checkout/return", "https://app.example.test/checkout/cancel");
  const created = await createCheckout(deps, { planId: "pro", billingInterval: "monthly", provider: "stripe", amount: 1, currency: "XYZ" });

  const { adapter, captured } = makeSessionAdapter();
  const result = await startProviderSession(deps, created.checkoutId, adapter);

  const intent = captured();
  ok(intent !== null, "adapter invoked with an intent");
  if (intent) {
    ok(intent.offer.amount === 2900, "adapter receives server-resolved amount, not client amount");
    ok(intent.offer.currency === "USD", "adapter receives server-resolved currency");
    ok(intent.offer.planId === "pro" && intent.offer.provider === "stripe", "adapter receives server-validated plan/provider");
    ok(intent.userId === "user_a", "adapter receives trusted user id");
    ok(intent.checkoutId === created.checkoutId, "adapter receives canonical checkout id");
    ok(intent.returnUrl === "https://app.example.test/checkout/return", "adapter receives server return url");
  }
  ok(result.providerCheckoutId === "prov_session_1", "adapter result returned");
  ok(result.provider === "stripe", "adapter result provider matches");
}

async function testMarkPending(): Promise<void> {
  const store = makeStore();
  const deps = makeDeps("user_a", "a@example.test", store);
  const created = await createCheckout(deps, { planId: "pro", billingInterval: "monthly", provider: "stripe" });

  const snap = await markCheckoutPending(deps, created.checkoutId);
  ok(snap.status === "pending", "markCheckoutPending transitions to pending");
  ok(store.rows.get(created.checkoutId)?.status === "pending", "pending persisted canonically");
}

async function testParseStandalone(): Promise<void> {
  const p = parseCheckoutRequest({ planId: "pro", billingInterval: "yearly", provider: "paypal" });
  ok(p.planId === "pro" && p.billingInterval === "yearly" && p.provider === "paypal", "parseCheckoutRequest returns validated triple");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await testTrustedUser();
  await testForgedUser();
  await testValidCheckouts();
  await testFreeRejected();
  await testInvalidInputs();
  await testOfferUnavailable();
  await testClientPriceIgnored();
  await testDurableId();
  await testOwnership();
  await testReturnFlow();
  await testUiStatesNotPersisted();
  await testProviderSessionBoundary();
  await testMarkPending();
  await testParseStandalone();

  console.log(`CHECKOUT SELFCHECK PASS — ${passed}/${passed} assertions`);
}

main().catch((err) => {
  console.error(err);
  // Re-throw so Node exits non-zero on failure (avoids the untyped `process`
  // global under this project's `types: ["vite/client"]` configuration).
  throw err;
});
