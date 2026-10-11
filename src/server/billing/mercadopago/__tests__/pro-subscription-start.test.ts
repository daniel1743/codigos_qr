import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BillingSubscriptionRecord,
  NormalizedSubscriptionInput,
} from "../../../../lib/billing/billing.types";
import { applyNormalizedEvent, type ApplicationStore } from "../../application";
import { resolveEntitlement } from "../../entitlements";
import type { NormalizedBillingEvent } from "../../webhooks";
import {
  createMercadoPagoClient,
  MercadoPagoError,
  readMercadoPagoConfigFromEnv,
  type MercadoPagoWriteClient,
} from "../client";
import { createMercadoPagoPlanResolver } from "../plan";
import {
  buildProSubscriptionOwnership,
  createCriticalPreapprovalLogSink,
  createProSubscriptionStartHandler,
  PRO_SUBSCRIPTION_START_METHOD,
  type ProSubscriptionStartDeps,
  type ProSubscriptionStartDiagnostic,
  resolveMercadoPagoProOffer,
  startProSubscription,
} from "../pro-subscription-start";

/**
 * MP-M3C · START A PRO SUBSCRIPTION — the sequenced flow and its handler.
 *
 * The property under test is ORDER, not features. A Cripqer PRO subscription may
 * only exist for a user whose ownership correlation was written first, so the
 * tests below assert three things the directive makes non-negotiable:
 *
 *   1. the identity, the price and the plan come from the SERVER — the request
 *      body is never read, so nothing the browser sends can reach Mercado Pago;
 *   2. no checkout URL is ever handed over unless the correlation row is
 *      actually persisted, verified field by field;
 *   3. when the provider creates a subscription and the correlation cannot be
 *      written, the outcome is the critical classified state — never a retry,
 *      never a Pro grant, never a fake local row.
 *
 * The canonical cores are exercised for real: `applyNormalizedEvent` proves the
 * pending correlation resolves an OWNER, and `resolveEntitlement` proves the same
 * row grants NOTHING. Both run over doubles here, and the doubles call nothing.
 *
 * Global fetch is a landmine for the whole file: no test in MP-M3C can create a
 * real subscription.
 */

const NOW = "2026-10-22T00:00:00.000Z";
const USER_ID = "user_1";
const SESSION_EMAIL = "user@example.com";
const PLAN_ID = "2c938084726fca480172750000000000";
const SUBSCRIPTION_ID = "SUB1";
const CHECKOUT_URL = `https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=${SUBSCRIPTION_ID}`;
const TOKEN_SENTINEL = "TEST_TOKEN_SENTINEL_must_not_leak";
const SECRET_SENTINEL = "TEST_SECRET_SENTINEL_must_not_leak";

let realFetch: typeof fetch;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  realFetch = globalThis.fetch;
  fetchSpy = vi.fn(async () => {
    throw new Error("MP-M3C tests must never touch the network");
  });
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

/* ================================ harness ================================ */

interface HarnessOptions {
  /** `undefined` → the session has the default email; `null` → no email at all. */
  email?: string | null;
  proPlanId?: string | null;
  /** A row the canonical live-subscription lookup already finds. */
  liveSubscription?: BillingSubscriptionRecord | null;
  /** What the provider answers with. `null` means "throw the provider error". */
  providerResponse?: unknown;
  providerError?: MercadoPagoError | null;
  /** Raised by the ownership write, as a unique-index violation would be. */
  writeError?: Error | null;
  /** A row the write returns that is NOT the correlation this flow intended. */
  writeReturns?: BillingSubscriptionRecord | null;
  /** Raised by the identity seam. */
  sessionError?: Error | null;
  sinkThrows?: boolean;
  backUrl?: string | null;
  /** Inject a different client — used for the real no-token refusal. */
  client?: MercadoPagoWriteClient;
}

interface HarnessState {
  calls: string[];
  posts: Array<{ path: string; body: unknown }>;
  writes: NormalizedSubscriptionInput[];
  diagnostics: ProSubscriptionStartDiagnostic[];
  /** What the canonical "live subscription for this user" lookup would return. */
  live: BillingSubscriptionRecord | null;
}

function rowFrom(input: NormalizedSubscriptionInput): BillingSubscriptionRecord {
  return { ...input, id: "sub_1", created_at: NOW, updated_at: NOW };
}

