/**
 * CA-9A.2 — the budget profile and the EXECUTABLE hard USD cap.
 *
 * This is where the owner's decision stops being a number in a report:
 *
 *   · T1–T3  the cap allows, stops and blocks a next request
 *   · T10/T11 which stop reason wins when the two caps race
 *   · the profile can be TIGHTENED and cannot be widened silently
 *   · the runner really stops sending cases (proved through the mock transport,
 *     so `real_provider_calls: 0` stays true)
 */
import { describe, expect, it } from "vitest";

import { DEFAULT_ADVISOR_LIMITS } from "../../guardrails/limits";
import { createMockTransport, MOCK_CONFIG, mockDeps } from "../mock-transport.server";
import { runDataset } from "../runner.server";
import {
  APPROVED_ADVISOR_BUDGET_PROFILE,
  APPROVED_BUDGET_PROFILE_ID,
  campaignLimitsFromProfile,
  evaluateHardCostCap,
  HARD_COST_CAP_STOP_REASON,
  requestUpperBoundUsd,
  resolveAdvisorBudgetProfile,
  tightenCampaignLimits,
  type AdvisorBudgetProfile,
} from "../budget-profile";
import { DEEPSEEK_FLASH_PRICING, usdForTokens } from "../pricing";
import type { EvaluationCase } from "../types";
import { evalCase } from "./fixtures";

const PEAK = DEEPSEEK_FLASH_PRICING.rates.PEAK;

/** Two single-turn cases: enough to prove the second one is never sent. */
const twoCases: readonly EvaluationCase[] = [
  evalCase({ id: "CAP-1", turns: ["¿Qué es CRIPQER?"] }),
  evalCase({ id: "CAP-2", turns: ["¿Cuánto cuesta?"] }),
];

