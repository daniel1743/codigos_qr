/**
 * CONV-02 · budget accounting around the fast path.
 *
 * The invariant CA-7.1B established and CONV-02 must not weaken: EVERY provider
 * call is preceded by its own reservation, including the retries inside that
 * call. The fast path (CA-12) skips the UNDERSTANDING call on the first turn of
 * a conversation, so it must skip exactly ONE reservation — not one and a half,
 * and not zero while still calling.
 *
 * The numbers below are the contract:
 *   first turn, fast path eligible   1 provider call,  1 reservation
 *   first turn, canonical            2 provider calls, 2 reservations
 *   later turns, fast path enabled   2 provider calls, 2 reservations
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAdvisorGuard } from "../../guardrails/guard.server";
import {
  createInMemoryGuardrailLedger,
  type AdvisorGuardrailPort,
} from "../../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS, type AdvisorLimits } from "../../guardrails/limits";
import type { AdvisorProviderConfig } from "../../provider.server";
import { __resetAllSessionsForTests } from "../../session/store.server";
import { runConversationalTurn, startAdvisorSession } from "../turn.server";

const BASE_CONFIG: AdvisorProviderConfig = {
  apiKey: "sk-test-NEVER-PRINTED",
  baseUrl: "https://api.test.local",
  model: "deepseek-flash",
  timeoutMs: 5_000,
  maxOutputTokens: 400,
  // ONE retry, so a reservation must cover two attempts. A test with 0 here
  // could not tell "reserved for the retry" from "reserved once".
  maxRetries: 1,
  retryBaseDelayMs: 1,
};

const listenJson = JSON.stringify({
  intents: ["DISCOVERY"],
  business_type: null,
  primary_goal: null,
  secondary_goals: [],
  expressed_needs: [],
  explicit_objections: [],
  current_tools: [],
  technical_familiarity: "UNKNOWN",
  purchase_readiness: "UNKNOWN",
  next_best_action: "EXPLAIN",
  confidence: 0.8,
  unknown_fields: [],
});

const adviseJson = JSON.stringify({
  reply: "Te respondo con lo que está verificado, sin inventar cifras.",
  capability_ids: [],
  limitations: [],
});

const okResponse = (content: string) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    }),
    { status: 200 },
  );

const scripted = (bodies: readonly string[] = [listenJson, adviseJson]) => {
  let call = 0;
  return vi.fn<typeof fetch>(async () => {
    const body = bodies[Math.min(call, bodies.length - 1)];
    call += 1;
    return okResponse(body ?? adviseJson);
  });
};

function spyPort(limits: AdvisorLimits) {
  const inner = createInMemoryGuardrailLedger(limits);
  const reserves: { key: string; attempts: number }[] = [];
  const reconciles: string[] = [];
  const port: AdvisorGuardrailPort = {
    reserve: (key, at, attempts) => {
      reserves.push({ key, attempts: attempts ?? 1 });
      return inner.reserve(key, at, attempts);
    },
    reconcile: (id, tokens, at) => {
      reconciles.push(id);
      return inner.reconcile(id, tokens, at);
    },
    release: (id, at) => inner.release(id, at),
    settleUnknown: (id, at) => inner.settleUnknown(id, at),
    recordOutcome: (outcome, at) => inner.recordOutcome(outcome, at),
    isCircuitOpen: (at) => inner.isCircuitOpen(at),
    metrics: () => inner.metrics(),
    __reset: () => inner.__reset(),
  };
  return { port, reserves, reconciles };
}

const limits = DEFAULT_ADVISOR_LIMITS;

async function turn(params: {
  sessionId: string;
  message: string;
  fastPath: "on" | "off";
  fetchImpl: ReturnType<typeof scripted>;
  port: AdvisorGuardrailPort;
}) {
  const guard = createAdvisorGuard(limits, params.port);
  return runConversationalTurn(
    { sessionId: params.sessionId, message: params.message },
    {
      config: BASE_CONFIG,
      guard,
      fastPath: params.fastPath,
      providerDeps: { fetchImpl: params.fetchImpl as never, sleep: async () => {} },
    },
  );
}

beforeEach(() => {
  __resetAllSessionsForTests();
});

describe("CONV-02 · the fast path changes the number of reservations, exactly", () => {
  it("first turn + deterministic price question: 1 call, 1 reservation covering 2 attempts", async () => {
    const { port, reserves, reconciles } = spyPort(limits);
    // The fast path has no understanding call, so the FIRST request is advice.
    const fetchImpl = scripted([adviseJson]);
    const sessionId = startAdvisorSession().session_id;

    const run = await turn({
      sessionId,
      message: "¿Cuánto cuesta?",
      fastPath: "on",
      fetchImpl,
      port,
    });

    expect(run.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(reserves).toHaveLength(1);
    expect(reserves[0]?.attempts).toBe(2);
    expect(reconciles).toHaveLength(1);

    if (!run.ok) return;
    expect(run.outcome.understanding.deterministic).toBe(true);
    expect(run.outcome.understanding.reservation).toBe("NOT_REQUESTED");
    expect(run.outcome.commercial_advice.reservation).toBe("GRANTED");
  });

  it("first turn + canonical message: 2 calls, 2 reservations", async () => {
    const { port, reserves, reconciles } = spyPort(limits);
    const fetchImpl = scripted();
    const sessionId = startAdvisorSession().session_id;

    const run = await turn({ sessionId, message: "Hola", fastPath: "on", fetchImpl, port });

    expect(run.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(reserves).toHaveLength(2);
    expect(reserves.every((entry) => entry.attempts === 2)).toBe(true);
    expect(reconciles).toHaveLength(2);
  });

  it("a later turn uses the canonical path even with the fast path enabled", async () => {
    const first = spyPort(limits);
    const sessionId = startAdvisorSession().session_id;

    const one = await turn({
      sessionId,
      message: "¿Cuánto cuesta?",
      fastPath: "on",
      fetchImpl: scripted([adviseJson]),
      port: first.port,
    });
    expect(one.ok).toBe(true);
    expect(first.reserves).toHaveLength(1);

    const second = spyPort(limits);
    const two = await turn({
      sessionId,
      message: "¿Cuánto cuesta entonces?",
      fastPath: "on",
      fetchImpl: scripted(),
      port: second.port,
    });
    expect(two.ok).toBe(true);
    expect(second.reserves).toHaveLength(2);
  });

  it("fast path OFF keeps the canonical two-call first turn", async () => {
    const { port, reserves } = spyPort(limits);
    const fetchImpl = scripted();
    const sessionId = startAdvisorSession().session_id;

    const run = await turn({
      sessionId,
      message: "¿Cuánto cuesta?",
      fastPath: "off",
      fetchImpl,
      port,
    });

    expect(run.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(reserves).toHaveLength(2);
  });

  it("never reserves twice for one operation", async () => {
    const { port, reserves, reconciles } = spyPort(limits);
    const fetchImpl = scripted();
    const sessionId = startAdvisorSession().session_id;

    await turn({ sessionId, message: "Hola", fastPath: "off", fetchImpl, port });

    // One reservation per call, one settlement per reservation: neither is
    // greater than the other, and no key is reused inside a turn.
    expect(reserves).toHaveLength(2);
    expect(new Set(reserves.map((entry) => entry.key)).size).toBe(1);
    expect(reconciles).toHaveLength(2);
    expect(new Set(reconciles).size).toBe(2);
  });
});
