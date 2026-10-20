/**
 * CONV-02 · observability is an allowlist, and a side channel.
 *
 * Two properties are tested, and both are easy to lose in a refactor:
 *
 *  1. WHAT CAN BE LOGGED. The event vocabulary is closed and every field is
 *     named. A caller that passes `message`, `reply`, `apiKey`, `sessionId`,
 *     `authorization` or a provider body must see it dropped — not truncated,
 *     not hashed, gone.
 *  2. WHAT A BROKEN SINK CAN DO. Nothing. The turn has already been paid for by
 *     the time an event is emitted; a logger that throws must not turn a good
 *     reply into an error.
 */
import { describe, expect, it, vi } from "vitest";

import { createAdvisorGuard } from "../../guardrails/guard.server";
import { createInMemoryGuardrailLedger } from "../../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS } from "../../guardrails/limits";
import { runConversationalTurn, startAdvisorSession } from "../turn.server";
import {
  ADVISOR_EVENTS,
  buildAdvisorEvent,
  emitAdvisorEvent,
  type AdvisorObservabilityRecord,
} from "../observability.server";

const KEY = "sk-test-NEVER-PRINTED";
const MESSAGE = "Tengo una pastelería llamada Dulce Sol y quiero reservas.";

const listenJson = JSON.stringify({
  intents: ["DISCOVERY"],
  business_type: "pastelería",
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
  reply: "Entiendo: una pastelería que quiere reservas. Te muestro estilos.",
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

const FORBIDDEN = [
  "message",
  "reply",
  "transcript",
  "prompt",
  "response",
  "body",
  "headers",
  "authorization",
  "apiKey",
  "sessionId",
  "session_id",
  "name",
  "description",
  "email",
  "phone",
  "denied_reason",
  "stack",
];

describe("CONV-02 · the event vocabulary is closed", () => {
  it("is exactly the eight events the brief names", () => {
    expect(ADVISOR_EVENTS).toEqual([
      "advisor.turn.received",
      "advisor.turn.refused",
      "advisor.turn.unconfigured",
      "advisor.understanding.completed",
      "advisor.advice.completed",
      "advisor.guard.denied",
      "advisor.turn.degraded",
      "advisor.turn.completed",
    ]);
  });

  it("drops every field that is not on the allowlist", () => {
    const fields = {
      model: "deepseek-flash",
      message: MESSAGE,
      reply: "texto del modelo",
      apiKey: KEY,
      sessionId: "3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b",
      authorization: `Bearer ${KEY}`,
      body: '{"choices":[]}',
      denied_reason: "DAILY_TOKEN_BUDGET",
      stack: "Error: boom\n    at x",
    } as unknown as Parameters<typeof buildAdvisorEvent>[1];

    const record = buildAdvisorEvent("advisor.turn.completed", fields, () => 0);

    expect(Object.keys(record).sort()).toEqual(["at", "event", "model"]);
    expect(JSON.stringify(record)).not.toContain(KEY);
    expect(JSON.stringify(record)).not.toContain(MESSAGE);
  });

  it("replaces a free-form reason with REDACTED instead of logging it", () => {
    // A failure reason may be a model-authored limitation or a provider
    // sentence; only uppercase CODES may survive.
    const record = buildAdvisorEvent(
      "advisor.turn.degraded",
      { reason: "respuesta_no_emitida:grounding_failed by provider body" },
      () => 0,
    );
    expect(record.reason).toBe("REDACTED");
  });

  it("keeps a real code", () => {
    const record = buildAdvisorEvent("advisor.turn.degraded", { reason: "SESSION_UNKNOWN" }, () => 0);
    expect(record.reason).toBe("SESSION_UNKNOWN");
  });

  it("never logs a session id shape, even if one is smuggled in as a model", () => {
    const record = buildAdvisorEvent(
      "advisor.turn.completed",
      { model: "3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b" },
      () => 0,
    );
    expect(record.model).toBe("REDACTED");
  });
});

describe("CONV-02 · a broken sink cannot fail a turn", () => {
  it("swallows a logger that throws", () => {
    const throwing = (): void => {
      throw new Error("sink down");
    };
    expect(() => emitAdvisorEvent("advisor.turn.received", { model: "deepseek-flash" }, throwing)).not.toThrow();
  });
});

const scriptedFetch = () => {
  let call = 0;
  return vi.fn<typeof fetch>(async () => {
    call += 1;
    return call === 1 ? okResponse(listenJson) : okResponse(adviseJson);
  });
};

describe("CONV-02 · a real turn emits the turn's own events", () => {
  it("records received → understanding → advice → completed, with no visitor text", async () => {
    const records: AdvisorObservabilityRecord[] = [];
    const fetchImpl = scriptedFetch();

    const guard = createAdvisorGuard(
      DEFAULT_ADVISOR_LIMITS,
      createInMemoryGuardrailLedger(DEFAULT_ADVISOR_LIMITS),
    );
    const sessionId = startAdvisorSession().session_id;

    const run = await runConversationalTurn(
      { sessionId, message: MESSAGE },
      {
        guard,
        providerDeps: { fetchImpl: fetchImpl as never },
        logger: (record) => records.push(record),
      },
    );

    expect(run.ok).toBe(true);

    const events = records.map((record) => record.event);
    expect(events).toContain("advisor.turn.received");
    expect(events).toContain("advisor.understanding.completed");
    expect(events).toContain("advisor.advice.completed");
    expect(events).toContain("advisor.turn.completed");

    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain(KEY);
    expect(serialized).not.toContain(MESSAGE);
    expect(serialized).not.toContain(sessionId);
    expect(serialized).not.toContain("Entiendo: una pastelería");

    for (const record of records) {
      for (const key of Object.keys(record)) {
        expect(FORBIDDEN).not.toContain(key);
      }
    }

    const completed = records.find((record) => record.event === "advisor.turn.completed");
    expect(completed?.model).toBe("deepseek-flash");
    expect(completed?.turns_used).toBe(1);
  });

  it("a refused turn emits `advisor.turn.received` then `advisor.turn.refused`, and no turn events", async () => {
    const records: AdvisorObservabilityRecord[] = [];
    const guard = createAdvisorGuard(
      DEFAULT_ADVISOR_LIMITS,
      createInMemoryGuardrailLedger(DEFAULT_ADVISOR_LIMITS),
    );

    const run = await runConversationalTurn(
      { sessionId: "3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b", message: "Hola" },
      { guard, config: null, logger: (record) => records.push(record) },
    );

    expect(run.ok).toBe(false);
    // The request was received; it was then refused. Nothing after that: no
    // understanding, no advice, no completion.
    expect(records.map((record) => record.event)).toEqual([
      "advisor.turn.received",
      "advisor.turn.refused",
    ]);
    expect(records[1]?.reason).toBe("SESSION_UNKNOWN");
  });

  it("a sink that throws does not change the turn's answer", async () => {
    const fetchImpl = scriptedFetch();
    const guard = createAdvisorGuard(
      DEFAULT_ADVISOR_LIMITS,
      createInMemoryGuardrailLedger(DEFAULT_ADVISOR_LIMITS),
    );
    const sessionId = startAdvisorSession().session_id;

    const run = await runConversationalTurn(
      { sessionId, message: "¿Qué es CRIPQER?" },
      {
        guard,
        providerDeps: { fetchImpl: fetchImpl as never },
        logger: () => {
          throw new Error("sink down");
        },
      },
    );

    expect(run.ok).toBe(true);
  });
});
