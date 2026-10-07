import { describe, expect, it } from "vitest";
import { HELP_ARTICLES } from "../../help-content";
import { buildKnowledgeContext } from "../knowledge.server";

/**
 * Paridad FAQ ↔ Asistente. El conocimiento del bot se construye desde la MISMA
 * fuente canónica que la FAQ visible; estos tests fallan si alguien intenta
 * mantener dos copias divergentes del contenido de ayuda.
 */

describe("paridad FAQ ↔ asistente", () => {
  const context = buildKnowledgeContext();

  it("incluye las 17 preguntas de la FAQ", () => {
    for (const article of HELP_ARTICLES) {
      expect(context).toContain(article.question);
    }
  });

  it("incluye las 17 respuestas de la FAQ", () => {
    for (const article of HELP_ARTICLES) {
      expect(context).toContain(article.answer);
    }
  });

  it("no filtra datos de usuario ni secretos", () => {
    expect(context).not.toContain("CONTEXTO DEL USUARIO");
    expect(context).not.toMatch(/DEEPSEEK|API_KEY|sk-/i);
  });
});
