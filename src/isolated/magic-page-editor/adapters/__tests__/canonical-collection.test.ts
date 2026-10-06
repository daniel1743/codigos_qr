import { describe, expect, it } from "vitest";
import type { BioTemplateConfig, BlockItem } from "../../../../premium-template-studio/types";
import {
  applyCanonicalCollectionItemAction,
  applyCanonicalInlinePatch,
  appendCanonicalCollectionItems,
  updateCanonicalCollectionItem,
} from "../canonical-collection";

function product(id: string, over: Partial<BlockItem> = {}): BlockItem {
  return {
    id,
    title: `Producto ${id}`,
    description: `Descripción ${id}`,
    price: `$${id}`,
    imageUrl: "",
    ctaLabel: "Comprar",
    ctaUrl: "#comprar",
    ...over,
  };
}

/** Minimal canonical catalog: one product-grid block with three products. */
function catalogConfig(products: BlockItem[] = [product("p0"), product("p1"), product("p2")]) {
  return {
    schemaVersion: 1,
    pageInstanceId: "catalog-inst",
    templateDefinitionId: "catalog-default-v1",
    metadata: { name: "Catálogo" },
    theme: {},
    layout: {},
    profile: {},
    seo: {},
    settings: {},
    blocks: [
      {
        id: "grid-1",
        type: "productGrid",
        variant: "catalog-premium-card-v1",
        visibility: { desktop: true, tablet: true, mobile: true },
        style: {},
        layout: { columns: 3 },
        interaction: {},
        content: { products },
      },
    ],
  } as unknown as BioTemplateConfig;
}

function productsOf(config: BioTemplateConfig): BlockItem[] {
  return config.blocks[0]!.content.products ?? [];
}

describe("canonical inline patch (path based)", () => {
  it("edits one product field immutably without touching siblings", () => {
    const config = catalogConfig();
    const next = applyCanonicalInlinePatch(
      config,
      "blocks.grid-1.content.products.1.title",
      "Título editado",
    );

    expect(productsOf(next)[1]!.title).toBe("Título editado");
    expect(productsOf(next)[0]!.title).toBe("Producto p0");
    expect(productsOf(next)[1]!.price).toBe("$p1");
    // The original document is never mutated.
    expect(productsOf(config)[1]!.title).toBe("Producto p1");
  });

  it("edits a product CTA label and URL", () => {
    const config = catalogConfig();
    const labeled = applyCanonicalInlinePatch(config, "blocks.grid-1.content.products.0.ctaLabel", "Comprar ya");
    const linked = applyCanonicalInlinePatch(labeled, "blocks.grid-1.content.products.0.ctaUrl", "https://shop.test/0");
    expect(productsOf(linked)[0]!.ctaLabel).toBe("Comprar ya");
    expect(productsOf(linked)[0]!.ctaUrl).toBe("https://shop.test/0");
  });

  it("edits block-level style paths", () => {
    const config = catalogConfig();
    const next = applyCanonicalInlinePatch(config, "blocks.grid-1.style.background", "#ffffff");
    expect((next.blocks[0]!.style as Record<string, unknown>)["background"]).toBe("#ffffff");
  });
});

describe("canonical collection item actions (reuse canonical CRUD)", () => {
  it("duplicates a product and reports the new item id", () => {
    const config = catalogConfig();
    const result = applyCanonicalCollectionItemAction(config, "grid-1", "p0", "duplicate");
    expect(result.changed).toBe(true);
    expect(result.selectedItemId).not.toBeNull();
    expect(result.selectedItemId).not.toBe("p0");
    expect(productsOf(result.config)).toHaveLength(4);
    expect(productsOf(result.config)[1]!.id).toBe(result.selectedItemId);
  });

  it("deletes a product", () => {
    const config = catalogConfig();
    const result = applyCanonicalCollectionItemAction(config, "grid-1", "p1", "delete");
    expect(result.changed).toBe(true);
    expect(productsOf(result.config).map((item) => item.id)).toEqual(["p0", "p2"]);
  });

  it("reorders a product up and down", () => {
    const config = catalogConfig();
    const down = applyCanonicalCollectionItemAction(config, "grid-1", "p0", "down");
    expect(productsOf(down.config).map((item) => item.id)).toEqual(["p1", "p0", "p2"]);
    const up = applyCanonicalCollectionItemAction(down.config, "grid-1", "p2", "up");
    expect(productsOf(up.config).map((item) => item.id)).toEqual(["p1", "p2", "p0"]);
  });

  it("is a no-op (unchanged) for an unknown item or block", () => {
    const config = catalogConfig();
    expect(applyCanonicalCollectionItemAction(config, "grid-1", "missing", "delete").changed).toBe(false);
    expect(applyCanonicalCollectionItemAction(config, "nope", "p0", "delete").changed).toBe(false);
  });
});

describe("canonical collection append + item update", () => {
  it("adds safe placeholder products for the canonical catalog", () => {
    const config = catalogConfig([product("p0", { title: "Real", price: "$99" })]);
    const result = appendCanonicalCollectionItems(config, "grid-1", 2);
    expect(result.addedIds).toHaveLength(2);
    const products = productsOf(result.config);
    expect(products).toHaveLength(3);
    expect(products[1]!.title).not.toBe("Real");
    expect(products[1]!.price).not.toBe("$99");
    expect(products[1]!.id).toBe(result.addedIds[0]);
  });

  it("sets a product image with owner provenance", () => {
    const config = catalogConfig();
    const next = updateCanonicalCollectionItem(config, "grid-1", "p0", (item) => ({
      ...item,
      imageUrl: "https://cdn.test/0.png",
      imageProvenance: { origin: "owner" as const },
    }));
    expect(productsOf(next)[0]!.imageUrl).toBe("https://cdn.test/0.png");
    expect(productsOf(next)[0]!.imageProvenance?.origin).toBe("owner");
    expect(productsOf(config)[0]!.imageUrl).toBe("");
  });
});
