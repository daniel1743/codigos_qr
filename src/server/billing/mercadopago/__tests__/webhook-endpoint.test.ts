import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  BillingCustomerRecord,
  BillingProvider,
  BillingSubscriptionRecord,
  NormalizedSubscriptionInput,
  SafeBillingDiagnostic,
} from "../../../../lib/billing/billing.types";
import { applyNormalizedEvent, type ApplicationStore } from "../../application";
import { MercadoPagoError, type MercadoPagoClient } from "../client";
import { createMercadoPagoPlanResolver } from "../plan";
import { createMercadoPagoResourceFetcher, MERCADOPAGO_RESOURCE_PATHS } from "../resource-fetcher";
import {
  buildMercadoPagoSignatureManifest,
  MERCADOPAGO_REQUEST_ID_HEADER,
  MERCADOPAGO_SIGNATURE_HEADER,
} from "../webhook-verifier";
import {
  buildMercadoPagoEventId,
  createMercadoPagoWebhookHandler,
  MERCADOPAGO_DATA_ID_QUERY_KEY,
  MERCADOPAGO_WEBHOOK_PATH,
  MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS,
  type MercadoPagoWebhookDeps,
  type MercadoPagoWebhookDiagnostic,
} from "../webhook-endpoint";

/**
 * MP-M2B · MERCADO PAGO WEBHOOK INTAKE ENDPOINT
 *
 * The endpoint is driven through its dependency seam, with the REAL canonical
 * pieces wherever they carry the rule being pinned:
 *
 *   · the real verifier — "verified" means a genuine HMAC over the manifest;
 *   · the real resource fetcher over a mock HTTP client — the assertions are on
 *     the PATHS Mercado Pago would be asked for (`/v1/payments/{id}` → the
 *     preapproval behind it), not on a stub's opinion;
 *   · the real plan resolver — fail-closed exactly as in production;
 *   · the real application core (`applyNormalizedEvent`) over a double store, so
 *     "applied" means the canonical writer actually ran.
 *
 * The double claim mirrors the SQL exactly — insert, or re-claim a `failed` row;
 * a `processing`/`processed` row returns false — because that property is what
 * makes "no double apply" true.
 *
 * The failure matrix asserts ZERO side effects, and the side-effect log is what
 * makes that checkable: it records every fetch, claim, release and store call.
 * The signature digests are computed here with the manifest builder whose shape
 * is pinned by known-answer vectors in `webhook-verifier.test.ts`.
 */

/* ================================ fixtures ================================ */

const SECRET = "cripqer-mp-m2b-test-secret";
const ACCESS_TOKEN = "TEST-ACCESS-TOKEN-DO-NOT-LEAK-0001";
const DATA_ID = "PREAPPROVAL123";
const REQUEST_ID = "req-m2b-1";
const USER_ID = "user_1";
const PRO_PLAN_ID = "PLAN_PRO";
const PAYMENT_ID = "PAY123";
const AUTHORIZED_PAYMENT_ID = "AUTH123";
const UNLINKED_PAYMENT_ID = "PAY-NOT-A-SUBSCRIPTION";

/** Milliseconds clock, and the SAME instant expressed in the seconds `ts` uses. */
const NOW_MS = 1_700_000_000_000;
const NOW_S = 1_700_000_000;

const BASE_URL = `https://www.cripqer.dev${MERCADOPAGO_WEBHOOK_PATH}`;

const PREAPPROVAL = {
  id: DATA_ID,
  status: "authorized",
  preapproval_plan_id: PRO_PLAN_ID,
  payer_id: 555,
  auto_recurring: {
    frequency: 1,
    frequency_type: "months",
    currency_id: "CLP",
    transaction_amount: 7990,
  },
  next_payment_date: "2026-11-01T00:00:00.000Z",
  last_modified: "2026-10-22T00:00:00.000Z",
};

const PAYMENT = {
  id: PAYMENT_ID,
  status: "approved",
  preapproval_id: DATA_ID,
  transaction_amount: 7990,
  currency_id: "CLP",
};

const AUTHORIZED_PAYMENT = {
  id: AUTHORIZED_PAYMENT_ID,
  preapproval_id: DATA_ID,
  status: "processed",
  payment_id: PAYMENT_ID,
};

/** A payment that references no preapproval: not a subscription payment. */
const UNLINKED_PAYMENT = { id: UNLINKED_PAYMENT_ID, status: "approved" };

const EXISTING_SUBSCRIPTION: BillingSubscriptionRecord = {
  id: "sub_existing",
  user_id: USER_ID,
  plan_id: "pro",
  provider: "mercado_pago",
  billing_customer_id: null,
  provider_customer_id: "555",
  provider_subscription_id: DATA_ID,
  billing_interval: "monthly",
  currency: "CLP",
  status: "active",
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  payment_method_label: null,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
};

/** What the mock Mercado Pago API answers, per path. */
const API: Record<string, unknown> = {
  [MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID)]: PREAPPROVAL,
  [MERCADOPAGO_RESOURCE_PATHS.payment!(PAYMENT_ID)]: PAYMENT,
  [MERCADOPAGO_RESOURCE_PATHS.payment!(UNLINKED_PAYMENT_ID)]: UNLINKED_PAYMENT,
  [MERCADOPAGO_RESOURCE_PATHS.authorized_payment!(AUTHORIZED_PAYMENT_ID)]: AUTHORIZED_PAYMENT,
};

/* ============================== signing helper ============================ */

function digestFor(
  ts: string,
  dataId: string | null = DATA_ID,
  requestId: string | null = REQUEST_ID,
  secret: string = SECRET,
): string {
  const manifest = buildMercadoPagoSignatureManifest({ dataId, requestId, ts });
  return createHmac("sha256", secret).update(manifest, "utf8").digest("hex");
}

/* ================================= harness ================================ */

