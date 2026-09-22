import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createDemoConfig } from "../templates/definitions";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import type { BioTemplateConfig } from "../types";

describe("catalog PremiumProductCardMagicV1 phase 1", () => {
  it("renders one real catalog item with Magic presentation and no editor wiring", () => {
    const config = {
      ...createDemoConfig(),
      blocks: [
        {
          id: "catalog-products",
          type: "productGrid" as const,
          variant: "catalog-premium-card-v1",
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

    expect(html).toContain('data-premium-card="magic-v1"');
    expect(html).toContain('data-premium-card-image="magic-v1"');
    expect(html).toContain("Producto uno");
    expect(html).toContain("Descripción corta");
    expect(html).toContain("$10");
    expect(html).toContain("Comprar");
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain('data-pts-inline="blocks.catalog-products.content.products.0');
    expect(html).not.toContain('data-premium-card="true"');
    expect(html).not.toContain("Ver detalle");
    expect(html).not.toContain("Fondo");

    const publicHtml = renderToStaticMarkup(
      <TemplateRenderer config={config} mode="public" breakpoint="desktop" />,
    );
    expect(publicHtml).toContain('data-premium-card="magic-v1"');
    expect(publicHtml).not.toContain("Text styling");
    expect(publicHtml).not.toContain('data-pts-inline="blocks.catalog-products.content.products.0');
  });
});
