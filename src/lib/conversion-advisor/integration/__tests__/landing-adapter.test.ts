/**
 * CA-7.2 — the landing adapter. PURE UNIT TESTS, no provider, no network.
 *
 * Every test builds a `TurnOutcome` by hand and asserts on the `AgentResponse`
 * the adapter returns. Nothing here calls DeepSeek, reads the environment or
 * touches the landing's React code; the landing is read only as a TYPE, to pin
 * the target contract.
 *
 * The suite is deliberately weighted toward NEGATIVE guarantees — no privileged
 * action, no invented id, no invented route, no secret, no server-only import —
 * because the adapter's whole value is what it REFUSES to pass through.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  AgentAction,
  AgentResponse,
} from "../../../../features/approved-chat-landing/types/cripqer";
import { ACTION_IDS, nextBestActionToActionId, type ActionId } from "../../actions/registry";
import { STRATEGIES } from "../../advisor/strategy";
import { SAFE_FAILURE_REPLY, type AdvisorResponse } from "../../advisor/response";
import { NEXT_BEST_ACTIONS } from "../../intents/contract";
import type { TurnOperationReport, TurnOutcome } from "../contract";
import {
  LANDING_ACTION_CROSSWALK,
  LANDING_CONTRACT_GAPS,
  adaptAdvisorToAgentResponse,
  landingActionsForActionId,
  mayActOnLanding,
} from "../landing-adapter";

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

/** A complete, valid turn. Every test starts here and changes one thing. */
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

