import { describe, expect, it } from "vitest";
import {
  resolveCanonicalMagicPageId,
  selectLandingPage,
  type LandingPageCandidate,
} from "../resolveCanonicalMagicPage";

const page = (id: string, page_type: string | null): LandingPageCandidate => ({ id, page_type });

function fakeSupabase(rows: LandingPageCandidate[]) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => Promise.resolve({ data: rows, error: null }),
  };
  return { from: () => builder } as never;
}

describe("selectLandingPage (C3.2.1)", () => {
  it("opens the landing, never the catalog, even when the catalog was updated last (dashboard order)", () => {
    // MyProfilePage orders owned pages by `updated_at DESC`, so the freshly
    // edited full catalog arrives first — the exact C3.2 regression.
    const pages = [page("catalog-page", "catalog"), page("landing-page", "landing")];
    expect(selectLandingPage(pages)?.id).toBe("landing-page");
  });

  it("never resolves a catalog-only account to the catalog", () => {
    expect(selectLandingPage([page("catalog-page", "catalog")])).toBeNull();
  });

  it("falls back to the first page that is not an extension", () => {
    const pages = [page("catalog-page", "catalog"), page("promo-page", "promotion")];
    expect(selectLandingPage(pages)?.id).toBe("promo-page");
  });

  it("keeps the earliest landing in the caller's order", () => {
    const pages = [
      page("landing-a", "landing"),
      page("landing-b", "landing"),
      page("catalog-page", "catalog"),
    ];
    expect(selectLandingPage(pages)?.id).toBe("landing-a");
  });

  it("returns null when there are no pages or only catalog extensions", () => {
    expect(selectLandingPage([])).toBeNull();
    expect(selectLandingPage([page("catalog-1", "catalog"), page("catalog-2", "catalog")])).toBeNull();
  });
});

describe("resolveCanonicalMagicPageId (C3.2.1)", () => {
  it("resolves the landing when a catalog row sits beside it", async () => {
    const supabase = fakeSupabase([
      page("catalog-page", "catalog"),
      page("landing-page", "landing"),
    ]);
    await expect(resolveCanonicalMagicPageId(supabase, "user-1")).resolves.toBe("landing-page");
  });

  it("resolves null for a catalog-only account", async () => {
    const supabase = fakeSupabase([page("catalog-page", "catalog")]);
    await expect(resolveCanonicalMagicPageId(supabase, "user-2")).resolves.toBeNull();
  });
});
