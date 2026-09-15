import { describe, expect, it } from "vitest";
import {
  action,
  emptyNormalizedContent,
  generateMiniSitePlan,
  generatePagePlan,
  mapPageTypeToExperience,
  type CatalogItemV1,
  type CatalogV1,
  type PageGenerationRequest,
} from "../smart-pages";

function makeItem(name = "Owner item"): CatalogItemV1 {
  return {
    id: `i_${name}`,
    type: "service",
    name,
    media: [],
    attributes: [],
    salesMode: "contact",
    featured: false,
    enabled: true,
    confidence: 1,
    review: [],
  };
}

function makeCatalog(kind: CatalogV1["kind"], itemCount = 1): CatalogV1 {
  return {
    id: `c_${kind}`,
    kind,
    categories: [],
    items: Array.from({ length: itemCount }, (_, i) => makeItem(`${kind} ${i + 1}`)),
  };
}

function request(overrides: Partial<PageGenerationRequest> = {}): PageGenerationRequest {
  const content = emptyNormalizedContent("Demo Business");
  content.business.businessType = "restaurant";
  content.contact.whatsapp = "+56912345678";
  content.catalogs = [makeCatalog("menu")];
  return {
    version: "1",
    businessType: "restaurant",
    goal: "sell",
    density: "balanced",
    salesMode: "contact",
    primaryAction: action("whatsapp", "Order"),
    secondaryActions: [],
    content,
    ...overrides,
  };
}

describe("page-orchestrator (SMART_PAGES_2)", () => {
  it("produces the same PagePlanV1 for the same request (deterministic)", () => {
    expect(generatePagePlan(request())).toEqual(generatePagePlan(request()));
  });

  it.each([
    ["services", "services"],
    ["catalog", "catalog"],
    ["portfolio", "portfolio"],
    ["menu", "menu"],
  ] as const)("plans %s as a %s experience", (kind, expected) => {
    const content = emptyNormalizedContent("Business");
    content.catalogs = [makeCatalog(kind)];
    const plan = generatePagePlan(request({ businessType: kind, content }));
    expect(plan.experienceType).toBe(expected);
  });

  it("marks semantic IDs as temporary planner identifiers, not host identity", () => {
    const plan = generatePagePlan(request());
    expect(plan.pageId).toMatch(/^page_[a-z0-9-]+$/);
    expect(plan.pageId).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("plans a truthful single-page mini-site by default", () => {
    expect(generateMiniSitePlan(request()).pages).toHaveLength(1);
  });

  it("plans a bounded multi-page mini-site (1..5 pages)", () => {
    const plan = generateMiniSitePlan(request({ preferences: { maxPages: 5 } }));
    expect(plan.pages.length).toBeGreaterThanOrEqual(1);
    expect(plan.pages.length).toBeLessThanOrEqual(5);
    expect(plan.pages.every((p) => /^page_/.test(p.pageId))).toBe(true);
  });

  it("multi-page navigation uses internal_page destinations", () => {
    const plan = generateMiniSitePlan(request({ preferences: { maxPages: 5 } }));
    expect(plan.pages[0]?.navigation?.some((n) => n.destination.mode === "internal_page")).toBe(
      true,
    );
  });

  it("maps supported host page types to experiences", () => {
    expect(mapPageTypeToExperience("services").experienceType).toBe("services");
    expect(mapPageTypeToExperience("catalog").experienceType).toBe("catalog");
    expect(mapPageTypeToExperience("portfolio").experienceType).toBe("portfolio");
    expect(mapPageTypeToExperience("menu").experienceType).toBe("menu");
  });

  it("does not silently turn listings into a DB page type", () => {
    const mapping = mapPageTypeToExperience("listings");
    expect(mapping.experienceType).toBe("listings");
    expect(mapping.semanticOnly).toBe(true);
    expect(mapping.diagnostic).toBeTruthy();
    const plan = generatePagePlan(request());
    expect(plan).not.toHaveProperty("page_type");
  });

  it("maps promotion/event/campaign to landing with a diagnostic", () => {
    for (const t of ["promotion", "event", "campaign"]) {
      const m = mapPageTypeToExperience(t);
      expect(m.experienceType).toBe("landing");
      expect(m.diagnostic).toBeTruthy();
    }
  });
});
