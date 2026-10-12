import { describe, expect, it, vi } from "vitest";
import {
  buildStartProRequestBody,
  CLIENT_CARD_TOKEN_MAX_LENGTH,
  isUsableCardToken,
  START_PRO_PATH,
  startProWithCardToken,
  type StartProResult,
} from "../start-pro-client";

/**
 * MP-M3D.7 · the client half of the `card_token_id` handoff.
 *
 * Two properties matter more than the rest and are asserted on EVERY path below,
 * not just the happy one:
 *
 *   1. exactly one field crosses — `card_token_id` — and no code path can add a
 *      second;
 *   2. the token appears in the outgoing body and NOWHERE ELSE — not in a result,
 *      not in a console line, not in a thrown error.
 *
 * (2) is why the leak assertions run inside the same loop as the outcome
 * assertions rather than in a separate test: a leak on the `PROVIDER_ERROR` path
 * is exactly as bad as one on the success path, and a test that only checked the
 * happy path would miss the path where a helpful `console.error(error)` lands.
 */

const TOKEN = "fixture_card_token_mp_m3d7_not_a_real_token";
const CHECKOUT_URL = "https://www.mercadopago.cl/subscriptions/checkout?preapproval_id=SUB1";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * The first recorded fetch call, or a loud failure.
 *
 * `noUncheckedIndexedAccess` types the indexed read as possibly absent; throwing
 * on absence keeps the assertion honest instead of asserting against `undefined`.
 */
function firstCall(mock: { mock: { calls: Array<[string, RequestInit]> } }): [string, RequestInit] {
  const call = mock.mock.calls[0];
  if (call === undefined) throw new Error("fetch was never called");
  return call;
}

/** Captures every console method, so "it did not log" is asserted, not assumed. */
function captureConsole(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const spies = (["log", "info", "warn", "error", "debug", "trace"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(" "));
    }),
  );
  return { lines, restore: () => spies.forEach((spy) => spy.mockRestore()) };
}

describe("MP-M3D.7 · start-pro client · the body is one field", () => {
  it("targets the documented path, same-origin", () => {
    expect(START_PRO_PATH).toBe("/api/billing/mercadopago/start-pro");
    // Relative on purpose: an absolute URL from configuration would add a second,
    // redirectable destination for a payment request.
    expect(START_PRO_PATH.startsWith("/")).toBe(true);
  });

  it("builds a body with exactly one key", () => {
    expect(buildStartProRequestBody(TOKEN)).toEqual({ card_token_id: TOKEN });
    expect(Object.keys(buildStartProRequestBody(TOKEN))).toEqual(["card_token_id"]);
    expect(JSON.stringify(buildStartProRequestBody(TOKEN))).not.toContain("user");
    expect(JSON.stringify(buildStartProRequestBody(TOKEN))).not.toContain("plan");
  });

  it("trims the token it was handed", () => {
    expect(buildStartProRequestBody(`  ${TOKEN}  `)).toEqual({ card_token_id: TOKEN });
  });

  it("admits only a non-empty string within the server's bound", () => {
    expect(isUsableCardToken(TOKEN)).toBe(true);
    expect(isUsableCardToken(`  ${TOKEN}  `)).toBe(true);
    expect(isUsableCardToken("x".repeat(CLIENT_CARD_TOKEN_MAX_LENGTH))).toBe(true);

    for (const bad of [
      "",
      "   ",
      "x".repeat(CLIENT_CARD_TOKEN_MAX_LENGTH + 1),
      42,
      null,
      undefined,
      true,
      {},
      [],
    ]) {
      expect(isUsableCardToken(bad), String(bad)).toBe(false);
    }
  });
});

