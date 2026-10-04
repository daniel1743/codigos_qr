import { describe, expect, it, vi } from "vitest";
import type { CanonicalPublicPagePort } from "./resolveCanonicalPublicPage";
import {
  decidePublicEntryRoute,
  pickTrackingSearch,
  TRACKING_SEARCH_KEYS,
} from "./publicEntryRouting";
import { CanonicalPublicPageReadError } from "./supabaseCanonicalPublicPagePort.server";

const PAGE = { pagePublicId: "VvUsngW", pageSlug: "bienestar-en-claro" };
const MIGRATED = { profilePublicId: "KTRdygd", profileSlug: "vida-saludable-bienestar" };
const LEGACY_ONLY = { profilePublicId: "Legacy1", profileSlug: "sin-pagina-todavia" };

interface PortOptions {
  profiles?: Record<string, typeof MIGRATED>;
  profilesBySlug?: Record<string, typeof MIGRATED>;
  pageForProfile?: Record<string, typeof PAGE>;
  failBridge?: boolean;
}

function makePort(options: PortOptions = {}): CanonicalPublicPagePort {
  return {
    findPublishedPageByPublicId: vi.fn(async () => null),
    findPublishedPageBySlug: vi.fn(async () => null),
    findPublishedProfileByPublicId: vi.fn(async (id: string) => options.profiles?.[id] ?? null),
    findPublishedProfileBySlug: vi.fn(async (slug: string) => options.profilesBySlug?.[slug] ?? null),
    findPublishedPageForProfile: vi.fn(async (id: string) => {
      if (options.failBridge) throw new CanonicalPublicPageReadError("get_published_magic_page_by_legacy_public_id", new Error("boom"));
      return options.pageForProfile?.[id] ?? null;
    }),
  };
}

const MIGRATED_PORT: PortOptions = {
  profiles: { KTRdygd: MIGRATED },
  profilesBySlug: { "vida-saludable-bienestar": MIGRATED },
  pageForProfile: { KTRdygd: PAGE },
};

describe("decidePublicEntryRoute — 1) flag OFF keeps today's behaviour", () => {
  it("renders legacy without ever touching the port", async () => {
    const createPort = vi.fn(() => makePort(MIGRATED_PORT));
    const decision = await decidePublicEntryRoute({
      enabled: false,
      identifier: { kind: "legacy-profile-slug", value: "vida-saludable-bienestar" },
      createPort,
      search: { utm_source: "qr" },
    });
    expect(decision).toEqual({ kind: "render-legacy" });
    expect(createPort).not.toHaveBeenCalled();
  });
});

describe("decidePublicEntryRoute — 2/3) allowlisted legacy entries reach the published page", () => {
  it("2) /p/{profile_public_id} → /pg/{page_public_id}", async () => {
    const decision = await decidePublicEntryRoute({
      enabled: true,
      identifier: { kind: "legacy-profile-public-id", value: "KTRdygd" },
      createPort: () => makePort(MIGRATED_PORT),
    });
    expect(decision).toEqual({
      kind: "redirect-to-page",
      pagePublicId: "VvUsngW",
      pageSlug: "bienestar-en-claro",
      path: "/pg/VvUsngW",
    });
  });

  it("3) /{profile_slug} → /pg/{page_public_id}", async () => {
    const decision = await decidePublicEntryRoute({
      enabled: true,
      identifier: { kind: "legacy-profile-slug", value: "vida-saludable-bienestar" },
      createPort: () => makePort(MIGRATED_PORT),
    });
    expect(decision).toMatchObject({ kind: "redirect-to-page", path: "/pg/VvUsngW" });
  });
});

describe("decidePublicEntryRoute — 4/5) legacy stays legacy", () => {
  it("4) a profile without a modern page keeps rendering legacy", async () => {
    const decision = await decidePublicEntryRoute({
      enabled: true,
      identifier: { kind: "legacy-profile-public-id", value: "Legacy1" },
      createPort: () =>
        makePort({ profiles: { Legacy1: LEGACY_ONLY }, profilesBySlug: { "sin-pagina-todavia": LEGACY_ONLY } }),
    });
    expect(decision).toEqual({ kind: "render-legacy" });
  });

  it("5) a modern page that exists only as a draft does not replace legacy", async () => {
    const decision = await decidePublicEntryRoute({
      enabled: true,
      identifier: { kind: "legacy-profile-slug", value: "vida-saludable-bienestar" },
      // The published-only bridge yields nothing for an unpublished page.
      createPort: () =>
        makePort({ profilesBySlug: { "vida-saludable-bienestar": MIGRATED }, pageForProfile: {} }),
    });
    expect(decision).toEqual({ kind: "render-legacy" });
  });
});

