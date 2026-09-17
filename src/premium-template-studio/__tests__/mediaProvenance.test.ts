import { describe, expect, it } from "vitest";
import { validateTemplate } from "../engine/TemplateValidator";
import type { BioTemplateConfig } from "../types";

function configWithBanner(bannerImage?: Record<string, unknown>): BioTemplateConfig {
  return {
    schemaVersion: 1,
    pageInstanceId: "page-test",
    templateDefinitionId: "test",
    metadata: {} as BioTemplateConfig["metadata"],
    theme: { colors: {}, typography: {}, background: {}, cards: {}, buttons: {}, spacing: {} } as BioTemplateConfig["theme"],
    layout: { responsive: {} } as BioTemplateConfig["layout"],
    profile: { name: "Test" } as BioTemplateConfig["profile"],
    blocks: [{ id: "hero", type: "hero", content: { bannerImage }, visibility: {} } as BioTemplateConfig["blocks"][number]],
    seo: { title: "Test" } as BioTemplateConfig["seo"],
    settings: {} as BioTemplateConfig["settings"],
  };
}

describe("canonical media provenance", () => {
  it("keeps legacy media valid when provenance is absent", () => {
    expect(validateTemplate(configWithBanner({ url: "https://cdn.example/legacy.jpg" })).valid).toBe(true);
  });

  it.each([
    [{ origin: "owner" }],
    [{ origin: "contextual_stock", provider: "unsplash", providerAssetId: "u-1", sourcePageUrl: "https://unsplash.com/photos/u-1", creatorName: "Ada" }],
    [{ origin: "contextual_stock", provider: "pexels", providerAssetId: "p-1", sourcePageUrl: "https://pexels.com/photo/p-1", creatorName: "Ada" }],
  ])("accepts supported provenance: %j", (provenance) => {
    expect(validateTemplate(configWithBanner({ url: "https://cdn.example/media.jpg", provenance })).valid).toBe(true);
  });

  it("rejects stock provenance without a supported provider", () => {
    const result = validateTemplate(configWithBanner({ url: "https://cdn.example/media.jpg", provenance: { origin: "contextual_stock" } }));
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path.endsWith("provenance.provider"))).toBe(true);
  });

  it("rejects provider metadata on owner media", () => {
    const result = validateTemplate(configWithBanner({ url: "https://cdn.example/media.jpg", provenance: { origin: "owner", provider: "pexels" } }));
    expect(result.valid).toBe(false);
  });
});
