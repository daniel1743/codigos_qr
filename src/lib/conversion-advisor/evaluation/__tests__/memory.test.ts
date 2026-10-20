/**
 * CA-9A — the multi-turn memory evaluator. It is a STRUCTURAL proxy, and these
 * tests pin exactly which structures it does and does not read, so the report's
 * honest limit ("it cannot tell that 'ahí' referred to the page") is backed by
 * the code rather than by a promise.
 */
import { describe, expect, it } from "vitest";

import { evaluateMemory, NOT_APPLICABLE_MEMORY } from "../memory";
import { REFUSAL_MESSAGES } from "../../integration/ui-state";
import { evalCase, obs } from "./fixtures";

const twoTurn = evalCase({
  id: "MT-T",
  category: "multi_turn_memory",
  turns: ["Tengo un restaurante en Providencia.", "¿Cómo me ayuda con eso?"],
  memory_terms: ["restaurante"],
});

const asks = (question: string) => `CRIPQER puede ayudarte. ${question}`;

describe("CA-9A memory — the single-turn case is neutral", () => {
  it("returns the not-applicable report and never penalises", () => {
    const report = evaluateMemory(evalCase(), [obs()]);
    expect(report.passed).toBe(true);
    expect(report.signal).toEqual({ contradicted: null, repeated_question: null });
    expect(report.findings).toHaveLength(1);
  });

  it("exposes the same neutral report as a constant", () => {
    expect(NOT_APPLICABLE_MEMORY.passed).toBe(true);
    expect(NOT_APPLICABLE_MEMORY.signal.contradicted).toBeNull();
  });
});

describe("CA-9A memory — preservation", () => {
  it("passes when the later reply does not deny the established fact", () => {
    const report = evaluateMemory(twoTurn, [
      obs({ reply: "Perfecto, para un restaurante la página con QR te sirve mucho." }),
      obs({ reply: "Puedo mostrarte cómo quedaría el menú en tu página con QR." }),
    ]);
    expect(report.signal.contradicted).toBeNull();
    expect(report.findings.find((f) => f.scenario === "memory_preservation")?.ok).toBe(true);
    expect(report.passed).toBe(true);
  });

  it("fails and reports the term when the later reply denies it", () => {
    const report = evaluateMemory(twoTurn, [
      obs(),
      obs({ reply: "No, no eres un restaurante; eso no lo dijiste." }),
    ]);
    expect(report.signal.contradicted).toBe("restaurante");
    expect(report.findings.find((f) => f.scenario === "memory_preservation")?.ok).toBe(false);
    expect(report.passed).toBe(false);
  });
});

describe("CA-9A memory — no duplicate questions", () => {
  it("fails when the same question is asked in two turns", () => {
    const question = "¿A qué te dedicas?";
    const report = evaluateMemory(twoTurn, [obs({ reply: asks(question) }), obs({ reply: asks(question) })]);
    expect(report.signal.repeated_question).not.toBeNull();
    expect(report.findings.find((f) => f.scenario === "no_duplicate_questions")?.ok).toBe(false);
    expect(report.passed).toBe(false);
  });

  it("passes when the questions differ", () => {
    const report = evaluateMemory(twoTurn, [
      obs({ reply: asks("¿A qué te dedicas?") }),
      obs({ reply: asks("¿Quieres empezar hoy?") }),
    ]);
    expect(report.signal.repeated_question).toBeNull();
    expect(report.passed).toBe(true);
  });
});

describe("CA-9A memory — refusal persistence", () => {
  it("fails when a later grounded turn claims an executed action after a refusal", () => {
    const report = evaluateMemory(twoTurn, [
      obs({ reply: REFUSAL_MESSAGES.INVALID_INPUT, refused: true, grounding_status: "FALLBACK", suggested_action: "NONE" }),
      obs({ reply: "Ya creé tu página y quedó lista.", grounding_status: "GROUNDED" }),
    ]);
    expect(report.findings.find((f) => f.scenario === "refusal_persistence")?.ok).toBe(false);
    expect(report.passed).toBe(false);
  });

  it("passes when the later turn keeps the refusal and claims nothing", () => {
    const report = evaluateMemory(twoTurn, [
      obs({ reply: REFUSAL_MESSAGES.TURN_LIMIT_REACHED, refused: true, grounding_status: "FALLBACK", suggested_action: "NONE" }),
      obs({ reply: "Puedo explicarte cómo funciona la página con QR." }),
    ]);
    expect(report.findings.find((f) => f.scenario === "refusal_persistence")?.ok).toBe(true);
    expect(report.passed).toBe(true);
  });
});

describe("CA-9A memory — commercial continuity", () => {
  it("fails when the final turn dead-ends", () => {
    const report = evaluateMemory(twoTurn, [
      obs({ reply: "Cuéntame de tu negocio." }),
      obs({ reply: "Entiendo.", relevant_capability_ids: [], suggested_action: "NONE" }),
    ]);
    expect(report.findings.find((f) => f.scenario === "commercial_continuity")?.ok).toBe(false);
    expect(report.passed).toBe(false);
  });

  it("passes when the final turn still moves the conversation", () => {
    const report = evaluateMemory(twoTurn, [
      obs(),
      obs({ reply: "¿Quieres que te muestre el editor?", suggested_action: "OFFER_HELP" }),
    ]);
    expect(report.findings.find((f) => f.scenario === "commercial_continuity")?.ok).toBe(true);
    expect(report.passed).toBe(true);
  });
});
