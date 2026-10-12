import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMercadoPagoClient,
  MercadoPagoError,
  readMercadoPagoConfigFromEnv,
  type MercadoPagoWriteClient,
} from "../client";
import {
  buildUserPreapprovalPath,
  buildUserPreapprovalRequestBody,
  createMercadoPagoUserPreapproval,
  MERCADOPAGO_AUTHORIZED_STATUS,
  MERCADOPAGO_PREAPPROVAL_PATH,
  readUserPreapprovalCheckoutUrl,
  readUserPreapprovalId,
  readUserPreapprovalStatus,
  UserPreapprovalResponseError,
} from "../preapproval-creation";

/**
 * MP-M3C / MP-M3D.7 · MERCADO PAGO USER PREAPPROVAL PROVISIONING — the provider half.
 *
 * This module is the ONLY place in Billing that can bind a real subscription to
 * a real payer, so the properties pinned here are the ones whose failure costs a
 * duplicate remote resource or a stray charge:
 *
 *   · the request is a PLAN subscription — the money terms live in the plan and
 *     are not restated here, and the browser can never supply one;
 *   · the request carries the payment instrument the provider demands
 *     (`card_token_id`) and the creation status it demands (`authorized`), and
 *     those two are the ONLY keys this phase added;
 *   · nothing is sent unless the plan id, the payer email, the card token and
 *     (if present) the return URL are all usable;
 *   · the card token never appears in a thrown error, a message or a
 *     stringified failure;
 *   · a response is only accepted when it yields a subscription id, and when it
 *     does not, the error CARRIES whatever id could be read so a human can find
 *     the subscription that may exist.
 *
 * WHAT MP-M3D.7 INVERTED HERE, AND WHY
 * Two properties in this file used to assert the OPPOSITE, and they were not
 * wrong by accident — they encoded a belief that the provider would create a
 * `pending` subscription for a caller who sent no payment material. MP-M3D.5
 * captured Mercado Pago answering `400 "card_token_id is required"` and MP-M3D.6
 * established from the official guide that `status: authorized` is required with
 * a plan. So the two tests that demanded the ABSENCE of those fields now demand
 * their PRESENCE, and the test that treated a missing checkout URL as a critical
 * failure now treats it as an acceptable success — because the subscription is
 * already authorized in the browser and there is nothing left to redirect to.
 * Each inversion is marked below with `INVERTED IN MP-M3D.7` so a reader can see
 * exactly which beliefs changed and which ones still hold.
 *
 * NOTHING HERE TOUCHES THE NETWORK. Global fetch is replaced with a landmine for
 * the whole file, so a test that accidentally reached the provider would fail
 * rather than create a subscription in someone's Mercado Pago account.
 */

const PLAN_ID = "2c938084726fca480172750000000000";
const PAYER_EMAIL = "user@example.com";
const BACK_URL = "https://cripqer.test/suscripcion";
const CHECKOUT_URL = `https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=SUB1`;

/**
 * A deliberately non-realistic token fixture.
 *
 * Mercado Pago's real tokens are short opaque alphanumerics; this string is a
 * sentence-shaped sentinel so that no reader, scanner or secret-detector can
 * mistake a test fixture for captured payment material.
 */
const CARD_TOKEN = "fixture_card_token_mp_m3d7_not_a_real_token";

/** The exact body the live request must carry. A literal, on purpose. */
const EXPECTED_BODY = {
  preapproval_plan_id: PLAN_ID,
  payer_email: PAYER_EMAIL,
  card_token_id: CARD_TOKEN,
  status: "authorized",
};

