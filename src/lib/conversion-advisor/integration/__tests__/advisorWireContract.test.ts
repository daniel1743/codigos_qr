/**
 * CONV-02 · the wire contract between the landing and the advisor.
 *
 * The `createServerFn` validator is the only code that sees what a browser sent.
 * These tests hold the three things it must never stop doing:
 *
 *  1. PARSE INTO A FRESH OBJECT. Not a spread of the caller's object: keys the
 *     caller invented must be refused, and the object handed downstream must not
 *     be the one the caller still holds a reference to.
 *  2. TRUST NO DERIVED FACT. `readyForPage` and `expectedSlot` are recomputed
 *     from the facts that were validated. A client that asserts "ready" on an
 *     empty context must be told "not ready".
 *  3. PUBLISH NOTHING EXTRA. `toPublicTurnResult` names every field; no usage,
 *     no denial reason, no latency, no provider body can ride along.
 */
import { describe, expect, it } from "vitest";

import {
  ASSISTANT_TURN_FAILURE_CODES,
  TURN_FAILURE_REASONS,
  TURN_LIMITS,
  toPublicTurnResult,
  validateTurnRequest,
  type TurnOutcome,
} from "../contract";
import {
  LANDING_CONTEXT_LIMITS,
  sanitizeLandingContext,
} from "../landing-context";

const SESSION = "3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b";

const EMPTY = {
  businessType: null,
  goal: null,
  channel: null,
  selectedTemplateId: null,
  lastShownTemplateIds: [],
  readyForPage: false,
  expectedSlot: null,
};

const COMPLETE = {
  businessType: "bakery",
  goal: "orders",
  channel: "whatsapp",
  selectedTemplateId: "warm_care",
  lastShownTemplateIds: ["warm_care", "dark_craft"],
  readyForPage: false,
  expectedSlot: null,
};

