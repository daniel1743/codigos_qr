import "@tanstack/react-start/server-only";

import {
  BILLING_SUBSCRIPTION_STATUSES,
  type BillingSubscriptionRecord,
  type BillingSubscriptionStatus,
  type NormalizedSubscriptionInput,
} from "../../../lib/billing/billing.types.ts";
import type { CheckoutUserSource, ResolvedOffer } from "../checkout.ts";
import {
  readCardTokenFromRequest,
  type CardTokenRejection,
  type CardTokenReadResult,
} from "./card-token.ts";
import {
  createMercadoPagoClient,
  hasProviderObservation,
  MercadoPagoError,
  readMercadoPagoConfigFromEnv,
  type MercadoPagoDiagnostic,
  type MercadoPagoErrorCode,
  type MercadoPagoWriteClient,
} from "./client.ts";
import { CRIPQER_PRO_PLAN_CONTRACT } from "./plan.ts";
import {
  buildUserPreapprovalPath,
  createMercadoPagoUserPreapproval,
  readUserPreapprovalStatus,
  UserPreapprovalResponseError,
} from "./preapproval-creation.ts";

/**
 * CRIPQER BILLING — START A PRO SUBSCRIPTION (MP-M3C / MP-M3D.7)
 *
 * The server-side flow that lets an authenticated user begin their Cripqer PRO
 * subscription, and the ONE order in which it may happen:
 *
 *     authenticated user
 *       -> server resolves the canonical PRO offer          (never the browser)
 *       -> configure guard: the remote plan id must exist
 *       -> payer identity: the session's email              (never the browser)
 *       -> request contract: exactly one card_token_id      (the ONLY input)
 *       -> duplicate guard: no live subscription for this user
 *       -> POST /preapproval                                (one call, no retry)
 *       -> persist the ownership correlation                (billing_subscriptions)
 *       -> VERIFY the correlation is really written
 *       -> authoritative provider readback                  (GET /preapproval/{id})
 *       -> ONLY THEN report success
 *
 * ---------------------------------------------------------------------------
 * WHAT CHANGED IN MP-M3D.7
 * ---------------------------------------------------------------------------
 * Until this phase the flow took NO request input at all, and it said so
 * proudly: "there is no parameter for user_id, amount, currency, plan id, trial,
 * frequency, provider or status, so a hostile body is not validated-and-rejected
 * — it is never read."
 *
 * That property could not survive contact with the provider. MP-M3D.5 captured
 * Mercado Pago refusing the creation — `400 "card_token_id is required"` — and
 * MP-M3D.6 established from the official guide that a subscription with an
 * associated plan MUST carry a token and `status: authorized`. A subscription
 * cannot be created without payment material, and the material can only come
 * from the browser, because Mercado Pago's client SDK is the only thing allowed
 * to see the card.
 *
 * So the browser may now contribute EXACTLY ONE value, and the guarantee that
 * replaced "no input" is stronger than a filter would have been:
 *
 *   · The contract is enforced by `card-token.ts`. The allowed field list has
 *     one entry, and a body carrying anything else is REFUSED, not ignored — so
 *     there is no shape of request that changes the owner, the price, the
 *     currency, the interval, the plan, the trial or the created status.
 *   · `status` is not a parameter anywhere: it is the literal constant
 *     `MERCADOPAGO_AUTHORIZED_STATUS`, used as a type, so a browser-supplied
 *     status is unrepresentable rather than rejected.
 *   · Identity, payer email, plan id, price and currency are still derived
 *     server-side from the session and from `CRIPQER_PRO_PLAN_CONTRACT`.
 *
 * WHAT THE BROWSER STILL CANNOT CHOOSE
 * A caller cannot send `user_id` (identity is `CheckoutUserSource.requireUser()`),
 * `payer_email` (it is the session's email), `preapproval_plan_id` (it is the
 * configured `MERCADOPAGO_PRO_PLAN_ID`), or `status` (it is a server constant).
 * Those fields' PRESENCE is a contract violation.
 *
 * ORDER OF THE CHECKS, AND WHY
 * Identity first, then the request contract, then the server's own readiness,
 * then the duplicate guard. Two rules decide it:
 *
 *   · Identity is checked before the body is INTERPRETED, so an anonymous caller
 *     is answered 401 whatever it sent and cannot probe the request contract by
 *     watching which 4xx comes back. (The handler does parse the JSON before
 *     calling in here — parsing is inert, and the VERDICT is not consulted until
 *     `requireUser()` has resolved. Reading a string is not acting on it.)
 *   · Every local check precedes the provider call, so no ordering among them
 *     can cause a remote effect. The order only decides which refusal a caller
 *     sees, never whether Mercado Pago is reached.
 *
 * WHY THERE IS STILL NO ENTITLEMENT DECISION HERE
 * The flow writes a `pending` row, which `resolveEntitlementWithGrants` resolves
 * to free, and it does NOT promote that row from the readback status. This is
 * deliberate. The creation response now arrives with the subscription already
 * `authorized`, and it is tempting to grant Pro on the spot — but the canonical
 * authority is the VERIFIED WEBHOOK, and the trial semantics that decide whether
 * an authorized subscription in a free-trial window means "in force" or
 * "instrument registered, nothing charged" are documented in MP-M3D.7's
 * deliverable rather than assumed here. Promoting the row in this module would
 * put a SECOND, untested entitlement path behind a status this flow only
 * half-understands. The readback is REPORTED, not acted upon: canonical state
 * still changes in exactly one place.
 *
 * NO PARALLEL PIPELINE
 * Ownership is written with the canonical `upsertNormalizedSubscription`
 * primitive, the duplicate guard uses the canonical
 * `getCanonicalSubscriptionForUser` lookup, the offer is the canonical
 * `ResolvedOffer` shape from the Checkout Host core, and the payer identity is
 * the canonical `CheckoutUserSource`. This module adds ordering, guards and
 * classifications — and no second way to do any of those things.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   · No entitlement decision and no Pro grant: it writes a `pending` row, which
 *     `resolveEntitlementWithGrants` resolves to free. Access is granted, later,
 *     only by the verified webhook applying an `active` status.
 *   · No cancellation, no reactivation, no plan change, no billing customer
 *     creation, no `billing_checkouts` row: the correlation the webhook
 *     resolves later lives in `billing_subscriptions` and nowhere else.
 *   · No retry, no queue, no lock table, no idempotency invention. Mercado Pago
 *     documents no idempotency key for `POST /preapproval`, so the protections
 *     are the ones that already exist: the live-subscription guard before the
 *     call, the partial unique index `billing_subscriptions_one_live_per_user_
 *     unique` as the database backstop, and a critical, manually recovered
 *     classification for the race the two cannot prevent. A card token is
 *     single-use, so a retry would be spent material as well as a second
 *     subscription.
 *   · No `card_token_id` anywhere but the one provider call: it is never stored,
 *     never logged, never placed in a diagnostic, and never returned.
 */

