/**
 * CRIPQER BILLING — CANONICAL PROVIDER HOST BOUNDARY V1
 *
 * Provider-neutral server-side boundary through which future provider-specific
 * adapters (Stripe, Mercado Pago, PayPal) integrate with canonical Billing.
 *
 * This module defines ONE common contract and a fail-closed registry. It makes
 * NO network calls, holds NO secrets, imports NO provider SDKs, and creates NO
 * routes. No real provider implementation exists yet — future adapters must
 * implement `ProviderAdapter`.
 *
 * PRICE AUTHORITY: an adapter receives only a server-resolved `ResolvedOffer`
 * from the Catalog; it never accepts a browser amount, currency, or provider
 * price id. Return/redirect is navigation only and never grants paid state.
 *
 * IDENTIFIER INTEGRITY: the canonical `checkoutId` (Cripqer), the
 * `providerCheckoutId` (provider), the `providerSubscriptionId` (provider), and
 * the `providerCustomerId` (provider) are DISTINCT concepts and are never
 * substituted for one another.
 */

import type {
  BillingCheckoutStatus,
  BillingInterval,
  BillingProvider,
  BillingSubscriptionStatus,
} from "../../lib/billing/billing.types.ts";

import type {
  ProviderSessionAdapter,
  ProviderSessionIntent,
  ProviderSessionResult,
  ResolvedOffer,
} from "./checkout.ts";

import type {
  ProviderResourceFetcher,
  ProviderResourceType,
  WebhookLookupInstruction,
  WebhookVerifier,
} from "./webhooks.ts";

// ============================================================
// PROVIDER STATE TYPES (normalized, provider-neutral)
// ============================================================

/**
 * Authoritative result of a provider checkout/session lookup. Distinct from the
 * canonical persisted checkout row — it is the provider's view of the session.
 */
export interface ProviderCheckoutStatus {
  /** Provider's own checkout/session id (never the canonical checkoutId). */
  providerCheckoutId: string;
  /** Canonical checkout status semantics, derived from provider state. */
  state: BillingCheckoutStatus;
  /** Provider subscription id, when the session has produced one. */
  providerSubscriptionId: string | null;
  /**
   * true when the session/subscription relationship must be resolved through an
   * authoritative provider resource fetch before state can be trusted.
   */
  requiresAuthoritativeLookup: boolean;
}

/**
 * Authoritative normalized provider subscription state. This is NOT canonical
 * persistence (no `billing_subscriptions` row is duplicated) — it is the
 * provider-neutral information the adapter hands to canonical Billing logic.
 */
export interface ProviderSubscriptionSnapshot {
  providerSubscriptionId: string;
  providerCustomerId: string | null;
  providerPlanId: string | null;
  billingInterval: BillingInterval | null;
  currency: string | null;
  status: BillingSubscriptionStatus | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  requiresAuthoritativeLookup: boolean;
}

/**
 * Plan-change request. The `targetOffer` is a server-resolved `ResolvedOffer`
 * from the Catalog — never a browser-supplied plan or price. Same-plan
 * monthly/yearly switches and upgrades/downgrades use this path; the boundary
 * must NOT silently create a second subscription nor cancel-then-recreate.
 */
export interface ProviderChangePlanInput {
  providerSubscriptionId: string;
  targetOffer: ResolvedOffer;
}

/**
 * Cancellation request. `atPeriodEnd` is a provider-semantic hint only; the
 * final cancellation/proration business policy is NOT chosen by this boundary.
 */
export interface ProviderCancelInput {
  providerSubscriptionId: string;
  atPeriodEnd?: boolean;
}

/** Reactivation request (undoes a scheduled cancellation). */
export interface ProviderReactivateInput {
  providerSubscriptionId: string;
}


// ============================================================
// PROVIDER ADAPTER CONTRACT
// ============================================================

