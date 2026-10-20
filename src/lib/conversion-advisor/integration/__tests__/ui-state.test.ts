/**
 * CA-7.4-A — the conversational state machine. PURE UNIT TESTS, no provider.
 *
 * Every fixture is built to match what CA-7.1B really returns, field by field:
 * a guard denial carries `reservation: "DENIED"` on the report that was refused
 * and `NOT_INVOKED` usage; a provider failure carries `GRANTED` with `UNKNOWN`
 * usage, because the call happened and its cost is unmeasurable. Getting those
 * two right is what makes the classification tests mean anything.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SAFE_FAILURE_REPLY, type AdvisorResponse } from "../../advisor/response";
import {
  TURN_FAILURE_REASONS,
  type TurnFailureReason,
  type TurnOperationReport,
  type TurnOutcome,
} from "../contract";
import {
  PROCESSING_MESSAGE,
  REFUSAL_MESSAGES,
  REFUSAL_NOTICE_CODES,
  SETTLED_NOTICE_CODES,
  UNCONFIRMED_MESSAGE,
  classifyAdvisorTurn,
  guardRefused,
} from "../ui-state";
import {
  ADVISOR_UI_NOTICE_CODES,
  ADVISOR_UI_NOTICE_TEXTS,
  ADVISOR_UI_STATUSES,
  UI_LIMITS,
  type AdvisorSettledStatus,
} from "../ui-contract";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ============================== fixtures ================================ */

const SESSION_ID = "3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b";

function operationReport(patch: Partial<TurnOperationReport> = {}): TurnOperationReport {
  return {
    reservation: "GRANTED",
    denied_reason: null,
    usage: { status: "REPORTED", usage: { inputTokens: 200, outputTokens: 50 } },
    latency_ms: 42,
    attempts_reserved: 1,
    failure_reason: null,
    ...patch,
  };
}

function advisorResponse(patch: Partial<AdvisorResponse> = {}): AdvisorResponse {
  return {
    reply: "Cripqer crea páginas profesionales para tu negocio en segundos.",
    detected_intents: ["DISCOVERY"],
    relevant_capability_ids: ["tarjetas_bio"],
    suggested_action: "EXPLAIN",
    confidence: 0.8,
    limitations: [],
    grounding_status: "GROUNDED",
    ...patch,
  };
}

function outcome(patch: Partial<TurnOutcome> = {}): TurnOutcome {
  return {
    session_id: SESSION_ID,
    model: "deepseek-flash",
    response: advisorResponse(),
    degraded: false,
    degraded_reason: null,
    understanding: operationReport(),
    commercial_advice: operationReport(),
    latency_ms: { understanding: 40, commercial_advice: 35, total: 80 },
    session: { turns_used: 1, turns_remaining: 49 },
    persisted: true,
    ...patch,
  };
}

/** CA-4's own safe reply, as a turn that produced it really looks. */
function safeResponse(reason: string): AdvisorResponse {
  return advisorResponse({
    reply: SAFE_FAILURE_REPLY,
    relevant_capability_ids: [],
    grounding_status: "FALLBACK",
    limitations: [`respuesta_no_emitida:${reason}`],
  });
}

/** Ran as designed, grounded answer. */
const answered = outcome();

/** A grounded answer from a turn whose understanding failed at the provider. */
const degradedButGrounded = outcome({
  degraded: true,
  degraded_reason: "UNDERSTANDING_FAILED:PROVIDER_FAILED",
  understanding: operationReport({
    usage: { status: "UNKNOWN" },
    failure_reason: "PROVIDER_FAILED",
  }),
});

/** The validator rejected the model's answer: not degradation, a refusal to publish. */
const validatorFallback = outcome({
  degraded: false,
  degraded_reason: null,
  response: safeResponse("VALIDATION_FAILED"),
});

/** The provider failed outright: degraded AND unverified. */
const providerFailure = outcome({
  degraded: true,
  degraded_reason: "COMMERCIAL_FAILED:PROVIDER_FAILED",
  response: safeResponse("COMMERCIAL_FAILED:PROVIDER_FAILED"),
  understanding: operationReport({
    usage: { status: "UNKNOWN" },
    failure_reason: "PROVIDER_FAILED",
  }),
  commercial_advice: operationReport({
    usage: { status: "UNKNOWN" },
    failure_reason: "PROVIDER_FAILED",
  }),
  persisted: false,
});