describe("CONV-02 · a valid request becomes a fresh, minimal object", () => {
  it("keeps exactly the three request keys and does not alias the caller's object", () => {
    const landingContext = { ...EMPTY, expectedSlot: "type" };
    const input = { sessionId: SESSION, message: "  Hola  ", landingContext };

    const result = validateTurnRequest(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.request).sort()).toEqual(["landingContext", "message", "sessionId"]);
    expect(result.request.message).toBe("Hola");
    expect(result.request).not.toBe(input);
    expect(result.request.landingContext).not.toBe(landingContext);
    expect(result.request.landingContext?.lastShownTemplateIds).not.toBe(
      landingContext.lastShownTemplateIds,
    );
  });

  it("accepts an absent landingContext as 'no product state'", () => {
    const result = validateTurnRequest({ sessionId: SESSION, message: "Hola" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.landingContext).toBeNull();
  });

  it("trims the ids it keeps and collapses duplicates", () => {
    const result = sanitizeLandingContext({
      ...EMPTY,
      lastShownTemplateIds: [" warm_care ", "warm_care", "dark_craft"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.value === null) return;
    expect(result.value.lastShownTemplateIds).toEqual(["warm_care", "dark_craft"]);
  });
});

describe("CONV-02 · what the edge refuses", () => {
  const refusals: [string, unknown][] = [
    ["an unknown top-level key", { sessionId: SESSION, message: "Hola", config: {} }],
    [
      "an unknown landing key",
      { sessionId: SESSION, message: "Hola", landingContext: { ...EMPTY, admin: true } },
    ],
    [
      "a business type outside the catalog",
      { sessionId: SESSION, message: "Hola", landingContext: { ...EMPTY, businessType: "bank" } },
    ],
    [
      "a template id outside the catalog",
      {
        sessionId: SESSION,
        message: "Hola",
        landingContext: { ...EMPTY, selectedTemplateId: "imported_from_worktree" },
      },
    ],
    [
      "a channel outside the catalog",
      { sessionId: SESSION, message: "Hola", landingContext: { ...EMPTY, channel: "fax" } },
    ],
    [
      "more than four shown templates",
      {
        sessionId: SESSION,
        message: "Hola",
        landingContext: {
          ...EMPTY,
          lastShownTemplateIds: ["warm_care", "dark_craft", "soft_beauty", "food_story", "minimal_premium"],
        },
      },
    ],
    [
      "a non-boolean readyForPage",
      { sessionId: SESSION, message: "Hola", landingContext: { ...EMPTY, readyForPage: "yes" } },
    ],
    [
      "an expectedSlot outside the vocabulary",
      { sessionId: SESSION, message: "Hola", landingContext: { ...EMPTY, expectedSlot: "pricing" } },
    ],
    [
      "a landing context that is not an object",
      { sessionId: SESSION, message: "Hola", landingContext: "bakery" },
    ],
    ["an over-long message", { sessionId: SESSION, message: "x".repeat(TURN_LIMITS.maxMessageChars + 1) }],
    ["an empty message", { sessionId: SESSION, message: "   " }],
    ["a non-uuid session", { sessionId: "session-1", message: "Hola" }],
  ];

  for (const [label, input] of refusals) {
    it(`refuses ${label}`, () => {
      const result = validateTurnRequest(input);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe("INVALID_INPUT");
    });
  }
});

describe("CONV-02 · derived facts are recomputed, never accepted", () => {
  it("a client cannot mark an empty landing as ready for a page", () => {
    const result = sanitizeLandingContext({ ...EMPTY, readyForPage: true, expectedSlot: "type" });
    expect(result.ok).toBe(true);
    if (!result.ok || result.value === null) return;
    expect(result.value.readyForPage).toBe(false);
  });

  it("a complete landing is ready even if the client says it is not", () => {
    const result = sanitizeLandingContext(COMPLETE);
    expect(result.ok).toBe(true);
    if (!result.ok || result.value === null) return;
    expect(result.value.readyForPage).toBe(true);
  });

  it("readiness does not hinge on a goal the visitor never gave", () => {
    // Whether a goal is required depends on the business type's own question,
    // which the landing evaluates locally. The wire stays conservative.
    const result = sanitizeLandingContext({ ...COMPLETE, goal: null });
    expect(result.ok).toBe(true);
    if (!result.ok || result.value === null) return;
    expect(result.value.readyForPage).toBe(true);
  });

  it("recomputes expectedSlot from the facts, in the planner's own order", () => {
    const cases: [Record<string, unknown>, string | null][] = [
      [EMPTY, "type"],
      // Only a business type with its own goal question asks for a goal.
      [{ ...EMPTY, businessType: "real_estate" }, "goal"],
      [{ ...EMPTY, businessType: "real_estate", goal: "leads" }, "template"],
      [{ ...EMPTY, businessType: "bakery" }, "template"],
      [{ ...EMPTY, businessType: "bakery", selectedTemplateId: "warm_care" }, "channel"],
      [COMPLETE, null],
    ];

    for (const [facts, expected] of cases) {
      const result = sanitizeLandingContext({ ...facts, expectedSlot: "channel" });
      expect(result.ok).toBe(true);
      if (!result.ok || result.value === null) continue;
      expect(result.value.expectedSlot).toBe(expected);
    }
  });

  it("is bounded by the four-card viewport", () => {
    expect(LANDING_CONTEXT_LIMITS.maxLastShown).toBe(4);
  });
});

describe("CONV-02 · the public projection is a named list", () => {
  const outcome: TurnOutcome = {
    session_id: SESSION,
    model: "deepseek-flash",
    response: {
      reply: "Te muestro estilos para una pastelería.",
      detected_intents: ["DISCOVERY"],
      relevant_capability_ids: ["landing_templates"],
      suggested_action: "EXPLAIN",
      confidence: 0.8,
      limitations: [],
      grounding_status: "GROUNDED",
    },
    degraded: false,
    degraded_reason: null,
    understanding: {
      reservation: "GRANTED",
      denied_reason: null,
      usage: { status: "REPORTED", usage: { inputTokens: 10, outputTokens: 5 } },
      latency_ms: 120,
      attempts_reserved: 2,
      failure_reason: null,
    },
    commercial_advice: {
      reservation: "GRANTED",
      denied_reason: null,
      usage: { status: "UNKNOWN" },
      latency_ms: 200,
      attempts_reserved: 2,
      failure_reason: null,
    },
    latency_ms: { understanding: 120, commercial_advice: 200, total: 320 },
    session: { turns_used: 1, turns_remaining: 49 },
    persisted: true,
  };

  it("publishes the model and exactly the eleven public fields", () => {
    const published = toPublicTurnResult(outcome);
    expect(Object.keys(published).sort()).toEqual(
      [
        "degraded",
        "detected_intents",
        "grounding_status",
        "limitations",
        "model",
        "relevant_capability_ids",
        "reply",
        "session_id",
        "suggested_action",
        "turns_remaining",
        "turns_used",
      ].sort(),
    );
    expect(published.model).toBe("deepseek-flash");
  });

  it("carries no diagnostic the guard would not want a browser to read", () => {
    const serialized = JSON.stringify(toPublicTurnResult(outcome));
    for (const forbidden of ["reservation", "denied_reason", "latency", "attempts_reserved", "usage"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("publishes null rather than a made-up model when no provider answered", () => {
    expect(toPublicTurnResult({ ...outcome, model: null }).model).toBeNull();
  });
});

describe("CONV-02 · the failure union is closed", () => {
  it("is the four turn reasons plus UNAVAILABLE, and nothing else", () => {
    expect([...ASSISTANT_TURN_FAILURE_CODES]).toEqual([
      ...TURN_FAILURE_REASONS,
      "UNAVAILABLE",
    ]);
    expect(TURN_FAILURE_REASONS).toEqual([
      "INVALID_INPUT",
      "SESSION_UNKNOWN",
      "TURN_LIMIT_REACHED",
      "PROVIDER_MISCONFIGURED",
    ]);
  });
});
