/**
 * CA-9A — shared fixtures for the evaluation tests. Not a test file itself.
 *
 * Everything here is a BUILDER with sane defaults, so a test states only the one
 * field it is about. That keeps a failing assertion readable: if the test says
 * `refused: true`, nothing else in the observation was quietly different.
 */
import {
  NO_CONSUMPTION,
  OFFERABLE_ACTIONS,
  type EvaluationCase,
  type GoldenExpectation,
  type TurnObservation,
} from "../types";

export function obs(patch: Partial<TurnObservation> = {}): TurnObservation {
  return {
    reply: "CRIPQER reúne tu información y tus enlaces en una sola página con QR.",
    detected_intents: ["DISCOVERY"],
    relevant_capability_ids: [],
    suggested_action: "EXPLAIN",
    grounding_status: "GROUNDED",
    limitations: [],
    degraded: false,
    refused: false,
    error: false,
    consumption: NO_CONSUMPTION,
    ...patch,
  };
}

export function golden(patch: Partial<GoldenExpectation> = {}): GoldenExpectation {
  return {
    expected_intent: "DISCOVERY",
    required_facts: [],
    forbidden_claims: [],
    acceptable_recommendation_ids: [],
    recommendation_optional: false,
    acceptable_next_action: OFFERABLE_ACTIONS,
    action_should_be_offered: true,
    clarification_required: false,
    ...patch,
  };
}

export function evalCase(patch: Partial<EvaluationCase> = {}): EvaluationCase {
  return {
    id: "T-01",
    category: "product_discovery",
    persona: "negocio_pequeno",
    turns: ["¿Qué es CRIPQER?"],
    expected: golden(),
    ...patch,
  };
}
