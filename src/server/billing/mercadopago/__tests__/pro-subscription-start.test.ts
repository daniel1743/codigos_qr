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
  CARD_TOKEN_ID_MAX_LENGTH,
  readCardTokenFromBody,
  START_PRO_ALLOWED_BODY_FIELDS,
} from "../card-token";
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
 *   1. the identity, the price and the plan come from the SERVER, and the ONE
 *      field a browser may contribute — a `card_token_id` produced by Mercado
 *      Pago's own client integration — cannot propose an owner, a price, a plan
 *      or a status: a body that tries is refused whole;
 *   2. nothing is reported as started unless the correlation row is actually
 *      persisted, verified field by field;
 *   3. when the provider creates a subscription and the correlation cannot be
 *      written, the outcome is the critical classified state — never a retry,
 *      never a Pro grant, never a fake local row.
 *
 * The canonical cores are exercised for real: `applyNormalizedEvent` proves the
 * pending correlation resolves an OWNER, and `resolveEntitlement` proves the same
 * row grants NOTHING. Both run over doubles here, and the doubles call nothing.
 *
 * WHAT MP-M3D.7 CHANGED IN THIS FILE
 * Assertion (1) used to read "the request body is never read". Mercado Pago
 * requires `card_token_id` and `status: authorized` to attach a subscription to a
 * plan (MP-M3D.6, confirmed by MP-M3D.5's captured `400`), so the body IS read
 * now — but only through the frozen single-field contract in `card-token.ts`.
 * Every place where this file used to prove "the browser cannot say anything" now
 * proves the stronger, still-true thing: "the browser can say exactly one thing,
 * and a body that says more is refused instead of filtered".
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

/**
 * The card token the browser is allowed to contribute — deliberately a
 * sentence-shaped sentinel, so no reader or secret-scanner can mistake this
 * fixture for captured payment material. The REAL flow receives this value from
 * Mercado Pago's client integration inside the browser; here it is just the one
 * string the contract admits.
 */
const CARD_TOKEN = "fixture_card_token_mp_m3d7_not_a_real_token";

/** The provider status a plan subscription created with a card comes back as. */
const PROVIDER_AUTHORIZED = "authorized";

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
  /**
   * What the request body carries. `undefined` → the default single-field body
   * with a valid token; a string → that token verbatim; `null` → no body at all.
   */
  cardToken?: string | null;
  /** A raw body string, for contract violations the object form cannot express. */
  rawBody?: string;
  /** What the authoritative readback (`GET /preapproval/{id}`) answers with. */
  readbackResponse?: unknown;
  /** Raised by the readback, as a transport failure would be. */
  readbackError?: Error | null;
}

