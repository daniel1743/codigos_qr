import "@tanstack/react-start/server-only";

import {
  BILLING_SUBSCRIPTION_STATUSES,
  type BillingSubscriptionRecord,
  type BillingSubscriptionStatus,
  type NormalizedSubscriptionInput,
} from "../../../lib/billing/billing.types.ts";
import type { CheckoutUserSource, ResolvedOffer } from "../checkout.ts";
import {
  createMercadoPagoClient,
  MercadoPagoError,
  readMercadoPagoConfigFromEnv,
  type MercadoPagoErrorCode,
  type MercadoPagoWriteClient,
} from "./client.ts";
import { CRIPQER_PRO_PLAN_CONTRACT } from "./plan.ts";
import {
  createMercadoPagoUserPreapproval,
  UserPreapprovalResponseError,
} from "./preapproval-creation.ts";

/**
 * CRIPQER BILLING — START A PRO SUBSCRIPTION (MP-M3C)
 *
 * The server-side flow that lets an authenticated user begin their Cripqer PRO
 * subscription, and the ONE order in which it may happen:
 *
 *     authenticated user
 *       -> server resolves the canonical PRO offer      (never the browser)
 *       -> configure guard: the remote plan id must exist
 *       -> duplicate guard: no live subscription for this user
 *       -> POST /preapproval                            (one call, no retry)
 *       -> persist the ownership correlation            (billing_subscriptions)
 *       -> VERIFY the correlation is really written
 *       -> ONLY THEN return the checkout URL
 *
 * If the correlation is not established, no checkout URL is returned, nothing
 * is granted, and the outcome is reported as the critical state
 * `REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED` — because a subscription may
 * now exist at Mercado Pago that Cripqer cannot attribute to anyone.
 *
 * WHAT THE BROWSER CANNOT CHOOSE
 * The flow takes NO request input. There is no parameter for `user_id`, amount,
 * currency, plan id, trial, frequency, provider or status, so a hostile body is
 * not validated-and-rejected — it is never read. Identity comes from
 * `CheckoutUserSource.requireUser()` (the canonical seam that production wires
 * to `requireBillingUser()`), price and currency come from
 * `CRIPQER_PRO_PLAN_CONTRACT`, and the provider plan reference comes from the
 * configured `MERCADOPAGO_PRO_PLAN_ID`.
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
 *   · No entitlement decision and no Pro grant: it writes a `pending` row,
 *     which `resolveEntitlementWithGrants` resolves to free. Access is granted,
 *     later, only by the verified webhook applying an `active` status.
 *   · No cancellation, no reactivation, no plan change, no billing customer
 *     creation, no `billing_checkouts` row: the correlation the webhook
 *     resolves later lives in `billing_subscriptions` and nowhere else.
 *   · No retry, no queue, no lock table, no idempotency invention. Mercado Pago
 *     documents no idempotency key for `POST /preapproval`, so the protections
 *     are the ones that already exist: the live-subscription guard before the
 *     call, the partial unique index `billing_subscriptions_one_live_per_user_
 *     unique` as the database backstop, and a critical, manually recovered
 *     classification for the race the two cannot prevent.
 */

/* =============================== outcomes =============================== */

export type ProSubscriptionStartStatus =
  /** Ownership correlation persisted; the checkout URL may be handed over. */
  | "READY"
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
  /** The 2xx response carried no usable id, or no usable checkout URL. */
  | "PREAPPROVAL_RESPONSE_UNUSABLE"
  /** The remote subscription was created, but ownership could not be written. */
  | "OWNERSHIP_WRITE_FAILED";

/**
 * The flow's result.
 *
 * It is a closed union: every field is a decision or a recovery fact, and no
 * variant can carry a provider payload. `redirectUrl` exists only on `READY`,
 * and it is the ONLY value this module ever hands back to a caller for the
 * browser — everything else is a status word.
 */
export type ProSubscriptionStartResult =
  | { status: "READY"; redirectUrl: string }
  | { status: "UNCONFIGURED" }
  | { status: "PAYER_EMAIL_REQUIRED" }
  | { status: "ALREADY_IN_PROGRESS"; subscriptionStatus: BillingSubscriptionStatus }
  | { status: "PROVIDER_ERROR"; providerErrorCode: MercadoPagoErrorCode }
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
  ProSubscriptionStartStatus | "UNAUTHENTICATED" | "METHOD_NOT_ALLOWED" | "INTERNAL_ERROR";

/**
 * Closed, secret-free diagnostics.
 *
 * The identifiers it can carry (`preapprovalId`, `userId`) exist because the
 * critical state is recovered BY HAND and an operator cannot act on "something
 * went wrong": they need to know which remote subscription to look at and which
 * user it was meant for. There is no field for a token, an Authorization
 * header, a provider body or a stack, so no logging edit can leak one.
 */
