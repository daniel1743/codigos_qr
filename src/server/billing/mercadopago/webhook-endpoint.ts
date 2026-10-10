import "@tanstack/react-start/server-only";

import {
  applyNormalizedEvent,
  type ApplicationDeps,
  type ApplicationResult,
  type ApplicationStore,
} from "../application.ts";
import {
  createCanonicalIdempotencyBridge,
  intakeMercadoPagoNotification,
  type CanonicalIdempotencyBridge,
  type NormalizedBillingEvent,
  type ProviderResourceFetcher,
  type WebhookLookupInstruction,
} from "../webhooks.ts";
import {
  createMercadoPagoClient,
  MercadoPagoError,
  readMercadoPagoConfigFromEnv,
  type MercadoPagoErrorCode,
} from "./client.ts";
import { createMercadoPagoPlanResolver } from "./plan.ts";
import { createMercadoPagoResourceFetcher, resolveMercadoPagoLookup } from "./resource-fetcher.ts";
import {
  MERCADOPAGO_REQUEST_ID_HEADER,
  MERCADOPAGO_SIGNATURE_HEADER,
  verifyMercadoPagoSignature,
  type MercadoPagoWebhookRejectionReason,
} from "./webhook-verifier.ts";

/**
 * CRIPQER BILLING — MERCADO PAGO WEBHOOK INTAKE ENDPOINT (MP-M2B)
 *
 * The HTTP surface that turns a Mercado Pago notification into canonical Billing
 * state. It is the only module in the Mercado Pago adapter that receives a
 * `Request`, and it holds it late: the pipeline runs in a fixed order and nothing
 * observable happens before a signature is known to be genuine.
 *
 *     request metadata only
 *       -> verifyMercadoPagoSignature    (signature, then 300s freshness window)
 *       -> parse body                    (topic/reference only, never state)
 *       -> claimBillingEvent             (atomic, provider-scoped)
 *       -> authoritative resource fetch  (Mercado Pago API, MP-M1 fetcher)
 *       -> normalize
 *       -> applyNormalizedEvent          (canonical subscription core)
 *
 * THERE IS NO PARALLEL PIPELINE. Every step is a frozen canonical primitive:
 * `verifyMercadoPagoSignature` (MP-M2), the intake/normalize core in
 * `../webhooks.ts`, the idempotency bridge over `claim_billing_event`, the
 * authoritative fetcher (MP-M1) and `applyNormalizedEvent`. This module adds
 * transport, ordering, status codes and the wiring — and nothing else.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   · No direct write to `billing_subscriptions`, `billing_customers` or
 *     `billing_grants`: the only writer is `applyNormalizedEvent`, through its
 *     `ApplicationStore` seam.
 *   · No entitlement resolution, no plan forcing. A verified and applied
 *     subscription is not an entitlement decision, and this module cannot make
 *     one.
 *   · No trust in the BODY. Mercado Pago's signature covers request METADATA
 *     (`data.id`, `x-request-id`, `ts`) and not one byte of the JSON body, so the
 *     body is read for exactly two things: which topic this is, and the fact that
 *     an event happened. The resource id used for the authoritative fetch is
 *     ALWAYS the signed query parameter; a body `data.id` that contradicts it is
 *     discarded, and a `data.id` HEADER (which Mercado Pago does not send) is
 *     never consulted — not for verification, not for the fetch, not anywhere.
 *   · No retry loop, no queue, no second dedupe system. Redelivery is Mercado
 *     Pago's job, and a failed event is left re-claimable so redelivery works.
 *   · No secret, token, signature, provider body or stack in any response. The
 *     response is a closed status word; the optional diagnostic sink carries
 *     closed enum codes and never a value.
 *   · No provider adapter registration (`adapters/index.ts` untouched), no
 *     checkout, no `createSession`, no cancel/reactivate/changePlan.
 */

/* ============================== public surface ============================ */

/**
 * Public URL of this endpoint.
 *
 * TanStack Start file-based routing maps
 * `src/routes/api.billing.mercadopago.webhook.ts` to this path. It is the URL to
 * register in the Mercado Pago dashboard.
 */
export const MERCADOPAGO_WEBHOOK_PATH = "/api/billing/mercadopago/webhook";

