/**
 * CRIPQER Conversion Advisor — CA-9A · the CA-8 cost budget.
 *
 * PURE and DERIVED. Every number here is computed from configuration the project
 * already carries — the guard's limits, the session limits and the dataset —
 * and NOT from a real provider query. The brief forbids measuring cost with real
 * calls in this phase ("NO realizar consultas reales para medir costos"), and
 * requires: "Usar configuración existente y precios configurados/documentados
 * dentro del proyecto si están disponibles."
 *
 * THE FINDING CA-9A STATED. The project carried NO documented price per token for
 * DeepSeek anywhere — not in the source, not in the environment example, not in a
 * plan document — and the configured model (`deepseek-chat`) was not in the
 * provider's published list (CA-9A.1: `CA9A_1_MODEL_PRICE_MISMATCH`). So the
 * dollar cap could not be derived and this module returned `COST_CAP_NOT_VERIFIED`
 * with a `null` figure rather than inventing a rate.
 *
 * WHAT CHANGED IN CA-9A.2. The owner decided and this module follows the
 * implementation instead of a placeholder:
 *
 *   model             = deepseek-flash   (`pricing.ts`, one source of truth)
 *   token_cap         = 500 000          (approved profile, executable)
 *   hard_cost_cap_usd = 5.00             (approved profile, executable)
 *
 * Every price below is now DERIVED from `pricing.ts` and every cap from
 * `budget-profile.ts`; the status is `VERIFIED` because a verifiable source
 * exists. Nothing here calls a provider — a price is data, and CA-9A.2 makes no
 * real call.
 *
 * THE SECOND FINDING (unchanged, and still true). At the guard's own reservation
 * floor the full dataset needs more tokens than one process holds, so CA-9B must
 * run the campaign with an explicit budget rather than inherit a default. With the
 * approved profile that budget is 500 000 tokens, which is what the runner now
 * configures.
 */

import { DEFAULT_ADVISOR_LIMITS } from "../guardrails/limits";
import { SESSION_LIMITS } from "../session/context";
import {
  APPROVED_ADVISOR_BUDGET_PROFILE,
  type AdvisorBudgetProfile,
} from "./budget-profile";
import { ADVERSARIAL_DATASET, EVALUATION_DATASET } from "./dataset";
import {
  DEFAULT_RATE_BAND,
  DEEPSEEK_FLASH_PRICING,
  per1kUsd,
  type AdvisorRateBand,
} from "./pricing";
import type { EvaluationCase } from "./types";

/**
 * CA-1's retry default. Repeated as a number rather than imported so this module
 * stays free of the provider module; a test pins it to `ADVISOR_DEFAULTS.maxRetries`
 * so the copy cannot drift.
 */
const DEFAULT_MAX_RETRIES = 1;

/** Two guarded operations per turn: CA-3 understanding and CA-4 advice. */
export const PROVIDER_OPERATIONS_PER_TURN = 2;

export type CostCapStatus = "VERIFIED" | "COST_CAP_NOT_VERIFIED";

export interface CostBudget {
  readonly dataset_cases: number;
  readonly adversarial_cases: number;
  readonly dataset_turns: number;
  /** Attempts one provider operation may make: `1 + maxRetries`. */
  readonly attempts_per_operation: number;
  /** Expected provider calls for the whole dataset (no retries). */
  readonly expected_provider_calls: number;
  /** Hard cap: every operation retries to its limit. */
  readonly max_provider_calls: number;
  /** Conversations the dataset opens. One per case. */
  readonly max_conversations: number;
  /** Turns a single conversation may take (CA-6). */
  readonly max_turns_per_conversation: number;
  /** The guard's per-process daily token ceiling the campaign runs with. */
  readonly daily_token_budget: number;
  /** What one operation holds before it runs. */
  readonly reservation_tokens: number;
  /** Tokens the full dataset holds at the reservation floor. */
  readonly reservation_floor_tokens: number;
  /** The ceiling CA-9B must respect, in tokens, for one process. */
  readonly max_token_budget: number;
  /** The approved token cap for the campaign (owner decision, CA-9A.2). */
  readonly approved_token_cap: number;
  /** CA-8's own default ceiling, kept for transparency: it is no longer the cap. */
  readonly guard_default_daily_token_budget: number;
  /** Which budget profile these figures come from. */
  readonly budget_profile_id: string;
  /** The priced model. */
  readonly pricing_model: string;
  /** The band the guard charges. PEAK is the ceiling. */
  readonly rate_band: AdvisorRateBand;
  readonly currency: string;
  readonly unit_tokens: number;
  /** Derived from `pricing.ts` — never typed here. */
  readonly price_per_1m_cache_hit_input_tokens: number;
  readonly price_per_1m_cache_miss_input_tokens: number;
  readonly price_per_1m_output_tokens: number;
  /** Peak cache-miss / output prices in thousands, for the older readers. */
  readonly price_per_1k_input_tokens: number;
  readonly price_per_1k_output_tokens: number;
  /** The approved hard USD cap. Executable (see `budget-profile.ts`). */
  readonly hard_cost_cap_usd: number;
  readonly cost_cap_status: CostCapStatus;
  readonly pricing_source: string;
  readonly pricing_retrieved_at: string;
  readonly notes: readonly string[];
}

const sumTurns = (cases: readonly EvaluationCase[]): number =>
  cases.reduce((total, entry) => total + entry.turns.length, 0);

