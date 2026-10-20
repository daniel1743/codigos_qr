/**
 * CRIPQER Conversion Advisor — CA-9A.2 · the approved budget profile and the
 * executable hard USD cap.
 *
 * PURE. No I/O, no clock, no provider. This is where the OWNER's decision lives
 * as DATA, so two things stop being negotiable at run time:
 *
 *   model  = deepseek-flash
 *   token_cap = 500 000
 *   hard_cost_cap_usd = 5.00
 *
 * TWO RULES THAT GIVE THIS FILE ITS SHAPE
 *
 *  1. A cap may be TIGHTENED and never widened. `resolveAdvisorBudgetProfile`
 *     clamps any requested value to the approved ceiling and reports the attempt,
 *     so a bigger number in an environment variable cannot silently buy a bigger
 *     campaign — and "no automatic cap replenishment" is a property of the code
 *     rather than a promise. Widening is not "refused with an exception" either:
 *     the run continues on the approved cap, so an operator cannot break a
 *     campaign by setting a large value.
 *
 *  2. The USD cap is checked BEFORE a call, with the next request priced at its
 *     conservative ceiling (peak band, the CA-8 reservation as input, the
 *     configured max output). Reaching the cap stops the campaign; a request that
 *     could push past it is not started. That is what makes the cap EXECUTABLE
 *     instead of a report line.
 */

import { DEFAULT_ADVISOR_LIMITS, type AdvisorLimits } from "../guardrails/limits";
import {
  DEFAULT_RATE_BAND,
  usdForTokens,
  type AdvisorModelPricing,
  type AdvisorRateBand,
} from "./pricing";

/* ============================ the approved profile ====================== */

export const APPROVED_BUDGET_PROFILE_ID = "B_FULL_EXPECTED";

export interface AdvisorBudgetProfile {
  readonly id: string;
  readonly model: string;
  /** Tokens the campaign may consume across its process. */
  readonly tokenCap: number;
  /** Money the campaign may spend, in `currency`. */
  readonly hardCostCapUsd: number;
  readonly currency: string;
  readonly rateBand: AdvisorRateBand;
  readonly approved_by: "OWNER";
  readonly approved_at: string;
}

/** The owner decision of 2026-10-16. Changing this value is a new decision. */
export const APPROVED_ADVISOR_BUDGET_PROFILE: AdvisorBudgetProfile = {
  id: APPROVED_BUDGET_PROFILE_ID,
  model: "deepseek-flash",
  tokenCap: 500_000,
  hardCostCapUsd: 5.0,
  currency: "USD",
  rateBand: DEFAULT_RATE_BAND,
  approved_by: "OWNER",
  approved_at: "2026-10-16",
};

/* ============================ resolution ================================ */

export type BudgetCapName = "TOKEN_CAP" | "HARD_COST_CAP_USD";

export interface BudgetProfileEnv {
  readonly ADVISOR_TOKEN_CAP?: string | undefined;
  readonly ADVISOR_HARD_COST_CAP_USD?: string | undefined;
}

export interface ResolvedBudgetProfile {
  /** The profile the run actually uses: never above the approved ceilings. */
  readonly profile: AdvisorBudgetProfile;
  readonly approved: AdvisorBudgetProfile;
  readonly requested: {
    readonly tokenCap: number | null;
    readonly hardCostCapUsd: number | null;
  };
  /** Caps a caller asked to RAISE. The request was refused. */
  readonly widen_attempts: readonly BudgetCapName[];
  /** Caps that were lowered below the approved value (allowed). */
  readonly tightened: readonly BudgetCapName[];
}

