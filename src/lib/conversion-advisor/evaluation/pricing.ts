/**
 * CRIPQER Conversion Advisor — CA-9A.2 · the verified price contract.
 *
 * PURE. No environment, no clock, no I/O, no provider import. This file is the
 * SINGLE place where a DeepSeek price is written down, because CA-9A shipped
 * `cost_cap_status: "COST_CAP_NOT_VERIFIED"` for exactly one honest reason: no
 * price was documented anywhere in the repository.
 *
 * What changed in CA-9A.2 (owner decision, 2026-10-16):
 *   · model  = `deepseek-flash`  (the published id; `deepseek-chat` is not in the
 *     provider's price or model list, which is what CA-9A.1 reported)
 *   · prices = the provider's OFFICIAL table, retrieved 2026-10-16, USD per
 *     1 000 000 tokens, cache-hit and cache-miss billed separately.
 *
 * THE RULE THAT GIVES THIS FILE ITS SHAPE: a price may never be attributed to a
 * model it does not belong to. `pricingForModel` returns `null` for anything that
 * is not the approved id — `deepseek-chat`, `deepseek-v4-pro`, a typo, an empty
 * string. A caller that gets `null` has no price and must say so; it may not fall
 * back to these numbers.
 *
 * CONSERVATIVE CEILING (CA-9A.2 hard-guard accounting rule): the guard charges
 * PEAK unless an unambiguous, tested determination of the band exists, so
 * `DEFAULT_RATE_BAND` is PEAK even though off-peak is half the price. A campaign
 * that runs off-peak will settle lower than the guard believed; a campaign that
 * runs peak cannot surprise it.
 */

/* ============================== units =================================== */

export const ADVISOR_PRICING_CURRENCY = "USD";
/** Prices are expressed per 1 000 000 tokens, as the provider publishes them. */
export const ADVISOR_PRICING_UNIT_TOKENS = 1_000_000;

/* ============================== the model =============================== */

/** The ONE model this build is authorised to price and to call. */
export const APPROVED_ADVISOR_MODEL = "deepseek-flash";

export const APPROVED_ADVISOR_PROVIDER = {
  name: "DeepSeek",
  mode: "direct",
  baseUrl: "https://api.deepseek.com",
} as const;

/* ============================== rate bands ============================== */

export const RATE_BANDS = ["PEAK", "OFF_PEAK"] as const;
export type AdvisorRateBand = (typeof RATE_BANDS)[number];

/**
 * PEAK is the ceiling and therefore the default. Off-peak is only used when the
 * caller states the band explicitly; the guard never assumes a discount.
 */
export const DEFAULT_RATE_BAND: AdvisorRateBand = "PEAK";

export interface AdvisorRate {
  readonly cache_hit_input_usd_per_unit: number;
  readonly cache_miss_input_usd_per_unit: number;
  readonly output_usd_per_unit: number;
}

export interface AdvisorModelPricing {
  readonly model_id: string;
  readonly provider: string;
  readonly provider_mode: "direct";
  readonly currency: string;
  readonly unit_tokens: number;
  readonly rates: Readonly<Record<AdvisorRateBand, AdvisorRate>>;
  /** Where the numbers come from, so a reviewer can re-read them. */
  readonly source: string;
  readonly retrieved_at: string;
}

/**
 * DeepSeek `deepseek-flash`, official table, USD per 1 000 000 tokens.
 * Off-peak is half of peak, exactly as the provider documents it.
 */
export const DEEPSEEK_FLASH_PRICING: AdvisorModelPricing = {
  model_id: APPROVED_ADVISOR_MODEL,
  provider: APPROVED_ADVISOR_PROVIDER.name,
  provider_mode: APPROVED_ADVISOR_PROVIDER.mode,
  currency: ADVISOR_PRICING_CURRENCY,
  unit_tokens: ADVISOR_PRICING_UNIT_TOKENS,
  rates: {
    PEAK: {
      cache_hit_input_usd_per_unit: 0.006,
      cache_miss_input_usd_per_unit: 0.3,
      output_usd_per_unit: 1.2,
    },
    OFF_PEAK: {
      cache_hit_input_usd_per_unit: 0.003,
      cache_miss_input_usd_per_unit: 0.15,
      output_usd_per_unit: 0.6,
    },
  },
  source: "https://api-docs.deepseek.com/quick_start/pricing",
  retrieved_at: "2026-10-16",
};

/* ============================== lookups ================================= */

/** Every model this build knows a price for. Deliberately a single entry. */
export const PRICED_ADVISOR_MODELS: readonly string[] = [DEEPSEEK_FLASH_PRICING.model_id];

const normalizeModelId = (modelId: string | null | undefined): string =>
  String(modelId ?? "").trim().toLowerCase();

/**
 * The price for `modelId`, or `null`.
 *
 * `null` is not an error: it is the statement "no verified price exists for this
 * model", and the CA-9A.2 guard treats it as "cannot run". What must never happen
 * is a caller applying the flash rate to a different model, so the comparison is
 * exact and case-insensitive only.
 */
export function pricingForModel(modelId: string | null | undefined): AdvisorModelPricing | null {
  return normalizeModelId(modelId) === DEEPSEEK_FLASH_PRICING.model_id
    ? DEEPSEEK_FLASH_PRICING
    : null;
}

export function isApprovedAdvisorModel(modelId: string | null | undefined): boolean {
  return normalizeModelId(modelId) === APPROVED_ADVISOR_MODEL;
}

/**
 * The rates of a band. A band that somehow is not in the table falls back to the
 * CEILING (peak), never to a cheaper one.
 */
export function ratesForBand(
  pricing: AdvisorModelPricing,
  band: AdvisorRateBand = DEFAULT_RATE_BAND,
): AdvisorRate {
  return pricing.rates[band] ?? pricing.rates.PEAK;
}

/** `tokens` priced at a per-unit rate, in the pricing's currency. */
export function usdForTokens(tokens: number, usdPerUnit: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 0;
  return (tokens / ADVISOR_PRICING_UNIT_TOKENS) * usdPerUnit;
}

/** Per-1k convenience for readers who think in thousands. Derived, never typed. */
export function per1kUsd(usdPerUnit: number): number {
  return usdPerUnit / (ADVISOR_PRICING_UNIT_TOKENS / 1000);
}
