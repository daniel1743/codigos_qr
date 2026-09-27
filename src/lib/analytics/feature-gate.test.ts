import { describe, expect, it } from "vitest";

import {
  assertCanonicalAnalyticsAllowed,
  isAnalyticsDashboardRealModeEnabled,
  isCanonicalAnalyticsEnabled,
  parseCanonicalPageAllowlist,
} from "./feature-gate";
import { PRODUCTION_PROJECT_REF, QA_PROJECT_REF } from "./qa-runtime-guard";

const QA_URL = `https://${QA_PROJECT_REF}.supabase.co`;
const PROD_URL = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;

describe("parseCanonicalPageAllowlist", () => {
  it("parses a comma-separated list and trims entries", () => {
    expect(parseCanonicalPageAllowlist("a, b , c,")).toEqual(new Set(["a", "b", "c"]));
  });

  it("returns an empty set for non-string values", () => {
    expect(parseCanonicalPageAllowlist(undefined)).toEqual(new Set());
    expect(parseCanonicalPageAllowlist(null)).toEqual(new Set());
    expect(parseCanonicalPageAllowlist(42)).toEqual(new Set());
    expect(parseCanonicalPageAllowlist("")).toEqual(new Set());
    expect(parseCanonicalPageAllowlist(" , , ")).toEqual(new Set());
  });
});

describe("isCanonicalAnalyticsEnabled", () => {
  it("allows QA runtime", () => {
    expect(isCanonicalAnalyticsEnabled({ supabaseUrl: QA_URL, publicId: "any-page" })).toBe(true);
  });

  it("denies production when the global flag is off (default)", () => {
    expect(isCanonicalAnalyticsEnabled({ supabaseUrl: PROD_URL, publicId: "canary-page" })).toBe(
      false,
    );
  });

  it("denies production when the flag is on but the page is not allowlisted", () => {
    expect(
      isCanonicalAnalyticsEnabled({
        supabaseUrl: PROD_URL,
        publicId: "other-page",
        environment: {
          VITE_ANALYTICS_CANONICAL_ENABLED: "true",
          VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: "canary-page",
        },
      }),
    ).toBe(false);
  });

  it("allows production when the flag is on and the page is allowlisted", () => {
    expect(
      isCanonicalAnalyticsEnabled({
        supabaseUrl: PROD_URL,
        publicId: "canary-page",
        environment: {
          VITE_ANALYTICS_CANONICAL_ENABLED: "true",
          VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: "canary-page, another",
        },
      }),
    ).toBe(true);
  });

  it("denies production when the page identity is missing", () => {
    expect(
      isCanonicalAnalyticsEnabled({
        supabaseUrl: PROD_URL,
        publicId: null,
        environment: {
          VITE_ANALYTICS_CANONICAL_ENABLED: "true",
          VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: "canary-page",
        },
      }),
    ).toBe(false);
  });

  it("denies unknown projects even with the flag on", () => {
    expect(
      isCanonicalAnalyticsEnabled({
        supabaseUrl: "https://other.supabase.co",
        publicId: "canary-page",
        environment: {
          VITE_ANALYTICS_CANONICAL_ENABLED: "true",
          VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: "canary-page",
        },
      }),
    ).toBe(false);
  });

  it("denies safely when the allowlist is malformed", () => {
    expect(
      isCanonicalAnalyticsEnabled({
        supabaseUrl: PROD_URL,
        publicId: "canary-page",
        environment: {
          VITE_ANALYTICS_CANONICAL_ENABLED: "true",
          VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: 42,
        },
      }),
    ).toBe(false);
  });

  it("denies when the flag value is not exactly the string 'true'", () => {
    expect(
      isCanonicalAnalyticsEnabled({
        supabaseUrl: PROD_URL,
        publicId: "canary-page",
        environment: {
          VITE_ANALYTICS_CANONICAL_ENABLED: "TRUE",
          VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: "canary-page",
        },
      }),
    ).toBe(false);
  });
});

describe("assertCanonicalAnalyticsAllowed", () => {
  it("throws when canonical tracking is denied", () => {
    expect(() =>
      assertCanonicalAnalyticsAllowed({ supabaseUrl: PROD_URL, publicId: "canary-page" }),
    ).toThrow(/disabled/);
  });

  it("does not throw when canonical tracking is allowed", () => {
    expect(() =>
      assertCanonicalAnalyticsAllowed({ supabaseUrl: QA_URL, publicId: "any-page" }),
    ).not.toThrow();
  });

/**
 * C2B8: the dashboard gate is the SAME canary gate, so the rollout has one
 * interruptor and the production default stays closed.
 */
describe("isAnalyticsDashboardRealModeEnabled (C2B8)", () => {
  it("allows the QA runtime", () => {
    expect(isAnalyticsDashboardRealModeEnabled({ supabaseUrl: QA_URL, publicId: "any" })).toBe(true);
  });

  it("denies production by default (flag off)", () => {
    expect(
      isAnalyticsDashboardRealModeEnabled({ supabaseUrl: PROD_URL, publicId: "canary-page" }),
    ).toBe(false);
  });

  it("allows production only for an allowlisted page with the flag on", () => {
    expect(
      isAnalyticsDashboardRealModeEnabled({
        supabaseUrl: PROD_URL,
        publicId: "canary-page",
        environment: {
          VITE_ANALYTICS_CANONICAL_ENABLED: "true",
          VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: "canary-page, another",
        },
      }),
    ).toBe(true);
    expect(
      isAnalyticsDashboardRealModeEnabled({
        supabaseUrl: PROD_URL,
        publicId: "not-allowlisted",
        environment: {
          VITE_ANALYTICS_CANONICAL_ENABLED: "true",
          VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: "canary-page",
        },
      }),
    ).toBe(false);
  });

  it("denies unknown projects and missing page identity", () => {
    expect(
      isAnalyticsDashboardRealModeEnabled({
        supabaseUrl: "https://unknown.supabase.co",
        publicId: "canary-page",
        environment: {
          VITE_ANALYTICS_CANONICAL_ENABLED: "true",
          VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: "canary-page",
        },
      }),
    ).toBe(false);
    expect(
      isAnalyticsDashboardRealModeEnabled({
        supabaseUrl: PROD_URL,
        publicId: null,
        environment: {
          VITE_ANALYTICS_CANONICAL_ENABLED: "true",
          VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: "canary-page",
        },
      }),
    ).toBe(false);
  });
});

});