/** The mock, with usage inflated to a chosen cost per call. */
const usageTransport = (promptTokens: number, completionTokens: number): typeof fetch => {
  const base = createMockTransport();
  return (async (input: unknown, init?: RequestInit) => {
    const response = await base(input as RequestInfo, init);
    const body = (await response.json()) as Record<string, unknown>;
    if (body["usage"] !== undefined) {
      body["usage"] = { prompt_tokens: promptTokens, completion_tokens: completionTokens };
    }
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
};

describe("CA-9A.2 budget profile — the owner decision as data", () => {
  it("carries exactly the approved model and caps", () => {
    expect(APPROVED_ADVISOR_BUDGET_PROFILE.id).toBe(APPROVED_BUDGET_PROFILE_ID);
    expect(APPROVED_ADVISOR_BUDGET_PROFILE.model).toBe("deepseek-flash");
    expect(APPROVED_ADVISOR_BUDGET_PROFILE.tokenCap).toBe(500_000);
    expect(APPROVED_ADVISOR_BUDGET_PROFILE.hardCostCapUsd).toBe(5.0);
    expect(APPROVED_ADVISOR_BUDGET_PROFILE.currency).toBe("USD");
    expect(APPROVED_ADVISOR_BUDGET_PROFILE.rateBand).toBe("PEAK");
    expect(APPROVED_ADVISOR_BUDGET_PROFILE.approved_by).toBe("OWNER");
  });

  it("lets a caller TIGHTEN a cap", () => {
    const resolved = resolveAdvisorBudgetProfile({
      ADVISOR_TOKEN_CAP: "100000",
      ADVISOR_HARD_COST_CAP_USD: "1.25",
    });
    expect(resolved.profile.tokenCap).toBe(100_000);
    expect(resolved.profile.hardCostCapUsd).toBe(1.25);
    expect(resolved.tightened).toEqual(["TOKEN_CAP", "HARD_COST_CAP_USD"]);
    expect(resolved.widen_attempts).toEqual([]);
  });

  it("REFUSES to widen a cap, and says so instead of raising it quietly", () => {
    const resolved = resolveAdvisorBudgetProfile({
      ADVISOR_TOKEN_CAP: "5000000",
      ADVISOR_HARD_COST_CAP_USD: "50",
    });
    expect(resolved.profile.tokenCap).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.tokenCap);
    expect(resolved.profile.hardCostCapUsd).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.hardCostCapUsd);
    expect(resolved.widen_attempts).toEqual(["TOKEN_CAP", "HARD_COST_CAP_USD"]);
    expect(resolved.requested).toEqual({ tokenCap: 5_000_000, hardCostCapUsd: 50 });
    // No automatic replenishment: the effective caps never exceed the approved ones.
    expect(resolved.profile.tokenCap).toBeLessThanOrEqual(APPROVED_ADVISOR_BUDGET_PROFILE.tokenCap);
    expect(resolved.profile.hardCostCapUsd).toBeLessThanOrEqual(
      APPROVED_ADVISOR_BUDGET_PROFILE.hardCostCapUsd,
    );
  });

  it("ignores an unreadable cap rather than widening or crashing", () => {
    const resolved = resolveAdvisorBudgetProfile({
      ADVISOR_TOKEN_CAP: "abc",
      ADVISOR_HARD_COST_CAP_USD: "-3",
    });
    expect(resolved.profile.tokenCap).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.tokenCap);
    expect(resolved.profile.hardCostCapUsd).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.hardCostCapUsd);
    expect(resolved.widen_attempts).toEqual([]);
    expect(resolved.tightened).toEqual([]);
  });

  it("configures the campaign guard with the approved token ceiling and nothing else", () => {
    const fromProfile = campaignLimitsFromProfile(APPROVED_ADVISOR_BUDGET_PROFILE);
    expect(fromProfile.dailyTokenBudget).toBe(500_000);
    // Every OTHER CA-8 guarantee is untouched.
    expect(fromProfile.reservationTokens).toBe(DEFAULT_ADVISOR_LIMITS.reservationTokens);
    expect(fromProfile.reservationTtlMs).toBe(DEFAULT_ADVISOR_LIMITS.reservationTtlMs);
    expect(fromProfile.maxConcurrency).toBe(DEFAULT_ADVISOR_LIMITS.maxConcurrency);
    expect(fromProfile.circuitFailureThreshold).toBe(DEFAULT_ADVISOR_LIMITS.circuitFailureThreshold);
    expect(fromProfile.killSwitch).toBe(false);

    const tighter = tightenCampaignLimits(
      { ...DEFAULT_ADVISOR_LIMITS, dailyTokenBudget: 50_000 },
      APPROVED_ADVISOR_BUDGET_PROFILE,
    );
    expect(tighter.dailyTokenBudget).toBe(50_000);
  });
});

