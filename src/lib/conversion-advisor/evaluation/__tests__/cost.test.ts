/**
 * CA-9A / CA-9A.2 — the CA-8 cost budget. The figures are DERIVED from the
 * dataset, the guard's limits, the verified pricing contract and the approved
 * budget profile — never typed: a case added to the dataset, a rate corrected in
 * `pricing.ts` or a cap changed by the owner must move the budget, and these tests
 * prove the arithmetic instead of restating a number.
 *
 * CA-9A asserted the dollar cap was `null` and `COST_CAP_NOT_VERIFIED`, because
 * the repository documented no price and the configured model was not in the
 * provider's list (CA-9A.1). CA-9A.2 replaced that placeholder with a verified
 * contract, so the assertion flipped to `VERIFIED` — and to a figure that is
 * DERIVED from `pricing.ts` and `budget-profile.ts`, which is what keeps it from
 * becoming a fabricated constant.
 */
import { describe, expect, it } from "vitest";

import {
  addConsumption,
  computeCostBudget,
  createCostAccumulator,
  isOverBudget,
  PROVIDER_OPERATIONS_PER_TURN,
  totalTokens,
} from "../cost";
import { ADVERSARIAL_DATASET, EVALUATION_DATASET } from "../dataset";
import { DEFAULT_ADVISOR_LIMITS } from "../../guardrails/limits";
import { SESSION_LIMITS } from "../../session/context";
import { APPROVED_ADVISOR_BUDGET_PROFILE } from "../budget-profile";
import {
  ADVISOR_PRICING_CURRENCY,
  ADVISOR_PRICING_UNIT_TOKENS,
  APPROVED_ADVISOR_MODEL,
  DEEPSEEK_FLASH_PRICING,
  per1kUsd,
} from "../pricing";
import { NO_CONSUMPTION, type TurnConsumption } from "../types";

const budget = computeCostBudget();
const turnsOf = (cases: readonly { turns: readonly string[] }[]) =>
  cases.reduce((total, entry) => total + entry.turns.length, 0);
const datasetTurns = turnsOf(EVALUATION_DATASET);
const adversarialTurns = turnsOf(ADVERSARIAL_DATASET);
const allTurns = datasetTurns + adversarialTurns;

const consumption = (patch: Partial<TurnConsumption>): TurnConsumption => ({
  ...NO_CONSUMPTION,
  ...patch,
});

