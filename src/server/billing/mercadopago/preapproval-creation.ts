import "@tanstack/react-start/server-only";

import { CARD_TOKEN_ID_MAX_LENGTH } from "./card-token.ts";
import { MercadoPagoError, type MercadoPagoWriteClient } from "./client.ts";

/**
 * CRIPQER BILLING — MERCADO PAGO USER PREAPPROVAL PROVISIONING (MP-M3C / MP-M3D.7)
 *
 * Creates ONE user's subscription: `POST /preapproval`, attached to the remote
 * PRO plan that already exists. This is the provider half of the flow; the
 * sequenced server flow that decides WHEN this may be called lives in
 * `./pro-subscription-start.ts`, and this module never decides anything else.
 *
 * NOTHING CALLS THIS AUTOMATICALLY. There is no route, no cron and no startup
 * hook in this file: it is a pure function of (client, plan id, payer email,
 * card token, return URL) that a server flow invokes once, after it has already
 * proven the caller's identity and refused every duplicate it can see. Every
 * test exercises it against fakes and never touches the network.
 *
 * ---------------------------------------------------------------------------
 * WHAT CHANGED IN MP-M3D.7, AND WHY THE OLD REASONING WAS WRONG
 * ---------------------------------------------------------------------------
 * Until MP-M3D.6 this module sent three keys at most — `preapproval_plan_id`,
 * `payer_email` and an optional `back_url` — and it said so in a comment that
 * argued `status` was Mercado Pago's transition to make. That argument was a
 * guess, never checked against the provider, and it was wrong. The old comment
 * reasoned: "Cripqer never handles card data, so `pending` is the only possible
 * outcome." Mercado Pago does not work that way. With an associated plan, there
 * is no `pending` outcome to fall into: the provider refuses the creation
 * outright.
 *
 * The evidence, in order:
 *   · MP-M3D.5 — one authenticated call, captured verbatim from the runtime log:
 *     `code=HTTP_ERROR http=400 providerMessage="card_token_id is required"`.
 *     Nothing was created, locally or at Mercado Pago.
 *   · MP-M3D.6 — the official guide, quoted: "A subscription with an associated
 *     plan must always be created with your `card_token_id` and with the status
 *     `Authorized`." The same phase found that `free_trial` is a PLAN field and
 *     not a request field, which is why the plan cannot be dropped to escape the
 *     requirement, and that the plan's own hosted `init_point` has no documented
 *     ownership-correlation channel, which is why a redirect flow cannot replace
 *     this call.
 *
 * So the two fields this module used to forbid are now REQUIRED, and that
 * reversal is deliberate rather than incidental. It is recorded here because the
 * next reader is entitled to know that the comment they are replacing was not
 * merely incomplete — it was confidently wrong, and it was wrong in the
 * direction of believing a guess instead of asking the provider.
 *
 * ---------------------------------------------------------------------------
 * MERCADO PAGO'S CONTRACT, AS VERIFIED AGAINST ITS PUBLIC REFERENCE
 * ---------------------------------------------------------------------------
 * `POST /preapproval` (the Subscriptions API — the same origin, and the same
 * missing `/v1` prefix, as `POST /preapproval_plan`):
 *
 *   · `preapproval_plan_id` — links the subscription to a plan. The reference
 *     states that a subscription created with a plan takes its recurring
 *     settings FROM THE PLAN, which is exactly why Cripqer still sends no money
 *     values here: amount, currency, frequency and trial live in the frozen
 *     PRO contract that created the plan, in one place, not two.
 *   · `payer_email` — marked REQUIRED by the reference ("to create a
 *     subscription, it must be linked to an email address"): it is how Mercado
 *     Pago assigns the subscriber identity. The value comes from the
 *     authenticated session, never from the browser.
 *   · `card_token_id` — REQUIRED with a plan. Produced by Mercado Pago's own
 *     client integration in the browser, from card fields Mercado Pago hosts,
 *     so this server never sees a PAN or a CVV. Single-use and short-lived; see
 *     the hygiene rules below.
 *   · `status: "authorized"` — REQUIRED with a plan, and this is the half of the
 *     provider's rule that is easiest to miss. The guide is unconditional, and
 *     the API reference's typing of the field as `optional` contradicts it. The
 *     contradiction is recorded rather than resolved by preference: the guide
 *     plus the captured 400 are the evidence, and where they disagree with the
 *     reference, the reference is the thing that has not been tested.
 *   · `back_url` — documented and optional here; omitted unless an explicit
 *     https URL is configured, in which case the plan's own return URL applies.
 *
 * DELIBERATELY STILL NOT SENT
 *   · `auto_recurring` (and therefore `amount`, `currency_id`, `frequency`,
 *     `frequency_type` and `free_trial`) — restating the plan's terms here would
 *     create a SECOND place where the price and the trial live, and the two
 *     could drift. `preapproval_plan_id` is the single source.
 *   · `external_reference` — Billing's ownership is `billing_subscriptions.
 *     provider_subscription_id`, written immediately after this call returns.
 *     No provider-side metadata is ever an ownership authority (see
 *     `applyNormalizedEvent`), so sending one would only invite the next reader
 *     to trust it.
 *   · `payer_id` — the provider assigns the payer; Cripqer identifies the payer
 *     by email and owns the subscription locally.
 *
 * ---------------------------------------------------------------------------
 * `card_token_id` HYGIENE — THE RULES THIS MODULE OWES THE CALLER
 * ---------------------------------------------------------------------------
 * The token is payment material. MP-M3D.6 could not find any Mercado Pago rule
 * that forbids logging or persisting it, so these are Cripqer's own rules, and
 * they are enforced by construction rather than by convention:
 *
 *   · It is never echoed. Every failure below names WHAT was wrong, never the
 *     value, so no message, reason or thrown error can carry the token to a log,
 *     a response body or an error monitor.
 *   · It is never retained. The token is a function parameter and a local; it is
 *     not assigned to a field of the returned object, and nothing in this module
 *     holds a reference to it once the call resolves.
 *   · It never reaches diagnostics. The client's diagnostic record has no field
 *     for a request body (see `client.ts`), and no caller here can add one.
 *   · It is used once. There is no retry in this module or above it: Mercado
 *     Pago documents no idempotency key for this endpoint, so a retry would be a
 *     second subscription — and a single-use token would be spent anyway.
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
 * The path of ONE subscription, for the authoritative readback.
 *
 * Lives here, beside the collection path, so the two cannot drift: a readback
 * that pointed somewhere other than the collection this module creates into
 * would be a silent way to report the state of the wrong resource.
 * `resource-fetcher.ts` builds the same path for the webhook's lookup — the
 * duplication is deliberate and narrow, and both are covered by tests that pin
 * the literal string.
 *
 * The id is `encodeURIComponent`-ed. It comes from the provider, but "it came
 * from a trusted place" is not a reason to interpolate a value into a URL path
 * unchecked.
 */
