/**
 * CRIPQER BILLING — CANONICAL SERVER BILLING CATALOG CORE V1
 *
 * Server-authoritative source of truth for sellable Billing offers.
 *
 * The catalog owns:
 *   - which paid plans exist (pro / business / enterprise)
 *   - which billing intervals exist (monthly / yearly)
 *   - which providers are supported (stripe / mercado_pago / paypal)
 *   - which plan/interval/provider combinations are enabled
 *   - currency, amount (integer minor units), and the opaque provider offer
 *     reference
 *   - whether an offer may be used for checkout
 *
 * It does NOT own UI feature gating, entitlements, subscription persistence,
 * provider network calls, taxes, discounts, or coupons.
 *
 * PRICE AUTHORITY: the browser is NEVER an authority for amount, currency, or
 * provider offer reference — those resolve exclusively from the trusted
 * server-side registry. Free is NOT a paid offer and never produces a
 * checkout offer. The "agency" plan is RESERVED ONLY and is never added to the
 * canonical types.
 *
 * DEFAULT PRODUCTION STATE: NO enabled production offers. The default registry
 * is empty, so every `resolveOffer` call fails closed (returns null) until an
 * explicitly-configured production offer registry is injected. No portable
 * placeholder prices and no _TEST provider references are promoted here.
 */

import {
  BILLING_INTERVALS,
  BILLING_PLAN_IDS,
  BILLING_PROVIDERS,
  type BillingInterval,
  type BillingPlanId,
  type BillingProvider,
} from "../../lib/billing/billing.types.ts";

import type {
  BillingCatalogResolver,
  ResolvedOffer,
  ValidatedCheckoutRequest,
} from "./checkout.ts";

// ============================================================
// OFFER DEFINITION (server-authoritative)
// ============================================================

/**
 * A single trusted, server-side offer definition.
 *
 * `amount` is an integer in minor units (e.g. USD cents, or a whole
 * zero-decimal unit such as CLP). Floating-point money arithmetic is forbidden.
 * An enabled offer must carry a positive integer amount; a disabled offer
 * (e.g. contact-sales Enterprise) may carry `0`.
 */
export interface CatalogOfferDefinition {
  planId: BillingPlanId;
  billingInterval: BillingInterval;
  provider: BillingProvider;
  /** Uppercase ISO-like currency code, e.g. "USD" or "CLP". */
  currency: string;
  /** Integer minor units. Must be a positive integer when `enabled`. */
  amount: number;
  /**
   * Opaque server-side provider price/plan reference. Never a secret, never an
   * amount, never trusted from the browser. May be empty only on a disabled
   * (contact-sales) offer.
   */
  providerOfferReference: string;
  /** Whether this offer may be used for checkout. */
  enabled: boolean;
}

/**
 * Optional presentation metadata. Kept strictly separate from money/provider
 * authority; never used to decide a checkout offer.
 */
export interface CatalogPlanPresentation {
  planId: BillingPlanId;
  displayName: string;
  order: number;
  shortDescription: string | null;
  /** true => plan is sold via a sales contact, not self-serve checkout. */
  contactSales: boolean;
}

/**
 * A trusted server-side catalog registry. Production wiring injects a registry
 * built from approved configuration only; the browser never supplies it.
 */
export interface CatalogRegistry {
  offers: readonly CatalogOfferDefinition[];
  planPresentation?: readonly CatalogPlanPresentation[];
}


// ============================================================
// VALIDATION
// ============================================================

export type CatalogValidationCode =
  | "DUPLICATE_OFFER"
  | "FREE_OFFER"
  | "UNSUPPORTED_PLAN"
  | "UNSUPPORTED_PROVIDER"
  | "UNSUPPORTED_INTERVAL"
  | "INVALID_AMOUNT"
  | "INVALID_CURRENCY"
  | "EMPTY_PROVIDER_REFERENCE"
  | "MALFORMED_ENABLED_OFFER";

export interface CatalogValidationIssue {
  code: CatalogValidationCode;
  message: string;
  /** Index into the offers array (or -1 when not tied to a single offer). */
  index: number;
}

export interface CatalogValidationResult {
  valid: boolean;
  issues: CatalogValidationIssue[];
}

