import "@tanstack/react-start/server-only";

import {
  BILLING_CHECKOUT_STATUSES,
  BILLING_INTERVALS,
  BILLING_PLAN_IDS,
  BILLING_PROVIDERS,
  type BillingCheckoutInput,
  type BillingCheckoutRecord,
  type BillingCheckoutStatus,
  type BillingInterval,
  type BillingPlanId,
  type BillingProvider,
} from "../../lib/billing/billing.types.ts";

/**
 * CRIPQER BILLING — CANONICAL CHECKOUT HOST CORE V1
 *
 * Server-authoritative boundary for creating, retrieving, and preparing
 * checkout sessions. This module owns the trusted-user identity, checkout
 * request validation, canonical checkout creation, ownership enforcement, and
 * the provider-neutral checkout contract.
 *
 * It does NOT own provider network calls, provider SDKs, provider credentials,
 * pricing UI, or paid-entitlement activation. It deliberately exposes a
 * dependency-injection seam (catalog resolver + store + optional provider
 * session adapter) so that:
 *   - the browser never supplies authoritative identity or price, and
 *   - the selfcheck can exercise the domain with pure local mocks (no network,
 *     no database).
 *
 * Production wiring (a future server route) must adapt the frozen boundaries:
 *   - `requireBillingUser()`            -> `CheckoutUserSource.requireUser`
 *   - `resolveOffer` (server catalog)   -> `BillingCatalogResolver.resolveOffer`
 *   - `createBillingCheckout` /
 *     `getBillingCheckoutForUser` /
 *     `updateBillingCheckoutStatus`     -> `CheckoutStore`
 */

// ============================================================
// ERRORS
// ============================================================

export class CheckoutValidationError extends Error {
  readonly code = "BILLING_CHECKOUT_VALIDATION_ERROR" as const;
  readonly status = 400 as const;

  constructor(message: string) {
    super(message);
    this.name = "CheckoutValidationError";
  }
}

export class CheckoutNotFoundError extends Error {
  readonly code = "BILLING_CHECKOUT_NOT_FOUND" as const;
  readonly status = 404 as const;

  constructor(message: string) {
    super(message);
    this.name = "CheckoutNotFoundError";
  }
}

/**
 * Thrown when the server-authoritative catalog cannot produce an offer for the
 * requested plan/interval/provider combination. The host fails closed.
 */
export class CheckoutOfferUnavailableError extends Error {
  readonly code = "BILLING_CHECKOUT_OFFER_UNAVAILABLE" as const;
  readonly status = 422 as const;

  constructor(message: string) {
    super(message);
    this.name = "CheckoutOfferUnavailableError";
  }
}

// ============================================================
// DOMAIN TYPES (checkout-specific DTOs only — no duplicate canonical types)
// ============================================================

/**
 * Server-authoritative offer produced by the catalog resolver. This is the
 * ONLY source of truth for price. The browser never supplies amount, currency,
 * or a provider price id.
 */
export interface ResolvedOffer {
  planId: BillingPlanId;
  billingInterval: BillingInterval;
  provider: BillingProvider;
  currency: string;
  amount: number;
  providerOfferReference: string | null;
}

/**
 * Validated request triple. Produced by `parseCheckoutRequest` from untrusted
 * browser input; never constructed directly from client values.
 */
export interface ValidatedCheckoutRequest {
  planId: BillingPlanId;
  billingInterval: BillingInterval;
  provider: BillingProvider;
}

/**
 * Normalized result of a successful checkout creation. Carries the resolved
 * offer so a future provider adapter can be given exactly the server-validated
 * price, and a durable canonical checkout id.
 */
export interface CheckoutDescriptor {
  checkoutId: string;
  userId: string;
  planId: BillingPlanId;
  billingInterval: BillingInterval;
  provider: BillingProvider;
  currency: string;
  amount: number;
  providerOfferReference: string | null;
  providerCheckoutId: string | null;
  status: BillingCheckoutStatus;
  createdAt: string;
  expiresAt: string | null;
}

/**
 * Normalized persisted state returned by a status query. Contains ONLY
 * canonical persisted columns — never a server-resolved price (prices are not
 * persisted on the checkout row).
 */