/* =============================== outcomes =============================== */

export type ProSubscriptionStartStatus =
  /** Ownership correlation persisted; the subscription is established. */
  | "READY"
  /** The browser's body did not satisfy the one-field request contract. */
  | "INVALID_REQUEST"
  /** `MERCADOPAGO_PRO_PLAN_ID` is missing: there is no plan to subscribe to. */
  | "UNCONFIGURED"
  /** The session carries no email, and Mercado Pago requires `payer_email`. */
  | "PAYER_EMAIL_REQUIRED"
  /** The user already has a live canonical subscription. Nothing was sent. */
  | "ALREADY_IN_PROGRESS"
  /** Mercado Pago refused or failed. Nothing was persisted anywhere. */
  | "PROVIDER_ERROR"
  /** CRITICAL: a subscription may exist remotely with no canonical owner. */
  | "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED";

/** Why the critical state was reached. */
export type ProSubscriptionCorrelationFailureReason =
  /** The 2xx response carried no usable id. */
  | "PREAPPROVAL_RESPONSE_UNUSABLE"
  /** The remote subscription was created, but ownership could not be written. */
  | "OWNERSHIP_WRITE_FAILED";

/**
 * The flow's result.
 *
 * It is a closed union: every field is a decision or a recovery fact, and no
 * variant can carry a provider payload. The only provider-derived values that
 * ever reach a caller are `READY`'s two fields — the subscription's
 * authoritative status and, when the provider offered one, its "add or modify
 * payment method" URL — both of which are non-secret remote state the browser is
 * entitled to know because the browser is the user's.
 *
 * The other provider-derived value here is `PROVIDER_ERROR`'s `providerDiagnostic`
 * (MP-M3D.4): a sanitized, allowlisted, redacted record whose every text field
 * has already been through `sanitizeProviderText`, and whose only consumer is
 * the operator log below. It is never rendered, never serialized into a response
 * body and never returned as data — a failure an operator cannot diagnose was
 * indistinguishable from one they could, which is why it exists at all.
 *
 * There is no field on any variant for a card token: not on the failures, not on
 * the successes. A caller cannot get back what it sent, and a logging edit
 * cannot leak what no variant holds.
 */
