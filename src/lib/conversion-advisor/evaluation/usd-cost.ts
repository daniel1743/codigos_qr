/**
 * CRIPQER Conversion Advisor — CA-9A.2 · the USD cost accumulator.
 *
 * PURE. It converts a provider REQUEST's reported consumption into money using
 * the one verified contract in `pricing.ts`, and accumulates a campaign total.
 *
 * WHERE THE NUMBERS COME FROM — and where they must not:
 *   · Money is charged ONLY from consumption the transport reported for a call
 *     that actually happened: input tokens, cached input tokens when reported,
 *     and output tokens.
 *   · Never from a character count. Never from the CA-8 reservation, which is a
 *     HOLD, not a bill: charging a hold as consumption would double-charge every
 *     success.
 *   · A request is charged exactly once. `requests` counts the calls the caller
 *     measured, so a retry that really happened is billed and a retry that did
 *     not happen is not.
 *   · When consumption is UNKNOWN the cost is IMPUTED, not invented as zero and
 *     never presented as known: CA-8 charges the reservation floor in that case
 *     ("we called and cannot know" is a cost), so this mirrors it and keeps the
 *     imputed part in its own field. `usd_known` never moves for it.
 *
 * A cache breakdown the transport did not report is charged at the CACHE-MISS
 * rate — the conservative side — and the accumulator records that the breakdown
 * is unknown, so a reader can tell a measured cost from an upper bound.
 */

import { DEFAULT_ADVISOR_LIMITS } from "../guardrails/limits";
import {
  DEFAULT_RATE_BAND,
  usdForTokens,
  type AdvisorModelPricing,
  type AdvisorRateBand,
} from "./pricing";

/* ============================== one request ============================= */

export interface ReportedRequestUsage {
  /** Input tokens the transport reported for this request. */
  readonly input_tokens: number;
  /**
   * Input tokens served from cache, when the transport reports the breakdown.
   * `null`/absent means "not reported", which is charged as a miss.
   */
  readonly cached_input_tokens?: number | null | undefined;
  readonly output_tokens: number;
  /** Provider requests this measurement covers. Defaults to 1. */
  readonly requests?: number | undefined;
}

export interface RequestCostBreakdown {
  readonly requests: number;
  readonly uncached_input_tokens: number;
  readonly cached_input_tokens: number;
  readonly output_tokens: number;
  readonly uncached_input_usd: number;
  readonly cached_input_usd: number;
  readonly output_usd: number;
  readonly total_usd: number;
  /** False when the cache breakdown was not reported (the cost is a ceiling). */
  readonly cache_breakdown_known: boolean;
}

const safeTokens = (value: number | null | undefined): number =>
  Number.isFinite(value) && (value as number) > 0 ? Math.floor(value as number) : 0;

/**
 * Prices ONE request (or the aggregate of the requests the caller counted).
 * Full input is billed as miss when no cache breakdown is available.
 */
export function requestCostUsd(
  pricing: AdvisorModelPricing,
  usage: ReportedRequestUsage,
  band: AdvisorRateBand = DEFAULT_RATE_BAND,
): RequestCostBreakdown {
  const rates = pricing.rates[band] ?? pricing.rates.PEAK;
  const requests = Math.max(1, safeTokens(usage.requests ?? 1));
  const inputTokens = safeTokens(usage.input_tokens);
  const outputTokens = safeTokens(usage.output_tokens);

  const reported = usage.cached_input_tokens;
  const breakdownKnown =
    reported !== undefined &&
    reported !== null &&
    Number.isFinite(reported) &&
    (reported as number) >= 0;
  const cachedTokens = breakdownKnown ? Math.min(safeTokens(reported), inputTokens) : 0;
  const uncachedTokens = inputTokens - cachedTokens;

  const uncachedInputUsd = usdForTokens(uncachedTokens, rates.cache_miss_input_usd_per_unit);
  const cachedInputUsd = usdForTokens(cachedTokens, rates.cache_hit_input_usd_per_unit);
  const outputUsd = usdForTokens(outputTokens, rates.output_usd_per_unit);

  return {
    requests,
    uncached_input_tokens: uncachedTokens,
    cached_input_tokens: cachedTokens,
    output_tokens: outputTokens,
    uncached_input_usd: uncachedInputUsd,
    cached_input_usd: cachedInputUsd,
    output_usd: outputUsd,
    total_usd: uncachedInputUsd + cachedInputUsd + outputUsd,
    cache_breakdown_known: breakdownKnown,
  };
}

