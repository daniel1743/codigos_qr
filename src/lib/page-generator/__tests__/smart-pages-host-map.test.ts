import { describe, expect, it } from "vitest";

import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { emptyNormalizedContent, type NormalizedContentV1 } from "@/lib/smart-pages/catalog.types";
import { generatePagePlan } from "@/lib/smart-pages/page-orchestrator";
import type { PageGenerationRequest } from "@/lib/smart-pages/smart-pages.types";
import { generateSmartPageWithEngineV2, mapSmartPageToEngineInput } from "../smart-pages-host-map";

const NOW = "2026-09-15T12:00:00.000Z";

function content(name: string, businessType: string): NormalizedContentV1 {
  return {
    ...emptyNormalizedContent(name),
    business: { ...emptyNormalizedContent(name).business, businessType },
  };
}

function request(source: NormalizedContentV1): PageGenerationRequest {
  return {
    version: "1",
    businessType: source.business.businessType,
    goal: "contact",
    density: "balanced",
    salesMode: "contact",
    primaryAction: { kind: "contact", label: "Contactar", enabled: false },
    secondaryActions: [],
    content: source,
  };
}

function baseRequest(source: NormalizedContentV1, goal: PageGenerationRequest["goal"] = "contact") {
  return { ...request(source), goal };
}

describe("SMART_PAGES_3 host mapping", () => {
  it("maps services through the existing PAGES_7 adapter and preserves owner facts", () => {
    const source = content("Barbería Norte", "barbería");
    source.catalogs = [
      {
        id: "services-1",
        kind: "services",
        categories: [],
        items: [
          {
            id: "service-1",
            type: "service",
            name: "Corte clásico",
            description: "Máquina y tijera",
            price: { label: "$8.000" },
            media: [],
            attributes: [],
            salesMode: "contact",
            featured: false,
            enabled: true,
            confidence: 1,
            review: [],
          },
        ],
      },
    ];
    source.contact.whatsapp = "+56912345678";
    const input = baseRequest(source);
    input.primaryAction = {
      kind: "whatsapp",
      label: "WhatsApp",
      target: "+56912345678",
      enabled: true,
    };
    const mapped = mapSmartPageToEngineInput(input, { now: NOW });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.adapter.engineInput.content?.name).toBe("Barbería Norte");
    expect(mapped.adapter.contentBlocks?.services?.[0]).toMatchObject({
      title: "Corte clásico",
      price: "$8.000",
    });
    expect(mapped.adapter.engineInput.primaryAction).toEqual({
      type: "whatsapp",
      value: "+56912345678",
    });
  });

  it.each(["catalog", "portfolio", "menu"] as const)("maps %s owner content", (kind) => {
    const source = content("Negocio Norte", kind);
    if (kind === "catalog" || kind === "portfolio") {
      source.business.cover = {
        id: "cover-1",
        url: "https://cdn.example/cover.jpg",
        alt: "Portada",
        kind: "image",
      };
    }
    source.catalogs = [
      {
        id: `${kind}-1`,
        kind,
        categories: [],
        items: [
          {
            id: "item-1",
            type:
              kind === "portfolio" ? "portfolio_item" : kind === "menu" ? "menu_item" : "product",
            name: "Elemento real",
            price: { label: "$10.000" },
            media: [
              {
                id: "media-1",
                url: "https://cdn.example/item.jpg",
                alt: "Elemento",
                kind: "image",
              },
            ],
            attributes:
              kind === "portfolio"
                ? [{ key: "url", label: "URL", value: "https://owner.example/work" }]
                : [],
            salesMode: "info",
            featured: true,
            enabled: true,
            confidence: 1,
            review: [],
          },
        ],
      },
    ];
    const mapped = mapSmartPageToEngineInput(baseRequest(source), { now: NOW });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.generatedPageInput.items[0]?.title).toBe("Elemento real");
    expect(mapped.generatedPageInput.items[0]?.imageUrl).toBe("https://cdn.example/item.jpg");
    const generated = generateSmartPageWithEngineV2(baseRequest(source), { now: NOW });
    expect(generated.ok).toBe(true);
    if (generated.ok) expect(validateTemplate(generated.result.editorConfig).valid).toBe(true);
  });

  it("does not invent a catalog image or silently create a listings page", () => {
    const source = content("Tienda Norte", "real estate");
    source.catalogs = [{ id: "listings-1", kind: "listings", categories: [], items: [] }];
    const listingRequest = baseRequest(source);
    listingRequest.preferences = { experienceType: "listings" };
    const listing = mapSmartPageToEngineInput(listingRequest, { now: NOW });
    expect(listing.ok).toBe(false);
    if (!listing.ok)
      expect(listing.diagnostics.unsupportedFields).toContain("experienceType=listings");

    const catalog = content("Tienda Norte", "retail");
    catalog.catalogs = [
      {
        id: "catalog-1",
        kind: "catalog",
        categories: [],
        items: [
          {
            id: "p1",
            type: "product",
            name: "Producto real",
            media: [],
            attributes: [],
            salesMode: "info",
            featured: false,
            enabled: true,
            confidence: 1,
            review: [],
          },
        ],
      },
    ];
    const plan = generatePagePlan({
      ...baseRequest(catalog),
      preferences: { experienceType: "catalog" },
    });
    const result = mapSmartPageToEngineInput(
      { ...baseRequest(catalog), preferences: { experienceType: "catalog" } },
      { now: NOW },
      plan,
    );
    expect(result.ok).toBe(false);
  });

  it("runs exactly one host generation boundary and validates BioTemplateConfig", () => {
    const source = content("Estudio Norte", "fotografía");
    source.catalogs = [
      {
        id: "services-1",
        kind: "services",
        categories: [],
        items: [
          {
            id: "s1",
            type: "service",
            name: "Sesión fotográfica",
            media: [],
            attributes: [],
            salesMode: "info",
            featured: false,
            enabled: true,
            confidence: 1,
            review: [],
          },
        ],
      },
    ];
    const input = baseRequest(source);
    input.primaryAction = {
      kind: "external_url",
      label: "Sitio web",
      target: "https://estudio.example/contacto",
      enabled: true,
    };
    const result = generateSmartPageWithEngineV2(input, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(validateTemplate(result.result.editorConfig).valid).toBe(true);
    expect(result.result.canonicalEnvelope.editorConfig).toEqual(result.result.editorConfig);
  });
});