/**
 * Replay window for this endpoint, in seconds. POLICY, NOT CONFIGURATION.
 *
 * The verifier's primitive defaults to NO freshness check — exactly like the
 * official SDK, which publishes no window and leaves the choice to the host.
 * MP-M2A.1 recorded that absence as limitation R2. This endpoint closes it with a
 * fixed 300 seconds: a `ts` more than five minutes in the past OR in the future
 * is rejected, symmetric in both directions.
 *
 * Why a literal instead of an environment variable: an operator who could widen
 * this to infinity (or delete it) would have a way to disable replay protection
 * for no operational benefit. Five minutes is far wider than any plausible clock
 * skew between Mercado Pago and this host, and far narrower than the useful life
 * of a captured notification.
 */
export const MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS = 300;

/** The signed resource reference. A QUERY parameter — never a header, never the body. */
export const MERCADOPAGO_DATA_ID_QUERY_KEY = "data.id";

/** The only method this endpoint accepts. */
export const MERCADOPAGO_WEBHOOK_METHOD = "POST";

/**
 * The machine-readable outcome.
 *
 * It is what the response body says, and the HTTP status is a pure function of
 * it — so nothing can acquire a friendlier status code than its outcome deserves.
 */
export type MercadoPagoWebhookStatus =
  /** Verified, lookup succeeded, canonical state applied. */
  | "APPLIED"
  /** Verified, but this exact notification was already claimed. No second apply. */
  | "DUPLICATE"
  /** Verified, and there is permanently nothing to apply. Acknowledged, not applied. */
  | "IGNORED"
  /** Signature, freshness window or signing secret refused the request. */
  | "REJECTED"
  /** The request could not be read as a Mercado Pago notification. Nothing touched. */
  | "INVALID_REQUEST"
  /** Not applied, and a redelivery can legitimately succeed. */
  | "RETRY"
  /** Internal failure. Nothing applied; the event stays re-claimable. */
  | "FAILED"
  /** Method other than POST. */
  | "METHOD_NOT_ALLOWED";

/**
 * Status codes.
 *
 * `REJECTED` is 401 and carries no reason: a caller that cannot sign does not get
 * to learn which rejection cause it hit. `IGNORED` is 200 on purpose — Mercado
 * Pago stops retrying what it believes we accepted, and for a permanently
 * unprocessable notification (an unknown topic, a payment that is not a
 * subscription payment) retrying forever helps nobody. `RETRY` is 503 so the
 * provider's own redelivery is what recovers us; `FAILED` is 500 with the event
 * released, so a redelivery re-claims it.
 */
const STATUS_HTTP: Record<MercadoPagoWebhookStatus, number> = {
  APPLIED: 200,
  DUPLICATE: 200,
  IGNORED: 200,
  REJECTED: 401,
  INVALID_REQUEST: 400,
  RETRY: 503,
  FAILED: 500,
  METHOD_NOT_ALLOWED: 405,
};

/* ============================== diagnostics =============================== */

/**
 * Closed, secret-free diagnostic codes.
 *
 * The sink is the ONE place this module reports anything, and it can only carry
 * these words plus identifiers that were themselves part of the signed metadata
 * (`eventId`). There is no value-typed field for a secret, an access token, an
 * `Authorization` header, a signature or a provider body to travel in, so no
 * future edit to a log line can leak one.
 */
export type MercadoPagoWebhookDiagnosticCode =
  | "APPLIED"
  | "DUPLICATE"
  | "METHOD_NOT_ALLOWED"
  | "MISSING_DATA_ID"
  | "SIGNATURE_REJECTED"
  | "MALFORMED_BODY"
  | "IGNORED_UNSUPPORTED_NOTIFICATION"
  | "RETRY_PROVIDER_LOOKUP"
  | "IGNORED_RESOURCE_WITHOUT_SUBSCRIPTION"
  | "RETRY_OWNER_REQUIRED"
  | "RETRY_PLAN_MAPPING_REQUIRED"
  | "IGNORED_NOT_APPLICABLE"
  | "FAILED_APPLY"
  | "FAILED_BOOKKEEPING";

export interface MercadoPagoWebhookDiagnostic {
  code: MercadoPagoWebhookDiagnosticCode;
  status: MercadoPagoWebhookStatus;
  httpStatus: number;
  /** Canonical event id, built from SIGNED metadata only. Null before one exists. */
  eventId: string | null;
  /** Present only on a signature rejection; a closed enum owned by the verifier. */
  rejectionReason?: MercadoPagoWebhookRejectionReason | undefined;
  /** Present only when the provider fetch failed; a closed enum owned by the client. */
  providerErrorCode?: MercadoPagoErrorCode | undefined;
}

