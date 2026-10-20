/**
 * CA-1 — adapter tests. MOCK PROVIDER ONLY: no network, no key, no paid call.
 * Every case below is one the CA spec requires explicitly.
 */
import { describe, expect, it, vi } from "vitest";

import {
  ADVISOR_DEFAULTS,
  ADVISOR_LIMITS,
  AdvisorProviderError,
  completeAdvisorChat,
  parseIntentJson,
  readAdvisorProviderConfig,
  type AdvisorProviderConfig,
  type AdvisorRequest,
} from "../provider.server";

const CONFIG: AdvisorProviderConfig = {
  apiKey: "sk-test-DO-NOT-LEAK-0123456789",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-flash",
  timeoutMs: 50,
  maxOutputTokens: 200,
  maxRetries: 0,
  retryBaseDelayMs: 1,
};

const REQUEST: AdvisorRequest = {
  mode: "advisor",
  systemPrompt: "Eres el asesor comercial de CRIPQER.",
  messages: [{ role: "user", content: "¿Qué es CRIPQER?" }],
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const okBody = {
  choices: [
    { message: { content: "CRIPQER te da una tarjeta digital con QR. ¿Quieres crear una?" } },
  ],
  usage: { prompt_tokens: 120, completion_tokens: 45 },
};

const noSleep = async () => {};

describe("readAdvisorProviderConfig", () => {
  it("returns null when no key is present (advisor fails closed, never guesses)", () => {
    expect(readAdvisorProviderConfig({})).toBeNull();
    expect(readAdvisorProviderConfig({ DEEPSEEK_API_KEY: "   " })).toBeNull();
  });

  it("applies defaults and refuses a non-https base URL", () => {
    const config = readAdvisorProviderConfig({ DEEPSEEK_API_KEY: "k" });
    expect(config?.baseUrl).toBe(ADVISOR_DEFAULTS.baseUrl);
    expect(config?.model).toBe(ADVISOR_DEFAULTS.model);
    expect(() =>
      readAdvisorProviderConfig({ DEEPSEEK_API_KEY: "k", DEEPSEEK_BASE_URL: "http://x.test" }),
    ).toThrowError(AdvisorProviderError);
  });

  it("clamps numeric knobs instead of trusting them", () => {
    const config = readAdvisorProviderConfig({
      DEEPSEEK_API_KEY: "k",
      ADVISOR_TIMEOUT_MS: "999999",
      ADVISOR_MAX_RETRIES: "99",
    });
    expect(config?.timeoutMs).toBe(120_000);
    expect(config?.maxRetries).toBe(3);
  });
});

describe("completeAdvisorChat — happy path", () => {
  it("returns text, model, attempts and token accounting", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(okBody)) as unknown as typeof fetch;
    const result = await completeAdvisorChat(REQUEST, CONFIG, { fetchImpl, sleep: noSleep });

    expect(result.text).toContain("tarjeta digital");
    expect(result.model).toBe("deepseek-flash");
    expect(result.attempts).toBe(1);
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 45 });
    expect(result.parsed).toBeNull(); // advisor mode does not parse JSON
  });

  it("sends the key only in the Authorization header and never in the body", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(okBody));
    await completeAdvisorChat(REQUEST, CONFIG, { fetchImpl: fetchImpl as never, sleep: noSleep });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["authorization"]).toBe(
      `Bearer ${CONFIG.apiKey}`,
    );
    expect(String(init.body)).not.toContain(CONFIG.apiKey);
  });
});