function makeHarness(options: HarnessOptions = {}) {
  const state: HarnessState = {
    calls: [],
    posts: [],
    writes: [],
    diagnostics: [],
    live: options.liveSubscription ?? null,
  };

  const postJson = vi.fn(async (path: string, body: unknown): Promise<unknown> => {
    state.calls.push(`postJson:${path}`);
    state.posts.push({ path, body });
    if (options.providerError) throw options.providerError;
    return options.providerResponse === undefined
      ? {
          id: SUBSCRIPTION_ID,
          status: "pending",
          preapproval_plan_id: PLAN_ID,
          init_point: CHECKOUT_URL,
        }
      : options.providerResponse;
  });

  const getJson = vi.fn(async () => {
    throw new Error("the start flow must never read from the provider");
  });

  const client: MercadoPagoWriteClient = options.client ?? { getJson, postJson };

  const deps: ProSubscriptionStartDeps = {
    userSource: {
      async requireUser() {
        state.calls.push("requireUser");
        if (options.sessionError) throw options.sessionError;
        return {
          userId: USER_ID,
          email: options.email === undefined ? SESSION_EMAIL : options.email,
        };
      },
    },
    config: {
      proPlanId: options.proPlanId === undefined ? PLAN_ID : options.proPlanId,
      backUrl: options.backUrl ?? null,
    },
    client,
    store: {
      async getLiveSubscriptionForUser(userId: string) {
        state.calls.push(`getLiveSubscriptionForUser:${userId}`);
        return state.live;
      },
      async upsertNormalizedSubscription(input: NormalizedSubscriptionInput) {
        state.calls.push("upsertNormalizedSubscription");
        state.writes.push(input);
        if (options.writeError) throw options.writeError;
        if (options.writeReturns !== undefined) {
          // A store that answers with the wrong row — or with nothing — is
          // modelled here, cast and all, because the flow must refuse to hand
          // over a URL on the strength of a write it cannot verify.
          return options.writeReturns as unknown as BillingSubscriptionRecord;
        }
        // The real database now holds a live row for this user — which is what
        // makes a second invocation hit the duplicate guard.
        const stored = rowFrom(input);
        state.live = stored;
        return stored;
      },
    },
    onDiagnostic: (diagnostic) => {
      state.diagnostics.push(diagnostic);
      if (options.sinkThrows) throw new Error("sink exploded");
    },
  };

  return {
    deps,
    state,
    postJson,
    handler: createProSubscriptionStartHandler(deps),
    request: (init: RequestInit = {}) =>
      new Request("https://cripqer.test/api/billing/mercadopago/start-pro", {
        method: PRO_SUBSCRIPTION_START_METHOD,
        ...init,
      }),
  };
}

/** The exact provider body the live request must carry. */
const EXPECTED_PROVIDER_BODY = { preapproval_plan_id: PLAN_ID, payer_email: SESSION_EMAIL };

function billingUnauthorized(): Error {
  const error = new Error("Authentication is required.");
  error.name = "BillingUnauthorizedError";
  (error as Error & { code: string }).code = "BILLING_UNAUTHORIZED";
  return error;
}

async function bodyOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

/* Indexed reads, each with the assertion that has to hold for it to be valid. */

function firstPost(state: HarnessState): { path: string; body: unknown } {
  const post = state.posts[0];
  if (post === undefined) throw new Error("expected exactly one provider call");
  return post;
}

function firstWrite(state: HarnessState): NormalizedSubscriptionInput {
  const write = state.writes[0];
  if (write === undefined) throw new Error("expected exactly one correlation write");
  return write;
}

function firstDiagnostic(state: HarnessState): ProSubscriptionStartDiagnostic {
  const diagnostic = state.diagnostics[0];
  if (diagnostic === undefined) throw new Error("expected a diagnostic to be emitted");
  return diagnostic;
}

/* ============================== 1 · identity ============================== */

