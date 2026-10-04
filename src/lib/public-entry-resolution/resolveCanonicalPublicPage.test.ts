import { describe, expect, it, vi } from "vitest";
import {
  resolveCanonicalPublicPage,
  type CanonicalPublicPagePort,
  type PublishedPageRef,
  type PublishedProfileRef,
} from "./resolveCanonicalPublicPage";

interface PortData {
  pages?: Record<string, PublishedPageRef>;
  pagesBySlug?: Record<string, PublishedPageRef>;
  profiles?: Record<string, PublishedProfileRef>;
  profilesBySlug?: Record<string, PublishedProfileRef>;
  pagesPerProfile?: Record<string, PublishedPageRef>;
}

/** In-memory port: deterministic, no Supabase, no network. */
function makePort(data: PortData = {}): CanonicalPublicPagePort {
  return {
    findPublishedPageByPublicId: vi.fn(async (id: string) => data.pages?.[id] ?? null),
    findPublishedPageBySlug: vi.fn(async (slug: string) => data.pagesBySlug?.[slug] ?? null),
    findPublishedProfileByPublicId: vi.fn(async (id: string) => data.profiles?.[id] ?? null),
    findPublishedProfileBySlug: vi.fn(async (slug: string) => data.profilesBySlug?.[slug] ?? null),
    findPublishedPageForProfile: vi.fn(async (id: string) => data.pagesPerProfile?.[id] ?? null),
  };
}

/**
 * Real production fixture (audit evidence):
 *   page    VvUsngW  slug "bienestar-en-claro"        ← published, owned by KTRdygd
 *   profile KTRdygd  slug "vida-saludable-bienestar"  ← published, migrated
 *   profile Legacy1  slug "sin-pagina-todavia"        ← published, NOT migrated
 */
function productionFixture(): CanonicalPublicPagePort {
  const page: PublishedPageRef = { pagePublicId: "VvUsngW", pageSlug: "bienestar-en-claro" };
  const migrated: PublishedProfileRef = {
    profilePublicId: "KTRdygd",
    profileSlug: "vida-saludable-bienestar",
  };
  const legacyOnly: PublishedProfileRef = {
    profilePublicId: "Legacy1",
    profileSlug: "sin-pagina-todavia",
  };
  return makePort({
    pages: { VvUsngW: page },
    pagesBySlug: { "bienestar-en-claro": page },
    profiles: { KTRdygd: migrated, Legacy1: legacyOnly },
    profilesBySlug: { "vida-saludable-bienestar": migrated, "sin-pagina-todavia": legacyOnly },
    pagesPerProfile: { KTRdygd: page },
  });
}

describe("resolveCanonicalPublicPage — page entry points", () => {
  it("resolves /pg/{public_id} to the canonical page path", async () => {
    const target = await resolveCanonicalPublicPage(productionFixture(), {
      kind: "page-public-id",
      value: "VvUsngW",
    });
    expect(target).toEqual({
      kind: "page",
      pagePublicId: "VvUsngW",
      pageSlug: "bienestar-en-claro",
      canonicalPath: "/pg/VvUsngW",
      resolvedFrom: "page-public-id",
    });
  });

  it("resolves the page custom alias (/pg/a/{slug})", async () => {
    const target = await resolveCanonicalPublicPage(productionFixture(), {
      kind: "page-slug",
      value: "bienestar-en-claro",
    });
    expect(target).toMatchObject({ kind: "page", canonicalPath: "/pg/VvUsngW", resolvedFrom: "page-slug" });
  });

  it("keeps a published page without alias canonical (pageSlug null)", async () => {
    const port = makePort({ pages: { NoAlias1: { pagePublicId: "NoAlias1", pageSlug: null } } });
    const target = await resolveCanonicalPublicPage(port, {
      kind: "page-public-id",
      value: "NoAlias1",
    });
    expect(target).toEqual({
      kind: "page",
      pagePublicId: "NoAlias1",
      pageSlug: null,
      canonicalPath: "/pg/NoAlias1",
      resolvedFrom: "page-public-id",
    });
  });

  it("returns not-found for unknown / unpublished page identities", async () => {
    const port = productionFixture();
    const byId = await resolveCanonicalPublicPage(port, { kind: "page-public-id", value: "Missing" });
    const bySlug = await resolveCanonicalPublicPage(port, { kind: "page-slug", value: "missing-slug" });
    expect(byId.kind).toBe("not-found");
    expect(bySlug.kind).toBe("not-found");
  });
});

