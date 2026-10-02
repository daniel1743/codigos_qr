import { describe, expect, it } from "vitest";
import type { PageDoc } from "../../isolated/magic-page-editor/types/editor";
import {
  normalizeCatalogLink,
  parseFeaturedProductIds,
  readCatalogLink,
  serializeFeaturedProductIds,
  writeCatalogLink,
} from "./catalog-link";

function catalogDoc(): PageDoc {
  return {
    blocks: [{ key: "catalog", type: "catalog" }],
    texts: { "block:catalog.cards.title": "Productos" },
    textStyles: {},
    props: {
      "block:catalog": { order: "2,0,1", unrelated: "keep", catalogPublished: "on" },
      "block:catalogcard.0": { hidden: "off" },
    },
    removed: { "block:catalogcard.1": false },
  };
}

describe("catalog link contract", () => {
  it("keeps legacy catalog blocks embedded by default", () => {
    const link = readCatalogLink(catalogDoc(), "catalog");
    expect(link).toEqual({ mode: "embedded", catalogPublicId: null, featuredProductIds: [] });
  });

  it("round-trips linked metadata through PageDoc props", () => {
    const doc = writeCatalogLink(catalogDoc(), "catalog", {
      mode: "linked",
      catalogPublicId: "ABC123",
      featuredProductIds: ["prod-1", "prod-2", "prod-3"],
      ctaLabel: "Ver catálogo completo",
      sectionTitle: "Productos destacados",
    });

    expect(readCatalogLink(doc, "catalog")).toEqual({
      mode: "linked",
      catalogPublicId: "ABC123",
      featuredProductIds: ["prod-1", "prod-2", "prod-3"],
      ctaLabel: "Ver catálogo completo",
      sectionTitle: "Productos destacados",
    });
    expect(doc.props["block:catalog"].order).toBe("2,0,1");
    expect(doc.props["block:catalog"].unrelated).toBe("keep");
    expect(doc.props["block:catalog"].catalogPublished).toBe("on");
    expect(doc.texts["block:catalog.cards.title"]).toBe("Productos");
    expect(doc.removed["block:catalogcard.1"]).toBe(false);
  });

  it("parses malformed featured ids safely", () => {
    expect(parseFeaturedProductIds("not-an-array")).toEqual([]);
    expect(parseFeaturedProductIds("{")).toEqual([]);
    expect(parseFeaturedProductIds('["prod-1", 7, null, "prod-2"]')).toEqual(["prod-1", "prod-2"]);
  });

  it("deduplicates ids, preserves order, and caps at three", () => {
    const ids = ["prod-1", "prod-1", "prod-2", "prod-3", "prod-4"];
    expect(parseFeaturedProductIds(JSON.stringify(ids))).toEqual(["prod-1", "prod-2", "prod-3"]);
    expect(serializeFeaturedProductIds(ids)).toBe('["prod-1","prod-2","prod-3"]');
  });

  it("normalizes invalid modes and empty public ids to embedded", () => {
    expect(
      normalizeCatalogLink({ mode: "something-else" as never, catalogPublicId: "ABC" }),
    ).toMatchObject({
      mode: "embedded",
      catalogPublicId: null,
    });
    expect(normalizeCatalogLink({ mode: "linked", catalogPublicId: "" })).toMatchObject({
      mode: "embedded",
      catalogPublicId: null,
    });
  });

  it("does not treat missing linked targets as valid links", () => {
    const doc = writeCatalogLink(catalogDoc(), "catalog", {
      mode: "linked",
      catalogPublicId: null,
      featuredProductIds: ["prod-1"],
    });

    expect(readCatalogLink(doc, "catalog")).toEqual({
      mode: "embedded",
      catalogPublicId: null,
      featuredProductIds: ["prod-1"],
    });
  });
});
