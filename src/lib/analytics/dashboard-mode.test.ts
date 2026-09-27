import { describe, expect, it } from "vitest";

import { resolveAnalyticsDashboardMode, resolveDevDashboardMode } from "./dashboard-mode";
import { isAnalyticsDashboardRealModeEnabled } from "./feature-gate";
import { PRODUCTION_PROJECT_REF, QA_PROJECT_REF } from "./qa-runtime-guard";

const PROD_URL = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;
const QA_URL = `https://${QA_PROJECT_REF}.supabase.co`;
const CANARY = "canary-page";

const GATE_ON = {
  VITE_ANALYTICS_CANONICAL_ENABLED: "true",
  VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: CANARY,
};
const GATE_OFF = {
  VITE_ANALYTICS_CANONICAL_ENABLED: "false",
  VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: CANARY,
};

/** Same composition the route performs after the owner-scoped page fetch. */
function productionMode(
  publicId: string | null,
  environment: Record<string, unknown>,
  search?: string | null,
) {
  return resolveAnalyticsDashboardMode({
    isDev: false,
    search,
    page: publicId === null ? null : { publicId },
    realModeEnabled: isAnalyticsDashboardRealModeEnabled({
      supabaseUrl: PROD_URL,
      publicId,
      environment,
    }),
  });
}

describe("C2B8 dashboard mode — DEV keeps the QA selector", () => {
  it("defaults to fixtures and honors ?analytics=real|legacy", () => {
    expect(resolveDevDashboardMode("")).toBe("fixtures");
    expect(resolveDevDashboardMode(null)).toBe("fixtures");
    expect(resolveDevDashboardMode("?analytics=unknown")).toBe("fixtures");
    expect(resolveDevDashboardMode("?analytics=real")).toBe("real");
    expect(resolveDevDashboardMode("?analytics=legacy")).toBe("legacy");
  });

  it("never returns pending in DEV and ignores the production gate", () => {
    expect(
      resolveAnalyticsDashboardMode({ isDev: true, search: "", page: null, realModeEnabled: false }),
    ).toBe("fixtures");
    expect(
      resolveAnalyticsDashboardMode({
        isDev: true,
        search: "?analytics=real",
        page: null,
        realModeEnabled: false,
      }),
    ).toBe("real");
  });
});

describe("C2B8 dashboard mode — production canary", () => {
  it("MODE-01: canary page + flag on → real", () => {
    expect(productionMode(CANARY, GATE_ON)).toBe("real");
  });

  it("MODE-02: non-canary page or flag off → legacy", () => {
    expect(productionMode(CANARY, GATE_OFF)).toBe("legacy");
    expect(productionMode("other-page", GATE_ON)).toBe("legacy");
    expect(productionMode("other-page", GATE_OFF)).toBe("legacy");
  });

  it("MODE-03: fixtures are unreachable in production", () => {
    expect(productionMode(CANARY, GATE_ON, "?analytics=fixtures")).toBe("real");
    expect(productionMode("other-page", GATE_ON, "?analytics=fixtures")).toBe("legacy");
    expect(productionMode(null, GATE_ON, "?analytics=fixtures")).toBe("pending");
  });

  it("never trusts the URL for authorization in production", () => {
    // A non-allowlisted page cannot force `real` through the query string…
    expect(productionMode("other-page", GATE_ON, "?analytics=real")).toBe("legacy");
    // …and the canary is not downgraded by a query string either.
    expect(productionMode(CANARY, GATE_ON, "?analytics=legacy")).toBe("real");
  });

  it("stays pending until the owner-scoped page row is available", () => {
    expect(
      resolveAnalyticsDashboardMode({ isDev: false, page: null, realModeEnabled: true }),
    ).toBe("pending");
    expect(
      resolveAnalyticsDashboardMode({ isDev: false, page: undefined, realModeEnabled: undefined }),
    ).toBe("pending");
  });

  it("fails closed: blank identity, malformed flag, unknown project → legacy", () => {
    // Row loaded but without a usable public_id → deny (never guess).
    expect(
      resolveAnalyticsDashboardMode({
        isDev: false,
        page: { publicId: null },
        realModeEnabled: true,
      }),
    ).toBe("legacy");
    expect(
      resolveAnalyticsDashboardMode({ isDev: false, page: { publicId: "" }, realModeEnabled: true }),
    ).toBe("legacy");
    expect(
      resolveAnalyticsDashboardMode({
        isDev: false,
        page: { publicId: "   " },
        realModeEnabled: true,
      }),
    ).toBe("legacy");
    expect(
      productionMode(CANARY, {
        VITE_ANALYTICS_CANONICAL_ENABLED: "true",
        VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: 42,
      }),
    ).toBe("legacy");
    expect(
      productionMode(CANARY, {
        VITE_ANALYTICS_CANONICAL_ENABLED: "TRUE",
        VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: CANARY,
      }),
    ).toBe("legacy");
    expect(
      resolveAnalyticsDashboardMode({
        isDev: false,
        page: { publicId: CANARY },
        realModeEnabled: isAnalyticsDashboardRealModeEnabled({
          supabaseUrl: "https://unknown.supabase.co",
          publicId: CANARY,
          environment: GATE_ON,
        }),
      }),
    ).toBe("legacy");
  });

  it("reports pending (not legacy) while the page row has not loaded yet", () => {
    expect(productionMode(null, GATE_ON)).toBe("pending");
    expect(productionMode(null, GATE_OFF)).toBe("pending");
  });

  it("allows the real dashboard on the QA runtime", () => {
    expect(
      resolveAnalyticsDashboardMode({
        isDev: false,
        page: { publicId: "any-page" },
        realModeEnabled: isAnalyticsDashboardRealModeEnabled({
          supabaseUrl: QA_URL,
          publicId: "any-page",
        }),
      }),
    ).toBe("real");
  });
});