interface HarnessState {
  /** Every observable side effect, in order. Empty means "nothing happened". */
  calls: string[];
  fetches: string[];
  claims: string[];
  processed: string[];
  releases: Array<{ eventId: string; diagnostic: SafeBillingDiagnostic }>;
  subscriptionWrites: NormalizedSubscriptionInput[];
  customerWrites: Array<{
    user_id: string;
    provider: BillingProvider;
    provider_customer_id: string;
  }>;
  /** `billing_events` rows, by event id. */
  rows: Map<string, "processing" | "processed" | "failed">;
  diagnostics: MercadoPagoWebhookDiagnostic[];
}

interface HarnessOptions {
  webhookSecret?: string | null;
  /** `null` models a first activation: no canonical association exists yet. */
  existingSubscription?: BillingSubscriptionRecord | null;
  /** Throws from the provider client, as a typed Mercado Pago failure would. */
  clientError?: MercadoPagoError | null;
  proPlanId?: string | null;
  claimThrows?: boolean;
  markThrows?: boolean;
  storeThrows?: boolean;
}

function makeHarness(options: HarnessOptions = {}) {
  const state: HarnessState = {
    calls: [],
    fetches: [],
    claims: [],
    processed: [],
    releases: [],
    subscriptionWrites: [],
    customerWrites: [],
    rows: new Map(),
    diagnostics: [],
  };

  const client: MercadoPagoClient = {
    async getJson(path: string): Promise<unknown> {
      state.calls.push(`getJson:${path}`);
      state.fetches.push(path);
      if (options.clientError) throw options.clientError;
      if (!(path in API)) {
        throw new MercadoPagoError("NOT_FOUND", "Mercado Pago resource not found.", 404);
      }
      return API[path];
    },
  };

  const store: ApplicationStore = {
    async getSubscriptionByProviderId(provider, providerSubscriptionId) {
      state.calls.push(`getSubscriptionByProviderId:${provider}:${providerSubscriptionId}`);
      return options.existingSubscription ?? null;
    },
    async upsertNormalizedSubscription(input) {
      state.calls.push("upsertNormalizedSubscription");
      if (options.storeThrows) throw new Error(`store exploded with ${ACCESS_TOKEN}`);
      state.subscriptionWrites.push(input);
      return {
        ...input,
        id: "sub_new",
        created_at: "2026-10-22T00:00:00.000Z",
        updated_at: "2026-10-22T00:00:00.000Z",
      } satisfies BillingSubscriptionRecord;
    },
    async getBillingCustomer(userId, provider) {
      state.calls.push(`getBillingCustomer:${userId}:${provider}`);
      return null;
    },
    async upsertBillingCustomer(input) {
      state.calls.push("upsertBillingCustomer");
      state.customerWrites.push(input);
      return {
        id: "customer_1",
        ...input,
        created_at: "2026-10-22T00:00:00.000Z",
        updated_at: "2026-10-22T00:00:00.000Z",
      } satisfies BillingCustomerRecord;
    },
  };

  const deps: MercadoPagoWebhookDeps = {
    webhookSecret: options.webhookSecret === undefined ? SECRET : options.webhookSecret,
    fetcher: createMercadoPagoResourceFetcher(client),
    idempotency: {
      async claim(provider, eventId) {
        state.calls.push(`claim:${provider}:${eventId}`);
        state.claims.push(eventId);
        if (options.claimThrows) throw new Error(`claim exploded with ${ACCESS_TOKEN}`);
        // Mirrors `claim_billing_event`: insert, or re-claim only a failed row.
        if (!state.rows.has(eventId) || state.rows.get(eventId) === "failed") {
          state.rows.set(eventId, "processing");
          return true;
        }
        return false;
      },
      async markProcessed(provider, eventId) {
        state.calls.push(`markProcessed:${provider}:${eventId}`);
        state.processed.push(eventId);
        if (options.markThrows) throw new Error(`mark exploded with ${ACCESS_TOKEN}`);
        state.rows.set(eventId, "processed");
      },
      async release(provider, eventId, diagnostic) {
        state.calls.push(`release:${provider}:${eventId}`);
        state.releases.push({
          eventId,
          diagnostic: diagnostic ?? { error_code: null, diagnostic_reference: null },
        });
        state.rows.set(eventId, "failed");
      },
    },
    application: {
      store,
      planResolver: createMercadoPagoPlanResolver({
        proPlanId: options.proPlanId === undefined ? PRO_PLAN_ID : options.proPlanId,
      }),
    },
    now: () => NOW_MS,
    onDiagnostic: (diagnostic) => {
      state.diagnostics.push(diagnostic);
    },
  };

  return { deps, state, handler: createMercadoPagoWebhookHandler(deps) };
}

/* ============================ request builders ============================ */

interface RequestOptions {
  body?: unknown;
  rawBody?: string;
  method?: string;
  ts?: string;
  dataId?: string | null;
  requestId?: string | null;
  secret?: string;
  digest?: string;
  omitSignature?: boolean;
  headers?: Record<string, string>;
  extraQuery?: string;
}

/** A thin Mercado Pago notification. Topic and action; never any state. */
function notificationBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 987654321,
    live_mode: true,
    type: "preapproval",
    action: "preapproval.updated",
    date_created: "2026-10-22T00:00:00.000Z",
    data: { id: DATA_ID },
    ...overrides,
  };
}