export function buildUserPreapprovalPath(preapprovalId: string): string {
  return `${MERCADOPAGO_PREAPPROVAL_PATH}/${encodeURIComponent(preapprovalId)}`;
}

/**
 * The ONE creation status this integration will ever send.
 *
 * Declared as a constant and used as a literal type so that `status` cannot be
 * parameterised anywhere in the call graph: `buildUserPreapprovalRequestBody`
 * accepts no status argument, and the field's type admits exactly this value.
 * A browser-supplied status is therefore not "rejected" — it is unrepresentable,
 * which is the stronger guarantee and the one worth having on a field that
 * decides whether a subscription is created authorized or not.
 *
 * The value is a server constant, never configuration: an environment variable
 * here would mean a deployment could create subscriptions in a state the rest of
 * Billing does not expect.
 */
export const MERCADOPAGO_AUTHORIZED_STATUS = "authorized" as const;

export type MercadoPagoSubscriptionCreationStatus = typeof MERCADOPAGO_AUTHORIZED_STATUS;

/**
 * The exact JSON body `POST /preapproval` receives from Cripqer.
 *
 * Five keys at most, every one of them documented by the provider's reference.
 * There is no field here for a user id, an amount, a currency, a frequency, a
 * trial or a caller-chosen status, so this interface is also the answer to "what
 * could a future edit accidentally start sending": nothing that is not a
 * documented, server-derived creation input.
 */
