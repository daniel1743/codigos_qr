import { describe, expect, it } from "vitest";
import type {
  BillingProvider,
  NormalizedSubscriptionInput,
} from "../../../../lib/billing/billing.types";
import { applyNormalizedEvent, type ApplicationStore } from "../../application";
import {
  isMercadoPagoPreapprovalResource,
  normalizeMercadoPagoResource,
  type ProviderResourceType,
  type WebhookLookupInstruction,
} from "../../webhooks";
import { MercadoPagoError, type MercadoPagoClient } from "../client";
import {
  CRIPQER_PRO_PLAN_CONTRACT,
  buildProAutoRecurring,
  createMercadoPagoPlanResolver,
} from "../plan";
import {
  createMercadoPagoResourceFetcher,
  MERCADOPAGO_RESOURCE_PATHS,
  resolveMercadoPagoLookup,
} from "../resource-fetcher";

/**
 * MP-M1 · MERCADO PAGO AUTHORITATIVE RESOURCE FETCHER.
 *
 * The centrepiece is `the dead end is closed`: before MP-M1 a `payment` or
 * `authorized_payment` notification could only ever normalize to
 * `requiresAuthoritativeLookup: true`, which `applyNormalizedEvent` answers with
 * `LOOKUP_REQUIRED` and never writes — a permanent, silent loop. These tests pin
 * both halves: the raw resource still refuses to be trusted, and the resource
 * resolved THROUGH the lookup reaches `APPLIED`.
 */

const NOW = "2026-10-22T00:00:00.000Z";

/* -------------------------------- fixtures -------------------------------- */

const PREAPPROVAL = {
  id: "PRE1",
  status: "authorized",
  preapproval_plan_id: "PLAN_PRO",
  payer_id: 555,
  auto_recurring: {
    frequency: 1,
    frequency_type: "months",
    currency_id: "CLP",
    transaction_amount: 7990,
    free_trial: { frequency: 10, frequency_type: "days" },
  },
  next_payment_date: "2026-11-01T00:00:00.000Z",
  last_modified: NOW,
};

const AUTHORIZED_PAYMENT = {
  id: 111,
  preapproval_id: "PRE1",
  status: "processed",
  payment_id: 222,
};

const PAYMENT = {
  id: 222,
  preapproval_id: "PRE1",
  status: "approved",
  transaction_amount: 7990,
  currency_id: "CLP",
};

/** A payment that belongs to no subscription: it must never be treated as one. */
const UNLINKED_PAYMENT = { id: 333, status: "approved", transaction_amount: 5000 };

function lookup(overrides: Partial<WebhookLookupInstruction> = {}): WebhookLookupInstruction {
  return {
    eventId: "evt_1",
    provider: "mercado_pago",
    resourceType: "preapproval",
    resourceId: "PRE1",
    occurredAt: NOW,
    ...overrides,
  };
}

function fakeClient(routes: Record<string, unknown>): {
  client: MercadoPagoClient;
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    client: {
      async getJson(path: string): Promise<unknown> {
        calls.push(path);
        if (!(path in routes)) {
          throw new MercadoPagoError("NOT_FOUND", "Mercado Pago resource not found.", 404);
        }
        return routes[path];
      },
    },
  };
}

async function captureError(run: () => Promise<unknown>): Promise<MercadoPagoError> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(MercadoPagoError);
    return error as MercadoPagoError;
  }
  throw new Error("expected the call to throw a MercadoPagoError");
}

interface MockStore extends ApplicationStore {
  subscriptions: NormalizedSubscriptionInput[];
  customers: Array<{ user_id: string; provider: BillingProvider; provider_customer_id: string }>;
}

function makeStore(): MockStore {
  const subscriptions: NormalizedSubscriptionInput[] = [];
  const customers: MockStore["customers"] = [];
  return {
    subscriptions,
    customers,
    async getSubscriptionByProviderId() {
      return null;
    },
    async upsertNormalizedSubscription(input) {
      subscriptions.push(input);
      return { ...input, id: "sub_row_1", created_at: NOW, updated_at: NOW };
    },
    async getBillingCustomer() {
      return null;
    },
    async upsertBillingCustomer(input) {
      customers.push(input);
      return { ...input, id: "cus_row_1", created_at: NOW, updated_at: NOW };
    },
  };
}

