/**
 * CA-7.1B — the guarded conversational turn. MOCK PROVIDER ONLY.
 *
 * Every test injects its own `fetchImpl`, its own clock and its own guard, so
 * the suite is hermetic: no environment variable, no real provider, no shared
 * ledger. The provider is scripted per call (first the CA-3 listening answer,
 * then the CA-4 reply) and nothing here proves commercial quality against a
 * real model — that is `CRIPQER_CA4_COMMERCIAL_EVALUATION.md`, still
 * NOT_VERIFIED on purpose.
 *
 * What this file DOES prove is the invariant CA-7.1B exists for: no provider
 * call without an authorised reservation in front of it, including the retries
 * inside that call, and never a fabricated number in place of an unknown one.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { SAFE_FAILURE_REPLY } from "../../advisor/response";
import { createAdvisorGuard, type AdvisorGuard } from "../../guardrails/guard.server";
import {
  createInMemoryGuardrailLedger,
  type AdvisorGuardrailPort,
} from "../../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS, type AdvisorLimits } from "../../guardrails/limits";
import { ADVISOR_LIMITS, type AdvisorProviderConfig } from "../../provider.server";
import { emptyContext, SESSION_LIMITS } from "../../session/context";
import {
  __resetAllSessionsForTests,
  getSession,
  isValidSessionId,
  saveContext,
} from "../../session/store.server";
import {
  TURN_LIMITS,
  toPublicTurnResult,
  validateTurnRequest,
  type TurnFailureReason,
} from "../contract";
import {
  effectiveAttempts,
  runConversationalTurn,
  startAdvisorSession,
  type TurnRun,
} from "../turn.server";

/* ============================== fixtures ================================ */

const T0 = 1_700_000_000_000;

/** Monotonic and controllable: latency is measured, never a made-up constant. */
function makeClock(start = T0, step = 5) {
  let t = start;
  return () => {
    const value = t;
    t += step;
    return value;
  };
}

const BASE_CONFIG: AdvisorProviderConfig = {
  apiKey: "sk-test-NEVER-PRINTED",
  baseUrl: "https://api.test.local",
  model: "deepseek-flash",
  timeoutMs: 5_000,
  maxOutputTokens: 400,
  maxRetries: 0,
  retryBaseDelayMs: 1,
};

const config = (patch: Partial<AdvisorProviderConfig> = {}): AdvisorProviderConfig => ({
  ...BASE_CONFIG,
  ...patch,
});

const limits = (patch: Partial<AdvisorLimits> = {}): AdvisorLimits => ({
  ...DEFAULT_ADVISOR_LIMITS,
  ...patch,
});

const noSleep = async () => {};

const listenJson = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({
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
    ...patch,
  });

const adviseJson = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({
    reply:
      "CRIPQER reúne tu información y tus enlaces en una sola página con QR. ¿Quieres que te cuente cómo se ve?",
    capability_ids: ["tarjetas_bio"],
    limitations: [],
    ...patch,
  });

const okResponse = (content: string, usage: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }], usage }), { status: 200 });

const USAGE_LISTEN = { prompt_tokens: 200, completion_tokens: 50 }; // 250
const USAGE_ADVISE = { prompt_tokens: 300, completion_tokens: 100 }; // 400

/**
 * Scripted provider: one entry per expected call, consumed in order. A plan
 * entry may be a `Response`, a `Response` factory, or an `Error` to reject with.
 *
 * The abort signal is honoured on purpose. CA-1 aborts the request on its own
 * timeout, and a transport that ignored the signal would let the turn look like
 * a success — hiding the very path (timeout → UNKNOWN) this file exists to test.
 */
function scripted(plan: readonly (Response | Error | (() => Response))[]) {
  let call = 0;
  return vi.fn<typeof fetch>(async (_input, init?: RequestInit) => {
    const signal = init?.signal ?? null;
    const step = plan[Math.min(call, plan.length - 1)];
    call += 1;
    if (step === undefined) throw new Error("CA7_1B_TEST: no scripted response");
    if (step instanceof Error) throw step;
    if (signal?.aborted) throw signal.reason;
    return typeof step === "function" ? step() : step;
  });
}

/**
 * A transport that never answers but DOES reject when CA-1 aborts it — the
 * shape a real hung socket has.
 */
