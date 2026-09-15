import { describe, expect, it } from "vitest";
import { isReservedPageAlias, isValidPageAlias, normalizePageAlias } from "../page-alias";

describe("normalizePageAlias (PAGES_6)", () => {
  it("lowercases", () => {
    expect(normalizePageAlias("Promo")).toBe("promo");
  });

  it("normalizes spaces to hyphens", () => {
    expect(normalizePageAlias("Promo Septiembre")).toBe("promo-septiembre");
  });

  it("removes unsupported punctuation", () => {
    expect(normalizePageAlias("Promo Septiembre 2026!")).toBe("promo-septiembre-2026");
  });

  it("strips diacritics", () => {
    expect(normalizePageAlias("Café")).toBe("cafe");
  });

  it("collapses repeated hyphens and strips leading/trailing hyphens", () => {
    expect(normalizePageAlias("  A--B__C  ")).toBe("a-b-c");
  });

  it("returns empty for empty input", () => {
    expect(normalizePageAlias("   ")).toBe("");
  });
});

describe("isValidPageAlias (PAGES_6)", () => {
  it("accepts a valid alias", () => {
    expect(isValidPageAlias("promo-septiembre-2026")).toBe(true);
  });

  it("rejects empty alias", () => {
    expect(isValidPageAlias("")).toBe(false);
  });

  it("rejects reserved system routes", () => {
    expect(isValidPageAlias("pg")).toBe(false);
    expect(isValidPageAlias("editor")).toBe(false);
    expect(isValidPageAlias("a")).toBe(false);
  });

  it("rejects invalid characters and edge hyphens", () => {
    expect(isValidPageAlias("-foo")).toBe(false);
    expect(isValidPageAlias("foo--bar")).toBe(false);
    expect(isValidPageAlias("foo bar")).toBe(false);
  });
});

describe("isReservedPageAlias (PAGES_6)", () => {
  it("flags top-level system route segments", () => {
    expect(isReservedPageAlias("p")).toBe(true);
    expect(isReservedPageAlias("pg")).toBe(true);
    expect(isReservedPageAlias("account")).toBe(true);
    expect(isReservedPageAlias("promo-septiembre")).toBe(false);
  });
});