describe("MP-M3C · start · the session is the only identity", () => {
  it("1) requires an authenticated user: 401 and zero effects", async () => {
    const { handler, state, postJson, request } = makeHarness({
      sessionError: billingUnauthorized(),
    });

    const response = await handler(request());

    expect(response.status).toBe(401);
    expect(await bodyOf(response)).toEqual({ status: "UNAUTHENTICATED" });
    expect(postJson).not.toHaveBeenCalled();
    expect(state.writes).toEqual([]);
    // Not even the duplicate lookup runs: an unauthenticated caller never
    // reaches a step that touches Mercado Pago or persistence.
    expect(state.calls).toEqual(["requireUser"]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("1b) recognises the canonical auth failure structurally, and still classifies anything else as internal", async () => {
    const canonical = makeHarness({ sessionError: billingUnauthorized() });
    expect((await canonical.handler(canonical.request())).status).toBe(401);

    const unexpected = makeHarness({ sessionError: new Error("db exploded") });
    const response = await unexpected.handler(unexpected.request());
    expect(response.status).toBe(500);
    expect(await bodyOf(response)).toEqual({ status: "INTERNAL_ERROR" });
    expect(unexpected.postJson).not.toHaveBeenCalled();
  });

  it("2) the browser cannot choose the owner: a hostile body changes nothing", async () => {
    const hostile = {
      user_id: "user_attacker",
      payer_email: "attacker@evil.test",
      plan_id: "business",
      planId: "enterprise",
      amount: 1,
      currency: "USD",
      frequency: 12,
      free_trial: 0,
      status: "authorized",
      provider: "paypal",
      provider_subscription_id: "SUB_ATTACKER",
    };
    const { handler, state, postJson, request } = makeHarness();

    const response = await handler(
      request({
        headers: { "content-type": "application/json" },
        body: JSON.stringify(hostile),
      }),
    );

    expect(response.status).toBe(200);
    // Mercado Pago receives the session's email and the configured plan, and
    // nothing the caller sent.
    expect(postJson).toHaveBeenCalledTimes(1);
    const sent = firstPost(state).body;
    expect(sent).toEqual(EXPECTED_PROVIDER_BODY);
    expect(JSON.stringify(sent)).not.toContain("attacker");
    expect(JSON.stringify(sent)).not.toContain("USD");
    // The correlation belongs to the authenticated user.
    expect(firstWrite(state).user_id).toBe(USER_ID);
    expect(firstWrite(state).plan_id).toBe("pro");
  });

  it("2b) the flow has nowhere to receive a request at all", () => {
    // The canonical flow takes dependencies and nothing else: there is no
    // parameter for a body, a query or a header, so `?user_id=…` cannot reach it
    // even by mistake.
    expect(startProSubscription.length).toBe(1);
  });

  it("2c) the server resolves the offer from the frozen contract, never from a caller", () => {
    const offer = resolveMercadoPagoProOffer({ proPlanId: PLAN_ID });

    expect(offer).toEqual({
      planId: "pro",
      billingInterval: "monthly",
      provider: "mercado_pago",
      currency: "CLP",
      amount: 7990,
      providerOfferReference: PLAN_ID,
    });
  });

  it("2d) the plan id used to create the subscription is the one the webhook will map back to PRO", () => {
    const resolver = createMercadoPagoPlanResolver({ proPlanId: PLAN_ID });

    expect(resolver.resolvePlan("mercado_pago", PLAN_ID)).toBe("pro");
    expect(resolver.resolvePlan("mercado_pago", "PLAN_OTHER")).toBeNull();
  });
});

/* ============================ 2 · configuration ========================== */

describe("MP-M3C · start · configuration fails closed", () => {
  it("3) refuses before the POST when MERCADOPAGO_PRO_PLAN_ID is missing", async () => {
    for (const proPlanId of [null, "", "   "]) {
      const { handler, state, postJson, request } = makeHarness({ proPlanId });

      const response = await handler(request());

      expect(response.status).toBe(500);
      expect(await bodyOf(response)).toEqual({ status: "UNCONFIGURED" });
      expect(postJson).not.toHaveBeenCalled();
      expect(state.writes).toEqual([]);
      expect(resolveMercadoPagoProOffer({ proPlanId })).toBeNull();
    }
  });

  it("3b) refuses before the POST when MERCADOPAGO_ACCESS_TOKEN is missing", async () => {
    // The REAL client over an environment with a plan id but no token.
    const client = createMercadoPagoClient(
      readMercadoPagoConfigFromEnv({ MERCADOPAGO_PRO_PLAN_ID: PLAN_ID }),
    );
    const { handler, state, request } = makeHarness({ client });

    const response = await handler(request());

    expect(response.status).toBe(502);
    expect(await bodyOf(response)).toEqual({ status: "PROVIDER_ERROR" });
    // A missing token is refused before any request leaves the process.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.writes).toEqual([]);
    expect(state.diagnostics).toEqual([
      { status: "PROVIDER_ERROR", httpStatus: 502, providerErrorCode: "MISSING_ACCESS_TOKEN" },
    ]);
  });
});

/* ============================== 3 · payer email =========================== */

describe("MP-M3C · start · the payer identity must exist", () => {
  it("4) refuses when the session carries no email, without sending an empty one", async () => {
    for (const email of [null, "", "   "]) {
      const { handler, state, postJson, request } = makeHarness({ email });

      const response = await handler(request());

      expect(response.status).toBe(422);
      expect(await bodyOf(response)).toEqual({ status: "PAYER_EMAIL_REQUIRED" });
      expect(postJson).not.toHaveBeenCalled();
      expect(state.writes).toEqual([]);
    }
  });
});

/* ============================= 4 · anti-duplicate ========================= */

describe("MP-M3C · start · duplicate protection", () => {
  const LIVE: BillingSubscriptionRecord = {
    id: "sub_live",
    user_id: USER_ID,
    plan_id: "pro",
    provider: "mercado_pago",
    billing_customer_id: null,
    provider_customer_id: null,
    provider_subscription_id: "SUB_LIVE",
    billing_interval: "monthly",
    currency: "CLP",
    status: "pending",
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    payment_method_label: null,
    created_at: NOW,
    updated_at: NOW,
  };

  it("5) a live subscription blocks a second start before anything is sent", async () => {
    const { handler, state, postJson, request } = makeHarness({ liveSubscription: LIVE });

    const response = await handler(request());

    expect(response.status).toBe(409);
    expect(await bodyOf(response)).toEqual({ status: "ALREADY_IN_PROGRESS" });
    expect(postJson).not.toHaveBeenCalled();
    expect(state.writes).toEqual([]);
  });

  it("5b) the duplicate guard runs BEFORE the provider call", async () => {
    const { handler, state, request } = makeHarness();

    await handler(request());

    const guard = state.calls.indexOf(`getLiveSubscriptionForUser:${USER_ID}`);
    const post = state.calls.indexOf("postJson:/preapproval");
    expect(guard).toBeGreaterThan(-1);
    expect(post).toBeGreaterThan(guard);
  });

  it("6) two clicks create ONE subscription: the second is refused as in progress", async () => {
    const { handler, state, postJson, request } = makeHarness();

    const first = await handler(request());
    const second = await handler(request());

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(await bodyOf(second)).toEqual({ status: "ALREADY_IN_PROGRESS" });
    // The whole point: one provider call, one correlation row.
    expect(postJson).toHaveBeenCalledTimes(1);
    expect(state.posts).toHaveLength(1);
    expect(state.writes).toHaveLength(1);
  });

  it("6b) the guard is the canonical live-status lookup, reusing no second implementation", async () => {
    const source = stripComments(readFileSync(SOURCE_PATH, "utf8"));

    // `getCanonicalSubscriptionForUser` is the canonical lookup whose SQL filters
    // to the live statuses — the same set the partial unique index enforces — so
    // "already in progress" has one definition in the codebase, not two.
    expect(source).toContain("persistence.getCanonicalSubscriptionForUser(userId)");
    expect(source).not.toContain('"cancelled"');
    expect(source).not.toContain('"expired"');
  });

  it("6c) losing the race to the unique index fails closed instead of clobbering", async () => {
    const violation = new Error("duplicate key value violates unique constraint");
    (violation as Error & { code: string }).code = "23505";
    const { handler, state, postJson, request } = makeHarness({ writeError: violation });

    const response = await handler(request());

    expect(response.status).toBe(500);
    expect(await bodyOf(response)).toEqual({
      status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
    });
    expect(postJson).toHaveBeenCalledTimes(1);
    expect(state.writes).toHaveLength(1);
    expect(firstDiagnostic(state).reason).toBe("OWNERSHIP_WRITE_FAILED");
  });

  it("6d) no idempotency guarantee is invented: the flow makes exactly one provider call per invocation", async () => {
    const { handler, postJson, request } = makeHarness({
      providerError: new MercadoPagoError("HTTP_ERROR", "HTTP 500.", 500),
    });

    await handler(request());

    // No retry, no backoff, no second attempt — a retry would create a second
    // subscription, because Mercado Pago documents no idempotency key here.
    expect(postJson).toHaveBeenCalledTimes(1);
  });
});

/* ============================== 5 · provider ============================== */

describe("MP-M3C · start · the provider call", () => {
  it("7) posts the plan subscription body to the documented path, once", async () => {
    const { handler, state, postJson, request } = makeHarness();

    await handler(request());

    expect(postJson).toHaveBeenCalledTimes(1);
    expect(state.posts.map((p) => p.path)).toEqual(["/preapproval"]);
    expect(firstPost(state).body).toEqual(EXPECTED_PROVIDER_BODY);
  });

  it("7b) never sends a status, a card token, an amount or a provider reference", async () => {
    const { handler, state, request } = makeHarness();

    await handler(request());

    expect(Object.keys(firstPost(state).body as object).sort()).toEqual([
      "payer_email",
      "preapproval_plan_id",
    ]);
  });

  it("7c) forwards no return URL unless one is configured", async () => {
    const withoutBackUrl = makeHarness();
    await withoutBackUrl.handler(withoutBackUrl.request());
    expect(firstPost(withoutBackUrl.state).body).toEqual(EXPECTED_PROVIDER_BODY);

    const withBackUrl = makeHarness({ backUrl: "https://cripqer.test/suscripcion" });
    await withBackUrl.handler(withBackUrl.request());
    expect(firstPost(withBackUrl.state).body).toEqual({
      ...EXPECTED_PROVIDER_BODY,
      back_url: "https://cripqer.test/suscripcion",
    });
  });

  it("8) a provider rejection persists nothing and invents no local subscription", async () => {
    for (const failure of [
      new MercadoPagoError("UNAUTHORIZED", "credentials rejected", 401),
      new MercadoPagoError("HTTP_ERROR", "Mercado Pago responded with HTTP 500.", 500),
      new MercadoPagoError("TIMEOUT", "Mercado Pago request timed out after 8000ms."),
      new MercadoPagoError("NETWORK_ERROR", "failed before a response"),
    ]) {
      const { handler, state, request } = makeHarness({ providerError: failure });

      const response = await handler(request());

      expect(response.status).toBe(502);
      expect(await bodyOf(response)).toEqual({ status: "PROVIDER_ERROR" });
      expect(state.writes).toEqual([]);
      expect(state.diagnostics).toEqual([
        { status: "PROVIDER_ERROR", httpStatus: 502, providerErrorCode: failure.code },
      ]);
    }
  });

  it("9) a malformed provider response fails closed with the critical classification", async () => {
    for (const providerResponse of [{}, { status: "pending" }, null, 42, "text"]) {
      const { handler, state, request } = makeHarness({ providerResponse });

      const response = await handler(request());

      expect(response.status).toBe(500);
      expect(await bodyOf(response)).toEqual({
        status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
      });
      expect(firstDiagnostic(state).reason).toBe("PREAPPROVAL_RESPONSE_UNUSABLE");
      expect(firstDiagnostic(state).preapprovalId).toBeNull();
      // Nothing was persisted, because there is no id to correlate.
      expect(state.writes).toEqual([]);
    }
  });

  it("9b) an id without a usable checkout URL keeps the id for recovery and writes nothing", async () => {
    const { handler, state, request } = makeHarness({
      providerResponse: { id: SUBSCRIPTION_ID, status: "pending" },
    });

    const response = await handler(request());

    expect(response.status).toBe(500);
    expect(firstDiagnostic(state)).toMatchObject({
      status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
      reason: "PREAPPROVAL_RESPONSE_UNUSABLE",
      preapprovalId: SUBSCRIPTION_ID,
      userId: USER_ID,
    });
    expect(state.writes).toEqual([]);
  });

  it("9c) a refused checkout URL is not handed to a browser", async () => {
    for (const initPoint of ["http://mercadopago.test/x", "javascript:alert(1)", "/relative"]) {
      const { handler, state, request } = makeHarness({
        providerResponse: { id: SUBSCRIPTION_ID, init_point: initPoint },
      });

      const response = await handler(request());

      expect(response.status).toBe(500);
      expect(JSON.stringify(await bodyOf(response))).not.toContain(initPoint);
      expect(state.writes).toEqual([]);
    }
  });
});

/* ============================= 6 · correlation ============================ */

describe("MP-M3C · start · the ownership correlation", () => {
  it("10) writes the correlation for the authenticated user with the real provider ids", async () => {
    const { handler, state, request } = makeHarness();

    await handler(request());

    expect(state.writes).toEqual([
      {
        user_id: USER_ID,
        plan_id: "pro",
        provider: "mercado_pago",
        billing_customer_id: null,
        provider_customer_id: null,
        // The REAL id Mercado Pago returned — not a plan id, not a guess.
        provider_subscription_id: SUBSCRIPTION_ID,
        billing_interval: "monthly",
        currency: "CLP",
        status: "pending",
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        payment_method_label: null,
      },
    ]);
  });

  it("10b) writes the correlation BEFORE it returns the checkout URL", async () => {
    const { handler, state, request } = makeHarness();

    const response = await handler(request());

    expect(response.status).toBe(200);
    const write = state.calls.indexOf("upsertNormalizedSubscription");
    expect(write).toBeGreaterThan(-1);
    expect(state.writes).toHaveLength(1);
    expect((await bodyOf(response))["redirectUrl"]).toBe(CHECKOUT_URL);
  });

  it("11) the persisted row proves the OWNER through the real application core", async () => {
    const { handler, state, request } = makeHarness();
    await handler(request());

    const persisted = rowFrom(firstWrite(state));

    // The canonical store the webhook pipeline uses, holding exactly the row
    // this flow wrote.
    const store: ApplicationStore = {
      async getSubscriptionByProviderId(provider, providerSubscriptionId) {
        return provider === "mercado_pago" && providerSubscriptionId === SUBSCRIPTION_ID
          ? persisted
          : null;
      },
      async upsertNormalizedSubscription(input) {
        return rowFrom(input);
      },
      async getBillingCustomer() {
        return null;
      },
      async upsertBillingCustomer(input) {
        return { id: "customer_1", ...input, created_at: NOW, updated_at: NOW };
      },
    };

    const event: NormalizedBillingEvent = {
      eventId: "evt_1",
      provider: "mercado_pago",
      type: "SUBSCRIPTION_UPDATED",
      occurredAt: NOW,
      providerCustomerId: null,
      providerSubscriptionId: SUBSCRIPTION_ID,
      providerPlanId: PLAN_ID,
      billingInterval: "monthly",
      currency: "CLP",
      status: "pending",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      requiresAuthoritativeLookup: false,
    };

    const applied = await applyNormalizedEvent(
      { store, planResolver: createMercadoPagoPlanResolver({ proPlanId: PLAN_ID }) },
      event,
    );

    expect(applied.status).toBe("APPLIED");
    expect(applied.userId).toBe(USER_ID);
    expect(applied.providerSubscriptionId).toBe(SUBSCRIPTION_ID);
  });

  it("11b) without the correlation the very same event has NO owner", async () => {
    const store: ApplicationStore = {
      async getSubscriptionByProviderId() {
        return null;
      },
      async upsertNormalizedSubscription(input) {
        return rowFrom(input);
      },
      async getBillingCustomer() {
        return null;
      },
      async upsertBillingCustomer(input) {
        return { id: "customer_1", ...input, created_at: NOW, updated_at: NOW };
      },
    };

    const applied = await applyNormalizedEvent(
      { store, planResolver: createMercadoPagoPlanResolver({ proPlanId: PLAN_ID }) },
      {
        eventId: "evt_1",
        provider: "mercado_pago",
        type: "SUBSCRIPTION_UPDATED",
        occurredAt: NOW,
        providerCustomerId: null,
        providerSubscriptionId: SUBSCRIPTION_ID,
        providerPlanId: PLAN_ID,
        billingInterval: "monthly",
        currency: "CLP",
        status: "pending",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        requiresAuthoritativeLookup: false,
      },
    );

    // The correlation is what makes the webhook able to attribute the
    // subscription; before it exists, the event fails closed.
    expect(applied.status).toBe("OWNER_REQUIRED");
    expect(applied.userId).toBeNull();
  });

  it("12) the pending correlation grants NO Pro", async () => {
    const { handler, state, request } = makeHarness();
    await handler(request());

    const entitlement = resolveEntitlement(rowFrom(firstWrite(state)));

    expect(entitlement.effectiveTier).toBe("free");
    expect(entitlement.hasPaidAccess).toBe(false);
    expect(entitlement.canonicalPlanId).toBeNull();
    expect(entitlement.subscriptionStatus).toBe("pending");
    expect(entitlement.reason).toBe("PENDING");
  });

  it("12b) and the flow itself never touches entitlement state", async () => {
    const source = stripComments(readFileSync(SOURCE_PATH, "utf8"));

    expect(source).not.toContain("grants");
    expect(source).not.toContain("entitlement");
    expect(source).not.toContain('status: "active"');
    // One writer, and it is the canonical one.
    expect(source).toContain("upsertNormalizedSubscription");
    expect(source).not.toContain("insert into");
    expect(source).not.toContain(".from(");
    expect(source).not.toContain("fetch(");
  });

  it("13) a write that does not produce THIS correlation is refused, whatever it returned", async () => {
    const offer = resolveMercadoPagoProOffer({ proPlanId: PLAN_ID });
    if (offer === null) throw new Error("the PRO offer must resolve for this test");

    const correlation = rowFrom(
      buildProSubscriptionOwnership({
        userId: USER_ID,
        offer,
        providerSubscriptionId: SUBSCRIPTION_ID,
      }),
    );

    const wrongRows: BillingSubscriptionRecord[] = [
      // Same subscription, different owner.
      { ...correlation, user_id: "user_other" },
      // Same owner, different subscription.
      { ...correlation, provider_subscription_id: "SUB_OTHER" },
      // Same owner, different provider.
      { ...correlation, provider: "paypal" },
      // The right row, already dead: handing over a checkout URL for a
      // cancelled subscription would be worse than refusing.
      { ...correlation, status: "cancelled" },
      { ...correlation, status: "expired" },
      // Not a canonical status at all.
      { ...correlation, status: "totally_pending" as BillingSubscriptionRecord["status"] },
      // No row came back.
      null,
    ] as BillingSubscriptionRecord[];

    for (const writeReturns of wrongRows) {
      const { handler, state, request } = makeHarness({ writeReturns });

      const response = await handler(request());

      expect(response.status).toBe(500);
      expect(await bodyOf(response)).toEqual({
        status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
      });
      const diagnostic = firstDiagnostic(state);
      expect(diagnostic.reason).toBe("OWNERSHIP_WRITE_FAILED");
      expect(diagnostic.preapprovalId).toBe(SUBSCRIPTION_ID);
      expect(diagnostic.userId).toBe(USER_ID);
    }
  });

  it("14) the buildProSubscriptionOwnership shape is the canonical pending correlation", () => {
    const offer = resolveMercadoPagoProOffer({ proPlanId: PLAN_ID });
    expect(offer).not.toBeNull();

    const correlation = buildProSubscriptionOwnership({
      userId: USER_ID,
      offer: offer!,
      providerSubscriptionId: SUBSCRIPTION_ID,
    });

    expect(correlation.status).toBe("pending");
    expect(Object.keys(correlation).sort()).toEqual([
      "billing_customer_id",
      "billing_interval",
      "cancel_at_period_end",
      "currency",
      "current_period_end",
      "current_period_start",
      "payment_method_label",
      "plan_id",
      "provider",
      "provider_customer_id",
      "provider_subscription_id",
      "status",
      "user_id",
    ]);
  });
});

/* ============================ 7 · response hygiene ======================== */

describe("MP-M3C · start · the response carries nothing but the minimum", () => {
  it("15) the body is a status, plus the checkout URL only when ready", async () => {
    const ready = makeHarness();
    const readyBody = await bodyOf(await ready.handler(ready.request()));
    expect(Object.keys(readyBody).sort()).toEqual(["redirectUrl", "status"]);
    expect(readyBody).toEqual({ status: "READY", redirectUrl: CHECKOUT_URL });

    for (const options of [
      { proPlanId: null },
      { email: null },
      { liveSubscription: null, providerError: new MercadoPagoError("HTTP_ERROR", "x", 500) },
      { writeError: new Error("boom") },
      { providerResponse: {} },
    ] as HarnessOptions[]) {
      const { handler, request } = makeHarness(options);
      const body = await bodyOf(await handler(request()));

      expect(Object.keys(body).sort()).toEqual(["status"]);
      for (const leaked of [SUBSCRIPTION_ID, USER_ID, PLAN_ID, TOKEN_SENTINEL]) {
        expect(JSON.stringify(body)).not.toContain(leaked);
      }
    }
  });

  it("15b) no secret, no token and no provider payload can reach the response", async () => {
    const marker = "PROVIDER_BODY_MARKER_must_not_surface";
    const { handler, request } = makeHarness({
      providerError: new MercadoPagoError(
        "HTTP_ERROR",
        `Mercado Pago responded with HTTP 500. ${TOKEN_SENTINEL} ${SECRET_SENTINEL} ${marker}`,
        500,
      ),
    });

    const response = await handler(request());
    const text = JSON.stringify(await bodyOf(response));

    for (const forbidden of [TOKEN_SENTINEL, SECRET_SENTINEL, marker, "Authorization", "Bearer"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("15c) responses are not cacheable", async () => {
    const { handler, request } = makeHarness();

    const response = await handler(request());

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("16) tokens and secrets never reach the diagnostics or the log", async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    });

    // Every outcome, including the critical one, with sentinel-bearing errors.
    const happy = makeHarness();
    await happy.handler(happy.request());

    const critical = makeHarness({
      writeError: new Error(`${TOKEN_SENTINEL} ${SECRET_SENTINEL}`),
    });
    await critical.handler(critical.request());

    const refused = makeHarness({
      providerError: new MercadoPagoError(
        "HTTP_ERROR",
        `HTTP 500 ${TOKEN_SENTINEL} ${SECRET_SENTINEL}`,
        500,
      ),
    });
    await refused.handler(refused.request());

    for (const diagnostic of [
      ...happy.state.diagnostics,
      ...critical.state.diagnostics,
      ...refused.state.diagnostics,
    ]) {
      const text = JSON.stringify(diagnostic);
      for (const forbidden of [TOKEN_SENTINEL, SECRET_SENTINEL, "Bearer"]) {
        expect(text).not.toContain(forbidden);
      }
    }

    // The production sink's own output is built from named fields, so nothing
    // a diagnostic carried elsewhere can ride along.
    const sink = createCriticalPreapprovalLogSink((line) => lines.push(line));
    sink({
      status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
      httpStatus: 500,
      reason: "OWNERSHIP_WRITE_FAILED",
      preapprovalId: SUBSCRIPTION_ID,
      userId: USER_ID,
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(SUBSCRIPTION_ID);
    expect(lines[0]).toContain(USER_ID);
    expect(lines[0]).toContain("REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED");
    for (const forbidden of [TOKEN_SENTINEL, SECRET_SENTINEL, "Bearer", "Authorization"]) {
      expect(lines[0]).not.toContain(forbidden);
    }

    spy.mockRestore();
  });

  it("16b) only the critical state is worth a log line", () => {
    const lines: string[] = [];
    const sink = createCriticalPreapprovalLogSink((line) => lines.push(line));

    for (const status of [
      "READY",
      "UNCONFIGURED",
      "PAYER_EMAIL_REQUIRED",
      "ALREADY_IN_PROGRESS",
      "PROVIDER_ERROR",
      "UNAUTHENTICATED",
      "METHOD_NOT_ALLOWED",
      "INTERNAL_ERROR",
    ] as const) {
      sink({ status, httpStatus: 200 });
    }
    expect(lines).toEqual([]);

    sink({
      status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
      httpStatus: 500,
      reason: "PREAPPROVAL_RESPONSE_UNUSABLE",
      preapprovalId: null,
      userId: USER_ID,
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Do NOT retry");
  });

  it("16c) a broken diagnostic sink cannot break a subscription start", async () => {
    const { handler, request } = makeHarness({ sinkThrows: true });

    const response = await handler(request());

    expect(response.status).toBe(200);
    expect((await bodyOf(response))["status"]).toBe("READY");
  });

  it("17) a wrong method is refused with zero effects and an Allow header", async () => {
    const { handler, state, request } = makeHarness();

    for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
      const response = await handler(request({ method }));

      expect(response.status).toBe(405);
      expect(await bodyOf(response)).toEqual({ status: "METHOD_NOT_ALLOWED" });
      expect(response.headers.get("allow")).toBe("POST");
    }

    expect(state.calls).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ========================= 8 · transport and structure ==================== */

const SOURCE_PATH = join(process.cwd(), "src/server/billing/mercadopago/pro-subscription-start.ts");
const ROUTE_PATH = join(process.cwd(), "src/routes/api.billing.mercadopago.start-pro.ts");

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/[^\r\n]*/, ""))
    .join("\n");
}

describe("MP-M3C · start · structure", () => {
  it("18) the flow reaches the provider exactly once, with no retry and no loop", () => {
    const source = stripComments(readFileSync(SOURCE_PATH, "utf8"));

    expect(source.match(/await createMercadoPagoUserPreapproval\(/g)).toHaveLength(1);
    // The provider is reached through the typed provisioning function and
    // nowhere else, so a second attempt would have to be a second call site.
    expect(source).not.toContain("postJson(");
    for (const forbidden of ["setTimeout", "setInterval", "for (", "while ("]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it("18b) the runtime is loaded lazily: no static import of auth or persistence", () => {
    const source = stripComments(readFileSync(SOURCE_PATH, "utf8"));

    // A static `from` import would put Supabase — and the service-role secret —
    // in the module graph of anything that imports this module.
    expect(source).not.toContain('from "../auth.ts"');
    expect(source).not.toContain('from "../persistence.ts"');
    expect(source).toContain('import("../auth.ts")');
    expect(source).toContain('import("../persistence.ts")');
    // One identity seam, the canonical one.
    expect(source.match(/requireBillingUser/g)).toHaveLength(1);
  });

  it("18c) no handler decision is duplicated in the route", () => {
    const source = stripComments(readFileSync(ROUTE_PATH, "utf8"));

    expect(source).toContain("handleStartProSubscription");
    expect(source).toContain(
      'await import("../server/billing/mercadopago/pro-subscription-start")',
    );
    for (const forbidden of [
      "postJson",
      "upsertNormalizedSubscription",
      "requireBillingUser",
      "MERCADOPAGO_PRO_PLAN_ID",
      "searchParams",
      ".json()",
      "token",
    ]) {
      expect(source, forbidden).not.toContain(forbidden);
    }
  });

  it("18d) the flow is a server-only module", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    expect(source).toContain('import "@tanstack/react-start/server-only"');
  });
});