/* ============================ dependency seams ============================ */

/**
 * Everything the endpoint needs, injected.
 *
 * The handler imports no environment variable, no Supabase client and no network
 * primitive: the production wiring at the bottom of this file is the single place
 * that does, and every test drives the pipeline through this seam with local
 * doubles.
 */
export interface MercadoPagoWebhookDeps {
  /** Signing secret (`MERCADOPAGO_WEBHOOK_SECRET`). Server-side only. */
  webhookSecret: string | null;
  /** Authoritative provider reads — the MP-M1 fetcher. */
  fetcher: ProviderResourceFetcher;
  /** Canonical idempotency bridge over `claim_billing_event`. */
  idempotency: CanonicalIdempotencyBridge;
  /** Canonical subscription application core: store + plan resolver. */
  application: ApplicationDeps;
  /** Clock in MILLISECONDS. Used only for the freshness window. */
  now?: (() => number) | undefined;
  /** Optional diagnostic sink. Receives closed codes; a throwing sink is ignored. */
  onDiagnostic?: ((diagnostic: MercadoPagoWebhookDiagnostic) => void) | undefined;
}

/* ================================ helpers ================================= */

type JsonRecord = Record<string, unknown>;

function asJsonRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

/**
 * The canonical event id used for idempotency.
 *
 * BUILT FROM SIGNED METADATA ONLY: the notification's `data.id` (query) and
 * `x-request-id`. Both are members of the manifest Mercado Pago signs, so this
 * key cannot be chosen by whoever writes the body — and that matters, because the
 * canonical claim decides whether an event is processed at all. A key an attacker
 * could pick would let them suppress a real notification by colliding with it, or
 * replay one by changing it.
 *
 * The body's own `id` — the field the frozen intake would fall back to — is
 * deliberately NOT used. It is unsigned, and this is the one place in the
 * pipeline where an unsigned value would be load-bearing.
 *
 * A byte-identical redelivery of the same signed request produces the same key,
 * so it is answered as a duplicate instead of re-applied. An event that FAILED is
 * released (`status = 'failed'`), which the canonical claim treats as
 * re-claimable, so redelivery still recovers a failed attempt.
 */
export function buildMercadoPagoEventId(dataId: string, requestId: string | null): string {
  const request =
    typeof requestId === "string" && requestId.trim() !== "" ? requestId.trim() : null;
  return request === null ? dataId : `${dataId}:${request}`;
}

/**
 * Replaces the body's `data.id` with the SIGNED query value before classification.
 *
 * The frozen intake reads `data.id` (then `resource`, then `id`) to decide WHICH
 * resource a notification points at — and the signature covers none of those.
 * Injecting the signed value here means the resource id that can reach the
 * authoritative fetch is only ever the one Mercado Pago signed: a contradictory
 * body value cannot redirect the lookup, and a legacy `resource` field cannot
 * stand in for a missing `id:` in the manifest.
 *
 * Only the resource reference is replaced. The topic and action still come from
 * the body, exactly as the frozen core reads them: the body chooses the SHAPE of
 * the notification, never the identity of the resource and never any subscription
 * state. That the body is unsigned at all is a property of Mercado Pago's scheme,
 * documented in the module report.
 */
function withSignedResourceId(body: JsonRecord, resourceId: string): JsonRecord {
  const data = asJsonRecord(body["data"]);
  return { ...body, data: { ...(data ?? {}), id: resourceId } };
}