const CANONICAL_PLANS = BILLING_PLAN_IDS as readonly string[];
const CANONICAL_PROVIDERS = BILLING_PROVIDERS as readonly string[];
const CANONICAL_INTERVALS = BILLING_INTERVALS as readonly string[];

/** Uppercase ISO-4217-like currency code (3 ASCII uppercase letters). */
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function isSupportedPlan(value: string): value is BillingPlanId {
  return CANONICAL_PLANS.includes(value);
}

export function isSupportedProvider(value: string): value is BillingProvider {
  return CANONICAL_PROVIDERS.includes(value);
}

export function isSupportedInterval(value: string): value is BillingInterval {
  return CANONICAL_INTERVALS.includes(value);
}

export function isCanonicalCurrency(value: string): boolean {
  return CURRENCY_PATTERN.test(value);
}

export function isNonEmptyReference(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Validates a trusted offer registry and returns every structural violation.
 *
 * Rules (fail-closed):
 *   - duplicate plan/interval/provider combination
 *   - "free" plan (free is never a paid offer)
 *   - unsupported plan / provider / interval
 *   - non-integer or negative amount (minor-unit contract)
 *   - non-uppercase or empty currency code
 *   - empty providerOfferReference on an enabled offer
 *   - any enabled offer that would be unsafe for checkout
 */
export function validateCatalogOffers(
  offers: readonly CatalogOfferDefinition[],
): CatalogValidationResult {
  const issues: CatalogValidationIssue[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < offers.length; i++) {
    const offer = offers[i] as CatalogOfferDefinition | undefined;
    if (!offer) continue;

    const plan = offer.planId as string;
    const interval = offer.billingInterval as string;
    const provider = offer.provider as string;

    // Duplicate detection (plan + interval + provider).
    const key = offerKey(plan, interval, provider);
    const firstIndex = seen.get(key);
    if (firstIndex !== undefined) {
      issues.push({
        code: "DUPLICATE_OFFER",
        message: `Duplicate plan/interval/provider combination (indexes ${firstIndex} and ${i}).`,
        index: i,
      });
    } else {
      seen.set(key, i);
    }

    // Free is not a paid offer.
    if (plan === "free") {
      issues.push({
        code: "FREE_OFFER",
        message: "Free is not a paid Billing offer and must not produce a provider checkout offer.",
        index: i,
      });
      continue;
    }

    if (!isSupportedPlan(plan)) {
      issues.push({
        code: "UNSUPPORTED_PLAN",
        message: `Unsupported plan "${plan}".`,
        index: i,
      });
    }

    if (!isSupportedProvider(provider)) {
      issues.push({
        code: "UNSUPPORTED_PROVIDER",
        message: `Unsupported provider "${provider}".`,
        index: i,
      });
    }

    if (!isSupportedInterval(interval)) {
      issues.push({
        code: "UNSUPPORTED_INTERVAL",
        message: `Unsupported billing interval "${interval}".`,
        index: i,
      });
    }

    // Amount: integer minor units, non-negative.
    if (!Number.isInteger(offer.amount)) {
      issues.push({
        code: "INVALID_AMOUNT",
        message: `Amount must be an integer minor-unit value, got ${offer.amount}.`,
        index: i,
      });
    } else if (offer.amount < 0) {
      issues.push({
        code: "INVALID_AMOUNT",
        message: `Amount must not be negative, got ${offer.amount}.`,
        index: i,
      });
    }

    // Currency: uppercase ISO-like code.
    if (!isCanonicalCurrency(offer.currency)) {
      issues.push({
        code: "INVALID_CURRENCY",
        message: `Currency must be an uppercase ISO-like code, got "${offer.currency}".`,
        index: i,
      });
    }

    // Enabled offers must carry a non-empty provider reference.
    if (offer.enabled && !isNonEmptyReference(offer.providerOfferReference)) {
      issues.push({
        code: "EMPTY_PROVIDER_REFERENCE",
        message: "providerOfferReference must not be empty on an enabled offer.",
        index: i,
      });
    }

    // An enabled offer must be fully safe for checkout.
    if (offer.enabled) {
      const amountOk = Number.isInteger(offer.amount) && offer.amount > 0;
      const referenceOk = isNonEmptyReference(offer.providerOfferReference);
      const currencyOk = isCanonicalCurrency(offer.currency);
      const planOk = isSupportedPlan(plan);
      const intervalOk = isSupportedInterval(interval);
      const providerOk = isSupportedProvider(provider);
      if (!(amountOk && referenceOk && currencyOk && planOk && intervalOk && providerOk)) {
        issues.push({
          code: "MALFORMED_ENABLED_OFFER",
          message: "Enabled offer is malformed and unsafe for checkout.",
          index: i,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

// ============================================================
// RESOLVER
// ============================================================

/**
 * The server-authoritative catalog. Provides the `BillingCatalogResolver` seam
 * expected by Checkout Host and fails closed on any unknown or malformed
 * combination.
 */
export interface ServerBillingCatalog {
  resolveOffer(input: ValidatedCheckoutRequest): ResolvedOffer | null;
  readonly offers: readonly CatalogOfferDefinition[];
  readonly planPresentation: readonly CatalogPlanPresentation[];
  readonly validation: CatalogValidationResult;
}

/**
 * Compile-time guarantee: the catalog's synchronous `resolveOffer` satisfies
 * Checkout Host's `BillingCatalogResolver` seam (which also permits an async
 * variant). If this type fails to compile, the catalog is no longer
 * host-compatible and the change must be reverted.
 */
type _CatalogSatisfiesResolver =
  ServerBillingCatalog extends BillingCatalogResolver ? true : never;

function offerKey(planId: string, interval: string, provider: string): string {
  return `${planId}::${interval}::${provider}`;
}

/**
 * Builds a server-authoritative catalog from a trusted registry.
 *
 * If the registry is invalid, the catalog is still constructed but every
 * `resolveOffer` call fails closed (returns null). Validation issues remain
 * available on `catalog.validation` for diagnostics.
 */
export function createBillingCatalog(
  registry: CatalogRegistry,
): ServerBillingCatalog {
  const offers = registry.offers;
  const planPresentation = registry.planPresentation ?? [];
  const validation = validateCatalogOffers(offers);

  const index = new Map<string, CatalogOfferDefinition>();
  for (const offer of offers) {
    const key = offerKey(
      offer.planId as string,
      offer.billingInterval as string,
      offer.provider as string,
    );
    // Validation already flags duplicates; the first entry wins here, but
    // `resolveOffer` fails closed while `validation.valid` is false, so
    // ambiguity is never returned to a caller.
    if (!index.has(key)) {
      index.set(key, offer);
    }
  }

  function resolveOffer(
    input: ValidatedCheckoutRequest,
  ): ResolvedOffer | null {
    // Fail closed: an invalid registry can never produce an offer.
    if (!validation.valid) {
      return null;
    }

    // Defensive runtime guards. `ValidatedCheckoutRequest` is already typed,
    // but the boundary re-checks membership so an unexpected value can never
    // resolve.
    if (!isSupportedPlan(input.planId)) return null;
    if (!isSupportedInterval(input.billingInterval)) return null;
    if (!isSupportedProvider(input.provider)) return null;

    const offer = index.get(offerKey(input.planId, input.billingInterval, input.provider));
    if (!offer) return null;

    // Re-validate authoritative fields defensively before returning.
    if (!offer.enabled) return null;
    if (!Number.isInteger(offer.amount) || offer.amount <= 0) return null;
    if (!isCanonicalCurrency(offer.currency)) return null;
    if (!isNonEmptyReference(offer.providerOfferReference)) return null;

    return {
      planId: offer.planId,
      billingInterval: offer.billingInterval,
      provider: offer.provider,
      currency: offer.currency,
      amount: offer.amount,
      providerOfferReference: offer.providerOfferReference,
    };
  }

  return {
    resolveOffer,
    offers,
    planPresentation,
    validation,
  };
}

// ============================================================
// DEFAULT PRODUCTION STATE
// ============================================================

/**
 * The default production registry. Intentionally EMPTY: no production prices
 * have been approved, so no offer can resolve. Production wiring must inject a
 * registry built from explicitly-approved configuration before any checkout
 * can succeed.
 */
export const EMPTY_CATALOG_REGISTRY: CatalogRegistry = {
  offers: [],
  planPresentation: [],
};

/**
 * Convenience default catalog (empty registry). Fails closed on every request.
 */
export const DEFAULT_BILLING_CATALOG: ServerBillingCatalog =
  createBillingCatalog(EMPTY_CATALOG_REGISTRY);

