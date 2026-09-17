import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { PublicTemplateRenderer } from "@/premium-template-studio/engine/PublicTemplateRenderer";
import { emptyNormalizedContent, type NormalizedContentV1 } from "@/lib/smart-pages/catalog.types";
import { deriveRetailPresentation } from "@/lib/smart-pages/retail-presentation";
import { generatePagePlan } from "@/lib/smart-pages/page-orchestrator";
import type { PageGenerationRequest } from "@/lib/smart-pages/smart-pages.types";
import type { GeneratedPageInput } from "../types";
import { mapRetailPresentationToHostInput } from "../smart-pages-retail-map";
import { generateSmartPageWithEngineV2 } from "../smart-pages-host-map";

const NOW = "2026-09-15T12:00:00.000Z";

function retailContent(productCount = 3): NormalizedContentV1 {
  const source = emptyNormalizedContent("Tienda Norte");
  source.business = {
    ...source.business,
    businessType: "retail",
    about: "Plantas y accesorios seleccionados.",
    cover: {
      id: "cover",
      url: "https://cdn.example/store-cover.jpg",
      alt: "Portada de Tienda Norte",
      kind: "image",
    },
    differentiators: [
      { id: "benefit-1", title: "Asesoría personalizada", description: "Ayuda real para elegir." },
    ],
    badges: ["Compra local"],
  };
  source.catalogs = [
    {
      id: "catalog-1",
      kind: "catalog",
      categories: [
        { id: "cat-plants", name: "Plantas", description: "Verdes para tu espacio.", order: 0 },
        { id: "cat-pots", name: "Maceteros", order: 1 },
      ],
      items: Array.from({ length: productCount }, (_, index) => ({
        id: `product-${index + 1}`,
        type: "product" as const,
        name: index === 1 ? "Monstera deliciosa" : `Producto ${index + 1}`,
        description: `Descripción real ${index + 1}`,
        categoryId: index < Math.ceil(productCount / 2) ? "cat-plants" : "cat-pots",
        price: { label: index === 1 ? "$24.990" : `$${10 + index}.000` },
        media: [
          {
            id: `media-${index + 1}`,
            url: `https://cdn.example/product-${index + 1}.jpg`,
            alt: `Imagen de Producto ${index + 1}`,
            kind: "image" as const,
          },
        ],
        attributes: [
          {
            key: "url",
            label: "Enlace",
            value: `https://store.example/product-${index + 1}`,
          },
        ],
        salesMode: "contact" as const,
        featured: index === 1,
        enabled: true,
        confidence: 1,
        review: [],
      })),
    },
  ];
  source.gallery = [
    {
      id: "gallery-1",
      url: "https://cdn.example/store-gallery.jpg",
      alt: "Interior de la tienda",
      kind: "image",
    },
  ];
  return source;
}

function retailRequest(content: NormalizedContentV1): PageGenerationRequest {
  return {
    version: "1",
    businessType: content.business.businessType,
    goal: "sell",
    density: "rich",
    salesMode: "contact",
    primaryAction: {
      kind: "whatsapp",
      label: "Comprar por WhatsApp",
      target: "+56912345678",
      enabled: true,
    },
    secondaryActions: [],
    content,
    preferences: { experienceType: "catalog" },
  };
}

function baseInput(): GeneratedPageInput {
  return {
    objective: "catalog",
    title: "Catálogo Tienda Norte",
    businessName: "Tienda Norte",
    activity: "retail",
    coverImageUrl: "https://cdn.example/store-cover.jpg",
    cta: { type: "whatsapp", value: "+56912345678" },
    items: [],
  };
}