describe("CA-9A.2 hard USD cap — the decision itself", () => {
  it("T1 · allows a normal request below the cap", () => {
    const decision = evaluateHardCostCap({
      spentUsd: 0.5,
      capUsd: 5,
      nextRequestUpperBoundUsd: 0.01,
    });
    expect(decision.allow).toBe(true);
    expect(decision.stop_reason).toBeNull();
    expect(decision.trigger).toBeNull();
    expect(decision.remaining_usd).toBeCloseTo(4.5, 12);
  });

  it("T2 · stops the campaign at the cap, exactly", () => {
    const atCap = evaluateHardCostCap({ spentUsd: 5, capUsd: 5 });
    expect(atCap.allow).toBe(false);
    expect(atCap.stop_reason).toBe(HARD_COST_CAP_STOP_REASON);
    expect(atCap.stop_reason).toBe("HARD_COST_CAP_REACHED");
    expect(atCap.trigger).toBe("CAP_REACHED");
    const above = evaluateHardCostCap({ spentUsd: 5.01, capUsd: 5 });
    expect(above.allow).toBe(false);
    expect(above.trigger).toBe("CAP_REACHED");
  });

  it("T3 · blocks the NEXT request when it could pass the cap", () => {
    const decision = evaluateHardCostCap({
      spentUsd: 4.999,
      capUsd: 5,
      nextRequestUpperBoundUsd: 0.01,
    });
    expect(decision.allow).toBe(false);
    expect(decision.trigger).toBe("NEXT_REQUEST_WOULD_OVERRUN");
    expect(decision.stop_reason).toBe(HARD_COST_CAP_STOP_REASON);
    // A request that fits is still allowed: the cap blocks overruns, not spending.
    const fits = evaluateHardCostCap({
      spentUsd: 4.98,
      capUsd: 5,
      nextRequestUpperBoundUsd: 0.01,
    });
    expect(fits.allow).toBe(true);
  });

  it("fails CLOSED when there is no usable cap", () => {
    for (const capUsd of [0, -1, Number.NaN]) {
      const decision = evaluateHardCostCap({ spentUsd: 0, capUsd });
      expect(decision.allow).toBe(false);
      expect(decision.stop_reason).toBe(HARD_COST_CAP_STOP_REASON);
    }
  });

  it("prices the next request's ceiling at PEAK and can only over-estimate", () => {
    const bound = requestUpperBoundUsd({
      pricing: DEEPSEEK_FLASH_PRICING,
      reservedTokens: DEFAULT_ADVISOR_LIMITS.reservationTokens,
      maxOutputTokens: 800,
    });
    const expected =
      usdForTokens(DEFAULT_ADVISOR_LIMITS.reservationTokens, PEAK.cache_miss_input_usd_per_unit) +
      usdForTokens(800, PEAK.output_usd_per_unit);
    expect(bound).toBeCloseTo(expected, 12);
    // A never-reported cache can only be a miss, so the bound does not shrink with
    // a discount band unless the caller states one explicitly.
    const offPeak = requestUpperBoundUsd({
      pricing: DEEPSEEK_FLASH_PRICING,
      reservedTokens: DEFAULT_ADVISOR_LIMITS.reservationTokens,
      maxOutputTokens: 800,
      band: "OFF_PEAK",
    });
    expect(offPeak).toBeLessThan(bound);
    expect(requestUpperBoundUsd({
      pricing: DEEPSEEK_FLASH_PRICING,
      reservedTokens: DEFAULT_ADVISOR_LIMITS.reservationTokens,
      maxOutputTokens: 800,
      attempts: 2,
    })).toBeCloseTo(bound * 2, 12);
  });
});

