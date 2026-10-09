import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMercadoPagoClient,
  DEFAULT_MERCADOPAGO_TIMEOUT_MS,
  MERCADOPAGO_API_BASE_URL,
  MERCADOPAGO_ENV_KEYS,
  MercadoPagoError,
  readMercadoPagoConfigFromEnv,
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