/* ============================== fetch paths ============================== */

describe("MP-M1 · fetcher · resolves each Mercado Pago resource kind", () => {
  it("1) fetches a preapproval directly and does not chain", async () => {
    const { client, calls } = fakeClient({ "/preapproval/PRE1": PREAPPROVAL });

    const resource = await createMercadoPagoResourceFetcher(client).fetchResource(
      "mercado_pago",
      "preapproval",
      "PRE1",
    );

    expect(resource).toEqual(PREAPPROVAL);
    expect(calls).toEqual(["/preapproval/PRE1"]);
  });

  it("2) follows an authorized_payment to its preapproval", async () => {
    const { client, calls } = fakeClient({
      "/authorized_payments/111": AUTHORIZED_PAYMENT,
      "/preapproval/PRE1": PREAPPROVAL,
    });

    const resource = await createMercadoPagoResourceFetcher(client).fetchResource(
      "mercado_pago",
      "authorized_payment",
      "111",
    );

    expect(resource).toEqual(PREAPPROVAL);
    expect(calls).toEqual(["/authorized_payments/111", "/preapproval/PRE1"]);
  });

  it("3) follows a payment to its preapproval", async () => {
    const { client, calls } = fakeClient({
      "/v1/payments/222": PAYMENT,
      "/preapproval/PRE1": PREAPPROVAL,
    });

    const resource = await createMercadoPagoResourceFetcher(client).fetchResource(
      "mercado_pago",
      "payment",
      "222",
    );

    expect(resource).toEqual(PREAPPROVAL);
    expect(calls).toEqual(["/v1/payments/222", "/preapproval/PRE1"]);
  });

  it("treats 'subscription' as the preapproval alias Mercado Pago actually uses", async () => {
    const { client, calls } = fakeClient({ "/preapproval/PRE1": PREAPPROVAL });

    await createMercadoPagoResourceFetcher(client).fetchResource(
      "mercado_pago",
      "subscription",
      "PRE1",
    );

    expect(calls).toEqual(["/preapproval/PRE1"]);
  });

  it("declares no path for resource kinds Mercado Pago does not have here", () => {
    const kinds: ProviderResourceType[] = ["invoice", "sale", "unknown"];
    for (const kind of kinds) {
      expect(MERCADOPAGO_RESOURCE_PATHS[kind]).toBeUndefined();
    }
  });
});

describe("MP-M1 · fetcher · fails closed on everything else", () => {
  it("refuses a provider it does not serve, without any request", async () => {
    const { client, calls } = fakeClient({ "/preapproval/PRE1": PREAPPROVAL });

    const error = await captureError(() =>
      createMercadoPagoResourceFetcher(client).fetchResource("stripe", "preapproval", "PRE1"),
    );

    expect(error.code).toBe("WRONG_PROVIDER");
    expect(calls).toEqual([]);
  });

  it("refuses a resource kind with no path, without any request", async () => {
    const { client, calls } = fakeClient({});

    const error = await captureError(() =>
      createMercadoPagoResourceFetcher(client).fetchResource("mercado_pago", "invoice", "INV1"),
    );

    expect(error.code).toBe("UNSUPPORTED_RESOURCE_TYPE");
    expect(calls).toEqual([]);
  });

  it("refuses an empty resource id, without any request", async () => {
    const { client, calls } = fakeClient({});

    const error = await captureError(() =>
      createMercadoPagoResourceFetcher(client).fetchResource("mercado_pago", "preapproval", "  "),
    );

    expect(error.code).toBe("UNSUPPORTED_RESOURCE_TYPE");
    expect(calls).toEqual([]);
  });

  it("refuses a payment that references no preapproval instead of inventing a subscription", async () => {
    const { client } = fakeClient({ "/v1/payments/333": UNLINKED_PAYMENT });

    const error = await captureError(() =>
      createMercadoPagoResourceFetcher(client).fetchResource("mercado_pago", "payment", "333"),
    );

    expect(error.code).toBe("UNLINKED_PAYMENT");
  });

  it("propagates a provider NOT_FOUND as a typed failure", async () => {
    const { client } = fakeClient({});

    const error = await captureError(() =>
      createMercadoPagoResourceFetcher(client).fetchResource("mercado_pago", "preapproval", "GONE"),
    );

    expect(error.code).toBe("NOT_FOUND");
  });
});

