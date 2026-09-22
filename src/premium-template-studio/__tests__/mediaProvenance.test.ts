import { describe, expect, it } from "vitest";
import { findReferenceStockImages, validateTemplate } from "../engine/TemplateValidator";
import type { BioTemplateConfig } from "../types";

function configWithBanner(bannerImage?: Record<string, unknown>): BioTemplateConfig {
  return {
    schemaVersion: 1,
    pageInstanceId: "page-test",
    templateDefinitionId: "test",
    metadata: {} as BioTemplateConfig["metadata"],
    theme: {
      colors: {},
      typography: {},
      background: {},
      cards: {},
      buttons: {},
      spacing: {},
    } as BioTemplateConfig["theme"],
    layout: { responsive: {} } as BioTemplateConfig["layout"],
    profile: { name: "Test" } as BioTemplateConfig["profile"],
    blocks: [
      {
        id: "hero",
        type: "hero",
        content: { bannerImage },
        visibility: {},
      } as BioTemplateConfig["blocks"][number],
    ],
    seo: { title: "Test" } as BioTemplateConfig["seo"],
    settings: {} as BioTemplateConfig["settings"],
  };
}

describe("canonical media provenance", () => {
  it("finds reference product images before publish", () => {
    const config = configWithBanner();
    config.blocks.push({
      id: "products",
      type: "productGrid",
      variant: "catalog-premium-card-v1",
      style: {},
      layout: { columns: 3 },
      visibility: { desktop: true, tablet: true, mobile: true },
      interaction: {},
      content: {
        products: [
          {
            id: "p1",
            title: "Reference",
            imageUrl: "https://images.unsplash.com/example",
            imageProvenance: { origin: "reference_stock", provider: "unsplash" },
          },
          {
            id: "p2",
            title: "Owner",
            imageUrl: "https://cdn.example/owner.jpg",
            imageProvenance: { origin: "owner" },
          },
        ],
      },
    });
    expect(findReferenceStockImages(config)).toEqual(["blocks[1].content.products[0].imageUrl"]);
  });

  it("keeps legacy media valid when provenance is absent", () => {
    expect(
      validateTemplate(configWithBanner({ url: "https://cdn.example/legacy.jpg" })).valid,
    ).toBe(true);
  });

  it.each([
    [{ origin: "owner" }],
    [
      {
        origin: "reference_stock",
        provider: "unsplash",
        providerAssetId: "u-1",
        sourcePageUrl: "https://unsplash.com/photos/u-1",
        creatorName: "Ada",
      },
    ],
    [
      {
        origin: "reference_stock",
        provider: "pexels",
        providerAssetId: "p-1",
        sourcePageUrl: "https://pexels.com/photo/p-1",
        creatorName: "Ada",
      },
    ],
  ])("accepts supported provenance: %j", (provenance) => {
    expect(
      validateTemplate(configWithBanner({ url: "https://cdn.example/media.jpg", provenance }))
        .valid,
    ).toBe(true);
  });

  it("rejects stock provenance without a supported provider", () => {
    const result = validateTemplate(
      configWithBanner({
        url: "https://cdn.example/media.jpg",
        provenance: { origin: "reference_stock" },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path.endsWith("provenance.provider"))).toBe(true);
  });

  it("rejects provider metadata on owner media", () => {
    const result = validateTemplate(
      configWithBanner({
        url: "https://cdn.example/media.jpg",
        provenance: { origin: "owner", provider: "pexels" },
      }),
    );
    expect(result.valid).toBe(false);
  });
});