const readCap = (raw: string | undefined): number | null => {
  if (raw === undefined) return null;
  const parsed = Number.parseFloat(String(raw).trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

export function resolveAdvisorBudgetProfile(
  env: BudgetProfileEnv = {},
  approved: AdvisorBudgetProfile = APPROVED_ADVISOR_BUDGET_PROFILE,
): ResolvedBudgetProfile {
  const requestedTokenCap = readCap(env.ADVISOR_TOKEN_CAP);
  const requestedHardCostCapUsd = readCap(env.ADVISOR_HARD_COST_CAP_USD);

  const widenAttempts: BudgetCapName[] = [];
  const tightened: BudgetCapName[] = [];

  const settle = (name: BudgetCapName, requested: number | null, ceiling: number): number => {
    if (requested === null) return ceiling;
    if (requested > ceiling) {
      widenAttempts.push(name);
      return ceiling;
    }
    if (requested < ceiling) tightened.push(name);
    return requested;
  };

  const tokenCap = settle("TOKEN_CAP", requestedTokenCap, approved.tokenCap);
  const hardCostCapUsd = settle(
    "HARD_COST_CAP_USD",
    requestedHardCostCapUsd,
    approved.hardCostCapUsd,
  );

  return {
    profile: { ...approved, tokenCap, hardCostCapUsd },
    approved,
    requested: { tokenCap: requestedTokenCap, hardCostCapUsd: requestedHardCostCapUsd },
    widen_attempts: widenAttempts,
    tightened,
  };
}

/* ============================ campaign limits =========================== */

/**
 * Guard limits for a campaign: every CA-8 limit is unchanged except the daily
 * token ceiling, which becomes the approved cap. Reservations, TTL, concurrency,
 * the circuit breaker and the kill switch keep their own values — CA-8 stays CA-8.
 */
export function campaignLimitsFromProfile(
  profile: AdvisorBudgetProfile,
  base: AdvisorLimits = DEFAULT_ADVISOR_LIMITS,
): AdvisorLimits {
  return { ...base, dailyTokenBudget: Math.max(1, Math.floor(profile.tokenCap)) };
}

/** A caller that injected its own limits may only make the ceiling tighter. */
export function tightenCampaignLimits(
  base: AdvisorLimits,
  profile: AdvisorBudgetProfile,
): AdvisorLimits {
  return {
    ...base,
    dailyTokenBudget: Math.max(1, Math.min(base.dailyTokenBudget, Math.floor(profile.tokenCap))),
  };
}

/**
 * CA-9C — the limits a campaign runs with when the caller MAY pass its own.
 *
 * The defect this replaces: `runDataset` tightened the CALLER's object against
 * the profile, and `tightenCampaignLimits` starts from whatever budget that
 * object carries. So a caller that spread `DEFAULT_ADVISOR_LIMITS` only to widen
 * a rate-limit window silently carried its `dailyTokenBudget: 200_000` into the
 * campaign, and the approved 500 000 ceiling became 200 000. CA-9B hit exactly
 * this in the offline replay: it stopped at 121 of 168 records with
 * `BUDGET_EXHAUSTED` while the paid run — which passed no limits — finished.
 *
 * The rule, stated as the invariant the tests pin:
 *   · no limits              → the approved cap (500 000)
 *   · an explicit smaller cap → honoured (the caller may tighten)
 *   · an explicit larger cap  → clamped to the approved cap (may NOT widen)
 *   · a value equal to `DEFAULT_ADVISOR_LIMITS.dailyTokenBudget` is NOT an
 *     instruction about budget — it is what a caller gets by spreading the
 *     defaults to adjust some other window — so the approved cap is used.
 *
 * The last line is the one judgement call, and its cost is stated: a caller that
 * genuinely wants exactly 200 000 cannot say so through this option. That is
 * accepted because 200 000 IS the legacy default, so the two intents are
 * indistinguishable at this boundary, and the failure mode of guessing wrong is
 * spending the budget the owner approved rather than a quarter of it.
 */
export function resolveCampaignLimits(
  requested: AdvisorLimits | undefined,
  profile: AdvisorBudgetProfile,
  base: AdvisorLimits = DEFAULT_ADVISOR_LIMITS,
): AdvisorLimits {
  if (requested === undefined) return campaignLimitsFromProfile(profile, base);

  const cap = Math.max(1, Math.floor(profile.tokenCap));
  const asked = requested.dailyTokenBudget;
  const explicit = asked !== base.dailyTokenBudget && Number.isFinite(asked) && asked > 0;
  return { ...requested, dailyTokenBudget: explicit ? Math.max(1, Math.min(asked, cap)) : cap };
}

/* ========================== the executable cap ========================== */

/** The one stop reason a USD stop is allowed to use, as CA-9A named it. */
export const HARD_COST_CAP_STOP_REASON = "HARD_COST_CAP_REACHED";

export type HardCostCapTrigger = "CAP_REACHED" | "NEXT_REQUEST_WOULD_OVERRUN";

export interface HardCostCapDecision {
  readonly allow: boolean;
  readonly stop_reason: typeof HARD_COST_CAP_STOP_REASON | null;
  readonly trigger: HardCostCapTrigger | null;
  readonly spent_usd: number;
  readonly cap_usd: number;
  readonly next_request_upper_bound_usd: number;
  /** What is left before the cap, floored at zero. For the report, not the decision. */
  readonly remaining_usd: number;
  readonly note: string;
}

/**
 * The decision the campaign consults BEFORE every call.
 *
 * Reaching the cap stops it; a request whose conservative ceiling does not fit
 * under the cap is not started, so the campaign cannot silently overrun. An
 * unusable cap (zero, negative, not a number) fails CLOSED: no cap means no
 * permission, never an unbounded run.
 */
export function evaluateHardCostCap(input: {
  readonly spentUsd: number;
  readonly capUsd: number;
  readonly nextRequestUpperBoundUsd?: number | undefined;
}): HardCostCapDecision {
  const spent = Number.isFinite(input.spentUsd) ? Math.max(0, input.spentUsd) : 0;
  const cap = input.capUsd;
  const nextBound = Number.isFinite(input.nextRequestUpperBoundUsd)
    ? Math.max(0, input.nextRequestUpperBoundUsd as number)
    : 0;
  const remaining = Number.isFinite(cap) ? Math.max(0, cap - spent) : 0;

  const stop = (trigger: HardCostCapTrigger, note: string): HardCostCapDecision => ({
    allow: false,
    stop_reason: HARD_COST_CAP_STOP_REASON,
    trigger,
    spent_usd: spent,
    cap_usd: cap,
    next_request_upper_bound_usd: nextBound,
    remaining_usd: remaining,
    note,
  });

  if (!Number.isFinite(cap) || cap <= 0) {
    return stop("CAP_REACHED", "No usable USD cap is configured; refusing to spend.");
  }
  if (spent >= cap) {
    return stop("CAP_REACHED", `Accumulated USD ${spent} reached the cap ${cap}.`);
  }
  if (spent + nextBound > cap) {
    return stop(
      "NEXT_REQUEST_WOULD_OVERRUN",
      `The next request's ceiling ${nextBound} would pass the cap ${cap} from ${spent}.`,
    );
  }
  return {
    allow: true,
    stop_reason: null,
    trigger: null,
    spent_usd: spent,
    cap_usd: cap,
    next_request_upper_bound_usd: nextBound,
    remaining_usd: remaining,
    note: `Allowed: ${remaining} USD left before the cap.`,
  };
}

/**
 * The conservative ceiling of ONE provider operation, used as
 * `nextRequestUpperBoundUsd`. Input is bounded by the CA-8 reservation (the hold
 * the guard already demands), output by the configured maximum, and both are
 * priced at the PEAK band — so the number can only be too high, never too low.
 * A retry that the provider may make multiplies it by `attempts`.
 */
export function requestUpperBoundUsd(input: {
  readonly pricing: AdvisorModelPricing;
  readonly reservedTokens: number;
  readonly maxOutputTokens: number;
  readonly attempts?: number | undefined;
  readonly band?: AdvisorRateBand | undefined;
}): number {
  const band = input.band ?? DEFAULT_RATE_BAND;
  const rates = input.pricing.rates[band] ?? input.pricing.rates.PEAK;
  const attempts = Math.max(1, Math.floor(input.attempts ?? 1));
  const reserved = Math.max(0, Math.floor(input.reservedTokens));
  const maxOutput = Math.max(0, Math.floor(input.maxOutputTokens));
  return attempts * (
    usdForTokens(reserved, rates.cache_miss_input_usd_per_unit) +
    usdForTokens(maxOutput, rates.output_usd_per_unit)
  );
}
