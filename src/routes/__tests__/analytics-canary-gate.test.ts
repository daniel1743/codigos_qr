import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const read = (file: string): string => readFileSync(resolve(here, "..", file), "utf8");

/**
 * C2B8 — invariants that only exist in the route files (source level):
 * the production gate must be the canary gate, fixtures/QA must stay DEV-only,
 * and the legacy fallback must stay reachable.
 */
describe("C2B8 analytics route canary wiring", () => {
  const route = read("pages.$pageId.analytics.tsx");

  it("no longer hard-blocks production to legacy", () => {
    expect(route).not.toContain('if (!import.meta.env.DEV) return "legacy";');
  });

  it("decides the production mode with the canary gate on the owner-scoped page row", () => {
    expect(route).toContain("isAnalyticsDashboardRealModeEnabled");
    expect(route).toContain("resolveAnalyticsDashboardMode");
    expect(route).toContain("publicId: ownedPage.public_id");
    expect(route).toContain("canaryResolved.current");
  });

  it("keeps the QA selector and fixtures DEV-only", () => {
    expect(route).toContain("import.meta.env.DEV ? (");
    expect(route).toContain("isDev: import.meta.env.DEV");
  });

  it("keeps the owner/ownership guard untouched", () => {
    expect(route).toContain("pageService.getOwnPageById(supabase, pageId, auth.user.id)");
    expect(route).toContain("Debes iniciar sesión para ver estadísticas.");
  });

  it("keeps a controlled legacy fallback for V1.1 failures", () => {
    expect(route).toContain("realError");
    expect(route).toContain('setMode("legacy")');
    expect(route).toContain("Ver dashboard anterior");
  });

  it("keeps the real dashboard read-only and bounded", () => {
    expect(route).toContain('realDataPeriodBounds("90d", new Date(), timezone)');
  });

  it("keeps /analytics-visual-qa DEV-only", () => {
    const qa = read("analytics-visual-qa.tsx");
    expect(qa).toContain("if (!import.meta.env.DEV) throw notFound();");
  });
});
