import { describe, expect, it, vi } from "vitest";
import { MercadoPagoError, type MercadoPagoWriteClient } from "../client";
import { buildProAutoRecurring, createMercadoPagoPlanResolver } from "../plan";
import {
  buildProPlanCreationRequestBody,
  createMercadoPagoProPlan,
  CRIPQER_PRO_PLAN_REASON,
  MERCADOPAGO_PREAPPROVAL_PLAN_PATH,
  readProPlanId,
} from "../plan-creation";

/**
 * MP-M3B · MERCADO PAGO PRO PLAN PROVISIONING.
 *
 * Two properties matter here, because this module is the only one in Billing
 * that can create a persistent remote resource:
 *
 *   1. the request body IS the frozen PRO contract — a caller cannot change the
 *      price, the currency, the frequency, the trial or the tier;
 *   2. NOTHING in these tests touches the network. Every call runs against a
 *      fake write client, so a test run can never create a plan in anyone's
 *      Mercado Pago account.
 */

const BACK_URL = "https://cripqer.test/suscripcion";

/** The exact body the live request must carry. A literal, on purpose. */
const EXPECTED_PRO_BODY = {
  reason: "Cripqer Pro",
  auto_recurring: {
    frequency: 1,
    frequency_type: "months",
    transaction_amount: 7990,
    currency_id: "CLP",
    free_trial: { frequency: 10, frequency_type: "days" },
  },
  back_url: BACK_URL,
};