/* ============================ normalization ============================= */

describe("MP-M1 · normalization · a raw payment is never trusted", () => {
  it("10) a raw payment still requires an authoritative lookup", () => {
    const event = normalizeMercadoPagoResource(
      PAYMENT,
      lookup({ resourceType: "payment", resourceId: "222" }),
    );

    expect(event).not.toBeNull();
    expect(event?.requiresAuthoritativeLookup).toBe(true);
    expect(event?.status).toBeNull();
  });

  it("11) a raw authorized_payment still requires an authoritative lookup", () => {
    const event = normalizeMercadoPagoResource(
      AUTHORIZED_PAYMENT,
      lookup({ resourceType: "authorized_payment", resourceId: "111" }),
    );

    expect(event?.requiresAuthoritativeLookup).toBe(true);
    expect(event?.status).toBeNull();
  });

  it("13) a preapproval normalizes directly, with no lookup required", () => {
    const event = normalizeMercadoPagoResource(PREAPPROVAL, lookup());

    expect(event?.requiresAuthoritativeLookup).toBe(false);
    expect(event?.status).toBe("active");
    expect(event?.type).toBe("SUBSCRIPTION_ACTIVATED");
    expect(event?.providerSubscriptionId).toBe("PRE1");
    expect(event?.providerPlanId).toBe("PLAN_PRO");
    expect(event?.billingInterval).toBe("monthly");
    expect(event?.currency).toBe("CLP");
  });

  it("recognises a preapproval by its auto_recurring block, not by status", () => {
    expect(isMercadoPagoPreapprovalResource(PREAPPROVAL)).toBe(true);
    expect(isMercadoPagoPreapprovalResource(PAYMENT)).toBe(false);
    // `pending` is a legal status for BOTH kinds, which is why status cannot be
    // the discriminator.
    expect(isMercadoPagoPreapprovalResource({ id: "X", status: "pending" })).toBe(false);
  });

  it("treats a fetched preapproval as authoritative even when the notification said 'payment'", () => {
    const event = normalizeMercadoPagoResource(
      PREAPPROVAL,
      lookup({ resourceType: "payment", resourceId: "222" }),
    );

    expect(event?.requiresAuthoritativeLookup).toBe(false);
    expect(event?.status).toBe("active");
  });
});

/* ========================== the dead end, closed ======================== */

describe("MP-M1 · the dead end is closed end to end", () => {
  it("12) a payment notification reaches APPLIED once the lookup resolves it", async () => {
    const { client, calls } = fakeClient({
      "/v1/payments/222": PAYMENT,
      "/preapproval/PRE1": PREAPPROVAL,
    });
    const fetcher = createMercadoPagoResourceFetcher(client);
    const instruction = lookup({ resourceType: "payment", resourceId: "222" });

    const event = await resolveMercadoPagoLookup(fetcher, instruction);

    expect(event).not.toBeNull();
    expect(event?.requiresAuthoritativeLookup).toBe(false);
    expect(event?.status).toBe("active");
    expect(event?.providerSubscriptionId).toBe("PRE1");
    expect(calls).toEqual(["/v1/payments/222", "/preapproval/PRE1"]);

    const store = makeStore();
    const applied = await applyNormalizedEvent(
      { store, planResolver: createMercadoPagoPlanResolver({ proPlanId: "PLAN_PRO" }) },
      event!,
      { trustedUserId: "user_1" },
    );

    expect(applied.status).toBe("APPLIED");
    expect(store.subscriptions).toHaveLength(1);
    expect(store.subscriptions[0]?.status).toBe("active");
    expect(store.subscriptions[0]?.plan_id).toBe("pro");
    expect(store.subscriptions[0]?.user_id).toBe("user_1");
  });

  it("12b) control: the SAME event without the lookup is still LOOKUP_REQUIRED and writes nothing", async () => {
    const store = makeStore();
    const rawEvent = normalizeMercadoPagoResource(
      PAYMENT,
      lookup({ resourceType: "payment", resourceId: "222" }),
    );

    const applied = await applyNormalizedEvent(
      { store, planResolver: createMercadoPagoPlanResolver({ proPlanId: "PLAN_PRO" }) },
      rawEvent!,
      { trustedUserId: "user_1" },
    );

    expect(applied.status).toBe("LOOKUP_REQUIRED");
    expect(store.subscriptions).toHaveLength(0);
  });

  it("resolves an authorized_payment notification the same way", async () => {
    const { client } = fakeClient({
      "/authorized_payments/111": AUTHORIZED_PAYMENT,
      "/preapproval/PRE1": PREAPPROVAL,
    });

    const event = await resolveMercadoPagoLookup(
      createMercadoPagoResourceFetcher(client),
      lookup({ resourceType: "authorized_payment", resourceId: "111" }),
    );

    expect(event?.requiresAuthoritativeLookup).toBe(false);
    expect(event?.status).toBe("active");
  });

  it("returns null when the instruction carries no resource id", async () => {
    const { client, calls } = fakeClient({});

    const event = await resolveMercadoPagoLookup(
      createMercadoPagoResourceFetcher(client),
      lookup({ resourceId: null }),
    );

    expect(event).toBeNull();
    expect(calls).toEqual([]);
  });
});