/** Not configured: no reservation was ever requested, and nothing was consulted. */
const notConfigured = outcome({
  degraded: true,
  degraded_reason: "PROVIDER_NOT_CONFIGURED",
  response: safeResponse("PROVIDER_NOT_CONFIGURED"),
  understanding: operationReport({
    reservation: "NOT_REQUESTED",
    usage: { status: "NOT_INVOKED" },
    latency_ms: null,
  }),
  commercial_advice: operationReport({
    reservation: "NOT_REQUESTED",
    usage: { status: "NOT_INVOKED" },
    latency_ms: null,
  }),
  persisted: false,
});

/** The ledger refused the understanding: nothing ran, nothing was spent. */
function guardDenied(denial: string): TurnOutcome {
  return outcome({
    degraded: true,
    degraded_reason: `GUARD_DENIED:${denial}`,
    response: safeResponse(`GUARD_DENIED:${denial}`),
    understanding: operationReport({
      reservation: "DENIED",
      denied_reason: denial as TurnOperationReport["denied_reason"],
      usage: { status: "NOT_INVOKED" },
      latency_ms: null,
    }),
    commercial_advice: operationReport({
      reservation: "DENIED",
      denied_reason: denial as TurnOperationReport["denied_reason"],
      usage: { status: "NOT_INVOKED" },
      latency_ms: null,
    }),
    persisted: false,
  });
}

/** The understanding ran; the ledger refused only the commercial step. */
function commercialDenied(denial: string): TurnOutcome {
  return outcome({
    degraded: true,
    degraded_reason: `GUARD_DENIED:${denial}`,
    response: safeResponse(`GUARD_DENIED:${denial}`),
    commercial_advice: operationReport({
      reservation: "DENIED",
      denied_reason: denial as TurnOperationReport["denied_reason"],
      usage: { status: "NOT_INVOKED" },
      latency_ms: null,
    }),
    persisted: false,
  });
}

const DENIAL_KINDS = [
  "KILL_SWITCH",
  "CIRCUIT_OPEN",
  "CONCURRENCY_LIMIT",
  "SESSION_RATE_LIMIT",
  "GLOBAL_RATE_LIMIT",
  "BUDGET_EXHAUSTED",
  "GUARD_UNAVAILABLE",
] as const;

const BATTERY: readonly TurnOutcome[] = [
  answered,
  degradedButGrounded,
  validatorFallback,
  providerFailure,
  notConfigured,
  ...DENIAL_KINDS.map((denial) => guardDenied(denial)),
  ...DENIAL_KINDS.map((denial) => commercialDenied(denial)),
];

/* ============================== the suite =============================== */

describe("CA-7.4-A — classification", () => {
  it("classifies a grounded, undegraded turn as ANSWERED", () => {
    expect(classifyAdvisorTurn(answered)).toBe("ANSWERED");
  });

  it("classifies a grounded answer from a degraded turn as DEGRADED", () => {
    expect(classifyAdvisorTurn(degradedButGrounded)).toBe("DEGRADED");
  });

  it("classifies a validation rejection as FALLBACK even though the turn was not degraded", () => {
    // CA-7.1B is explicit that a validator rejection is the safety system
    // working, not degradation — and the text is still not verified advice.
    expect(validatorFallback.degraded).toBe(false);
    expect(classifyAdvisorTurn(validatorFallback)).toBe("FALLBACK");
  });

  it("classifies a provider failure as FALLBACK, not DEGRADED: the text decides first", () => {
    expect(providerFailure.degraded).toBe(true);
    expect(classifyAdvisorTurn(providerFailure)).toBe("FALLBACK");
  });

  it("classifies an unconfigured provider as FALLBACK — no reservation was ever asked for", () => {
    expect(notConfigured.understanding.reservation).toBe("NOT_REQUESTED");
    expect(guardRefused(notConfigured)).toBe(false);
    expect(classifyAdvisorTurn(notConfigured)).toBe("FALLBACK");
  });

  it("classifies a guard denial as REFUSED, over FALLBACK", () => {
    for (const denial of DENIAL_KINDS) {
      expect(classifyAdvisorTurn(guardDenied(denial))).toBe("REFUSED");
    }
  });

  it("classifies a commercial-only denial as REFUSED too", () => {
    for (const denial of DENIAL_KINDS) {
      expect(classifyAdvisorTurn(commercialDenied(denial))).toBe("REFUSED");
    }
  });

  it("reads only WHETHER the guard refused, never WHICH condition fired", () => {
    const statuses = new Set(
      DENIAL_KINDS.map((denial) => classifyAdvisorTurn(guardDenied(denial))),
    );
    expect([...statuses]).toEqual(["REFUSED"]);
  });

  it("is total over the battery and never returns PROCESSING", () => {
    for (const turn of BATTERY) {
      const status = classifyAdvisorTurn(turn);
      expect(ADVISOR_UI_STATUSES).toContain(status);
      expect(status).not.toBe("PROCESSING");
    }
  });

  it("cannot return PROCESSING even at the TYPE level", () => {
    // If PROCESSING were ever added to the settled set, this stops compiling.
    type ProcessingIsSettled = "PROCESSING" extends AdvisorSettledStatus ? true : false;
    const impossible: ProcessingIsSettled = false;
    expect(impossible).toBe(false);
  });

  it("is deterministic: the same turn always classifies the same way", () => {
    for (const turn of BATTERY) {
      expect(classifyAdvisorTurn(turn)).toBe(classifyAdvisorTurn(turn));
    }
  });
});