function buildRequest(options: RequestOptions = {}): Request {
  const ts = options.ts ?? String(NOW_S);
  const dataId = options.dataId === undefined ? DATA_ID : options.dataId;
  const requestId = options.requestId === undefined ? REQUEST_ID : options.requestId;
  const method = options.method ?? "POST";

  const params = new URLSearchParams();
  if (dataId !== null) params.set(MERCADOPAGO_DATA_ID_QUERY_KEY, dataId);
  const query = `${params.toString()}${options.extraQuery ? `&${options.extraQuery}` : ""}`;
  const url = query === "" ? BASE_URL : `${BASE_URL}?${query}`;

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (requestId !== null) headers[MERCADOPAGO_REQUEST_ID_HEADER] = requestId;
  if (!options.omitSignature) {
    const secret = options.secret === undefined ? SECRET : options.secret;
    const digest = options.digest ?? digestFor(ts, dataId, requestId, secret);
    headers[MERCADOPAGO_SIGNATURE_HEADER] = `ts=${ts},v1=${digest}`;
  }
  Object.assign(headers, options.headers ?? {});

  const body =
    options.rawBody ??
    JSON.stringify(options.body === undefined ? notificationBody() : options.body);

  return new Request(url, {
    method,
    headers,
    ...(method === "GET" || method === "HEAD" ? {} : { body }),
  });
}

async function readStatus(response: Response): Promise<string> {
  const payload = (await response.json()) as { status?: unknown };
  return String(payload.status);
}

/* ===================== 1. a valid signature continues ===================== */

describe("MP-M2B.1 · a valid signature continues the canonical pipeline", () => {
  it("verifies, fetches authoritatively, applies and acknowledges", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(buildRequest());

    expect(response.status).toBe(200);
    expect(await readStatus(response)).toBe("APPLIED");
    // The authoritative fetch used the SIGNED resource id, and only the
    // preapproval path was needed.
    expect(state.fetches).toEqual([MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID)]);
    expect(state.subscriptionWrites).toHaveLength(1);
    expect(state.subscriptionWrites[0]!.status).toBe("active");
    expect(state.subscriptionWrites[0]!.plan_id).toBe("pro");
    expect(state.rows.get(buildMercadoPagoEventId(DATA_ID, REQUEST_ID))).toBe("processed");
  });

  it("applies the FETCHED state, never a plan or status carried by the body", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(
      buildRequest({
        body: notificationBody({
          data: { id: DATA_ID, status: "authorized", plan_id: "attacker-plan" },
        }),
      }),
    );

    expect(await readStatus(response)).toBe("APPLIED");
    // The plan came from the fetched resource (`preapproval_plan_id`), not from
    // the `plan_id` the body tried to inject.
    expect(state.subscriptionWrites[0]!.plan_id).toBe("pro");
  });
});

/* ====================== 2-4. rejection, with zero effects ================= */

describe("MP-M2B.2 · the signature gate fails closed", () => {
  it("rejects an invalid signature without a single side effect", async () => {
    const { handler, state } = makeHarness();

    const response = await handler(buildRequest({ digest: "f".repeat(64) }));

    expect(response.status).toBe(401);
    expect(await readStatus(response)).toBe("REJECTED");
    expect(state.calls).toEqual([]);
    expect(state.diagnostics.at(-1)?.rejectionReason).toBe("SIGNATURE_MISMATCH");
  });

  it("rejects an absent signature header without a single side effect", async () => {
    const { handler, state } = makeHarness();

    const response = await handler(buildRequest({ omitSignature: true }));

    expect(response.status).toBe(401);
    expect(await readStatus(response)).toBe("REJECTED");
    expect(state.calls).toEqual([]);
    expect(state.diagnostics.at(-1)?.rejectionReason).toBe("MISSING_SIGNATURE_HEADER");
  });

  it("fails closed when no signing secret is configured", async () => {
    const { handler, state } = makeHarness({ webhookSecret: null });

    // Signed with what WOULD have been the secret: the endpoint must verify
    // nothing with an unconfigured key.
    const response = await handler(buildRequest());

    expect(response.status).toBe(401);
    expect(await readStatus(response)).toBe("REJECTED");
    expect(state.calls).toEqual([]);
    expect(state.diagnostics.at(-1)?.rejectionReason).toBe("MISSING_SECRET");
  });

  it("rejects a signature made with a different secret", async () => {
    const { handler, state } = makeHarness();

    const response = await handler(buildRequest({ secret: "some-other-secret" }));

    expect(response.status).toBe(401);
    expect(state.calls).toEqual([]);
  });

  it("answers a non-POST method with 405 and no effects", async () => {
    const { handler, state } = makeHarness();

    const response = await handler(buildRequest({ method: "GET" }));

    expect(response.status).toBe(405);
    expect(await readStatus(response)).toBe("METHOD_NOT_ALLOWED");
    expect(response.headers.get("allow")).toBe("POST");
    expect(state.calls).toEqual([]);
  });
});

/* ======================= 5-7. data.id provenance ======================== */

describe("MP-M2B.3 · data.id comes from the query, and only from the query", () => {
  it("reads the signed data.id from the query string", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(buildRequest({ dataId: DATA_ID }));

    expect(await readStatus(response)).toBe("APPLIED");
    expect(state.fetches).toEqual([MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID)]);
    expect(state.claims).toEqual([buildMercadoPagoEventId(DATA_ID, REQUEST_ID)]);
  });

  it("ignores a CONTRADICTORY data.id in the body", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(
      buildRequest({ body: notificationBody({ data: { id: "ATTACKER-CONTROLLED-ID" } }) }),
    );

    expect(await readStatus(response)).toBe("APPLIED");
    // The signature covered the query value; the body value is discarded BEFORE
    // the fetch, so it cannot redirect an authoritative lookup or the event key.
    expect(state.fetches).not.toContain(
      MERCADOPAGO_RESOURCE_PATHS.preapproval!("ATTACKER-CONTROLLED-ID"),
    );
    expect(state.fetches).toEqual([MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID)]);
    expect(state.claims).toEqual([buildMercadoPagoEventId(DATA_ID, REQUEST_ID)]);
  });

  it("ignores a CONTRADICTORY legacy `resource` field in the body", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(
      buildRequest({ body: notificationBody({ resource: "ATTACKER-LEGACY-ID" }) }),
    );

    expect(await readStatus(response)).toBe("APPLIED");
    expect(state.fetches).toEqual([MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID)]);
  });

  it("ignores an INVENTED data.id header", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    // The headers carry a `data.id` that Mercado Pago never sends. The signature
    // was computed over the query metadata, so it still verifies — which is the
    // proof that the header is not part of the manifest this endpoint builds.
    const response = await handler(buildRequest({ headers: { "data.id": "ATTACKER-HEADER-ID" } }));

    expect(await readStatus(response)).toBe("APPLIED");
    expect(state.fetches).toEqual([MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID)]);
  });

  it("rejects a request with no data.id in the query, with no effects", async () => {
    const { handler, state } = makeHarness();

    const response = await handler(buildRequest({ dataId: null }));

    expect(response.status).toBe(400);
    expect(await readStatus(response)).toBe("INVALID_REQUEST");
    expect(state.calls).toEqual([]);
    expect(state.diagnostics.at(-1)?.code).toBe("MISSING_DATA_ID");
  });
});

