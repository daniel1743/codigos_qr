/**
 * QA-only transformation classifier. Pure, deterministic and evidence-derived.
 * It never invents backend stages or fakes API activity.
 */

import type { DiagnosticStatus, TransformationV1 } from "./types";
import { DIAGNOSTIC_ICONS } from "./types";

export function icon(status: DiagnosticStatus | "OK"): string {
  if (status === "OK") return "✅";
  return DIAGNOSTIC_ICONS[status];
}

export function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function sameText(a: unknown, b: unknown): boolean {
  if (a === undefined || b === undefined) return a === b;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/**
 * Generic classification for a before/after value pair.
 *
 * - both present and equal          -> PRESERVED
 * - output present but input absent -> FALLBACK (system supplied default)
 * - input present but output absent -> LOST
 * - both present but different      -> DEGRADED (survived, lost specificity)
 */
export function classifyTransformation(
  field: string,
  input: unknown,
  output: unknown,
  note?: string,
): TransformationV1 {
  const status: DiagnosticStatus = isMissing(input) && !isMissing(output)
    ? "FALLBACK"
    : !isMissing(input) && isMissing(output)
      ? "LOST"
      : sameText(input, output)
        ? "PRESERVED"
        : "DEGRADED";
  return { field, input, output, status, ...(note ? { note } : {}) };
}

/** "Tienda de ropa" → "other" is a loss of specificity, not a total loss. */
export function classifyBusinessCategory(input: unknown, output: unknown): TransformationV1 {
  const status: DiagnosticStatus =
    !isMissing(input) && !isMissing(output) && !sameText(input, output) && output === "other"
      ? "DEGRADED"
      : classifyTransformation("business category", input, output).status;
  return {
    field: "business category",
    input,
    output,
    status,
    ...(status === "DEGRADED"
      ? { note: "Free-form category collapsed to 'other' by the strict engine category map." }
      : {}),
  };
}

/** undefined → "professional" is a system default (fallback). */
export function classifyPersonality(input: unknown, output: unknown): TransformationV1 {
  return classifyTransformation(
    "visual personality",
    input,
    output,
    isMissing(input) && !isMissing(output)
      ? "No style was threaded to the engine; it fell back to 'professional'."
      : undefined,
  );
}

/** "bookings" → "leads" is intent degradation. */
export function classifyGoal(input: unknown, output: unknown): TransformationV1 {
  const t = classifyTransformation("primary goal", input, output);
  if (t.status === "DEGRADED") {
    t.note = "Owner goal was flattened to a weaker engine goal.";
  }
  return t;
}

/** Value authored by the Engine in place of a semantic hint. */
export function reauthored(field: string, output: unknown, note?: string): TransformationV1 {
  return { field, output, status: "REAUTHORED", ...(note ? { note } : {}) };
}

/** Desired capability exists but is not currently supported in that layer. */
export function notSupported(field: string, note?: string): TransformationV1 {
  return { field, status: "NOT_SUPPORTED", ...(note ? { note } : {}) };
}
