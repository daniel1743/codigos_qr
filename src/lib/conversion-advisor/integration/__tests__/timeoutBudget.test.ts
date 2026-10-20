/**
 * CONV-02 · the timeout layering, as arithmetic rather than hope.
 *
 * Three numbers have to be mutually consistent or the landing abandons turns the
 * server is still paying for:
 *
 *   provider per-attempt  12 000 ms  (`ADVISOR_TIMEOUT_MS`)
 *   attempts per operation 2         (1 + `ADVISOR_MAX_RETRIES`)
 *   operations per turn    2         (understanding + advice)
 *   browser deadline      60 000 ms  (`ADVISOR_BROWSER_DEADLINE_MS`)
 *
 * 2 × 2 × 12 000 + two 400 ms backoffs = 48 800 ms, leaving ~11 s of margin.
 * The retired 20 000 ms per attempt made the worst case 80 800 ms, which the
 * 30 s landing transport could never accommodate.
 */
import { describe, expect, it, vi } from "vitest";

import { ADVISOR_DEFAULTS, readAdvisorProviderConfig } from "../../provider.server";
import {
  ADVISOR_BROWSER_DEADLINE_MS,
  CONVERSION_ADVISOR_PROVIDER_ID,
} from "../../../../features/approved-chat-landing/assistant/advisors/contract";
import { createConversionAdvisorClient } from "../../../../features/approved-chat-landing/assistant/advisors/transport";

const KEY = "sk-test-NEVER-PRINTED";
const SESSION = "3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b";

const LANDING = {
  businessType: null,
  goal: null,
  channel: null,
  selectedTemplateId: null,
  lastShownTemplateIds: [],
  readyForPage: false,
  expectedSlot: "type" as const,
};

const success = {
  ok: true as const,
  data: {
    session_id: SESSION,
    model: "deepseek-flash",
    reply: "Te cuento lo que está verificado, sin inventar nada.",
    detected_intents: ["DISCOVERY"],
    relevant_capability_ids: [],
    suggested_action: "EXPLAIN",
    limitations: [],
    grounding_status: "GROUNDED",
    degraded: false,
    turns_used: 1,
    turns_remaining: 49,
  },
};

const failure = { ok: false as const, code: "UNAVAILABLE" as const, message: "" };

describe("CONV-02 · provider budget per attempt", () => {
  it("defaults to 12 s per attempt and one retry", () => {
    expect(ADVISOR_DEFAULTS.timeoutMs).toBe(12_000);
    expect(ADVISOR_DEFAULTS.maxRetries).toBe(1);
    const config = readAdvisorProviderConfig({ DEEPSEEK_API_KEY: KEY });
    expect(config?.timeoutMs).toBe(12_000);
    expect(config?.maxRetries).toBe(1);
  });

  it("keeps a caller-supplied timeout inside a sane ceiling", () => {
    const config = readAdvisorProviderConfig({
      DEEPSEEK_API_KEY: KEY,
      ADVISOR_TIMEOUT_MS: "999999",
    });
    expect(config?.timeoutMs).toBe(120_000);
  });

  it("worst case fits the browser deadline, and the previous value did not", () => {
    const attempts = 1 + ADVISOR_DEFAULTS.maxRetries;
    const operations = 2;
    const backoff = ADVISOR_DEFAULTS.retryBaseDelayMs * operations;
    const worstCase = operations * attempts * ADVISOR_DEFAULTS.timeoutMs + backoff;

    expect(worstCase).toBe(48_800);
    expect(worstCase).toBeLessThan(ADVISOR_BROWSER_DEADLINE_MS);
    expect(ADVISOR_BROWSER_DEADLINE_MS).toBe(60_000);

    const retired = operations * attempts * 20_000 + backoff;
    expect(retired).toBe(80_800);
    expect(retired).toBeGreaterThan(ADVISOR_BROWSER_DEADLINE_MS);
  });

  it("names the provider consistently", () => {
    expect(CONVERSION_ADVISOR_PROVIDER_ID).toBe("conversion-advisor");
  });
});

describe("CONV-02 · the browser transport is bounded and does not retry", () => {
  it("rejects a turn that never settles instead of spinning forever", async () => {
    const askTurn = vi.fn(() => new Promise<unknown>(() => {}));
    const client = createConversionAdvisorClient(
      { startSession: async () => ({ session_id: SESSION }), askTurn },
      { timeoutMs: 25 },
    );

    await expect(client.ask({ message: "Hola", landingContext: LANDING })).rejects.toThrow(
      /timed out/,
    );
  });

  it("returns quickly when the turn answers", async () => {
    const client = createConversionAdvisorClient(
      { startSession: async () => ({ session_id: SESSION }), askTurn: async () => success },
      { timeoutMs: 1_000 },
    );

    const result = await client.ask({ message: "Hola", landingContext: LANDING });
    expect(result.ok).toBe(true);
  });

  it("asks exactly once per turn, including when the turn fails", async () => {
    const askTurn = vi.fn(async () => failure);
    const client = createConversionAdvisorClient(
      { startSession: async () => ({ session_id: SESSION }), askTurn },
      { timeoutMs: 1_000 },
    );

    const first = await client.ask({ message: "Hola", landingContext: LANDING });
    const second = await client.ask({ message: "Otra vez", landingContext: LANDING });

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    expect(askTurn).toHaveBeenCalledTimes(2);
  });

  it("opens ONE conversation for concurrent first turns", async () => {
    const startSession = vi.fn(async () => ({ session_id: SESSION }));
    const client = createConversionAdvisorClient(
      { startSession, askTurn: async () => success },
      { timeoutMs: 1_000 },
    );

    await Promise.all([
      client.ask({ message: "Uno", landingContext: LANDING }),
      client.ask({ message: "Dos", landingContext: LANDING }),
    ]);

    expect(startSession).toHaveBeenCalledTimes(1);
  });
});