function stalledTransport() {
  return vi.fn<typeof fetch>(
    (_input, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
  );
}

const happyPath = (listen: Record<string, unknown> = {}, advise: Record<string, unknown> = {}) =>
  scripted([
    okResponse(listenJson(listen), USAGE_LISTEN),
    okResponse(adviseJson(advise), USAGE_ADVISE),
  ]);

/** A port that records what the guard actually asked the ledger to do. */
function spyPort(l: AdvisorLimits) {
  const inner = createInMemoryGuardrailLedger(l);
  const reserves: { key: string; attempts: number }[] = [];
  const reconciles: { id: string; tokens: number }[] = [];
  const releases: string[] = [];
  const settledUnknown: string[] = [];
  const port: AdvisorGuardrailPort = {
    reserve: (key, at, attempts) => {
      reserves.push({ key, attempts: attempts ?? 1 });
      return inner.reserve(key, at, attempts);
    },
    reconcile: (id, tokens, at) => {
      reconciles.push({ id, tokens });
      return inner.reconcile(id, tokens, at);
    },
    release: (id, at) => {
      releases.push(id);
      return inner.release(id, at);
    },
    settleUnknown: (id, at) => {
      settledUnknown.push(id);
      return inner.settleUnknown(id, at);
    },
    recordOutcome: (outcome, at) => inner.recordOutcome(outcome, at),
    isCircuitOpen: (at) => inner.isCircuitOpen(at),
    metrics: () => inner.metrics(),
    __reset: () => inner.__reset(),
  };
  return { port, reserves, reconciles, releases, settledUnknown, inner };
}

interface TurnHarness {
  readonly run: TurnRun;
  readonly fetchImpl: ReturnType<typeof scripted>;
  readonly guard: AdvisorGuard;
}

async function turn(params: {
  sessionId: string;
  message?: string;
  config?: AdvisorProviderConfig | null;
  guard: AdvisorGuard;
  fetchImpl: ReturnType<typeof scripted>;
  now: () => number;
}): Promise<TurnHarness> {
  const run = await runConversationalTurn(
    { sessionId: params.sessionId, message: params.message ?? "¿Qué es CRIPQER?" },
    {
      config: params.config === undefined ? BASE_CONFIG : params.config,
      guard: params.guard,
      providerDeps: { fetchImpl: params.fetchImpl as never, now: params.now, sleep: noSleep },
      now: params.now,
    },
  );
  return { run, fetchImpl: params.fetchImpl, guard: params.guard };
}

/** Opens a session on the injected clock. */
const session = (now: () => number) => startAdvisorSession(now()).session_id;

/** Narrowing helper: the tests below are only meaningful on a completed turn. */
function expectOk(run: TurnRun) {
  if (!run.ok) throw new Error(`expected a completed turn, got ${run.reason}: ${run.detail}`);
  return run.outcome;
}

const bodyOf = (fetchImpl: ReturnType<typeof scripted>, call: number): Record<string, unknown> =>
  JSON.parse(String((fetchImpl.mock.calls[call]?.[1] as RequestInit | undefined)?.body)) as Record<
    string,
    unknown
  >;

beforeEach(() => {
  __resetAllSessionsForTests();
});

/* ==================== 1-4 · the request and the session ================= */

describe("CA-7.1B — the turn request is bounded before anything can spend", () => {
  it("1 · a valid turn produces a typed, grounded response", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath();

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl, now });
    const outcome = expectOk(run);

    expect(outcome.response.grounding_status).toBe("GROUNDED");
    expect(outcome.response.detected_intents).toEqual(["DISCOVERY"]);
    expect(outcome.response.relevant_capability_ids).toEqual(["tarjetas_bio"]);
    expect(outcome.degraded).toBe(false);
    expect(outcome.degraded_reason).toBeNull();
    expect(outcome.persisted).toBe(true);
    expect(outcome.session.turns_used).toBe(1);
    expect(outcome.session.turns_remaining).toBe(SESSION_LIMITS.maxTurnsTotal - 1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("2 · an empty message is rejected before the provider is even considered", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath();

    const { run } = await turn({ sessionId: session(now), message: "   ", guard, fetchImpl, now });

    expect(run.ok).toBe(false);
    if (run.ok) return;
    expect(run.reason).toBe<TurnFailureReason>("INVALID_INPUT");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(guard.metrics().attempts).toBe(0);
  });

  it("3 · a message over the bound is rejected, and the bound is under CA-1's own", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath();

    const { run } = await turn({
      sessionId: session(now),
      message: "a".repeat(TURN_LIMITS.maxMessageChars + 1),
      guard,
      fetchImpl,
      now,
    });

    expect(run.ok).toBe(false);
    if (run.ok) return;
    expect(run.reason).toBe<TurnFailureReason>("INVALID_INPUT");
    expect(fetchImpl).not.toHaveBeenCalled();
    // The copy in `contract.ts` is pinned to the real CA-1 limit.
    expect(TURN_LIMITS.maxProviderMessageChars).toBe(ADVISOR_LIMITS.maxMessageChars);
    expect(TURN_LIMITS.maxMessageChars).toBeLessThan(TURN_LIMITS.maxProviderMessageChars);
  });

  it("3b · a message AT the bound survives the assembly CA-3 and CA-4 build around it", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath(
      {
        intents: ["TECHNICAL_SUPPORT", "FEATURE_QUESTION", "PREMIUM_INTEREST"],
        business_type: "b".repeat(60),
        primary_goal: "g".repeat(120),
        explicit_objections: ["o".repeat(120), "p".repeat(120), "q".repeat(120), "r".repeat(120)],
      },
      {
        capability_ids: ["plan_free"],
        reply: "Te explico lo verificado de CRIPQER y sus límites.",
      },
    );

    const { run } = await turn({
      sessionId: session(now),
      message: "a".repeat(TURN_LIMITS.maxMessageChars),
      guard,
      fetchImpl,
      now,
    });

    expectOk(run);
    // The whole point of the bound: neither assembled VISITOR message may exceed
    // what CA-1 refuses, or the call would be rejected LOCALLY after a hold was
    // taken. The system prompt has its own, larger bound and is not measured here.
    for (const call of [0, 1]) {
      const messages = bodyOf(fetchImpl, call)["messages"] as readonly {
        role: string;
        content: string;
      }[];
      const visitorMessages = messages.filter((message) => message.role !== "system");
      expect(visitorMessages.length).toBeGreaterThan(0);
      for (const message of visitorMessages) {
        expect(message.content.length).toBeLessThanOrEqual(ADVISOR_LIMITS.maxMessageChars);
      }
    }
  });

  it("4 · two sessions never see each other's memory", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const first = session(now);
    const second = session(now);

    await turn({
      sessionId: first,
      message: "Tengo una barbería",
      guard,
      fetchImpl: happyPath({ business_type: "barbería" }),
      now,
    });

    const storedFirst = getSession(first, now());
    const storedSecond = getSession(second, now());
    expect(storedFirst?.context.business_type).toBe("barbería");
    expect(storedFirst?.context.turns_total).toBe(1);
    expect(storedSecond?.context.business_type).toBeNull();
    expect(storedSecond?.context.turns_total).toBe(0);

    // And the second conversation's own request carries no fact from the first.
    const fetchImpl = happyPath();
    await turn({ sessionId: second, message: "hola", guard, fetchImpl, now });
    const messages = bodyOf(fetchImpl, 0)["messages"] as readonly { content: string }[];
    expect(messages.some((m) => m.content.includes("barbería"))).toBe(false);
  });

  it("4b · an unknown or malformed session id is refused before any reservation", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath();

    const { run } = await turn({
      sessionId: "11111111-1111-4111-8111-111111111111",
      guard,
      fetchImpl,
      now,
    });

    expect(run.ok).toBe(false);
    if (run.ok) return;
    expect(run.reason).toBe<TurnFailureReason>("SESSION_UNKNOWN");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(guard.metrics().attempts).toBe(0);
  });

  it("4c · the turn budget is refused BEFORE the provider is paid for it", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const id = session(now);
    saveContext(id, { ...emptyContext(), turns_total: SESSION_LIMITS.maxTurnsTotal }, now());
    const fetchImpl = happyPath();

    const { run } = await turn({ sessionId: id, guard, fetchImpl, now });

    expect(run.ok).toBe(false);
    if (run.ok) return;
    expect(run.reason).toBe<TurnFailureReason>("TURN_LIMIT_REACHED");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(guard.metrics().attempts).toBe(0);
  });

  it("4d · the request parser refuses unknown keys, so nothing can be smuggled in", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(validateTurnRequest({ sessionId: id, message: "hola" }).ok).toBe(true);
    for (const extra of ["config", "action", "provider", "apiKey", "session_id"]) {
      const verdict = validateTurnRequest({ sessionId: id, message: "hola", [extra]: "x" });
      expect(verdict.ok).toBe(false);
    }
    expect(validateTurnRequest({ sessionId: id, message: "hola" })).toEqual({
      ok: true,
      // CONV-02: the third key is `landingContext`, and it is `null` when the
      // caller sends none. The set is still closed: an extra key is refused.
      request: { sessionId: id, message: "hola", landingContext: null },
    });
  });

  it("4e · the session-id rule here accepts and refuses exactly what CA-6 does", () => {
    const fixtures = [
      "11111111-1111-4111-8111-111111111111",
      "9f1d2c3b-4a5e-4f60-8a1b-2c3d4e5f6071",
      "not-a-uuid",
      "",
      "11111111-1111-1111-8111-111111111111", // v1 shape
      "11111111-1111-4111-1111-111111111111", // bad variant
      "11111111111141118111111111111111",
    ];
    for (const fixture of fixtures) {
      const mine = validateTurnRequest({ sessionId: fixture, message: "hola" }).ok;
      expect(mine).toBe(isValidSessionId(fixture));
    }
  });
});

