import { describe, expect, it, vi } from "vitest";
import type { PageDoc } from "../../isolated/magic-page-editor/types/editor";
import {
  catalogPublicHref,
  isLinkedCatalog,
  looksLikePageId,
  normalizeCatalogLink,
  parseFeaturedProductIds,
  readCatalogLink,
  resolveFeaturedProducts,
  resolveOwnedCatalogPage,
  serializeFeaturedProductIds,
  toggleFeaturedProduct,
  writeCatalogLink,
  type CatalogLinkConfig,
  type CatalogProduct,
  type OwnedCatalogRecord,
} from "./catalog-link";
import { hydrateMagicEditorState, serializeMagicEditorState } from "./magic-document";

const linkedLink = (featuredProductIds: string[]): CatalogLinkConfig => ({
  mode: "linked",
  catalogPublicId: "catalog-public-1",
  featuredProductIds,
});

const product = (id: string, title = id): CatalogProduct => ({ id, title });

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

  it("only treats a linked public id as a valid full catalog", () => {
    expect(isLinkedCatalog(linkedLink([]))).toBe(true);
    expect(isLinkedCatalog({ mode: "embedded", catalogPublicId: "ABC", featuredProductIds: [] })).toBe(false);
    expect(isLinkedCatalog({ mode: "linked", catalogPublicId: null, featuredProductIds: [] })).toBe(false);
    expect(catalogPublicHref("ABC123")).toBe("/pg/ABC123");
  });

  it("resolves only the featured products, in order and capped at three", () => {
    const link = linkedLink(["p2", "p1", "p3", "p4"]);
    const products = [product("p1"), product("p2"), product("p3"), product("p4")];

    expect(resolveFeaturedProducts(link, products).map((entry) => entry.id)).toEqual([
      "p2",
      "p1",
      "p3",
    ]);
  });

  it("ignores featured ids whose product was deleted from the catalog", () => {
    const link = linkedLink(["p1", "gone", "p2"]);
    const products = [product("p1"), product("p2")];

    expect(resolveFeaturedProducts(link, products).map((entry) => entry.id)).toEqual(["p1", "p2"]);
  });

  it("never resolves featured products for an embedded block", () => {
    const embedded: CatalogLinkConfig = {
      mode: "embedded",
      catalogPublicId: null,
      featuredProductIds: ["p1"],
    };
    expect(resolveFeaturedProducts(embedded, [product("p1")])).toEqual([]);
  });

  it("toggles featured products without duplicates and never past three", () => {
    expect(toggleFeaturedProduct([], "p1", true)).toEqual(["p1"]);
    expect(toggleFeaturedProduct(["p1", "p2"], "p1", true)).toEqual(["p1", "p2"]);
    expect(toggleFeaturedProduct(["p1", "p2"], "p1", false)).toEqual(["p2"]);
    expect(toggleFeaturedProduct(["p1", "p2", "p3"], "p4", true)).toEqual(["p1", "p2", "p3"]);
    expect(toggleFeaturedProduct(["p1", "p1", "p2"], "p3", true)).toEqual(["p1", "p2", "p3"]);
  });

  it("keeps public id and featured products across save and reload (tests 4, 5, 13)", () => {
    const doc = writeCatalogLink(catalogDoc(), "catalog", {
      mode: "linked",
      catalogPublicId: "ABC123",
      featuredProductIds: ["p1", "p2", "p3"],
      ctaLabel: "Ver catálogo completo",
    });

    const reloaded = hydrateMagicEditorState(serializeMagicEditorState({ templateId: "bio", doc }));

    expect(readCatalogLink(reloaded.doc, "catalog")).toEqual({
      mode: "linked",
      catalogPublicId: "ABC123",
      featuredProductIds: ["p1", "p2", "p3"],
      ctaLabel: "Ver catálogo completo",
    });
  });
});

describe("resolveOwnedCatalogPage (draft-aware private resolution)", () => {
  const record = (
    id: string,
    published: boolean,
    products: CatalogProduct[],
  ): OwnedCatalogRecord => ({ id, published, products });

  it("resolves an OWNED DRAFT by public id (publishing only gates the public link)", async () => {
    const byPublicId = vi.fn(async () => record("catalog-1", false, [product("p1")]));
    const result = await resolveOwnedCatalogPage("PUB123", { byPublicId });
    expect(byPublicId).toHaveBeenCalledWith("PUB123");
    expect(result).toEqual({ pageId: "catalog-1", products: [product("p1")], published: false });
  });

  it("falls back to a legacy page-id reference only when it is a UUID", async () => {
    const uuid = "11111111-2222-3333-4444-555555555555";
    const byPublicId = vi.fn(async () => null);
    const byId = vi.fn(async () => record(uuid, true, [product("p2")]));
    const result = await resolveOwnedCatalogPage(uuid, { byPublicId, byId });
    expect(byId).toHaveBeenCalledWith(uuid);
    expect(result.pageId).toBe(uuid);
    expect(result.published).toBe(true);

    // A non-UUID reference never hits byId (it would be a Postgres cast error).
    const byId2 = vi.fn(async () => record("x", true, []));
    await resolveOwnedCatalogPage("not-a-uuid", { byPublicId, byId: byId2 });
    expect(byId2).not.toHaveBeenCalled();
  });

  it("returns an unresolved result — never embedded data — when nothing matches", async () => {
    const result = await resolveOwnedCatalogPage("missing", {
      byPublicId: async () => null,
      byId: async () => null,
    });
    expect(result).toEqual({ pageId: null, products: null, published: false });
  });

  it("treats an empty reference as unresolved without any lookup", async () => {
    const byPublicId = vi.fn(async () => record("x", false, []));
    expect(await resolveOwnedCatalogPage("  ", { byPublicId })).toEqual({
      pageId: null,
      products: null,
      published: false,
    });
    expect(byPublicId).not.toHaveBeenCalled();
  });

  it("identifies page-id references", () => {
    expect(looksLikePageId("11111111-2222-3333-4444-555555555555")).toBe(true);
    expect(looksLikePageId("ABC123")).toBe(false);
  });
});