/* ====================== 8-10. freshness / replay ========================= */

describe("MP-M2B.4 · freshness window of 300 seconds", () => {
  it("documents the policy as an explicit constant", () => {
    expect(MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS).toBe(300);
  });

  it("rejects an old timestamp without any side effect", async () => {
    const { handler, state } = makeHarness();
    const ts = String(NOW_S - MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS - 1);

    const response = await handler(buildRequest({ ts }));

    expect(response.status).toBe(401);
    expect(state.diagnostics.at(-1)?.rejectionReason).toBe("TIMESTAMP_OUT_OF_TOLERANCE");
    expect(state.calls).toEqual([]);
  });

  it("rejects a future timestamp without any side effect", async () => {
    const { handler, state } = makeHarness();
    const ts = String(NOW_S + MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS + 1);

    const response = await handler(buildRequest({ ts }));

    expect(response.status).toBe(401);
    expect(state.diagnostics.at(-1)?.rejectionReason).toBe("TIMESTAMP_OUT_OF_TOLERANCE");
    expect(state.calls).toEqual([]);
  });

  it("accepts the boundary in BOTH directions", async () => {
    const old = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });
    const future = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const oldResponse = await old.handler(
      buildRequest({ ts: String(NOW_S - MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS) }),
    );
    const futureResponse = await future.handler(
      buildRequest({ ts: String(NOW_S + MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS) }),
    );

    expect(oldResponse.status).toBe(200);
    expect(futureResponse.status).toBe(200);
  });

  it("continues with a fresh timestamp", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(buildRequest({ ts: String(NOW_S - 5) }));

    expect(await readStatus(response)).toBe("APPLIED");
    expect(state.subscriptionWrites).toHaveLength(1);
  });
});

/* ====================== 11, 22, 23. idempotency ========================== */

describe("MP-M2B.5 · idempotency is the canonical claim, and only that", () => {
  it("answers a repeated notification 2xx without a second apply", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const first = await handler(buildRequest());
    const second = await handler(buildRequest());

    expect(await readStatus(first)).toBe("APPLIED");
    expect(second.status).toBe(200);
    expect(await readStatus(second)).toBe("DUPLICATE");
    // One fetch and one write across BOTH requests.
    expect(state.fetches).toHaveLength(1);
    expect(state.subscriptionWrites).toHaveLength(1);
  });

  it("does not re-apply an event that was already processed", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });
    const eventId = buildMercadoPagoEventId(DATA_ID, REQUEST_ID);

    await handler(buildRequest());
    expect(state.rows.get(eventId)).toBe("processed");

    const replay = await handler(buildRequest());

    expect(await readStatus(replay)).toBe("DUPLICATE");
    // The claim is consulted on every delivery; the row is what remembers.
    expect(state.claims).toEqual([eventId, eventId]);
    expect(state.processed).toEqual([eventId]);
  });

  it("calls the canonical writer at most once per event id", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    await handler(buildRequest());
    await handler(buildRequest());
    await handler(buildRequest());

    expect(state.subscriptionWrites).toHaveLength(1);
    expect(state.calls.filter((call) => call === "upsertNormalizedSubscription")).toHaveLength(1);
    expect(state.fetches).toHaveLength(1);
  });

  it("does not treat two DELIVERIES of the same resource as one event", async () => {
    // A different `x-request-id` is a different signed notification (a genuine
    // second event about the same preapproval), so it is processed on its own.
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    await handler(buildRequest({ requestId: "req-1" }));
    await handler(buildRequest({ requestId: "req-2" }));

    expect(state.claims).toEqual([
      buildMercadoPagoEventId(DATA_ID, "req-1"),
      buildMercadoPagoEventId(DATA_ID, "req-2"),
    ]);
    expect(state.subscriptionWrites).toHaveLength(2);
  });

  it("builds the event id from SIGNED metadata only", () => {
    expect(buildMercadoPagoEventId(DATA_ID, REQUEST_ID)).toBe(`${DATA_ID}:${REQUEST_ID}`);
    expect(buildMercadoPagoEventId(DATA_ID, null)).toBe(DATA_ID);
    expect(buildMercadoPagoEventId(DATA_ID, "   ")).toBe(DATA_ID);
  });

  it("keeps a failed event re-claimable, so redelivery can recover it", async () => {
    const { handler, state } = makeHarness({
      existingSubscription: EXISTING_SUBSCRIPTION,
      clientError: new MercadoPagoError("TIMEOUT", "timed out"),
    });
    const eventId = buildMercadoPagoEventId(DATA_ID, REQUEST_ID);

    const first = await handler(buildRequest());
    expect(await readStatus(first)).toBe("RETRY");
    expect(state.rows.get(eventId)).toBe("failed");
    expect(state.releases[0]!.diagnostic.error_code).toBe("PROVIDER_LOOKUP_FAILED");

    const redelivered = await handler(buildRequest());

    expect(await readStatus(redelivered)).toBe("RETRY");
    expect(state.claims).toEqual([eventId, eventId]);
    expect(state.fetches).toHaveLength(2);
    expect(state.rows.get(eventId)).toBe("failed");
  });

  it("does not let a claim failure become an apply", async () => {
    const { handler, state } = makeHarness({
      existingSubscription: EXISTING_SUBSCRIPTION,
      claimThrows: true,
    });

    const response = await handler(buildRequest());

    expect(response.status).toBe(500);
    expect(await readStatus(response)).toBe("FAILED");
    expect(state.fetches).toEqual([]);
    expect(state.subscriptionWrites).toEqual([]);
  });
});

