/**
 * CA-9A.2 — the price contract and the model alignment.
 *
 * Two things are proven here that a reader cannot check by eye:
 *
 *  1. The published figures are the published figures (peak, off-peak, cache hit,
 *     cache miss, output) in USD per 1 000 000 tokens — and the guard's default
 *     band is the CEILING, not the discount.
 *  2. No other model can be priced with them. `deepseek-chat` — the id CA-9A.1
 *     found unverifiable — and every other string resolve to `null`.
 *
 * The last test scans the module's own source: `deepseek-chat` may not appear in
 * the Conversion Advisor at all any more, which is what makes the "restore the old
 * default" mutation fail instead of passing quietly.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { ADVISOR_DEFAULTS } from "../../provider.server";
import {
  ADVISOR_PRICING_CURRENCY,
  ADVISOR_PRICING_UNIT_TOKENS,
  APPROVED_ADVISOR_MODEL,
  APPROVED_ADVISOR_PROVIDER,
  DEFAULT_RATE_BAND,
  DEEPSEEK_FLASH_PRICING,
  PRICED_ADVISOR_MODELS,
  isApprovedAdvisorModel,
  per1kUsd,
  pricingForModel,
  ratesForBand,
  usdForTokens,
} from "../pricing";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = join(HERE, "..", "..");

describe("CA-9A.2 pricing — the published table", () => {
  it("prices the approved model in USD per 1M tokens", () => {
    expect(DEEPSEEK_FLASH_PRICING.model_id).toBe(APPROVED_ADVISOR_MODEL);
    expect(DEEPSEEK_FLASH_PRICING.model_id).toBe("deepseek-flash");
    expect(DEEPSEEK_FLASH_PRICING.provider).toBe(APPROVED_ADVISOR_PROVIDER.name);
    expect(DEEPSEEK_FLASH_PRICING.provider_mode).toBe("direct");
    expect(DEEPSEEK_FLASH_PRICING.currency).toBe(ADVISOR_PRICING_CURRENCY);
    expect(DEEPSEEK_FLASH_PRICING.currency).toBe("USD");
    expect(DEEPSEEK_FLASH_PRICING.unit_tokens).toBe(ADVISOR_PRICING_UNIT_TOKENS);
    expect(DEEPSEEK_FLASH_PRICING.unit_tokens).toBe(1_000_000);
    expect(DEEPSEEK_FLASH_PRICING.source).toContain("api-docs.deepseek.com");
    expect(DEEPSEEK_FLASH_PRICING.retrieved_at).toBe("2026-10-16");
  });

  it("carries the peak and off-peak rates the owner approved", () => {
    expect(DEEPSEEK_FLASH_PRICING.rates.PEAK).toEqual({
      cache_hit_input_usd_per_unit: 0.006,
      cache_miss_input_usd_per_unit: 0.3,
      output_usd_per_unit: 1.2,
    });
    expect(DEEPSEEK_FLASH_PRICING.rates.OFF_PEAK).toEqual({
      cache_hit_input_usd_per_unit: 0.003,
      cache_miss_input_usd_per_unit: 0.15,
      output_usd_per_unit: 0.6,
    });
    // Off-peak is exactly half of peak, as the provider documents.
    expect(DEEPSEEK_FLASH_PRICING.rates.OFF_PEAK.cache_miss_input_usd_per_unit).toBe(
      DEEPSEEK_FLASH_PRICING.rates.PEAK.cache_miss_input_usd_per_unit / 2,
    );
  });

  it("defaults to the PEAK band, because the guard must not assume a discount", () => {
    expect(DEFAULT_RATE_BAND).toBe("PEAK");
    expect(ratesForBand(DEEPSEEK_FLASH_PRICING)).toEqual(DEEPSEEK_FLASH_PRICING.rates.PEAK);
    expect(ratesForBand(DEEPSEEK_FLASH_PRICING, "OFF_PEAK")).toEqual(
      DEEPSEEK_FLASH_PRICING.rates.OFF_PEAK,
    );
  });

  it("prices tokens at the unit the contract declares", () => {
    const rates = DEEPSEEK_FLASH_PRICING.rates.PEAK;
    expect(usdForTokens(1_000_000, rates.cache_miss_input_usd_per_unit)).toBeCloseTo(0.3, 12);
    expect(usdForTokens(500_000, rates.output_usd_per_unit)).toBeCloseTo(0.6, 12);
    expect(usdForTokens(0, rates.output_usd_per_unit)).toBe(0);
    expect(usdForTokens(Number.NaN, rates.output_usd_per_unit)).toBe(0);
    expect(per1kUsd(rates.cache_miss_input_usd_per_unit)).toBeCloseTo(0.0003, 12);
  });
});

describe("CA-9A.2 pricing — a price belongs to ONE model", () => {
  it("resolves the approved model and nothing else", () => {
    expect(pricingForModel(APPROVED_ADVISOR_MODEL)).toBe(DEEPSEEK_FLASH_PRICING);
    expect(pricingForModel(" DeepSeek-Flash ")).toBe(DEEPSEEK_FLASH_PRICING);
    // The id CA-9A.1 could not attribute a price to must NOT inherit this one.
    expect(pricingForModel("deepseek-chat")).toBeNull();
    expect(pricingForModel("deepseek-v4-pro")).toBeNull();
    expect(pricingForModel("")).toBeNull();
    expect(pricingForModel(null)).toBeNull();
    expect(pricingForModel(undefined)).toBeNull();
    expect(PRICED_ADVISOR_MODELS).toEqual([APPROVED_ADVISOR_MODEL]);
  });

  it("keeps the provider default aligned with the priced model", () => {
    expect(ADVISOR_DEFAULTS.model).toBe(APPROVED_ADVISOR_MODEL);
    expect(isApprovedAdvisorModel(ADVISOR_DEFAULTS.model)).toBe(true);
    // The default must always be priceable, or the campaign could not run.
    expect(pricingForModel(ADVISOR_DEFAULTS.model)).not.toBeNull();
    expect(ADVISOR_DEFAULTS.baseUrl).toBe(APPROVED_ADVISOR_PROVIDER.baseUrl);
  });
});

describe("CA-9A.2 model alignment — the advisor carries no retired model id", () => {
  /** Built at run time so this test file does not itself contain the literal. */
  const RETIRED_MODEL_ID = ["deepseek", "chat"].join("-");

  /**
   * Comments are stripped before scanning, exactly as `evaluation/isolation.test.ts`
   * does for imports: a doc comment that explains WHY the id was retired is
   * documentation, not a default. What must not carry it is the CODE.
   */
  const stripComments = (source: string): string =>
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((line) => {
        const index = line.indexOf("//");
        return index === -1 ? line : line.slice(0, index);
      })
      .join("\n");

  const moduleSources = (): string[] => {
    const found: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          // Test files may quote a retired id to prove it is unpriced; the
          // invariant is about the module's SOURCE.
          if (entry !== "__tests__") walk(full);
        } else if (/\.(ts|tsx)$/.test(entry)) {
          found.push(full);
        }
      }
    };
    walk(MODULE_ROOT);
    return found;
  };

  it("has no retired model id anywhere in the Conversion Advisor code", () => {
    expect(moduleSources().length).toBeGreaterThan(20);
    const offenders = moduleSources().filter((file) =>
      stripComments(readFileSync(file, "utf8")).includes(RETIRED_MODEL_ID),
    );
    expect(offenders).toEqual([]);
  });

  it("still proves the retired id resolves to no price at all", () => {
    expect(pricingForModel(RETIRED_MODEL_ID)).toBeNull();
    expect(isApprovedAdvisorModel(RETIRED_MODEL_ID)).toBe(false);
    expect(PRICED_ADVISOR_MODELS).not.toContain(RETIRED_MODEL_ID);
  });
});
