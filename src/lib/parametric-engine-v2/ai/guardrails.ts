import { MEDIA_ROLES, isMediaRole } from "../media/types";
import type { ControlledAdjustment, SupervisorEvaluation, SupervisorSuggestion } from "./types";

const ADJUSTMENTS: readonly ControlledAdjustment[] = [
  "prefer-different-media-candidate",
  "remove-unnecessary-optional-block",
  "promote-existing-cta",
  "reduce-media-density",
  "choose-alternate-existing-media-strategy",
  "prefer-simpler-composition",
];

const FORBIDDEN_TEXT = /(?:<style|<script|css\s*:|block\s*type|arbitrary|javascript:)/i;

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim().slice(0, max);
  return result && !FORBIDDEN_TEXT.test(result) ? result : null;
}

function isAdjustment(value: unknown): value is ControlledAdjustment {
  return typeof value === "string" && ADJUSTMENTS.includes(value as ControlledAdjustment);
}

function validateSuggestion(value: unknown): SupervisorSuggestion {
  if (!value || typeof value !== "object") throw new Error("Invalid supervisor suggestion");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["adjustment", "reason", "role"].includes(key))) {
    throw new Error("Supervisor suggestion contains unsupported fields");
  }
  const adjustment = input["adjustment"];
  const reason = boundedText(input["reason"], 280);
  const role = input["role"];
  if (!isAdjustment(adjustment) || !reason) throw new Error("Unsupported supervisor suggestion");
  if (role !== undefined && !isMediaRole(role))
    throw new Error("Unsupported supervisor media role");
  return { adjustment, reason, ...(role ? { role } : {}) };
}

/** Strict boundary: AI can return only the review vocabulary, never config. */
export function validateSupervisorEvaluation(value: unknown): SupervisorEvaluation {
  if (!value || typeof value !== "object") throw new Error("Invalid supervisor evaluation");
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some(
      (key) => !["verdict", "coherence_score", "warnings", "suggestions"].includes(key),
    )
  ) {
    throw new Error("Supervisor evaluation contains unsupported fields");
  }
  const verdict = input["verdict"];
  const score = input["coherence_score"];
  const warnings = input["warnings"];
  const suggestions = input["suggestions"];
  if (verdict !== "PASS" && verdict !== "PASS_WITH_WARNINGS" && verdict !== "REVISE") {
    throw new Error("Invalid supervisor verdict");
  }
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error("Invalid supervisor coherence score");
  }
  if (!Array.isArray(warnings) || warnings.length > 12)
    throw new Error("Invalid supervisor warnings");
  if (!warnings.every((warning) => boundedText(warning, 280)))
    throw new Error("Invalid supervisor warning");
  if (!Array.isArray(suggestions) || suggestions.length > 6)
    throw new Error("Invalid supervisor suggestions");
  return {
    verdict,
    coherence_score: Math.round(score),
    warnings: warnings.map((warning) => boundedText(warning, 280)!),
    suggestions: suggestions.map(validateSuggestion),
  };
}

export function planControlledAdjustments(
  evaluation: SupervisorEvaluation,
): SupervisorSuggestion[] {
  return evaluation.suggestions.filter((suggestion) => ADJUSTMENTS.includes(suggestion.adjustment));
}

export { ADJUSTMENTS, MEDIA_ROLES };