/* ============ 12-14. authoritative lookup per resource type ============== */

describe("MP-M2B.6 · every subscription resource is fetched authoritatively", () => {
  it("follows a `payment` notification to its preapproval", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(
      buildRequest({
        dataId: PAYMENT_ID,
        body: notificationBody({
          type: "payment",
          action: "payment.updated",
          data: { id: PAYMENT_ID, status: "approved" },
        }),
      }),
    );

    expect(await readStatus(response)).toBe("APPLIED");
    // The payment path AND the preapproval behind it, in that order.
    expect(state.fetches).toEqual([
      MERCADOPAGO_RESOURCE_PATHS.payment!(PAYMENT_ID),
      MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID),
    ]);
    // The applied state is the PREAPPROVAL's, not the payment's `approved`.
    expect(state.subscriptionWrites[0]!.provider_subscription_id).toBe(DATA_ID);
    expect(state.subscriptionWrites[0]!.status).toBe("active");
  });

  it("follows an `authorized_payment` notification to its preapproval", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(
      buildRequest({
        dataId: AUTHORIZED_PAYMENT_ID,
        body: notificationBody({
          type: "authorized_payment",
          action: "authorized_payment.created",
          data: { id: AUTHORIZED_PAYMENT_ID },
        }),
      }),
    );

    expect(await readStatus(response)).toBe("APPLIED");
    expect(state.fetches).toEqual([
      MERCADOPAGO_RESOURCE_PATHS.authorized_payment!(AUTHORIZED_PAYMENT_ID),
      MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID),
    ]);
  });

  it("reads a `preapproval` notification straight from the preapproval path", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(
      buildRequest({ body: notificationBody({ type: "preapproval" }) }),
    );

    expect(await readStatus(response)).toBe("APPLIED");
    expect(state.fetches).toEqual([MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID)]);
  });

  it("treats a `subscription` topic as a preapproval", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(
      buildRequest({ body: notificationBody({ type: "subscription" }) }),
    );

    expect(await readStatus(response)).toBe("APPLIED");
    expect(state.fetches).toEqual([MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID)]);
  });
});

/* ================= 15-19. provider failures never become access ========== */

