import { describe, expect, it } from "vitest";
import { extractCatalogProducts } from "./catalog-products";

function catalogConfig(productCount: number) {
  return {
    schemaVersion: 1,
    blocks: [
      {
        id: "grid",
        type: "productGrid",
        content: {
          products: Array.from({ length: productCount }, (_, index) => ({
            id: `product-${index}`,
            title: `Producto ${index}`,
            description: "Descripción",
            price: `${index} €`,
            imageUrl: `https://example.com/${index}.png`,
            ctaLabel: "Ver",
            ctaUrl: "#buy",
          })),
        },
      },
      { id: "heading", type: "heading", content: { title: "Productos destacados" } },
    ],
  };
}

describe("extractCatalogProducts", () => {
  it("keeps every product stored in the full catalog", () => {
    const products = extractCatalogProducts(catalogConfig(7));
    expect(products).toHaveLength(7);
    expect(products.map((product) => product.id)).toEqual(
      Array.from({ length: 7 }, (_, index) => `product-${index}`),
    );
    expect(products[0]).toMatchObject({
      title: "Producto 0",
      price: "0 €",
      imageUrl: "https://example.com/0.png",
      ctaLabel: "Ver",
      ctaUrl: "#buy",
    });
  });

  it("reads the canonical page envelope the catalog persists", () => {
    const envelope = { schemaVersion: 1, editorConfig: catalogConfig(2) };
    expect(extractCatalogProducts(envelope)).toHaveLength(2);
  });

  it("drops malformed products and missing grids safely", () => {
    const config = catalogConfig(1);
    config.blocks[0].content.products.push({ title: "Sin id" } as never);
    expect(extractCatalogProducts(config).map((product) => product.id)).toEqual(["product-0"]);
    expect(extractCatalogProducts({ blocks: [] })).toEqual([]);
    expect(extractCatalogProducts(null)).toEqual([]);
  });
});