export type ProSubscriptionStartResult =
  | {
      status: "READY";
      /**
       * The provider's authoritative status for the new subscription, or `null`
       * when neither the readback nor the creation response reported a usable
       * one. `null` is not a failure: the subscription exists and is correlated,
       * and the webhook will settle the state. It means only "not confirmed by
       * this call".
       */
      providerSubscriptionStatus: string | null;
      /**
       * The provider's "add or modify payment method" URL, when it returned an
       * https one. Secondary since MP-M3D.7 — the payment instrument was already
       * taken in the browser, so there is nothing left to authorize.
       */
      checkoutUrl: string | null;
    }
  | { status: "INVALID_REQUEST"; reason: CardTokenRejection }
  | { status: "UNCONFIGURED" }
  | { status: "PAYER_EMAIL_REQUIRED" }
  | { status: "ALREADY_IN_PROGRESS"; subscriptionStatus: BillingSubscriptionStatus }
  | {
      status: "PROVIDER_ERROR";
      providerErrorCode: MercadoPagoErrorCode;
      /**
       * What the provider actually said, sanitized — or `null` when the request
       * never left the process (a missing token is refused locally and no
       * provider observation exists to report).
       */
      providerDiagnostic: MercadoPagoDiagnostic | null;
    }
  | {
      status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED";
      reason: ProSubscriptionCorrelationFailureReason;
      /** The remote subscription id, when it could be read. */
      preapprovalId: string | null;
      /** The authenticated user the correlation was meant to belong to. */
      userId: string;
    };

/* ============================ dependency seams ========================== */

/**
 * The persistence the flow needs — exactly two canonical primitives, with the
 * signatures they already have in `../persistence.ts`:
 *
 *   · `getCanonicalSubscriptionForUser` — the live-subscription guard, whose
 *     status filter (`pending|active|past_due|paused`) is the same set the
 *     partial unique index enforces, so the guard and the database agree.
 *   · `upsertNormalizedSubscription` — the only writer, which re-reads by
 *     `(provider, provider_subscription_id)` and never clobbers a row it did
 *     not mean to touch.
 */
export interface ProSubscriptionStore {
  getLiveSubscriptionForUser(userId: string): Promise<BillingSubscriptionRecord | null>;
  upsertNormalizedSubscription(
    input: NormalizedSubscriptionInput,
  ): Promise<BillingSubscriptionRecord>;
}

export interface ProSubscriptionStartConfig {
  /** `MERCADOPAGO_PRO_PLAN_ID` — the remote PRO plan this subscribes to. */
  proPlanId: string | null;
  /**
   * Optional per-subscription return URL. `null` means "not configured", and
   * the field is omitted so the plan's own `back_url` applies.
   */
  backUrl?: string | null;
}

/**
 * What the flow is told about the request.
 *
 * It carries the ALREADY-PARSED token verdict rather than the `Request` itself,
 * so this module stays a pure function of its dependencies and remains testable
 * without an HTTP object. The verdict is inert data: `startProSubscription`
 * authenticates first and only then reads it, which is what keeps an anonymous
 * caller from learning the request contract through the shape of a refusal.
 *
 * `cardToken` is the ONLY browser-supplied input in the whole flow. There is no
 * field here for an identity, a plan, an amount or a status, so this interface
 * is also the audit answer to "what can the browser reach": one verdict about
 * one field.
 */
export interface ProSubscriptionStartInput {
  readonly cardToken: CardTokenReadResult;
}

export interface ProSubscriptionStartDeps {
  /** Canonical identity seam. Production wires `requireBillingUser()`. */
  userSource: CheckoutUserSource;
  /** Commercial configuration, read from the server environment. */
  config: ProSubscriptionStartConfig;
  /** The write client. It holds the access token; this flow never sees it. */
  client: MercadoPagoWriteClient;
  store: ProSubscriptionStore;
  /** Optional diagnostic sink. Receives closed codes; a throwing sink is ignored. */
  onDiagnostic?: ((diagnostic: ProSubscriptionStartDiagnostic) => void) | undefined;
}

export type ProSubscriptionDiagnosticStatus =
  | ProSubscriptionStartStatus
  | "UNAUTHENTICATED"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_ERROR";

/**
 * Closed, secret-free diagnostics.
 *
 * The identifiers it can carry (`preapprovalId`, `userId`) exist because the
 * critical state is recovered BY HAND and an operator cannot act on "something
 * went wrong": they need to know which remote subscription to look at and which
 * user it was meant for. `reason` on `INVALID_REQUEST` is the closed
 * `CardTokenRejection` — a category, never the offending value, so a diagnostic
 * cannot become the place a card token leaks to a log.
 *
 * There is no field for a token, an Authorization header, a provider body or a
 * stack, so no logging edit can leak one.
 */
