import { describe, expect, it, vi } from "vitest";
import { cardFamilies } from "../../isolated/magic-page-editor/data/cardFamilies";
import type { PageDoc } from "../../isolated/magic-page-editor/types/editor";
import {
  convertEmbeddedCatalogToFullCatalog,
  extractEmbeddedCatalogProducts,
} from "./catalog-conversion.service";

function document(): PageDoc {
  return {
    blocks: [{ key: "catalog", type: "catalog" }],
    texts: {
      "block:catalog.card.1.title": "Título editado",
      "block:catalog.card.1.desc": "Descripción editada",
      "block:catalog.card.1.price": "99 €",
      "block:catalog.card.1.cta.label": "Comprar ahora",
    },
    textStyles: {},
    props: {
      "block:catalog": { order: "1,0,2" },
      "block:catalog.card.1.img": { src: "https://example.com/edited.jpg" },
      "block:catalog.card.1.cta": { href: "https://example.com/buy" },
    },
    removed: {},
  };
}

const supabase = {} as never;

describe("extractEmbeddedCatalogProducts", () => {
  it("imports edited values, current order, and current image/CTA overrides", () => {
    const products = extractEmbeddedCatalogProducts(document());
    expect(products).toHaveLength(3);
    expect(products[0]).toMatchObject({
      title: "Título editado",
      description: "Descripción editada",
      price: "99 €",
      imageUrl: "https://example.com/edited.jpg",
      ctaLabel: "Comprar ahora",
      ctaUrl: "https://example.com/buy",
    });
    expect(products[1].title).toBe(cardFamilies.catalog.items[0].title);
    expect(products.map((product) => product.id)).not.toEqual(["0", "1", "2"]);
  });

  it("skips removed and hidden cards without importing defaults for them", () => {
    const doc = document();
    doc.removed["block:catalog.card.1"] = true;
    doc.props["block:catalog.card.0"] = { hidden: "on" };
    const products = extractEmbeddedCatalogProducts(doc);
    expect(products).toHaveLength(1);
    expect(products[0].title).toBe(cardFamilies.catalog.items[2].title);
  });

  it("fails safely when the source block is malformed or missing", () => {
    const doc = document();
    doc.blocks = [{ key: "other", type: "text" }];
    expect(extractEmbeddedCatalogProducts(doc)).toEqual([]);
  });
});

describe("convertEmbeddedCatalogToFullCatalog", () => {
  it("replaces starter products and links only after catalog save succeeds", async () => {
    const calls: string[] = [];
    const created = { id: "page-1", public_id: "catalog-public-1" } as never;
    const saveLanding = vi.fn(async () => calls.push("landing"));
    let savedProductIds: string[] = [];
    const result = await convertEmbeddedCatalogToFullCatalog(
      {
        supabase,
        userId: "user-1",
        profileId: "profile-1",
        landingPageTitle: "Mi catálogo",
        document: document(),
        saveLanding,
      },
      {
        createPage: vi.fn(async () => {
          calls.push("create");
          return created;
        }) as never,
        saveCatalogDraft: vi.fn(async (_supabase, _id, _user, config) => {
          calls.push("catalog");
          const grid = config.blocks.find((block) => block.type === "productGrid");
          expect(grid?.content.products).toHaveLength(3);
          expect(grid?.content.products?.[0].title).toBe("Título editado");
          savedProductIds = grid?.content.products?.map((product) => product.id) ?? [];
          return { editorConfig: config } as never;
        }) as never,
      },
    );
    expect(calls).toEqual(["create", "catalog", "landing"]);
    expect(savedProductIds).toEqual(result.productIds);
    expect(result.document.props["block:catalog"].mode).toBe("linked");
    expect(JSON.parse(result.document.props["block:catalog"].featuredProductIds)).toEqual(
      result.productIds,
    );
  });

  it("compensates the page and leaves landing unchanged when landing save fails", async () => {
    const deletePage = vi.fn(async () => undefined);
    const saveLanding = vi.fn(async () => {
      throw new Error("landing failed");
    });
    await expect(
      convertEmbeddedCatalogToFullCatalog(
        {
          supabase,
          userId: "user-2",
          profileId: "profile-2",
          landingPageTitle: "Mi catálogo",
          document: document(),
          saveLanding,
        },
        {
          createPage: vi.fn(async () => ({ id: "page-2", public_id: "catalog-public-2" })) as never,
          saveCatalogDraft: vi.fn(async () => ({ editorConfig: {} })) as never,
          deletePage: deletePage as never,
        },
      ),
    ).rejects.toThrow("landing failed");
    expect(deletePage).toHaveBeenCalledWith(supabase, "page-2", "user-2");
  });

  it("does not create another page when the block is already linked", async () => {
    const doc = document();
    doc.props["block:catalog"].mode = "linked";
    doc.props["block:catalog"].catalogPublicId = "existing-public";
    doc.props["block:catalog"].featuredProductIds = JSON.stringify(["product-existing"]);
    const createPage = vi.fn();
    const result = await convertEmbeddedCatalogToFullCatalog(
      {
        supabase,
        userId: "user-3",
        profileId: "profile-3",
        landingPageTitle: "Mi catálogo",
        document: doc,
        saveLanding: vi.fn(),
      },
      { createPage: createPage as never },
    );
    expect(createPage).not.toHaveBeenCalled();
    expect(result.catalogPage.public_id).toBe("existing-public");
    expect(result.productIds).toEqual(["product-existing"]);
  });
});