/**
 * The single common contract every future provider-specific adapter (Stripe,
 * Mercado Pago, PayPal) must implement.
 *
 * Checkout compatibility: `ProviderAdapter extends ProviderSessionAdapter`, so
 * any adapter is directly usable as the Checkout Host's provider-session seam.
 * The `createSession(intent)` operation IS the provider checkout/session
 * creation step: it receives the canonical `checkoutId`, trusted `userId`,
 * server-resolved `offer`, and server-generated `returnUrl`/`cancelUrl`, and
 * returns a provider `providerCheckoutId` + `redirectUrl`.
 *
 * Webhook compatibility: `verifier` and `fetcher` use the frozen
 * `WebhookVerifier` and `ProviderResourceFetcher` contracts verbatim.
 */
export interface ProviderAdapter extends ProviderSessionAdapter {
  /** The canonical provider this adapter serves. */
  readonly provider: BillingProvider;

  /** Authoritative provider checkout/session lookup. */
  getCheckoutStatus(providerCheckoutId: string): Promise<ProviderCheckoutStatus>;

  /** Authoritative provider subscription lookup (null when not found). */
  getSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscriptionSnapshot | null>;

  /** Provider-native plan/interval change (no second subscription, no cancel-recreate). */
  changePlan(input: ProviderChangePlanInput): Promise<ProviderSubscriptionSnapshot>;

  /** Provider-native cancellation. */
  cancel(input: ProviderCancelInput): Promise<ProviderSubscriptionSnapshot>;

  /** Provider-native reactivation of a scheduled cancellation. */
  reactivate(input: ProviderReactivateInput): Promise<ProviderSubscriptionSnapshot>;

  /** Raw-webhook signature verification (timing-safe, secret-held by adapter). */
  readonly verifier: WebhookVerifier;

  /** Authoritative provider resource fetch for thin notifications / lookups. */
  readonly fetcher: ProviderResourceFetcher;
}

/**
 * Compile-time guarantee: the provider adapter structurally satisfies the
 * Checkout Host `ProviderSessionAdapter` seam. If this fails to compile, the
 * adapter is no longer checkout-compatible and the change must be reverted.
 */
type _AdapterSatisfiesSessionAdapter =
  ProviderAdapter extends ProviderSessionAdapter ? true : never;

// ============================================================
// PROVIDER REGISTRY
// ============================================================

/**
 * Resolves a configured adapter for a canonical `BillingProvider`. Returns
 * `null` (fail closed) for any unconfigured provider — never falls back to a
 * different provider and never simulates success.
 */
export interface ProviderRegistry {
  getAdapter(provider: BillingProvider): ProviderAdapter | null;
}

/**
 * Builds a provider registry from an explicitly-configured adapter map.
 * Unconfigured providers fail closed.
 */
export function createProviderRegistry(
  adapters: Readonly<Partial<Record<BillingProvider, ProviderAdapter>>>,
): ProviderRegistry {
  return {
    getAdapter(provider) {
      return adapters[provider] ?? null;
    },
  };
}

// ============================================================
// WEBHOOK LOOKUP BRIDGE
// ============================================================

/**
 * Converts a `WebhookLookupInstruction` (emitted by Webhook Core when a
 * notification is thin or unresolved) into the arguments expected by a
 * provider adapter's `ProviderResourceFetcher.fetchResource`. Returns null when
 * the instruction carries no resource id (nothing safe to fetch).
 */
export function webhookLookupFetchInput(
  lookup: WebhookLookupInstruction,
): { resourceType: ProviderResourceType; resourceId: string } | null {
  if (!lookup.resourceId) return null;
  return { resourceType: lookup.resourceType, resourceId: lookup.resourceId };
}

// ============================================================
// DEFAULT PRODUCTION STATE
// ============================================================

/**
 * Default production registry: NO configured provider adapters. Every
 * `getAdapter` call fails closed until a real adapter is explicitly wired.
 */
export const EMPTY_PROVIDER_REGISTRY: ProviderRegistry = createProviderRegistry({});

/** Convenience alias for the empty default registry. */
export const DEFAULT_PROVIDER_REGISTRY: ProviderRegistry = EMPTY_PROVIDER_REGISTRY;