describe("resolveCanonicalPublicPage — pages wins once a published page exists", () => {
  it("legacy QR identity /p/{profile_public_id} resolves to the published page", async () => {
    const target = await resolveCanonicalPublicPage(productionFixture(), {
      kind: "legacy-profile-public-id",
      value: "KTRdygd",
    });
    expect(target).toEqual({
      kind: "page",
      pagePublicId: "VvUsngW",
      pageSlug: "bienestar-en-claro",
      canonicalPath: "/pg/VvUsngW",
      resolvedFrom: "legacy-profile-public-id",
    });
  });

  it("legacy root alias /{profile_slug} resolves to the published page", async () => {
    const target = await resolveCanonicalPublicPage(productionFixture(), {
      kind: "legacy-profile-slug",
      value: "vida-saludable-bienestar",
    });
    expect(target).toMatchObject({ kind: "page", pagePublicId: "VvUsngW", resolvedFrom: "legacy-profile-slug" });
  });
});

describe("resolveCanonicalPublicPage — legacy preserved while not migrated", () => {
  it("keeps the legacy profile for /p/{profile_public_id} with no published page", async () => {
    const target = await resolveCanonicalPublicPage(productionFixture(), {
      kind: "legacy-profile-public-id",
      value: "Legacy1",
    });
    expect(target).toEqual({
      kind: "legacy-profile",
      profilePublicId: "Legacy1",
      profileSlug: "sin-pagina-todavia",
      resolvedFrom: "legacy-profile-public-id",
    });
  });

  it("keeps the legacy profile for /{profile_slug} with no published page", async () => {
    const target = await resolveCanonicalPublicPage(productionFixture(), {
      kind: "legacy-profile-slug",
      value: "sin-pagina-todavia",
    });
    expect(target.kind).toBe("legacy-profile");
  });

  it("returns not-found for an unknown legacy profile and never asks for a page", async () => {
    const port = productionFixture();
    const target = await resolveCanonicalPublicPage(port, {
      kind: "legacy-profile-public-id",
      value: "Ghost",
    });
    expect(target).toEqual({ kind: "not-found", resolvedFrom: "legacy-profile-public-id" });
    expect(port.findPublishedPageForProfile).not.toHaveBeenCalled();
  });
});

describe("resolveCanonicalPublicPage — input hygiene and failure policy", () => {
  it("trims the identifier before querying", async () => {
    const port = productionFixture();
    const target = await resolveCanonicalPublicPage(port, {
      kind: "page-public-id",
      value: "  VvUsngW  ",
    });
    expect(target.kind).toBe("page");
    expect(port.findPublishedPageByPublicId).toHaveBeenCalledWith("VvUsngW");
  });

  it("treats empty / whitespace identifiers as not-found without touching the port", async () => {
    const port = productionFixture();
    for (const value of ["", "   "]) {
      const target = await resolveCanonicalPublicPage(port, { kind: "page-slug", value });
      expect(target).toEqual({ kind: "not-found", resolvedFrom: "page-slug" });
    }
    expect(port.findPublishedPageBySlug).not.toHaveBeenCalled();
    expect(port.findPublishedPageForProfile).not.toHaveBeenCalled();
  });

  it("never swallows a resolution outage (no silent fallback)", async () => {
    const failing: CanonicalPublicPagePort = {
      findPublishedPageByPublicId: async () => {
        throw new Error("rpc unavailable");
      },
      findPublishedPageBySlug: async () => null,
      findPublishedProfileByPublicId: async () => null,
      findPublishedProfileBySlug: async () => null,
      findPublishedPageForProfile: async () => null,
    };
    await expect(
      resolveCanonicalPublicPage(failing, { kind: "page-public-id", value: "VvUsngW" }),
    ).rejects.toThrow("rpc unavailable");
  });
});