describe("completeAdvisorChat — permanent failures are never retried", () => {
  it("401 → UNAUTHORIZED, one attempt", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "invalid api key" }, 401));
    await expect(
      completeAdvisorChat(REQUEST, CONFIG, { fetchImpl: fetchImpl as never, sleep: noSleep }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", retryable: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("402/403 → PAYMENT_REQUIRED, one attempt", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 402));
    await expect(
      completeAdvisorChat(REQUEST, CONFIG, { fetchImpl: fetchImpl as never, sleep: noSleep }),
    ).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("never leaks the key or the provider payload into the error", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ echo: CONFIG.apiKey }, 403));
    const error = await completeAdvisorChat(REQUEST, CONFIG, {
      fetchImpl: fetchImpl as never,
      sleep: noSleep,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdvisorProviderError);
    if (!(error instanceof AdvisorProviderError)) throw new Error("expected AdvisorProviderError");
    expect(JSON.stringify({ m: error.message, d: error.detail, s: error.status })).not.toContain(
      CONFIG.apiKey,
    );
  });
});

describe("completeAdvisorChat — retryable failures respect the budget", () => {
  it("429 → retried up to maxRetries, then RATE_LIMITED", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 429));
    const sleep = vi.fn(noSleep);
    const config = { ...CONFIG, maxRetries: 2 };
    await expect(
      completeAdvisorChat(REQUEST, config, { fetchImpl: fetchImpl as never, sleep }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", retryable: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3); // 1 + 2 retries
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("recovers when a retry succeeds", async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () =>
      ++call === 1 ? jsonResponse({}, 503) : jsonResponse(okBody),
    );
    const result = await completeAdvisorChat(
      REQUEST,
      { ...CONFIG, maxRetries: 1 },
      {
        fetchImpl: fetchImpl as never,
        sleep: noSleep,
      },
    );
    expect(result.attempts).toBe(2);
    expect(result.text).toContain("CRIPQER");
  });
});

describe("completeAdvisorChat — transport failures", () => {
  it("timeout → TIMEOUT (the sentinel is not a caller abort)", async () => {
    const hanging = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject((init.signal as AbortSignal).reason));
      })) as unknown as typeof fetch;
    await expect(
      completeAdvisorChat(
        REQUEST,
        { ...CONFIG, timeoutMs: 10 },
        { fetchImpl: hanging, sleep: noSleep },
      ),
    ).rejects.toMatchObject({ code: "TIMEOUT", retryable: true });
  });

  it("AbortError → ABORTED, not retried", async () => {
    const aborted = (() =>
      Promise.reject(
        Object.assign(new Error("aborted"), { name: "AbortError" }),
      )) as unknown as typeof fetch;
    await expect(
      completeAdvisorChat(REQUEST, CONFIG, { fetchImpl: aborted, sleep: noSleep }),
    ).rejects.toMatchObject({ code: "ABORTED", retryable: false });
  });

  it("network failure → NETWORK", async () => {
    const failing = (() =>
      Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch;
    await expect(
      completeAdvisorChat(REQUEST, CONFIG, { fetchImpl: failing, sleep: noSleep }),
    ).rejects.toMatchObject({ code: "NETWORK" });
  });
});

