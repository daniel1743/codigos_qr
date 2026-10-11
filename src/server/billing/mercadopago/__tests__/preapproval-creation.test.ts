import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMercadoPagoClient,
  MercadoPagoError,
  readMercadoPagoConfigFromEnv,
  type MercadoPagoWriteClient,
} from "../client";
import {
  buildUserPreapprovalRequestBody,
  createMercadoPagoUserPreapproval,
  MERCADOPAGO_PREAPPROVAL_PATH,
  readPreapprovalInitPoint,
  readUserPreapprovalId,
  UserPreapprovalResponseError,
} from "../preapproval-creation";

/**
 * MP-M3C · MERCADO PAGO USER PREAPPROVAL PROVISIONING — the provider half.
 *
 * This module is the ONLY place in Billing that can bind a real subscription to
 * a real payer, so the properties pinned here are the ones whose failure costs a
 * duplicate remote resource or a stray charge:
 *
 *   · the request is a PLAN subscription — the money terms live in the plan and
 *     are not restated here, and the browser can never supply one;
 *   · nothing is sent unless the plan id, the payer email and (if present) the
 *     return URL are all usable;
 *   · a response is only accepted when it yields BOTH a subscription id and an
 *     https checkout URL, and when it does not, the error CARRIES whatever id
 *     could be read so a human can find the subscription that may exist.
 *
 * NOTHING HERE TOUCHES THE NETWORK. Global fetch is replaced with a landmine for
 * the whole file, so a test that accidentally reached the provider would fail
 * rather than create a subscription in someone's Mercado Pago account.
 */

const PLAN_ID = "2c938084726fca480172750000000000";
const PAYER_EMAIL = "user@example.com";
const BACK_URL = "https://cripqer.test/suscripcion";
const CHECKOUT_URL = `https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=SUB1`;

/** The exact body the live request must carry. A literal, on purpose. */
const EXPECTED_BODY = {
  preapproval_plan_id: PLAN_ID,
  payer_email: PAYER_EMAIL,
};

