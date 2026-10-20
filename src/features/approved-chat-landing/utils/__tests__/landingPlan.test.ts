/**
 * CONV-02 · the deterministic planner.
 *
 * The advisor writes prose; this planner decides what the landing DOES. Two
 * properties matter more than the individual rules:
 *
 *  1. EVERY ID IS FROM THE CATALOG. The planner is fed a message and a context,
 *     never a model answer, so a hallucinated style name cannot reach an action.
 *     The corpus test below pins this across every branch.
 *  2. A CARD CLICK COSTS NOTHING. `planSelectionActions` is what the provider
 *     calls for `template-selection`; if it ever grew a provider call, the
 *     budget would be spent on clicks.
 *
 * The branches tested here are the precedence the module documents: patch →
 * named/ordinal selection → initial cards → similar → drawer → ready → next slot.
 */
import { describe, expect, it } from "vitest";

import { businessOptions, channelOptions } from "../../data/business";
import { templates } from "../../data/templates";
import { emptyContext } from "../agent";
import {
  businessChips,
  goalChips,
  isCreateIntent,
  planNextActions,
  planSelectionActions,
  resolveNamedSelection,
  resolveOrdinalSelection,
} from "../landingPlan";
import type { AgentAction, BusinessContext, TemplateId } from "../../types/cripqer";

const CATALOG = new Set(templates.map((template) => template.id));

function context(overrides: Partial<BusinessContext> = {}): BusinessContext {
  return structuredClone({ ...emptyContext(), ...overrides });
}