/* ============================== the campaign ============================ */

export interface UsdCostAccumulator {
  readonly requests: number;
  readonly uncached_input_tokens: number;
  readonly cached_input_tokens: number;
  readonly output_tokens: number;
  /** Requests whose consumption could not be established (imputed, not known). */
  readonly unknown_requests: number;
  /**
   * False once any request lacked a cache breakdown, or reported one that did not
   * add up. When false, part of `usd_known` is an upper bound rather than a
   * measurement.
   */
  readonly cache_breakdown_known: boolean;
  /** Money that comes from REPORTED consumption. */
  readonly usd_known: number;
  /** Money imputed for UNKNOWN consumption (CA-8 semantics: the hold is a cost). */
  readonly usd_imputed: number;
  readonly usd_total: number;
}

export function createUsdCostAccumulator(): UsdCostAccumulator {
  return {
    requests: 0,
    uncached_input_tokens: 0,
    cached_input_tokens: 0,
    output_tokens: 0,
    unknown_requests: 0,
    cache_breakdown_known: true,
    usd_known: 0,
    usd_imputed: 0,
    usd_total: 0,
  };
}

export function addReportedRequestUsd(
  accumulator: UsdCostAccumulator,
  input: {
    readonly pricing: AdvisorModelPricing;
    readonly usage: ReportedRequestUsage;
    readonly band?: AdvisorRateBand | undefined;
  },
): UsdCostAccumulator {
  const breakdown = requestCostUsd(input.pricing, input.usage, input.band ?? DEFAULT_RATE_BAND);
  const usdKnown = accumulator.usd_known + breakdown.total_usd;
  return {
    requests: accumulator.requests + breakdown.requests,
    uncached_input_tokens: accumulator.uncached_input_tokens + breakdown.uncached_input_tokens,
    cached_input_tokens: accumulator.cached_input_tokens + breakdown.cached_input_tokens,
    output_tokens: accumulator.output_tokens + breakdown.output_tokens,
    unknown_requests: accumulator.unknown_requests,
    cache_breakdown_known: accumulator.cache_breakdown_known && breakdown.cache_breakdown_known,
    usd_known: usdKnown,
    usd_imputed: accumulator.usd_imputed,
    usd_total: usdKnown + accumulator.usd_imputed,
  };
}

/**
 * Charges a call whose consumption is UNKNOWN. CA-9A's token accumulator charges
 * the CA-8 reservation floor; this mirrors it in money — the same tokens, priced
 * as cache-miss input at the band — and keeps the amount OUT of `usd_known`.
 */
export function addUnknownRequestUsd(
  accumulator: UsdCostAccumulator,
  input: {
    readonly pricing: AdvisorModelPricing;
    readonly requests: number;
    readonly reservedTokens?: number | undefined;
    readonly band?: AdvisorRateBand | undefined;
  },
): UsdCostAccumulator {
  const band = input.band ?? DEFAULT_RATE_BAND;
  const rates = input.pricing.rates[band] ?? input.pricing.rates.PEAK;
  const requests = Math.max(1, safeTokens(input.requests));
  const reserved = safeTokens(input.reservedTokens ?? DEFAULT_ADVISOR_LIMITS.reservationTokens);
  const imputed = usdForTokens(requests * reserved, rates.cache_miss_input_usd_per_unit);
  return {
    requests: accumulator.requests + requests,
    uncached_input_tokens: accumulator.uncached_input_tokens + requests * reserved,
    cached_input_tokens: accumulator.cached_input_tokens,
    output_tokens: accumulator.output_tokens,
    unknown_requests: accumulator.unknown_requests + requests,
    cache_breakdown_known: accumulator.cache_breakdown_known,
    usd_known: accumulator.usd_known,
    usd_imputed: accumulator.usd_imputed + imputed,
    usd_total: accumulator.usd_known + accumulator.usd_imputed + imputed,
  };
}

/** The campaign total the hard cap compares against. */
export function usdCostTotal(accumulator: UsdCostAccumulator): number {
  return accumulator.usd_total;
}

/** True when every charged request came from reported consumption. */
export function usdCostIsFullyKnown(accumulator: UsdCostAccumulator): boolean {
  return accumulator.unknown_requests === 0 && accumulator.cache_breakdown_known;
}
