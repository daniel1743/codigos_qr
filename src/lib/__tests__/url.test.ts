import { describe, expect, it } from "vitest";
import { getAliasProfileUrl, getPublicPageAliasUrl, getPublicPageUrl, getPublicProfileUrl } from "../url";

describe("getPublicPageUrl (PAGES_5)", () => {
  it("resolves a child Page URL from its stable public_id", () => {
    expect(getPublicPageUrl("yfLEdka")).toBe("https://www.cripqer.dev/pg/yfLEdka");
  });

  it("strips a leading slash from the public id", () => {
    expect(getPublicPageUrl("/yfLEdka")).toBe("https://www.cripqer.dev/pg/yfLEdka");
  });

  it("never uses the title, slug or a fabricated alias", () => {
    const url = getPublicPageUrl("yfLEdka");
    expect(url).toContain("/pg/yfLEdka");
    expect(url).not.toContain("promo");
  });
});

describe("getPublicProfileUrl (unchanged)", () => {
  it("still resolves the primary-profile URL as before", () => {
    expect(getPublicProfileUrl("sY9wHGm")).toBe("https://www.cripqer.dev/p/sY9wHGm");
  });
});

describe("getAliasProfileUrl (unchanged)", () => {
  it("still resolves alias URLs as before", () => {
    expect(getAliasProfileUrl("my-shop")).toBe("https://www.cripqer.dev/my-shop");
  });
});

describe("getPublicPageAliasUrl (PAGES_6)", () => {
  it("resolves a page alias in the dedicated /pg/a namespace", () => {
    expect(getPublicPageAliasUrl("promo-septiembre")).toBe(
      "https://www.cripqer.dev/pg/a/promo-septiembre",
    );
  });

  it("strips a leading slash from the alias", () => {
    expect(getPublicPageAliasUrl("/promo-septiembre")).toBe(
      "https://www.cripqer.dev/pg/a/promo-septiembre",
    );
  });

  it("keeps the stable /pg/{public_id} URL separate from the alias URL", () => {
    expect(getPublicPageUrl("yfLEdka")).toBe("https://www.cripqer.dev/pg/yfLEdka");
    expect(getPublicPageAliasUrl("yfLEdka")).toBe("https://www.cripqer.dev/pg/a/yfLEdka");
  });
});