function withShown(ids: TemplateId[]): BusinessContext {
  const ctx = context();
  return { ...ctx, session: { initialTemplates: ids, lastShownTemplates: ids } };
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

const types = (actions: AgentAction[]) => actions.map((action) => action.type);

describe("CONV-02 · the planner's precedence", () => {
  it("emits the context patch FIRST, so later actions see the patched state", () => {
    const actions = planNextActions({
      context: emptyContext(),
      message: "Mi pastelería se llama Dulce Sol y quiero reservas",
    });

    expect(types(actions)[0]).toBe("UPDATE_BUSINESS_CONTEXT");
    const patch = actions[0];
    if (patch?.type !== "UPDATE_BUSINESS_CONTEXT") return;
    expect(patch.patch).toMatchObject({
      name: "Dulce Sol",
      type: "bakery",
      goal: "bookings",
    });
    expect(types(actions)).toContain("RECOMMEND_TEMPLATES");
  });

  it("resolves an ordinal against the cards currently shown", () => {
    const ctx = withShown(["warm_care", "dark_craft", "soft_beauty"]);
    const actions = planNextActions({
      context: ctx,
      message: "quiero la segunda, es una pastelería",
    });

    expect(actions).toContainEqual({ type: "SELECT_TEMPLATE", id: "dark_craft" });
    expect(types(actions)[0]).toBe("UPDATE_BUSINESS_CONTEXT");
  });

  it("a message that only names a style still selects a catalog id", () => {
    const actions = planNextActions({ context: emptyContext(), message: "Quiero Dark Craft" });
    expect(actions).toContainEqual({ type: "SELECT_TEMPLATE", id: "dark_craft" });
  });

  it("'muéstrame <style>' previews instead of committing", () => {
    const actions = planNextActions({ context: emptyContext(), message: "Muéstrame Dark Craft" });
    expect(actions).toEqual([{ type: "PREVIEW_TEMPLATE", id: "dark_craft" }]);
  });

  it("'quiero la plantilla <style>' commits and asks the next slot", () => {
    const actions = planNextActions({
      context: emptyContext(),
      message: "Quiero la plantilla Dark Craft",
    });
    expect(types(actions)).toEqual(["SELECT_TEMPLATE", "SHOW_OPTIONS"]);
    expect(actions[0]).toEqual({ type: "SELECT_TEMPLATE", id: "dark_craft" });
    expect(actions[1]).toEqual({ type: "SHOW_OPTIONS", options: businessOptions });
  });

  it("'the ones I saw when I arrived' shows the INITIAL cards", () => {
    const actions = planNextActions({
      context: withShown(["warm_care", "dark_craft"]),
      message: "Muéstrame las plantillas del principio",
    });
    expect(actions).toEqual([{ type: "SHOW_TEMPLATES", scope: "INITIAL" }]);
  });

  it("'something similar' recommends from the selected style's family", () => {
    const ctx = readyContext();
    const actions = planNextActions({ context: ctx, message: "¿Tienes alguna opción parecida?" });
    expect(types(actions)).toEqual(["RECOMMEND_TEMPLATES"]);
    const recommendation = actions[0];
    if (recommendation?.type !== "RECOMMEND_TEMPLATES") return;
    expect(recommendation.similarTo).toBe("warm_care");
    for (const id of recommendation.ids) expect(CATALOG.has(id)).toBe(true);
  });

  it("'something similar' with nothing to base it on asks the next slot instead", () => {
    const actions = planNextActions({ context: emptyContext(), message: "Quiero algo parecida" });
    expect(types(actions)).not.toContain("RECOMMEND_TEMPLATES");
    expect(actions).toContainEqual({ type: "SHOW_OPTIONS", options: businessOptions });
  });

  it("the catalog drawer opens without selecting anything", () => {
    const actions = planNextActions({
      context: withShown(["warm_care"]),
      message: "Ver todas las plantillas",
    });
    expect(actions).toEqual([{ type: "OPEN_TEMPLATE_DRAWER" }]);
  });

  it("falls through to the next missing question", () => {
    const empty = planNextActions({ context: emptyContext(), message: "Hola" });
    expect(empty).toEqual([{ type: "SHOW_OPTIONS", options: businessOptions }]);

    const noChannel = planNextActions({
      context: context({
        businessIdentity: { name: null, type: "bakery", description: null },
        primaryGoal: "orders",
        template: {
          selectedTemplateId: "warm_care",
          templateFamily: null,
          heroVariant: null,
          visualPersonality: null,
        },
      }),
      message: "Hola",
    });
    expect(noChannel).toEqual([{ type: "SHOW_OPTIONS", options: channelOptions }]);
  });
});

describe("CONV-02 · ready state", () => {
  it("a ready visitor who says 'créala ya' gets the ready card", () => {
    const actions = planNextActions({ context: readyContext(), message: "créala ya" });
    expect(actions).toEqual([{ type: "SHOW_READY" }]);
  });

  it("an unready visitor who says 'créala ya' gets the next question, not a page", () => {
    const actions = planNextActions({ context: withShown(["warm_care"]), message: "créala ya" });
    expect(actions.some((action) => action.type === "CREATE_PAGE")).toBe(false);
    expect(actions.some((action) => action.type === "SHOW_READY")).toBe(false);
  });

  it("recognises the create wording it documents", () => {
    for (const phrase of ["créala ya", "hazla", "generala ya", "adelante"]) {
      expect(isCreateIntent(phrase), phrase).toBe(true);
    }
    for (const phrase of ["quisiera saber el precio", "hola", "muéstrame estilos"]) {
      expect(isCreateIntent(phrase), phrase).toBe(false);
    }
  });
});

describe("CONV-02 · no model-supplied id can travel", () => {
  const messages = [
    "Quiero la plantilla Zeta Ultra",
    "Muéstrame Zeta Ultra",
    "Quiero la segunda",
    "Muéstrame las plantillas del principio",
    "algo parecida",
    "ver todas las plantillas",
    "Mi pastelería necesita reservas",
    "créala ya",
    "Hola",
  ];

  const contexts: BusinessContext[] = [
    emptyContext(),
    withShown(["warm_care", "dark_craft", "soft_beauty"]),
    readyContext(),
  ];

  it("every id an action names belongs to the catalog", () => {
    for (const ctx of contexts) {
      for (const message of messages) {
        const actions = planNextActions({ context: ctx, message });
        for (const action of actions) {
          if (action.type === "SELECT_TEMPLATE" || action.type === "PREVIEW_TEMPLATE") {
            expect(CATALOG.has(action.id), `${action.type}:${action.id} for "${message}"`).toBe(true);
          }
          if (action.type === "RECOMMEND_TEMPLATES") {
            for (const id of action.ids) {
              expect(CATALOG.has(id), `RECOMMEND_TEMPLATES:${id} for "${message}"`).toBe(true);
            }
          }
        }
      }
    }
  });

  it("returns null rather than guessing a name it does not know", () => {
    const ctx = withShown(["warm_care", "dark_craft"]);
    expect(resolveNamedSelection("Quiero la plantilla Zeta Ultra", ctx)).toBeNull();
  });

  it("returns null for an ordinal when no cards are shown", () => {
    expect(resolveOrdinalSelection("quiero la primera", emptyContext())).toBeNull();
  });
});

describe("CONV-02 · a card click is a pure plan", () => {
  it("selects the card and asks the next question", () => {
    const actions = planSelectionActions(emptyContext(), "dark_craft");
    expect(actions).toEqual([
      { type: "SELECT_TEMPLATE", id: "dark_craft" },
      { type: "SHOW_OPTIONS", options: businessOptions },
    ]);
  });

  it("does not mutate the context", () => {
    const ctx = readyContext();
    const snapshot = JSON.stringify(ctx);
    planSelectionActions(ctx, "dark_craft");
    expect(JSON.stringify(ctx)).toBe(snapshot);
  });
});

describe("CONV-02 · chips come from the catalog", () => {
  it("business chips are the catalog's own options", () => {
    expect(businessChips()).toEqual(businessOptions);
  });

  it("goal chips exist only where the business type asks a goal question", () => {
    expect(goalChips("real_estate").length).toBeGreaterThan(0);
    expect(goalChips("bakery")).toEqual([]);
    expect(goalChips(null)).toEqual([]);
  });
});
