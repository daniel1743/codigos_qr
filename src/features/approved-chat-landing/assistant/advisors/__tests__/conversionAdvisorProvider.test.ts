/**
 * CONV-02 · the Conversion Advisor as an `AssistantProvider`.
 *
 * The bridge is where three owners meet, and the tests hold each one in place:
 *
 *   · THE MODEL writes the reply. The provider forwards it and never edits it.
 *   · THE PLANNER writes the actions. Even a reply that announces "ya creé tu
 *     página" cannot produce an action: actions are computed from the visitor's
 *     message and the catalog, never from the answer.
 *   · THE FACADE owns failures. A refusal in the closed union becomes fixed
 *     product text chosen from the code; a rejected transport reaches the
 *     service, which answers with its own safe fallback.
 *
 * A card click is also checked here: `template-selection` must not call the
 * client at all, because a click is deterministic and therefore free.
 */
import { describe, expect, it, vi } from "vitest";

import { buildLandingContext } from "../../../../../lib/conversion-advisor/integration/landing-context";
import { businessOptions } from "../../../data/business";
import { createAssistantService } from "../../service";
import { ASSISTANT_FALLBACK_TEXT, assistantFallback } from "../../contracts";
import { emptyContext } from "../../../utils/agent";
import {
  CONVERSION_ADVISOR_PROVIDER_ID,
  advisorRefusalText,
  type ConversionAdvisorClient,
} from "../contract";
import { createConversionAdvisorProvider } from "../provider";
import type { BusinessContext, ChatMessage, TemplateId } from "../../../types/cripqer";
import type { AssistantTurnResult } from "../../../../../lib/conversion-advisor/integration/contract";

const SESSION = "3f0c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b";
const HISTORY: ChatMessage[] = [];

function clientReturning(result: AssistantTurnResult): ConversionAdvisorClient & {
  ask: ReturnType<typeof vi.fn>;
} {
  return { ask: vi.fn(async () => result) } as unknown as ConversionAdvisorClient & {
    ask: ReturnType<typeof vi.fn>;
  };
}

const success = (overrides: Record<string, unknown> = {}): AssistantTurnResult => ({
  ok: true,
  data: {
    session_id: SESSION,
    model: "deepseek-flash",
    reply: "Para una pastelería haría algo muy visual. ¿Prefieres tonos cálidos?",
    detected_intents: ["BUSINESS_NEED"],
    relevant_capability_ids: [],
    suggested_action: "ASK_ONE_QUESTION",
    limitations: [],
    grounding_status: "GROUNDED",
    degraded: false,
    turns_used: 1,
    turns_remaining: 49,
    ...overrides,
  },
});

function request(
  context: BusinessContext,
  intent: { kind: "message"; text: string } | { kind: "template-selection"; templateId: TemplateId } = {
    kind: "message",
    text: "Hola",
  },
) {
  return { intent, context, history: HISTORY };
}

describe("CONV-02 · the provider's identity and deterministic path", () => {
  it("identifies itself as the conversion advisor", () => {
    const provider = createConversionAdvisorProvider({ client: clientReturning(success()) });
    expect(provider.id).toBe(CONVERSION_ADVISOR_PROVIDER_ID);
    expect(CONVERSION_ADVISOR_PROVIDER_ID).toBe("conversion-advisor");
  });

  it("answers a card click with zero client calls", async () => {
    const client = clientReturning(success());
    const provider = createConversionAdvisorProvider({ client });

    const response = await provider.respond(
      request(emptyContext(), { kind: "template-selection", templateId: "dark_craft" }),
    );

    expect(client.ask).not.toHaveBeenCalled();
    expect(response.actions).toEqual([
      { type: "SELECT_TEMPLATE", id: "dark_craft" },
      { type: "SHOW_OPTIONS", options: businessOptions },
    ]);
    expect(response.metadata).toEqual({
      provider: "conversion-advisor",
      model: null,
      fallback: false,
    });
  });

  it("never calls the client for any catalog card", async () => {
    const client = clientReturning(success());
    const provider = createConversionAdvisorProvider({ client });
    const ids: TemplateId[] = [
      "warm_care",
      "dark_craft",
      "soft_beauty",
      "food_story",
      "professional_trust",
      "personal_brand",
      "product_spotlight",
      "minimal_premium",
      "bold_creative",
      "local_friendly",
      "editorial_luxury",
      "visual_portfolio",
    ];

    for (const templateId of ids) {
      const response = await provider.respond(
        request(emptyContext(), { kind: "template-selection", templateId }),
      );
      expect(response.actions[0]).toEqual({ type: "SELECT_TEMPLATE", id: templateId });
    }
    expect(client.ask).not.toHaveBeenCalled();
  });
});