describe("decidePublicEntryRoute — 7) explicit failures, never silent", () => {
  it("7) an infrastructure outage is propagated", async () => {
    await expect(
      decidePublicEntryRoute({
        enabled: true,
        identifier: { kind: "legacy-profile-public-id", value: "KTRdygd" },
        createPort: () => makePort({ profiles: { KTRdygd: MIGRATED }, failBridge: true }),
      }),
    ).rejects.toBeInstanceOf(CanonicalPublicPageReadError);
  });

  it("returns not-found for an unpublished or unknown profile", async () => {
    const decision = await decidePublicEntryRoute({
      enabled: true,
      identifier: { kind: "legacy-profile-public-id", value: "Ghost" },
      createPort: () => makePort({}),
    });
    expect(decision).toEqual({ kind: "not-found" });
  });
});

describe("decidePublicEntryRoute — 8/9) no loops, /q and /p boundaries intact", () => {
  it("never redirects an identity to itself (loop guard)", async () => {
    const port: CanonicalPublicPagePort = {
      findPublishedPageByPublicId: async () => PAGE,
      findPublishedPageBySlug: async () => null,
      findPublishedProfileByPublicId: async () => null,
      findPublishedProfileBySlug: async () => null,
      findPublishedPageForProfile: async () => null,
    };
    const decision = await decidePublicEntryRoute({
      enabled: true,
      identifier: { kind: "page-public-id", value: "VvUsngW" },
      createPort: () => port,
    });
    expect(decision).toEqual({ kind: "render-legacy" });
  });

  it("always redirects to /pg/{id} — never through /q or /p (qr_scan stays exclusive)", async () => {
    for (const identifier of [
      { kind: "legacy-profile-public-id" as const, value: "KTRdygd" },
      { kind: "legacy-profile-slug" as const, value: "vida-saludable-bienestar" },
    ]) {
      const decision = await decidePublicEntryRoute({
        enabled: true,
        identifier,
        createPort: () => makePort(MIGRATED_PORT),
      });
      expect(decision.kind).toBe("redirect-to-page");
      if (decision.kind !== "redirect-to-page") throw new Error("unreachable");
      expect(decision.path).toBe("/pg/VvUsngW");
      expect(decision.path.startsWith("/pg/")).toBe(true);
      expect(decision.path.startsWith("/q/")).toBe(false);
      expect(decision.path.startsWith("/p/")).toBe(false);
    }
  });
});

describe("decidePublicEntryRoute — 10) tracking parameters are preserved", () => {
  it("keeps UTM / source / campaign keys and drops unknown ones", () => {
    const picked = pickTrackingSearch({
      utm_source: "qr",
      utm_medium: "print",
      utm_campaign: "lanzamiento",
      source: "qr",
      campaign: "ola-1",
      ref: "partner",
      qr: "1",
      qr_id: "abc",
      junk: "drop-me",
      page: "3",
    });
    expect(picked).toEqual({
      utm_source: "qr",
      utm_medium: "print",
      utm_campaign: "lanzamiento",
      source: "qr",
      campaign: "ola-1",
      ref: "partner",
      qr: "1",
      qr_id: "abc",
    });
    expect(TRACKING_SEARCH_KEYS).toContain("utm_campaign");
  });

  it("attaches the preserved search to the canonical redirect", async () => {
    const decision = await decidePublicEntryRoute({
      enabled: true,
      identifier: { kind: "legacy-profile-public-id", value: "KTRdygd" },
      createPort: () => makePort(MIGRATED_PORT),
      search: { utm_source: "qr", utm_campaign: "lanzamiento", junk: "x" },
    });
    expect(decision).toMatchObject({
      kind: "redirect-to-page",
      search: { utm_source: "qr", utm_campaign: "lanzamiento" },
    });
  });

  it("omits the search key when there is nothing relevant to preserve", async () => {
    const decision = await decidePublicEntryRoute({
      enabled: true,
      identifier: { kind: "legacy-profile-public-id", value: "KTRdygd" },
      createPort: () => makePort(MIGRATED_PORT),
      search: { junk: "x" },
    });
    expect(decision).not.toHaveProperty("search");
  });
});