describe("CA-9A.2 hard USD cap — executable inside the campaign", () => {
  it("T11 · stops the campaign when the MONEY runs out first", async () => {
    // The cap is set to exactly ONE TURN's conservative ceiling: the first case
    // fits (spending is still zero), and the second cannot start because its
    // ceiling would no longer fit under the cap. That is the cap doing its job,
    // not an arbitrary threshold.
    const perTurnCeiling = requestUpperBoundUsd({
      pricing: DEEPSEEK_FLASH_PRICING,
      reservedTokens: DEFAULT_ADVISOR_LIMITS.reservationTokens * 2,
      maxOutputTokens: MOCK_CONFIG.maxOutputTokens * 2,
      attempts: 1,
    });
    const tightProfile: AdvisorBudgetProfile = {
      ...APPROVED_ADVISOR_BUDGET_PROFILE,
      hardCostCapUsd: perTurnCeiling,
    };

    const result = await runDataset(twoCases, {
      providerDeps: mockDeps(),
      budgetProfile: tightProfile,
    });

    expect(result.cases.map((entry) => entry.case_id)).toEqual(["CAP-1"]);
    expect(result.cases_not_sent).toBe(1);
    expect(result.summary.cost_cap_reached).toBe(true);
    expect(result.stop_reason).toBe("HARD_COST_CAP_REACHED");
    expect(result.verdict.abort).toBe(true);
    expect(result.verdict.triggers).toContain("HARD_COST_CAP_REACHED");
    // The money actually charged never passed the cap.
    expect(result.usd.usd_total).toBeLessThanOrEqual(tightProfile.hardCostCapUsd + 1e-12);
    expect(result.usd.requests).toBe(2);
    // The token path did NOT fire: this stop is the USD cap's.
    expect(result.budget.max_token_budget).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.tokenCap);
  });

  it("T10 · stops with BUDGET_EXHAUSTED when the TOKENS run out first", async () => {
    const result = await runDataset(twoCases, {
      providerDeps: { fetchImpl: usageTransport(150_000, 150_000), sleep: async () => {} },
    });

    expect(result.cases.map((entry) => entry.case_id)).toEqual(["CAP-1"]);
    expect(result.cases_not_sent).toBe(1);
    expect(result.summary.cost_cap_reached).toBe(true);
    expect(result.stop_reason).toBe("BUDGET_EXHAUSTED");
    // The tokens ran out inside the APPROVED ceiling, and the money did not: this
    // is the token cap doing its job, not the USD cap.
    expect(result.profile.tokenCap).toBe(500_000);
    expect(result.budget.max_token_budget).toBe(500_000);
    expect(result.usd.usd_total).toBeGreaterThan(0);
    expect(result.usd.usd_total).toBeLessThan(APPROVED_ADVISOR_BUDGET_PROFILE.hardCostCapUsd);
  });

  it("runs the whole dataset and reports no stop when both caps hold", async () => {
    const result = await runDataset(twoCases, { providerDeps: mockDeps() });
    expect(result.cases).toHaveLength(2);
    expect(result.cases_not_sent).toBe(0);
    expect(result.stop_reason).toBeNull();
    expect(result.summary.cost_cap_reached).toBe(false);
    expect(result.verdict.abort).toBe(false);
    // Two cases × one turn × two calls, all REPORTED and all priced.
    expect(result.usd.requests).toBe(4);
    expect(result.usd.unknown_requests).toBe(0);
    expect(result.usd.usd_total).toBeGreaterThan(0);
    // Every request lacked a cache breakdown, so the figure is a ceiling, and the
    // accumulator says exactly that instead of pretending to know.
    expect(result.usd.cache_breakdown_known).toBe(false);
  });

  it("refuses to spend a cent for a model it cannot price", async () => {
    const unpriced = { ...MOCK_CONFIG, model: "deepseek-v4-pro" };
    const result = await runDataset(twoCases, {
      providerDeps: mockDeps(),
      config: unpriced,
    });
    expect(result.cases).toHaveLength(0);
    expect(result.cases_not_sent).toBe(twoCases.length);
    expect(result.stop_reason).toBe("HARD_COST_CAP_REACHED");
    expect(result.usd.usd_total).toBe(0);
    expect(result.cost.calls).toBe(0);
  });

  it("keeps CA-8's token guard in charge of tokens (reservation, reconcile untouched)", async () => {
    // The campaign ceiling is the approved token cap, and the guard's other
    // limits are the product's own — CA-8 is configured, not bypassed.
    const result = await runDataset(twoCases, { providerDeps: mockDeps() });
    expect(result.profile.tokenCap).toBe(APPROVED_ADVISOR_BUDGET_PROFILE.tokenCap);
    expect(result.budget.reservation_tokens).toBe(DEFAULT_ADVISOR_LIMITS.reservationTokens);
    expect(result.cost.calls).toBe(4);
    expect(result.cost.unknown_settlements).toBe(0);
    expect(result.cost.input_tokens).toBe(2 * 540);
    expect(result.cost.output_tokens).toBe(2 * 180);
  });

  it("makes no real provider call: the mock transport answers every request", async () => {
    const calls: string[] = [];
    const base = createMockTransport();
    const spy = (async (input: unknown, init?: RequestInit) => {
      calls.push(String(input));
      return base(input as RequestInfo, init);
    }) as typeof fetch;
    await runDataset(twoCases, { providerDeps: { fetchImpl: spy, sleep: async () => {} } });
    expect(calls).toHaveLength(4);
    // Every call went to the fictional `.invalid` host, which cannot resolve.
    for (const url of calls) expect(url).toContain(".invalid");
  });
});
