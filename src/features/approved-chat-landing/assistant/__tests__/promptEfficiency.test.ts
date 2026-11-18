import { describe, expect, it } from "vitest";
import { emptyContext } from "../../utils/agent";
import { competitiveKnowledgeForQuestion } from "../competitiveKnowledge";
import { productKnowledgeForQuestion } from "../productKnowledge";
import { buildSystemPrompt, measurePromptBudget } from "../server";

describe("selective assistant context", () => {
  it("does not load competitive intelligence for a product-only Cripqer question", () => {
    expect(competitiveKnowledgeForQuestion("¿Qué hace Cripqer?")).toBe("");
    expect(competitiveKnowledgeForQuestion("¿Qué ofrece Clickker?")).toBe("");
    expect(competitiveKnowledgeForQuestion("¿Qué diferencia hay entre Cripqer y Linktree?")).toMatch(
      /INTELIGENCIA COMPETITIVA SELECTIVA/,
    );
  });

  it("keeps product knowledge focused by topic", () => {
    const greeting = productKnowledgeForQuestion("hola");
    const pricing = productKnowledgeForQuestion("¿Qué funciones son gratis?");
    const qr = productKnowledgeForQuestion("¿Cómo funciona el QR?");

    expect(greeting).not.toMatch(/BEACONS|LINKTREE|INTELIGENCIA COMPETITIVA/i);
    expect(pricing).toMatch(/PLANES, GRATUIDAD Y PRECIOS|nivel gratuito/i);
    expect(qr).toMatch(/QR|c[oó]digo/i);
    expect(greeting.length).toBeLessThan(pricing.length);
    expect(greeting.length).toBeLessThanOrEqual(7200);
  });

  it("measures prompt sections without retaining message content", () => {
    const system = buildSystemPrompt(emptyContext(), "¿Qué hace Cripqer?", []);
    const budget = measurePromptBudget(
      system,
      [
        { id: "u1", role: "user", text: "Tengo una peluquería" },
        { id: "a1", role: "assistant", text: "Puedo ayudarte con una página" },
      ],
      "¿Cómo recibo contactos?",
    );

    expect(budget.systemInstructionChars).toBeGreaterThan(0);
    expect(budget.knowledgeChars).toBeGreaterThan(0);
    expect(budget.historyChars).toBe("Tengo una peluquería".length + "Puedo ayudarte con una página".length);
    expect(budget.userChars).toBe("¿Cómo recibo contactos?".length);
    expect(budget.estimatedInputTokens).toBe(Math.ceil(budget.totalInputChars / 4));
  });
});