describe("CA-9A cost — the derived budget", () => {
  it("counts the conversations and turns the dataset actually declares", () => {
    expect(budget.dataset_cases).toBe(EVALUATION_DATASET.length);
    expect(budget.adversarial_cases).toBe(ADVERSARIAL_DATASET.length);
    expect(budget.dataset_turns).toBe(allTurns);
    expect(budget.max_conversations).toBe(EVALUATION_DATASET.length + ADVERSARIAL_DATASET.length);
  });

  it("derives the expected and maximum provider calls", () => {
    expect(budget.expected_provider_calls).toBe(allTurns * PROVIDER_OPERATIONS_PER_TURN);
    expect(budget.attempts_per_operation).toBe(1 + 1);
    expect(budget.max_provider_calls).toBe(budget.expected_provider_calls * budget.attempts_per_operation);
  });

  it("derives the reservation floor from the guard's own numbers", () => {
    expect(budget.reservation_tokens).toBe(DEFAULT_ADVISOR_LIMITS.reservationTokens);
    expect(budget.reservation_floor_tokens).toBe(
      budget.max_provider_calls * DEFAULT_ADVISOR_LIMITS.reservationTokens * budget.attempts_per_operation,
    );
  });

  it("reads the session ceiling from the real configuration and the token cap from the profile", () => {
    expect(budget.max_turns_per_conversation).toBe(SESSION_LIMITS.maxTurnsTotal);
    // CA-9A.2: the campaign ceiling is the APPROVED token cap, not CA-8's own
    // product default — and both are reported so the difference is visible.
    expect(budget.daily_token_budget).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.tokenCap);
    expect(budget.max_token_budget).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.tokenCap);
    expect(budget.approved_token_cap).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.tokenCap);
    expect(budget.guard_default_daily_token_budget).toBe(DEFAULT_ADVISOR_LIMITS.dailyTokenBudget);
    expect(budget.budget_profile_id).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.id);
  });

  it("states the reservation floor exceeds one process's ceilings", () => {
    // This is the finding, not a defect: it is why CA-9B must run the campaign
    // with an explicit budget rather than inherit a default.
    expect(budget.reservation_floor_tokens).toBeGreaterThan(budget.guard_default_daily_token_budget);
    expect(budget.reservation_floor_tokens).toBeGreaterThan(budget.approved_token_cap);
  });

  it("derives the verified DeepSeek price and the approved USD cap from the contracts", () => {
    const rates = DEEPSEEK_FLASH_PRICING.rates.PEAK;
    expect(budget.cost_cap_status).toBe("VERIFIED");
    expect(budget.pricing_model).toBe(APPROVED_ADVISOR_MODEL);
    expect(budget.pricing_source).toBe(DEEPSEEK_FLASH_PRICING.source);
    expect(budget.currency).toBe(ADVISOR_PRICING_CURRENCY);
    expect(budget.unit_tokens).toBe(ADVISOR_PRICING_UNIT_TOKENS);
    expect(budget.rate_band).toBe("PEAK");
    expect(budget.price_per_1m_cache_hit_input_tokens).toBe(rates.cache_hit_input_usd_per_unit);
    expect(budget.price_per_1m_cache_miss_input_tokens).toBe(rates.cache_miss_input_usd_per_unit);
    expect(budget.price_per_1m_output_tokens).toBe(rates.output_usd_per_unit);
    // The older per-1k readers now get a DERIVED figure, not `null`.
    expect(budget.price_per_1k_input_tokens).toBe(per1kUsd(rates.cache_miss_input_usd_per_unit));
    expect(budget.price_per_1k_output_tokens).toBe(per1kUsd(rates.output_usd_per_unit));
    expect(budget.hard_cost_cap_usd).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.hardCostCapUsd);
  });

  it("explains the run's shape, its caps and its price source in the notes", () => {
    const notes = budget.notes.join(" ");
    expect(budget.notes.length).toBeGreaterThan(0);
    expect(notes).toContain(`${allTurns} turns`);
    expect(notes).toContain(`Price source: ${DEEPSEEK_FLASH_PRICING.source}`);
    expect(notes).toContain(`Approved campaign ceiling: ${APPROVED_ADVISOR_BUDGET_PROFILE.tokenCap}`);
    expect(notes).toContain("A retry that really happened is billed");
  });
});

describe("CA-9A cost — the live accumulator", () => {
  it("starts empty", () => {
    expect(createCostAccumulator()).toEqual({
      calls: 0,
      input_tokens: 0,
      output_tokens: 0,
      unknown_settlements: 0,
    });
  });

  it("adds a REPORTED call's measured tokens", () => {
    const one = addConsumption(
      createCostAccumulator(),
      consumption({ provider_calls: 2, input_tokens: 540, output_tokens: 180, usage_status: "REPORTED" }),
    );
    expect(one.calls).toBe(2);
    expect(totalTokens(one)).toBe(720);
    expect(one.unknown_settlements).toBe(0);
  });

  it("charges an UNKNOWN call the reservation floor, never zero", () => {
    const one = addConsumption(
      createCostAccumulator(),
      consumption({ provider_calls: 1, usage_status: "UNKNOWN" }),
    );
    expect(one.unknown_settlements).toBe(1);
    expect(totalTokens(one)).toBe(DEFAULT_ADVISOR_LIMITS.reservationTokens);
  });

  it("adds nothing for a NOT_INVOKED call", () => {
    const one = addConsumption(createCostAccumulator(), consumption({ usage_status: "NOT_INVOKED" }));
    expect(one).toEqual(createCostAccumulator());
  });

  it("reaches the budget only at the ceiling", () => {
    const empty = createCostAccumulator();
    expect(isOverBudget(empty, budget)).toBe(false);
    const full = addConsumption(empty, {
      provider_calls: 1,
      input_tokens: budget.max_token_budget,
      output_tokens: 0,
      usage_status: "REPORTED",
    });
    expect(isOverBudget(full, budget)).toBe(true);
  });
});
