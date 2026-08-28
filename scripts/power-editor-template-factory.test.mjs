import { describe, expect, it } from "vitest";
import {
  auditTemplates,
  createTemplatePack,
  fingerprint,
} from "./power-editor-template-factory.mjs";

describe("power editor template factory", () => {
  const pack = createTemplatePack();

  it("genera doce recetas con firmas estructurales realmente distintas", () => {
    const audit = auditTemplates(pack.templates);
    expect(audit.templateCount).toBe(12);
    expect(audit.distinctFingerprints).toBe(12);
    expect(audit.duplicateFingerprints).toBe(0);
    expect(audit.minFeatureDistance).toBeGreaterThanOrEqual(3);
    expect(audit.diversity.macroDistinct).toBe(12);
    expect(audit.diversity.maxPerceptualSimilarity).toBeLessThan(.72);
    expect(audit.pass).toBe(true);
    expect(new Set(pack.templates.map(fingerprint)).size).toBe(pack.templates.length);
  });

  it("cubre todos los tipos de bloque que el generador declara como renderizables", () => {
    const audit = auditTemplates(pack.templates);
    expect(audit.coverage).toHaveLength(25);
    expect(audit.missingBlockTypes).toEqual([]);
  });

  it("crea doce heroes premium con banner activo, avatar real y CTAs de una/dos columnas", () => {
    const pages = pack.templates.map((template) => template.page_config);
    expect(
      pages.every((page) => {
        const banner = page.blocks.find((block) => block.type === "banner");
        return Boolean(banner?.enabled && banner.props.imageUrl?.startsWith("/power-editor-samples/banner-"));
      }),
    ).toBe(true);
    expect(
      pages.every((page) => {
        const profile = page.blocks.find((block) => block.type === "profile");
        return Boolean(profile?.props.avatarUrl?.startsWith("/power-editor-samples/avatar-"));
      }),
    ).toBe(true);
    expect(
      pages.some((page) => page.blocks.find((block) => block.type === "links")?.props.layout === 1),
    ).toBe(true);
    expect(
      pages.some((page) => page.blocks.find((block) => block.type === "links")?.props.layout === 2),
    ).toBe(true);
  });

  it("rechaza recetas premium visualmente pobres", () => {
    const audit = auditTemplates(pack.templates);
    expect(audit.weakPremiumTemplates).toEqual([]);
    expect(
      audit.quality.every((item) =>
        item.hasHeroBanner &&
        item.hasAvatarImage &&
        item.firstBlockType === "banner" &&
        item.buttonVariants >= 2 &&
        item.premiumBlocks >= 4 &&
        item.visualAssets >= 3 &&
        item.styleSignals >= 2,
      ),
    ).toBe(true);
  });

  it("produce árboles V6 no equivalentes y evita aprobar un espinazo vertical común", () => {
    const pages = pack.templates.map((template) => template.page_config);
    expect(pages.every((page) => page.version === 6 && page.composition?.kind === "root")).toBe(true);
    expect(new Set(pages.map((page) => JSON.stringify(page.composition))).size).toBe(pages.length);
    expect(pack.audit.diversity.commonVerticalSpineTemplates.length).toBeLessThan(pages.length);
    expect(pack.audit.diversity.pairwise.some((pair) => pair.macroSimilarity === 0)).toBe(true);
  });

  it("no reutiliza medios entre los banners activos ni entre los avatares fotográficos", () => {
    const pages = pack.templates.map((template) => template.page_config);
    const bannerUrls = pages
      .map((page) => page.blocks.find((block) => block.type === "banner"))
      .filter((block) => block?.enabled)
      .map((block) => block.props.imageUrl);
    const avatarUrls = pages
      .map((page) => page.blocks.find((block) => block.type === "profile")?.props.avatarUrl)
      .filter(Boolean);
    expect(new Set(bannerUrls).size).toBe(bannerUrls.length);
    expect(new Set(avatarUrls).size).toBe(avatarUrls.length);
  });

  it("no fabrica testimonios ni valoraciones en el bloque de reseñas", () => {
    const reviewBlocks = pack.templates.flatMap((template) =>
      template.page_config.blocks.filter((block) => block.type === "reviews"),
    );
    expect(reviewBlocks.length).toBeGreaterThan(0);
    expect(
      reviewBlocks.every(
        (block) => Array.isArray(block.props.items) && block.props.items.length === 0,
      ),
    ).toBe(true);
  });
});
