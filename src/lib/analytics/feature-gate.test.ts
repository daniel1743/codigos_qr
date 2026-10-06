import { describe, expect, it } from "vitest";

import {
  CANONICAL_ANALYTICS_ENABLED_KEY,
  CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY,
  CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY,
  assertCanonicalAnalyticsAllowed,
  isCanonicalAnalyticsEnabled,
  parseCanonicalPageAllowlist,
} from "./feature-gate";
import { PRODUCTION_PROJECT_REF, QA_PROJECT_REF } from "./qa-runtime-guard";

const QA_URL = `https://${QA_PROJECT_REF}.supabase.co`;
const PROD_URL = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;
const UNKNOWN_URL = "https://other.supabase.co";

function productionEnvironment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    [CANONICAL_ANALYTICS_ENABLED_KEY]: "true",
    [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "canary-page",
    ...overrides,
  };
}

function enabledForProduction(
  overrides: {
    publicId?: string | null;
    environment?: Record<string, unknown>;
  } = {},
): boolean {
  return isCanonicalAnalyticsEnabled({
    supabaseUrl: PROD_URL,
    publicId: Object.prototype.hasOwnProperty.call(overrides, "publicId")
      ? overrides.publicId
      : "canary-page",
    environment: overrides.environment ?? productionEnvironment(),
  });
}

describe("parseCanonicalPageAllowlist", () => {
  it("parses a comma-separated list and trims entries", () => {
    expect(parseCanonicalPageAllowlist("a, b , c,")).toEqual(new Set(["a", "b", "c"]));
  });

  it("returns an empty set for non-string values", () => {
    expect(parseCanonicalPageAllowlist(undefined)).toEqual(new Set());
    expect(parseCanonicalPageAllowlist(null)).toEqual(new Set());
    expect(parseCanonicalPageAllowlist(42)).toEqual(new Set());
    expect(parseCanonicalPageAllowlist({})).toEqual(new Set());
  });

  it("returns an empty set for empty and whitespace-only values", () => {
    expect(parseCanonicalPageAllowlist("")).toEqual(new Set());
    expect(parseCanonicalPageAllowlist("   ")).toEqual(new Set());
    expect(parseCanonicalPageAllowlist(" , , ")).toEqual(new Set());
  });

  it("keeps '*' as a literal entry instead of treating it as a wildcard", () => {
    expect(parseCanonicalPageAllowlist("*")).toEqual(new Set(["*"]));
  });
});