export function computeCostBudget(
  profile: AdvisorBudgetProfile = APPROVED_ADVISOR_BUDGET_PROFILE,
): CostBudget {
  const limits = DEFAULT_ADVISOR_LIMITS;
  const attempts = 1 + Math.max(0, DEFAULT_MAX_RETRIES);
  const pricing = DEEPSEEK_FLASH_PRICING;
  const rates = pricing.rates[DEFAULT_RATE_BAND] ?? pricing.rates.PEAK;

  const datasetTurns = sumTurns(EVALUATION_DATASET);
  const adversarialTurns = sumTurns(ADVERSARIAL_DATASET);
  const allTurns = datasetTurns + adversarialTurns;
  const allCases = EVALUATION_DATASET.length + ADVERSARIAL_DATASET.length;

  const expectedCalls = allTurns * PROVIDER_OPERATIONS_PER_TURN;
  const maxCalls = expectedCalls * attempts;

  // At the reservation floor, EVERY operation holds `reservationTokens × attempts`
  // before it runs — so the floor is what the ledger must be able to cover even
  // if every call reconciled to zero (which a real call never does, but the
  // ceiling must hold regardless).
  const reservationFloor = maxCalls * limits.reservationTokens * attempts;

  const notes: readonly string[] = [
    `Full dataset: ${allCases} conversations, ${allTurns} turns.`,
    `Expected provider calls: ${expectedCalls} (2 per turn). Hard cap with retries: ${maxCalls}.`,
    `Approved campaign ceiling: ${profile.tokenCap} tokens (profile ${profile.id}); CA-8's own default ceiling is ${limits.dailyTokenBudget}.`,
    `Reservation floor for the run: ${reservationFloor} tokens — ABOVE one process's approved budget, so CA-9B must run the campaign with an explicit budget (which the runner configures from the approved profile) or split it across processes/days.`,
    `Price source: ${pricing.source} (retrieved ${pricing.retrieved_at}), ${pricing.currency} per ${pricing.unit_tokens} tokens, band ${DEFAULT_RATE_BAND}.`,
    `Hard USD cap: ${profile.hardCostCapUsd} ${profile.currency} — executable through the campaign cost gate, not a report-only figure.`,
    "A retry that really happened is billed; a reservation is a hold, not a bill.",
  ];

  return {
    dataset_cases: EVALUATION_DATASET.length,
    adversarial_cases: ADVERSARIAL_DATASET.length,
    dataset_turns: allTurns,
    attempts_per_operation: attempts,
    expected_provider_calls: expectedCalls,
    max_provider_calls: maxCalls,
    max_conversations: allCases,
    max_turns_per_conversation: SESSION_LIMITS.maxTurnsTotal,
    daily_token_budget: profile.tokenCap,
    reservation_tokens: limits.reservationTokens,
    reservation_floor_tokens: reservationFloor,
    max_token_budget: profile.tokenCap,
    approved_token_cap: profile.tokenCap,
    guard_default_daily_token_budget: limits.dailyTokenBudget,
    budget_profile_id: profile.id,
    pricing_model: pricing.model_id,
    rate_band: DEFAULT_RATE_BAND,
    currency: pricing.currency,
    unit_tokens: pricing.unit_tokens,
    price_per_1m_cache_hit_input_tokens: rates.cache_hit_input_usd_per_unit,
    price_per_1m_cache_miss_input_tokens: rates.cache_miss_input_usd_per_unit,
    price_per_1m_output_tokens: rates.output_usd_per_unit,
    price_per_1k_input_tokens: per1kUsd(rates.cache_miss_input_usd_per_unit),
    price_per_1k_output_tokens: per1kUsd(rates.output_usd_per_unit),
    hard_cost_cap_usd: profile.hardCostCapUsd,
    cost_cap_status: "VERIFIED",
    pricing_source: pricing.source,
    pricing_retrieved_at: pricing.retrieved_at,
    notes,
  };
}

/**
 * A live accumulator for a CA-9B run. It counts calls and tokens as the harness
 * reports them and answers whether the run is still inside its budget. `UNKNOWN`
 * consumption is charged the reservation floor rather than zero, mirroring
 * CA-8's own conservative settlement.
 */
export interface CostAccumulator {
  readonly calls: number;
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly unknown_settlements: number;
}

export function createCostAccumulator(): CostAccumulator {
  return { calls: 0, input_tokens: 0, output_tokens: 0, unknown_settlements: 0 };
}

export function addConsumption(
  accumulator: CostAccumulator,
  consumption: {
    readonly provider_calls: number;
    readonly input_tokens: number;
    readonly output_tokens: number;
    readonly usage_status: "REPORTED" | "UNKNOWN" | "NOT_INVOKED";
  },
): CostAccumulator {
  // A call whose usage is UNKNOWN is charged the reservation floor per call, not
  // zero: "we called and cannot know" is a cost, exactly as CA-8 treats it.
  const imputed =
    consumption.usage_status === "UNKNOWN"
      ? consumption.provider_calls * DEFAULT_ADVISOR_LIMITS.reservationTokens
      : 0;
  return {
    calls: accumulator.calls + consumption.provider_calls,
    input_tokens: accumulator.input_tokens + consumption.input_tokens + imputed,
    output_tokens: accumulator.output_tokens + consumption.output_tokens,
    unknown_settlements:
      accumulator.unknown_settlements +
      (consumption.usage_status === "UNKNOWN" ? consumption.provider_calls : 0),
  };
}

export function totalTokens(accumulator: CostAccumulator): number {
  return accumulator.input_tokens + accumulator.output_tokens;
}

/** Whether a run has reached the token ceiling. */
export function isOverBudget(accumulator: CostAccumulator, budget: CostBudget): boolean {
  return totalTokens(accumulator) >= budget.max_token_budget;
}