describe("SMART_PAGES_4 retail semantic mapping", () => {
  it("maps owner products, price, image and CTA into existing Engine content", () => {
    const source = retailContent();
    const request = retailRequest(source);
    const plan = generatePagePlan(request);
    const mapped = mapRetailPresentationToHostInput(request, plan, baseInput());

    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.contentBlocks.products).toHaveLength(3);
    expect(mapped.contentBlocks.products?.[1]).toMatchObject({
      title: "Monstera deliciosa",
      price: "$24.990",
      imageUrl: "https://cdn.example/product-2.jpg",
      ctaUrl: "https://store.example/product-2",
    });
    expect(mapped.diagnostics.mapped).toContain(
      "retail.owner price/media/name/description preserved",
    );
  });

  it("preserves a real featured item and diagnoses an unknown featured id", () => {
    const source = retailContent();
    const request = retailRequest(source);
    const plan = generatePagePlan(request);
    const presentation = deriveRetailPresentation(source)!;
    const mapped = mapRetailPresentationToHostInput(request, plan, baseInput(), presentation);
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.contentBlocks.featured).toMatchObject({
      title: "Monstera deliciosa",
      imageUrl: "https://cdn.example/product-2.jpg",
      url: "https://store.example/product-2",
    });

    const unknown = mapRetailPresentationToHostInput(request, plan, baseInput(), {
      ...presentation,
      featuredItemIds: ["missing-product"],
    });
    expect(unknown.ok).toBe(true);
    if (unknown.ok) {
      expect(unknown.contentBlocks.featured).toBeUndefined();
      expect(unknown.diagnostics.deferred).toContain(
        "retail.featured item missing-product -> unknown owner item",
      );
    }
  });

  it("retains category/secondary/benefit semantics diagnostically without emitting unsupported blocks", () => {
    const source = retailContent(4);
    const request = retailRequest(source);
    const plan = generatePagePlan(request);
    const mapped = mapRetailPresentationToHostInput(request, plan, baseInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.diagnostics.deferred).toContain(
      "retail.categoryTiles -> no first-class canonical category block",
    );
    expect(mapped.diagnostics.deferred).toContain(
      "retail.secondaryCollection -> deferred; no secondary rail",
    );
    expect(mapped.diagnostics.deferred).toContain(
      "retail.benefits -> no first-class canonical benefit strip",
    );
    expect(mapped.diagnostics.mapped).toContain("retail.benefits retained semantically (2)");
    expect(mapped.contentBlocks).not.toHaveProperty("secondaryCollection");
    expect(mapped.contentBlocks).not.toHaveProperty("benefits");
  });

  it("does not silently flatten dense retail semantics into an invented canonical field", () => {
    const source = retailContent(9);
    const request = retailRequest(source);
    const plan = generatePagePlan(request);
    const mapped = mapRetailPresentationToHostInput(request, plan, baseInput());
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.diagnostics.deferred).toContain(
      "retail.gridDensity=dense -> deferred as semantic (no canonical density field)",
    );
    expect(mapped.contentBlocks).not.toHaveProperty("gridDensity");
  });

  it("does not invent or emit stock, SKU, discount or checkout data", () => {
    const source = retailContent();
    const item = source.catalogs[0]!.items[0]!;
    item.attributes.push(
      { key: "stock", label: "Stock", value: "12" },
      { key: "sku", label: "SKU", value: "N-001" },
      { key: "discount", label: "Descuento", value: "20%" },
    );
    item.action = {
      kind: "checkout",
      label: "Comprar",
      target: "https://checkout.example/product-1",
      enabled: true,
    };
    const request = retailRequest(source);
    const mapped = mapRetailPresentationToHostInput(
      request,
      generatePagePlan(request),
      baseInput(),
    );
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.diagnostics.rejected).toEqual(
      expect.arrayContaining([
        "unsupported transaction field: stock",
        "unsupported transaction field: sku",
        "unsupported transaction field: discount",
        "unsupported transaction action: checkout (product-1)",
      ]),
    );
    expect(mapped.contentBlocks.products?.[0]).not.toHaveProperty("comparePrice");
    expect(mapped.contentBlocks.products?.[0]?.ctaUrl).toBe("https://store.example/product-1");
    expect(mapped.contentBlocks.products?.[0]?.ctaUrl).not.toContain("checkout.example");
  });

  it("uses the real Engine V2, validates canonical output and smoke-renders PublicTemplateRenderer", () => {
    const request = retailRequest(retailContent());
    const result = generateSmartPageWithEngineV2(request, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(validateTemplate(result.result.editorConfig).valid).toBe(true);
    const blockTypes = result.result.editorConfig.blocks.map((block) => block.type);
    expect(blockTypes).toContain("productGrid");
    expect(blockTypes.some((type) => type === "featuredLink" || type === "featuredMedia")).toBe(
      true,
    );
    const html = renderToStaticMarkup(
      React.createElement(PublicTemplateRenderer, {
        config: result.result.editorConfig,
        breakpoint: "desktop",
      }),
    );
    expect(html).toContain("Monstera deliciosa");
    expect(html).toContain("$24.990");
  });

  it("rejects a retail product without owner media before generation", () => {
    const source = retailContent();
    source.catalogs[0]!.items[0]!.media = [];
    const request = retailRequest(source);
    const mapped = mapRetailPresentationToHostInput(
      request,
      generatePagePlan(request),
      baseInput(),
    );
    expect(mapped.ok).toBe(false);
    if (!mapped.ok)
      expect(mapped.diagnostics.rejected).toContain("retail product without owner image/media");
  });
});