let realFetch: typeof fetch;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  realFetch = globalThis.fetch;
  fetchSpy = vi.fn(async () => {
    throw new Error("MP-M3C tests must never touch the network");
  });
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function fakeClient(postJsonImpl: (path: string, body: unknown) => Promise<unknown>): {
  client: MercadoPagoWriteClient;
  postJson: ReturnType<typeof vi.fn>;
  getJson: ReturnType<typeof vi.fn>;
} {
  const postJson = vi.fn(postJsonImpl);
  const getJson = vi.fn(async () => {
    throw new Error("subscription provisioning must never read");
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

/* ================================ contract ================================ */

describe("MP-M3C · user preapproval · the body is a plan subscription", () => {
  it("uses the documented endpoint path, distinct from the plan path", () => {
    expect(MERCADOPAGO_PREAPPROVAL_PATH).toBe("/preapproval");
  });

  it("builds the exact request Mercado Pago must receive", () => {
    expect(
      buildUserPreapprovalRequestBody({ preapprovalPlanId: PLAN_ID, payerEmail: PAYER_EMAIL }),
    ).toEqual(EXPECTED_BODY);
  });

  it("sends exactly two top-level keys, and three when a return URL is configured", () => {
    expect(
      Object.keys(
        buildUserPreapprovalRequestBody({ preapprovalPlanId: PLAN_ID, payerEmail: PAYER_EMAIL }),
      ).sort(),
    ).toEqual(["payer_email", "preapproval_plan_id"]);

    expect(
      Object.keys(
        buildUserPreapprovalRequestBody({
          preapprovalPlanId: PLAN_ID,
          payerEmail: PAYER_EMAIL,
          backUrl: BACK_URL,
        }),
      ).sort(),
    ).toEqual(["back_url", "payer_email", "preapproval_plan_id"]);
  });

  it("never restates the money: no amount, currency, frequency, trial or status", () => {
    const body = buildUserPreapprovalRequestBody({
      preapprovalPlanId: PLAN_ID,
      payerEmail: PAYER_EMAIL,
      backUrl: BACK_URL,
    });

    // A plan subscription takes its recurring settings FROM THE PLAN, so a
    // second copy of the price here could only drift from the frozen contract.
    for (const forbidden of [
      "auto_recurring",
      "transaction_amount",
      "currency_id",
      "frequency",
      "frequency_type",
      "free_trial",
    ]) {
      expect(Object.keys(body)).not.toContain(forbidden);
      expect(JSON.stringify(body)).not.toContain(forbidden);
    }
  });

  it("never asserts a status and never touches card data or provider metadata", () => {
    const body = buildUserPreapprovalRequestBody({
      preapprovalPlanId: PLAN_ID,
      payerEmail: PAYER_EMAIL,
    });

    // `status` is Mercado Pago's transition to make (a subscription without a
    // payment method is `pending`); `card_token_id` would mean the server
    // handling card data; `external_reference` is never an ownership authority.
    for (const forbidden of ["status", "card_token_id", "external_reference", "payer_id"]) {
      expect(Object.keys(body)).not.toContain(forbidden);
    }
  });

  it("ignores any extra field a loose caller tries to smuggle in", () => {
    const smuggled = {
      preapprovalPlanId: PLAN_ID,
      payerEmail: PAYER_EMAIL,
      amount: 1,
      currency: "USD",
      status: "authorized",
      cardTokenId: "TOKEN",
      externalReference: "user_other",
      autoRecurring: { transaction_amount: 1 },
    };

    expect(buildUserPreapprovalRequestBody(smuggled)).toEqual(EXPECTED_BODY);
  });

  it("trims the plan id and the payer email, leaving nothing else to guess", () => {
    const body = buildUserPreapprovalRequestBody({
      preapprovalPlanId: `  ${PLAN_ID}  `,
      payerEmail: `  ${PAYER_EMAIL}  `,
    });

    expect(body).toEqual(EXPECTED_BODY);
  });

  it("omits the return URL when it is empty or blank", () => {
    for (const backUrl of [null, "", "   "]) {
      expect(
        buildUserPreapprovalRequestBody({
          preapprovalPlanId: PLAN_ID,
          payerEmail: PAYER_EMAIL,
          backUrl,
        }),
      ).toEqual(EXPECTED_BODY);
    }
    // Absent entirely is the case the builder's own first test already covers.
  });
});

/* ============================ local refusals ============================== */

describe("MP-M3C · user preapproval · fails closed before any request", () => {
  const missingFields = [
    { what: "a plan id", options: { preapprovalPlanId: "", payerEmail: PAYER_EMAIL } },
    { what: "a plan id", options: { preapprovalPlanId: "   ", payerEmail: PAYER_EMAIL } },
    { what: "a payer email", options: { preapprovalPlanId: PLAN_ID, payerEmail: "" } },
    { what: "a payer email", options: { preapprovalPlanId: PLAN_ID, payerEmail: "  " } },
  ];

  it.each(missingFields)("refuses a missing $what with a typed INVALID_REQUEST", ({ options }) => {
    try {
      buildUserPreapprovalRequestBody(options);
      throw new Error("expected a refusal");
    } catch (error) {
      expect(error).toBeInstanceOf(MercadoPagoError);
      expect((error as MercadoPagoError).code).toBe("INVALID_REQUEST");
      expect((error as MercadoPagoError).status).toBeNull();
    }
  });

  it.each(["http://cripqer.test", "cripqer.test", "ftp://cripqer.test", "/checkout"])(
    "refuses the return URL %j",
    (backUrl) => {
      expect(() =>
        buildUserPreapprovalRequestBody({
          preapprovalPlanId: PLAN_ID,
          payerEmail: PAYER_EMAIL,
          backUrl,
        }),
      ).toThrowError(MercadoPagoError);
    },
  );

  it("sends nothing when the request cannot be built", async () => {
    const { client, postJson } = fakeClient(async () => ({ id: "SUB1" }));

    await expect(
      createMercadoPagoUserPreapproval(client, {
        preapprovalPlanId: PLAN_ID,
        payerEmail: "",
      }),
    ).rejects.toBeInstanceOf(MercadoPagoError);

    await expect(
      createMercadoPagoUserPreapproval(client, {
        preapprovalPlanId: PLAN_ID,
        payerEmail: PAYER_EMAIL,
        backUrl: "http://cripqer.test",
      }),
    ).rejects.toBeInstanceOf(MercadoPagoError);

    expect(postJson).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses on a missing access token without reaching the network", async () => {
    // The REAL client over an environment with no token: the refusal must come
    // from the client's own guard, before any request is attempted.
    const client = createMercadoPagoClient(
      readMercadoPagoConfigFromEnv({ MERCADOPAGO_PRO_PLAN_ID: PLAN_ID }),
    );

    const error = await captureError(() =>
      createMercadoPagoUserPreapproval(client, {
        preapprovalPlanId: PLAN_ID,
        payerEmail: PAYER_EMAIL,
      }),
    );

    expect(error.code).toBe("MISSING_ACCESS_TOKEN");
    expect(error.status).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ================================ creation ================================ */

describe("MP-M3C · user preapproval · creation", () => {
  const CREATED = {
    id: "SUB1",
    status: "pending",
    preapproval_plan_id: PLAN_ID,
    init_point: CHECKOUT_URL,
  };

  it("posts the exact body once and returns the id with the checkout URL", async () => {
    const { client, postJson, getJson } = fakeClient(async () => CREATED);

    const result = await createMercadoPagoUserPreapproval(client, {
      preapprovalPlanId: PLAN_ID,
      payerEmail: PAYER_EMAIL,
    });

    expect(result).toEqual({ preapprovalId: "SUB1", initPoint: CHECKOUT_URL });
    expect(postJson).toHaveBeenCalledTimes(1);
    expect(postJson).toHaveBeenCalledWith(MERCADOPAGO_PREAPPROVAL_PATH, EXPECTED_BODY);
    expect(getJson).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the configured return URL when one is given", async () => {
    const { client, postJson } = fakeClient(async () => CREATED);

    await createMercadoPagoUserPreapproval(client, {
      preapprovalPlanId: PLAN_ID,
      payerEmail: PAYER_EMAIL,
      backUrl: BACK_URL,
    });

    expect(postJson).toHaveBeenCalledWith(MERCADOPAGO_PREAPPROVAL_PATH, {
      ...EXPECTED_BODY,
      back_url: BACK_URL,
    });
  });

  it("accepts a numeric id without losing the subscription that was created", async () => {
    const { client } = fakeClient(async () => ({ ...CREATED, id: 123456789 }));

    const result = await createMercadoPagoUserPreapproval(client, {
      preapprovalPlanId: PLAN_ID,
      payerEmail: PAYER_EMAIL,
    });

    expect(result.preapprovalId).toBe("123456789");
  });

  it("fails closed when the response carries no usable id, warning it MAY exist", async () => {
    const { client } = fakeClient(async () => ({ status: "pending", init_point: CHECKOUT_URL }));

    const error = await captureError(() =>
      createMercadoPagoUserPreapproval(client, {
        preapprovalPlanId: PLAN_ID,
        payerEmail: PAYER_EMAIL,
      }),
    );

    expect(error).toBeInstanceOf(UserPreapprovalResponseError);
    expect((error as UserPreapprovalResponseError).preapprovalId).toBeNull();
    expect(error.code).toBe("INVALID_JSON");
    expect(error.message).toContain("MAY have been created");
    expect(error.message).toContain("before retrying");
  });

  it("fails closed when the id is present but no usable checkout URL is", async () => {
    for (const initPoint of [undefined, "", "http://mercadopago.test/x", "/checkout", 42]) {
      const { client } = fakeClient(async () => ({ id: "SUB1", init_point: initPoint }));

      const error = await captureError(() =>
        createMercadoPagoUserPreapproval(client, {
          preapprovalPlanId: PLAN_ID,
          payerEmail: PAYER_EMAIL,
        }),
      );

      expect(error).toBeInstanceOf(UserPreapprovalResponseError);
      // The id is the whole point of this failure: a human must be able to find
      // the subscription that now EXISTS remotely.
      expect((error as UserPreapprovalResponseError).preapprovalId).toBe("SUB1");
      expect(error.code).toBe("INVALID_JSON");
      expect(error.message).toContain("SUB1");
      expect(error.message).toContain("EXISTS remotely");
      expect(error.message).toContain("must not be retried");
    }
  });

  it("fails closed when the response is not an object at all", async () => {
    for (const response of ["not an object", [], 42, null]) {
      const { client } = fakeClient(async () => response);

      const error = await captureError(() =>
        createMercadoPagoUserPreapproval(client, {
          preapprovalPlanId: PLAN_ID,
          payerEmail: PAYER_EMAIL,
        }),
      );

      expect(error.code).toBe("INVALID_JSON");
      expect((error as UserPreapprovalResponseError).preapprovalId).toBeNull();
    }
  });

  it("propagates a provider rejection unchanged, without retrying", async () => {
    const failure = new MercadoPagoError(
      "HTTP_ERROR",
      "Mercado Pago responded with HTTP 500.",
      500,
    );
    const { client, postJson } = fakeClient(async () => {
      throw failure;
    });

    const error = await captureError(() =>
      createMercadoPagoUserPreapproval(client, {
        preapprovalPlanId: PLAN_ID,
        payerEmail: PAYER_EMAIL,
      }),
    );

    expect(error).toBe(failure);
    expect(postJson).toHaveBeenCalledTimes(1);
  });

  it("keeps the provider's response body out of the failure message", async () => {
    const marker = "PROVIDER_BODY_MARKER_must_not_surface";
    const { client } = fakeClient(async () => ({ message: marker, cause: marker }));

    const error = await captureError(() =>
      createMercadoPagoUserPreapproval(client, {
        preapprovalPlanId: PLAN_ID,
        payerEmail: PAYER_EMAIL,
      }),
    );

    expect(error.message).not.toContain(marker);
  });

  it("writes nothing to the console", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );

    const { client } = fakeClient(async () => CREATED);
    await createMercadoPagoUserPreapproval(client, {
      preapprovalPlanId: PLAN_ID,
      payerEmail: PAYER_EMAIL,
    });

    const failing = fakeClient(async () => ({ status: "pending" }));
    await captureError(() =>
      createMercadoPagoUserPreapproval(failing.client, {
        preapprovalPlanId: PLAN_ID,
        payerEmail: PAYER_EMAIL,
      }),
    );

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

/* ============================== readers ================================== */

describe("MP-M3C · user preapproval · defensive reads", () => {
  it("returns a trimmed string id", () => {
    expect(readUserPreapprovalId({ id: "  SUB1  " })).toBe("SUB1");
  });

  it("coerces a finite numeric id", () => {
    expect(readUserPreapprovalId({ id: 987654321 })).toBe("987654321");
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

    for (const response of cases) expect(readUserPreapprovalId(response)).toBeNull();
  });

  it("accepts only an absolute https checkout URL", () => {
    expect(readPreapprovalInitPoint({ init_point: CHECKOUT_URL })).toBe(CHECKOUT_URL);
    expect(readPreapprovalInitPoint({ init_point: `  ${CHECKOUT_URL}  ` })).toBe(CHECKOUT_URL);
    // `init_point` is handed to a browser as a redirect target, so anything
    // that is not https is refused here rather than navigated to later.
    expect(readPreapprovalInitPoint({ init_point: "http://mercadopago.test/x" })).toBeNull();
    expect(readPreapprovalInitPoint({ init_point: "mercadopago.test/x" })).toBeNull();
    expect(readPreapprovalInitPoint({ init_point: "javascript:alert(1)" })).toBeNull();
    expect(readPreapprovalInitPoint({ init_point: 42 })).toBeNull();
    expect(readPreapprovalInitPoint({})).toBeNull();
    expect(readPreapprovalInitPoint(null)).toBeNull();
  });
});
