/**
 * CRIPQER GENERATION INSPECTOR V1 — QA-only diagnostic tooling.
 *
 * Pure, deterministic trace contracts + classifier + recorder. Nothing here
 * changes generation output, persists data, or is exposed on production routes.
 */

export {
  DIAGNOSTIC_ICONS,
  type AutoDiagnosisV1,
  type DiagnosticStatus,
  type EngineStrategySnapshotV1,
  type FieldTraceV1,
  type GenerationFailureV1,
  type GenerationTraceV1,
  type LayerHealthV1,
  type LayerSummaryV1,
  type MediaDiagnosticV1,
  type TraceStageId,
  type TraceStageV1,
  type TransformationV1,
  type VisualAuthoringSnapshotV1,
} from "./types";
export {
  classifyBusinessCategory,
  classifyGoal,
  classifyPersonality,
  classifyTransformation,
  icon,
  notSupported,
  reauthored,
} from "./classify";
export { buildAutoDiagnosis, buildMediaDiagnostic, buildSummary } from "./diagnose";
export { buildEngineSnapshot, buildGenerationTrace, buildVisualSnapshot } from "./recorder";
export {
  appendBlackBoxStage,
  canonicalRuntimeSnapshot,
  captureEffectiveDomSnapshot,
  findBlackBoxTraceForPage,
  readBlackBoxTrace,
  storeBlackBoxTrace,
} from "./runtime";

/** QA correlation id. Never a public_id, page id or canonical field. */
export function createTraceId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `CRPQ-BLACKBOX-${suffix}`;
}
