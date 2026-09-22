import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createDemoConfig } from "../templates/definitions";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import type { BioTemplateConfig } from "../types";

describe("catalog ProductGrid direct editing", () => {
  it("exposes direct text targets for product fields in edit mode", () => {
    const config = {
      ...createDemoConfig(),
      blocks: [
        {
          id: "catalog-products",
          type: "productGrid" as const,
          variant: "default",
          style: {},
          layout: { columns: 3 },
          visibility: { desktop: true, tablet: true, mobile: true },
          interaction: { newTab: true },
          content: {
            products: [
              {
                id: "product-1",
                title: "Producto uno",
                description: "Descripción corta",
                price: "$10",
                ctaLabel: "Comprar",
                ctaUrl: "#comprar",
              },
            ],
          },
        },
      ],
    } as BioTemplateConfig;

    const html = renderToStaticMarkup(
      <TemplateRenderer
        config={config}
        mode="edit"
        breakpoint="desktop"
        editing={{ onInlineEdit: () => undefined }}
      />,
    );

    expect(html).toContain('data-pts-inline="blocks.catalog-products.content.products.0.title"');
    expect(html).toContain(
      'data-pts-inline="blocks.catalog-products.content.products.0.description"',
    );
    expect(html).toContain('data-pts-inline="blocks.catalog-products.content.products.0.price"');
    expect(html).toContain('data-pts-inline="blocks.catalog-products.content.products.0.ctaLabel"');
    expect(html).not.toContain("<p><p");
    expect(html).not.toContain("Ver detalle");
    expect(html).not.toContain("Fondo");

    const selectedHtml = renderToStaticMarkup(
      <TemplateRenderer
        config={config}
        mode="edit"
        breakpoint="desktop"
        editing={{
          selectedCollectionItem: {
            blockId: "catalog-products",
            collection: "product-grid",
            itemId: "product-1",
          },
          onInlineEdit: () => undefined,
          onCollectionItemAction: () => undefined,
        }}
      />,
    );
    expect(selectedHtml).toContain("Ver detalle");
    expect(selectedHtml).toContain("Fondo");

    const publicHtml = renderToStaticMarkup(
      <TemplateRenderer config={config} mode="public" breakpoint="desktop" />,
    );
    expect(publicHtml).not.toContain("Ver detalle");
    expect(publicHtml).not.toContain("Text styling");
  });
});
