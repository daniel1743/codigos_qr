/**
 * CRIPQER GENERATION INSPECTOR V1 — QA-only trace contracts.
 *
 * These types describe a DIAGNOSTIC trace of one generation attempt. They are
 * NOT a canonical schema, NOT persisted remotely, and never influence
 * generation output. They exist only so the /onboarding-test inspector can
 * show where a signal was PRESERVED, DEGRADED, LOST, FALLBACK, REAUTHORED or
 * NOT_SUPPORTED across the generation chain.
 */

export type DiagnosticStatus =
  | "PRESERVED"
  | "DEGRADED"
  | "LOST"
  | "FALLBACK"
  | "REAUTHORED"
  | "NOT_SUPPORTED";

export const DIAGNOSTIC_ICONS: Record<DiagnosticStatus, string> = {
  PRESERVED: "✅",
  DEGRADED: "⚠️",
  LOST: "❌",
  FALLBACK: "↪",
  REAUTHORED: "◆",
  NOT_SUPPORTED: "◌",
};

export interface FieldTraceV1 {
  /** Human label of the tracked signal (e.g. "business category"). */
  field: string;
  /** Value observed at the input side of the boundary. */
  input?: unknown;
  /** Value observed at the output side of the boundary. */
  output?: unknown;
  status: DiagnosticStatus;
  /** Evidence note — never invented, always derived from real values. */
  note?: string;
}

export type TraceStageId =
  | "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "T8" | "T9" | "T10"
  | "E18" | "E19" | "E20" | "E20B" | "E21" | "E22";

export interface TraceStageV1 {
  id: TraceStageId;
  name: string;
  contract: string;
  /** "ok" | "degraded" | "lost" | "fallback" | "failed" */
  status: "ok" | "degraded" | "lost" | "fallback" | "failed";
  /** Sanitized snapshot of the stage value. */
  data: unknown;
  /** Field-by-field classification for this stage. */
  fields: FieldTraceV1[];
}

export interface TransformationV1 {
  field: string;
  input?: unknown;
  output?: unknown;
  status: DiagnosticStatus;
  note?: string;
}

export interface EngineStrategySnapshotV1 {
  businessCategory: string;
  visualPersonality: string;
  primaryGoal: string;
  archetype: string;
  familyBias: Record<string, number>;
  familyScores: Record<string, number>;
  familyScoresBeforeBias: Record<string, number>;
  selectedFamily: string;
  layout: string;
  pattern: string;
  preset: string | null;
  mediaStrategy: string;
  score: number;
  candidateId: string;
  fingerprint: string;
}

export interface VisualAuthoringSnapshotV1 {
  family: string;
  typography: Record<string, unknown>;
  colors: Record<string, unknown>;
  background: Record<string, unknown>;
  cards: Record<string, unknown>;
  buttons: Record<string, unknown>;
  spacing: Record<string, unknown>;
  motion: Record<string, unknown>;
  texture: Record<string, unknown>;
  selected: string[];
  notSelected: string[];
  unsupported: string[];
  blocks: Array<{ type: string; variant: string }>;
}

export interface LayerHealthV1 {
  status: DiagnosticStatus | "OK";
  /** Short evidence string backing the status. */
  evidence: string;
}

export interface LayerSummaryV1 {
  SEMANTICS: LayerHealthV1;
  OWNER_CONTENT: LayerHealthV1;
  SMART_PAGES: LayerHealthV1;
  HOST_MAP: LayerHealthV1;
  PAGES_7: LayerHealthV1;
  ENGINE_ARCHETYPE: LayerHealthV1;
  ENGINE_FAMILY: LayerHealthV1;
  VISUAL_AUTHORING: LayerHealthV1;
  CONTEXTUAL_MEDIA: LayerHealthV1;
  CANONICAL: LayerHealthV1;
  RENDERER: LayerHealthV1;
}

export interface AutoDiagnosisV1 {
  primaryIssue: string | null;
  explanation: string;
  secondaryFindings: string[];
}

export interface MediaDiagnosticV1 {
  ownerMediaAvailable: boolean;
  ownerMediaPriority: boolean;
  contextualMediaNeeded: boolean;
  contextualMediaAllowed: boolean;
  unsplashConnected: boolean;
  pexelsConnected: boolean;
  searchQuery: string | null;
  selectedAsset: string | null;
  fallbackReason: string | null;
  result: string;
}

export interface GenerationFailureV1 {
  stage: TraceStageId;
  stageName: string;
  code: string;
  message: string;
  validator?: string;
  payload?: unknown;
  issues?: unknown;
}

export interface GenerationTraceV1 {
  traceId: string;
  startedAt: string;
  scenarioId: string;
  stages: TraceStageV1[];
  transformations: TransformationV1[];
  engine: EngineStrategySnapshotV1 | null;
  visual: VisualAuthoringSnapshotV1 | null;
  media: MediaDiagnosticV1;
  diagnostics: AutoDiagnosisV1;
  firstDivergence: TransformationV1 | null;
  summary: LayerSummaryV1;
  failure?: GenerationFailureV1;
}
