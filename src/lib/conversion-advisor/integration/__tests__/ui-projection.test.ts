/**
 * CA-7.4-A — the public projection. PURE UNIT TESTS, no provider, no network.
 *
 * Weighted, like CA-7.2's suite, toward what the projection REFUSES to publish:
 * no session id, no denial kind, no usage, no latency, no internal marker, no
 * route, no URL, no action. Those are asserted over EVERY input the contract can
 * receive, not on one example, and two of them are asserted as byte-identity
 * between outputs that differ only in something that must stay invisible.
 *
 * Two properties here cannot be checked by reading the module:
 *  · COMPATIBILITY. For every outcome in the battery, `message` and `actions`
 *    equal what CA-7.2's adapter produces for the same outcome. That is what
 *    "compatible with the previous adapter" means as a measurement.
 *  · ISOLATION. The three new files' import lists are pinned exactly, so a new
 *    import has to be written into the expectation to pass.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SAFE_FAILURE_REPLY, type AdvisorResponse } from "../../advisor/response";
import { ACTION_REGISTRY } from "../../actions/registry";
import { adaptAdvisorToAgentResponse } from "../landing-adapter";
import {
  TURN_FAILURE_REASONS,
  type TurnFailureReason,
  type TurnOperationReport,
  type TurnOutcome,
} from "../contract";
import {
  ADVISOR_UI_NOTICE_TEXTS,
  OPEN_HELP_DESTINATION,
  UI_LIMITS,
  validateAdvisorUiResponse,
  type AdvisorUiResponse,
} from "../ui-contract";
import { GUARD_DENIAL_NOTICE_CODE, PROCESSING_MESSAGE, UNCONFIRMED_MESSAGE } from "../ui-state";
import { pendingAdvisorTurn, projectAdvisorTurn, type AdvisorTurnInput } from "../ui-projection";

const HERE = dirname(fileURLToPath(import.meta.url));
const INTEGRATION_DIR = join(HERE, "..");

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

function safeResponse(reason: string): AdvisorResponse {
  return advisorResponse({
    reply: SAFE_FAILURE_REPLY,
    relevant_capability_ids: [],
    grounding_status: "FALLBACK",
    limitations: [`respuesta_no_emitida:${reason}`],
  });
}

const answered = outcome();

const degradedButGrounded = outcome({
  degraded: true,
  degraded_reason: "UNDERSTANDING_FAILED:PROVIDER_FAILED",
  understanding: operationReport({
    usage: { status: "UNKNOWN" },
    failure_reason: "PROVIDER_FAILED",
  }),
});

const validatorFallback = outcome({
  degraded: false,
  response: safeResponse("VALIDATION_FAILED"),
});

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

/** CA-10B: the ONE turn shape that may produce an executable action. */
const offersHelp = outcome({
  response: advisorResponse({
    suggested_action: "OFFER_HELP",
    relevant_capability_ids: ["magic_editor"],
  }),
});

/** Same response, but the turn did not run as designed: no action may appear. */
const offersHelpDegraded = outcome({
  degraded: true,
  degraded_reason: "UNDERSTANDING_FAILED:PROVIDER_FAILED",
  response: offersHelp.response,
  understanding: operationReport({
    usage: { status: "UNKNOWN" },
    failure_reason: "PROVIDER_FAILED",
  }),
});

/** The two conditional actions that stay non-executable in this phase. */
const offersGuestEditor = outcome({
  response: advisorResponse({
    suggested_action: "OFFER_GUEST_EDITOR",
    relevant_capability_ids: ["crear_pagina"],
  }),
});

const suggestsFeature = outcome({
  response: advisorResponse({
    suggested_action: "SUGGEST_FEATURE",
    relevant_capability_ids: ["tarjetas_bio"],
  }),
});

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
  offersHelp,
  offersHelpDegraded,
  offersGuestEditor,
  suggestsFeature,
  ...DENIAL_KINDS.map((denial) => guardDenied(denial)),
];

function turnInputs(): readonly AdvisorTurnInput[] {
  return BATTERY.map((turn) => ({ kind: "turn", outcome: turn }) as const);
}

function allInputs(): readonly AdvisorTurnInput[] {
  return [
    ...turnInputs(),
    ...TURN_FAILURE_REASONS.map(
      (reason: TurnFailureReason) => ({ kind: "refusal", reason }) as const,
    ),
    { kind: "error" } as const,
  ];
}