describe("completeAdvisorChat — malformed bodies", () => {
  it("body that is not JSON → INVALID_RESPONSE", async () => {
    const fetchImpl = (async () =>
      new Response("<html>502</html>", { status: 200 })) as unknown as typeof fetch;
    await expect(
      completeAdvisorChat(REQUEST, CONFIG, { fetchImpl, sleep: noSleep }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE", detail: "body is not JSON" });
  });

  it("truncated payload (no choices) → INVALID_RESPONSE", async () => {
    const fetchImpl = (async () => jsonResponse({ id: "x" })) as unknown as typeof fetch;
    await expect(
      completeAdvisorChat(REQUEST, CONFIG, { fetchImpl, sleep: noSleep }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("empty completion → INVALID_RESPONSE", async () => {
    const fetchImpl = (async () =>
      jsonResponse({ choices: [{ message: { content: "   " } }] })) as unknown as typeof fetch;
    await expect(
      completeAdvisorChat(REQUEST, CONFIG, { fetchImpl, sleep: noSleep }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE", detail: "empty completion" });
  });
});

describe("completeAdvisorChat — input limits are enforced before any call", () => {
  it("rejects too many messages and over-long content without calling the provider", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(okBody));
    const many = {
      ...REQUEST,
      messages: Array.from({ length: ADVISOR_LIMITS.maxMessages + 1 }, () => REQUEST.messages[0]!),
    };
    await expect(
      completeAdvisorChat(many, CONFIG, { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });

    const long = {
      ...REQUEST,
      messages: [
        { role: "user" as const, content: "x".repeat(ADVISOR_LIMITS.maxMessageChars + 1) },
      ],
    };
    await expect(
      completeAdvisorChat(long, CONFIG, { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("intent_classifier mode — valid JSON is not a valid answer", () => {
  const intentRequest: AdvisorRequest = { ...REQUEST, mode: "intent_classifier" };

  const withContent = (content: string) =>
    (async () =>
      jsonResponse({ choices: [{ message: { content } }], usage: {} })) as unknown as typeof fetch;

  it("returns the validated payload for a well-formed answer", async () => {
    const payload = {
      intents: ["BUSINESS_NEED", "PRICING"],
      purchase_readiness: "CONSIDERING",
      confidence: 0.72,
      unknown_fields: ["business_type"],
    };
    const result = await completeAdvisorChat(intentRequest, CONFIG, {
      fetchImpl: withContent(JSON.stringify(payload)),
      sleep: noSleep,
    });
    expect(result.parsed).toEqual(payload);
  });

  /** The safe diagnostic is `code` + `detail`; `message` stays generic on purpose. */
  const expectSchemaFailure = (run: () => unknown, detailPattern: RegExp) => {
    let error: unknown = null;
    try {
      run();
    } catch (thrown) {
      error = thrown;
    }
    expect(error).toBeInstanceOf(AdvisorProviderError);
    const typed = error as AdvisorProviderError;
    expect(typed.code).toBe("SCHEMA_INVALID");
    expect(String(typed.detail)).toMatch(detailPattern);
  };

  it("rejects an unknown intent id, an extra key, a bad enum and a bad confidence", () => {
    expectSchemaFailure(
      () =>
        parseIntentJson(
          JSON.stringify({
            intents: ["SELL_HARD"],
            purchase_readiness: "WARM",
            confidence: 0.5,
            unknown_fields: [],
          }),
        ),
      /allowed id/,
    );
    expectSchemaFailure(
      () =>
        parseIntentJson(
          JSON.stringify({
            intents: ["DISCOVERY"],
            purchase_readiness: "WARM",
            confidence: 0.5,
            unknown_fields: [],
            injected: "tool",
          }),
        ),
      /unexpected key: injected/,
    );
    expectSchemaFailure(
      () =>
        parseIntentJson(
          JSON.stringify({
            intents: ["DISCOVERY"],
            purchase_readiness: "HOT",
            confidence: 0.5,
            unknown_fields: [],
          }),
        ),
      /purchase_readiness/,
    );
    expectSchemaFailure(
      () =>
        parseIntentJson(
          JSON.stringify({
            intents: ["DISCOVERY"],
            purchase_readiness: "UNKNOWN",
            confidence: 42,
            unknown_fields: [],
          }),
        ),
      /confidence/,
    );
    expectSchemaFailure(() => parseIntentJson("no soy json"), /not valid JSON/);
  });

  it("a completion that is not JSON fails as SCHEMA_INVALID, not as an answer", async () => {
    await expect(
      completeAdvisorChat(intentRequest, CONFIG, {
        fetchImpl: withContent("Claro, con gusto te ayudo."),
        sleep: noSleep,
      }),
    ).rejects.toMatchObject({ code: "SCHEMA_INVALID" });
  });

  it("asks the provider for JSON output in classifier mode only", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(okBody));
    await completeAdvisorChat({ ...intentRequest, messages: REQUEST.messages }, CONFIG, {
      fetchImpl: fetchImpl as never,
      sleep: noSleep,
    }).catch(() => undefined);
    const body = JSON.parse(String((fetchImpl.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.temperature).toBe(0);
  });
});
