/**
 * CA-9A.2 — the USD accumulator: cache-hit, cache-miss, output, retries, zero
 * usage and unknown usage. The brief's cases T4–T9 live here at the accumulator
 * level, where the arithmetic is exact and no provider is involved.
 *
 * The rule the numbers follow: a price is one million tokens wide, so 1 000 000
 * tokens of a category cost exactly that category's rate. Every expectation below
 * is computed from `pricing.ts`, never typed as a magic cost.
 */
import { describe, expect, it } from "vitest";

import { DEFAULT_ADVISOR_LIMITS } from "../../guardrails/limits";
import { DEEPSEEK_FLASH_PRICING, usdForTokens } from "../pricing";
import {
  addReportedRequestUsd,
  addUnknownRequestUsd,
  createUsdCostAccumulator,
  requestCostUsd,
  usdCostIsFullyKnown,
  usdCostTotal,
} from "../usd-cost";

const PEAK = DEEPSEEK_FLASH_PRICING.rates.PEAK;
const OFF_PEAK = DEEPSEEK_FLASH_PRICING.rates.OFF_PEAK;
const UNIT = 1_000_000;

describe("CA-9A.2 USD — one request, one price", () => {
  it("T4 · prices cache-HIT input at the cache-hit rate", () => {
    const cost = requestCostUsd(DEEPSEEK_FLASH_PRICING, {
      input_tokens: UNIT,
      cached_input_tokens: UNIT,
      output_tokens: 0,
    });
    expect(cost.cached_input_tokens).toBe(UNIT);
    expect(cost.uncached_input_tokens).toBe(0);
    expect(cost.cached_input_usd).toBeCloseTo(PEAK.cache_hit_input_usd_per_unit, 12);
    expect(cost.total_usd).toBeCloseTo(0.006, 12);
    expect(cost.cache_breakdown_known).toBe(true);
  });

  it("T5 · prices cache-MISS input at the cache-miss rate", () => {
    const cost = requestCostUsd(DEEPSEEK_FLASH_PRICING, {
      input_tokens: UNIT,
      cached_input_tokens: 0,
      output_tokens: 0,
    });
    expect(cost.uncached_input_tokens).toBe(UNIT);
    expect(cost.uncached_input_usd).toBeCloseTo(PEAK.cache_miss_input_usd_per_unit, 12);
    expect(cost.total_usd).toBeCloseTo(0.3, 12);
  });

  it("T6 · prices output at the output rate", () => {
    const cost = requestCostUsd(DEEPSEEK_FLASH_PRICING, {
      input_tokens: 0,
      cached_input_tokens: 0,
      output_tokens: UNIT,
    });
    expect(cost.output_usd).toBeCloseTo(PEAK.output_usd_per_unit, 12);
    expect(cost.total_usd).toBeCloseTo(1.2, 12);
  });

  it("adds the three components of a mixed request exactly once", () => {
    const cost = requestCostUsd(DEEPSEEK_FLASH_PRICING, {
      input_tokens: 1000,
      cached_input_tokens: 400,
      output_tokens: 500,
    });
    const expected =
      usdForTokens(600, PEAK.cache_miss_input_usd_per_unit) +
      usdForTokens(400, PEAK.cache_hit_input_usd_per_unit) +
      usdForTokens(500, PEAK.output_usd_per_unit);
    expect(cost.total_usd).toBeCloseTo(expected, 12);
    expect(cost.uncached_input_usd + cost.cached_input_usd + cost.output_usd).toBeCloseTo(
      cost.total_usd,
      12,
    );
  });

  it("charges cache-MISS — the ceiling — when the breakdown was not reported", () => {
    const withBreakdown = requestCostUsd(DEEPSEEK_FLASH_PRICING, {
      input_tokens: 1000,
      cached_input_tokens: 1000,
      output_tokens: 0,
    });
    const without = requestCostUsd(DEEPSEEK_FLASH_PRICING, { input_tokens: 1000, output_tokens: 0 });
    expect(without.cache_breakdown_known).toBe(false);
    expect(without.total_usd).toBeCloseTo(usdForTokens(1000, PEAK.cache_miss_input_usd_per_unit), 12);
    expect(without.total_usd).toBeGreaterThan(withBreakdown.total_usd);
  });

  it("honours an explicitly stated off-peak band and nothing more", () => {
    const peak = requestCostUsd(
      DEEPSEEK_FLASH_PRICING,
      { input_tokens: UNIT, output_tokens: 0 },
      "PEAK",
    );
    const offPeak = requestCostUsd(
      DEEPSEEK_FLASH_PRICING,
      { input_tokens: UNIT, output_tokens: 0 },
      "OFF_PEAK",
    );
    expect(offPeak.total_usd).toBeCloseTo(OFF_PEAK.cache_miss_input_usd_per_unit, 12);
    expect(peak.total_usd).toBeCloseTo(offPeak.total_usd * 2, 12);
  });

  it("cannot be charged a negative or a broken measurement", () => {
    const cost = requestCostUsd(DEEPSEEK_FLASH_PRICING, {
      input_tokens: Number.NaN,
      output_tokens: -50,
    });
    expect(cost.total_usd).toBe(0);
    expect(cost.requests).toBe(1);
  });
});

