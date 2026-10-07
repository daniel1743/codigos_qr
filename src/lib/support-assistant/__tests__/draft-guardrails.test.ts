import { describe, expect, it } from "vitest";
import {
  buildFallbackDraft,
  parseJsonLoose,
  validateTicketDraft,
  type SupportTicketDraft,
} from "../draft-guardrails";

/**
 * La salida del modelo es input no confiable: DeepSeek garantiza la sintaxis
 * JSON, no el esquema. Estos tests fijan que un borrador inválido degrade a un
 * borrador usable en vez de dejar el formulario roto.
 */

const FALLBACK: SupportTicketDraft = {
  subject: "Asunto de respaldo",
  description: "Descripción de respaldo",
  category: "other",
};

describe("parseJsonLoose", () => {
  it("parsea JSON limpio", () => {
    expect(parseJsonLoose('{"subject":"a"}')).toEqual({ subject: "a" });
  });

  it("tolera fences de markdown", () => {
    expect(parseJsonLoose('```json\n{"subject":"a"}\n```')).toEqual({ subject: "a" });
  });

  it("recorta texto alrededor del objeto", () => {
    expect(parseJsonLoose('Aquí tienes: {"subject":"a"} espero que sirva')).toEqual({
      subject: "a",
    });
  });

  it("devuelve null con contenido inutilizable", () => {
    expect(parseJsonLoose("no hay json aquí")).toBeNull();
    expect(parseJsonLoose("")).toBeNull();
    expect(parseJsonLoose("[1,2,3]")).toBeNull();
  });
});

describe("buildFallbackDraft", () => {
  const conversation = [
    { role: "user" as const, content: "No puedo publicar mi página" },
    { role: "assistant" as const, content: "¿Qué te aparece al pulsar Publicar?" },
    { role: "user" as const, content: "Se queda cargando y no pasa nada" },
  ];

  it("usa el primer mensaje del usuario como asunto y el resto como descripción", () => {
    const draft = buildFallbackDraft(conversation);
    expect(draft.subject).toBe("No puedo publicar mi página");
    expect(draft.description).toContain("Se queda cargando");
    expect(draft.category).toBe("other");
  });

  it("nunca devuelve un borrador vacío", () => {
    const draft = buildFallbackDraft([]);
    expect(draft.subject.length).toBeGreaterThan(0);
    expect(draft.description.length).toBeGreaterThan(0);
  });

  it("recorta el asunto a una sola línea de 150 caracteres", () => {
    const draft = buildFallbackDraft([
      { role: "user", content: `${"x".repeat(400)}\nsegunda línea` },
    ]);
    expect(draft.subject.length).toBeLessThanOrEqual(150);
    expect(draft.subject).not.toContain("\n");
  });
});

describe("validateTicketDraft", () => {
  it("acepta un borrador completo válido", () => {
    const result = validateTicketDraft(
      { subject: "No puedo publicar", description: "Se queda cargando", category: "usage" },
      FALLBACK,
    );
    expect(result.usedFallback).toBe(false);
    expect(result.draft).toEqual({
      subject: "No puedo publicar",
      description: "Se queda cargando",
      category: "usage",
    });
  });

  it("rellena campo a campo desde el respaldo sin descartar el borrador", () => {
    const result = validateTicketDraft({ subject: "Solo traigo asunto" }, FALLBACK);
    expect(result.usedFallback).toBe(true);
    expect(result.draft.subject).toBe("Solo traigo asunto");
    expect(result.draft.description).toBe(FALLBACK.description);
    expect(result.draft.category).toBe("other");
  });

  it("rechaza categorías fuera de la allowlist", () => {
    const result = validateTicketDraft({ category: "urgentisimo" }, FALLBACK);
    expect(result.draft.category).toBe("other");
    expect(result.usedFallback).toBe(true);
  });

  it("rechaza tipos equivocados y longitudes fuera de rango", () => {
    expect(validateTicketDraft({ subject: 42 }, FALLBACK).draft.subject).toBe(FALLBACK.subject);
    expect(validateTicketDraft({ description: "y".repeat(5000) }, FALLBACK).draft.description).toBe(
      FALLBACK.description,
    );
  });

  it("ignora campos de más que devuelva el modelo", () => {
    const result = validateTicketDraft(
      { subject: "a", description: "b", category: "other", priority: "high", extra: "x" },
      FALLBACK,
    );
    expect(Object.keys(result.draft).sort()).toEqual(["category", "description", "subject"]);
  });

  it("cae al respaldo con entradas no objeto", () => {
    expect(validateTicketDraft(null, FALLBACK).draft).toEqual(FALLBACK);
    expect(validateTicketDraft("texto", FALLBACK).draft).toEqual(FALLBACK);
  });
});