function fakeClient(postJsonImpl: (path: string, body: unknown) => Promise<unknown>): {
  client: MercadoPagoWriteClient;
  postJson: ReturnType<typeof vi.fn>;
  getJson: ReturnType<typeof vi.fn>;
} {
  const postJson = vi.fn(postJsonImpl);
  const getJson = vi.fn(async () => {
    throw new Error("plan provisioning must never read");
  });
  return { client: { getJson, postJson }, postJson, getJson };
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

/* =========================== the frozen contract =========================== */

describe("MP-M3B · PRO plan · the body is the frozen contract", () => {
  it("builds the exact request Mercado Pago must receive", () => {
    expect(buildProPlanCreationRequestBody({ backUrl: BACK_URL })).toEqual(EXPECTED_PRO_BODY);
  });

  it("pins the commercial terms one by one", () => {
    const body = buildProPlanCreationRequestBody({ backUrl: BACK_URL });

    expect(CRIPQER_PRO_PLAN_REASON).toBe("Cripqer Pro");
    expect(body.reason).toBe("Cripqer Pro");
    // 7990 is 7.990 CLP, not 79,90 CLP: CLP has no minor unit.
    expect(body.auto_recurring.transaction_amount).toBe(7990);
    expect(body.auto_recurring.currency_id).toBe("CLP");
    expect(body.auto_recurring.frequency).toBe(1);
    expect(body.auto_recurring.frequency_type).toBe("months");
    expect(body.auto_recurring.free_trial).toEqual({ frequency: 10, frequency_type: "days" });
  });

  it("sends exactly three top-level keys: no status, no payment_methods_allowed", () => {
    const body = buildProPlanCreationRequestBody({ backUrl: BACK_URL });

    expect(Object.keys(body).sort()).toEqual(["auto_recurring", "back_url", "reason"]);
  });

  it("reuses the same auto_recurring block the rest of Billing pins", () => {
    const body = buildProPlanCreationRequestBody({ backUrl: BACK_URL });

    expect(body.auto_recurring).toEqual(buildProAutoRecurring());
  });

  it("ignores any extra commercial term a loose caller tries to smuggle in", () => {
    const smuggled = {
      backUrl: BACK_URL,
      amount: 1,
      currency: "USD",
      frequency: 12,
      freeTrial: 0,
      planId: "enterprise",
    };

    expect(buildProPlanCreationRequestBody(smuggled)).toEqual(EXPECTED_PRO_BODY);
  });

  it("trims the return URL and otherwise leaves it untouched", () => {
    const body = buildProPlanCreationRequestBody({ backUrl: `  ${BACK_URL}  ` });

    expect(body.back_url).toBe(BACK_URL);
  });
});

describe("MP-M3B · PRO plan · the return URL fails closed before any request", () => {
  const invalidValues = ["", "   ", "http://cripqer.test", "cripqer.test", "ftp://x"];

  it.each(invalidValues)("refuses %j with a typed INVALID_REQUEST", (backUrl) => {
    try {
      buildProPlanCreationRequestBody({ backUrl });
      throw new Error("expected a refusal");
    } catch (error) {
      expect(error).toBeInstanceOf(MercadoPagoError);
      expect((error as MercadoPagoError).code).toBe("INVALID_REQUEST");
      expect((error as MercadoPagoError).status).toBeNull();
    }
  });

  it("refuses a non-string return URL too", () => {
    const loose = { backUrl: undefined as unknown as string };

    expect(() => buildProPlanCreationRequestBody(loose)).toThrowError(MercadoPagoError);
  });

  it("sends nothing: an invalid return URL never reaches the client", async () => {
    const { client, postJson } = fakeClient(async () => ({ id: "PLAN1" }));

    await expect(
      createMercadoPagoProPlan(client, { backUrl: "http://cripqer.test" }),
    ).rejects.toBeInstanceOf(MercadoPagoError);

    expect(postJson).not.toHaveBeenCalled();
  });
});

/* ============================== creation ================================== */

describe("MP-M3B · PRO plan · creation", () => {
  it("uses the documented endpoint path", () => {
    expect(MERCADOPAGO_PREAPPROVAL_PLAN_PATH).toBe("/preapproval_plan");
  });

  it("posts the exact body and returns the plan id", async () => {
    const { client, postJson } = fakeClient(async () => ({
      id: "2c938084726fca480172750000000000",
      status: "active",
    }));

    const result = await createMercadoPagoProPlan(client, { backUrl: BACK_URL });

    expect(result).toEqual({ preapprovalPlanId: "2c938084726fca480172750000000000" });
    expect(postJson).toHaveBeenCalledTimes(1);
    expect(postJson).toHaveBeenCalledWith(MERCADOPAGO_PREAPPROVAL_PLAN_PATH, EXPECTED_PRO_BODY);
  });

  it("never reads", async () => {
    const { client, getJson } = fakeClient(async () => ({ id: "PLAN1" }));

    await createMercadoPagoProPlan(client, { backUrl: BACK_URL });

    expect(getJson).not.toHaveBeenCalled();
  });

  it("fails closed when the response carries no usable id, warning the plan may exist", async () => {
    const { client } = fakeClient(async () => ({ status: "active" }));

    const error = await captureError(() => createMercadoPagoProPlan(client, { backUrl: BACK_URL }));

    expect(error.code).toBe("INVALID_JSON");
    expect(error.status).toBeNull();
    expect(error.message).toContain("MAY have been created");
    expect(error.message).toContain("before retrying");
  });

  it("fails closed when the response is not an object at all", async () => {
    for (const response of ["not an object", [], 42, null]) {
      const { client } = fakeClient(async () => response);

      const error = await captureError(() =>
        createMercadoPagoProPlan(client, { backUrl: BACK_URL }),
      );

      expect(error.code).toBe("INVALID_JSON");
    }
  });

  it("propagates the client's typed failure unchanged", async () => {
    const failure = new MercadoPagoError("UNAUTHORIZED", "credentials rejected", 401);
    const { client } = fakeClient(async () => {
      throw failure;
    });

    const error = await captureError(() => createMercadoPagoProPlan(client, { backUrl: BACK_URL }));

    expect(error).toBe(failure);
  });

  it("keeps the provider's response body out of the failure message", async () => {
    const marker = "PROVIDER_BODY_MARKER_must_not_surface";
    const { client } = fakeClient(async () => ({ detail: marker }));

    const error = await captureError(() => createMercadoPagoProPlan(client, { backUrl: BACK_URL }));

    expect(error.message).not.toContain(marker);
  });

  it("writes nothing to the console", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );

    const { client } = fakeClient(async () => ({ id: "PLAN1" }));
    await createMercadoPagoProPlan(client, { backUrl: BACK_URL });

    const failing = fakeClient(async () => ({ status: "active" }));
    await captureError(() => createMercadoPagoProPlan(failing.client, { backUrl: BACK_URL }));

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("feeds the resolver: the created id becomes 'pro' and nothing else does", async () => {
    const { client } = fakeClient(async () => ({ id: "PLAN_REAL" }));

    const { preapprovalPlanId } = await createMercadoPagoProPlan(client, { backUrl: BACK_URL });

    const resolver = createMercadoPagoPlanResolver({ proPlanId: preapprovalPlanId });
    expect(resolver.resolvePlan("mercado_pago", preapprovalPlanId)).toBe("pro");
    expect(resolver.resolvePlan("mercado_pago", "PLAN_OTHER")).toBeNull();
    expect(resolver.resolvePlan("paypal", preapprovalPlanId)).toBeNull();
    expect(
      createMercadoPagoPlanResolver({ proPlanId: null }).resolvePlan(
        "mercado_pago",
        preapprovalPlanId,
      ),
    ).toBeNull();
  });
});

/* =========================== id reading ================================== */

describe("MP-M3B · PRO plan · readProPlanId", () => {
  it("returns a trimmed string id", () => {
    expect(readProPlanId({ id: "  PLAN1  " })).toBe("PLAN1");
  });

  it("coerces a finite numeric id instead of losing the plan", () => {
    expect(readProPlanId({ id: 123456789 })).toBe("123456789");
  });

  it("is null for every unusable id, never a throw", () => {
    const cases: unknown[] = [
      {},
      { id: "" },
      { id: "   " },
      { id: null },
      { id: true },
      { id: [1] },
      { id: Number.NaN },
      { id: Number.POSITIVE_INFINITY },
      null,
      "text",
      [],
    ];

    for (const response of cases) {
      expect(readProPlanId(response)).toBeNull();
    }
  });
});