export interface ProSubscriptionStartDiagnostic {
  status: ProSubscriptionDiagnosticStatus;
  httpStatus: number;
  reason?: ProSubscriptionCorrelationFailureReason | CardTokenRejection | undefined;
  providerErrorCode?: MercadoPagoErrorCode | undefined;
  /**
   * MP-M3D.4 — present on `PROVIDER_ERROR` ONLY when the request actually
   * reached the provider. Sanitized at the client boundary, rendered from named
   * fields by the sink below, and never serialized into a response body: a
   * `PROVIDER_ERROR` response is still exactly `{"status":"PROVIDER_ERROR"}`.
   */
  providerDiagnostic?: MercadoPagoDiagnostic | null | undefined;
  /** Present only on the critical state: the remote subscription, if known. */
  preapprovalId?: string | null;
  /** Present only on the critical state: the user it was meant to belong to. */
  userId?: string | null;
}

/* ============================== offer =================================== */

/**
 * Resolves the canonical PRO offer for Mercado Pago, server-side.
 *
 * The price, the currency and the interval come from `CRIPQER_PRO_PLAN_CONTRACT`
 * — the same contract that created the remote plan — and the provider reference
 * is the configured plan id. `null` when the plan id is missing: an unconfigured
 * deployment sells nothing rather than selling something else.
 */
export function resolveMercadoPagoProOffer(config: {
  proPlanId: string | null;
}): ResolvedOffer | null {
  const planId = typeof config.proPlanId === "string" ? config.proPlanId.trim() : "";
  if (planId === "") return null;

  return {
    planId: CRIPQER_PRO_PLAN_CONTRACT.planId,
    billingInterval: CRIPQER_PRO_PLAN_CONTRACT.billingInterval,
    provider: "mercado_pago",
    currency: CRIPQER_PRO_PLAN_CONTRACT.currency,
    amount: CRIPQER_PRO_PLAN_CONTRACT.amount,
    providerOfferReference: planId,
  };
}

/* =========================== ownership correlation ====================== */

/** The canonical statuses that mean "a subscription is in flight or in force". */
const LIVE_SUBSCRIPTION_STATUSES: ReadonlySet<BillingSubscriptionStatus> = new Set([
  "pending",
  "active",
  "past_due",
  "paused",
]);