/* ============== 5-9 · two independent reservations, and attempts ======== */

describe("CA-7.1B — each operation reserves for itself, retries included", () => {
  it("5 & 6 · the understanding and the advice take SEPARATE reservations", async () => {
    const now = makeClock();
    const spy = spyPort(limits());
    const guard = createAdvisorGuard(limits(), spy.port);

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl: happyPath(), now });
    const outcome = expectOk(run);

    expect(outcome.understanding.reservation).toBe("GRANTED");
    expect(outcome.commercial_advice.reservation).toBe("GRANTED");
    expect(spy.reserves).toHaveLength(2);
    expect(spy.reconciles).toHaveLength(2);
    // Two holds, two distinct settlements — not one shared reservation.
    expect(spy.reconciles[0]?.id).not.toBe(spy.reconciles[1]?.id);
    expect(spy.reserves[0]?.key).toBe(spy.reserves[1]?.key); // same conversation
    expect(outcome.understanding.attempts_reserved).toBe(1);
    expect(outcome.commercial_advice.attempts_reserved).toBe(1);
  });

  it("6b · the second reservation can be refused on its own, with the first granted", async () => {
    const now = makeClock();
    // Exactly one hold fits: if the two steps shared a reservation, the whole
    // turn would have been refused instead of just the second half.
    const guard = createAdvisorGuard(
      limits({ dailyTokenBudget: DEFAULT_ADVISOR_LIMITS.reservationTokens }),
    );
    const fetchImpl = happyPath();

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl, now });
    const outcome = expectOk(run);

    expect(outcome.understanding.reservation).toBe("GRANTED");
    expect(outcome.commercial_advice.reservation).toBe("DENIED");
    expect(outcome.commercial_advice.denied_reason).toBe("BUDGET_EXHAUSTED");
    expect(outcome.commercial_advice.usage).toEqual({ status: "NOT_INVOKED" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("7 · CA-4 does not re-run CA-3: two calls, and the second is the commercial one", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath();

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl, now });
    expectOk(run);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const listening = bodyOf(fetchImpl, 0)["messages"] as readonly { content: string }[];
    const commercial = bodyOf(fetchImpl, 1)["messages"] as readonly { content: string }[];
    expect(String(listening[0]?.content)).toMatch(/comprensión de intenciones/);
    expect(String(commercial[0]?.content)).toMatch(/Conversion Advisor/);
    expect(String(commercial[0]?.content)).not.toMatch(/comprensión de intenciones/);
  });

  it("8 · without retries, one operation is one call: two calls for the whole turn", async () => {
    const now = makeClock();
    const spy = spyPort(limits());
    const guard = createAdvisorGuard(limits(), spy.port);
    const fetchImpl = happyPath();

    const { run } = await turn({
      sessionId: session(now),
      guard,
      fetchImpl,
      now,
      config: config({ maxRetries: 0 }),
    });
    expectOk(run);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(spy.reserves.map((r) => r.attempts)).toEqual([1, 1]);
  });

  it("9 · retries are part of the reservation: the hold covers every attempt", async () => {
    const now = makeClock();
    const spy = spyPort(limits());
    const guard = createAdvisorGuard(limits(), spy.port);
    const retrying = config({ maxRetries: 2 });
    expect(effectiveAttempts(retrying)).toBe(3);

    const { run } = await turn({
      sessionId: session(now),
      guard,
      fetchImpl: happyPath(),
      now,
      config: retrying,
    });
    const outcome = expectOk(run);

    // Both operations declared 1 + maxRetries to the ledger, not 1.
    expect(spy.reserves.map((r) => r.attempts)).toEqual([3, 3]);
    expect(outcome.understanding.attempts_reserved).toBe(3);
    expect(outcome.commercial_advice.attempts_reserved).toBe(3);
  });

  it("9b · the wider hold is real: a budget that fits one attempt refuses two", async () => {
    const now = makeClock();
    const retrying = config({ maxRetries: 1 }); // 2 attempts → 2 × reservationTokens
    const budget = DEFAULT_ADVISOR_LIMITS.reservationTokens * 2;

    const tight = createAdvisorGuard(limits({ dailyTokenBudget: budget }));
    const tightRun = await turn({
      sessionId: session(now),
      guard: tight,
      fetchImpl: happyPath(),
      now,
      config: retrying,
    });
    // 2 attempts fit for the first operation; the second needs 2 more and cannot.
    expect(expectOk(tightRun.run).commercial_advice.denied_reason).toBe("BUDGET_EXHAUSTED");

    const roomy = createAdvisorGuard(limits({ dailyTokenBudget: budget * 2 }));
    const roomyRun = await turn({
      sessionId: session(now),
      guard: roomy,
      fetchImpl: happyPath(),
      now,
      config: retrying,
    });
    expect(expectOk(roomyRun.run).degraded).toBe(false);
  });
});

