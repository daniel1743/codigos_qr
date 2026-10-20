/**
 * CONV-02 · `CREATE_PAGE` exists, and production cannot reach it.
 *
 * The brief requires the eight deterministic actions to be proven, and requires
 * `CREATE_PAGE` to be TEST_CONTRACT_ONLY: the action has to be well formed — the
 * landing's reducer must be able to consume it when CONV-03 wires the flow — but
 * no production path may emit it yet.
 *
 * A default that is merely "off today" is not a barrier, because someone flips
 * defaults. The barrier here is that the enabling decision is an explicit
 * `allow: true` the planner never passes, and readiness is still required on top
 * of it. These tests prove both halves: the switch works, and nothing on the
 * conversational path uses it.
 */
import { describe, expect, it } from "vitest";

import { deriveBusinessReadiness } from "../../state/businessContext";
import { emptyContext } from "../agent";
import {
  isCreateIntent,
  isPageReady,
  planCreateCommand,
  planNextActions,
} from "../landingPlan";
import type { BusinessContext } from "../../types/cripqer";

function context(overrides: Partial<BusinessContext> = {}): BusinessContext {
  return structuredClone({ ...emptyContext(), ...overrides });
}

function readyContext(): BusinessContext {
  return context({
    businessIdentity: { name: "Dulce Sol", type: "bakery", description: "Pastelería artesanal." },
    primaryGoal: "orders",
    primaryChannel: "whatsapp",
    template: {
      selectedTemplateId: "warm_care",
      templateFamily: null,
      heroVariant: null,
      visualPersonality: null,
    },
  });
}

function partialContext(): BusinessContext {
  return context({
    businessIdentity: { name: null, type: "bakery", description: null },
    primaryGoal: "orders",
    primaryChannel: null,
    template: {
      selectedTemplateId: null,
      templateFamily: null,
      heroVariant: null,
      visualPersonality: null,
    },
  });
}

describe("CONV-02 · the create command is well formed", () => {
  it("emits exactly one CREATE_PAGE when explicitly allowed and the page is ready", () => {
    const actions = planCreateCommand(readyContext(), { allow: true });
    expect(actions).toEqual([{ type: "CREATE_PAGE" }]);
    expect(Object.keys(actions[0] ?? {})).toEqual(["type"]);
  });

  it("still refuses when allowed but the context is not ready", () => {
    expect(planCreateCommand(partialContext(), { allow: true })).toEqual([]);
    expect(planCreateCommand(emptyContext(), { allow: true })).toEqual([]);
  });

  it("needs readiness on both sides of the pair", () => {
    expect(isPageReady(readyContext())).toBe(true);
    expect(isPageReady(partialContext())).toBe(false);
    expect(isPageReady(readyContext())).toBe(deriveBusinessReadiness(readyContext()).readyForPage);
  });
});

describe("CONV-02 · CREATE_PAGE is TEST_CONTRACT_ONLY", () => {
  it("defaults to refusing", () => {
    expect(planCreateCommand(readyContext())).toEqual([]);
  });

  it("refuses when the switch is merely falsy", () => {
    expect(planCreateCommand(readyContext(), { allow: false })).toEqual([]);
  });

  it("does not accept a truthy stand-in for the switch", () => {
    // `allow: 1` is what a `!== undefined` check would have accepted.
    expect(
      planCreateCommand(readyContext(), { allow: 1 as unknown as boolean }),
    ).toEqual([]);
  });

  it("does not mutate the context it inspects", () => {
    const before = readyContext();
    const snapshot = JSON.stringify(before);
    planCreateCommand(before, { allow: true });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("CONV-02 · no conversational message can create a page", () => {
  const messages = [
    "Hola",
    "Mi pastelería se llama Dulce Sol y quiero reservas",
    "Muéstrame la segunda",
    "Quiero la primera",
    "créala ya",
    "hazla",
    "adelante",
    "dale, crea",
    "generala ya",
    "muéstrame las plantillas del principio",
    "algo parecido",
    "ver todas las plantillas",
    "¿cuánto cuesta?",
  ];

  const contexts: [string, () => BusinessContext][] = [
    ["empty", emptyContext],
    ["partial", partialContext],
    ["ready", readyContext],
  ];

  for (const [label, make] of contexts) {
    it(`never emits CREATE_PAGE on a ${label} context`, () => {
      for (const message of messages) {
        const actions = planNextActions({ context: make(), message });
        expect(
          actions.some((action) => action.type === "CREATE_PAGE"),
          `"${message}" produced CREATE_PAGE on a ${label} context`,
        ).toBe(false);
      }
    });
  }

  it("shows the ready card instead when a ready visitor says 'créala ya'", () => {
    expect(isCreateIntent("créala ya")).toBe(true);
    const actions = planNextActions({ context: readyContext(), message: "créala ya" });
    expect(actions).toContainEqual({ type: "SHOW_READY" });
  });
});