/** Reads `data.id` from the request URL. There is no header fallback, by design. */
function readSignedDataId(url: URL): string | null {
  const value = url.searchParams.get(MERCADOPAGO_DATA_ID_QUERY_KEY);
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/* ================================= handler ================================ */

/**
 * Builds the request handler.
 *
 * Total by construction: every failure it can observe becomes a status code and
 * no path throws out of the returned function. A webhook endpoint that answers
 * with a stack trace is a webhook endpoint that leaks.
 */
export function createMercadoPagoWebhookHandler(
  deps: MercadoPagoWebhookDeps,
): (request: Request) => Promise<Response> {
  const emit = (diagnostic: MercadoPagoWebhookDiagnostic): void => {
    try {
      deps.onDiagnostic?.(diagnostic);
    } catch {
      // A broken sink must never decide whether a payment is processed.
    }
  };

  const respond = (
    status: MercadoPagoWebhookStatus,
    code: MercadoPagoWebhookDiagnosticCode,
    eventId: string | null,
    extra?: {
      rejectionReason?: MercadoPagoWebhookRejectionReason | undefined;
      providerErrorCode?: MercadoPagoErrorCode | undefined;
    },
  ): Response => {
    const httpStatus = STATUS_HTTP[status];
    emit({
      code,
      status,
      httpStatus,
      eventId,
      rejectionReason: extra?.rejectionReason,
      providerErrorCode: extra?.providerErrorCode,
    });

    const headers: Record<string, string> = {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    };
    if (status === "METHOD_NOT_ALLOWED") headers["allow"] = MERCADOPAGO_WEBHOOK_METHOD;

    return new Response(JSON.stringify({ status }), { status: httpStatus, headers });
  };

  return async function handle(request: Request): Promise<Response> {
    /* ------------------------ 0. method gate (no effects) ------------------ */
    if (request.method.toUpperCase() !== MERCADOPAGO_WEBHOOK_METHOD) {
      return respond("METHOD_NOT_ALLOWED", "METHOD_NOT_ALLOWED", null);
    }

    /* ------------------------ 1. minimal metadata -------------------------- */
    // Nothing below this line reaches a database or a provider until the
    // signature verifies. Reading the request costs nothing and reveals nothing.
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return respond("INVALID_REQUEST", "MISSING_DATA_ID", null);
    }

    const dataId = readSignedDataId(url);
    if (dataId === null) {
      // No signed resource reference means an authoritative fetch would have
      // nothing to be about. Rejected before verification, with zero effects.
      return respond("INVALID_REQUEST", "MISSING_DATA_ID", null);
    }

    const signatureHeader = request.headers.get(MERCADOPAGO_SIGNATURE_HEADER);
    const requestId = request.headers.get(MERCADOPAGO_REQUEST_ID_HEADER);

    /* ------------------- 2. signature, then 3. freshness ------------------- */
    // One primitive, and it checks freshness only AFTER the digest matches, so a
    // forged `ts` cannot be used to probe the window. `dataId` is the signed query
    // value and the body is not passed to it — it could not be used here even if
    // it were, because the manifest covers metadata only.
    const verification = verifyMercadoPagoSignature({
      signatureHeader,
      requestId,
      dataId,
      secret: deps.webhookSecret,
      now: deps.now,
      toleranceSeconds: MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS,
    });

    if (verification.outcome !== "VERIFIED") {
      return respond("REJECTED", "SIGNATURE_REJECTED", null, {
        rejectionReason: verification.reason,
      });
    }

    /* --------------------------- 4. parse event ---------------------------- */
    const rawBody = await request.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return respond("INVALID_REQUEST", "MALFORMED_BODY", null);
    }

    const body = asJsonRecord(parsed);
    if (body === null) {
      return respond("INVALID_REQUEST", "MALFORMED_BODY", null);
    }

    /* -------------------------- 5. classification -------------------------- */
    const intake = intakeMercadoPagoNotification(withSignedResourceId(body, dataId));

    if (intake.kind !== "lookup_required") {
      // Two cases, both terminal, both touching NOTHING — no claim, no fetch, no
      // write, no Pro:
      //
      //   · `ignored`     — an unknown or incomplete topic (`merchant_order`, a
      //                     plan-only notification, a body with no resource). Not
      //                     an error: acknowledge it so Mercado Pago stops
      //                     retrying, and carry on.
      //   · `normalized`  — unreachable for Mercado Pago, whose intake is thin by
      //                     contract and always demands an authoritative lookup.
      //                     It is still handled explicitly rather than asserted
      //                     away, because it would mean the body had been read as
      //                     authoritative — the exact thing this endpoint refuses
      //                     to apply. Acknowledged, and nothing applied.
      return respond("IGNORED", "IGNORED_UNSUPPORTED_NOTIFICATION", null);
    }

    const eventId = buildMercadoPagoEventId(dataId, requestId);

    /* ------------------------- 6. idempotency claim ------------------------ */
    // The first and only write before the authoritative fetch. A replayed
    // notification is answered here and never reaches the provider.
    let claimed: boolean;
    try {
      claimed = await deps.idempotency.claim("mercado_pago", eventId);
    } catch {
      // The claim is the gate that prevents a double apply. If it cannot be
      // taken, fail closed without touching anything else.
      return respond("FAILED", "FAILED_BOOKKEEPING", eventId);
    }

    if (!claimed) {
      return respond("DUPLICATE", "DUPLICATE", eventId);
    }

    /* ------------------ 7. authoritative lookup + normalize ---------------- */
    // The frozen intake's instruction, with its two identity fields replaced by
    // the signed ones: the resource id is the SIGNED `data.id`, and the event id
    // is the signed-metadata key claimed above.
    const lookup: WebhookLookupInstruction = {
      ...intake.lookup,
      eventId,
      resourceId: dataId,
    };

    let normalized: NormalizedBillingEvent | null;
    try {
      normalized = await resolveMercadoPagoLookup(deps.fetcher, lookup);
    } catch (error) {
      return handleLookupFailure(eventId, error);
    }

    if (normalized === null) {
      // Nothing safe to derive from the instruction. Terminal: retrying the same
      // notification cannot produce a different answer.
      return finalizeIgnored(eventId, "IGNORED_RESOURCE_WITHOUT_SUBSCRIPTION");
    }

    /* ------------------------------ 8. apply ------------------------------- */
    let applied: ApplicationResult;
    try {
      applied = await applyNormalizedEvent(deps.application, normalized);
    } catch {
      return finalizeRetry(eventId, "FAILED_APPLY", "WEBHOOK_APPLY_FAILED");
    }

    if (applied.status === "APPLIED") {
      try {
        await deps.idempotency.markProcessed("mercado_pago", eventId);
      } catch {
        // The subscription state IS applied; only the bookkeeping row could not
        // be closed. Report that honestly rather than claim a clean success, and
        // leave the event released so a redelivery can finish the bookkeeping —
        // the canonical claim still prevents a second apply.
        return respond("FAILED", "FAILED_BOOKKEEPING", eventId);
      }
      return respond("APPLIED", "APPLIED", eventId);
    }

    // Not applied, and the canonical core said why. Two of its answers describe
    // gaps on OUR side — an unconfigured plan mapping and an unproven owner — and
    // both can legitimately succeed later, so they are released for redelivery
    // instead of closed. The rest assert that the event carries nothing
    // applicable, which a retry cannot change.
    if (applied.status === "PLAN_MAPPING_REQUIRED") {
      return finalizeRetry(eventId, "RETRY_PLAN_MAPPING_REQUIRED", "PLAN_MAPPING_REQUIRED");
    }
    if (applied.status === "OWNER_REQUIRED") {
      return finalizeRetry(eventId, "RETRY_OWNER_REQUIRED", "OWNER_REQUIRED");
    }

    return finalizeIgnored(eventId, "IGNORED_NOT_APPLICABLE");

    /* ---------------------------- local steps ----------------------------- */

    /**
     * A failed authoritative fetch.
     *
     * Provider failures are TRANSIENT — a timeout, a 5xx, a credential midway
     * through rotation, a resource that is not readable yet — and they are
     * released for redelivery. A resource that structurally cannot belong to a
     * subscription is terminal instead.
     *
     * A 404 is treated as TRANSIENT on purpose. Mercado Pago can deliver a
     * notification fractionally before the resource is queryable, and the cost
     * asymmetry decides it: a needless redelivery costs one GET, while closing a
     * real activation as "ignored" loses a payment. Nothing is applied in either
     * case, so the safe direction is the retryable one.
     */
    async function handleLookupFailure(id: string, error: unknown): Promise<Response> {
      if (error instanceof MercadoPagoError) {
        if (
          error.code === "UNLINKED_PAYMENT" ||
          error.code === "UNSUPPORTED_RESOURCE_TYPE" ||
          error.code === "WRONG_PROVIDER"
        ) {
          // The resource exists and is not a subscription payment. Redelivery
          // cannot change that, and inventing a subscription out of it is exactly
          // the dead end MP-M1 closed.
          return finalizeIgnored(id, "IGNORED_RESOURCE_WITHOUT_SUBSCRIPTION", error.code);
        }
        return finalizeRetry(id, "RETRY_PROVIDER_LOOKUP", "PROVIDER_LOOKUP_FAILED", error.code);
      }
      return finalizeRetry(id, "FAILED_APPLY", "WEBHOOK_APPLY_FAILED");
    }

    /** Terminal, nothing to apply: acknowledge, close the event row, write nothing. */
    async function finalizeIgnored(
      id: string,
      code: MercadoPagoWebhookDiagnosticCode,
      providerErrorCode?: MercadoPagoErrorCode | undefined,
    ): Promise<Response> {
      try {
        await deps.idempotency.markProcessed("mercado_pago", id);
      } catch {
        return respond("FAILED", "FAILED_BOOKKEEPING", id);
      }
      return respond("IGNORED", code, id, { providerErrorCode });
    }

    /** Not applied, and a redelivery can succeed: release the event, ask for one. */
    async function finalizeRetry(
      id: string,
      code: MercadoPagoWebhookDiagnosticCode,
      errorCode: string,
      providerErrorCode?: MercadoPagoErrorCode | undefined,
    ): Promise<Response> {
      try {
        await deps.idempotency.release("mercado_pago", id, {
          error_code: errorCode,
          diagnostic_reference: id,
        });
      } catch {
        return respond("FAILED", "FAILED_BOOKKEEPING", id);
      }
      return respond("RETRY", code, id, { providerErrorCode });
    }
  };
}