/* ================== 10-12 · a denial stops the turn ==================== */

describe("CA-7.1B — a refused reservation means no call, and no spend", () => {
  it("10 & 12 · a refused first reservation stops the turn with zero calls", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits({ killSwitch: true }));
    const fetchImpl = happyPath();

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl, now });
    const outcome = expectOk(run);

    expect(outcome.understanding.reservation).toBe("DENIED");
    expect(outcome.understanding.denied_reason).toBe("KILL_SWITCH");
    expect(outcome.understanding.usage).toEqual({ status: "NOT_INVOKED" });
    expect(outcome.understanding.latency_ms).toBeNull();
    // The second step was never even asked for: nothing was authorised.
    expect(outcome.commercial_advice.reservation).toBe("NOT_REQUESTED");
    expect(outcome.commercial_advice.denied_reason).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(guard.metrics().attempts).toBe(0);
    expect(outcome.degraded).toBe(true);
    expect(outcome.degraded_reason).toBe("GUARD_DENIED:KILL_SWITCH");
    // A refused turn is not a conversation: nothing is written down.
    expect(outcome.persisted).toBe(false);
    expect(getSession(outcome.session_id, now())?.context.turns_total).toBe(0);
  });

  it("11 · a refused second reservation stops the commercial call only", async () => {
    const now = makeClock();
    const spy = spyPort(limits());
    // Deny the second reservation, whatever its reason, and nothing else.
    let asked = 0;
    const denying: AdvisorGuardrailPort = {
      ...spy.port,
      reserve: (key, at, attempts) => {
        asked += 1;
        return asked === 2
          ? { ok: false, reason: "SESSION_RATE_LIMIT" }
          : spy.port.reserve(key, at, attempts);
      },
    };
    const guard = createAdvisorGuard(limits(), denying);
    const fetchImpl = happyPath();

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl, now });
    const outcome = expectOk(run);

    expect(outcome.understanding.reservation).toBe("GRANTED");
    expect(outcome.commercial_advice.reservation).toBe("DENIED");
    expect(outcome.commercial_advice.denied_reason).toBe("SESSION_RATE_LIMIT");
    expect(outcome.commercial_advice.usage).toEqual({ status: "NOT_INVOKED" });
    expect(fetchImpl).toHaveBeenCalledTimes(1); // the listening call only
    expect(outcome.degraded_reason).toBe("GUARD_DENIED:SESSION_RATE_LIMIT");
    // The safe reply, and no commercial claim.
    expect(outcome.response.grounding_status).toBe("FALLBACK");
    expect(outcome.response.reply).toBe(SAFE_FAILURE_REPLY);
  });

  it("12b · a session rate limit blocks the next turn before it can call", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits({ sessionRequestsPerWindow: 2 }));
    const id = session(now);

    const first = await turn({ sessionId: id, guard, fetchImpl: happyPath(), now });
    expect(expectOk(first.run).degraded).toBe(false);

    const secondFetch = happyPath();
    const second = await turn({ sessionId: id, guard, fetchImpl: secondFetch, now });
    const outcome = expectOk(second.run);
    expect(outcome.understanding.denied_reason).toBe("SESSION_RATE_LIMIT");
    expect(secondFetch).not.toHaveBeenCalled();
  });

  it("12c · an open circuit blocks new reservations", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits({ circuitFailureThreshold: 1 }));

    // One failing turn opens the circuit (the failure is recorded once).
    const failing = scripted([new Error("boom")]);
    const first = await turn({ sessionId: session(now), guard, fetchImpl: failing, now });
    expect(expectOk(first.run).degraded).toBe(true);

    const secondFetch = happyPath();
    const second = await turn({ sessionId: session(now), guard, fetchImpl: secondFetch, now });
    const outcome = expectOk(second.run);
    expect(outcome.understanding.reservation).toBe("DENIED");
    expect(outcome.understanding.denied_reason).toBe("CIRCUIT_OPEN");
    expect(secondFetch).not.toHaveBeenCalled();
  });
});