describe("MP-M3D.7 · start-pro client · the request that leaves", () => {
  it("POSTs JSON, same-origin, exactly once", async () => {
    const fetchImpl = vi.fn(
      async (_url: string, _init: RequestInit) =>
        jsonResponse({ status: "READY", providerSubscriptionStatus: "authorized", checkoutUrl: CHECKOUT_URL }),
    );

    await startProWithCardToken({ cardTokenId: TOKEN, fetchImpl: fetchImpl as unknown as typeof fetch });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = firstCall(fetchImpl);
    expect(url).toBe(START_PRO_PATH);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ card_token_id: TOKEN }));
    // The session cookie is what proves identity; without it the server answers
    // 401 and nothing is attempted at the provider.
    expect(init.credentials).toBe("same-origin");
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({ card_token_id: TOKEN });
  });

  it("forwards an abort signal when given one", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      return jsonResponse({ status: "READY", providerSubscriptionStatus: null, checkoutUrl: null });
    });

    await startProWithCardToken({
      cardTokenId: TOKEN,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      signal: controller.signal,
    });
  });

  it("spends nothing and reaches nobody when the token is unusable", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: "READY" }));

    for (const cardTokenId of ["", "   ", "x".repeat(CLIENT_CARD_TOKEN_MAX_LENGTH + 1), 42]) {
      const result = await startProWithCardToken({
        cardTokenId: cardTokenId as unknown as string,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(result).toEqual({ status: "INVALID_REQUEST" });
    }

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("MP-M3D.7 · start-pro client · every outcome is a word, and none leaks the token", () => {
  const OUTCOMES: Array<{
    what: string;
    respond: () => Response | Promise<Response>;
    expected: StartProResult;
  }> = [
    {
      what: "READY",
      respond: () =>
        jsonResponse({ status: "READY", providerSubscriptionStatus: "authorized", checkoutUrl: CHECKOUT_URL }),
      expected: { status: "READY", providerSubscriptionStatus: "authorized", checkoutUrl: CHECKOUT_URL },
    },
    {
      what: "READY with no checkout URL",
      respond: () => jsonResponse({ status: "READY", providerSubscriptionStatus: "authorized" }),
      expected: { status: "READY", providerSubscriptionStatus: "authorized", checkoutUrl: null },
    },
    {
      what: "READY with a non-https checkout URL",
      respond: () =>
        jsonResponse({ status: "READY", providerSubscriptionStatus: "authorized", checkoutUrl: "javascript:alert(1)" }),
      expected: { status: "READY", providerSubscriptionStatus: "authorized", checkoutUrl: null },
    },
    {
      what: "READY with a non-string status",
      respond: () => jsonResponse({ status: "READY", providerSubscriptionStatus: 42 }),
      expected: { status: "READY", providerSubscriptionStatus: null, checkoutUrl: null },
    },
    { what: "INVALID_REQUEST", respond: () => jsonResponse({ status: "INVALID_REQUEST" }, 400), expected: { status: "INVALID_REQUEST" } },
    { what: "UNCONFIGURED", respond: () => jsonResponse({ status: "UNCONFIGURED" }, 500), expected: { status: "UNCONFIGURED" } },
    { what: "PAYER_EMAIL_REQUIRED", respond: () => jsonResponse({ status: "PAYER_EMAIL_REQUIRED" }, 422), expected: { status: "PAYER_EMAIL_REQUIRED" } },
    { what: "ALREADY_IN_PROGRESS", respond: () => jsonResponse({ status: "ALREADY_IN_PROGRESS" }, 409), expected: { status: "ALREADY_IN_PROGRESS" } },
    { what: "PROVIDER_ERROR", respond: () => jsonResponse({ status: "PROVIDER_ERROR" }, 502), expected: { status: "PROVIDER_ERROR" } },
    {
      what: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
      respond: () => jsonResponse({ status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED" }, 500),
      expected: { status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED" },
    },
    { what: "UNAUTHENTICATED", respond: () => jsonResponse({ status: "UNAUTHENTICATED" }, 401), expected: { status: "UNAUTHENTICATED" } },
    { what: "METHOD_NOT_ALLOWED", respond: () => jsonResponse({ status: "METHOD_NOT_ALLOWED" }, 405), expected: { status: "METHOD_NOT_ALLOWED" } },
    { what: "INTERNAL_ERROR", respond: () => jsonResponse({ status: "INTERNAL_ERROR" }, 500), expected: { status: "INTERNAL_ERROR" } },
    { what: "a network failure", respond: () => Promise.reject(new Error(`socket closed ${TOKEN}`)), expected: { status: "NETWORK_ERROR" } },
    { what: "a body that is not JSON", respond: () => new Response("<html>502</html>", { status: 502 }), expected: { status: "UNEXPECTED_RESPONSE" } },
    { what: "a JSON array", respond: () => jsonResponse([{ status: "READY" }]), expected: { status: "UNEXPECTED_RESPONSE" } },
    { what: "a JSON scalar", respond: () => jsonResponse("READY"), expected: { status: "UNEXPECTED_RESPONSE" } },
    { what: "an empty object", respond: () => jsonResponse({}), expected: { status: "UNEXPECTED_RESPONSE" } },
    { what: "a status this client does not know", respond: () => jsonResponse({ status: "PROBABLY_FINE" }), expected: { status: "UNEXPECTED_RESPONSE" } },
    { what: "a non-string status", respond: () => jsonResponse({ status: 200 }), expected: { status: "UNEXPECTED_RESPONSE" } },
  ];

  it.each(OUTCOMES.map((o) => ({ ...o, key: o.what })))(
    "maps $what without leaking the token or logging",
    async ({ respond, expected }) => {
      const capture = captureConsole();
      try {
        const fetchImpl = vi.fn(async () => respond());
        const result = await startProWithCardToken({
          cardTokenId: TOKEN,
          fetchImpl: fetchImpl as unknown as typeof fetch,
        });

        expect(result).toEqual(expected);
        // The token is nowhere in the answer...
        expect(JSON.stringify(result)).not.toContain(TOKEN);
        expect(Object.values(result)).not.toContain(TOKEN);
        // ...and nowhere in any console sink, on any of these paths.
        expect(capture.lines.join("\n")).not.toContain(TOKEN);
        expect(capture.lines.join("\n")).not.toContain("fixture_card_token");
      } finally {
        capture.restore();
      }
    },
  );

  it("treats every non-2xx as the word the server sent, never as an exception", async () => {
    for (const status of [400, 401, 403, 405, 409, 422, 500, 502, 503]) {
      const fetchImpl = vi.fn(async () => jsonResponse({ status: "INTERNAL_ERROR" }, status));
      const result = await startProWithCardToken({
        cardTokenId: TOKEN,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(result).toEqual({ status: "INTERNAL_ERROR" });
    }
  });

  it("never throws, whatever the transport does", async () => {
    const hostile = [
      async () => {
        throw new Error("boom");
      },
      async () => {
        throw TOKEN;
      },
      async () => ({ json: async () => undefined }) as unknown as Response,
      async () => ({}) as unknown as Response,
      async () => null as unknown as Response,
    ];

    for (const impl of hostile) {
      const result = await startProWithCardToken({
        cardTokenId: TOKEN,
        fetchImpl: impl as unknown as typeof fetch,
      });
      expect(typeof result.status).toBe("string");
      expect(JSON.stringify(result)).not.toContain(TOKEN);
    }
  });
});