/* ============================ production wiring =========================== */

type PersistenceModule = typeof import("../persistence.ts");

/**
 * The canonical `ApplicationStore`, over the frozen persistence primitives.
 *
 * This adds NO data path: every member IS a canonical persistence function, and
 * `applyNormalizedEvent` remains the only caller. It exists so the endpoint can be
 * wired without any module above it reaching into Supabase directly, and so the
 * durability guarantees stay where they were defined.
 */
function createCanonicalApplicationStore(persistence: PersistenceModule): ApplicationStore {
  return {
    getSubscriptionByProviderId: (provider, providerSubscriptionId) =>
      persistence.getSubscriptionByProviderId(provider, providerSubscriptionId),
    upsertNormalizedSubscription: (input) => persistence.upsertNormalizedSubscription(input),
    getBillingCustomer: (userId, provider) => persistence.getBillingCustomer(userId, provider),
    upsertBillingCustomer: (input) => persistence.upsertBillingCustomer(input),
  };
}

// Imported lazily so that neither Supabase nor the service-role secret can be
// reached from a module path a test — or the browser bundle — imports.
let persistenceModule: Promise<PersistenceModule> | null = null;
async function loadPersistence(): Promise<PersistenceModule> {
  persistenceModule ??= import("../persistence.ts");
  return persistenceModule;
}