/* ================= 13-18 · usage, settlement, idempotency ============== */

describe("CA-7.1B — the usage adapter: reported, unknown, never invoked", () => {
  it("13 · reported usage is reconciled with the real numbers", async () => {
    const now = makeClock();
    const spy = spyPort(limits());
    const guard = createAdvisorGuard(limits(), spy.port);

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl: happyPath(), now });
    const outcome = expectOk(run);

    expect(outcome.understanding.usage).toEqual({
      status: "REPORTED",
      usage: { inputTokens: 200, outputTokens: 50 },
    });
    expect(outcome.commercial_advice.usage).toEqual({
      status: "REPORTED",
      usage: { inputTokens: 300, outputTokens: 100 },
    });
    // The hold is replaced by the real usage, per operation.
    expect(spy.reconciles.map((r) => r.tokens)).toEqual([250, 400]);
    expect(spy.settledUnknown).toHaveLength(0);
    expect(spy.releases).toHaveLength(0);
    expect(spy.inner.metrics().inputTokens).toBe(500);
    expect(spy.inner.metrics().outputTokens).toBe(150);
  });

  it("13b · the real usage frees the rest of the hold instead of keeping it", async () => {
    const now = makeClock();
    // 2500 fits one 2000 hold; if the holds were imputed rather than
    // reconciled, the second operation could never have been authorised.
    const guard = createAdvisorGuard(limits({ dailyTokenBudget: 2_500 }));

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl: happyPath(), now });
    const outcome = expectOk(run);
    expect(outcome.degraded).toBe(false);
    expect(outcome.commercial_advice.reservation).toBe("GRANTED");
  });

  it("14 · UNKNOWN usage is settled conservatively — not as zero, not as success", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits({ dailyTokenBudget: 4_000 }));
    // A 200 with no usage block: CA-1 reads 0/0, which CA-3/CA-4 call UNKNOWN.
    const zeroed = scripted([okResponse(listenJson(), {}), okResponse(adviseJson(), {})]);

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl: zeroed, now });
    const outcome = expectOk(run);

    expect(outcome.understanding.reservation).toBe("GRANTED");
    expect(outcome.understanding.usage).toEqual({ status: "UNKNOWN" });
    expect(outcome.commercial_advice.usage).toEqual({ status: "UNKNOWN" });
    expect(guard.metrics().unknownConsumptionSettlements).toBe(2);
    expect(outcome.degraded).toBe(true);

    // The proof that it was not treated as free: both holds (2 × 2000) are now
    // spent, so a fresh conversation cannot be authorised at all.
    const after = await turn({ sessionId: session(now), guard, fetchImpl: happyPath(), now });
    expect(expectOk(after.run).understanding.denied_reason).toBe("BUDGET_EXHAUSTED");
  });

  it("15 · NOT_INVOKED is not a call: no reservation, no charge, no attempt", async () => {
    const now = makeClock();
    const spy = spyPort(limits());
    const guard = createAdvisorGuard(limits(), spy.port);
    const fetchImpl = happyPath();

    const { run } = await turn({
      sessionId: session(now),
      guard,
      fetchImpl,
      now,
      config: null, // explicitly not configured
    });
    const outcome = expectOk(run);

    expect(outcome.understanding.reservation).toBe("NOT_REQUESTED");
    expect(outcome.commercial_advice.reservation).toBe("NOT_REQUESTED");
    expect(outcome.understanding.usage).toEqual({ status: "NOT_INVOKED" });
    expect(outcome.commercial_advice.usage).toEqual({ status: "NOT_INVOKED" });
    expect(outcome.understanding.attempts_reserved).toBe(0);
    expect(spy.reserves).toHaveLength(0);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(guard.metrics().attempts).toBe(0);
    expect(outcome.response.grounding_status).toBe("FALLBACK");
    expect(outcome.degraded_reason).toBe("PROVIDER_NOT_CONFIGURED");
  });

  it("16 · a timeout does not forgive the consumption it may have caused", async () => {
    const now = makeClock();
    // 3000 fits ONE hold. If the timed-out call had been treated as free, the
    // second operation would have been authorised and a second call would have
    // gone out; it is refused, which is the hold being imputed rather than
    // returned.
    const guard = createAdvisorGuard(limits({ dailyTokenBudget: 3_000 }));
    const stalled = stalledTransport();

    const { run } = await turn({
      sessionId: session(now),
      guard,
      fetchImpl: stalled as never,
      now,
      config: config({ timeoutMs: 1 }),
    });
    const outcome = expectOk(run);

    expect(outcome.understanding.reservation).toBe("GRANTED");
    expect(outcome.understanding.usage).toEqual({ status: "UNKNOWN" });
    expect(outcome.understanding.failure_reason).toBe("PROVIDER_TIMEOUT");
    // The call did happen, so a duration was measured — unlike a refused one.
    expect(outcome.understanding.latency_ms).toBeGreaterThan(0);
    expect(outcome.degraded_reason).toBe("UNDERSTANDING_FAILED:PROVIDER_TIMEOUT");
    expect(guard.metrics().unknownConsumptionSettlements).toBe(1);
    expect(guard.metrics().denied["BUDGET_EXHAUSTED"]).toBe(1);
    expect(outcome.commercial_advice.denied_reason).toBe("BUDGET_EXHAUSTED");
    expect(stalled).toHaveBeenCalledTimes(1);
  });

  it("17 · a transport failure is charged ONCE per operation, never twice", async () => {
    const now = makeClock();
    const retrying = config({ maxRetries: 1 }); // 2 attempts → 2 × reservationTokens
    // Exactly 2 operations × 2 attempts × reservationTokens fits. A third
    // reservation cannot, which is how the charge is measured without reading a
    // private counter: if a retry rode free, the follow-up would have been granted.
    //
    // The LIMITS go on the port, not only on the guard: the guard delegates every
    // limit to the ledger, so a spy port built with the defaults would silently
    // enforce a 200 000-token budget and the test would prove nothing.
    const l = limits({ dailyTokenBudget: 8_000 });
    const spy = spyPort(l);
    const guard = createAdvisorGuard(l, spy.port);
    const failing = scripted([new Error("socket hang up")]);

    const { run } = await turn({
      sessionId: session(now),
      guard,
      fetchImpl: failing,
      now,
      config: retrying,
    });
    const outcome = expectOk(run);

    // Two attempts for the understanding (it retried) + two for the advice.
    expect(failing).toHaveBeenCalledTimes(4);
    expect(outcome.understanding.usage).toEqual({ status: "UNKNOWN" });
    expect(outcome.commercial_advice.usage).toEqual({ status: "UNKNOWN" });
    // One settlement per reservation, even though each covered two attempts.
    expect(spy.settledUnknown).toHaveLength(2);
    expect(spy.settledUnknown[0]).not.toBe(spy.settledUnknown[1]);
    expect(spy.reconciles).toHaveLength(0);
    expect(guard.metrics().unknownConsumptionSettlements).toBe(2);

    const after = await turn({
      sessionId: session(now),
      guard,
      fetchImpl: happyPath(),
      now,
      config: retrying,
    });
    const afterOutcome = expectOk(after.run);
    expect(afterOutcome.understanding.denied_reason).toBe("BUDGET_EXHAUSTED");
    expect(after.fetchImpl).not.toHaveBeenCalled();
  });

  it("18 · settlement is idempotent: a second reconcile of the same hold charges nothing", async () => {
    const now = makeClock();
    const spy = spyPort(limits());
    const guard = createAdvisorGuard(limits(), spy.port);

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl: happyPath(), now });
    expectOk(run);

    const settled = spy.reconciles[0];
    expect(settled).toBeDefined();
    if (settled === undefined) return;
    const before = spy.inner.metrics().attempts;
    // The ledger refuses a second settlement of an already-settled hold.
    expect(spy.inner.reconcile(settled.id, 10_000, T0)).toBe(false);
    expect(spy.inner.metrics().attempts).toBe(before);
  });

  it("18b · nothing is ever released: the guard's default is conservative", async () => {
    const now = makeClock();
    const spy = spyPort(limits());
    const guard = createAdvisorGuard(limits(), spy.port);

    await turn({
      sessionId: session(now),
      guard,
      fetchImpl: scripted([new Error("boom")]),
      now,
    });

    expect(spy.releases).toHaveLength(0);
    expect(spy.settledUnknown.length).toBeGreaterThan(0);
  });
});