describe("CA-9A.2 USD — the campaign accumulator", () => {
  it("starts at zero and is fully known", () => {
    const empty = createUsdCostAccumulator();
    expect(usdCostTotal(empty)).toBe(0);
    expect(empty.usd_known).toBe(0);
    expect(empty.usd_imputed).toBe(0);
    expect(usdCostIsFullyKnown(empty)).toBe(true);
  });

  it("T7 · bills each consumed request exactly once (a retry that happened counts)", () => {
    // One measured request, priced once.
    const one = addReportedRequestUsd(createUsdCostAccumulator(), {
      pricing: DEEPSEEK_FLASH_PRICING,
      usage: { input_tokens: 540, cached_input_tokens: 0, output_tokens: 180 },
    });
    // The same consumption declared as two requests in one measurement.
    const aggregate = addReportedRequestUsd(createUsdCostAccumulator(), {
      pricing: DEEPSEEK_FLASH_PRICING,
      usage: { input_tokens: 1080, cached_input_tokens: 0, output_tokens: 360, requests: 2 },
    });
    expect(aggregate.requests).toBe(2);
    expect(aggregate.usd_known).toBeCloseTo(one.usd_known * 2, 12);
    // Two attempts added one after the other equal the aggregate: no double charge.
    const sequential = addReportedRequestUsd(one, {
      pricing: DEEPSEEK_FLASH_PRICING,
      usage: { input_tokens: 540, cached_input_tokens: 0, output_tokens: 180 },
    });
    expect(sequential.usd_known).toBeCloseTo(aggregate.usd_known, 12);
    expect(sequential.requests).toBe(2);
  });

  it("T8 · a request with no usage contributes nothing at all", () => {
    // The runner never calls the accumulator for NOT_INVOKED consumption; the
    // proof here is that a zero measurement fabricates no money.
    const empty = createUsdCostAccumulator();
    expect(usdCostTotal(empty)).toBe(0);
    const stillZero = addReportedRequestUsd(empty, {
      pricing: DEEPSEEK_FLASH_PRICING,
      usage: { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, requests: 1 },
    });
    expect(stillZero.usd_known).toBe(0);
    expect(stillZero.requests).toBe(1);
  });

  it("T9 · charges UNKNOWN consumption conservatively and never calls it known", () => {
    const unknown = addUnknownRequestUsd(createUsdCostAccumulator(), {
      pricing: DEEPSEEK_FLASH_PRICING,
      requests: 1,
    });
    const expected = usdForTokens(
      DEFAULT_ADVISOR_LIMITS.reservationTokens,
      PEAK.cache_miss_input_usd_per_unit,
    );
    expect(unknown.usd_imputed).toBeCloseTo(expected, 12);
    expect(unknown.usd_known).toBe(0);
    expect(unknown.unknown_requests).toBe(1);
    expect(usdCostTotal(unknown)).toBeCloseTo(expected, 12);
    expect(usdCostIsFullyKnown(unknown)).toBe(false);

    // A reported request WITHOUT a cache breakdown is an upper bound, not a
    // measurement, so the accumulator says so.
    const reported = addReportedRequestUsd(createUsdCostAccumulator(), {
      pricing: DEEPSEEK_FLASH_PRICING,
      usage: { input_tokens: 500, output_tokens: 10 },
    });
    expect(usdCostIsFullyKnown(reported)).toBe(false);

    const fullyKnown = addReportedRequestUsd(createUsdCostAccumulator(), {
      pricing: DEEPSEEK_FLASH_PRICING,
      usage: { input_tokens: 500, cached_input_tokens: 0, output_tokens: 10 },
    });
    expect(usdCostIsFullyKnown(fullyKnown)).toBe(true);
  });

  it("keeps known and imputed money in separate columns", () => {
    let accumulator = addReportedRequestUsd(createUsdCostAccumulator(), {
      pricing: DEEPSEEK_FLASH_PRICING,
      usage: { input_tokens: 1000, cached_input_tokens: 0, output_tokens: 500 },
    });
    accumulator = addUnknownRequestUsd(accumulator, {
      pricing: DEEPSEEK_FLASH_PRICING,
      requests: 2,
    });
    expect(accumulator.requests).toBe(3);
    expect(accumulator.unknown_requests).toBe(2);
    expect(accumulator.usd_total).toBeCloseTo(accumulator.usd_known + accumulator.usd_imputed, 12);
  });
});