describe("isCanonicalAnalyticsEnabled", () => {
  it("allows QA runtime with the existing permissive semantics", () => {
    expect(isCanonicalAnalyticsEnabled({ supabaseUrl: QA_URL, publicId: "any-page" })).toBe(true);
  });

  it("denies production when the canonical flag is false", () => {
    expect(
      enabledForProduction({
        environment: productionEnvironment({ [CANONICAL_ANALYTICS_ENABLED_KEY]: false }),
      }),
    ).toBe(false);
  });

  it("denies production when the canonical flag is missing", () => {
    expect(
      enabledForProduction({
        environment: {
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "canary-page",
        },
      }),
    ).toBe(false);
  });

  it("denies production when the allowlist is missing", () => {
    expect(
      enabledForProduction({
        environment: {
          [CANONICAL_ANALYTICS_ENABLED_KEY]: "true",
        },
      }),
    ).toBe(false);
  });

  it("denies production when the allowlist is empty", () => {
    expect(
      enabledForProduction({
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "",
        }),
      }),
    ).toBe(false);
  });

  it("denies production when the allowlist is whitespace-only", () => {
    expect(
      enabledForProduction({
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "   \t  ",
        }),
      }),
    ).toBe(false);
  });

  it("denies production when the allowlist is malformed", () => {
    expect(
      enabledForProduction({
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: 42,
        }),
      }),
    ).toBe(false);
  });

  it("does not treat '*' as a wildcard", () => {
    expect(
      enabledForProduction({
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "*",
        }),
      }),
    ).toBe(false);
  });

  it("denies production when the page is not in the allowlist", () => {
    expect(
      enabledForProduction({
        publicId: "other-page",
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "canary-page, another",
        }),
      }),
    ).toBe(false);
  });

  it("denies production when the page identity is missing", () => {
    expect(
      enabledForProduction({
        publicId: null,
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "canary-page",
        }),
      }),
    ).toBe(false);
  });

  it("allows production only when the page is explicitly allowlisted", () => {
    expect(
      enabledForProduction({
        publicId: "canary-page",
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "canary-page, another",
        }),
      }),
    ).toBe(true);
  });

  it("denies global activation when the global flag is false", () => {
    expect(
      enabledForProduction({
        publicId: "any-page",
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "",
          [CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY]: false,
        }),
      }),
    ).toBe(false);
  });

  it("does not infer global activation from an empty allowlist", () => {
    expect(
      enabledForProduction({
        publicId: "any-page",
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "",
        }),
      }),
    ).toBe(false);
  });

  it("does not infer global activation from a malformed allowlist", () => {
    expect(
      enabledForProduction({
        publicId: "any-page",
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: 42,
        }),
      }),
    ).toBe(false);
  });

  it("does not allow a malformed allowlist to enable global activation", () => {
    expect(
      enabledForProduction({
        publicId: "any-page",
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: 42,
          [CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY]: "true",
        }),
      }),
    ).toBe(false);
  });

  it("allows global activation only through the explicit global flag", () => {
    expect(
      enabledForProduction({
        publicId: "any-page",
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "",
          [CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY]: "true",
        }),
      }),
    ).toBe(true);
  });

  it("requires the canonical flag even when the global flag is true", () => {
    expect(
      enabledForProduction({
        publicId: "any-page",
        environment: {
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "",
          [CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY]: "true",
        },
      }),
    ).toBe(false);

    expect(
      enabledForProduction({
        publicId: "any-page",
        environment: {
          [CANONICAL_ANALYTICS_ENABLED_KEY]: false,
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "",
          [CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY]: "true",
        },
      }),
    ).toBe(false);
  });

  it("only accepts the exact string 'true' for the global flag", () => {
    for (const value of ["TRUE", "True", "1", 1, null, undefined]) {
      expect(
        enabledForProduction({
          publicId: "any-page",
          environment: productionEnvironment({
            [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "",
            [CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY]: value,
          }),
        }),
      ).toBe(false);
    }
  });

  it("denies unknown runtimes even with a valid-looking production configuration", () => {
    expect(
      isCanonicalAnalyticsEnabled({
        supabaseUrl: UNKNOWN_URL,
        publicId: "canary-page",
        environment: productionEnvironment(),
      }),
    ).toBe(false);
  });

  it("never enables production from an invalid configuration", () => {
    const invalidEnvironments = [
      {},
      { [CANONICAL_ANALYTICS_ENABLED_KEY]: false },
      { [CANONICAL_ANALYTICS_ENABLED_KEY]: "TRUE" },
      { [CANONICAL_ANALYTICS_ENABLED_KEY]: "true" },
      { [CANONICAL_ANALYTICS_ENABLED_KEY]: "true", [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "" },
      { [CANONICAL_ANALYTICS_ENABLED_KEY]: "true", [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "  " },
      { [CANONICAL_ANALYTICS_ENABLED_KEY]: "true", [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: 42 },
      {
        [CANONICAL_ANALYTICS_ENABLED_KEY]: "true",
        [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: 42,
        [CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY]: "true",
      },
    ];

    for (const environment of invalidEnvironments) {
      expect(
        isCanonicalAnalyticsEnabled({
          supabaseUrl: PROD_URL,
          publicId: "any-page",
          environment,
        }),
      ).toBe(false);
    }
  });
});

describe("assertCanonicalAnalyticsAllowed", () => {
  it("throws when canonical tracking is denied", () => {
    expect(() =>
      assertCanonicalAnalyticsAllowed({ supabaseUrl: PROD_URL, publicId: "canary-page" }),
    ).toThrow(/disabled/);
  });

  it("does not throw for QA", () => {
    expect(() =>
      assertCanonicalAnalyticsAllowed({ supabaseUrl: QA_URL, publicId: "any-page" }),
    ).not.toThrow();
  });

  it("does not throw for an allowlisted production page", () => {
    expect(() =>
      assertCanonicalAnalyticsAllowed({
        supabaseUrl: PROD_URL,
        publicId: "canary-page",
        environment: productionEnvironment(),
      }),
    ).not.toThrow();
  });

  it("does not throw for an explicitly authorized global production rollout", () => {
    expect(() =>
      assertCanonicalAnalyticsAllowed({
        supabaseUrl: PROD_URL,
        publicId: "any-page",
        environment: productionEnvironment({
          [CANONICAL_ANALYTICS_PAGE_ALLOWLIST_KEY]: "",
          [CANONICAL_ANALYTICS_GLOBAL_ENABLED_KEY]: "true",
        }),
      }),
    ).not.toThrow();
  });
});