export interface CheckoutStatusSnapshot {
  checkoutId: string;
  userId: string;
  planId: BillingPlanId;
  billingInterval: BillingInterval;
  provider: BillingProvider;
  providerCheckoutId: string | null;
  status: BillingCheckoutStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

// ============================================================
// DEPENDENCY CONTRACTS
// ============================================================

/**
 * Trusted-user source. Production wiring uses `requireBillingUser()`; the
 * browser-supplied user id is NEVER accepted as this authority.
 */
export interface CheckoutUserSource {
  requireUser(): Promise<{ userId: string; email: string | null }>;
}

/**
 * Server-side catalog resolver. Authoritative for currency/amount/provider
 * offer reference. Returns `null` (fail closed) for any unknown combination.
 */
export interface BillingCatalogResolver {
  resolveOffer(
    input: ValidatedCheckoutRequest,
  ): Promise<ResolvedOffer | null> | ResolvedOffer | null;
}

/**
 * Checkout persistence seam. Mirrors the canonical `persistence.ts` signatures
 * (`createBillingCheckout`, `getBillingCheckoutForUser`,
 * `updateBillingCheckoutStatus`) so production wiring is a thin passthrough.
 */
export interface CheckoutStore {
  createCheckout(input: BillingCheckoutInput): Promise<BillingCheckoutRecord>;
  getCheckoutForUser(
    checkoutId: string,
    userId: string,
  ): Promise<BillingCheckoutRecord | null>;
  updateCheckoutStatus(
    checkoutId: string,
    userId: string,
    status: BillingCheckoutStatus,
  ): Promise<BillingCheckoutRecord>;
}

/**
 * Future provider-session adapter. NOT invoked against a real provider in this
 * phase; the selfcheck uses a local mock exclusively.
 */
export interface ProviderSessionIntent {
  checkoutId: string;
  offer: ResolvedOffer;
  userId: string;
  email: string | null;
  returnUrl: string | null;
  cancelUrl: string | null;
}

export interface ProviderSessionResult {
  providerCheckoutId: string;
  redirectUrl: string;
  provider: BillingProvider;
}

export interface ProviderSessionAdapter {
  createSession(intent: ProviderSessionIntent): Promise<ProviderSessionResult>;
}

export interface CheckoutHostDeps {
  userSource: CheckoutUserSource;
  catalog: BillingCatalogResolver;
  store: CheckoutStore;
  /** Server-generated return/cancel intents (never derived from client). */
  returnUrl?: string | null;
  cancelUrl?: string | null;
}

// ============================================================
// STATE GUARDS
// ============================================================

/**
 * Portable-UI-only states that must never be persisted nor returned as a
 * canonical checkout status.
 */
export const UI_ONLY_CHECKOUT_STATES = ["idle", "redirecting"] as const;
export type UiOnlyCheckoutState = (typeof UI_ONLY_CHECKOUT_STATES)[number];

export function isUiOnlyCheckoutState(value: string): value is UiOnlyCheckoutState {
  return (UI_ONLY_CHECKOUT_STATES as readonly string[]).includes(value);
}

export function isPersistableCheckoutStatus(value: string): value is BillingCheckoutStatus {
  return (
    !isUiOnlyCheckoutState(value) &&
    (BILLING_CHECKOUT_STATUSES as readonly string[]).includes(value)
  );
}

function assertCanonicalStatus(status: string): BillingCheckoutStatus {
  if (!isPersistableCheckoutStatus(status)) {
    // Fail closed: a non-canonical state must never leak out of this module.
    throw new Error(`Non-canonical checkout status encountered: ${status}`);
  }
  return status;
}

// ============================================================
// REQUEST PARSING (untrusted browser input)
// ============================================================

/**
 * Parses an untrusted request body. Only `planId`, `billingInterval`, and
 * `provider` are read. `userId`, `amount`, `currency`, `providerPriceId`, and
 * any other keys are deliberately ignored — the browser is never an authority
 * for identity or price.
 */
export function parseCheckoutRequest(raw: unknown): ValidatedCheckoutRequest {
  const obj =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const planId = obj["planId"];
  const billingInterval = obj["billingInterval"];
  const provider = obj["provider"];

  if (
    typeof planId !== "string" ||
    !(BILLING_PLAN_IDS as readonly string[]).includes(planId)
  ) {
    // Note: "free" is intentionally absent from BILLING_PLAN_IDS, so a
    // `planId: "free"` request fails closed here.
    throw new CheckoutValidationError("Invalid or missing planId.");
  }

  if (
    typeof billingInterval !== "string" ||
    !(BILLING_INTERVALS as readonly string[]).includes(billingInterval)
  ) {
    throw new CheckoutValidationError("Invalid or missing billingInterval.");
  }

  if (
    typeof provider !== "string" ||
    !(BILLING_PROVIDERS as readonly string[]).includes(provider)
  ) {
    throw new CheckoutValidationError("Invalid or missing provider.");
  }

  return {
    planId: planId as BillingPlanId,
    billingInterval: billingInterval as BillingInterval,
    provider: provider as BillingProvider,
  };
}

/**
 * Defensive validation of a server-resolved offer. The catalog resolver is
 * authoritative for price, but the host still validates the shape so a
 * misconfigured resolver cannot produce a malformed or mismatched offer.
 */
function validateResolvedOffer(
  offer: ResolvedOffer,
  requested: ValidatedCheckoutRequest,
): void {
  if (
    offer.planId !== requested.planId ||
    offer.billingInterval !== requested.billingInterval ||
    offer.provider !== requested.provider
  ) {
    throw new CheckoutOfferUnavailableError(
      "Resolved offer does not match the requested checkout.",
    );
  }

  if (
    typeof offer.amount !== "number" ||
    !Number.isFinite(offer.amount) ||
    offer.amount < 0
  ) {
    throw new CheckoutOfferUnavailableError(
      "Resolved offer has an invalid amount.",
    );
  }

  if (typeof offer.currency !== "string" || !offer.currency.trim()) {
    throw new CheckoutOfferUnavailableError(
      "Resolved offer has an invalid currency.",
    );
  }
}

// ============================================================
// MAPPERS
// ============================================================

function toCheckoutDescriptor(
  record: BillingCheckoutRecord,
  offer: ResolvedOffer,
): CheckoutDescriptor {
  return {
    checkoutId: record.id,
    userId: record.user_id,
    planId: record.plan_id,
    billingInterval: record.billing_interval,
    provider: record.provider,
    currency: offer.currency,
    amount: offer.amount,
    providerOfferReference: offer.providerOfferReference,
    providerCheckoutId: record.provider_checkout_id,
    status: assertCanonicalStatus(record.status),
    createdAt: record.created_at,
    expiresAt: record.expires_at,
  };
}

function toStatusSnapshot(record: BillingCheckoutRecord): CheckoutStatusSnapshot {
  return {
    checkoutId: record.id,
    userId: record.user_id,
    planId: record.plan_id,
    billingInterval: record.billing_interval,
    provider: record.provider,
    providerCheckoutId: record.provider_checkout_id,
    status: assertCanonicalStatus(record.status),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    expiresAt: record.expires_at,
  };
}

// ============================================================
// CREATE CHECKOUT
// ============================================================

/**
 * Creates a canonical checkout for the trusted authenticated user.
 *
 * Flow: require user -> validate request -> resolve authoritative offer ->
 * create canonical `billing_checkouts` row -> return durable `checkoutId` +
 * normalized descriptor.
 */
export async function createCheckout(
  deps: CheckoutHostDeps,
  raw: unknown,
): Promise<CheckoutDescriptor> {
  // 1. Identity authority — never from the browser.
  const user = await deps.userSource.requireUser();

  // 2. Validate the untrusted request (plan/interval/provider only).
  const requested = parseCheckoutRequest(raw);

  // 3. Resolve the server-authoritative offer. `null` fails closed.
  const offer = await deps.catalog.resolveOffer(requested);
  if (!offer) {
    throw new CheckoutOfferUnavailableError(
      "No offer available for the requested plan/interval/provider.",
    );
  }
  validateResolvedOffer(offer, requested);

  // 4. Create the canonical row. The owner is the TRUSTED user id, never a
  //    client-supplied id. Status always starts at "processing" (a canonical
  //    persisted state); "idle"/"redirecting" are never persisted.
  const input: BillingCheckoutInput = {
    user_id: user.userId,
    provider: offer.provider,
    plan_id: offer.planId,
    billing_interval: offer.billingInterval,
    provider_checkout_id: null,
    status: "processing",
    expires_at: null,
  };

  const record = await deps.store.createCheckout(input);

  return toCheckoutDescriptor(record, offer);
}

// ============================================================
// GET CHECKOUT STATUS
// ============================================================

/**
 * Returns the normalized persisted checkout state for the authenticated user.
 * Ownership is enforced by scoping the lookup to the trusted user id (the
 * canonical `getBillingCheckoutForUser(checkoutId, userId)` behavior).
 */
export async function getCheckoutStatus(
  deps: CheckoutHostDeps,
  checkoutId: string,
): Promise<CheckoutStatusSnapshot> {
  const user = await deps.userSource.requireUser();

  const record = await deps.store.getCheckoutForUser(checkoutId, user.userId);
  if (!record) {
    throw new CheckoutNotFoundError("Checkout not found for this user.");
  }

  return toStatusSnapshot(record);
}

// ============================================================
// RETURN URL FLOW (read-only)
// ============================================================

/**
 * A return URL is ONLY allowed to trigger a status query. Query parameters
 * (e.g. `?success=true`) are never trusted and never mutate paid state.
 * Activation of a paid entitlement happens exclusively through a future
 * verified webhook / authoritative provider lookup — never here.
 */
export async function handleCheckoutReturn(
  deps: CheckoutHostDeps,
  checkoutId: string,
): Promise<CheckoutStatusSnapshot> {
  return getCheckoutStatus(deps, checkoutId);
}

// ============================================================
// PROVIDER SESSION BOUNDARY (future adapter seam)
// ============================================================

/**
 * Builds a provider-session intent from the trusted user and a FRESHLY
 * re-resolved server offer, then delegates to the injected provider adapter.
 *
 * The adapter receives ONLY server-validated data (canonical checkout id,
 * server-resolved offer, trusted user id). No provider network call is made in
 * this phase; the selfcheck exercises this seam with a local mock.
 */
export async function startProviderSession(
  deps: CheckoutHostDeps,
  checkoutId: string,
  adapter: ProviderSessionAdapter,
): Promise<ProviderSessionResult> {
  const user = await deps.userSource.requireUser();

  const record = await deps.store.getCheckoutForUser(checkoutId, user.userId);
  if (!record) {
    throw new CheckoutNotFoundError("Checkout not found for this user.");
  }

  const requested: ValidatedCheckoutRequest = {
    planId: record.plan_id,
    billingInterval: record.billing_interval,
    provider: record.provider,
  };

  const offer = await deps.catalog.resolveOffer(requested);
  if (!offer) {
    throw new CheckoutOfferUnavailableError(
      "No offer available for this checkout.",
    );
  }
  validateResolvedOffer(offer, requested);

  const intent: ProviderSessionIntent = {
    checkoutId: record.id,
    offer,
    userId: user.userId,
    email: user.email,
    returnUrl: deps.returnUrl ?? null,
    cancelUrl: deps.cancelUrl ?? null,
  };

  return adapter.createSession(intent);
}

// ============================================================
// PROVIDER CHECKOUT UPDATE (server-only host helper)
// ============================================================

/**
 * Server-only helper for a future provider adapter to transition a canonical
 * checkout's state after a provider session is created. Uses the canonical
 * `updateBillingCheckoutStatus` behavior (scoped to the trusted user id).
 *
 * Note: attaching `provider_checkout_id` onto an existing row requires a future
 * canonical persistence function (frozen scope has none); this helper
 * transitions state only, defaulting to "pending" (session created, awaiting
 * payment).
 */
export async function markCheckoutPending(
  deps: CheckoutHostDeps,
  checkoutId: string,
): Promise<CheckoutStatusSnapshot> {
  const user = await deps.userSource.requireUser();

  const record = await deps.store.updateCheckoutStatus(
    checkoutId,
    user.userId,
    "pending",
  );

  return toStatusSnapshot(record);
}