function allOutputs(): readonly AdvisorUiResponse[] {
  return [pendingAdvisorTurn(), ...allInputs().map((input) => projectAdvisorTurn(input))];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

/* =========================== the leak probes ============================ */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const INTERNAL_MARKERS: readonly string[] = [
  "respuesta_no_emitida",
  "GUARD_DENIED",
  "degraded_reason",
  "BUDGET_EXHAUSTED",
  "SESSION_RATE_LIMIT",
  "GLOBAL_RATE_LIMIT",
  "KILL_SWITCH",
  "CIRCUIT_OPEN",
  "CONCURRENCY_LIMIT",
  "GUARD_UNAVAILABLE",
  "reservation",
  "latency",
  "attempts_reserved",
  "inputTokens",
  "outputTokens",
  "DEEPSEEK",
  "API_KEY",
  "provider",
  "session_id",
  "advisor:",
];

const ROUTE_MARKERS: readonly string[] = [
  "/crear-tarjeta",
  "/pages",
  "/editor",
  "/api/",
  "/landing",
  "http://",
  "https://",
  "www.",
];

/** Every string a projection can put in front of a visitor, serialized. */
function serialized(response: AdvisorUiResponse): string {
  return JSON.stringify(response);
}

function expectNoLeak(response: AdvisorUiResponse): void {
  const text = serialized(response);
  for (const marker of INTERNAL_MARKERS) expect(text).not.toContain(marker);
  for (const route of ROUTE_MARKERS) expect(text).not.toContain(route);
  expect(text).not.toMatch(UUID_RE);
}

/* ============================== the suite =============================== */

describe("CA-7.4-A — a turn in flight", () => {
  it("is PROCESSING, with the brief's own sentence and nothing else", () => {
    const pending = pendingAdvisorTurn();
    expect(pending.status).toBe("PROCESSING");
    expect(pending.message).toBe("Estamos preparando tu respuesta.");
    expect(pending.message).toBe(PROCESSING_MESSAGE);
    expect(pending.notice).toBeNull();
    expect(pending.actions).toEqual([]);
    expect(pending.conversation).toBeNull();
    expect(pending.version).toBe(1);
  });

  it("cannot claim the turn's numbers: it has none", () => {
    // A null here is the honest state; showing the previous turn's count would
    // be a false visual state, so the field is typed `null` on this variant.
    expect(pendingAdvisorTurn().conversation).toBeNull();
  });
});

describe("CA-7.4-A — the settled states", () => {
  it("projects an ANSWERED turn with no notice and the reply verbatim", () => {
    const projected = projectAdvisorTurn({ kind: "turn", outcome: answered });
    expect(projected.status).toBe("ANSWERED");
    expect(projected.message).toBe(answered.response.reply);
    expect(projected.notice).toBeNull();
    expect(projected.conversation).toEqual({ turns_used: 1, turns_remaining: 49 });
  });

  it("projects a degraded turn as DEGRADED, with the reply still verbatim", () => {
    const projected = projectAdvisorTurn({ kind: "turn", outcome: degradedButGrounded });
    expect(projected.status).toBe("DEGRADED");
    expect(projected.message).toBe(degradedButGrounded.response.reply);
    expect(projected.notice?.code).toBe("TURN_INCOMPLETE");
  });

  it("projects an unverified answer as FALLBACK, with CA-4's safe text", () => {
    const projected = projectAdvisorTurn({ kind: "turn", outcome: validatorFallback });
    expect(projected.status).toBe("FALLBACK");
    expect(projected.message).toBe(SAFE_FAILURE_REPLY);
    expect(projected.notice?.code).toBe("ANSWER_NOT_VERIFIED");
  });

  it("projects a guard denial as REFUSED, never as a fallback that merely failed", () => {
    const projected = projectAdvisorTurn({
      kind: "turn",
      outcome: guardDenied("BUDGET_EXHAUSTED"),
    });
    expect(projected.status).toBe("REFUSED");
    expect(projected.message).toBe(SAFE_FAILURE_REPLY);
    expect(projected.notice?.code).toBe(GUARD_DENIAL_NOTICE_CODE);
    // The counts are the server's own, unchanged: a refused turn keeps none.
    expect(projected.conversation).toEqual({ turns_used: 1, turns_remaining: 49 });
  });

  it("gives every state but ANSWERED a notice, and ANSWERED none", () => {
    for (const input of turnInputs()) {
      const projected = projectAdvisorTurn(input);
      const required = projected.status !== "ANSWERED";
      expect(projected.notice !== null).toBe(required);
      if (projected.notice !== null) {
        expect(projected.notice.text).toBe(ADVISOR_UI_NOTICE_TEXTS[projected.notice.code]);
      }
    }
  });
});

describe("CA-7.4-A — a refusal with no outcome", () => {
  it("answers every reason from the tables, and never from the caller", () => {
    for (const reason of TURN_FAILURE_REASONS) {
      const projected = projectAdvisorTurn({ kind: "refusal", reason });
      expect(projected.status).toBe("REFUSED");
      expect(projected.message.trim()).not.toBe("");
      expect(projected.notice).not.toBeNull();
      // Nothing was consulted, so there are no numbers to show — not even
      // zeros, which would be a count nobody measured.
      expect(projected.conversation).toBeNull();
    }
  });

  it("does not put the reason itself in front of a visitor", () => {
    for (const reason of TURN_FAILURE_REASONS) {
      const projected = projectAdvisorTurn({ kind: "refusal", reason });
      expect(serialized(projected)).not.toContain(reason);
    }
  });
});

describe("CA-7.4-A — an unconfirmed turn carries nothing", () => {
  it("projects ERROR with no counts and no claim about why", () => {
    const projected = projectAdvisorTurn({ kind: "error" });
    expect(projected.status).toBe("ERROR");
    expect(projected.message).toBe(UNCONFIRMED_MESSAGE);
    expect(projected.notice?.code).toBe("RESPONSE_UNCONFIRMED");
    expect(projected.conversation).toBeNull();
  });

  it("cannot publish a payload the variant does not have", () => {
    const hostile = {
      kind: "error",
      detail: "DEEPSEEK_API_KEY=sk-live-0000",
      stack: "Error: at runConversationalTurn (turn.server.ts:41)",
    } as unknown as AdvisorTurnInput;

    const projected = projectAdvisorTurn(hostile);
    expect(projected.status).toBe("ERROR");
    expect(serialized(projected)).not.toContain("DEEPSEEK_API_KEY");
    expect(serialized(projected)).not.toContain("turn.server.ts");
  });
});

describe("CA-7.4-A — what no output may ever carry", () => {
  it("leaks nothing, over every input the contract can receive", () => {
    for (const response of allOutputs()) expectNoLeak(response);
  });

  it("never publishes the session id, not even in a Debug shape", () => {
    for (const response of allOutputs()) {
      expect(Object.keys(response)).not.toContain("session_id");
      expect(serialized(response)).not.toContain(SESSION_ID);
    }
  });

  it("keeps the guard's denial kind invisible: outputs differing only in it are identical", () => {
    const budget = projectAdvisorTurn({ kind: "turn", outcome: guardDenied("BUDGET_EXHAUSTED") });
    const rate = projectAdvisorTurn({ kind: "turn", outcome: guardDenied("SESSION_RATE_LIMIT") });
    const kill = projectAdvisorTurn({ kind: "turn", outcome: guardDenied("KILL_SWITCH") });

    expect(serialized(budget)).toBe(serialized(rate));
    expect(serialized(rate)).toBe(serialized(kill));
  });

  it("invents no route and no URL in any state", () => {
    for (const response of allOutputs()) {
      for (const route of ROUTE_MARKERS) expect(serialized(response)).not.toContain(route);
    }
  });
});

describe("CA-10B — the ONE executable action", () => {
  it("pins the contract's literal to the registry's destination", () => {
    // The contract imports nothing, so its `/help` is necessarily a second
    // literal. This is the test its header promises: the two cannot drift.
    expect(OPEN_HELP_DESTINATION).toBe("/help");
    expect(ACTION_REGISTRY.OPEN_HELP.destination_id).toBe(OPEN_HELP_DESTINATION);
  });

  it("projects exactly one NAVIGATE_INTERNAL action for a grounded OFFER_HELP turn", () => {
    const projected = projectAdvisorTurn({ kind: "turn", outcome: offersHelp });
    expect(projected.actions).toEqual([
      {
        kind: "NAVIGATE_INTERNAL",
        action_id: "OPEN_HELP",
        destination: OPEN_HELP_DESTINATION,
      },
    ]);
  });

  it("names /help and nothing else, in every output the contract can produce", () => {
    let executableOutputs = 0;
    for (const response of allOutputs()) {
      expect(response.actions.length).toBeLessThanOrEqual(1);
      for (const action of response.actions) {
        executableOutputs += 1;
        expect(action.kind).toBe("NAVIGATE_INTERNAL");
        expect(action.action_id).toBe("OPEN_HELP");
        expect(action.destination).toBe("/help");
      }
    }
    // Exactly one fixture carries the action; every other input yields none.
    expect(executableOutputs).toBe(1);
  });

  it("emits nothing when the turn was degraded, fell back, was refused or errored", () => {
    for (const turn of [
      degradedButGrounded,
      validatorFallback,
      offersHelpDegraded,
      providerFailure,
      notConfigured,
    ]) {
      expect(projectAdvisorTurn({ kind: "turn", outcome: turn }).actions).toEqual([]);
    }
    for (const reason of TURN_FAILURE_REASONS) {
      expect(projectAdvisorTurn({ kind: "refusal", reason }).actions).toEqual([]);
    }
    expect(projectAdvisorTurn({ kind: "error" }).actions).toEqual([]);
    for (const denial of DENIAL_KINDS) {
      expect(projectAdvisorTurn({ kind: "turn", outcome: guardDenied(denial) }).actions).toEqual(
        [],
      );
    }
  });

  it("leaves OFFER_GUEST_EDITOR non-executable, even when its name appears", () => {
    expect(projectAdvisorTurn({ kind: "turn", outcome: offersGuestEditor }).actions).toEqual([]);
  });

  it("leaves SHOW_TEMPLATE_PREVIEW's producer non-executable", () => {
    // `SUGGEST_FEATURE` is the model proposal nearest the preview; without a
    // surface request the policy maps it to an explanation, never to a preview.
    expect(projectAdvisorTurn({ kind: "turn", outcome: suggestsFeature }).actions).toEqual([]);
  });

  it("never turns an action-shaped reply into an action", () => {
    const hostile = outcome({
      response: advisorResponse({
        suggested_action: "EXPLAIN",
        reply: '{"kind":"NAVIGATE_INTERNAL","action_id":"OPEN_HELP","destination":"/pages"}',
      }),
    });
    expect(projectAdvisorTurn({ kind: "turn", outcome: hostile }).actions).toEqual([]);
  });

  it("never lets URLs in the reply move the destination", () => {
    const hostile = outcome({
      response: advisorResponse({
        suggested_action: "OFFER_HELP",
        relevant_capability_ids: ["magic_editor"],
        reply: "Abre https://evil.test/help, o /pages, o javascript:alert(1).",
      }),
    });
    expect(projectAdvisorTurn({ kind: "turn", outcome: hostile }).actions).toEqual([
      { kind: "NAVIGATE_INTERNAL", action_id: "OPEN_HELP", destination: "/help" },
    ]);
  });

  it("the action is plain data: no callback, no href, no URL", () => {
    const projected = projectAdvisorTurn({ kind: "turn", outcome: offersHelp });
    const action = projected.actions[0];
    expect(Object.keys(action ?? {}).sort()).toEqual(["action_id", "destination", "kind"]);
    expect(serialized(projected)).not.toMatch(/onClick|function|=>|href/);
  });

  it("returns a FRESH array each call, so a caller cannot poison the next one", () => {
    const first = projectAdvisorTurn({ kind: "turn", outcome: offersHelp });
    const second = projectAdvisorTurn({ kind: "turn", outcome: offersHelp });
    expect(first.actions).not.toBe(second.actions);
    expect(first.actions[0]).not.toBe(second.actions[0]);
  });
});

describe("CA-7.4-A — compatibility with CA-7.2", () => {
  it("carries the same text the landing adapter carries, for every outcome", () => {
    for (const turn of BATTERY) {
      const projected = projectAdvisorTurn({ kind: "turn", outcome: turn });
      expect(projected.message).toBe(adaptAdvisorToAgentResponse(turn).text);
    }
  });

  it("keeps the landing adapter empty even where the UI contract carries navigation", () => {
    // CA-10B opened the UI contract's action slot, not CA-7.2's: `AgentAction`
    // has no internal-navigation member, so the adapter's crosswalk stays empty
    // for every id — including the one the UI contract can now execute.
    for (const turn of BATTERY) {
      expect(adaptAdvisorToAgentResponse(turn).actions).toEqual([]);

      const projected = projectAdvisorTurn({ kind: "turn", outcome: turn });
      if (projected.actions.length > 0) {
        expect(projected.actions).toEqual([
          { kind: "NAVIGATE_INTERNAL", action_id: "OPEN_HELP", destination: "/help" },
        ]);
      }
    }
  });

  it("rewrites nothing: the validated reply survives the projection byte for byte", () => {
    const reply = answered.response.reply;
    const projected = projectAdvisorTurn({ kind: "turn", outcome: answered });
    expect(projected.message).toBe(reply);
    expect(projected.message.length).toBe(reply.length);
  });
});

describe("CA-7.4-A — determinism, immutability, serializability", () => {
  it("is deterministic: the same input yields a deep-equal output", () => {
    for (const input of allInputs()) {
      expect(projectAdvisorTurn(input)).toEqual(projectAdvisorTurn(input));
      expect(serialized(projectAdvisorTurn(input))).toBe(serialized(projectAdvisorTurn(input)));
    }
  });

  it("never mutates its input, even a frozen one", () => {
    for (const turn of BATTERY) {
      const frozen = deepFreeze(structuredClone(turn));
      const before = JSON.stringify(frozen);
      const projected = projectAdvisorTurn({ kind: "turn", outcome: frozen });
      expect(JSON.stringify(frozen)).toBe(before);
      expect(projected.status).toBe(projectAdvisorTurn({ kind: "turn", outcome: turn }).status);
    }
  });

  it("produces plain data: a JSON round-trip changes nothing", () => {
    for (const response of allOutputs()) {
      expect(JSON.parse(JSON.stringify(response))).toEqual(response);
    }
  });

  it("validates every output it produces", () => {
    for (const response of allOutputs()) {
      expect(validateAdvisorUiResponse(response)).toEqual({ ok: true, problems: [] });
    }
  });

  it("respects the message bound it advertises", () => {
    for (const response of allOutputs()) {
      expect(response.message.length).toBeLessThanOrEqual(UI_LIMITS.maxMessageChars);
    }
  });
});

/* ======================= the files reach nothing ======================== */

function stripComments(source: string): string {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlocks
    .split("\n")
    .map((line) => {
      const index = line.indexOf("//");
      return index === -1 ? line : line.slice(0, index);
    })
    .join("\n");
}

const IMPORT_RE = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g;

interface ExpectedEdge {
  readonly specifier: string;
  readonly typeOnly: boolean;
}

/**
 * The import list of each new file, pinned EXACTLY.
 *
 * A new import has to be added here to pass, which is how it gets reviewed. All
 * three land inside the module, so none of them can reach a server module, a
 * credential or the environment.
 */
const EXPECTED_IMPORTS: Readonly<Record<string, readonly ExpectedEdge[]>> = {
  "ui-contract.ts": [],
  "ui-state.ts": [
    { specifier: "./ui-contract", typeOnly: true },
    { specifier: "./contract", typeOnly: true },
  ],
  "ui-projection.ts": [
    // CA-10B: the trusted registry and the stricter revalidation, both
    // client-safe and side-effect free.
    { specifier: "../actions/policy", typeOnly: false },
    { specifier: "../actions/registry", typeOnly: false },
    { specifier: "./ui-contract", typeOnly: true },
    { specifier: "./ui-contract", typeOnly: false },
    { specifier: "./ui-state", typeOnly: false },
    { specifier: "./contract", typeOnly: true },
  ],
};

function edgesOf(file: string): readonly ExpectedEdge[] {
  const source = readFileSync(join(INTEGRATION_DIR, file), "utf8");
  return [...stripComments(source).matchAll(IMPORT_RE)].map((match) => ({
    specifier: match[3] ?? "",
    typeOnly: match[1] === "type ",
  }));
}

const label = (edge: ExpectedEdge) => `${edge.specifier}${edge.typeOnly ? " (type)" : ""}`;

describe("CA-7.4-A — the new files are client-safe by source", () => {
  it("imports exactly the pinned list, and every edge stays inside the module", () => {
    for (const [file, expected] of Object.entries(EXPECTED_IMPORTS)) {
      const edges = edgesOf(file);
      expect(edges.map(label).sort()).toEqual(expected.map(label).sort());
      for (const edge of edges) {
        expect(edge.specifier.startsWith(".")).toBe(true);
        expect(edge.specifier).not.toContain(".server");
        expect(edge.specifier).not.toContain("guardrails");
        expect(edge.specifier).not.toContain("preview");
      }
    }
  });

  it("never reads the environment, the clock, randomness or the network", () => {
    for (const file of Object.keys(EXPECTED_IMPORTS)) {
      const source = stripComments(readFileSync(join(INTEGRATION_DIR, file), "utf8"));
      for (const forbidden of [
        "process.env",
        "Date.now",
        "Math.random",
        "fetch(",
        "XMLHttpRequest",
        "import(",
        "localStorage",
      ]) {
        expect(source).not.toContain(forbidden);
      }
    }
  });

  it("still ships no route file of its own", () => {
    for (const file of Object.keys(EXPECTED_IMPORTS)) {
      expect(file.endsWith(".tsx")).toBe(false);
    }
  });
});
