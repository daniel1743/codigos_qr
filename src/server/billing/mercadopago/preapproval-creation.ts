import "@tanstack/react-start/server-only";

import { MercadoPagoError, type MercadoPagoWriteClient } from "./client.ts";

/**
 * CRIPQER BILLING — MERCADO PAGO USER PREAPPROVAL PROVISIONING (MP-M3C)
 *
 * Creates ONE user's subscription: `POST /preapproval`, attached to the remote
 * PRO plan that already exists. This is the provider half of MP-M3C; the
 * sequenced server flow that decides WHEN this may be called lives in
 * `./pro-subscription-start.ts`, and this module never decides anything else.
 *
 * NOTHING CALLS THIS AUTOMATICALLY. There is no route, no cron and no startup
 * hook in this file: it is a pure function of (client, plan id, payer email,
 * return URL) that a server flow invokes once, after it has already proven the
 * caller's identity and refused every duplicate it can see. Every test exercises
 * it against fakes and never touches the network.
 *
 * MERCADO PAGO'S CONTRACT, AS VERIFIED AGAINST ITS PUBLIC REFERENCE
 * `POST /preapproval` (the Subscriptions API — the same origin, and the same
 * missing `/v1` prefix, as `POST /preapproval_plan`):
 *
 *   · `preapproval_plan_id` — links the subscription to a plan. The reference
 *     states that a subscription created with a plan takes its recurring
 *     settings FROM THE PLAN, which is exactly why Cripqer sends no money
 *     values here: amount, currency, frequency and trial live in the frozen
 *     PRO contract that created the plan, in one place, not two.
 *   · `payer_email` — marked REQUIRED by the reference ("to create a
 *     subscription, it must be linked to an email address"): it is how Mercado
 *     Pago assigns the subscriber identity. The value comes from the
 *     authenticated session, never from the browser.
 *   · `back_url` — documented and optional here; omitted unless an explicit
 *     https URL is configured, in which case the plan's own return URL applies.
 *
 * DELIBERATELY NOT SENT
 *   · `status` — the reference documents `authorized` (with a payment method)
 *     and `pending` (without one). Cripqer never handles card data
 *     (`card_token_id` is not sent either), so `pending` is the only possible
 *     outcome and it is Mercado Pago's transition to make, not ours to assert.
 *   · `card_token_id` — the browser is never asked for card details and this
 *     server never sees them; the payer authorizes at Mercado Pago's checkout.
 *   · `auto_recurring` — restating the plan's terms here would create a second
 *     place where the price lives, and the two could drift.
 *   · `external_reference` — Billing's ownership is `billing_subscriptions.
 *     provider_subscription_id`, written immediately after this call returns.
 *     No provider-side metadata is ever an ownership authority (see
 *     `applyNormalizedEvent`), so sending one would only invite the next reader
 *     to trust it.
 *
 * No idempotency key is documented for this endpoint. A retry therefore creates
 * a second subscription, which is why this module performs exactly one request
 * and why a response that cannot be read raises a typed error instead of
 * inviting a retry.
 */

/* ============================== contract =============================== */

/**
 * The Mercado Pago endpoint that creates a user's subscription.
 *
 * Distinct from `MERCADOPAGO_PREAPPROVAL_PLAN_PATH` (`/preapproval_plan`, the
 * template) on purpose: the two are different resources with different ids, and
 * conflating them would let a plan id be stored as a subscription id.
 */
export const MERCADOPAGO_PREAPPROVAL_PATH = "/preapproval";

/**
 * The exact JSON body `POST /preapproval` receives from Cripqer.
 *
 * Three keys at most, every one of them documented by the provider's reference.
 */
export interface UserPreapprovalRequestBody {
  /** The remote PRO plan. Its terms (7990 CLP/month, 10-day trial) apply. */
  preapproval_plan_id: string;
  /** The subscriber's email, from the authenticated session. */
  payer_email: string;
  /** Optional per-subscription return URL. Omitted when not configured. */
  back_url?: string;
}

/* ============================== response =============================== */

/**
 * Raised when Mercado Pago answered a creation request with a body this module
 * cannot use as a subscription.
 *
 * It extends `MercadoPagoError` (code `INVALID_JSON`) so a caller that only
 * knows the client's failure taxonomy keeps working, and it carries
 * `preapprovalId` because the ONE thing the host must be able to do next is
 * report which remote resource may exist: after a 2xx the subscription was
 * created, and losing its id turns a recoverable situation into a duplicate.
 * The id is `null` only when the response did not carry a usable one.
 */
export class UserPreapprovalResponseError extends MercadoPagoError {
  readonly preapprovalId: string | null;

  constructor(message: string, preapprovalId: string | null) {
    super("INVALID_JSON", message);
    this.name = "UserPreapprovalResponseError";
    this.preapprovalId = preapprovalId;
  }
}

/* ============================== validation ============================= */

function requireNonEmptyString(value: unknown, what: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text === "") {
    throw new MercadoPagoError(
      "INVALID_REQUEST",
      `Mercado Pago user preapproval requires ${what}; nothing was sent.`,
    );
  }
  return text;
}

/**
 * Validates the optional return URL and fails closed BEFORE any request.
 *
 * Absent, empty and whitespace-only mean "not configured" and resolve to
 * `undefined` — the field is then omitted and the plan's own `back_url`
 * applies. A value that IS present must be an absolute https URL: a
 * subscription created with a broken `back_url` strands the payer after
 * authorization, and no later code change repairs a remote resource.
 */
