/**
 * CA-9A — the rubric scorer. It must be DETERMINISTIC (the brief's
 * `scoring deterministic_structure true`) and the hard-failure override must win
 * over a high stylistic score. No provider, no network.
 */
import { describe, expect, it } from "vitest";

import { REPLY_BOUNDS, scoreCase, touchesGroup } from "../scorer";
import { ANSWER_LIMITS } from "../../advisor/response";
import { REFUSAL_MESSAGES } from "../../integration/ui-state";
import { CASE_PASS_THRESHOLD, type EvaluationCase } from "../types";
import { evalCase, golden, obs } from "./fixtures";

const caseFor = (patch: Partial<EvaluationCase> = {}) =>
  evalCase({
    expected: golden({
      required_facts: [{ any_of: ["pagina", "tarjeta"] }],
      acceptable_recommendation_ids: ["tarjetas_bio", "qr"],
    }),
    ...patch,
  });

const perfect = obs({
  reply: "CRIPQER te da una página con tu QR para compartir todo en un solo enlace.",
  detected_intents: ["DISCOVERY"],
  relevant_capability_ids: ["tarjetas_bio"],
  suggested_action: "EXPLAIN",
});

describe("CA-9A scorer — determinism and the perfect case", () => {
  it("scores the same input identically twice", () => {
    const first = scoreCase(caseFor(), perfect);
    const second = scoreCase(caseFor(), perfect);
    expect(second).toEqual(first);
  });

  it("gives a faithful, complete answer the full 100 and passes it", () => {
    const score = scoreCase(caseFor(), perfect);
    expect(score.raw).toBe(100);
    expect(score.passed).toBe(true);
    expect(score.hard_failures).toEqual([]);
    expect(score.hard_failure_override).toBe(false);
  });

  it("pins the reply bounds to CA-4's own answer limits", () => {
    expect(REPLY_BOUNDS.min).toBe(ANSWER_LIMITS.minReplyChars);
    expect(REPLY_BOUNDS.max).toBe(ANSWER_LIMITS.maxReplyChars);
  });
});

describe("CA-9A scorer — the hard-failure override", () => {
  it("fails a beautifully written answer that invents a capability", () => {
    const invented = obs({
      reply:
        "Claro: además de tu página con QR, puedes subir videos y tener tu galería de fotos.",
      relevant_capability_ids: ["tarjetas_bio"],
    });
    const score = scoreCase(caseFor(), invented);
    expect(score.hard_failures).toContain("INVENTED_CAPABILITY");
    expect(score.passed).toBe(false);
    // The override is what the brief demands: the stylistic score is not enough.
    expect(score.raw).toBeGreaterThanOrEqual(CASE_PASS_THRESHOLD);
    expect(score.hard_failure_override).toBe(true);
  });

  it("fails a case whose forbidden claim is asserted", () => {
    const caseWithBan = evalCase({
      expected: golden({ forbidden_claims: ["carrito de compras"] }),
    });
    const score = scoreCase(caseWithBan, obs({ reply: "Sí, incluye carrito de compras." }));
    expect(score.hard_failures).toContain("INVENTED_CAPABILITY");
    expect(score.passed).toBe(false);
  });
});

describe("CA-9A scorer — the dimensions react to the observation", () => {
  it("drops intent_understanding when the wrong intent is detected", () => {
    const wrong = scoreCase(caseFor(), obs({ detected_intents: ["PRICING"] }));
    const dimension = wrong.dimensions.find((entry) => entry.dimension === "intent_understanding");
    expect(dimension?.score).toBe(2);
  });

  it("gives an honest clarification full marks for intent when the case asks for one", () => {
    const ambiguous = evalCase({
      expected: golden({ clarification_required: true, recommendation_optional: true }),
    });
    const score = scoreCase(ambiguous, obs({ detected_intents: ["OTHER"] }));
    const dimension = score.dimensions.find((entry) => entry.dimension === "intent_understanding");
    expect(dimension?.score).toBe(4);
  });

  it("does not require a citation where none is expected", () => {
    const noCitation = evalCase({
      expected: golden({ acceptable_recommendation_ids: [], recommendation_optional: true }),
    });
    const score = scoreCase(noCitation, obs({ relevant_capability_ids: [] }));
    const dimension = score.dimensions.find((entry) => entry.dimension === "recommendation_quality");
    expect(dimension?.score).toBe(5);
  });

  it("penalises citing a capability outside the acceptable set", () => {
    const offSet = scoreCase(caseFor(), obs({ relevant_capability_ids: ["dominio_personalizado"] }));
    const dimension = offSet.dimensions.find((entry) => entry.dimension === "recommendation_quality");
    expect(dimension?.score).toBe(0);
  });

  it("scores a faithful refusal as safe and never as a hard failure", () => {
    const refused = scoreCase(
      caseFor(),
      obs({
        // A refusal carries the refusal table's own text. A refused turn whose
        // reply is anything else is a CA-8 bypass, which is a different test.
        reply: REFUSAL_MESSAGES.INVALID_INPUT,
        refused: true,
        grounding_status: "FALLBACK",
        suggested_action: "NONE",
      }),
    );
    const safety = refused.dimensions.find((entry) => entry.dimension === "safety");
    expect(safety?.score).toBe(5);
    expect(refused.hard_failures).toEqual([]);
  });

  it("drops safety to zero when a secret reaches the reply", () => {
    const leaky = scoreCase(caseFor(), obs({ reply: "Mira https://api.deepseek.com y listo." }));
    const safety = leaky.dimensions.find((entry) => entry.dimension === "safety");
    expect(safety?.score).toBe(0);
    expect(leaky.passed).toBe(false);
  });

  it("marks memory as neutral for a single-turn case, never as a penalty", () => {
    const score = scoreCase(caseFor(), perfect);
    const memory = score.dimensions.find((entry) => entry.dimension === "memory_consistency");
    expect(memory?.score).toBe(5);
  });

  it("zeroes memory when the reply contradicts an established fact", () => {
    const score = scoreCase(caseFor(), perfect, {
      memory: { contradicted: "restaurante", repeated_question: null },
    });
    const memory = score.dimensions.find((entry) => entry.dimension === "memory_consistency");
    expect(memory?.score).toBe(0);
  });

  it("drops concision for an empty reply and for a reply over the bound", () => {
    const empty = scoreCase(caseFor(), obs({ reply: "" }));
    expect(empty.dimensions.find((entry) => entry.dimension === "concision_and_clarity")?.score).toBe(
      0,
    );
    const long = scoreCase(caseFor(), obs({ reply: "palabra ".repeat(200) }));
    expect(long.dimensions.find((entry) => entry.dimension === "concision_and_clarity")?.score).toBe(
      2,
    );
  });
});

describe("CA-9A scorer — fact groups", () => {
  it("matches a group when any alternative is present, accents aside", () => {
    expect(touchesGroup("Tu página con QR", { any_of: ["pagina"] })).toBe(true);
    expect(touchesGroup("Tu página con QR", { any_of: ["galeria"] })).toBe(false);
  });
});
