/**
 * CRIPQER BILLING — B0 · OFFER / PRICE CONTRACT (PENDING VALUES)
 *
 * This file prepares the source of truth for what is sold — plan, offer, price,
 * currency, billing interval and the provider mapping — WITHOUT deciding any of
 * the numbers.
 *
 * THE RULE THAT GOVERNS THIS FILE
 *   No price is invented here. Not a placeholder, not a "1", not a 0, not a TODO
 *   amount that could be mistaken for a real one. Every commercial value is
 *   declared `pending` and every pending offer is DISABLED, so the catalog keeps
 *   failing closed exactly as it does today. When product approves the numbers,
 *   the only edit is filling them in and flipping `status` — the shape, the
 *   validation and the wiring already exist.
 *
 * WHY DECLARE ANYTHING AT ALL
 *   Because "what we intend to sell" is a fact the codebase should be able to
 *   state, and because a missing declaration is indistinguishable from a
 *   forgotten one. An empty catalog today cannot tell you whether PayPal+Pro
 *   monthly was considered and rejected, or simply never thought about. The
 *   declarations below make the gap explicit and greppable.
 *
 * WHAT THIS FILE IS NOT
 *   It is not a price list, and it must not become one by accident. Nothing here
 *   is reachable by checkout while `status = "pending"`.
 */

import type {
  BillingInterval,
  BillingPlanId,
  BillingProvider,
} from "../../lib/billing/billing.types.ts";
import type { CatalogOfferDefinition, CatalogRegistry } from "./catalog.ts";

/**
 * Where a declared offer stands.
 *
 * `pending` — the commercial decision has NOT been made. The amount is null and
 *             the offer can never reach checkout.
 * `approved` — product has fixed amount, currency and the provider reference.
 *             Only then may an offer be enabled.
 */
export type OfferValueStatus = "pending" | "approved";

/**
 * A declared intended offer.
 *
 * It is intentionally NOT `CatalogOfferDefinition`: that type requires a real
 * `currency` and a real integer `amount`, and using it here would force a
 * placeholder value into the type system. Nullability is the point — it makes
 * "not decided" representable instead of fakeable.
 */
export interface PlanOfferDeclaration {
  planId: BillingPlanId;
  billingInterval: BillingInterval;
  provider: BillingProvider;
  status: OfferValueStatus;
  /** Integer MINOR units (cents). `null` while pending — never a placeholder. */
  amount: number | null;
  /** Uppercase ISO-4217. `null` while pending. */
  currency: string | null;
  /** The provider's own price/plan id. `null` while pending. Never a secret. */
  providerOfferReference: string | null;
  /** A pending offer is never enabled. Enforced by `buildCatalogRegistry`. */
  enabled: boolean;
}

/**
 * Kept in sync with the canonical unions in `billing.types.ts`. Typed as the
 * canonical types themselves, so a new plan, interval or provider is a compile
 * error here rather than a silently missing declaration.
 */
const OFFER_PLANS: readonly BillingPlanId[] = ["pro", "business", "enterprise"];
const OFFER_INTERVALS: readonly BillingInterval[] = ["monthly", "yearly"];
const OFFER_PROVIDERS: readonly BillingProvider[] = ["stripe", "mercado_pago", "paypal"];

/**
 * The full cross-product of what could be sold, declared PENDING.
 *
 * Built programmatically rather than typed out 18 times so the shape cannot
 * drift: adding a plan, an interval or a provider produces the corresponding
 * pending declarations automatically, and therefore appears as "not yet decided"
 * rather than as an omission.
 */
function pendingDeclarations(): PlanOfferDeclaration[] {
  const out: PlanOfferDeclaration[] = [];
  for (const planId of OFFER_PLANS) {
    for (const billingInterval of OFFER_INTERVALS) {
      for (const provider of OFFER_PROVIDERS) {
        out.push({
          planId,
          billingInterval,
          provider,
          status: "pending",
          amount: null,
          currency: null,
          providerOfferReference: null,
          enabled: false,
        });
      }
    }
  }
  return out;
}

/**
 * Every offer CRIPQER could sell, with its commercial values PENDING.
 *
 * The array is the contract; the values are the gap. Replace an entry's
 * `status`/`amount`/`currency`/`providerOfferReference` and enable it to turn it
 * into a real offer — nothing else in the system needs to change.
 */
export const PLAN_OFFER_DECLARATIONS: readonly PlanOfferDeclaration[] = pendingDeclarations();

/** The declarations still awaiting a commercial decision. */
export function pendingOfferDeclarations(): PlanOfferDeclaration[] {
  return PLAN_OFFER_DECLARATIONS.filter((offer) => offer.status === "pending");
}

/* ============================ compilation =============================== */

export class CatalogDeclarationError extends Error {
  readonly code = "BILLING_CATALOG_DECLARATION_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "CatalogDeclarationError";
  }
}

/**
 * Whether a declaration carries every value a live offer needs.
 *
 * This is the guard that keeps a placeholder out of production: an offer cannot
 * be enabled without a real positive integer amount, a real currency and a real
 * provider reference. If someone tries, `buildCatalogRegistry` throws instead of
 * shipping a fake price.
 */
export function isOfferDeclaredComplete(offer: PlanOfferDeclaration): boolean {
  return (
    offer.status === "approved" &&
    Number.isInteger(offer.amount) &&
    (offer.amount ?? 0) > 0 &&
    typeof offer.currency === "string" &&
    /^[A-Z]{3}$/.test(offer.currency) &&
    typeof offer.providerOfferReference === "string" &&
    offer.providerOfferReference.trim() !== ""
  );
}

/**
 * Turns declarations into a trusted `CatalogRegistry`.
 *
 * Two invariants, both fail-loud rather than fail-silent:
 *   · an offer marked `enabled` that is not fully declared is a programming
 *     error — it would put an unapproved price in front of a customer;
 *   · a `pending` offer is DROPPED, so it can never be resolved into a checkout.
 *
 * The result is therefore always a registry that means what it says.
 */
export function buildCatalogRegistry(
  declarations: readonly PlanOfferDeclaration[] = PLAN_OFFER_DECLARATIONS,
): CatalogRegistry {
  const offers: CatalogOfferDefinition[] = [];

  for (const declaration of declarations) {
    const complete = isOfferDeclaredComplete(declaration);

    if (declaration.enabled && !complete) {
      throw new CatalogDeclarationError(
        `Offer ${declaration.planId}/${declaration.billingInterval}/${declaration.provider} is ` +
          `enabled but not fully declared (status=${declaration.status}). ` +
          `No price may be invented: fill in amount, currency and providerOfferReference first.`,
      );
    }

    // Pending offers are omitted entirely. An omitted offer cannot be checked
    // out, which is the intended behaviour until product decides the numbers.
    if (!complete) continue;

    offers.push({
      planId: declaration.planId,
      billingInterval: declaration.billingInterval,
      provider: declaration.provider,
      currency: declaration.currency as string,
      amount: declaration.amount as number,
      providerOfferReference: declaration.providerOfferReference as string,
      enabled: true,
    });
  }

  return { offers };
}

/**
 * The registry production should use TODAY.
 *
 * Every declaration is pending, so this yields an empty registry and the catalog
 * keeps failing closed — the same behaviour as `EMPTY_CATALOG_REGISTRY`, reached
 * through a path that already understands the full contract.
 */
export function createDeclaredCatalogRegistry(): CatalogRegistry {
  return buildCatalogRegistry(PLAN_OFFER_DECLARATIONS);
}