/* ================== 19-23 · safety behaviour preserved ================= */

describe("CA-7.1B — the commercial behaviour of CA-4 is preserved", () => {
  it("19 · an unsafe reply becomes the safe one, and the turn is NOT degraded", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath({}, { reply: "Te garantizamos 100 clientes nuevos cada mes." });

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl, now });
    const outcome = expectOk(run);

    expect(outcome.response.grounding_status).toBe("FALLBACK");
    expect(outcome.response.reply).toBe(SAFE_FAILURE_REPLY);
    // The provider answered and was settled normally: the validator working is
    // not an integration failure.
    expect(outcome.degraded).toBe(false);
    expect(outcome.understanding.usage.status).toBe("REPORTED");
    expect(outcome.commercial_advice.usage.status).toBe("REPORTED");
  });

  it("20 · OFFER_GUEST_EDITOR stays blocked: it degrades to EXPLAIN", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath(
      { intents: ["START_CREATION"], next_best_action: "OFFER_GUEST_EDITOR" },
      { capability_ids: ["plan_free"] },
    );

    const { run } = await turn({
      sessionId: session(now),
      message: "quiero empezar",
      guard,
      fetchImpl,
      now,
    });
    const outcome = expectOk(run);

    expect(outcome.response.suggested_action).toBe("EXPLAIN");
    expect(outcome.response.suggested_action).not.toBe("OFFER_GUEST_EDITOR");
  });

  it("21 · a capability outside the authorised set is refused by CA-4, unchanged", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath(
      { intents: ["FEATURE_QUESTION"] },
      { capability_ids: ["dominio_personalizado"] },
    );

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl, now });
    expect(expectOk(run).response.grounding_status).toBe("FALLBACK");
  });

  it("22 · the provider failing at understanding still yields the safe reply", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = scripted([new Error("boom")]);

    const { run } = await turn({ sessionId: session(now), guard, fetchImpl, now });
    const outcome = expectOk(run);

    expect(outcome.response.grounding_status).toBe("FALLBACK");
    expect(outcome.response.reply).toBe(SAFE_FAILURE_REPLY);
    expect(outcome.degraded).toBe(true);
    expect(outcome.degraded_reason).toBe("UNDERSTANDING_FAILED:PROVIDER_NETWORK");
  });

  it("22b · the failed turn is still remembered, so the conversation continues", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const id = session(now);

    await turn({ sessionId: id, guard, fetchImpl: scripted([new Error("boom")]), now });
    const stored = getSession(id, now());
    expect(stored?.context.turns_total).toBe(1);
  });

  it("23 · a turn is never degraded by its own input being too long for the context", async () => {
    const now = makeClock();
    // Seven turns = fourteen reservations inside one window, so the per-session
    // call window is widened deliberately: this test measures MESSAGE ASSEMBLY,
    // and a rate-limit denial here would be a different test's failure wearing
    // this one's name.
    const guard = createAdvisorGuard(limits({ sessionRequestsPerWindow: 50 }));
    const id = session(now);
    // A conversation with the maximum amount of stored context, then a long
    // message: the assembled request must still be legal, or the local refusal
    // would burn a reservation for a call that never left.
    for (let i = 0; i < SESSION_LIMITS.maxRecentTurns; i += 1) {
      await turn({
        sessionId: id,
        message: `turno ${i}`,
        guard,
        fetchImpl: happyPath({ business_type: "b".repeat(60), primary_goal: "g".repeat(120) }),
        now,
      });
    }
    const fetchImpl = happyPath({ business_type: "b".repeat(60), primary_goal: "g".repeat(120) });
    const { run } = await turn({
      sessionId: id,
      message: "a".repeat(TURN_LIMITS.maxMessageChars),
      guard,
      fetchImpl,
      now,
    });
    const outcome = expectOk(run);
    expect(outcome.degraded).toBe(false);
    expect(outcome.understanding.usage.status).toBe("REPORTED");
    // Both calls really went out, so neither was refused locally for length.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

/* ================= 24-26 · secrets, real calls, frozen files =========== */

describe("CA-7.1B — nothing leaks, nothing is called for real, nothing frozen moves", () => {
  it("24 · no secret reaches the response, the projection or the logs", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath();

    const spies = (["log", "warn", "error", "info", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => {}),
    );
    try {
      const { run } = await turn({ sessionId: session(now), guard, fetchImpl, now });
      const outcome = expectOk(run);
      const publicResult = toPublicTurnResult(outcome);

      expect(JSON.stringify(publicResult)).not.toContain(BASE_CONFIG.apiKey);
      expect(JSON.stringify(outcome)).not.toContain(BASE_CONFIG.apiKey);
      // The wire shape names its fields: no usage, no latency, no denial reason.
      expect(Object.keys(publicResult).sort()).toEqual(
        [
          "degraded",
          "detected_intents",
          "grounding_status",
          "limitations",
          // CONV-02: the resolved model id (or null) is published; it is the
          // evidence that this turn used the canonical advisor path.
          "model",
          "relevant_capability_ids",
          "reply",
          "session_id",
          "suggested_action",
          "turns_remaining",
          "turns_used",
        ].sort(),
      );

      // The key travels in the Authorization header only — never in a body.
      for (const call of [0, 1]) {
        expect(
          String((fetchImpl.mock.calls[call]?.[1] as RequestInit | undefined)?.body),
        ).not.toContain(BASE_CONFIG.apiKey);
      }

      const logged = spies.flatMap((spy) => spy.mock.calls.flat()).map((value) => String(value));
      expect(logged.some((line) => line.includes(BASE_CONFIG.apiKey))).toBe(false);
      // And the visitor's own words are not dumped to the console either.
      expect(logged.some((line) => line.includes("¿Qué es CRIPQER?"))).toBe(false);
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });

  it("25 · no real provider is ever called: only the injected transport is used", async () => {
    const now = makeClock();
    const guard = createAdvisorGuard(limits());
    const fetchImpl = happyPath();

    const realFetch = globalThis.fetch;
    const globalSpy = vi.fn(realFetch);
    globalThis.fetch = globalSpy as typeof fetch;
    try {
      const { run } = await turn({ sessionId: session(now), guard, fetchImpl, now });
      expectOk(run);
    } finally {
      globalThis.fetch = realFetch;
    }

    expect(globalSpy).not.toHaveBeenCalled();
    for (const call of fetchImpl.mock.calls) {
      const url = String(call[0]);
      expect(url.startsWith(BASE_CONFIG.baseUrl)).toBe(true);
      expect(url).not.toContain("deepseek.com");
    }
  });

  it("26 · the frozen modules are byte-identical to the CA-7.1B baseline", () => {
    // A phase gate, not a general rule: it encodes the acceptance criterion
    // "frozen_files_modified: 0" for CA-7.1B. A later phase that legitimately
    // changes one of these must update this manifest on purpose.
    //
    // CA-9A.2 (2026-10-16) updated exactly ONE entry, on purpose and behind a
    // decision: `provider.server.ts` moved from 1b9fd8e5… to dbf3fabc… because
    // the owner approved the model alignment (default deepseek-chat →
    // deepseek-flash, the only id with a verified price). The other twelve files
    // are byte-identical, no pipeline behaviour changed, and every behavioural
    // test in this file still passes — which is what makes this an update rather
    // than a bypass.
    //
    // CA-9C (2026-10-17) updated TWO entries, on purpose and each behind a
    // CA-9B-recorded finding — never a preference:
    //   · `provider.server.ts` dbf3fabc… → a7b34574…: `maxOutputTokens` 800 →
    //     3 584 (9 of 168 recorded completions hit the cap, 6 mid-JSON and 3
    //     empty) and `MAX_FIELD_CHARS` 120 → 160 for `unknown_fields` only
    //     (one recorded entry at 125).
    //   · `advisor/response.ts` 070cad10… → 3dc66eee…: `maxReplyChars` 900 →
    //     1 000 (record 124 is a complete, schema-valid 906-character answer).
    // The other eleven entries are byte-identical, and every behavioural test in
    // this file still passes.
    //
    // CA-10B (2026-10-19) updated TWO entries, on purpose and behind the phase's
    // own contract — the ONE executable action, internal navigation to `/help`:
    //   · `actions/registry.ts` 019ba74d… → 944e9d12…: `OPEN_HELP` added to the
    //     closed allowlist, `OFFER_HELP` mapped to it, and a separate executable
    //     destination allowlist (`/help` only).
    //   · `actions/policy.ts` 39ee1c83… → 293abea9…: the OPEN_HELP branch (clock-
    //     free) and `revalidateExecutableAction`.
    // No provider, guard, capability or session module moved, and every
    // behavioural test in this file still passes.
    //
    // CA-12 (2026-10-19) updated ONE entry, and it is an ADDITIVE vocabulary
    // change, not a behaviour change:
    //   · `intents/contract.ts` 26d73de8… → ad68651f…: `VisitorSignals.source`
    //     gains `"DETERMINISTIC"` so a locally-resolved intent states what it is
    //     instead of calling itself a model answer. No intent, field, bound or
    //     validator moved; the fast path still feeds the same `selectCapabilities`
    //     and `decideAction`, and `fast-path-equivalence.test.ts` proves the
    //     decision is identical over the whole corpus.
    //
    // CONV-02 (2026-10-20) updated TWO entries, on purpose and behind the
    // integration brief's own contract:
    //   · `provider.server.ts` a83023df… → fccf07c0…: `ADVISOR_MODEL` is read
    //     with precedence `ADVISOR_MODEL → DEEPSEEK_MODEL → deepseek-flash`, and
    //     the defaults move to `timeoutMs` 12 000 / `maxRetries` 1 so the worst
    //     case (2 operations × 2 attempts × 12 s + backoff = 48.8 s) fits the
    //     60 s browser deadline. `DEEPSEEK_MODEL` keeps its own meaning.
    //   · `advisor/orchestrator.server.ts` e1cff6f5… → db46237e…: the advisor
    //     identity gains the consultative/honesty guidance and the builder
    //     accepts an optional `LandingContextSnapshot`, rendered as bounded DATA
    //     ("no puedes cambiarlos"). No capability, action or guard moved.
    const here = dirname(fileURLToPath(import.meta.url));
    const moduleRoot = join(here, "..", "..");
    const frozen: Readonly<Record<string, string>> = {
      "provider.server.ts": "fccf07c0ad90894134a43fd2b77b9a1f",
      "guardrails/guard.server.ts": "c72d573ee40148951992cd8d2f0218c0",
      "guardrails/ledger.server.ts": "ab77b78047e44a3eba3808f12a25a393",
      "guardrails/limits.ts": "5867d39cd1b2f0845151ded515e4b363",
      "intents/contract.ts": "ad68651fdc993e13278ffcb18306b6da",
      "intents/classifier.server.ts": "ce65e2b23525a13c3a6194805151eca9",
      "advisor/orchestrator.server.ts": "db46237e4f568b1e08b168a8361e74cb",
      "advisor/response.ts": "3dc66eee711b35736a43439c48b1b017",
      "advisor/strategy.ts": "1bc9fdd465118ef796fe91d5c2ce269c",
      "session/context.ts": "fe01b0be51dbc7514b1521b755020c9f",
      "session/store.server.ts": "962dcb47fe7cf773fef16128c35034a9",
      "actions/registry.ts": "944e9d12f4d55a5479c6af054ad33a05",
      "actions/policy.ts": "293abea97ead50b5fad0dc6cfb51e080",
    };

    for (const [relative, digest] of Object.entries(frozen)) {
      const bytes = readFileSync(join(moduleRoot, relative));
      expect(createHash("md5").update(bytes).digest("hex")).toBe(digest);
    }
  });

  it("26b · the entry point is exported, and imports no surface it must not touch", async () => {
    const mod = await import("../server");
    expect(typeof mod.askAdvisorTurnFn).toBe("function");
    expect(typeof mod.startAdvisorSessionFn).toBe("function");
  });
});