describe("CA-7.4-A — guardRefused", () => {
  it("is true when the understanding was refused, and when only the advice was", () => {
    expect(guardRefused(guardDenied("BUDGET_EXHAUSTED"))).toBe(true);
    expect(guardRefused(commercialDenied("SESSION_RATE_LIMIT"))).toBe(true);
  });

  it("is false when a reservation was granted, and when none was asked for", () => {
    expect(guardRefused(answered)).toBe(false);
    expect(guardRefused(providerFailure)).toBe(false);
    expect(guardRefused(notConfigured)).toBe(false);
  });
});

describe("CA-7.4-A — the notice tables", () => {
  it("maps every settled state except ANSWERED to a known code", () => {
    expect(Object.keys(SETTLED_NOTICE_CODES).sort()).toEqual([
      "DEGRADED",
      "ERROR",
      "FALLBACK",
      "REFUSED",
    ]);
    for (const code of Object.values(SETTLED_NOTICE_CODES)) {
      expect(ADVISOR_UI_NOTICE_CODES).toContain(code);
    }
  });

  it("leaves ANSWERED without a notice, which is the contract's own rule", () => {
    expect(Object.keys(SETTLED_NOTICE_CODES)).not.toContain("ANSWERED");
  });

  it("classifies every CA-7.1B failure reason — the closed set is pinned", () => {
    expect(Object.keys(REFUSAL_NOTICE_CODES).sort()).toEqual([...TURN_FAILURE_REASONS].sort());
    expect(Object.keys(REFUSAL_MESSAGES).sort()).toEqual([...TURN_FAILURE_REASONS].sort());
    for (const reason of TURN_FAILURE_REASONS) {
      expect(ADVISOR_UI_NOTICE_CODES).toContain(REFUSAL_NOTICE_CODES[reason]);
      expect(REFUSAL_MESSAGES[reason].trim()).not.toBe("");
      expect(REFUSAL_MESSAGES[reason].length).toBeLessThanOrEqual(UI_LIMITS.maxMessageChars);
    }
  });

  it("gives each refusal reason its own sentence, so no two read alike", () => {
    const messages = TURN_FAILURE_REASONS.map(
      (reason: TurnFailureReason) => REFUSAL_MESSAGES[reason],
    );
    expect(new Set(messages).size).toBe(TURN_FAILURE_REASONS.length);
  });

  it("never writes an internal reason into refusal copy", () => {
    for (const reason of TURN_FAILURE_REASONS) {
      const notice = ADVISOR_UI_NOTICE_TEXTS[REFUSAL_NOTICE_CODES[reason]];
      expect(REFUSAL_MESSAGES[reason]).not.toContain(reason);
      expect(notice).not.toContain(reason);
    }
  });
});

describe("CA-7.4-A — client-local copy", () => {
  it("uses the brief's own sentence for a turn in flight", () => {
    expect(PROCESSING_MESSAGE).toBe("Estamos preparando tu respuesta.");
  });

  it("states only what is true when nothing came back", () => {
    expect(UNCONFIRMED_MESSAGE.trim()).not.toBe("");
    expect(UNCONFIRMED_MESSAGE).not.toContain("asesor");
  });
});

describe("CA-7.4-A — ui-state.ts depends on nothing at runtime", () => {
  const source = readFileSync(join(HERE, "..", "ui-state.ts"), "utf8");

  it("imports exactly two files, and every edge is type-only", () => {
    const edges = [
      ...source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g),
    ];
    const specifiers = edges.map((edge) => edge[3] ?? "").sort();
    expect(specifiers).toEqual(["./contract", "./ui-contract"]);
    // Every binding carries `type`, so the compiler erases the whole file's
    // dependency graph: nothing here can reach the provider or the ledger.
    for (const edge of edges) {
      expect(edge[1]).toBe("type ");
    }
  });

  it("never names a server module, the environment, the clock or randomness", () => {
    const clean = source.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const forbidden of [
      ".server",
      "guardrails",
      "provider.server",
      "process.env",
      "Date.now",
      "Math.random",
      "fetch(",
    ]) {
      expect(clean).not.toContain(forbidden);
    }
  });
});