/**
 * Builds the production dependencies from the server environment.
 *
 * Secrets are read HERE and stay here: `MERCADOPAGO_WEBHOOK_SECRET` into the
 * verifier, `MERCADOPAGO_ACCESS_TOKEN` into an HTTP client that keeps it in a
 * closure. Both come from the MP-M1 config reader, so a `VITE_`-prefixed name
 * cannot be substituted even by accident — there is no code path from this
 * function to a public variable.
 *
 * The plan resolver is the MP-M1 fail-closed one: while `MERCADOPAGO_PRO_PLAN_ID`
 * is unset every plan resolves to `null`, the application core answers
 * `PLAN_MAPPING_REQUIRED`, and this endpoint releases the event for redelivery
 * instead of granting anything. That is the intended state until the owner creates
 * the remote plan.
 */
export async function createProductionMercadoPagoWebhookDeps(): Promise<MercadoPagoWebhookDeps> {
  const config = readMercadoPagoConfigFromEnv();
  const persistence = await loadPersistence();

  return {
    webhookSecret: config.webhookSecret,
    fetcher: createMercadoPagoResourceFetcher(createMercadoPagoClient(config)),
    idempotency: createCanonicalIdempotencyBridge({
      claimBillingEvent: persistence.claimBillingEvent,
      markBillingEventProcessed: persistence.markBillingEventProcessed,
      markBillingEventFailed: persistence.markBillingEventFailed,
    }),
    application: {
      store: createCanonicalApplicationStore(persistence),
      planResolver: createMercadoPagoPlanResolver({ proPlanId: config.proPlanId }),
    },
  };
}

/**
 * The production entry point a route handler calls.
 *
 * Kept as one function so the route file stays a thin adapter and every decision
 * remains testable here.
 */
export async function handleMercadoPagoWebhook(request: Request): Promise<Response> {
  const deps = await createProductionMercadoPagoWebhookDeps();
  return createMercadoPagoWebhookHandler(deps)(request);
}
