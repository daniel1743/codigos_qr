import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMercadoPagoClient,
  DEFAULT_MERCADOPAGO_TIMEOUT_MS,
  failureCategoryForCode,
  hasProviderObservation,
  MERCADOPAGO_API_BASE_URL,
  MERCADOPAGO_ENV_KEYS,
  MercadoPagoError,
  readMercadoPagoConfigFromEnv,
  sanitizeProviderText,
} from "../client";
import type { MercadoPagoConfig } from "../types";

/**
 * MP-M1 · MERCADO PAGO HTTP CLIENT.
 *
 * The client is the only place in Billing that holds a provider credential and
 * speaks to the network, so these tests are written around the two properties
 * that matter: every failure fails CLOSED with a typed error, and the access
 * token never leaves the Authorization header.
 */

const TOKEN = "TEST_ACCESS_TOKEN_should_never_be_printed";

function config(overrides: Partial<MercadoPagoConfig> = {}): MercadoPagoConfig {
  return { accessToken: TOKEN, webhookSecret: null, proPlanId: null, ...overrides };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  const mock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MP-M1 · client · the happy path", () => {
  it("GETs the real API origin with a Bearer token and returns the parsed object", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ id: "PRE1", status: "authorized" }));

    const result = await createMercadoPagoClient(config()).getJson("/preapproval/PRE1");

    expect(result).toEqual({ id: "PRE1", status: "authorized" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${MERCADOPAGO_API_BASE_URL}/preapproval/PRE1`);
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(`Bearer ${TOKEN}`);
  });

  it("accepts a path without a leading slash and a base URL with a trailing slash", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ ok: true }));

    await createMercadoPagoClient(config({ baseUrl: "https://mp.test/" })).getJson("v1/payments/1");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://mp.test/v1/payments/1");
  });

  it("defaults the timeout to the declared constant", async () => {
    expect(DEFAULT_MERCADOPAGO_TIMEOUT_MS).toBeGreaterThan(0);
    expect(MERCADOPAGO_API_BASE_URL).toBe("https://api.mercadopago.com");
  });
});

describe("MP-M1 · client · provider failures fail closed", () => {
  it("maps 401 to UNAUTHORIZED and sends no usable result", async () => {
    stubFetch(async () => jsonResponse({ message: "invalid token" }, 401));

    const error = await captureError(() =>
      createMercadoPagoClient(config()).getJson("/preapproval/PRE1"),
    );

    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.status).toBe(401);
  });

  it("maps 403 to UNAUTHORIZED", async () => {
    stubFetch(async () => jsonResponse({}, 403));

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.code).toBe("UNAUTHORIZED");
  });

  it("maps 404 to NOT_FOUND", async () => {
    stubFetch(async () => jsonResponse({}, 404));

    const error = await captureError(() =>
      createMercadoPagoClient(config()).getJson("/preapproval/missing"),
    );

    expect(error.code).toBe("NOT_FOUND");
    expect(error.status).toBe(404);
  });

  it("maps any other non-2xx to HTTP_ERROR carrying the status", async () => {
    stubFetch(async () => jsonResponse({}, 500));

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.code).toBe("HTTP_ERROR");
    expect(error.status).toBe(500);
  });

  it("times out explicitly instead of hanging", async () => {
    stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const aborted = new Error("aborted");
            aborted.name = "AbortError";
            reject(aborted);
          });
        }),
    );

    const error = await captureError(() =>
      createMercadoPagoClient(config({ timeoutMs: 5 })).getJson("/preapproval/PRE1"),
    );

    expect(error.code).toBe("TIMEOUT");
    expect(error.status).toBeNull();
  });

  it("maps a transport failure to NETWORK_ERROR", async () => {
    stubFetch(async () => {
      throw new Error("socket closed");
    });

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.code).toBe("NETWORK_ERROR");
  });

  it("rejects a body that is not JSON", async () => {
    stubFetch(async () => new Response("<html>gateway</html>", { status: 200 }));

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.code).toBe("INVALID_JSON");
  });

  it("rejects JSON that is not an object", async () => {
    stubFetch(async () => jsonResponse([{ id: "PRE1" }]));

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.code).toBe("INVALID_JSON");
  });

  it("fails before any request when the access token is missing", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));

    const error = await captureError(() =>
      createMercadoPagoClient(config({ accessToken: null })).getJson("/preapproval/PRE1"),
    );

    expect(error.code).toBe("MISSING_ACCESS_TOKEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only token as missing", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));

    const error = await captureError(() =>
      createMercadoPagoClient(config({ accessToken: "   " })).getJson("/x"),
    );

    expect(error.code).toBe("MISSING_ACCESS_TOKEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("MP-M1 · client · the credential never leaks", () => {
  it("keeps the token out of every error message", async () => {
    const cases: Array<() => Promise<Response>> = [
      async () => jsonResponse({}, 401),
      async () => jsonResponse({}, 404),
      async () => jsonResponse({}, 503),
      async () => new Response("not json", { status: 200 }),
    ];

    for (const responder of cases) {
      stubFetch(responder);
      const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));
      expect(error.message).not.toContain(TOKEN);
      expect(JSON.stringify({ ...error, message: error.message })).not.toContain(TOKEN);
    }
  });

  it("does not surface the provider error body", async () => {
    const marker = "PROVIDER_BODY_MARKER_must_not_surface";
    stubFetch(async () => new Response(JSON.stringify({ detail: marker }), { status: 500 }));

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.message).not.toContain(marker);
  });

  it("writes nothing to the console on any path", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );

    stubFetch(async () => jsonResponse({ id: "PRE1" }));
    await createMercadoPagoClient(config()).getJson("/preapproval/PRE1");

    stubFetch(async () => jsonResponse({}, 401));
    await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe("MP-M1 · client · environment configuration", () => {
  it("uses explicit server-side names and never a VITE_ name", () => {
    expect(MERCADOPAGO_ENV_KEYS).toEqual({
      accessToken: "MERCADOPAGO_ACCESS_TOKEN",
      webhookSecret: "MERCADOPAGO_WEBHOOK_SECRET",
      proPlanId: "MERCADOPAGO_PRO_PLAN_ID",
    });
    for (const key of Object.values(MERCADOPAGO_ENV_KEYS)) {
      expect(key.startsWith("VITE_")).toBe(false);
    }
  });

  it("reads and trims the configured values", () => {
    const resolved = readMercadoPagoConfigFromEnv({
      MERCADOPAGO_ACCESS_TOKEN: "  token-value  ",
      MERCADOPAGO_WEBHOOK_SECRET: "secret-value",
      MERCADOPAGO_PRO_PLAN_ID: "2c938084",
    });

    expect(resolved).toEqual({
      accessToken: "token-value",
      webhookSecret: "secret-value",
      proPlanId: "2c938084",
    });
  });

  it("resolves absent, empty and whitespace-only to the same 'not configured' state", () => {
    const resolved = readMercadoPagoConfigFromEnv({
      MERCADOPAGO_ACCESS_TOKEN: "",
      MERCADOPAGO_WEBHOOK_SECRET: "   ",
    });

    expect(resolved.accessToken).toBeNull();
    expect(resolved.webhookSecret).toBeNull();
    expect(resolved.proPlanId).toBeNull();
  });

  it("ignores VITE_-prefixed lookalikes", () => {
    const resolved = readMercadoPagoConfigFromEnv({
      VITE_MERCADOPAGO_ACCESS_TOKEN: "must-not-be-read",
    });

    expect(resolved.accessToken).toBeNull();
  });
});

/* ================== MP-M3B · client · POST (the one write) ================= */

const POST_BODY = { reason: "Cripqer Pro", back_url: "https://cripqer.test/suscripcion" };

describe("MP-M3B · client · POST", () => {
  it("POSTs the JSON body with the Bearer token and an explicit Content-Type", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ id: "PLAN1", status: "active" }));

    const result = await createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY);

    expect(result).toEqual({ id: "PLAN1", status: "active" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${MERCADOPAGO_API_BASE_URL}/preapproval_plan`);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(POST_BODY));
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${TOKEN}`);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("leaves GET exactly as it was: no body and no Content-Type", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ ok: true }));

    await createMercadoPagoClient(config()).getJson("/preapproval/PRE1");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("fails before any request when the access token is missing", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));

    const error = await captureError(() =>
      createMercadoPagoClient(config({ accessToken: null })).postJson(
        "/preapproval_plan",
        POST_BODY,
      ),
    );

    expect(error.code).toBe("MISSING_ACCESS_TOKEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps 401 and 403 to UNAUTHORIZED carrying the status", async () => {
    for (const status of [401, 403]) {
      stubFetch(async () => jsonResponse({}, status));

      const error = await captureError(() =>
        createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
      );

      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.status).toBe(status);
    }
  });

  it("maps 404 to NOT_FOUND", async () => {
    stubFetch(async () => jsonResponse({}, 404));

    const error = await captureError(() =>
      createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
    );

    expect(error.code).toBe("NOT_FOUND");
    expect(error.status).toBe(404);
  });

  it("maps 409 to HTTP_ERROR carrying the status, with no invented conflict semantics", async () => {
    stubFetch(async () => jsonResponse({}, 409));

    const error = await captureError(() =>
      createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
    );

    expect(error.code).toBe("HTTP_ERROR");
    expect(error.status).toBe(409);
  });

  it("maps 429 to HTTP_ERROR carrying the status", async () => {
    stubFetch(async () => jsonResponse({}, 429));

    const error = await captureError(() =>
      createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
    );

    expect(error.code).toBe("HTTP_ERROR");
    expect(error.status).toBe(429);
  });

  it("maps 5xx to HTTP_ERROR carrying the status", async () => {
    stubFetch(async () => jsonResponse({}, 503));

    const error = await captureError(() =>
      createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
    );

    expect(error.code).toBe("HTTP_ERROR");
    expect(error.status).toBe(503);
  });

  it("times out explicitly instead of hanging", async () => {
    stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const aborted = new Error("aborted");
            aborted.name = "AbortError";
            reject(aborted);
          });
        }),
    );

    const error = await captureError(() =>
      createMercadoPagoClient(config({ timeoutMs: 5 })).postJson("/preapproval_plan", POST_BODY),
    );

    expect(error.code).toBe("TIMEOUT");
    expect(error.status).toBeNull();
  });

  it("maps a transport failure to NETWORK_ERROR", async () => {
    stubFetch(async () => {
      throw new Error("socket closed");
    });

    const error = await captureError(() =>
      createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
    );

    expect(error.code).toBe("NETWORK_ERROR");
  });

  it("rejects a response body that is not JSON", async () => {
    stubFetch(async () => new Response("<html>gateway</html>", { status: 201 }));

    const error = await captureError(() =>
      createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
    );

    expect(error.code).toBe("INVALID_JSON");
  });

  it("rejects a JSON response that is not an object", async () => {
    stubFetch(async () => jsonResponse([{ id: "PLAN1" }]));

    const error = await captureError(() =>
      createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
    );

    expect(error.code).toBe("INVALID_JSON");
  });

  it("keeps the token out of every POST error message", async () => {
    const cases: Array<() => Promise<Response>> = [
      async () => jsonResponse({}, 401),
      async () => jsonResponse({}, 409),
      async () => jsonResponse({}, 429),
      async () => jsonResponse({}, 503),
      async () => new Response("not json", { status: 200 }),
    ];

    for (const responder of cases) {
      stubFetch(responder);
      const error = await captureError(() =>
        createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
      );
      expect(error.message).not.toContain(TOKEN);
      expect(JSON.stringify({ ...error, message: error.message })).not.toContain(TOKEN);
    }
  });

  it("does not surface the provider error body", async () => {
    const marker = "PROVIDER_BODY_MARKER_must_not_surface";
    stubFetch(async () => new Response(JSON.stringify({ detail: marker }), { status: 500 }));

    const error = await captureError(() =>
      createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
    );

    expect(error.message).not.toContain(marker);
  });

  it("writes nothing to the console on the POST paths", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );

    stubFetch(async () => jsonResponse({ id: "PLAN1" }));
    await createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY);

    stubFetch(async () => jsonResponse({}, 401));
    await captureError(() =>
      createMercadoPagoClient(config()).postJson("/preapproval_plan", POST_BODY),
    );

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

/* ============================== MP-M3D.4 ================================ */

/**
 * MP-M3D.4 · PROVIDER FAILURE FORENSICS.
 *
 * MP-M3D.3 produced one 502 with zero preapprovals created, and no way to tell a
 * rejected payload from a timeout from a dead socket: all three looked identical
 * from outside, so diagnosing it would have meant repeating it.
 *
 * These tests pin the fix. Every failure keeps the shape it always had — a typed
 * error, an unchanged `message`, no provider body in it, no console output — and
 * gains a SANITIZED diagnostic that says which kind of failure it was. The other
 * half of the contract is the one asserted most loudly here: the diagnostic
 * cannot carry anything the sanitizer did not pass, so an observability feature
 * does not become a leak.
 */

/** A body in the shape Mercado Pago actually returns for a rejected request. */
function mercadoPagoErrorBody(overrides: Record<string, unknown> = {}): Response {
  return jsonResponse(
    {
      message: "Invalid preapproval_plan_id",
      error: "bad_request",
      status: 400,
      cause: [{ code: 1234, description: "preapproval_plan_id does not exist" }],
      ...overrides,
    },
    400,
  );
}

describe("MP-M3D.4 · client · every provider failure keeps its category", () => {
  const cases: Array<{
    name: string;
    status: number;
    code: string;
    category: string;
  }> = [
    { name: "400", status: 400, code: "HTTP_ERROR", category: "PROVIDER_HTTP_ERROR" },
    { name: "401", status: 401, code: "UNAUTHORIZED", category: "PROVIDER_HTTP_ERROR" },
    { name: "403", status: 403, code: "UNAUTHORIZED", category: "PROVIDER_HTTP_ERROR" },
    { name: "404", status: 404, code: "NOT_FOUND", category: "PROVIDER_HTTP_ERROR" },
    { name: "409", status: 409, code: "HTTP_ERROR", category: "PROVIDER_HTTP_ERROR" },
    { name: "422", status: 422, code: "HTTP_ERROR", category: "PROVIDER_HTTP_ERROR" },
    { name: "500", status: 500, code: "HTTP_ERROR", category: "PROVIDER_HTTP_ERROR" },
  ];

  for (const testCase of cases) {
    it(`classifies a provider ${testCase.name} as ${testCase.category}, preserving the status`, async () => {
      const fetchMock = stubFetch(
        async () =>
          new Response(
            JSON.stringify({
              message: "Invalid preapproval_plan_id",
              error: "bad_request",
              cause: [{ code: 1234, description: "preapproval_plan_id does not exist" }],
            }),
            { status: testCase.status, headers: { "Content-Type": "application/json" } },
          ),
      );

      const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

      expect(error.code).toBe(testCase.code);
      expect(error.status).toBe(testCase.status);
      expect(error.diagnostic.failureCategory).toBe(testCase.category);
      // The status survives into the diagnostic: this is the field that tells a
      // 400 apart from a 502 that never got an answer.
      expect(error.diagnostic.providerHttpStatus).toBe(testCase.status);
      expect(error.diagnostic.operationName).toBe("GET");
      expect(typeof error.diagnostic.elapsedMs).toBe("number");
      expect(error.diagnostic.timeoutMs).toBe(DEFAULT_MERCADOPAGO_TIMEOUT_MS);
    });
  }

  it("keeps the safe provider code and message from a JSON error body", async () => {
    stubFetch(async () => mercadoPagoErrorBody());

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.diagnostic.providerErrorType).toBe("bad_request");
    // A numeric cause code is kept: it is the value that names the objection.
    expect(error.diagnostic.providerErrorCode).toBe("1234");
    expect(error.diagnostic.providerCauseCodes).toEqual(["1234"]);
    expect(error.diagnostic.providerMessage).toBe("Invalid preapproval_plan_id");
    expect(error.diagnostic.providerCauseDescriptions).toEqual([
      "preapproval_plan_id does not exist",
    ]);
    // The diagnostic reason is readable; the human sentence is unchanged.
    expect(error.message).toBe("Mercado Pago responded with HTTP 400.");
  });

  it("captures a string cause code too, and caps how many it keeps", async () => {
    stubFetch(async () =>
      jsonResponse(
        {
          error: "bad_request",
          cause: Array.from({ length: 9 }, (_, i) => ({ code: `code_${i}` })),
        },
        422,
      ),
    );

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.diagnostic.providerCauseCodes).toHaveLength(5);
    expect(error.diagnostic.providerErrorCode).toBe("code_0");
  });

  it("keeps the provider request id, and drops one that is not identifier-shaped", async () => {
    stubFetch(
      async () =>
        new Response("{}", {
          status: 500,
          headers: { "x-request-id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        }),
    );
    const withId = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));
    expect(withId.diagnostic.providerRequestId).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

    stubFetch(
      async () =>
        new Response("{}", { status: 500, headers: { "x-request-id": "not a request id" } }),
    );
    const withJunk = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));
    expect(withJunk.diagnostic.providerRequestId).toBeNull();
  });

  it("classifies a timeout as PROVIDER_TIMEOUT with no HTTP status and the real elapsed time", async () => {
    const fetchMock = stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const aborted = new Error("aborted");
            aborted.name = "AbortError";
            reject(aborted);
          });
        }),
    );

    const error = await captureError(() =>
      createMercadoPagoClient(config({ timeoutMs: 5 })).getJson("/preapproval/PRE1"),
    );

    expect(error.code).toBe("TIMEOUT");
    expect(error.diagnostic.failureCategory).toBe("PROVIDER_TIMEOUT");
    expect(error.diagnostic.timeoutMs).toBe(5);
    // No answer ever arrived — and that absence is the whole signal.
    expect(error.diagnostic.providerHttpStatus).toBeNull();
    expect(error.diagnostic.providerErrorType).toBeNull();
    expect(error.diagnostic.providerMessage).toBeNull();
    expect(error.diagnostic.operationName).toBe("GET");
    expect(typeof error.diagnostic.elapsedMs).toBe("number");
    // One attempt, one request: the diagnostic never becomes a retry.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("classifies a transport failure as PROVIDER_NETWORK_ERROR, sending exactly one request", async () => {
    const fetchMock = stubFetch(async () => {
      throw new Error("socket closed");
    });

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.diagnostic.failureCategory).toBe("PROVIDER_NETWORK_ERROR");
    expect(error.diagnostic.providerHttpStatus).toBeNull();
    expect(typeof error.diagnostic.elapsedMs).toBe("number");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("classifies a non-JSON 2xx as PROVIDER_INVALID_RESPONSE, keeping the status it did get", async () => {
    stubFetch(async () => new Response("<html>gateway</html>", { status: 200 }));

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.code).toBe("INVALID_JSON");
    expect(error.diagnostic.failureCategory).toBe("PROVIDER_INVALID_RESPONSE");
    expect(error.diagnostic.providerHttpStatus).toBe(200);
    expect(error.diagnostic.operationName).toBe("GET");
  });

  it("classifies an empty 2xx body as PROVIDER_INVALID_RESPONSE", async () => {
    stubFetch(async () => new Response("", { status: 200 }));

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    expect(error.code).toBe("INVALID_JSON");
    expect(error.diagnostic.failureCategory).toBe("PROVIDER_INVALID_RESPONSE");
    expect(error.diagnostic.providerHttpStatus).toBe(200);
    expect(error.diagnostic.providerMessage).toBeNull();
  });

  it("classifies a locally-refused request as PROVIDER_UNKNOWN_ERROR with no observation", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));

    const error = await captureError(() =>
      createMercadoPagoClient(config({ accessToken: "" })).getJson("/x"),
    );

    expect(error.code).toBe("MISSING_ACCESS_TOKEN");
    expect(error.diagnostic.failureCategory).toBe("PROVIDER_UNKNOWN_ERROR");
    // Nothing was sent, so nothing was observed: no elapsed time to report.
    expect(error.diagnostic.elapsedMs).toBeNull();
    expect(error.diagnostic.providerHttpStatus).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("the success path is untouched and gains no diagnostic", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ id: "PRE1", status: "pending" }));

    const result = await createMercadoPagoClient(config()).postJson("/preapproval", {
      preapproval_plan_id: "PLAN1",
    });

    expect(result).toEqual({ id: "PRE1", status: "pending" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("MP-M3D.4 · client · the sanitizer is the only door", () => {
  it("redacts an email address the provider echoed back", () => {
    expect(sanitizeProviderText("payer payer@example.com is invalid")).toBe(
      "payer [redacted-email] is invalid",
    );
  });

  it("redacts identifier runs but keeps the diagnostic words readable", () => {
    // A plan id is 32 characters of identifier — redacted.
    expect(sanitizeProviderText("plan 0123456789abcdef0123456789abcdef not found")).toBe(
      "plan [redacted-id] not found",
    );
    // The field NAMES an operator needs are shorter than the redaction window,
    // so the reason survives even though the value it points at does not.
    expect(sanitizeProviderText("card_token_id is required")).toBe("card_token_id is required");
    expect(sanitizeProviderText("preapproval_plan_id is missing")).toBe(
      "preapproval_plan_id is missing",
    );
  });

  it("drops a credential that is SHORT of the identifier window", () => {
    // The length rule alone is not enough: `abc123` is six characters, so a
    // provider echoing a header would have kept the whole credential. The auth
    // scheme is the anchor instead, and everything after it goes.
    expect(sanitizeProviderText("Bearer abc123 was rejected")).toBe(
      "[redacted-auth] was rejected",
    );
    expect(sanitizeProviderText("authorization: bearer short-token")).toBe(
      "authorization: [redacted-auth]",
    );
    expect(sanitizeProviderText("Basic dXNlcjpwYXNz")).toBe("[redacted-auth]");
  });

  it("cannot be made to forge a second log line", () => {
    const forged = sanitizeProviderText("first line\nERROR fake second line\r\nthird");
    expect(forged).toBe("first line");
    expect(forged).not.toContain("\n");
  });

  it("caps the length so no field can grow without bound", () => {
    const long = sanitizeProviderText("a".repeat(4000));
    expect(long).not.toBeNull();
    expect((long ?? "").length).toBeLessThanOrEqual(301);
  });

  it("records absence as absence, never as a stringified stub", () => {
    expect(sanitizeProviderText(undefined)).toBeNull();
    expect(sanitizeProviderText(null)).toBeNull();
    expect(sanitizeProviderText(42)).toBeNull();
    expect(sanitizeProviderText({ a: 1 })).toBeNull();
    expect(sanitizeProviderText("   ")).toBeNull();
  });
});

describe("MP-M3D.4 · client · the diagnostic never becomes a leak", () => {
  it("redacts a token and a payer email that the provider echoed in its error body", async () => {
    stubFetch(async () =>
      jsonResponse(
        {
          message: `request for payer@example.com rejected`,
          error: "bad_request",
          cause: [
            { code: "1234", description: `Authorization Bearer ${TOKEN} is not valid` },
          ],
        },
        400,
      ),
    );

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    // Serialized WHOLE — every enumerable field, not just `message`.
    const serialized = JSON.stringify({ ...error, message: error.message });
    expect(serialized).not.toContain(TOKEN);
    expect(serialized).not.toContain("payer@example.com");
    expect(serialized).not.toContain(TOKEN.slice(0, 24));

    // And the reason is still legible, which is the point of keeping it.
    expect(error.diagnostic.providerMessage).toContain("[redacted-email]");
    // The auth scheme is the anchor, so the whole credential goes with it —
    // including a credential short enough to slip past the length rule.
    expect(error.diagnostic.providerCauseDescriptions[0]).toBe(
      "Authorization [redacted-auth] is not valid",
    );
  });

  it("never reads a field outside the allowlist, whatever the provider sends", async () => {
    stubFetch(async () =>
      jsonResponse(
        {
          message: "rejected",
          payer_email: "payer@example.com",
          card_token_id: "CARD_TOKEN_should_never_be_kept",
          authorization: `Bearer ${TOKEN}`,
          detail: "PROVIDER_BODY_MARKER_must_not_surface",
        },
        422,
      ),
    );

    const error = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));
    const serialized = JSON.stringify({ ...error, message: error.message });

    for (const secret of [
      "payer@example.com",
      "CARD_TOKEN_should_never_be_kept",
      TOKEN,
      "PROVIDER_BODY_MARKER_must_not_surface",
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("maps every closed error code to a category, so a category is always present", () => {
    const expected: Record<string, string> = {
      MISSING_ACCESS_TOKEN: "PROVIDER_UNKNOWN_ERROR",
      INVALID_REQUEST: "PROVIDER_UNKNOWN_ERROR",
      WRONG_PROVIDER: "PROVIDER_UNKNOWN_ERROR",
      UNSUPPORTED_RESOURCE_TYPE: "PROVIDER_UNKNOWN_ERROR",
      UNLINKED_PAYMENT: "PROVIDER_UNKNOWN_ERROR",
      UNAUTHORIZED: "PROVIDER_HTTP_ERROR",
      NOT_FOUND: "PROVIDER_HTTP_ERROR",
      HTTP_ERROR: "PROVIDER_HTTP_ERROR",
      TIMEOUT: "PROVIDER_TIMEOUT",
      NETWORK_ERROR: "PROVIDER_NETWORK_ERROR",
      INVALID_JSON: "PROVIDER_INVALID_RESPONSE",
    };

    for (const [code, category] of Object.entries(expected)) {
      expect(failureCategoryForCode(code as never)).toBe(category);
    }
  });

  it("only a real attempt counts as a provider observation", async () => {
    // Locally refused: nothing left the process, so there is no observation to
    // report — this is what keeps a local refusal from wearing a provider's face.
    const refused = await captureError(() =>
      createMercadoPagoClient(config({ accessToken: "" })).getJson("/x"),
    );
    expect(hasProviderObservation(refused.diagnostic)).toBe(false);

    // A hand-built error is nobody's observation either.
    expect(hasProviderObservation(new MercadoPagoError("TIMEOUT", "x").diagnostic)).toBe(false);

    stubFetch(async () => new Response("{}", { status: 500 }));
    const observed = await captureError(() => createMercadoPagoClient(config()).getJson("/x"));
    expect(hasProviderObservation(observed.diagnostic)).toBe(true);
  });

  it("still writes nothing to the console, on any of the new paths", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );

    stubFetch(async () => mercadoPagoErrorBody());
    await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    stubFetch(async () => new Response("", { status: 200 }));
    await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    stubFetch(async () => {
      throw new Error("socket closed");
    });
    await captureError(() => createMercadoPagoClient(config()).getJson("/x"));

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