interface HarnessState {
  calls: string[];
  posts: Array<{ path: string; body: unknown }>;
  writes: NormalizedSubscriptionInput[];
  diagnostics: ProSubscriptionStartDiagnostic[];
  /** What the canonical "live subscription for this user" lookup would return. */
  live: BillingSubscriptionRecord | null;
  /** Every path this client was asked to READ, in order. */
  reads: string[];
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
    reads: [],
    live: options.liveSubscription ?? null,
  };

  const postJson = vi.fn(async (path: string, body: unknown): Promise<unknown> => {
    state.calls.push(`postJson:${path}`);
    state.posts.push({ path, body });
    if (options.providerError) throw options.providerError;
    return options.providerResponse === undefined
      ? {
          id: SUBSCRIPTION_ID,
          // A subscription created with a card token and `status: authorized`
          // comes back authorized: that is what the provider was told to create.
          status: PROVIDER_AUTHORIZED,
          preapproval_plan_id: PLAN_ID,
          init_point: CHECKOUT_URL,
        }
      : options.providerResponse;
  });

  // The ONE read this flow is allowed to make is the authoritative readback of
  // the subscription it just created. Anything else reading the provider would
  // be a second source of truth, so the default still throws and each test that
  // wants a readback says so explicitly.
  const getJson = vi.fn(async (path: string): Promise<unknown> => {
    state.calls.push(`getJson:${path}`);
    state.reads.push(path);
    if (options.readbackError) throw options.readbackError;
    if (options.readbackResponse !== undefined) return options.readbackResponse;
    throw new Error("this test did not authorize a provider read");
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

  // The body a REAL client build sends: exactly one field, the token Mercado
  // Pago's own card fields produced. Tests that want a different body pass one.
  const defaultBody =
    options.rawBody !== undefined
      ? options.rawBody
      : options.cardToken === null
        ? undefined
        : JSON.stringify({ card_token_id: options.cardToken ?? CARD_TOKEN });

  return {
    deps,
    state,
    postJson,
    handler: createProSubscriptionStartHandler(deps),
    request: (init: RequestInit = {}) => {
      const method = init.method ?? PRO_SUBSCRIPTION_START_METHOD;
      // A GET/HEAD request cannot carry a body — `new Request` throws — and the
      // method-gate test needs to reach the gate, not the constructor.
      const withBody =
        init.body === undefined && defaultBody !== undefined && method === PRO_SUBSCRIPTION_START_METHOD
          ? { headers: { "content-type": "application/json" }, body: defaultBody }
          : {};
      return new Request("https://cripqer.test/api/billing/mercadopago/start-pro", {
        method,
        ...withBody,
        ...init,
      });
    },
  };
}

/**
 * The exact provider body the live request must carry.
 *
 * Four keys, and each one is load-bearing: the plan decides the price, the payer
 * email decides who is charged, and — since MP-M3D.7 — the card token and the
 * `authorized` status are what the provider requires to attach the subscription
 * to the plan at all. A literal, on purpose: a computed expectation could drift
 * with the code it is meant to judge.
 */
const EXPECTED_PROVIDER_BODY = {
  preapproval_plan_id: PLAN_ID,
  payer_email: SESSION_EMAIL,
  card_token_id: CARD_TOKEN,
  status: "authorized",
};

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

/** Every path the provider was asked to read. Asserted, never assumed. */
function reads(state: HarnessState): string[] {
  return state.reads;
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

  it("2) the browser cannot choose the owner: a hostile body is refused whole", async () => {
    // INVERTED IN MP-M3D.7. This test used to send this same body and expect a
    // 200, with the extra fields silently dropped. Dropping was the friendly
    // choice and it left the contract ambiguous: a body carrying `payer_email`
    // was accepted, so the next reader could reasonably believe the field did
    // something. The body is now refused ENTIRELY — including the token, which
    // nobody gets to spend on a request that was going to be rejected anyway —
    // so "what can the browser influence" has one auditable answer.
    const hostile = {
      card_token_id: CARD_TOKEN,
      user_id: "user_attacker",
      payer_email: "attacker@evil.test",
      plan_id: "business",
      planId: "enterprise",
      preapproval_plan_id: "PLAN_ATTACKER",
      amount: 1,
      currency: "USD",
      frequency: 12,
      free_trial: 0,
      status: "cancelled",
      provider: "paypal",
      provider_subscription_id: "SUB_ATTACKER",
    };
    const { handler, state, postJson, request } = makeHarness({
      rawBody: JSON.stringify(hostile),
    });

    const response = await handler(request());

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ status: "INVALID_REQUEST" });
    // Nothing reached Mercado Pago, nothing was written, and the closed
    // rejection category is on the DIAGNOSTIC rather than in the body.
    expect(postJson).not.toHaveBeenCalled();
    expect(state.writes).toEqual([]);
    expect(reads(state)).toEqual([]);
    expect(firstDiagnostic(state).reason).toBe("UNEXPECTED_FIELDS");
    // The refusal names the category and never the set it was measured against.
    expect(JSON.stringify(state.diagnostics)).not.toContain("attacker");
  });

  it("2a) with a valid token the owner, the plan and the price are still the server's", async () => {
    // The complement of test 2, and the property that actually matters: when the
    // browser sends the ONE field it is allowed to send, the request that leaves
    // carries the session's identity and the configured plan — nothing else —
    // and the correlation belongs to the authenticated user.
    const { handler, state, postJson, request } = makeHarness();

    const response = await handler(request());

    expect(response.status).toBe(200);
    expect(postJson).toHaveBeenCalledTimes(1);
    const sent = firstPost(state).body;
    expect(sent).toEqual(EXPECTED_PROVIDER_BODY);
    expect(JSON.stringify(sent)).not.toContain("attacker");
    expect(JSON.stringify(sent)).not.toContain("USD");
    expect(firstWrite(state).user_id).toBe(USER_ID);
    expect(firstWrite(state).plan_id).toBe("pro");
    expect(firstWrite(state).currency).toBe("CLP");
  });

  it("2b) the flow's only browser-supplied input is the token verdict", () => {
    // INVERTED IN MP-M3D.7. This test used to assert `length === 1` — "there is
    // no parameter for a body, a query or a header". The flow now takes an input
    // object, so the property is restated as what still has to hold: that object
    // has exactly ONE key, and there is no parameter by which anything else — a
    // session, a plan, a price, a URL — could arrive.
    expect(startProSubscription.length).toBe(2);

    const source = stripComments(readFileSync(SOURCE_PATH, "utf8"));
    const declaration = /export interface ProSubscriptionStartInput \{[\s\S]*?\n\}/.exec(source);
    expect(declaration, "ProSubscriptionStartInput must be declared").not.toBeNull();
    expect(declaration?.[0].match(/readonly \w+:/g)).toEqual(["readonly cardToken:"]);
  });

  it("2e) a smuggled key on the input object changes nothing", async () => {
    // Dependency injection is not a boundary, so the flow is called DIRECTLY
    // here with everything a caller might hope to inject, and the provider body
    // is still built from the session and the configuration alone.
    const { deps, state, request } = makeHarness();
    const smuggled = {
      cardToken: readCardTokenFromBody({ card_token_id: CARD_TOKEN }),
      userId: "user_attacker",
      payerEmail: "attacker@evil.test",
      preapprovalPlanId: "PLAN_ATTACKER",
      status: "cancelled",
    };

    const result = await startProSubscription(deps, smuggled as never);

    expect(result.status).toBe("READY");
    expect(firstPost(state).body).toEqual(EXPECTED_PROVIDER_BODY);
    expect(firstWrite(state).user_id).toBe(USER_ID);
    // Nothing in the handler chain was required to make this request.
    expect(state.calls[0]).toBe("requireUser");
    void request;
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

  it("7b) sends exactly four keys — and still no amount, no interval and no provider reference", async () => {
    // INVERTED IN MP-M3D.7. This test used to assert the body had two keys and
    // neither was `status` nor `card_token_id`. The provider requires both (a
    // plan subscription "must always be created with your card_token_id and
    // with the status Authorized"), so what survives of the old property is the
    // part that was always about the MONEY: the recurring terms live in the plan
    // and are still never restated here, and no ownership hint is smuggled in.
    const { handler, state, request } = makeHarness();

    await handler(request());

    const body = firstPost(state).body as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      "card_token_id",
      "payer_email",
      "preapproval_plan_id",
      "status",
    ]);
    expect(body["status"]).toBe("authorized");
    expect(body["card_token_id"]).toBe(CARD_TOKEN);
    for (const forbidden of [
      "auto_recurring",
      "transaction_amount",
      "currency_id",
      "frequency",
      "frequency_type",
      "free_trial",
      "external_reference",
      "payer_id",
    ]) {
      expect(body).not.toHaveProperty(forbidden);
    }
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

  it("9b) an id without a checkout URL is a SUCCESS, and the correlation is still written", async () => {
    // INVERTED IN MP-M3D.7. This test used to demand a critical
    // `REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED`. That was right while the
    // flow EXISTED to hand the payer a redirect — an id with nothing to navigate
    // to was a dead end. The card is now tokenized in the browser and the
    // subscription is created `authorized`, so a missing `init_point` means only
    // that there is no "add or modify payment method" link, and reporting a
    // healthy subscription as a critical failure would send an operator chasing
    // a resource that needs no recovery.
    const { handler, state, request } = makeHarness({
      providerResponse: { id: SUBSCRIPTION_ID, status: PROVIDER_AUTHORIZED },
    });

    const response = await handler(request());

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({
      status: "READY",
      providerSubscriptionStatus: PROVIDER_AUTHORIZED,
      checkoutUrl: null,
    });
    // The subscription exists and is now attributable: the webhook can find its
    // owner, and the row still grants NOTHING until the webhook says so.
    expect(state.writes).toHaveLength(1);
    expect(firstWrite(state).status).toBe("pending");
    expect(resolveEntitlement(rowFrom(firstWrite(state))).hasPaidAccess).toBe(false);
    expect(state.diagnostics[0]?.status).toBe("READY");
  });

  it("9c) a refused checkout URL is neutralised, not handed to a browser", async () => {
    // The URL can become a navigation target, so `readUserPreapprovalCheckoutUrl`
    // admits https only. What changed in MP-M3D.7 is the CONSEQUENCE: a
    // non-https value used to fail the whole start; now it is dropped and the
    // start succeeds, because the subscription does not depend on it. The
    // security property — the string never reaches the browser — is unchanged.
    for (const initPoint of ["http://mercadopago.test/x", "javascript:alert(1)", "/relative"]) {
      const { handler, state, request } = makeHarness({
        providerResponse: { id: SUBSCRIPTION_ID, status: PROVIDER_AUTHORIZED, init_point: initPoint },
      });

      const response = await handler(request());
      const body = await bodyOf(response);
      const text = JSON.stringify(body);

      expect(response.status).toBe(200);
      expect(text).not.toContain(initPoint);
      expect(text).not.toContain("mercadopago.test");
      expect(body).toMatchObject({ checkoutUrl: null });
      expect(state.writes).toHaveLength(1);
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

  it("10b) writes the correlation BEFORE it reports success", async () => {
    const { handler, state, request } = makeHarness();

    const response = await handler(request());

    expect(response.status).toBe(200);
    const write = state.calls.indexOf("upsertNormalizedSubscription");
    expect(write).toBeGreaterThan(-1);
    // The write lands before the readback, so a readback that fails still leaves
    // a subscription the webhook can attribute.
    expect(state.calls.indexOf("getJson:/preapproval/SUB1")).toBeGreaterThan(write);
    expect(state.writes).toHaveLength(1);
    expect((await bodyOf(response))["status"]).toBe("READY");
  });

  it("10c) the authoritative readback wins over what creation reported", async () => {
    // The creation response says what the provider said AT CREATION; the readback
    // is the resource now. When they disagree, the readback is the truth — and
    // the flow reports it without acting on it, because entitlement is the
    // webhook's decision, never this flow's.
    const { handler, state, request } = makeHarness({
      providerResponse: { id: SUBSCRIPTION_ID, status: "pending", init_point: CHECKOUT_URL },
      readbackResponse: { id: SUBSCRIPTION_ID, status: PROVIDER_AUTHORIZED },
    });

    const response = await handler(request());

    expect(reads(state)).toEqual(["/preapproval/SUB1"]);
    expect(await bodyOf(response)).toEqual({
      status: "READY",
      providerSubscriptionStatus: PROVIDER_AUTHORIZED,
      checkoutUrl: CHECKOUT_URL,
    });
    // Read, reported, and NOT granted: the row is still pending.
    expect(firstWrite(state).status).toBe("pending");
    expect(resolveEntitlement(rowFrom(firstWrite(state))).hasPaidAccess).toBe(false);
  });

  it("10d) a failed readback falls back to the creation status instead of discarding it", async () => {
    for (const options of [
      { readbackError: new MercadoPagoError("TIMEOUT", "timed out") },
      { readbackError: new MercadoPagoError("HTTP_ERROR", "HTTP 500.", 500) },
      { readbackResponse: {} },
      { readbackResponse: { status: 42 } },
    ]) {
      const { handler, request } = makeHarness({
        providerResponse: { id: SUBSCRIPTION_ID, status: PROVIDER_AUTHORIZED, init_point: CHECKOUT_URL },
        ...options,
      });

      const response = await handler(request());

      // Still a success: the subscription exists and is correlated, and there is
      // no retry here that could create a second one.
      expect(response.status).toBe(200);
      expect(await bodyOf(response)).toEqual({
        status: "READY",
        providerSubscriptionStatus: PROVIDER_AUTHORIZED,
        checkoutUrl: CHECKOUT_URL,
      });
    }
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
  it("15) the body is a status, plus the subscription's state only when ready", async () => {
    const ready = makeHarness();
    const readyBody = await bodyOf(await ready.handler(ready.request()));
    expect(Object.keys(readyBody).sort()).toEqual([
      "checkoutUrl",
      "providerSubscriptionStatus",
      "status",
    ]);
    expect(readyBody).toEqual({
      status: "READY",
      providerSubscriptionStatus: PROVIDER_AUTHORIZED,
      checkoutUrl: CHECKOUT_URL,
    });

    for (const options of [
      { proPlanId: null },
      { email: null },
      { liveSubscription: null, providerError: new MercadoPagoError("HTTP_ERROR", "x", 500) },
      { writeError: new Error("boom") },
      { providerResponse: {} },
      { cardToken: null },
    ] as HarnessOptions[]) {
      const { handler, request } = makeHarness(options);
      const body = await bodyOf(await handler(request()));

      expect(Object.keys(body).sort()).toEqual(["status"]);
      for (const leaked of [SUBSCRIPTION_ID, USER_ID, PLAN_ID, TOKEN_SENTINEL, CARD_TOKEN]) {
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

/* ========================= 9 · the token boundary ========================= */

/**
 * MP-M3D.7 · the ONE field a browser may contribute.
 *
 * Until this phase the endpoint read no body, so "the browser cannot influence
 * the subscription" needed no defence: there was no channel. Mercado Pago
 * requires `card_token_id` to attach a subscription to a plan, so the channel now
 * exists, and everything below exists to keep it one field wide.
 *
 * The token is treated as payment material from the moment it arrives to the
 * moment it is spent: it is judged without being echoed, forwarded to exactly one
 * call, never written, never read back, never logged, never measured. Each of
 * those is asserted rather than reasoned about, because the failure mode — a
 * single-use card token sitting in a log line — is silent and permanent.
 */
describe("MP-M3D.7 · start · the card token crosses once and is never kept", () => {
  it("25) an unauthenticated caller is refused before the token is even consulted", async () => {
    const { handler, state, postJson, request } = makeHarness({
      sessionError: billingUnauthorized(),
    });

    const response = await handler(request());
    const body = await bodyOf(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({ status: "UNAUTHENTICATED" });
    expect(postJson).not.toHaveBeenCalled();
    expect(reads(state)).toEqual([]);
    expect(state.writes).toEqual([]);
    // Identity is checked FIRST, so an anonymous caller cannot learn the request
    // contract by watching which refusal comes back. A valid token and no token
    // are indistinguishable from outside.
    expect(state.calls).toEqual(["requireUser"]);

    const anonymousWithoutToken = makeHarness({
      sessionError: billingUnauthorized(),
      cardToken: null,
    });
    const noTokenResponse = await anonymousWithoutToken.handler(anonymousWithoutToken.request());
    expect(noTokenResponse.status).toBe(response.status);
    expect(await bodyOf(noTokenResponse)).toEqual(body);
    expect(anonymousWithoutToken.state.calls).toEqual(["requireUser"]);
  });

  const MISSING_TOKEN_BODIES: Array<{ what: string; options: HarnessOptions }> = [
    { what: "no body at all", options: { cardToken: null } },
    { what: "an empty body", options: { rawBody: "" } },
    { what: "whitespace", options: { rawBody: "   " } },
    { what: "text that is not JSON", options: { rawBody: "card_token_id=abc" } },
    {
      what: "a JSON array",
      options: { rawBody: JSON.stringify([{ card_token_id: CARD_TOKEN }]) },
    },
    { what: "a JSON string", options: { rawBody: JSON.stringify(CARD_TOKEN) } },
    { what: "a JSON number", options: { rawBody: "42" } },
    { what: "JSON null", options: { rawBody: "null" } },
    { what: "an empty object", options: { rawBody: "{}" } },
    { what: "an explicit null", options: { rawBody: JSON.stringify({ card_token_id: null }) } },
    { what: "a non-string token", options: { rawBody: JSON.stringify({ card_token_id: 12345 }) } },
    { what: "a blank token", options: { rawBody: JSON.stringify({ card_token_id: "   " }) } },
    {
      what: "an over-long token",
      options: {
        rawBody: JSON.stringify({ card_token_id: "x".repeat(CARD_TOKEN_ID_MAX_LENGTH + 1) }),
      },
    },
  ];

  it.each(MISSING_TOKEN_BODIES)("26) refuses $what with zero effects", async ({ options }) => {
    const { handler, state, postJson, request } = makeHarness(options);

    const response = await handler(request());

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ status: "INVALID_REQUEST" });
    expect(postJson).not.toHaveBeenCalled();
    expect(reads(state)).toEqual([]);
    expect(state.writes).toEqual([]);
    // The category is diagnostic-only, and it is a closed word — never the value
    // that failed, and never the list it was measured against.
    expect(firstDiagnostic(state).reason).toMatch(/^(MALFORMED_BODY|MISSING_CARD_TOKEN|INVALID_CARD_TOKEN)$/);
  });

  it("26b) an over-long body is refused before it is read into memory", async () => {
    const { handler, state, postJson, request } = makeHarness({
      rawBody: JSON.stringify({ card_token_id: "x".repeat(20_000) }),
    });

    const response = await handler(request({ headers: { "content-length": "20000" } }));

    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ status: "INVALID_REQUEST" });
    expect(postJson).not.toHaveBeenCalled();
    expect(state.writes).toEqual([]);
  });

  const SMUGGLED_FIELDS = [
    "payer_email",
    "preapproval_plan_id",
    "plan_id",
    "planId",
    "status",
    "user_id",
    "userId",
    "amount",
    "transaction_amount",
    "currency",
    "currency_id",
    "frequency",
    "frequency_type",
    "free_trial",
    "external_reference",
    "payer_id",
    "provider",
    "provider_subscription_id",
    "back_url",
    "auto_recurring",
  ];

  it.each(SMUGGLED_FIELDS)(
    "27) refuses a body that adds %s, even alongside a valid token",
    async (field) => {
      const { handler, state, postJson, request } = makeHarness({
        rawBody: JSON.stringify({ card_token_id: CARD_TOKEN, [field]: "HOSTILE_VALUE" }),
      });

      const response = await handler(request());

      expect(response.status).toBe(400);
      expect(await bodyOf(response)).toEqual({ status: "INVALID_REQUEST" });
      expect(firstDiagnostic(state).reason).toBe("UNEXPECTED_FIELDS");
      // Refused, not filtered: nothing is sent, so nothing has to be trusted to
      // have been dropped.
      expect(postJson).not.toHaveBeenCalled();
      expect(state.writes).toEqual([]);
      expect(JSON.stringify(state.diagnostics)).not.toContain("HOSTILE_VALUE");
    },
  );

  it("28) the accepted field list is a frozen single element, not a convention", () => {
    expect(START_PRO_ALLOWED_BODY_FIELDS).toEqual(["card_token_id"]);
    expect(Object.isFrozen(START_PRO_ALLOWED_BODY_FIELDS)).toBe(true);
  });

  it("29) the token is spent on exactly ONE provider call and never on the readback", async () => {
    const { handler, state, postJson, request } = makeHarness();

    await handler(request());

    // One POST, carrying the token — and one GET of the resource it created,
    // whose path is built from the returned ID alone.
    expect(postJson).toHaveBeenCalledTimes(1);
    expect(reads(state)).toEqual([`/preapproval/${SUBSCRIPTION_ID}`]);
    for (const path of reads(state)) expect(path).not.toContain(CARD_TOKEN);
    expect(JSON.stringify(state.posts.map((p) => p.path))).not.toContain(CARD_TOKEN);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("30) the token is in the request body and nowhere else it could be kept", async () => {
    const lines: string[] = [];
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      }),
    );

    // Every outcome, with a token-bearing body each time.
    const happy = makeHarness();
    await happy.handler(happy.request());

    const refused = makeHarness({
      rawBody: JSON.stringify({ card_token_id: CARD_TOKEN, payer_email: "attacker@evil.test" }),
    });
    await refused.handler(refused.request());

    const providerFailed = makeHarness({
      providerError: new MercadoPagoError("HTTP_ERROR", `HTTP 500 ${CARD_TOKEN}`, 500),
    });
    await providerFailed.handler(providerFailed.request());

    const correlationLost = makeHarness({ writeError: new Error(`boom ${CARD_TOKEN}`) });
    await correlationLost.handler(correlationLost.request());

    const scenarios = [happy, refused, providerFailed, correlationLost];

    for (const { state } of scenarios) {
      // Not in a diagnostic an operator could read out loud...
      expect(JSON.stringify(state.diagnostics)).not.toContain(CARD_TOKEN);
      // ...not in a persisted column, in any field...
      expect(JSON.stringify(state.writes)).not.toContain(CARD_TOKEN);
      // ...and not in a provider path.
      expect(JSON.stringify(state.posts.map((p) => p.path))).not.toContain(CARD_TOKEN);
      // The payment-method label is the one column that could plausibly have
      // captured it. It is explicitly null.
      for (const write of state.writes) expect(write.payment_method_label).toBeNull();
    }

    // Nothing reached any console sink either.
    expect(lines.join("\n")).not.toContain(CARD_TOKEN);

    // ...including through the production sink, which builds its line from named
    // fields and cannot carry a value it was never handed.
    const sinkLines: string[] = [];
    const sink = createCriticalPreapprovalLogSink((line) => sinkLines.push(line));
    for (const { state } of scenarios) {
      for (const diagnostic of state.diagnostics) sink(diagnostic);
    }
    expect(sinkLines.join("\n")).not.toContain(CARD_TOKEN);

    for (const spy of spies) spy.mockRestore();
  });

  it("30b) the persisted correlation has no free-text field the token could hide in", async () => {
    const { handler, state, request } = makeHarness();
    await handler(request());

    const write = firstWrite(state);
    for (const [key, value] of Object.entries(write)) {
      if (typeof value !== "string") continue;
      expect(value, key).not.toContain(CARD_TOKEN);
      // The only string columns are identifiers and fixed vocabulary; a token
      // would have to displace one of them to be stored.
      expect(
        [USER_ID, "pro", "mercado_pago", SUBSCRIPTION_ID, "monthly", "CLP", "pending"],
        key,
      ).toContain(value);
    }
  });

  it("31) this endpoint is not wired to analytics, so a token cannot be measured", () => {
    // The spec requires that no card token reaches an analytics payload. The
    // strongest form of that guarantee is structural: neither the flow nor the
    // route imports or calls a measurement API at all, so there is no payload to
    // inspect and no future edit that could add a field to one.
    const flow = stripComments(readFileSync(SOURCE_PATH, "utf8"));
    const route = stripComments(readFileSync(ROUTE_PATH, "utf8"));

    // The console sink is deliberately absent from this list: the flow DOES log,
    // on exactly one path (the critical state), through
    // `createCriticalPreapprovalLogSink`. What it never does is MEASURE. The two
    // are different sinks with different lifetimes, and only one of them widens
    // into a payload a field could be added to later.
    for (const forbidden of [
      "analytics",
      "posthog",
      "capture(",
      "track(",
      "gtag",
      "VITE_ANALYTICS",
      "analyticsClient",
      "sendEvent",
    ]) {
      expect(flow, `flow: ${forbidden}`).not.toContain(forbidden);
      expect(route, `route: ${forbidden}`).not.toContain(forbidden);
    }

    // The route does not log either: it has no outcome of its own to report.
    expect(route).not.toContain("console.");
  });

  it("32) the route reads no body of its own, so the contract has one implementation", () => {
    const route = stripComments(readFileSync(ROUTE_PATH, "utf8"));

    // If the route touched the body, there would be two places that decide what
    // crosses from the browser, and the frozen contract would be advisory.
    for (const forbidden of [".json()", ".text()", "card_token_id", "cardToken", "headers.get"]) {
      expect(route, forbidden).not.toContain(forbidden);
    }
    expect(route).toContain("handleStartProSubscription(request)");
  });

  it("33) the contract judge is total: it never throws, whatever it is handed", () => {
    // The handler relies on this being total so it needs no try/catch that could
    // swallow an unrelated failure. Exercised directly, with the hostile shapes
    // JSON.parse can actually produce.
    const hostile: unknown[] = [
      undefined,
      null,
      0,
      "",
      "text",
      [],
      [1, 2],
      {},
      { card_token_id: {} },
      { card_token_id: [] },
      { card_token_id: true },
      { card_token_id: (() => undefined) as unknown },
      Object.create(null) as unknown,
      { ["__proto__"]: "x" },
      { constructor: "x" },
    ];

    for (const body of hostile) {
      const verdict = readCardTokenFromBody(body);
      expect(typeof verdict.ok, JSON.stringify(body) || String(body)).toBe("boolean");
      if (!verdict.ok) expect(typeof verdict.reason).toBe("string");
    }

    // Innocent prototypal keys are still UNEXPECTED_FIELDS: `constructor` is a
    // name a caller can type, and the contract is about names.
    expect(readCardTokenFromBody({ constructor: "x" }).ok).toBe(false);
  });
});

/* ============================== MP-M3D.4 ================================ */

/**
 * MP-M3D.4 · the failure that could not be diagnosed.
 *
 * MP-M3D.3 ran the real flow against the Preview and got one 502 with zero
 * preapprovals created. From outside, a rejected payload, a timeout and a dead
 * socket were the SAME event: same status, same word, same empty remote account.
 * The next attempt would therefore have been a guess, and the only way to test a
 * guess about the creation payload is to create another real subscription.
 *
 * These tests pin the property that removes the guess. The public response is
 * unchanged — the browser still learns exactly the word `PROVIDER_ERROR` — and
 * the operator diagnostic now says which failure it was. The flow reaches the
 * provider ONCE per invocation: a diagnostic is evidence, never a retry.
 *
 * The client here is the REAL one, over this file's fetch landmine, so these
 * exercise the whole path rather than a double that answers with the answer.
 */
describe("MP-M3D.4 · start · a provider failure is diagnosable without repeating it", () => {
  function realClient(timeoutMs?: number): MercadoPagoWriteClient {
    return createMercadoPagoClient({
      accessToken: TOKEN_SENTINEL,
      webhookSecret: null,
      proPlanId: PLAN_ID,
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
    });
  }

  function answerWith(body: unknown, status: number): void {
    fetchSpy.mockImplementation(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    );
  }

  /** The single diagnostic the handler emitted — asserted, not assumed. */
  function onlyDiagnostic(state: HarnessState): ProSubscriptionStartDiagnostic {
    // Indexed directly: going through this helper here is how it would become
    // its own recursion.
    const diagnostic: ProSubscriptionStartDiagnostic | undefined = state.diagnostics[0];
    if (diagnostic === undefined) throw new Error("expected exactly one diagnostic");
    return diagnostic;
  }

  it("19) refuses a rejected payload, creates nothing, and now says why", async () => {
    answerWith(
      {
        message: "Invalid preapproval_plan_id",
        error: "bad_request",
        cause: [{ code: 1234, description: "preapproval_plan_id does not exist" }],
      },
      400,
    );

    const { handler, state, request } = makeHarness({ client: realClient() });
    const response = await handler(request());

    // The browser learns nothing new — the same status, the same single word.
    expect(response.status).toBe(502);
    expect(await bodyOf(response)).toEqual({ status: "PROVIDER_ERROR" });

    // Nothing was created anywhere, and the canonical resolution proves it.
    expect(state.writes).toEqual([]);
    expect(resolveEntitlement(state.live).effectiveTier).toBe("free");
    expect(resolveEntitlement(state.live).hasPaidAccess).toBe(false);

    // ...but the failure is no longer anonymous.
    const diagnostic = onlyDiagnostic(state);
    expect(diagnostic.status).toBe("PROVIDER_ERROR");
    expect(diagnostic.httpStatus).toBe(502);
    expect(diagnostic.providerErrorCode).toBe("HTTP_ERROR");
    expect(diagnostic.providerDiagnostic?.failureCategory).toBe("PROVIDER_HTTP_ERROR");
    expect(diagnostic.providerDiagnostic?.providerHttpStatus).toBe(400);
    expect(diagnostic.providerDiagnostic?.operationName).toBe("POST");
    expect(diagnostic.providerDiagnostic?.providerErrorType).toBe("bad_request");
    expect(diagnostic.providerDiagnostic?.providerErrorCode).toBe("1234");
    expect(diagnostic.providerDiagnostic?.providerCauseDescriptions).toEqual([
      "preapproval_plan_id does not exist",
    ]);
    expect(typeof diagnostic.providerDiagnostic?.elapsedMs).toBe("number");

    // One attempt. Evidence is not a retry.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("20) tells a timeout apart from a refusal — the absence of a status IS the signal", async () => {
    fetchSpy.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const aborted = new Error("aborted");
            aborted.name = "AbortError";
            reject(aborted);
          });
        }),
    );

    const { handler, state, request } = makeHarness({ client: realClient(5) });
    const response = await handler(request());

    expect(response.status).toBe(502);
    expect(await bodyOf(response)).toEqual({ status: "PROVIDER_ERROR" });
    expect(state.writes).toEqual([]);

    const provider = onlyDiagnostic(state).providerDiagnostic;
    expect(onlyDiagnostic(state).providerErrorCode).toBe("TIMEOUT");
    expect(provider?.failureCategory).toBe("PROVIDER_TIMEOUT");
    expect(provider?.timeoutMs).toBe(5);
    // This null is the whole point: Mercado Pago never answered.
    expect(provider?.providerHttpStatus).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("21) tells a dead socket apart from both, with no status and no retry", async () => {
    fetchSpy.mockImplementation(async () => {
      throw new Error("socket closed");
    });

    const { handler, state, request } = makeHarness({ client: realClient() });
    const response = await handler(request());

    expect(response.status).toBe(502);
    expect(await bodyOf(response)).toEqual({ status: "PROVIDER_ERROR" });

    const provider = onlyDiagnostic(state).providerDiagnostic;
    expect(onlyDiagnostic(state).providerErrorCode).toBe("NETWORK_ERROR");
    expect(provider?.failureCategory).toBe("PROVIDER_NETWORK_ERROR");
    expect(provider?.providerHttpStatus).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("22) the sink turns a real failure into ONE line, with the reason and no secret", async () => {
    // The provider echoes request context back, which is exactly what a real
    // rejection does — this is the end of the path where a leak would land.
    answerWith(
      {
        message: `request for ${SESSION_EMAIL} rejected`,
        error: "bad_request",
        cause: [
          {
            code: 1234,
            description: `preapproval_plan_id is missing (auth Bearer ${TOKEN_SENTINEL})`,
          },
        ],
      },
      400,
    );

    const { handler, state, request } = makeHarness({ client: realClient() });
    await handler(request());

    const lines: string[] = [];
    const sink = createCriticalPreapprovalLogSink((line) => lines.push(line));
    sink(onlyDiagnostic(state));

    expect(lines).toHaveLength(1);
    const line = lines[0] ?? "";
    expect(line).toContain("PROVIDER_ERROR");
    expect(line).toContain("category=PROVIDER_HTTP_ERROR");
    expect(line).toContain("http=400");
    expect(line).toContain("providerCode=1234");
    // The reason survives...
    expect(line).toContain("preapproval_plan_id is missing");
    // ...and nothing else does.
    for (const forbidden of [TOKEN_SENTINEL, SESSION_EMAIL, SECRET_SENTINEL, "Bearer "]) {
      expect(line).not.toContain(forbidden);
    }
    expect(line).not.toContain("\n");
  });

  it("23) the sink stays silent for a failure that reached nobody", async () => {
    // A local refusal is not an observation: there is nothing an operator could
    // act on that the 502 has not already said, so the log keeps its meaning.
    const client = createMercadoPagoClient(
      readMercadoPagoConfigFromEnv({ MERCADOPAGO_PRO_PLAN_ID: PLAN_ID }),
    );
    const { handler, state, request } = makeHarness({ client });

    const response = await handler(request());

    expect(response.status).toBe(502);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.diagnostics[0]).toEqual({
      status: "PROVIDER_ERROR",
      httpStatus: 502,
      providerErrorCode: "MISSING_ACCESS_TOKEN",
    });
    expect(onlyDiagnostic(state).providerDiagnostic).toBeUndefined();

    const lines: string[] = [];
    createCriticalPreapprovalLogSink((line) => lines.push(line))(onlyDiagnostic(state));
    expect(lines).toEqual([]);
  });

  it("24) no diagnostic carries the token or the session email, on any path", async () => {
    for (const status of [400, 401, 404, 422, 500]) {
      answerWith(
        {
          message: `payer ${SESSION_EMAIL} with ${TOKEN_SENTINEL} was refused`,
          error: "bad_request",
          cause: [{ code: 1234, description: `Bearer ${TOKEN_SENTINEL} rejected` }],
        },
        status,
      );

      const { handler, state, request } = makeHarness({ client: realClient() });
      await handler(request());

      const text = JSON.stringify(state.diagnostics);
      for (const forbidden of [TOKEN_SENTINEL, SESSION_EMAIL, SECRET_SENTINEL]) {
        expect(text, `status ${status}`).not.toContain(forbidden);
      }
      // The classification is still worth reading.
      expect(onlyDiagnostic(state).providerDiagnostic?.failureCategory).toBe("PROVIDER_HTTP_ERROR");
      expect(onlyDiagnostic(state).providerDiagnostic?.providerHttpStatus).toBe(status);
    }
  });
});