function isCanonicalStatus(value: unknown): value is BillingSubscriptionStatus {
  return (
    typeof value === "string" &&
    (BILLING_SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * The ownership correlation row for a freshly created subscription.
 *
 * `status: "pending"` is the whole point, and MP-M3D.7 did NOT change it even
 * though the provider now returns `authorized` immediately. `resolveOwner` finds
 * the row by `(provider, provider_subscription_id)` regardless of status — so
 * the webhook can attribute the subscription to this user — while
 * `resolveEntitlementWithGrants` resolves `pending` to free. The row proves WHO,
 * never WHAT they may access.
 *
 * Writing the provider's `authorized` here instead would grant Pro from a status
 * observed on the creation path, which is a decision this flow is not the right
 * place to make (see the module note on entitlement).
 */
export function buildProSubscriptionOwnership(input: {
  userId: string;
  offer: ResolvedOffer;
  providerSubscriptionId: string;
}): NormalizedSubscriptionInput {
  return {
    user_id: input.userId,
    plan_id: input.offer.planId,
    provider: "mercado_pago",
    billing_customer_id: null,
    provider_customer_id: null,
    provider_subscription_id: input.providerSubscriptionId,
    billing_interval: input.offer.billingInterval,
    currency: input.offer.currency,
    status: "pending",
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    payment_method_label: null,
  };
}

/**
 * Whether the persisted row really is the correlation this flow meant to write.
 *
 * A write that returns without throwing is not proof: the row could belong to
 * another user, another provider, another subscription, or already be dead. So
 * the three identity fields are compared exactly, and the status must be one of
 * the live ones — handing a payer a success for a subscription that is already
 * cancelled would be worse than refusing to report one at all.
 */
function correlationIsEstablished(
  record: BillingSubscriptionRecord | null,
  expected: { userId: string; providerSubscriptionId: string },
): boolean {
  if (record === null) return false;
  if (record.user_id !== expected.userId) return false;
  if (record.provider !== "mercado_pago") return false;
  if (record.provider_subscription_id !== expected.providerSubscriptionId) return false;
  return isCanonicalStatus(record.status) && LIVE_SUBSCRIPTION_STATUSES.has(record.status);
}

/* ============================== the readback ============================ */

/**
 * Reads the subscription back from the provider, authoritatively.
 *
 * This is the same relation the webhook path uses (`GET /preapproval/{id}`, see
 * `resource-fetcher.ts`), applied to a subscription this flow just created.
 * It exists because the creation RESPONSE is not the same thing as the resource:
 * a response reports what the provider decided to say at the moment of creation,
 * while a readback reports what the subscription IS. The readback is the value
 * this flow reports to the caller.
 *
 * IT NEVER FAILS THE REQUEST. A readback that fails leaves a subscription that
 * was created, correlated and verified — a success by every measure that
 * matters — so raising here would turn a healthy subscription into a failed
 * request and invite a retry that the duplicate guard would then refuse. The
 * caller receives `providerSubscriptionStatus: null`, which says exactly what
 * happened: "not confirmed by this call". The webhook remains the authority.
 *
 * The id is `encodeURIComponent`-ed: it comes from the provider, but a value
 * interpolated into a path should not be trusted to be path-safe on the strength
 * of where it came from.
 */
async function readBackSubscriptionStatus(
  client: MercadoPagoWriteClient,
  preapprovalId: string,
): Promise<string | null> {
  try {
    const resource = await client.getJson(buildUserPreapprovalPath(preapprovalId));
    return readUserPreapprovalStatus(resource);
  } catch {
    return null;
  }
}

/* ================================ flow ================================== */

/**
 * Starts a PRO subscription for the authenticated user.
 *
 * Throws only what the canonical identity seam throws (`BillingUnauthorizedError`
 * when there is no session); every outcome that follows a successful
 * authentication is returned as a classified result.
 */
export async function startProSubscription(
  deps: ProSubscriptionStartDeps,
  input: ProSubscriptionStartInput,
): Promise<ProSubscriptionStartResult> {
  // 1. Identity: from the session, through the canonical seam. Never a body.
  //    Checked BEFORE the token verdict is consulted, so an anonymous caller is
  //    refused on identity alone and cannot read the request contract off the
  //    shape of the refusal.
  const user = await deps.userSource.requireUser();

  // 2. The offer: server-side, from the frozen contract. Fails closed.
  const offer = resolveMercadoPagoProOffer({ proPlanId: deps.config.proPlanId });
  if (offer === null || offer.providerOfferReference === null) {
    return { status: "UNCONFIGURED" };
  }

  // 3. The payer identity Mercado Pago requires. Absent means permanent
  //    failure, so it is named as its own outcome instead of being sent as an
  //    empty string for the provider to reject.
  const payerEmail = typeof user.email === "string" ? user.email.trim() : "";
  if (payerEmail === "") {
    return { status: "PAYER_EMAIL_REQUIRED" };
  }

  // 4. The request contract. The ONLY browser-supplied input, judged by
  //    `card-token.ts`; `reason` is a closed category and never a value.
  if (!input.cardToken.ok) {
    return { status: "INVALID_REQUEST", reason: input.cardToken.reason };
  }
  const cardTokenId = input.cardToken.cardTokenId;

  // 5. The duplicate guard, BEFORE anything is created remotely. A live row
  //    (pending|active|past_due|paused) means this user already has a
  //    subscription in flight or in force — the same set the partial unique
  //    index enforces — so a second remote subscription must not be created.
  const live = await deps.store.getLiveSubscriptionForUser(user.userId);
  if (live !== null) {
    return {
      status: "ALREADY_IN_PROGRESS",
      subscriptionStatus: isCanonicalStatus(live.status) ? live.status : "pending",
    };
  }

  // 6. ONE provider call.
  let created: Awaited<ReturnType<typeof createMercadoPagoUserPreapproval>>;
  try {
    created = await createMercadoPagoUserPreapproval(deps.client, {
      preapprovalPlanId: offer.providerOfferReference,
      payerEmail,
      cardTokenId,
      backUrl: deps.config.backUrl ?? null,
    });
  } catch (error) {
    if (error instanceof UserPreapprovalResponseError) {
      // The subscription may exist and we cannot use the answer. Nothing is
      // persisted, no success is reported, and no retry is attempted.
      return {
        status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
        reason: "PREAPPROVAL_RESPONSE_UNUSABLE",
        preapprovalId: error.preapprovalId,
        userId: user.userId,
      };
    }
    if (error instanceof MercadoPagoError) {
      // The provider refused, or the transport failed, before or instead of
      // creating anything usable. No local row is invented, and no field of the
      // diagnostic can carry the token.
      //
      // `hasProviderObservation` keeps the diagnostic honest: only a failure
      // whose request actually left the process has a provider outcome worth
      // reporting, so a locally-refused start carries no provider record at all
      // rather than a record full of nulls that reads like a real observation.
      return {
        status: "PROVIDER_ERROR",
        providerErrorCode: error.code,
        providerDiagnostic: hasProviderObservation(error.diagnostic) ? error.diagnostic : null,
      };
    }
    throw error;
  }
  // The token has been consumed. Nothing below this line reads it again, and the
  // only reference to it was the local above, which goes out of scope here.

  // 7. Ownership correlation, immediately — and verified, not assumed. It is
  //    written BEFORE the readback on purpose: if the readback fails, a webhook
  //    must still be able to attribute the subscription to this user.
  const correlation = buildProSubscriptionOwnership({
    userId: user.userId,
    offer,
    providerSubscriptionId: created.preapprovalId,
  });

  let written: BillingSubscriptionRecord | null = null;
  try {
    written = await deps.store.upsertNormalizedSubscription(correlation);
  } catch {
    // The row could not be written (or a concurrent flow's row won the unique
    // index). The subscription exists remotely; this is the critical state.
    written = null;
  }

  if (
    !correlationIsEstablished(written, {
      userId: user.userId,
      providerSubscriptionId: created.preapprovalId,
    })
  ) {
    return {
      status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
      reason: "OWNERSHIP_WRITE_FAILED",
      preapprovalId: created.preapprovalId,
      userId: user.userId,
    };
  }

  // 8. Authoritative readback, and only now is success reportable.
  //
  //    The readback is preferred over the creation response because it reports
  //    the RESOURCE rather than what the provider said at creation time. The
  //    creation response is the fallback rather than nothing: it is still a
  //    provider observation of this subscription, just an earlier one, and
  //    discarding it to report `null` would throw away real information.
  const readbackStatus = await readBackSubscriptionStatus(deps.client, created.preapprovalId);

  return {
    status: "READY",
    providerSubscriptionStatus: readbackStatus ?? created.providerStatus,
    checkoutUrl: created.checkoutUrl,
  };
}

/* ================================ handler =============================== */

/** The only method this endpoint accepts. */
export const PRO_SUBSCRIPTION_START_METHOD = "POST";

const STATUS_HTTP: Record<ProSubscriptionDiagnosticStatus, number> = {
  READY: 200,
  INVALID_REQUEST: 400,
  UNCONFIGURED: 500,
  PAYER_EMAIL_REQUIRED: 422,
  ALREADY_IN_PROGRESS: 409,
  PROVIDER_ERROR: 502,
  REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED: 500,
  UNAUTHENTICATED: 401,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_ERROR: 500,
};

/**
 * Whether a thrown error is the canonical authentication failure.
 *
 * The check is structural (the error's own stable `code`) instead of
 * `instanceof`, and the class is imported as a TYPE only: this module must not
 * pull the Supabase runtime into its module graph just to recognise the error
 * the auth seam raises.
 */
function isBillingUnauthorized(error: unknown): boolean {
  return error instanceof Error && (error as { code?: unknown }).code === "BILLING_UNAUTHORIZED";
}

/** What `READY` is allowed to add to the response body. Closed on purpose. */
interface ReadyResponsePayload {
  providerSubscriptionStatus: string | null;
  checkoutUrl: string | null;
}

/**
 * Builds the request handler.
 *
 * Total by construction: every failure becomes a status code and no path throws
 * out of the returned function. The response body carries ONLY a status word —
 * plus, on `READY`, the subscription's provider status and the provider's
 * checkout URL — so no identity, no id, no token and no provider payload can
 * reach the browser even by accident.
 *
 * The body is read through `readCardTokenFromRequest`, which never throws and
 * bounds the input before parsing. Its verdict is passed to the flow, which does
 * not consult it until identity has been proven.
 */
export function createProSubscriptionStartHandler(
  deps: ProSubscriptionStartDeps,
): (request: Request) => Promise<Response> {
  const emit = (diagnostic: ProSubscriptionStartDiagnostic): void => {
    try {
      deps.onDiagnostic?.(diagnostic);
    } catch {
      // A broken sink must never decide whether a subscription can start.
    }
  };

  const respond = (
    diagnostic: ProSubscriptionStartDiagnostic,
    ready?: ReadyResponsePayload,
  ): Response => {
    const httpStatus = STATUS_HTTP[diagnostic.status];
    emit(diagnostic);

    const body =
      ready === undefined
        ? { status: diagnostic.status }
        : {
            status: diagnostic.status,
            providerSubscriptionStatus: ready.providerSubscriptionStatus,
            checkoutUrl: ready.checkoutUrl,
          };

    const headers: Record<string, string> = {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    };
    if (diagnostic.status === "METHOD_NOT_ALLOWED") {
      headers["allow"] = PRO_SUBSCRIPTION_START_METHOD;
    }

    return new Response(JSON.stringify(body), { status: httpStatus, headers });
  };

  const base = (status: ProSubscriptionDiagnosticStatus): ProSubscriptionStartDiagnostic => ({
    status,
    httpStatus: STATUS_HTTP[status],
  });

  return async function handle(request: Request): Promise<Response> {
    // 0. Method gate. The body is not read: a method that cannot start a
    //    subscription should not pay to parse one.
    if (request.method.toUpperCase() !== PRO_SUBSCRIPTION_START_METHOD) {
      return respond(base("METHOD_NOT_ALLOWED"));
    }

    // 1. Read the body into an inert verdict. This is the only place the
    //    request stream is touched, and the result is a closed union — no text,
    //    no parsed object and no token escapes this call.
    const cardToken = await readCardTokenFromRequest(request);

    let result: ProSubscriptionStartResult;
    try {
      result = await startProSubscription(deps, { cardToken });
    } catch (error) {
      if (isBillingUnauthorized(error)) {
        return respond(base("UNAUTHENTICATED"));
      }
      // Anything else is an internal failure. It is named, never described.
      return respond(base("INTERNAL_ERROR"));
    }

    switch (result.status) {
      case "READY":
        return respond(base("READY"), {
          providerSubscriptionStatus: result.providerSubscriptionStatus,
          checkoutUrl: result.checkoutUrl,
        });
      case "INVALID_REQUEST":
        // The closed rejection category is carried on the DIAGNOSTIC, not in the
        // response body: the response stays a status word, while an operator can
        // still tell "no token" from "extra field" without reading the request.
        return respond({ ...base("INVALID_REQUEST"), reason: result.reason });
      case "ALREADY_IN_PROGRESS":
        return respond(base("ALREADY_IN_PROGRESS"));
      case "PROVIDER_ERROR": {
        const diagnostic: ProSubscriptionStartDiagnostic = {
          ...base("PROVIDER_ERROR"),
          providerErrorCode: result.providerErrorCode,
        };
        // Added, never spread-in as `undefined`: a local refusal must leave the
        // diagnostic exactly as narrow as it was before MP-M3D.4 existed.
        if (result.providerDiagnostic !== null) {
          diagnostic.providerDiagnostic = result.providerDiagnostic;
        }
        return respond(diagnostic);
      }
      case "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED":
        return respond({
          ...base("REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED"),
          reason: result.reason,
          preapprovalId: result.preapprovalId,
          userId: result.userId,
        });
      case "UNCONFIGURED":
      case "PAYER_EMAIL_REQUIRED":
        return respond(base(result.status));
    }
  };
}

/* ======================= critical-state recovery log ==================== */

/** Renders the sanitized provider text fields as JSON, one array per kind. */
function causeField(label: string, values: readonly string[]): string {
  return values.length === 0 ? `${label}=[]` : `${label}=${JSON.stringify(values)}`;
}

/**
 * Builds the provider-failure line (MP-M3D.4).
 *
 * Rendered from named fields, exactly like the critical-state line, so the only
 * values that can appear are closed categories, numbers and strings that already
 * passed `sanitizeProviderText`. JSON-encoding the free text keeps a stray quote
 * from being read as log structure.
 *
 * This line exists because a 502 alone was indistinguishable across causes: a
 * rejected payload, a timeout and a dead socket all produced the same status and
 * the same word, with zero preapprovals created, so the failure could not be
 * diagnosed without repeating it. It records the attempt, not the request.
 */
function buildProviderFailureLine(
  diagnostic: ProSubscriptionStartDiagnostic,
  provider: MercadoPagoDiagnostic,
): string {
  const parts = [
    "[billing][mercadopago] PROVIDER_ERROR: the Mercado Pago call failed; nothing was created.",
    `category=${provider.failureCategory}`,
    `code=${diagnostic.providerErrorCode ?? "unknown"}`,
    `operation=${provider.operationName ?? "none"}`,
    `http=${provider.providerHttpStatus ?? "none"}`,
    `elapsedMs=${provider.elapsedMs ?? "none"}`,
    `timeoutMs=${provider.timeoutMs ?? "none"}`,
  ];
  if (provider.providerRequestId !== null) parts.push(`requestId=${provider.providerRequestId}`);
  if (provider.providerErrorType !== null) parts.push(`providerType=${provider.providerErrorType}`);
  if (provider.providerErrorCode !== null) parts.push(`providerCode=${provider.providerErrorCode}`);
  if (provider.providerMessage !== null) {
    parts.push(`providerMessage=${JSON.stringify(provider.providerMessage)}`);
  }
  parts.push(causeField("causeCodes", provider.providerCauseCodes));
  parts.push(causeField("causeDescriptions", provider.providerCauseDescriptions));
  // Said without naming anything this module must never name (test 12b): the
  // point is only that the failure was sterile.
  parts.push("Nothing was created, locally or at Mercado Pago.");
  return parts.join(" ");
}

/**
 * Builds the sink that makes the two outcomes worth acting on findable.
 *
 * `REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED` is the outcome where a human
 * must act on the Mercado Pago side: a subscription may exist that no Cripqer
 * user owns.
 *
 * `PROVIDER_ERROR` earns a line only when it carries a captured provider
 * observation. Without one — a missing token, a hand-built error — there is
 * nothing an operator could act on that the 502 has not already said, so the
 * sink stays silent and the log keeps meaning "someone must look at this".
 *
 * `INVALID_REQUEST` is deliberately NOT logged. It is a caller's mistake on a
 * public endpoint, so logging it would let an unauthenticated stranger write
 * unbounded lines into the operator log — and the one value that would make the
 * line useful is the one value this integration must never record.
 *
 * Both lines are BUILT HERE from named fields, so neither can contain a token, a
 * header or a raw provider body even if a caller's diagnostic carried one: the
 * only values interpolated are closed codes, numbers, two ids and text that was
 * already sanitized at the client boundary.
 */
export function createCriticalPreapprovalLogSink(
  log: (line: string) => void = console.error,
): (diagnostic: ProSubscriptionStartDiagnostic) => void {
  return (diagnostic) => {
    if (diagnostic.status === "PROVIDER_ERROR") {
      const provider = diagnostic.providerDiagnostic;
      if (provider === null || provider === undefined) return;
      log(buildProviderFailureLine(diagnostic, provider));
      return;
    }

    if (diagnostic.status !== "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED") return;

    log(
      `[billing][mercadopago] ${diagnostic.status}: a subscription may exist at Mercado Pago with no canonical owner. ` +
        `reason=${diagnostic.reason ?? "unknown"} ` +
        `preapprovalId=${diagnostic.preapprovalId ?? "unknown"} ` +
        `userId=${diagnostic.userId ?? "unknown"}. ` +
        `Do NOT retry the request; check the Mercado Pago panel first.`,
    );
  };
}

/* ============================ production wiring ========================= */

type PersistenceModule = typeof import("../persistence.ts");
type AuthModule = typeof import("../auth.ts");

// Imported lazily so that neither Supabase nor the service-role secret can be
// reached from a module path a test — or the browser bundle — imports.
let persistenceModule: Promise<PersistenceModule> | null = null;
let authModule: Promise<AuthModule> | null = null;

async function loadPersistence(): Promise<PersistenceModule> {
  persistenceModule ??= import("../persistence.ts");
  return persistenceModule;
}

async function loadAuth(): Promise<AuthModule> {
  authModule ??= import("../auth.ts");
  return authModule;
}

/**
 * Builds the production dependencies from the server environment.
 *
 * The access token is read HERE and stays in the client's closure; this flow
 * receives a configured client and never a credential. The identity seam is the
 * canonical `requireBillingUser()`, adapted to `CheckoutUserSource` — the same
 * adaptation the Checkout Host core documents.
 */
export async function createProductionProSubscriptionStartDeps(): Promise<ProSubscriptionStartDeps> {
  const config = readMercadoPagoConfigFromEnv();
  const persistence = await loadPersistence();
  const auth = await loadAuth();

  return {
    userSource: {
      async requireUser(): Promise<{ userId: string; email: string | null }> {
        const user = await auth.requireBillingUser();
        return { userId: user.userId, email: user.email };
      },
    },
    config: { proPlanId: config.proPlanId, backUrl: null },
    client: createMercadoPagoClient(config),
    store: {
      getLiveSubscriptionForUser: (userId) => persistence.getCanonicalSubscriptionForUser(userId),
      upsertNormalizedSubscription: (input) => persistence.upsertNormalizedSubscription(input),
    },
    onDiagnostic: createCriticalPreapprovalLogSink(),
  };
}

/**
 * The production entry point a route handler calls.
 *
 * Kept as one function so the route file stays a thin adapter and every decision
 * remains testable here.
 */
export async function handleStartProSubscription(request: Request): Promise<Response> {
  const deps = await createProductionProSubscriptionStartDeps();
  return createProSubscriptionStartHandler(deps)(request);
}
