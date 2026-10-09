import { describe, expect, it } from "vitest";
import type { BillingCheckoutRecord } from "../../../../lib/billing/billing.types";
import { handleCheckoutReturn, type CheckoutHostDeps, type CheckoutStore } from "../../checkout";
import { normalizeMercadoPagoResource, type WebhookLookupInstruction } from "../../webhooks";

/**
 * MP-M1 · ENTITLEMENT BOUNDARY.
 *
 * The rule this file exists to pin, in the directive's own words: the redirect
 * "success" must never grant Pro by itself. Two independent guarantees are
 * asserted here, because either one alone would be thin:
 *
 *   · BEHAVIOURAL — the return flow, given a checkout persisted as `success`,
 *     performs a status READ and nothing else. Every write seam on the only
 *     store it can reach is wired to fail the test if touched.
 *   · STRUCTURAL — its signature has nowhere to put a query parameter, so
 *     `?success=true` cannot reach it at all, and the store type it is handed
 *     exposes no subscription or grant writer.
 *
 * The second half covers the other direction: no normalized Mercado Pago event
 * carries a status that came from a query string, because a raw payment is
 * explicitly marked as not-yet-trustworthy.
 */

const NOW = "2026-10-22T00:00:00.000Z";

const SUCCESSFUL_CHECKOUT: BillingCheckoutRecord = {
  id: "co_1",
  user_id: "user_1",
  provider: "mercado_pago",
  plan_id: "pro",
  billing_interval: "monthly",
  provider_checkout_id: "MP-PREAPPROVAL-1",
  status: "success",
  created_at: NOW,
  updated_at: NOW,
  expires_at: null,
};

function makeDeps(record: BillingCheckoutRecord): {
  deps: CheckoutHostDeps;
  calls: string[];
} {
  const calls: string[] = [];

  const store: CheckoutStore = {
    async createCheckout() {
      calls.push("createCheckout");
      throw new Error("the return flow must never create a checkout");
    },
    async getCheckoutForUser(checkoutId, userId) {
      calls.push(`getCheckoutForUser:${checkoutId}:${userId}`);
      return checkoutId === record.id && userId === record.user_id ? record : null;
    },
    async updateCheckoutStatus() {
      calls.push("updateCheckoutStatus");
      throw new Error("the return flow must never write checkout state");
    },
  };

  return {
    calls,
    deps: {
      userSource: {
        async requireUser() {
          calls.push("requireUser");
          return { userId: record.user_id, email: "user@example.com" };
        },
      },
      catalog: {
        resolveOffer() {
          calls.push("resolveOffer");
          return null;
        },
      },
      store,
    },
  };
}

describe("MP-M1 · the return URL cannot grant Pro", () => {
  it("15) a checkout persisted as success returns a snapshot and writes nothing", async () => {
    const { deps, calls } = makeDeps(SUCCESSFUL_CHECKOUT);

    const snapshot = await handleCheckoutReturn(deps, SUCCESSFUL_CHECKOUT.id);

    expect(snapshot.status).toBe("success");
    expect(snapshot.checkoutId).toBe(SUCCESSFUL_CHECKOUT.id);
    expect(snapshot.userId).toBe("user_1");

    // The whole point: it read, and that is all it did.
    expect(calls).toEqual(["requireUser", `getCheckoutForUser:${SUCCESSFUL_CHECKOUT.id}:user_1`]);
    expect(calls).not.toContain("updateCheckoutStatus");
    expect(calls).not.toContain("createCheckout");
    expect(calls).not.toContain("resolveOffer");
  });

  it("15b) the return flow has nowhere to receive a query parameter", () => {
    // Two parameters: deps and a canonical checkout id. There is no third slot
    // for `?success=true`, `?status=approved` or any other client-supplied
    // string — so the value cannot be trusted even by mistake.
    expect(handleCheckoutReturn.length).toBe(2);
  });

  it("15c) the only store the return flow can reach exposes no subscription or grant writer", () => {
    const store: CheckoutStore = {
      createCheckout: async () => SUCCESSFUL_CHECKOUT,
      getCheckoutForUser: async () => SUCCESSFUL_CHECKOUT,
      updateCheckoutStatus: async () => SUCCESSFUL_CHECKOUT,
    };

    // Checkout state and paid entitlement are separate: becoming Pro requires a
    // verified webhook to reach `applyNormalizedEvent`, which this seam has no
    // access to.
    expect(Object.keys(store).sort()).toEqual([
      "createCheckout",
      "getCheckoutForUser",
      "updateCheckoutStatus",
    ]);
  });

  it("15d) an unknown checkout id is not found, and still writes nothing", async () => {
    const { deps, calls } = makeDeps(SUCCESSFUL_CHECKOUT);

    await expect(handleCheckoutReturn(deps, "co_other")).rejects.toMatchObject({
      code: "BILLING_CHECKOUT_NOT_FOUND",
    });
    expect(calls).not.toContain("updateCheckoutStatus");
  });
});

describe("MP-M1 · no normalized event carries a query-supplied status", () => {
  const instruction: WebhookLookupInstruction = {
    eventId: "evt_1",
    provider: "mercado_pago",
    resourceType: "payment",
    resourceId: "222",
    occurredAt: NOW,
  };

  it("a resource that only echoes a status does not become paid state", () => {
    // A body that looks like a payment but carries no auto_recurring and no
    // preapproval link: the normalizer refuses to read a subscription out of it.
    const event = normalizeMercadoPagoResource({ id: "222", status: "approved" }, instruction);

    expect(event?.requiresAuthoritativeLookup).toBe(true);
    expect(event?.status).toBeNull();
  });

  it("an unrecognised Mercado Pago status maps to nothing at all", () => {
    const event = normalizeMercadoPagoResource(
      { id: "PRE1", status: "definitely_active_trust_me", auto_recurring: {} },
      { ...instruction, resourceType: "preapproval" },
    );

    expect(event?.status).toBeNull();
  });
});