describe("MP-M2B.7 · provider failures never become access", () => {
  const cases: Array<{ name: string; error: MercadoPagoError; status: number }> = [
    { name: "401", error: new MercadoPagoError("UNAUTHORIZED", "rejected", 401), status: 503 },
    { name: "403", error: new MercadoPagoError("UNAUTHORIZED", "forbidden", 403), status: 503 },
    { name: "404", error: new MercadoPagoError("NOT_FOUND", "not found", 404), status: 503 },
    { name: "timeout", error: new MercadoPagoError("TIMEOUT", "timed out"), status: 503 },
    { name: "5xx", error: new MercadoPagoError("HTTP_ERROR", "server error", 500), status: 503 },
  ];

  for (const testCase of cases) {
    it(`answers a provider ${testCase.name} with a retryable status and no apply`, async () => {
      const { handler, state } = makeHarness({
        existingSubscription: EXISTING_SUBSCRIPTION,
        clientError: testCase.error,
      });
      const eventId = buildMercadoPagoEventId(DATA_ID, REQUEST_ID);

      const response = await handler(buildRequest());

      expect(response.status).toBe(testCase.status);
      expect(await readStatus(response)).toBe("RETRY");
      expect(state.subscriptionWrites).toEqual([]);
      expect(state.customerWrites).toEqual([]);
      // Released, not closed: a redelivery can claim it again.
      expect(state.rows.get(eventId)).toBe("failed");
      expect(state.diagnostics.at(-1)?.providerErrorCode).toBe(testCase.error.code);
    });
  }

  it("treats a payment that references no subscription as terminal", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(
      buildRequest({
        dataId: UNLINKED_PAYMENT_ID,
        body: notificationBody({ type: "payment", data: { id: UNLINKED_PAYMENT_ID } }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await readStatus(response)).toBe("IGNORED");
    // No subscription is invented out of a non-subscription payment.
    expect(state.subscriptionWrites).toEqual([]);
    expect(state.diagnostics.at(-1)?.providerErrorCode).toBe("UNLINKED_PAYMENT");
  });

  it("answers a provider failure with neither `success` nor an applied state", async () => {
    const { handler } = makeHarness({
      existingSubscription: EXISTING_SUBSCRIPTION,
      clientError: new MercadoPagoError("NOT_FOUND", "not found", 404),
    });

    const body = await (await handler(buildRequest())).text();

    expect(JSON.parse(body)).toEqual({ status: "RETRY" });
  });
});

/* ==================== 20-21. malformed / unsupported ==================== */

describe("MP-M2B.8 · malformed requests and unsupported notifications", () => {
  it("rejects a body that is not JSON, with no effects", async () => {
    const { handler, state } = makeHarness();

    const response = await handler(buildRequest({ rawBody: "not-json-at-all" }));

    expect(response.status).toBe(400);
    expect(await readStatus(response)).toBe("INVALID_REQUEST");
    expect(state.calls).toEqual([]);
  });

  it("rejects a JSON body that is not an object, with no effects", async () => {
    const { handler, state } = makeHarness();

    const response = await handler(buildRequest({ rawBody: "[1,2,3]" }));

    expect(response.status).toBe(400);
    expect(state.calls).toEqual([]);
  });

  it("acknowledges an unknown notification type without touching anything", async () => {
    const { handler, state } = makeHarness();

    const response = await handler(
      buildRequest({ body: notificationBody({ type: "merchant_order" }) }),
    );

    expect(response.status).toBe(200);
    expect(await readStatus(response)).toBe("IGNORED");
    // No claim, no fetch, no write: an unclassifiable topic cannot become Pro.
    expect(state.calls).toEqual([]);
    expect(state.rows.size).toBe(0);
    expect(state.diagnostics.at(-1)?.code).toBe("IGNORED_UNSUPPORTED_NOTIFICATION");
  });

  it("does not treat a `preapproval_plan` notification as a subscription", async () => {
    const { handler, state } = makeHarness();

    const response = await handler(
      buildRequest({ body: notificationBody({ type: "preapproval_plan" }) }),
    );

    expect(await readStatus(response)).toBe("IGNORED");
    expect(state.calls).toEqual([]);
  });

  it("does not treat an empty notification as a subscription", async () => {
    const { handler, state } = makeHarness();

    const response = await handler(buildRequest({ body: { id: 1 } }));

    expect(await readStatus(response)).toBe("IGNORED");
    expect(state.calls).toEqual([]);
  });
});

/* ======== 24-26. entitlements, query truth, pre-signature effects ======= */

describe("MP-M2B.9 · no entitlement, no query truth, no pre-signature effects", () => {
  it("never writes an entitlement, a grant, or a plan decision of its own", () => {
    const source = endpointSource();

    for (const forbidden of [
      "billing_grants",
      "insertBillingGrant",
      "getGrantsForUser",
      "resolveUserPlan",
      "isUserPro",
      "entitlement",
      "resolveEntitlement",
      "upsertBillingSubscription",
      "insertBillingSubscription",
    ]) {
      expect(source, forbidden).not.toContain(forbidden);
    }
    // The only writers reachable from the endpoint are the canonical ones: the
    // application core for subscription state, and the claim bridge over
    // `claim_billing_event` for idempotency. Neither is reimplemented here.
    expect(source).toContain("applyNormalizedEvent");
    expect(source).not.toContain("insert into");
    expect(source).not.toContain(".from(");
  });

  it("writes only through the canonical application core", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const response = await handler(buildRequest());

    // The write path stops at the canonical subscription row, in the canonical
    // order — claim first, then the provider read — with nothing read or written
    // about a caller's access.
    expect(await readStatus(response)).toBe("APPLIED");
    expect(state.calls).toEqual([
      `claim:mercado_pago:${buildMercadoPagoEventId(DATA_ID, REQUEST_ID)}`,
      `getJson:${MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID)}`,
      `getSubscriptionByProviderId:mercado_pago:${DATA_ID}`,
      "upsertBillingCustomer",
      "upsertNormalizedSubscription",
      `markProcessed:mercado_pago:${buildMercadoPagoEventId(DATA_ID, REQUEST_ID)}`,
    ]);
  });

  it("cannot be told anything by a `success` query parameter", async () => {
    expect(endpointSource()).not.toContain("success");

    const unsigned = makeHarness();
    const signed = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    const rejected = await unsigned.handler(
      buildRequest({
        extraQuery: "success=true&status=approved&plan=pro",
        digest: "a".repeat(64),
      }),
    );
    const applied = await signed.handler(
      buildRequest({ extraQuery: "success=true&status=approved&plan=pro" }),
    );

    // A query string cannot grant: without a signature it is still a rejection…
    expect(rejected.status).toBe(401);
    expect(unsigned.state.calls).toEqual([]);
    // …and with one, the outcome is still decided by the FETCHED preapproval.
    expect(await readStatus(applied)).toBe("APPLIED");
    expect(signed.state.subscriptionWrites[0]!.plan_id).toBe("pro");
    expect(signed.state.subscriptionWrites[0]!.status).toBe("active");
  });

  it("produces zero side effects before a valid signature", async () => {
    const scenarios: Array<[string, RequestOptions, number]> = [
      ["invalid digest", { digest: "0".repeat(64) }, 401],
      ["absent signature", { omitSignature: true }, 401],
      ["stale timestamp", { ts: String(NOW_S - 10_000) }, 401],
      ["future timestamp", { ts: String(NOW_S + 10_000) }, 401],
      ["missing data.id", { dataId: null }, 400],
    ];

    for (const [name, options, expected] of scenarios) {
      const { handler, state } = makeHarness();
      const response = await handler(buildRequest(options));

      expect(response.status, name).toBe(expected);
      expect(state.calls, name).toEqual([]);
      expect(state.fetches, name).toEqual([]);
      expect(state.subscriptionWrites, name).toEqual([]);
      expect(state.rows.size, name).toBe(0);
    }
  });

  it("does not even READ the body of an unverified request", async () => {
    // The body is deliberately left unconsumed by the caller: if the handler
    // touched it before verifying, `bodyUsed` would say so. The request carries
    // a signed-looking URL and no signature at all.
    const { handler } = makeHarness();

    const request = new Request(`${BASE_URL}?${MERCADOPAGO_DATA_ID_QUERY_KEY}=${DATA_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(notificationBody()),
    });

    const response = await handler(request);

    expect(response.status).toBe(401);
    expect(request.bodyUsed).toBe(false);
  });
});

/* ================= 27-29. nothing sensitive escapes ==================== */

describe("MP-M2B.10 · secrets, tokens and internals never escape", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never writes the signing secret to a log or a diagnostic", async () => {
    const consoleSpies = spyOnConsole();
    const { handler, state } = makeHarness({ webhookSecret: null });

    await handler(buildRequest());
    await handler(buildRequest({ digest: "b".repeat(64) }));
    await handler(buildRequest({ omitSignature: true }));

    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(JSON.stringify(state.diagnostics)).not.toContain(SECRET);
  });

  it("never writes the access token to a log, a diagnostic or a response", async () => {
    const consoleSpies = spyOnConsole();
    // A hostile provider error that carries the token in its message: the
    // endpoint forwards no message anywhere, so this cannot leak.
    const { handler, state } = makeHarness({
      clientError: new MercadoPagoError("HTTP_ERROR", `provider said ${ACCESS_TOKEN}`, 500),
    });

    const response = await handler(buildRequest());
    const body = await response.text();

    expect(body).not.toContain(ACCESS_TOKEN);
    expect(JSON.stringify(state.diagnostics)).not.toContain(ACCESS_TOKEN);
    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
  });

  it("never echoes the signature back", async () => {
    const { handler } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });
    const digest = digestFor(String(NOW_S));

    const response = await handler(buildRequest({ digest }));
    const body = await response.text();

    expect(body).not.toContain(digest);
    expect(body).not.toContain("v1=");
    expect(body).not.toContain("ts=");
  });

  it("keeps an internal failure's message internal and releases the event", async () => {
    // A store that throws carries the token in its message. The endpoint must not
    // forward the message anywhere; it answers a closed status and releases the
    // event so a redelivery can try again.
    const { handler, state } = makeHarness({
      existingSubscription: EXISTING_SUBSCRIPTION,
      storeThrows: true,
    });
    const eventId = buildMercadoPagoEventId(DATA_ID, REQUEST_ID);

    const response = await handler(buildRequest());
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({ status: "RETRY" });
    expect(body).not.toContain("Error");
    expect(body).not.toContain("exploded");
    expect(body).not.toContain(ACCESS_TOKEN);
    expect(state.rows.get(eventId)).toBe("failed");
    // The subscription row was never written.
    expect(state.subscriptionWrites).toEqual([]);
  });

  it("answers a bookkeeping failure with a closed 500", async () => {
    const { handler, state } = makeHarness({
      existingSubscription: EXISTING_SUBSCRIPTION,
      markThrows: true,
    });

    const response = await handler(buildRequest());
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({ status: "FAILED" });
    expect(body).not.toContain("exploded");
    expect(body).not.toContain(ACCESS_TOKEN);
    // The state WAS applied; only closing the event row failed. Reporting that as
    // a clean success would be a lie in the other direction.
    expect(state.subscriptionWrites).toHaveLength(1);
  });

  it("rejects with no reason, and keeps the reason internal", async () => {
    const consoleSpies = spyOnConsole();
    const { handler, state } = makeHarness();

    const response = await handler(buildRequest({ omitSignature: true }));
    const body = await response.text();

    expect(response.status).toBe(401);
    expect(JSON.parse(body)).toEqual({ status: "REJECTED" });
    expect(body).not.toContain("SIGNATURE");
    expect(body).not.toContain("MISSING");
    // The reason reaches the sink (ops), never the caller.
    expect(state.diagnostics.at(-1)?.rejectionReason).toBe("MISSING_SIGNATURE_HEADER");
    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
  });

  it("does not forward a provider message into the response", async () => {
    const { handler } = makeHarness({
      existingSubscription: EXISTING_SUBSCRIPTION,
      clientError: new MercadoPagoError("UNAUTHORIZED", "provider body echo: secret-ish text", 401),
    });

    const body = await (await handler(buildRequest())).text();

    expect(body).not.toContain("provider body echo");
    expect(JSON.parse(body)).toEqual({ status: "RETRY" });
  });
});

/* ======================= 30. complete happy path ======================== */

describe("MP-M2B.11 · complete happy path and its honest boundaries", () => {
  it("runs the whole canonical pipeline in order, once", async () => {
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });
    const eventId = buildMercadoPagoEventId(PAYMENT_ID, REQUEST_ID);

    const response = await handler(
      buildRequest({
        dataId: PAYMENT_ID,
        body: notificationBody({
          type: "payment",
          action: "payment.created",
          data: { id: PAYMENT_ID },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await readStatus(response)).toBe("APPLIED");
    expect(state.calls).toEqual([
      `claim:mercado_pago:${eventId}`,
      `getJson:${MERCADOPAGO_RESOURCE_PATHS.payment!(PAYMENT_ID)}`,
      `getJson:${MERCADOPAGO_RESOURCE_PATHS.preapproval!(DATA_ID)}`,
      `getSubscriptionByProviderId:mercado_pago:${DATA_ID}`,
      "upsertBillingCustomer",
      "upsertNormalizedSubscription",
      `markProcessed:mercado_pago:${eventId}`,
    ]);
    expect(state.diagnostics.at(-1)?.code).toBe("APPLIED");
    expect(state.diagnostics.at(-1)?.status).toBe("APPLIED");
    expect(state.diagnostics.at(-1)?.httpStatus).toBe(200);
  });

  it("does not apply a first activation it cannot attribute to a user", async () => {
    // No canonical association exists yet and a webhook carries no trusted user
    // id, so ownership cannot be proven. Fail closed, ask for a redelivery and
    // write nothing — the documented boundary of this phase.
    const { handler, state } = makeHarness({ existingSubscription: null });

    const response = await handler(buildRequest());

    expect(response.status).toBe(503);
    expect(await readStatus(response)).toBe("RETRY");
    expect(state.subscriptionWrites).toEqual([]);
    expect(state.rows.get(buildMercadoPagoEventId(DATA_ID, REQUEST_ID))).toBe("failed");
    expect(state.releases[0]!.diagnostic.error_code).toBe("OWNER_REQUIRED");
  });

  it("does not apply while no canonical plan mapping is configured", async () => {
    const { handler, state } = makeHarness({
      existingSubscription: EXISTING_SUBSCRIPTION,
      proPlanId: null,
    });

    const response = await handler(buildRequest());

    expect(response.status).toBe(503);
    expect(await readStatus(response)).toBe("RETRY");
    expect(state.subscriptionWrites).toEqual([]);
    expect(state.releases[0]!.diagnostic.error_code).toBe("PLAN_MAPPING_REQUIRED");
  });

  it("applies exactly what the application core applies, with no extra writes", async () => {
    // Cross-check: the write the endpoint produces is identical to the one the
    // canonical core produces for the same normalized event, so the endpoint adds
    // no field, no default and no plan of its own.
    const { handler, state } = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });
    const control = makeHarness({ existingSubscription: EXISTING_SUBSCRIPTION });

    await handler(buildRequest());

    await applyNormalizedEvent(control.deps.application, {
      eventId: buildMercadoPagoEventId(DATA_ID, REQUEST_ID),
      provider: "mercado_pago",
      type: "SUBSCRIPTION_ACTIVATED",
      occurredAt: "2026-10-22T00:00:00.000Z",
      providerCustomerId: "555",
      providerSubscriptionId: DATA_ID,
      providerPlanId: PRO_PLAN_ID,
      billingInterval: "monthly",
      currency: "CLP",
      status: "active",
      currentPeriodStart: "2026-10-22T00:00:00.000Z",
      currentPeriodEnd: "2026-11-01T00:00:00.000Z",
      cancelAtPeriodEnd: null,
      requiresAuthoritativeLookup: false,
    });

    expect(state.subscriptionWrites).toEqual(control.state.subscriptionWrites);
    expect(state.subscriptionWrites).toHaveLength(1);
  });
});

/* ============================== structural =============================== */

describe("MP-M2B.12 · the endpoint module's own source contract", () => {
  it("reads exactly one query parameter, and it is the signed data.id", () => {
    const reads = endpointSource().match(/searchParams\.get\([^)]*\)/g) ?? [];
    expect(reads).toEqual(["searchParams.get(MERCADOPAGO_DATA_ID_QUERY_KEY)"]);
  });

  it("reads exactly two headers, and data.id is not one of them", () => {
    const reads = (endpointSource().match(/headers\.get\([^)]*\)/g) ?? []).map((read) =>
      read.replace(/\s+/g, ""),
    );
    expect(reads.sort()).toEqual(
      [
        "headers.get(MERCADOPAGO_REQUEST_ID_HEADER)",
        "headers.get(MERCADOPAGO_SIGNATURE_HEADER)",
      ].sort(),
    );
  });

  it("hardcodes the freshness window instead of reading it from the environment", () => {
    const source = endpointSource();
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("VITE_");
    expect(source).toContain("toleranceSeconds: MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS");
  });

  it("keeps every secret-bearing read inside the production wiring", () => {
    const source = endpointSource();
    // The signing secret and the access token reach the pipeline only through
    // the injected seam; the module never names either variable.
    expect(source).not.toContain("MERCADOPAGO_WEBHOOK_SECRET");
    expect(source).not.toContain("MERCADOPAGO_ACCESS_TOKEN");
    expect(source).toContain("readMercadoPagoConfigFromEnv");
  });

  it("passes no trusted user id to the application core", () => {
    // A webhook has no authenticated user. If this call ever grew a third
    // argument, ownership could be asserted by whoever sends the request.
    const calls = endpointSource().match(/applyNormalizedEvent\([^;]*?\)/g) ?? [];
    expect(calls).toEqual(["applyNormalizedEvent(deps.application, normalized)"]);
  });

  it("does not register a provider adapter", () => {
    const source = endpointSource();
    expect(source).not.toContain("adapters");
    expect(source).not.toContain("createSession");
    expect(source).not.toContain("changePlan");
    expect(source).not.toContain("cancelSubscription");
  });
});

/* =========================== the route file ============================= */

describe("MP-M2B.13 · the route file wires the canonical path", () => {
  it("registers the documented URL and the path constant agrees with it", () => {
    const source = routeSource();

    expect(MERCADOPAGO_WEBHOOK_PATH).toBe("/api/billing/mercadopago/webhook");
    expect(source).toContain(`createFileRoute("${MERCADOPAGO_WEBHOOK_PATH}")`);
    // POST is the real handler; ANY catches every other method so an unregistered
    // verb gets a 405 from the intake instead of falling through to a page render.
    expect(source).toContain("POST:");
    expect(source).toContain("ANY:");
  });

  it("imports the server-only intake DYNAMICALLY, never at module scope", () => {
    const source = routeSource();

    // A static import would put Supabase and the Mercado Pago credentials in the
    // module graph the client build walks. This is the assertion that keeps the
    // build honest without needing to inspect a bundle.
    expect(source).toContain("await import(");
    const staticImport = /^\s*import[^;]*webhook-endpoint/m;
    expect(staticImport.test(source)).toBe(false);
    expect(source).toContain("handleMercadoPagoWebhook");
  });

  it("keeps every decision out of the transport file", () => {
    const source = routeSource();

    for (const forbidden of ["verifyMercadoPagoSignature", "applyNormalizedEvent", "secret"]) {
      expect(source, forbidden).not.toContain(forbidden);
    }
  });
});

/* ================================ helpers =============================== */

const SOURCE_PATH = join(process.cwd(), "src/server/billing/mercadopago/webhook-endpoint.ts");
const ROUTE_PATH = join(process.cwd(), "src/routes/api.billing.mercadopago.webhook.ts");

/** The module's EXECUTABLE source: comments stripped, so prose cannot satisfy a test. */
function endpointSource(): string {
  return stripComments(readFileSync(SOURCE_PATH, "utf8"));
}

/** The route file's executable source, stripped the same way. */
function routeSource(): string {
  return stripComments(readFileSync(ROUTE_PATH, "utf8"));
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/[^\r\n]*/, ""))
    .join("\n");
}

function spyOnConsole() {
  return [
    vi.spyOn(console, "log").mockImplementation(() => {}),
    vi.spyOn(console, "info").mockImplementation(() => {}),
    vi.spyOn(console, "warn").mockImplementation(() => {}),
    vi.spyOn(console, "error").mockImplementation(() => {}),
    vi.spyOn(console, "debug").mockImplementation(() => {}),
  ];
}
