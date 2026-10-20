/**
 * CRIPQER Conversion Advisor — CA-12 · where a turn's time goes.
 *
 * The CA-11B canary measured a real turn at 27.8 s: 13.9 s classifier, 4.9 s
 * advisor. This file separates the CRIPQER pipeline's own overhead from the
 * provider-equivalent latency using a SCRIPTED transport whose delays are known
 * exactly, so the difference is attributable:
 *
 *   total      = wall time of `runConversationalTurn`
 *   provider   = the delays the scripted provider was told to take
 *   overhead   = total − provider   (validation, session, guard, strategy,
 *                                     projection, persistence — CRIPQER's own)
 *
 * It also measures the same turn through the CA-12 fast path, where the
 * understanding call does not exist at all.
 *
 * ZERO REAL CALLS, ZERO SPEND: the transport is a local function; `fetch` is
 * never the global and no key is read. This is an instrument, not a benchmark:
 * the assertions are generous, and the printed line is the measurement.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { createAdvisorGuard } from "../../guardrails/guard.server";
import { createInMemoryGuardrailLedger } from "../../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS } from "../../guardrails/limits";
import type { AdvisorProviderConfig } from "../../provider.server";
import { __resetAllSessionsForTests } from "../../session/store.server";
import { runConversationalTurn, startAdvisorSession, type TurnRun } from "../turn.server";

const CONFIG: AdvisorProviderConfig = {
  apiKey: "sk-ca12-FICTIONAL",
  baseUrl: "https://ca12.invalid/v1",
  model: "deepseek-flash",
  timeoutMs: 5_000,
  maxOutputTokens: 400,
  maxRetries: 0,
  retryBaseDelayMs: 1,
};

const LISTENING_MARKER = "comprensión de intenciones";
const SAFE_REPLY =
  "CRIPQER reúne tu información y tus enlaces en una sola página con QR. ¿Quieres que te cuente cómo se ve?";

const LISTEN_MS = 150;
const ADVISE_MS = 100;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface MeasuredTransport {
  readonly fetchImpl: typeof fetch;
  readonly calls: () => number;
  readonly providerMs: () => number;
}

function delayedTransport(): MeasuredTransport {
  let calls = 0;
  let providerMs = 0;
  const fetchImpl = (async (_input: unknown, init?: RequestInit) => {
    calls += 1;
    let system = "";
    try {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        messages?: Array<{ content?: unknown }>;
      };
      system = String(body.messages?.[0]?.content ?? "");
    } catch {
      system = "";
    }
    const listening = system.includes(LISTENING_MARKER);
    const delay = listening ? LISTEN_MS : ADVISE_MS;
    const startedAt = performance.now();
    await sleep(delay);
    providerMs += performance.now() - startedAt;

    const content = listening
      ? JSON.stringify({
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
        })
      : JSON.stringify({ reply: SAFE_REPLY, capability_ids: [], limitations: [] });

    return new Response(
      JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
      { status: 200 },
    );
  }) as typeof fetch;
  return { fetchImpl, calls: () => calls, providerMs: () => providerMs };
}

function expectOk(run: TurnRun) {
  if (!run.ok) throw new Error(`expected an outcome, got ${run.reason}: ${run.detail}`);
  return run.outcome;
}

beforeEach(() => {
  __resetAllSessionsForTests();
});

describe("CA-12 — CRIPQER overhead is separable from provider latency", () => {
  it("1 · a canonical turn reports provider time, total time and local overhead", async () => {
    const sessionId = startAdvisorSession().session_id;
    const guard = createAdvisorGuard(
      DEFAULT_ADVISOR_LIMITS,
      createInMemoryGuardrailLedger(DEFAULT_ADVISOR_LIMITS),
    );
    const transport = delayedTransport();

    const startedAt = performance.now();
    const run = await runConversationalTurn(
      // A greeting is canonically ambiguous, so this is the two-call pipeline.
      { sessionId, message: "Hola" },
      { config: CONFIG, guard, providerDeps: { fetchImpl: transport.fetchImpl, sleep } },
    );
    const wall = performance.now() - startedAt;
    const outcome = expectOk(run);

    expect(transport.calls()).toBe(2);
    const understanding = outcome.latency_ms.understanding;
    const commercial = outcome.latency_ms.commercial_advice;
    expect(understanding).not.toBeNull();
    expect(commercial).not.toBeNull();
    expect(understanding as number).toBeGreaterThanOrEqual(LISTEN_MS);
    expect(commercial as number).toBeGreaterThanOrEqual(ADVISE_MS);

    const provider = (understanding as number) + (commercial as number);
    const overhead = Math.max(0, wall - provider);

    // The provider-equivalent part really is what was injected.
    expect(provider).toBeGreaterThanOrEqual(LISTEN_MS + ADVISE_MS);
    expect(Math.abs(transport.providerMs() - provider)).toBeLessThan(100);

    // CRIPQER's own work is a small fraction of a turn. Generous on purpose:
    // this is a local pipeline measurement, not a benchmark.
    expect(overhead).toBeLessThan(250);
    expect(outcome.latency_ms.total).toBeGreaterThanOrEqual(provider);

    console.log(
      `[CA-12 latency] canonical: calls=2 total=${outcome.latency_ms.total.toFixed(1)}ms ` +
        `understanding=${(understanding as number).toFixed(1)}ms ` +
        `commercial=${(commercial as number).toFixed(1)}ms overhead=${overhead.toFixed(1)}ms`,
    );
  });

  it("2 · the first-turn fast path removes the understanding term entirely", async () => {
    const sessionId = startAdvisorSession().session_id;
    const guard = createAdvisorGuard(
      DEFAULT_ADVISOR_LIMITS,
      createInMemoryGuardrailLedger(DEFAULT_ADVISOR_LIMITS),
    );
    const transport = delayedTransport();

    const run = await runConversationalTurn(
      { sessionId, message: "¿Cuánto cuesta el plan Premium?" },
      {
        config: CONFIG,
        guard,
        providerDeps: { fetchImpl: transport.fetchImpl, sleep },
        fastPath: "on",
      },
    );
    const outcome = expectOk(run);

    expect(transport.calls()).toBe(1);
    expect(outcome.understanding.reservation).toBe("NOT_REQUESTED");
    expect(outcome.understanding.latency_ms).toBeNull();
    expect(outcome.understanding.deterministic).toBe(true);

    const commercial = outcome.latency_ms.commercial_advice as number;
    expect(commercial).toBeGreaterThanOrEqual(ADVISE_MS);
    expect(outcome.latency_ms.total).toBeGreaterThanOrEqual(commercial);

    console.log(
      `[CA-12 latency] fast path: calls=1 total=${outcome.latency_ms.total.toFixed(1)}ms ` +
        `understanding=NOT_INVOKED commercial=${commercial.toFixed(1)}ms ` +
        `avoided≈${LISTEN_MS}ms`,
    );
  });
});
