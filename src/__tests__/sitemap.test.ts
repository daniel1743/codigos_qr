import { describe, expect, it } from "vitest";
import { buildSitemapXml } from "../routes/sitemap[.]xml";

function sitemap(
  profiles: Parameters<typeof buildSitemapXml>[0],
  mappings: Parameters<typeof buildSitemapXml>[1] = [],
) {
  return buildSitemapXml(profiles, mappings);
}

describe("sitemap canonical URL selection", () => {
  it("includes a standalone published profile", () => {
    const xml = sitemap([{ id: "profile-1", public_id: "PROFILE1", updated_at: "2026-09-01" }]);
    expect(xml).toContain("https://www.cripqer.dev/p/PROFILE1");
  });

  it("replaces a bridged profile with its canonical Magic page", () => {
    const xml = sitemap(
      [{ id: "profile-1", public_id: "PROFILE1", updated_at: "2026-09-01" }],
      [{ profile_public_id: "PROFILE1", page_public_id: "PAGE1" }],
    );
    expect(xml).not.toContain("/p/PROFILE1");
    expect(xml).toContain("https://www.cripqer.dev/pg/PAGE1");
  });

  it("emits only the canonical page returned for a profile with multiple linked pages", () => {
    const xml = sitemap(
      [{ id: "profile-1", public_id: "PROFILE1", updated_at: null }],
      [{ profile_public_id: "PROFILE1", page_public_id: "CANONICAL" }],
    );
    expect(xml).toContain("/pg/CANONICAL");
    expect(xml).not.toContain("/pg/ALIAS");
    expect(xml).not.toContain("/p/PROFILE1");
  });

  it("leaves a profile in place when no eligible published Magic page is resolved", () => {
    const xml = sitemap([{ id: "profile-1", public_id: "PROFILE1", updated_at: null }]);
    expect(xml).toContain("/p/PROFILE1");
    expect(xml).not.toContain("/pg/");
  });

  it("excludes empty aliases and deduplicates canonical URLs", () => {
    const xml = sitemap(
      [
        { id: "profile-1", public_id: "DUPLICATE", updated_at: null },
        { id: "profile-2", public_id: "DUPLICATE", updated_at: null },
      ],
      [
        { profile_public_id: "DUPLICATE", page_public_id: "PAGE1" },
        { profile_public_id: "DUPLICATE", page_public_id: "PAGE2" },
        { profile_public_id: "ALIAS", page_public_id: "PAGE1" },
      ],
    );
    expect(xml.match(/<loc>https:\/\/www\.cripqer\.dev\/pg\/PAGE1<\/loc>/g)).toHaveLength(1);
    expect(xml).not.toContain("PAGE2");
    expect(xml).not.toContain("/pg/a/");
    expect(xml.match(/<loc>https:\/\/www\.cripqer\.dev\/p\/DUPLICATE<\/loc>/g)).toBeNull();
  });

  it("emits valid XML with only the production HTTPS origin", () => {
    const xml = sitemap([{ id: "profile-1", public_id: "A&B", updated_at: null }]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml.match(/<url>/g)?.length).toBe(xml.match(/<\/url>/g)?.length);
    expect(xml).toContain("https://www.cripqer.dev/p/A%26B");
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    expect(locs.every((loc) => loc?.startsWith("https://www.cripqer.dev/"))).toBe(true);
  });
});