const CREATION_OPTIONS = {
  preapprovalPlanId: PLAN_ID,
  payerEmail: PAYER_EMAIL,
  cardTokenId: CARD_TOKEN,
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
    expect(buildUserPreapprovalRequestBody(CREATION_OPTIONS)).toEqual(EXPECTED_BODY);
  });

  it("sends exactly four top-level keys, and five when a return URL is configured", () => {
    expect(Object.keys(buildUserPreapprovalRequestBody(CREATION_OPTIONS)).sort()).toEqual([
      "card_token_id",
      "payer_email",
      "preapproval_plan_id",
      "status",
    ]);

    expect(
      Object.keys(
        buildUserPreapprovalRequestBody({ ...CREATION_OPTIONS, backUrl: BACK_URL }),
      ).sort(),
    ).toEqual(["back_url", "card_token_id", "payer_email", "preapproval_plan_id", "status"]);
  });

  it("carries the card token and the authorized status — the two fields MP-M3D.7 added", () => {
    // INVERTED IN MP-M3D.7: this test used to assert that NEITHER field was
    // present ("`status` is Mercado Pago's transition to make", "`card_token_id`
    // would mean the server handling card data"). The provider refuses a
    // with-plan creation without both, so their presence is now the property.
    const body = buildUserPreapprovalRequestBody(CREATION_OPTIONS);

    expect(body.card_token_id).toBe(CARD_TOKEN);
    expect(body.status).toBe("authorized");
    // The status is a constant, not a caller's choice: the builder accepts no
    // status argument, and the exported constant is the only value the type
    // admits.
    expect(MERCADOPAGO_AUTHORIZED_STATUS).toBe("authorized");
  });

  it("never restates the money: no amount, currency, frequency or trial", () => {
    const body = buildUserPreapprovalRequestBody({ ...CREATION_OPTIONS, backUrl: BACK_URL });

    // A plan subscription takes its recurring settings FROM THE PLAN, so a
    // second copy of the price here could only drift from the frozen contract.
    // `status` is deliberately NOT on this list any more (MP-M3D.7): it is not a
    // money term, and the provider requires it.
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

  it("still refuses to send provider metadata that is never an ownership authority", () => {
    const body = buildUserPreapprovalRequestBody(CREATION_OPTIONS);

    for (const forbidden of ["external_reference", "payer_id"]) {
      expect(Object.keys(body)).not.toContain(forbidden);
    }
  });

  it("ignores any extra field a loose caller tries to smuggle in", () => {
    // The builder takes named options and reads only those, so a call that ALSO
    // passes the raw provider field names must not be able to write them into
    // the body. This is the closest a caller can get to hand-crafting the
    // payload, and it changes nothing.
    const smuggled = {
      ...CREATION_OPTIONS,
      amount: 1,
      currency: "USD",
      status: "cancelled",
      card_token_id: "attacker_supplied_token",
      preapproval_plan_id: "attacker_supplied_plan",
      externalReference: "user_other",
      payer_id: "999",
      autoRecurring: { transaction_amount: 1 },
    };

    const body = buildUserPreapprovalRequestBody(smuggled);

    expect(body).toEqual(EXPECTED_BODY);
    expect(JSON.stringify(body)).not.toContain("attacker_supplied");
    expect(JSON.stringify(body)).not.toContain("USD");
  });

  it("trims the plan id, the payer email and the token, leaving nothing else to guess", () => {
    const body = buildUserPreapprovalRequestBody({
      preapprovalPlanId: `  ${PLAN_ID}  `,
      payerEmail: `  ${PAYER_EMAIL}  `,
      cardTokenId: `  ${CARD_TOKEN}  `,
    });

    expect(body).toEqual(EXPECTED_BODY);
  });

  it("omits the return URL when it is empty or blank", () => {
    for (const backUrl of [null, "", "   "]) {
      expect(buildUserPreapprovalRequestBody({ ...CREATION_OPTIONS, backUrl })).toEqual(
        EXPECTED_BODY,
      );
    }
    // Absent entirely is the case the builder's own first test already covers.
  });

  it("builds a readback path that targets the SAME collection it creates into", () => {
    // A readback pointed somewhere else would report the state of a resource
    // this module never created, which is the quietest possible way to be wrong.
    expect(buildUserPreapprovalPath("SUB1")).toBe("/preapproval/SUB1");
    // The id comes from the provider, but "trusted origin" is not a reason to
    // interpolate into a path unchecked.
    expect(buildUserPreapprovalPath("a/b?c")).toBe("/preapproval/a%2Fb%3Fc");
  });
});

/* ============================ local refusals ============================== */

