import type { MediaRole, NormalizedMediaProvider } from "../media/types";

export type SupervisorVerdict = "PASS" | "PASS_WITH_WARNINGS" | "REVISE";
export type SupervisorStatus = "available" | "unavailable";
export type ControlledAdjustment =
  | "prefer-different-media-candidate"
  | "remove-unnecessary-optional-block"
  | "promote-existing-cta"
  | "reduce-media-density"
  | "choose-alternate-existing-media-strategy"
  | "prefer-simpler-composition";

export interface SupervisorMediaInput {
  role: MediaRole;
  provider: NormalizedMediaProvider;
  query: string;
  alt: string;
}

export interface SupervisorEngineSummary {
  family: string;
  layout: string;
  mediaStrategy: string;
  blockSequence: string[];
  ctaStrategy: string;
  backgroundStrategy: string;
  buttonCardStrategy: string;
  contentDensity?: string;
}

export interface SupervisorInput {
  userIntent: {
    profession: string;
    goal: string;
    style: string;
    selectedFeatures: string[];
    contentDensity?: string;
    availableUserMedia: string[];
  };
  selectedMedia: SupervisorMediaInput[];
  engineSummary: SupervisorEngineSummary;
}

export interface SupervisorSuggestion {
  adjustment: ControlledAdjustment;
  reason: string;
  role?: MediaRole;
}

export interface SupervisorEvaluation {
  verdict: SupervisorVerdict;
  coherence_score: number;
  warnings: string[];
  suggestions: SupervisorSuggestion[];
}

export interface SupervisorOutcome {
  status: SupervisorStatus;
  evaluation: SupervisorEvaluation | null;
  errorCode?: "MISSING_API_KEY" | "REQUEST_FAILED" | "INVALID_RESPONSE" | "DISABLED";
}

export const MAX_SUPERVISOR_ITERATIONS = 1 as const;