describe("CONV-02 · a model answer supplies prose, never actions", () => {
  it("forwards the reply verbatim and reports the model", async () => {
    const client = clientReturning(success());
    const provider = createConversionAdvisorProvider({ client });

    const response = await provider.respond(request(emptyContext()));

    expect(response.text).toBe(
      "Para una pastelería haría algo muy visual. ¿Prefieres tonos cálidos?",
    );
    expect(response.metadata).toEqual({
      provider: "conversion-advisor",
      model: "deepseek-flash",
      fallback: false,
    });
    expect(client.ask).toHaveBeenCalledTimes(1);
  });

  it("plans actions from the visitor's message, even when the reply claims to have acted", async () => {
    const client = clientReturning(
      success({
        reply: "Listo, ya seleccioné Dark Craft y creé tu página con ese estilo.",
      }),
    );
    const provider = createConversionAdvisorProvider({ client });

    const response = await provider.respond(
      request(emptyContext(), { kind: "message", text: "Quiero Dark Craft" }),
    );

    expect(response.actions).toEqual([
      { type: "SELECT_TEMPLATE", id: "dark_craft" },
      { type: "SHOW_OPTIONS", options: businessOptions },
    ]);
    expect(response.actions.some((action) => action.type === "CREATE_PAGE")).toBe(false);
  });

  it("reports a degraded turn as a fallback without treating it as an error", async () => {
    const client = clientReturning(success({ degraded: true }));
    const provider = createConversionAdvisorProvider({ client });

    const response = await provider.respond(request(emptyContext()));
    expect(response.metadata.fallback).toBe(true);
    expect(response.metadata.model).toBe("deepseek-flash");
  });

  it("forwards a sanitised landing snapshot, without the business name", async () => {
    const ask = vi.fn<ConversionAdvisorClient["ask"]>(async () => success());
    const provider = createConversionAdvisorProvider({ client: { ask } });

    const context = emptyContext();
    const withName: BusinessContext = {
      ...context,
      businessIdentity: { name: "Dulce Sol", type: "bakery", description: "Recetas de familia." },
    };

    await provider.respond(request(withName, { kind: "message", text: "Hola" }));

    expect(ask).toHaveBeenCalledTimes(1);
    const input = ask.mock.calls[0]?.[0] as unknown as {
      message: string;
      landingContext: Record<string, unknown>;
    };
    expect(input.message).toBe("Hola");
    expect(input.landingContext).toEqual(buildLandingContext(withName));
    const serialized = JSON.stringify(input.landingContext);
    expect(serialized).not.toContain("Dulce Sol");
    expect(serialized).not.toContain("Recetas de familia");
    expect(serialized).not.toContain("session");
  });
});

describe("CONV-02 · refusals become fixed product text", () => {
  const refusal = (code: string, message = ""): AssistantTurnResult =>
    ({ ok: false, code, message }) as AssistantTurnResult;

  it("answers SESSION_UNKNOWN with its own sentence, not the server's", async () => {
    const provider = createConversionAdvisorProvider({
      client: clientReturning(
        refusal("SESSION_UNKNOWN", "Bearer sk-leak provider body: {\"error\":\"x\"}"),
      ),
    });

    const response = await provider.respond(request(emptyContext()));

    expect(response.text).toBe("Se me perdió el hilo de la conversación. ¿Me lo repites?");
    expect(response.text).not.toContain("sk-leak");
    expect(response.actions).toEqual([]);
    expect(response.metadata).toEqual({
      provider: "conversion-advisor",
      model: null,
      fallback: true,
    });
  });

  it("keeps one fixed sentence per code and never echoes the code", () => {
    const codes = [
      "INVALID_INPUT",
      "SESSION_UNKNOWN",
      "TURN_LIMIT_REACHED",
      "PROVIDER_MISCONFIGURED",
      "UNAVAILABLE",
      "SOMETHING_ELSE",
    ];
    for (const code of codes) {
      const text = advisorRefusalText(code);
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toContain(code);
    }
    expect(advisorRefusalText("PROVIDER_MISCONFIGURED")).toBe(ASSISTANT_FALLBACK_TEXT);
    expect(advisorRefusalText("UNAVAILABLE")).toBe(ASSISTANT_FALLBACK_TEXT);
    expect(advisorRefusalText("WHATEVER")).toBe(ASSISTANT_FALLBACK_TEXT);
  });

  it("does not expose the session id the server returned", async () => {
    const provider = createConversionAdvisorProvider({ client: clientReturning(success()) });
    const response = await provider.respond(request(emptyContext()));
    expect(JSON.stringify(response)).not.toContain(SESSION);
    expect(Object.keys(response.metadata).sort()).toEqual(["fallback", "model", "provider"]);
  });
});

describe("CONV-02 · the facade owns a rejected transport", () => {
  it("turns a rejection into the service's safe fallback with no actions", async () => {
    const provider = createConversionAdvisorProvider({
      client: {
        ask: async () => {
          throw new Error("advisor turn timed out");
        },
      },
    });
    const service = createAssistantService({ provider });

    const outcome = await service.sendMessage("Hola", emptyContext(), HISTORY);

    expect(outcome.ok).toBe(false);
    expect(outcome.response).toEqual(assistantFallback("conversion-advisor"));
    expect(outcome.response.actions).toEqual([]);
    expect(outcome.error).toBe("advisor turn timed out");
  });
});
