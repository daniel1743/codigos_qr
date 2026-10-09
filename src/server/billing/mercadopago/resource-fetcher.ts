import "@tanstack/react-start/server-only";

import type { BillingProvider } from "../../../lib/billing/billing.types.ts";
import { webhookLookupFetchInput } from "../providers.ts";
import {
  normalizeAuthoritativeResource,
  type NormalizedBillingEvent,
  type ProviderResourceFetcher,
  type ProviderResourceType,
  type WebhookLookupInstruction,
} from "../webhooks.ts";
import { MercadoPagoError, type MercadoPagoClient } from "./client.ts";

/**
 * CRIPQER BILLING — MERCADO PAGO AUTHORITATIVE RESOURCE FETCHER (MP-M1)
 *
 * The production implementation of the frozen `ProviderResourceFetcher` contract
 * declared in `../webhooks.ts`. It resolves the AUTHORITATIVE resource behind a
 * thin Mercado Pago notification, so canonical state is never derived from a
 * webhook body.
 *
 * THE DEAD END THIS FILE CLOSES
 * The audit found that `payment` and `authorized_payment` resources carry no
 * subscription status — only a `preapproval_id` — so `normalizeMercadoPagoResource`
 * forced `status: null` with `requiresAuthoritativeLookup: true`, and
 * `applyNormalizedEvent` answered `LOOKUP_REQUIRED` without writing. Nothing ever
 * produced the second, resolved event, so every non-`preapproval` notification
 * was a permanent, silent dead end.
 *
 * The missing piece was never the normalizer: it was the fetch. This module
 * follows the ONE documented relation (`payment.preapproval_id` /
 * `authorized_payment.preapproval_id` -> `GET /preapproval/{id}`) and hands back
 * the PREAPPROVAL, which the normalizer already knew how to read. No speculative
 * graph walking, no status guessing, no second resource type invented.
 */

/* ============================= resource paths ============================ */

/**
 * Resource kind -> Mercado Pago path.
 *
 * `subscription` is an alias for `preapproval`: Mercado Pago's recurring
 * subscription IS the preapproval object, and `intakeMercadoPagoNotification`
 * already maps a `subscription` topic to the `preapproval` resource type. The
 * alias exists so a future caller that says "subscription" cannot silently miss.
 *
 * `invoice`, `sale` and `unknown` are absent on purpose: Mercado Pago has no
 * resource of those kinds for this integration, and an absent entry is a typed
 * failure rather than a guessed URL.
 */
export const MERCADOPAGO_RESOURCE_PATHS: Partial<
  Record<ProviderResourceType, (resourceId: string) => string>
> = {
  preapproval: (resourceId) => `/preapproval/${encodeURIComponent(resourceId)}`,
  subscription: (resourceId) => `/preapproval/${encodeURIComponent(resourceId)}`,
  authorized_payment: (resourceId) => `/authorized_payments/${encodeURIComponent(resourceId)}`,
  payment: (resourceId) => `/v1/payments/${encodeURIComponent(resourceId)}`,
};

/** Resource kinds that must be followed to their preapproval to be meaningful. */
const CHAINED_RESOURCE_TYPES: readonly ProviderResourceType[] = ["payment", "authorized_payment"];

/* ============================ defensive reads ============================ */

function readPath(source: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) => (acc as Record<string, unknown> | null | undefined)?.[key],
      source,
    );
}

/** String-or-number to string, empty/absent to null. Never throws. */
function readRef(source: unknown, path: string): string | null {
  const value = readPath(source, path);
  if (typeof value === "string") return value.trim() === "" ? null : value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/* ============================== the fetcher ============================== */

/**
 * Follows a payment-family resource to the preapproval it belongs to.
 *
 * Throws `UNLINKED_PAYMENT` when the relation is absent. That is deliberate and
 * it is the safe direction: a payment with no `preapproval_id` is not a
 * subscription payment, so there is no subscription state to apply. Returning
 * the raw payment instead would leave the caller holding an event that can only
 * ever be `LOOKUP_REQUIRED` again — the exact loop this module exists to break.
 */
async function followToPreapproval(
  client: MercadoPagoClient,
  resourceType: ProviderResourceType,
  resource: unknown,
): Promise<unknown> {
  if (!CHAINED_RESOURCE_TYPES.includes(resourceType)) return resource;

  const preapprovalId = readRef(resource, "preapproval_id");
  if (preapprovalId === null) {
    throw new MercadoPagoError(
      "UNLINKED_PAYMENT",
      "Mercado Pago payment resource references no preapproval; it is not a subscription payment.",
    );
  }

  const path = MERCADOPAGO_RESOURCE_PATHS.preapproval;
  if (!path) {
    throw new MercadoPagoError(
      "UNSUPPORTED_RESOURCE_TYPE",
      "Mercado Pago preapproval path is not configured.",
    );
  }

  return client.getJson(path(preapprovalId));
}

/**
 * Builds the production `ProviderResourceFetcher` for Mercado Pago.
 *
 * Fails closed on every axis: a foreign provider, a resource kind with no path,
 * an unlinked payment, and any transport failure all surface as a typed
 * `MercadoPagoError`. The caller must treat all of them as "not applied" — never
 * as "assume the subscription is fine".
 */
export function createMercadoPagoResourceFetcher(
  client: MercadoPagoClient,
): ProviderResourceFetcher {
  return {
    async fetchResource(
      provider: BillingProvider,
      resourceType: ProviderResourceType,
      resourceId: string,
    ): Promise<unknown> {
      if (provider !== "mercado_pago") {
        throw new MercadoPagoError(
          "WRONG_PROVIDER",
          `Mercado Pago fetcher cannot serve provider "${provider}".`,
        );
      }

      const buildPath = MERCADOPAGO_RESOURCE_PATHS[resourceType];
      if (!buildPath) {
        throw new MercadoPagoError(
          "UNSUPPORTED_RESOURCE_TYPE",
          `Mercado Pago has no resource path for type "${resourceType}".`,
        );
      }
      if (typeof resourceId !== "string" || resourceId.trim() === "") {
        throw new MercadoPagoError(
          "UNSUPPORTED_RESOURCE_TYPE",
          "Mercado Pago resource lookup requires a non-empty resource id.",
        );
      }

      const resource = await client.getJson(buildPath(resourceId));
      return followToPreapproval(client, resourceType, resource);
    },
  };
}

/* ============================ the lookup seam ============================ */

/**
 * Resolves a `WebhookLookupInstruction` into a normalizable event.
 *
 * This is the seam that closes the dead end, expressed as one callable unit so
 * the property can be tested without a webhook endpoint (which is MP-M2):
 *
 *     lookup instruction
 *       -> fetch authoritative resource  (this module)
 *       -> normalize                     (frozen core)
 *       -> NormalizedBillingEvent
 *
 * Returns `null` when the instruction carries no resource id (nothing safe to
 * fetch). Throws `MercadoPagoError` when the fetch itself fails — the caller
 * decides whether that is a redelivery or a permanent ignore, and in neither
 * case does it become paid access.
 */
export async function resolveMercadoPagoLookup(
  fetcher: ProviderResourceFetcher,
  lookup: WebhookLookupInstruction,
): Promise<NormalizedBillingEvent | null> {
  const input = webhookLookupFetchInput(lookup);
  if (!input) return null;

  const resource = await fetcher.fetchResource(
    lookup.provider,
    input.resourceType,
    input.resourceId,
  );

  return normalizeAuthoritativeResource(lookup, resource);
}