export interface ProSubscriptionStartDiagnostic {
  status: ProSubscriptionDiagnosticStatus;
  httpStatus: number;
  reason?: ProSubscriptionCorrelationFailureReason | undefined;
  providerErrorCode?: MercadoPagoErrorCode | undefined;
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
 * `status: "pending"` is the whole point: `resolveOwner` finds the row by
 * `(provider, provider_subscription_id)` regardless of status — so the webhook
 * that arrives when the payer authorizes can attribute the subscription to this
 * user — while `resolveEntitlementWithGrants` resolves `pending` to free. The
 * row proves WHO, never WHAT they may access.
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
 * the live ones — handing a payer a checkout URL for a subscription that is
 * already cancelled would be worse than refusing to hand it over at all.
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
): Promise<ProSubscriptionStartResult> {
  // 1. Identity: from the session, through the canonical seam. Never a body.
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

  // 4. The duplicate guard, BEFORE anything is created remotely. A live row
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

  // 5. ONE provider call.
  let created: { preapprovalId: string; initPoint: string };
  try {
    created = await createMercadoPagoUserPreapproval(deps.client, {
      preapprovalPlanId: offer.providerOfferReference,
      payerEmail,
      backUrl: deps.config.backUrl ?? null,
    });
  } catch (error) {
    if (error instanceof UserPreapprovalResponseError) {
      // The subscription may exist and we cannot use the answer. Nothing is
      // persisted, no URL is returned, and no retry is attempted.
      return {
        status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
        reason: "PREAPPROVAL_RESPONSE_UNUSABLE",
        preapprovalId: error.preapprovalId,
        userId: user.userId,
      };
    }
    if (error instanceof MercadoPagoError) {
      // The provider refused, or the transport failed, before or instead of
      // creating anything usable. No local row is invented.
      return { status: "PROVIDER_ERROR", providerErrorCode: error.code };
    }
    throw error;
  }

  // 6. Ownership correlation, immediately — and verified, not assumed.
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

  // 7. Only now is there a URL to hand over.
  return { status: "READY", redirectUrl: created.initPoint };
}

/* ================================ handler =============================== */

/** The only method this endpoint accepts. */
export const PRO_SUBSCRIPTION_START_METHOD = "POST";

const STATUS_HTTP: Record<ProSubscriptionDiagnosticStatus, number> = {
  READY: 200,
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

/**
 * Builds the request handler.
 *
 * Total by construction: every failure becomes a status code and no path throws
 * out of the returned function. The response body carries ONLY a status word —
 * plus `redirectUrl` on success — so no identity, no id and no provider field
 * can reach the browser even by accident.
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

  const respond = (diagnostic: ProSubscriptionStartDiagnostic, redirectUrl?: string): Response => {
    const httpStatus = STATUS_HTTP[diagnostic.status];
    emit(diagnostic);

    const body =
      redirectUrl === undefined
        ? { status: diagnostic.status }
        : { status: diagnostic.status, redirectUrl };

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
    // 0. Method gate. No body is read — there is nothing a body could say.
    if (request.method.toUpperCase() !== PRO_SUBSCRIPTION_START_METHOD) {
      return respond(base("METHOD_NOT_ALLOWED"));
    }

    let result: ProSubscriptionStartResult;
    try {
      result = await startProSubscription(deps);
    } catch (error) {
      if (isBillingUnauthorized(error)) {
        return respond(base("UNAUTHENTICATED"));
      }
      // Anything else is an internal failure. It is named, never described.
      return respond(base("INTERNAL_ERROR"));
    }

    switch (result.status) {
      case "READY":
        return respond(base("READY"), result.redirectUrl);
      case "ALREADY_IN_PROGRESS":
        return respond(base("ALREADY_IN_PROGRESS"));
      case "PROVIDER_ERROR":
        return respond({ ...base("PROVIDER_ERROR"), providerErrorCode: result.providerErrorCode });
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

/**
 * Builds the sink that makes the critical state findable.
 *
 * `REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED` is the one outcome where a
 * human must act on the Mercado Pago side: a subscription may exist that no
 * Cripqer user owns. Nothing else is worth a log line — every other outcome is
 * either a normal refusal or a failure with no remote effect — so this sink
 * writes exactly one line, and only for that state.
 *
 * The line is BUILT HERE from named fields, so it cannot contain a token, a
 * header or a provider body even if the caller's diagnostic carried one: the
 * only values interpolated are the closed status, the closed reason code and
 * the two ids the recovery needs.
 */
export function createCriticalPreapprovalLogSink(
  log: (line: string) => void = console.error,
): (diagnostic: ProSubscriptionStartDiagnostic) => void {
  return (diagnostic) => {
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