/* ============================= plan mapping ============================= */

describe("MP-M1 · plan mapping never grants Pro by accident", () => {
  it("14) an unknown plan id maps to nothing", () => {
    const resolver = createMercadoPagoPlanResolver({ proPlanId: "PLAN_PRO" });

    expect(resolver.resolvePlan("mercado_pago", "PLAN_PRO")).toBe("pro");
    expect(resolver.resolvePlan("mercado_pago", "PLAN_OTRO")).toBeNull();
    expect(resolver.resolvePlan("mercado_pago", null)).toBeNull();
    expect(resolver.resolvePlan("mercado_pago", "  ")).toBeNull();
    expect(resolver.resolvePlan("stripe", "PLAN_PRO")).toBeNull();
  });

  it("is fail-closed while no plan id is configured", () => {
    const resolver = createMercadoPagoPlanResolver({ proPlanId: null });

    expect(resolver.resolvePlan("mercado_pago", "PLAN_PRO")).toBeNull();
  });

  it("14b) an unmapped plan produces PLAN_MAPPING_REQUIRED and writes nothing", async () => {
    const store = makeStore();
    const event = normalizeMercadoPagoResource(PREAPPROVAL, lookup());

    const applied = await applyNormalizedEvent(
      { store, planResolver: createMercadoPagoPlanResolver({ proPlanId: "PLAN_PRO" }) },
      { ...event!, providerPlanId: "PLAN_DESCONOCIDO" },
      { trustedUserId: "user_1" },
    );

    expect(applied.status).toBe("PLAN_MAPPING_REQUIRED");
    expect(store.subscriptions).toHaveLength(0);
  });

  it("14c) with no configured plan id, even a valid preapproval applies nothing", async () => {
    const store = makeStore();
    const event = normalizeMercadoPagoResource(PREAPPROVAL, lookup());

    const applied = await applyNormalizedEvent(
      { store, planResolver: createMercadoPagoPlanResolver({ proPlanId: null }) },
      event!,
      { trustedUserId: "user_1" },
    );

    expect(applied.status).toBe("PLAN_MAPPING_REQUIRED");
    expect(store.subscriptions).toHaveLength(0);
  });
});

/* =========================== trial contract ============================= */

describe("MP-M1 · the PRO commercial contract", () => {
  it("records the owner's decision: PRO, monthly, 7.990 CLP, 10-day trial", () => {
    expect(CRIPQER_PRO_PLAN_CONTRACT).toEqual({
      planId: "pro",
      billingInterval: "monthly",
      amount: 7990,
      currency: "CLP",
      frequency: 1,
      frequencyType: "months",
      freeTrial: 10,
      freeTrialFrequencyType: "days",
    });
  });

  it("builds the auto_recurring block Mercado Pago expects, without sending it", () => {
    expect(buildProAutoRecurring()).toEqual({
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 7990,
      currency_id: "CLP",
      free_trial: { frequency: 10, frequency_type: "days" },
    });
  });

  it("sells exactly one plan: business and enterprise are absent", () => {
    const contract = CRIPQER_PRO_PLAN_CONTRACT;
    expect(contract.planId).toBe("pro");
    expect(contract.planId).not.toBe("business");
  });
});
