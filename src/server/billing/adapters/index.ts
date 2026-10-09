/**
 * CRIPQER BILLING — B0 · PROVIDER ADAPTER WIRING POINT
 *
 * The architecture B0 fixes is deliberately narrow:
 *
 *     Billing Core  →  Entitlement  →  adapters
 *                                       ├── paypal
 *                                       └── mercadopago
 *
 * The direction matters, and it is the reason this file exists at all:
 *
 *   · A provider REPORTS events and payments. It observes, it does not decide.
 *   · A provider NEVER decides whether the UI shows Pro. It cannot: the only
 *     thing an adapter can produce is a normalized event, and the only thing
 *     that turns events into access is the Billing Core (persistence →
 *     `resolveEntitlementWithGrants`). An adapter has no path to the UI.
 *   · Losing an adapter degrades to "cannot charge", never to "everyone is
 *     Pro". The registry fails closed.
 *
 * WHY THIS FILE IS (STILL) EMPTY OF ADAPTERS
 * B0 is the foundation phase: one source of truth for entitlement, and the
 * invitation leak closed. No provider is integrated here, by explicit decision —
 * configuring a provider before the entitlement has a single owner would have
 * meant wiring two half-systems together.
 *
 * The `ProviderAdapter` contract in `../providers.ts` is already written and
 * frozen. This module is the ONE place where an adapter gets registered, so the
 * next phase has an obvious seam instead of inventing a second registry.
 *
 * WHERE MP-M1 LEFT IT
 * MP-M1 delivered the Mercado Pago pieces that do NOT need a checkout flow:
 * the HTTP client (`../mercadopago/client.ts`), the authoritative resource
 * fetcher (`../mercadopago/resource-fetcher.ts`) and the fail-closed plan
 * resolver (`../mercadopago/plan.ts`). The adapter itself is still NOT wired —
 * `createSession`, `cancel`, `reactivate`, `changePlan` and `verifier` are
 * MP-M2/M3 work and depend on owner decisions (remote plan, credentials) that
 * do not exist yet. So this function keeps returning the empty registry, and
 * every `getAdapter()` keeps failing closed. That is still the correct answer:
 * the pieces landed, the switch did not.
 */

import {
  createProviderRegistry,
  EMPTY_PROVIDER_REGISTRY,
  type ProviderRegistry,
} from "../providers.ts";
import type { BillingProvider } from "../../../lib/billing/billing.types.ts";

/**
 * Billing providers that are planned but NOT integrated.
 *
 * Kept as data so the gap is explicit and greppable rather than implied by an
 * absence. Adding one of these to `createProductionProviderRegistry()` below is
 * the entire integration switch — there is no other place to change.
 */
export const PENDING_PROVIDER_ADAPTERS: readonly BillingProvider[] = ["paypal", "mercado_pago"];

/** Providers with no adapter TODAY. Used by diagnostics and by the close-out. */
export function missingAdapterProviders(registry: ProviderRegistry): BillingProvider[] {
  return PENDING_PROVIDER_ADAPTERS.filter((provider) => registry.getAdapter(provider) === null);
}

/**
 * THE production registry.
 *
 * It currently holds no adapters, so every `getAdapter()` returns `null` and
 * every checkout attempt fails closed with `CheckoutOfferUnavailableError` /
 * an unconfigured provider. That is the correct behaviour for B0: no adapter
 * means no provider, and no provider means no charge — never a simulated
 * success and never a fallback to a different provider.
 *
 * Wiring a future adapter is a one-line change here:
 *
 *     return createProviderRegistry({
 *       paypal: createPayPalAdapter({ ...server secrets... }),
 *       mercado_pago: createMercadoPagoAdapter({ ...server secrets... }),
 *     });
 */
export function createProductionProviderRegistry(): ProviderRegistry {
  return EMPTY_PROVIDER_REGISTRY;
}