describe("MP-M3C · user preapproval · fails closed before any request", () => {
  const missingFields = [
    { what: "a plan id", options: { ...CREATION_OPTIONS, preapprovalPlanId: "" } },
    { what: "a plan id", options: { ...CREATION_OPTIONS, preapprovalPlanId: "   " } },
    { what: "a payer email", options: { ...CREATION_OPTIONS, payerEmail: "" } },
    { what: "a payer email", options: { ...CREATION_OPTIONS, payerEmail: "  " } },
    { what: "a card token", options: { ...CREATION_OPTIONS, cardTokenId: "" } },
    { what: "a card token", options: { ...CREATION_OPTIONS, cardTokenId: "   " } },
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

  it("refuses a card token that is not a string, or is over the bound", () => {
    for (const cardTokenId of [42, null, undefined, true, {}, [], "x".repeat(129)]) {
      expect(() =>
        buildUserPreapprovalRequestBody({
          ...CREATION_OPTIONS,
          cardTokenId: cardTokenId as unknown as string,
        }),
      ).toThrowError(MercadoPagoError);
    }
  });

  it("NEVER echoes the card token in the error it raises for it", () => {
    // The token is payment material on the path from an untrusted request to a
    // log line. The one place it could leak from this module is the refusal
    // message, so this is asserted directly rather than left to inspection.
    const oversize = `SECRET_TOKEN_PREFIX_${"x".repeat(200)}`;
    let caught: unknown;
    try {
      buildUserPreapprovalRequestBody({ ...CREATION_OPTIONS, cardTokenId: oversize });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(MercadoPagoError);
    const error = caught as MercadoPagoError;
    const surface = `${error.message} ${error.name} ${JSON.stringify(error)} ${String(error)}`;
    expect(surface).not.toContain("SECRET_TOKEN_PREFIX_");
    // And it says what was missing, so the refusal is still diagnosable.
    expect(error.message).toContain("card_token_id");
  });

  it.each(["http://cripqer.test", "cripqer.test", "ftp://cripqer.test", "/checkout"])(
    "refuses the return URL %j",
    (backUrl) => {
      expect(() =>
        buildUserPreapprovalRequestBody({ ...CREATION_OPTIONS, backUrl }),
      ).toThrowError(MercadoPagoError);
    },
  );

  it("sends nothing when the request cannot be built", async () => {
    const { client, postJson } = fakeClient(async () => ({ id: "SUB1" }));

    await expect(
      createMercadoPagoUserPreapproval(client, { ...CREATION_OPTIONS, payerEmail: "" }),
    ).rejects.toBeInstanceOf(MercadoPagoError);

    await expect(
      createMercadoPagoUserPreapproval(client, { ...CREATION_OPTIONS, cardTokenId: "" }),
    ).rejects.toBeInstanceOf(MercadoPagoError);

    await expect(
      createMercadoPagoUserPreapproval(client, {
        ...CREATION_OPTIONS,
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

    const error = await captureError(() => createMercadoPagoUserPreapproval(client, CREATION_OPTIONS));

    expect(error.code).toBe("MISSING_ACCESS_TOKEN");
    expect(error.status).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ================================ creation ================================ */

describe("MP-M3C · user preapproval · creation", () => {
  const CREATED = {
    id: "SUB1",
    status: "authorized",
    preapproval_plan_id: PLAN_ID,
    init_point: CHECKOUT_URL,
  };

  it("posts the exact body once and returns the id, the status and the checkout URL", async () => {
    const { client, postJson, getJson } = fakeClient(async () => CREATED);

    const result = await createMercadoPagoUserPreapproval(client, CREATION_OPTIONS);

    expect(result).toEqual({
      preapprovalId: "SUB1",
      providerStatus: "authorized",
      checkoutUrl: CHECKOUT_URL,
    });
    expect(postJson).toHaveBeenCalledTimes(1);
    expect(postJson).toHaveBeenCalledWith(MERCADOPAGO_PREAPPROVAL_PATH, EXPECTED_BODY);
    // The readback belongs to the FLOW, not to this module: creating must stay
    // exactly one provider call.
    expect(getJson).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the configured return URL when one is given", async () => {
    const { client, postJson } = fakeClient(async () => CREATED);

    await createMercadoPagoUserPreapproval(client, { ...CREATION_OPTIONS, backUrl: BACK_URL });

    expect(postJson).toHaveBeenCalledWith(MERCADOPAGO_PREAPPROVAL_PATH, {
      ...EXPECTED_BODY,
      back_url: BACK_URL,
    });
  });

  it("accepts a numeric id without losing the subscription that was created", async () => {
    const { client } = fakeClient(async () => ({ ...CREATED, id: 123456789 }));

    const result = await createMercadoPagoUserPreapproval(client, CREATION_OPTIONS);

    expect(result.preapprovalId).toBe("123456789");
  });

  it("fails closed when the response carries no usable id, warning it MAY exist", async () => {
    const { client } = fakeClient(async () => ({ status: "authorized", init_point: CHECKOUT_URL }));

    const error = await captureError(() => createMercadoPagoUserPreapproval(client, CREATION_OPTIONS));

    expect(error).toBeInstanceOf(UserPreapprovalResponseError);
    expect((error as UserPreapprovalResponseError).preapprovalId).toBeNull();
    expect(error.code).toBe("INVALID_JSON");
    expect(error.message).toContain("MAY have been created");
    expect(error.message).toContain("before retrying");
  });

  it("SUCCEEDS when the id is present but no usable checkout URL is", async () => {
    // INVERTED IN MP-M3D.7. This test used to demand a critical
    // `UserPreapprovalResponseError` carrying the id. That was right when the
    // flow EXISTED to hand the payer a redirect: without a URL there was nothing
    // to do. The card is now tokenized in the browser and the subscription is
    // created authorized, so the URL is a secondary "add or modify payment
    // method" affordance — and reporting a healthy subscription as a critical
    // failure would send a human chasing a resource that needs no recovery.
    for (const initPoint of [undefined, "", "http://mercadopago.test/x", "/checkout", 42]) {
      const { client } = fakeClient(async () => ({ id: "SUB1", status: "authorized", init_point: initPoint }));

      const result = await createMercadoPagoUserPreapproval(client, CREATION_OPTIONS);

      expect(result.preapprovalId).toBe("SUB1");
      expect(result.providerStatus).toBe("authorized");
      expect(result.checkoutUrl).toBeNull();
    }
  });

  it("reports a missing provider status as null rather than inventing one", async () => {
    for (const status of [undefined, "", "   ", 42, null, { status: "authorized" }]) {
      const { client } = fakeClient(async () => ({ id: "SUB1", status, init_point: CHECKOUT_URL }));

      const result = await createMercadoPagoUserPreapproval(client, CREATION_OPTIONS);

      expect(result.providerStatus).toBeNull();
    }
  });

  it("fails closed when the response is not an object at all", async () => {
    for (const response of ["not an object", [], 42, null]) {
      const { client } = fakeClient(async () => response);

      const error = await captureError(() =>
        createMercadoPagoUserPreapproval(client, CREATION_OPTIONS),
      );

      expect(error.code).toBe("INVALID_JSON");
      expect((error as UserPreapprovalResponseError).preapprovalId).toBeNull();
    }
  });

  it("propagates a provider rejection unchanged, without retrying", async () => {
    const failure = new MercadoPagoError("HTTP_ERROR", "Mercado Pago responded with HTTP 500.", 500);
    const { client, postJson } = fakeClient(async () => {
      throw failure;
    });

    const error = await captureError(() => createMercadoPagoUserPreapproval(client, CREATION_OPTIONS));

    expect(error).toBe(failure);
    expect(postJson).toHaveBeenCalledTimes(1);
  });

  it("keeps both the provider's response body and the card token out of the failure message", async () => {
    const marker = "PROVIDER_BODY_MARKER_must_not_surface";
    const { client } = fakeClient(async () => ({ message: marker, cause: marker }));

    const error = await captureError(() => createMercadoPagoUserPreapproval(client, CREATION_OPTIONS));

    expect(error.message).not.toContain(marker);
    expect(`${error.message} ${JSON.stringify(error)}`).not.toContain(CARD_TOKEN);
  });

  it("writes nothing to the console", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );

    const { client } = fakeClient(async () => CREATED);
    await createMercadoPagoUserPreapproval(client, CREATION_OPTIONS);

    const failing = fakeClient(async () => ({ status: "authorized" }));
    await captureError(() => createMercadoPagoUserPreapproval(failing.client, CREATION_OPTIONS));

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("no successful result holds the card token in any field", async () => {
    const { client } = fakeClient(async () => CREATED);

    const result = await createMercadoPagoUserPreapproval(client, CREATION_OPTIONS);

    expect(JSON.stringify(result)).not.toContain(CARD_TOKEN);
    expect(Object.values(result)).not.toContain(CARD_TOKEN);
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
    expect(readUserPreapprovalCheckoutUrl({ init_point: CHECKOUT_URL })).toBe(CHECKOUT_URL);
    expect(readUserPreapprovalCheckoutUrl({ init_point: `  ${CHECKOUT_URL}  ` })).toBe(
      CHECKOUT_URL,
    );
    // The URL can be handed to a browser as a navigation target, so anything
    // that is not https is refused here rather than navigated to later.
    expect(readUserPreapprovalCheckoutUrl({ init_point: "http://mercadopago.test/x" })).toBeNull();
    expect(readUserPreapprovalCheckoutUrl({ init_point: "mercadopago.test/x" })).toBeNull();
    expect(readUserPreapprovalCheckoutUrl({ init_point: "javascript:alert(1)" })).toBeNull();
    expect(readUserPreapprovalCheckoutUrl({ init_point: 42 })).toBeNull();
    expect(readUserPreapprovalCheckoutUrl({})).toBeNull();
    expect(readUserPreapprovalCheckoutUrl(null)).toBeNull();
  });

  it("reads the provider status as bounded opaque text, never as a validated enum", () => {
    expect(readUserPreapprovalStatus({ status: "authorized" })).toBe("authorized");
    expect(readUserPreapprovalStatus({ status: "  pending  " })).toBe("pending");
    // An unrecognised status is passed through as text on purpose: the canonical
    // mapping lives in `webhooks.ts`, and a second list here would be a second
    // thing to drift.
    expect(readUserPreapprovalStatus({ status: "some_future_status" })).toBe("some_future_status");

    for (const status of [undefined, "", "   ", 42, null, {}, [], "x".repeat(65)]) {
      expect(readUserPreapprovalStatus({ status })).toBeNull();
    }
    expect(readUserPreapprovalStatus(null)).toBeNull();
  });
});