/** A turn whose provider work failed in a named way. */
function degradedTurn(reason: string): TurnOutcome {
  return outcome({
    degraded: true,
    degraded_reason: reason,
    response: advisorResponse({
      reply: SAFE_FAILURE_REPLY,
      relevant_capability_ids: [],
      grounding_status: "FALLBACK",
      limitations: [`respuesta_no_emitida:${reason}`],
    }),
    understanding: operationReport({
      reservation: "DENIED",
      denied_reason: null,
      usage: { status: "NOT_INVOKED" },
      latency_ms: null,
      failure_reason: reason,
    }),
    commercial_advice: operationReport({
      reservation: "DENIED",
      usage: { status: "NOT_INVOKED" },
      latency_ms: null,
      failure_reason: reason,
    }),
    persisted: false,
  });
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

/* ============================== the suite =============================== */

describe("adaptAdvisorToAgentResponse — text", () => {
  it("1. a valid commercial reply is carried verbatim, with no invented action", () => {
    const res = adaptAdvisorToAgentResponse(outcome());
    expect(res.text).toBe("Cripqer crea páginas profesionales para tu negocio en segundos.");
    expect(res.actions).toEqual([]);
  });

  it("2. limitations are NOT carried — the landing contract has no field for them", () => {
    const res = adaptAdvisorToAgentResponse(
      outcome({
        response: advisorResponse({
          reply: "Te explico cómo funciona el QR dinámico.",
          limitations: ["disponible_plan_premium", "sin_dominio_propio"],
        }),
      }),
    );
    // The reply is untouched: the limitations are neither appended nor merged.
    expect(res.text).toBe("Te explico cómo funciona el QR dinámico.");
    expect(res.text).not.toContain("disponible_plan_premium");
    // And no field was invented to smuggle them through.
    expect(Object.keys(res).sort()).toEqual(["actions", "text"]);
    // The gap is recorded in code, not silently dropped.
    expect(LANDING_CONTRACT_GAPS.limitations).toMatch(/no field/i);
  });

  it("16. a response with no action yields an empty action list", () => {
    const res = adaptAdvisorToAgentResponse(
      outcome({ response: advisorResponse({ suggested_action: "NONE" }) }),
    );
    expect(res.actions).toEqual([]);
    expect(res.text.length).toBeGreaterThan(0);
  });

  it("17. the safe fallback reply is preserved exactly", () => {
    const res = adaptAdvisorToAgentResponse(degradedTurn("PROVIDER_UNAVAILABLE"));
    expect(res.text).toBe(SAFE_FAILURE_REPLY);
  });
});

describe("adaptAdvisorToAgentResponse — degraded turns never act", () => {
  const cases: readonly [string, string][] = [
    ["3. a degraded turn", "UNDERSTANDING_FAILED:TIMEOUT"],
    ["4. a provider failure", "COMMERCIAL_FAILED:PROVIDER_UNAVAILABLE"],
    ["5. an exhausted budget", "GUARD_DENIED:BUDGET_EXHAUSTED"],
    ["6. a session rate limit", "GUARD_DENIED:SESSION_RATE_LIMIT"],
    ["7. an open circuit breaker", "GUARD_DENIED:CIRCUIT_OPEN"],
    ["7b. an active kill switch", "GUARD_DENIED:KILL_SWITCH"],
  ];

  it.each(cases)("%s produces no executable action", (_label, reason) => {
    const res = adaptAdvisorToAgentResponse(degradedTurn(reason));
    expect(res.actions).toEqual([]);
    // Even though the outcome's diagnostics are rich, none of them leaks out.
    expect(JSON.stringify(res)).not.toContain(reason);
  });

  it("security: a degraded turn that still looks grounded still may not act", () => {
    // Belt and braces: even if a future change let a degraded turn keep a
    // GROUNDED status, `degraded` alone must still stop it.
    const res = adaptAdvisorToAgentResponse(
      outcome({ degraded: true, degraded_reason: "X", response: advisorResponse() }),
    );
    expect(res.actions).toEqual([]);
  });

  it("security: an ungrounded answer may not act", () => {
    const res = adaptAdvisorToAgentResponse(
      outcome({ response: advisorResponse({ grounding_status: "FALLBACK" }) }),
    );
    expect(res.actions).toEqual([]);
  });

  it("security: the may-act gate refuses directly, not merely via the empty table", () => {
    // The crosswalk is empty today, so `actions` would be empty even with no
    // gate at all. These assertions prove the GATE ITSELF refuses, which is the
    // property a future non-empty crosswalk depends on.
    expect(mayActOnLanding(outcome())).toBe(true);
    // Degraded while still looking grounded: `degraded` alone must refuse.
    expect(mayActOnLanding(outcome({ degraded: true, degraded_reason: "X" }))).toBe(false);
    // Ungrounded while not marked degraded: the status alone must refuse.
    expect(
      mayActOnLanding(outcome({ response: advisorResponse({ grounding_status: "FALLBACK" }) })),
    ).toBe(false);
    // Both, and every degraded reason the turn can carry.
    for (const reason of [
      "GUARD_DENIED:BUDGET_EXHAUSTED",
      "GUARD_DENIED:CIRCUIT_OPEN",
      "GUARD_DENIED:KILL_SWITCH",
      "GUARD_DENIED:SESSION_RATE_LIMIT",
      "UNDERSTANDING_FAILED:TIMEOUT",
      "COMMERCIAL_FAILED:PROVIDER_UNAVAILABLE",
    ]) {
      expect(mayActOnLanding(degradedTurn(reason))).toBe(false);
    }
  });
});

describe("adaptAdvisorToAgentResponse — action mapping is exact or nothing", () => {
  it("8. EXPLAIN maps to no landing action (the landing has no informational action)", () => {
    const res = adaptAdvisorToAgentResponse(
      outcome({ response: advisorResponse({ suggested_action: "EXPLAIN" }) }),
    );
    expect(res.actions).toEqual([]);
  });

  it("9. an action with no landing member (OPEN_HELP) is omitted, not translated", () => {
    const res = adaptAdvisorToAgentResponse(
      outcome({ response: advisorResponse({ suggested_action: "OFFER_HELP" }) }),
    );
    expect(res.actions).toEqual([]);
  });

  it("10. an unknown action id authorises nothing", () => {
    expect(landingActionsForActionId("CREATE_PAGE")).toEqual([]);
    expect(landingActionsForActionId("__proto__")).toEqual([]);
    expect(landingActionsForActionId("")).toEqual([]);
  });

  it("11. OFFER_GUEST_EDITOR stays blocked — no CREATE_PAGE, no /crear-tarjeta", () => {
    const res = adaptAdvisorToAgentResponse(
      outcome({
        response: advisorResponse({
          suggested_action: "OFFER_GUEST_EDITOR",
          relevant_capability_ids: ["crear_pagina"],
        }),
      }),
    );
    expect(res.actions).toEqual([]);
    expect(JSON.stringify(res)).not.toContain("CREATE_PAGE");
    expect(JSON.stringify(res)).not.toContain("/crear-tarjeta");
  });

  it("12. the crosswalk never emits CREATE_PAGE for ANY allowlisted action", () => {
    for (const id of ACTION_IDS) {
      for (const action of landingActionsForActionId(id)) {
        expect(action.type).not.toBe("CREATE_PAGE");
      }
    }
  });

  it("12b. CREATE_PAGE really is a landing action — so the refusal above has teeth", () => {
    // Proves the danger the crosswalk refuses is a real member of the target
    // vocabulary, not a hypothetical.
    const planted: AgentAction = { type: "CREATE_PAGE" };
    expect(planted.type).toBe("CREATE_PAGE");
  });

  it("security: an unknown action is never promoted to a privileged one", () => {
    for (const bogus of ["CREATE_PAGE", "OFFER_GUEST_EDITOR", "SELECT_TEMPLATE", "SHOW_READY"]) {
      expect(landingActionsForActionId(bogus)).toEqual([]);
    }
  });
});

describe("adaptAdvisorToAgentResponse — no invention, no leakage", () => {
  it("13. no output across the whole input space carries a route or URL", () => {
    for (const res of everyReachableOutput()) {
      for (const action of res.actions) {
        expect(JSON.stringify(action)).not.toMatch(/https?:\/\/|\/\//);
      }
    }
    // The checker itself has teeth.
    expect(carriesRouteOrUrl([{ type: "PREVIEW_TEMPLATE", id: "/crear-tarjeta" }])).toBe(true);
    expect(carriesRouteOrUrl([])).toBe(false);
  });

  it("14. no output across the whole input space carries a template id", () => {
    for (const res of everyReachableOutput()) {
      for (const action of res.actions) {
        expect(Object.prototype.hasOwnProperty.call(action, "id")).toBe(false);
      }
    }
    expect(carriesTemplateId([{ type: "SELECT_TEMPLATE", id: "dark_craft" }])).toBe(true);
    expect(carriesTemplateId([])).toBe(false);
  });

  it("15. no secret ever appears in the output", () => {
    const res = adaptAdvisorToAgentResponse(outcome());
    const serialized = JSON.stringify(res);
    for (const marker of ["sk-", "apiKey", "api_key", "Authorization", "Bearer", "token"]) {
      expect(serialized).not.toContain(marker);
    }
  });
});

describe("adaptAdvisorToAgentResponse — contract compatibility", () => {
  it("18. the input is never mutated (deep-frozen input, unchanged after the call)", () => {
    const frozen = deepFreeze(outcome());
    const before = JSON.stringify(frozen);
    const res = adaptAdvisorToAgentResponse(frozen);
    expect(JSON.stringify(frozen)).toBe(before);
    expect(res).not.toBe(frozen);
  });

  it("18b. the returned actions array is fresh, never the shared crosswalk table", () => {
    const a = adaptAdvisorToAgentResponse(outcome());
    const b = adaptAdvisorToAgentResponse(outcome());
    expect(a.actions).not.toBe(b.actions);
    expect(a.actions).not.toBe(LANDING_ACTION_CROSSWALK.NONE);
  });

  it("19. the output has exactly the AgentResponse shape", () => {
    const res = adaptAdvisorToAgentResponse(outcome());
    expect(Object.keys(res).sort()).toEqual(["actions", "text"]);
    expect(typeof res.text).toBe("string");
    expect(Array.isArray(res.actions)).toBe(true);
    // A compile-time check that the return type IS the landing's own type.
    const typed: AgentResponse = res;
    expect(typed.text).toBe(res.text);
  });

  it("20. no optional property is invented on any emitted action", () => {
    const allowedKeys: Readonly<Record<string, readonly string[]>> = {
      SHOW_TEMPLATES: ["type", "scope"],
      RECOMMEND_TEMPLATES: ["type", "ids", "similarTo", "reasons"],
      PREVIEW_TEMPLATE: ["type", "id"],
      SELECT_TEMPLATE: ["type", "id"],
      SHOW_OPTIONS: ["type", "options"],
      SHOW_READY: ["type"],
      UPDATE_BUSINESS_CONTEXT: ["type", "patch"],
      OPEN_TEMPLATE_DRAWER: ["type"],
      CREATE_PAGE: ["type"],
    };
    for (const res of everyReachableOutput()) {
      for (const action of res.actions) {
        const permitted = allowedKeys[action.type];
        expect(permitted).toBeDefined();
        for (const key of Object.keys(action)) {
          expect(permitted).toContain(key);
        }
      }
    }
  });

  it("20b. the crosswalk is exhaustive over CA-5's allowlist", () => {
    expect(Object.keys(LANDING_ACTION_CROSSWALK).sort()).toEqual([...ACTION_IDS].sort());
    for (const id of ACTION_IDS) {
      expect(LANDING_ACTION_CROSSWALK[id]).toEqual([]);
    }
  });

  it("20c. the crosswalk is independent of the CA-5 strategy refinement", () => {
    // CA-5 picks between EXPLAIN_FREE_PREMIUM and EXPLAIN_FEATURE using the
    // strategy; the landing crosswalk returns the same result for every value,
    // which is what lets the adapter pass a constant. Proven for the whole space.
    for (const action of NEXT_BEST_ACTIONS) {
      const baseline = landingActionsForActionId(nextBestActionToActionId(action, STRATEGIES[0]));
      for (const strategy of STRATEGIES) {
        const id: ActionId = nextBestActionToActionId(action, strategy);
        expect(landingActionsForActionId(id)).toEqual(baseline);
      }
    }
  });

  it("20d. the adapter agrees with the CA-5 crosswalk for every grounded action", () => {
    for (const action of NEXT_BEST_ACTIONS) {
      const res = adaptAdvisorToAgentResponse(
        outcome({ response: advisorResponse({ suggested_action: action }) }),
      );
      expect(res.actions).toEqual([
        ...landingActionsForActionId(nextBestActionToActionId(action, "OTHER")),
      ]);
    }
  });
});

describe("adaptAdvisorToAgentResponse — purity", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("22. makes no external call", () => {
    const spy = vi.fn(() => {
      throw new Error("the adapter must not touch the network");
    });
    globalThis.fetch = spy as unknown as typeof fetch;
    adaptAdvisorToAgentResponse(outcome());
    adaptAdvisorToAgentResponse(degradedTurn("TIMEOUT"));
    expect(spy).not.toHaveBeenCalled();
  });

  it("22b. touches no environment, storage, clock or randomness", () => {
    const source = readAdapterSource();
    for (const marker of [
      "process.env",
      "localStorage",
      "sessionStorage",
      "Date.now",
      "Math.random",
      "fetch(",
    ]) {
      expect(source).not.toContain(marker);
    }
  });

  it("21. the value-import closure is exactly the adapter plus the pure CA-5 registry", () => {
    const closure = valueImportClosure(adapterPath());
    // EXACT, not a set of negatives: if any file is ever added to the runtime
    // graph, this test fails and names it. `actions/registry.ts` is pure data
    // (its only import is type-only), and `intents/contract.ts` is absent
    // precisely because the adapter imports it as `type` — the compiler erases it.
    expect(closure).toEqual(
      [
        resolve(HERE, "..", "landing-adapter.ts"),
        resolve(HERE, "..", "..", "actions", "registry.ts"),
      ]
        .map((file) => file.replace(/\\/g, "/"))
        .sort(),
    );
    // Belt and braces over the exact list above.
    for (const file of closure) {
      expect(file.endsWith(".server.ts")).toBe(false);
      expect(file).not.toContain("provider.server");
    }
  });

  it("21b. the landing is read only as a type — no component or runtime import", () => {
    const source = readAdapterSource();
    expect(source).toContain("types/cripqer");
    expect(source).not.toMatch(/approved-chat-landing\/(?!types)/);
  });
});

/* ============================== helpers ================================= */

/** Every combination of action × grounding × degraded the adapter can see. */
function everyReachableOutput(): AgentResponse[] {
  const results: AgentResponse[] = [];
  for (const suggested of NEXT_BEST_ACTIONS) {
    for (const grounding of ["GROUNDED", "FALLBACK"] as const) {
      for (const degraded of [false, true]) {
        results.push(
          adaptAdvisorToAgentResponse(
            outcome({
              degraded,
              response: advisorResponse({
                suggested_action: suggested,
                grounding_status: grounding,
              }),
            }),
          ),
        );
      }
    }
  }
  return results;
}

function carriesRouteOrUrl(actions: readonly unknown[]): boolean {
  return actions.some((action) => /https?:\/\/|www\.|"\/[A-Za-z]/.test(JSON.stringify(action)));
}

function carriesTemplateId(actions: readonly unknown[]): boolean {
  return actions.some((action) => Object.prototype.hasOwnProperty.call(action, "id"));
}

/* -------------------- client-safe import-graph walk -------------------- */

const HERE = dirname(fileURLToPath(import.meta.url));

function adapterPath(): string {
  return resolve(HERE, "..", "landing-adapter.ts");
}

function readAdapterSource(): string {
  return readFileSync(adapterPath(), "utf8");
}

interface ImportRef {
  readonly specifier: string;
  readonly typeOnly: boolean;
}

/**
 * Strips comments before parsing.
 *
 * Not cosmetic: the adapter's own doc comment contains the phrase "value import
 * graph", and without this the import regex matches that prose and invents an
 * edge to a file the adapter only mentions in a sentence. The first version of
 * this test did exactly that and reported a false value edge.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

/** Extracts import specifiers, distinguishing `import type` and all-`type` lists. */
function parseImports(source: string): ImportRef[] {
  const refs: ImportRef[] = [];
  const named = /import\s+([\s\S]*?)\s+from\s+"([^"]+)"/g;
  for (const match of stripComments(source).matchAll(named)) {
    const clause = (match[1] ?? "").trim();
    const specifier = match[2] ?? "";
    const bindings = clause.match(/\{([\s\S]*)\}/);
    const typeOnly =
      clause.startsWith("type ") ||
      (bindings !== null &&
        (bindings[1] ?? "")
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part !== "")
          .every((part) => part.startsWith("type ")));
    refs.push({ specifier, typeOnly });
  }
  for (const match of stripComments(source).matchAll(/import\s+"([^"]+)"/g)) {
    refs.push({ specifier: match[1] ?? "", typeOnly: false });
  }
  return refs;
}

/** Resolves a relative specifier to an existing `.ts` file, or `null`. */
function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [`${base}.ts`, resolve(base, "index.ts")]) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** The transitive closure of VALUE imports starting at `entry`, forward-slashed. */
function valueImportClosure(entry: string): string[] {
  const seen = new Set<string>([entry]);
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    for (const ref of parseImports(readFileSync(file, "utf8"))) {
      if (ref.typeOnly) continue;
      const next = resolveSpecifier(file, ref.specifier);
      if (next !== null && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  // Normalised so the assertions read the same on Windows and POSIX.
  return [...seen].map((file) => file.replace(/\\/g, "/")).sort();
}