export interface UserPreapprovalRequestBody {
  /** The remote PRO plan. Its terms (7990 CLP/month, 10-day trial) apply. */
  preapproval_plan_id: string;
  /** The subscriber's email, from the authenticated session. */
  payer_email: string;
  /** Single-use payment instrument token, from Mercado Pago's client SDK. */
  card_token_id: string;
  /** Always `"authorized"`. Required with a plan; server constant. */
  status: MercadoPagoSubscriptionCreationStatus;
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
 *
 * Since MP-M3D.7 this error means ONLY "no id" — a response without a checkout
 * URL is no longer a failure, because the new flow does not need one to proceed.
 * See `readUserPreapprovalInitPoint`.
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
 * Validates the card token, and says nothing about it.
 *
 * Kept separate from `requireNonEmptyString` (which interpolates the offending
 * field's NAME, a safe practice for a plan id and an unsafe one here) so that a
 * reader can see at a glance that this path cannot echo payment material. The
 * message is fixed text; neither the value nor its length appears.
 *
 * The bound is the same one `card-token.ts` enforces on the way in. Re-checking
 * is deliberate: this builder must not be able to emit an empty or oversized
 * token even if a future caller reaches it without going through the request
 * contract.
 */
function requireCardTokenId(value: unknown): string {
  const token = typeof value === "string" ? value.trim() : "";
  if (token === "" || token.length > CARD_TOKEN_ID_MAX_LENGTH) {
    throw new MercadoPagoError(
      "INVALID_REQUEST",
      "Mercado Pago user preapproval requires a usable card_token_id; nothing was sent.",
    );
  }
  return token;
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
 * trial. A caller can only say which plan, which payer, which payment
 * instrument, and (optionally) where to return — never what it costs, and never
 * what status to create.
 *
 * The returned object is a fresh literal and the token is copied into it, which
 * is the one moment the value exists in two places. It is handed straight to
 * `createMercadoPagoUserPreapproval` and never stored, returned to a caller or
 * logged.
 */
export function buildUserPreapprovalRequestBody(options: {
  preapprovalPlanId: string;
  payerEmail: string;
  cardTokenId: string;
  backUrl?: string | null;
}): UserPreapprovalRequestBody {
  const body: UserPreapprovalRequestBody = {
    preapproval_plan_id: requireNonEmptyString(options.preapprovalPlanId, "a preapproval_plan_id"),
    payer_email: requireNonEmptyString(options.payerEmail, "a payer_email"),
    card_token_id: requireCardTokenId(options.cardTokenId),
    status: MERCADOPAGO_AUTHORIZED_STATUS,
  };

  const backUrl = optionalHttpsBackUrl(options.backUrl);
  if (backUrl !== undefined) body.back_url = backUrl;

  return body;
}

/* ============================ response reads =========================== */

/**
 * The fields this module reads off a creation response, declared as a NARROW
 * view rather than reusing the canonical resource type: `init_point` is a
 * creation-time checkout URL that Billing never persists, so it is not part of
 * `MercadoPagoPreapprovalResource`, and widening that type is not this module's
 * call to make. Every field stays `unknown` so every read below is a real check.
 */
interface PreapprovalCreationResponseView {
  id?: unknown;
  init_point?: unknown;
  status?: unknown;
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
 * Reads the provider status off a creation response.
 *
 * Returned as an opaque, trimmed, length-bounded string rather than validated
 * against a list of known statuses. Billing already owns the canonical mapping
 * from provider status to its own vocabulary (`webhooks.ts`), and duplicating
 * that list here would create a second place for it to drift — the exact failure
 * this integration has already been burned by once. An unknown status is
 * therefore passed through as text and left for the canonical layer to treat as
 * it treats any status it does not recognise: no grant.
 *
 * `null` means the response carried no usable status, which is a real and
 * actionable distinction from "the status was empty".
 */
export function readUserPreapprovalStatus(response: unknown): string | null {
  if (response === null || typeof response !== "object") return null;

  const status: unknown = (response as PreapprovalCreationResponseView).status;
  if (typeof status !== "string") return null;

  const trimmed = status.trim();
  if (trimmed === "" || trimmed.length > 64) return null;
  return trimmed;
}

/**
 * Reads the checkout URL the provider may offer for this subscription.
 *
 * Only an absolute https URL is accepted. This value can be handed to a browser
 * as a navigation target, so anything else — a relative path, `http://`, a
 * non-string — is refused here rather than navigated to later.
 *
 * SINCE MP-M3D.7 THIS VALUE IS OPTIONAL, and that is a deliberate change of
 * severity. The old flow CREATED a subscription and then sent the payer to this
 * URL to authorize it; without the URL there was nothing to do and the module
 * raised a critical error. The new flow has already taken the payment instrument
 * in the browser, so the subscription is created authorized and there is nothing
 * left to authorize: the URL is a secondary affordance (Mercado Pago documents
 * it as "add or modify payment method"), useful for changing a card later.
 *
 * Treating its absence as a critical failure now would be actively harmful: a
 * perfectly created subscription would be reported as
 * `REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED` and sent to manual recovery,
 * while the user's subscription sat healthy at the provider.
 */
export function readUserPreapprovalCheckoutUrl(response: unknown): string | null {
  if (response === null || typeof response !== "object") return null;

  const initPoint: unknown = (response as PreapprovalCreationResponseView).init_point;
  if (typeof initPoint !== "string") return null;

  const trimmed = initPoint.trim();
  return trimmed.startsWith("https://") ? trimmed : null;
}

/* ============================== creation =============================== */

/**
 * What a successful creation yields.
 *
 * Only `preapprovalId` is guaranteed: it is the ownership correlation's whole
 * subject, and without it nothing downstream can work. The other two are
 * best-effort reads of a response this module does not control, reported as
 * nullable rather than as absent fields so a caller must look at them.
 */
export interface CreatedUserPreapproval {
  preapprovalId: string;
  /** The provider's own status for the new subscription, when it reported one. */
  providerStatus: string | null;
  /** The provider's "add or modify payment method" URL, when it offered one. */
  checkoutUrl: string | null;
}

/**
 * Creates ONE user subscription. The second — and last — function in Billing
 * that mutates Mercado Pago state.
 *
 * Returns when the response yields a usable subscription id. The checkout URL
 * and the provider status are read but never required — see
 * `readUserPreapprovalCheckoutUrl` for why requiring the URL would now turn a
 * success into a false critical state.
 *
 * On a 2xx with no usable id it throws `UserPreapprovalResponseError` with
 * `preapprovalId: null`, so the host can report that a remote resource MAY exist
 * instead of silently losing it.
 *
 * Transport and provider rejections propagate as `MercadoPagoError` from the
 * client, unchanged and unretried. The `cardTokenId` this function receives is
 * never echoed back in any of those errors.
 */
export async function createMercadoPagoUserPreapproval(
  client: MercadoPagoWriteClient,
  options: {
    preapprovalPlanId: string;
    payerEmail: string;
    cardTokenId: string;
    backUrl?: string | null;
  },
): Promise<CreatedUserPreapproval> {
  const body = buildUserPreapprovalRequestBody(options);
  const response = await client.postJson(MERCADOPAGO_PREAPPROVAL_PATH, body);

  const preapprovalId = readUserPreapprovalId(response);
  const providerStatus = readUserPreapprovalStatus(response);
  const checkoutUrl = readUserPreapprovalCheckoutUrl(response);

  if (preapprovalId === null) {
    throw new UserPreapprovalResponseError(
      "Mercado Pago accepted the subscription request but returned no usable id. The subscription MAY have been created: check the Mercado Pago panel before retrying, so a second subscription is not created.",
      null,
    );
  }

  return { preapprovalId, providerStatus, checkoutUrl };
}
