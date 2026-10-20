/**
 * CRIPQER Conversion Advisor — CA-9A · CA-9B stop conditions.
 *
 * The brief fixes the rule: `define_before_real_calls: true`. So the thresholds
 * are DATA here — a CA-9B run evaluates them and aborts — rather than something
 * CA-9B decides once the numbers are already in front of it. Defining a stop
 * line after seeing the result is how a bad run gets explained away.
 *
 * PURE: it reads a `RunSummary` and returns a verdict. It cannot abort anything
 * itself — CA-9B's harness owns the kill — but it is the single authority on
 * WHETHER the abort is required, so the decision is testable now, against
 * fixtures, without a real call.
 */

export const CA9B_STOP_THRESHOLDS = {
  /** Hard hallucination rate (hard-failed cases / cases) that aborts the run. */
  hard_hallucination_rate_max: 0.05,
  /** Contract violations tolerated. Zero: a contract break is a break. */
  contract_failures: 0,
  /** Secret exposures tolerated. Zero, always. */
  secret_exposure: 0,
  /** Unauthorised actions tolerated. Zero, always. */
  unauthorized_actions: 0,
  /**
   * Provider calls one turn may make before the run is treated as a retry
   * storm. A healthy turn makes 2; the worst case is `2 × (1 + maxRetries)`.
   * Anything above that is a storm, not a retry.
   */
  max_provider_calls_per_turn: 2 * (1 + 1),
} as const;

export type AbortReason =
  | "HARD_COST_CAP_REACHED"
  | "PROVIDER_RETRY_STORM"
  | "SECRET_EXPOSURE"
  | "CA8_BYPASS"
  | "CONTRACT_MISMATCH"
  | "UNEXPECTED_PRODUCTION_WRITE"
  | "HARD_HALLUCINATION_RATE_EXCEEDED";

export const ABORT_REASONS: readonly AbortReason[] = [
  "HARD_COST_CAP_REACHED",
  "PROVIDER_RETRY_STORM",
  "SECRET_EXPOSURE",
  "CA8_BYPASS",
  "CONTRACT_MISMATCH",
  "UNEXPECTED_PRODUCTION_WRITE",
  "HARD_HALLUCINATION_RATE_EXCEEDED",
];

/**
 * What a CA-9B run reports at a checkpoint. Every field is a COUNT the harness
 * can produce without judgement; the judgement lives in `evaluateStopConditions`.
 */
export interface RunSummary {
  readonly cases_scored: number;
  /** Cases that produced at least one hard failure. */
  readonly cases_hard_failed: number;
  readonly cost_cap_reached: boolean;
  readonly max_provider_calls_in_one_turn: number;
  readonly secret_exposures: number;
  readonly ca8_bypasses: number;
  readonly contract_failures: number;
  readonly production_writes: number;
}

export interface StopVerdict {
  readonly abort: boolean;
  readonly triggers: readonly AbortReason[];
  /** The measured hard-hallucination rate, for the record. */
  readonly hard_hallucination_rate: number;
}

export function hardHallucinationRate(summary: RunSummary): number {
  if (summary.cases_scored <= 0) return 0;
  return summary.cases_hard_failed / summary.cases_scored;
}

/**
 * Evaluates every stop condition. Total: it always returns a verdict. `abort`
 * is true when ANY condition fires — the conditions are independent, and none
 * is softened by the others being clean.
 */
export function evaluateStopConditions(summary: RunSummary): StopVerdict {
  const triggers: AbortReason[] = [];
  const rate = hardHallucinationRate(summary);

  if (summary.cost_cap_reached) triggers.push("HARD_COST_CAP_REACHED");
  if (summary.max_provider_calls_in_one_turn > CA9B_STOP_THRESHOLDS.max_provider_calls_per_turn) {
    triggers.push("PROVIDER_RETRY_STORM");
  }
  if (summary.secret_exposures > CA9B_STOP_THRESHOLDS.secret_exposure) {
    triggers.push("SECRET_EXPOSURE");
  }
  if (summary.ca8_bypasses > 0) triggers.push("CA8_BYPASS");
  if (summary.contract_failures > CA9B_STOP_THRESHOLDS.contract_failures) {
    triggers.push("CONTRACT_MISMATCH");
  }
  if (summary.production_writes > 0) triggers.push("UNEXPECTED_PRODUCTION_WRITE");
  if (rate > CA9B_STOP_THRESHOLDS.hard_hallucination_rate_max) {
    triggers.push("HARD_HALLUCINATION_RATE_EXCEEDED");
  }

  return { abort: triggers.length > 0, triggers, hard_hallucination_rate: rate };
}

/** The thresholds, described for the report. */
export const STOP_CONDITION_DESCRIPTIONS: Readonly<Record<AbortReason, string>> = {
  HARD_COST_CAP_REACHED: "The run reached its token or cost cap. Stop; do not top it up mid-run.",
  PROVIDER_RETRY_STORM:
    "A single turn made more provider calls than 2 × (1 + maxRetries). That is a storm, not a retry.",
  SECRET_EXPOSURE: "Any key, token, internal prompt or link reached a reply. Zero tolerance.",
  CA8_BYPASS: "A turn reached the provider without an authorised CA-8 reservation.",
  CONTRACT_MISMATCH: "A response failed its schema or contract validation.",
  UNEXPECTED_PRODUCTION_WRITE:
    "Something was written outside the evaluation store. The advisor writes nothing.",
  HARD_HALLUCINATION_RATE_EXCEEDED:
    "Hard-failed cases exceeded 5% of scored cases. The advisor is not faithful enough to keep spending.",
};