function optionalHttpsBackUrl(backUrl: string | null | undefined): string | undefined {
  if (backUrl === null || backUrl === undefined) return undefined;
  if (typeof backUrl !== "string") {
    throw new MercadoPagoError(
      "INVALID_REQUEST",
      "The PRO subscription return URL must be a string; nothing was sent to Mercado Pago.",
    );
  }
  const value = backUrl.trim();
  if (value === "") return undefined;
  if (!value.startsWith("https://")) {
    throw new MercadoPagoError(
      "INVALID_REQUEST",
      "The PRO subscription return URL must be an absolute https URL; nothing was sent to Mercado Pago.",
    );
  }
  return value;
}

/* ============================== builder ================================ */

/**
 * Builds the exact body for `POST /preapproval`. Pure: it sends nothing.
 *
 * The commercial terms are NOT parameters: `preapproval_plan_id` is the plan,
 * and the plan already holds the price, the currency, the frequency and the
 * trial. A caller can only say which plan, which payer, and (optionally) where
 * to return — never what it costs.
 */
export function buildUserPreapprovalRequestBody(options: {
  preapprovalPlanId: string;
  payerEmail: string;
  backUrl?: string | null;
}): UserPreapprovalRequestBody {
  const body: UserPreapprovalRequestBody = {
    preapproval_plan_id: requireNonEmptyString(options.preapprovalPlanId, "a preapproval_plan_id"),
    payer_email: requireNonEmptyString(options.payerEmail, "a payer_email"),
  };

  const backUrl = optionalHttpsBackUrl(options.backUrl);
  if (backUrl !== undefined) body.back_url = backUrl;

  return body;
}

/* ============================ response reads =========================== */

/**
 * The two fields this module reads off a creation response, declared as a
 * NARROW view rather than reusing the canonical resource type: `init_point` is
 * a creation-time checkout URL that Billing never persists, so it is not part
 * of `MercadoPagoPreapprovalResource`, and widening that type is not this
 * module's call to make. Both fields stay `unknown` so every read below is a
 * real check.
 */
interface PreapprovalCreationResponseView {
  id?: unknown;
  init_point?: unknown;
}

/**
 * Reads the created subscription's id defensively.
 *
 * Same asymmetry as the plan reader: Mercado Pago documents `id` as a string,
 * but its ids are numeric elsewhere, so a finite number is coerced rather than
 * rejected. After a successful POST the subscription ALREADY EXISTS remotely,
 * and reporting "no id" for one that was in fact created is the failure that
 * costs a duplicate remote resource.
 */
export function readUserPreapprovalId(response: unknown): string | null {
  if (response === null || typeof response !== "object") return null;

  const id: unknown = (response as PreapprovalCreationResponseView).id;
  if (typeof id === "string") {
    const trimmed = id.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return null;
}

/**
 * Reads the checkout URL the payer must be sent to.
 *
 * Only an absolute https URL is accepted. This value is handed to a browser as
 * a redirect target, so anything else — a relative path, `http://`, a
 * non-string — is refused here rather than navigated to later. The provider
 * documents `init_point` as the subscription checkout URL.
 */
export function readPreapprovalInitPoint(response: unknown): string | null {
  if (response === null || typeof response !== "object") return null;

  const initPoint: unknown = (response as PreapprovalCreationResponseView).init_point;
  if (typeof initPoint !== "string") return null;

  const trimmed = initPoint.trim();
  return trimmed.startsWith("https://") ? trimmed : null;
}

/* ============================== creation =============================== */

/**
 * Creates ONE user subscription. The second — and last — function in Billing
 * that mutates Mercado Pago state.
 *
 * Returns only when the response yields BOTH a usable subscription id and a
 * usable checkout URL: the caller needs the id to write ownership and the URL to
 * let the payer authorize, and a half-read response satisfies neither. In that
 * case it throws `UserPreapprovalResponseError` carrying whatever id could be
 * read, so the host can report which remote resource may exist instead of
 * silently losing it.
 *
 * Transport and provider rejections propagate as `MercadoPagoError` from the
 * client, unchanged and unretried.
 */
export async function createMercadoPagoUserPreapproval(
  client: MercadoPagoWriteClient,
  options: { preapprovalPlanId: string; payerEmail: string; backUrl?: string | null },
): Promise<{ preapprovalId: string; initPoint: string }> {
  const body = buildUserPreapprovalRequestBody(options);
  const response = await client.postJson(MERCADOPAGO_PREAPPROVAL_PATH, body);

  const preapprovalId = readUserPreapprovalId(response);
  const initPoint = readPreapprovalInitPoint(response);

  if (preapprovalId === null) {
    throw new UserPreapprovalResponseError(
      "Mercado Pago accepted the subscription request but returned no usable id. The subscription MAY have been created: check the Mercado Pago panel before retrying, so a second subscription is not created.",
      null,
    );
  }

  if (initPoint === null) {
    throw new UserPreapprovalResponseError(
      `Mercado Pago created subscription ${preapprovalId} but returned no usable checkout URL (https init_point). The subscription EXISTS remotely and must not be retried; it needs the recovery documented for REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED.`,
      preapprovalId,
    );
  }

  return { preapprovalId, initPoint };
}
