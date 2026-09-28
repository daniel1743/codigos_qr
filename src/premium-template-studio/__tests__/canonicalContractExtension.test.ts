import { describe, expect, it } from "vitest";
import {
  DEFAULT_ELEMENT_CONTRACT,
  DEFAULT_MEDIA_TREATMENT,
  type BioTemplateConfig,
} from "../types";
import {
  normalizeCanonicalConfig,
  parseTemplateJson,
  validateTemplate,
} from "../engine/TemplateValidator";
import { canRemoveCripqerBranding } from "../../lib/product-entitlements/mutation-guard";
import { createInitialState, templateReducer } from "../state/templateReducer";
import { createDemoConfig } from "../templates/definitions";
import { renderToStaticMarkup } from "react-dom/server";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import React from "react";
import { createBlock } from "../constants/blockDefinitions";

function demoHeroConfig() {
  const config = createDemoConfig();
  const block = config.blocks.find((candidate) => candidate.type === "hero") ?? createBlock("hero");
  if (!config.blocks.includes(block)) config.blocks.unshift(block);
  return { config, block };
}

function legacyConfig(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    pageInstanceId: "legacy-page",
    templateDefinitionId: "legacy-template",
    metadata: {},
    theme: { colors: {}, typography: {} },
    layout: { responsive: {} },
    profile: { name: "Legacy" },
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        variant: "centered",
        content: {
          bannerImage: { url: "https://cdn.example/legacy.jpg" },
          products: [{ id: "product-1", title: "Producto", price: "$10", ctaLabel: "Comprar" }],
        },
        style: {},
        layout: {},
        visibility: { desktop: true, tablet: true, mobile: true },
        interaction: {},
      },
    ],
    seo: { title: "Legacy", description: "", index: true },
    settings: { showBranding: true, slug: "legacy", animation: "none", language: "es" },
  };
}

describe("L0 canonical contract extension", () => {
  it("normalizes legacy documents with safe element and media defaults", () => {
    const normalized = normalizeCanonicalConfig(legacyConfig()) as unknown as BioTemplateConfig;
    const block = normalized.blocks[0]!;
    const banner = block.content.bannerImage!;
    const product = block.content.products![0]!;

    expect(block.element).toEqual(DEFAULT_ELEMENT_CONTRACT);
    expect(banner).toMatchObject(DEFAULT_MEDIA_TREATMENT);
    expect(product.element).toEqual(DEFAULT_ELEMENT_CONTRACT);
    expect(product.priceElement).toEqual(DEFAULT_ELEMENT_CONTRACT);
    expect(product.ctaElement).toEqual(DEFAULT_ELEMENT_CONTRACT);
  });

  it("accepts the new contract fields without changing public behavior by default", () => {
    const config = legacyConfig() as unknown as BioTemplateConfig;
    config.blocks[0]!.style.fusion = "fade";
    config.blocks[0]!.content.bannerImage = {
      url: "https://cdn.example/new.jpg",
      cropX: 20,
      cropY: 80,
      zoom: 1.4,
      overlay: "soft",
      overlayColor: "#000000",
    };
    config.blocks[0]!.content.avatar = { shape: "arch" };
    config.blocks[0]!.content.primaryCTA = {
      label: "Ver más",
      element: { optional: true, visible: true, protected: false },
    };

    const result = validateTemplate(config);
    expect(result.valid).toBe(true);
    expect(JSON.parse(JSON.stringify(config)).blocks[0].content.bannerImage.zoom).toBe(1.4);
  });

  it("rejects unsafe media ranges and unknown fusion values", () => {
    const config = legacyConfig() as unknown as BioTemplateConfig;
    config.blocks[0]!.style.fusion = "unknown" as never;
    config.blocks[0]!.content.bannerImage = { cropX: 101, zoom: 0 };

    const result = validateTemplate(config);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        "blocks[0].content.bannerImage.cropX",
        "blocks[0].content.bannerImage.zoom",
        "blocks[0].style.fusion",
      ]),
    );
  });

  it("round-trips normalized contracts through JSON parsing", () => {
    const parsed = parseTemplateJson(JSON.stringify(legacyConfig()));
    expect(parsed.result.valid).toBe(true);
    expect(parsed.config?.blocks[0]?.content.bannerImage).toMatchObject(DEFAULT_MEDIA_TREATMENT);
    expect(parsed.config?.blocks[0]?.element).toEqual(DEFAULT_ELEMENT_CONTRACT);
  });

  it("normalizes avatar media treatments without changing legacy avatar defaults", () => {
    const legacy = legacyConfig();
    (legacy.profile as Record<string, unknown>).avatar = {
      size: 96,
      radius: 9999,
      borderWidth: 2,
      shadow: false,
      overlap: 20,
      align: "center",
    };
    const normalized = normalizeCanonicalConfig(legacy) as unknown as BioTemplateConfig;
    expect(normalized.profile.avatar.media).toBeUndefined();

    const withMedia = structuredClone(legacy);
    ((withMedia.profile as Record<string, unknown>).avatar as Record<string, unknown>).media = {
      cropX: 12,
      cropY: 84,
      zoom: 1.8,
      overlay: "soft",
      overlayColor: "#222222",
    };
    const roundTrip = parseTemplateJson(JSON.stringify(withMedia));
    expect(roundTrip.result.valid).toBe(true);
    expect(roundTrip.config?.profile.avatar.media).toMatchObject({
      cropX: 12,
      cropY: 84,
      zoom: 1.8,
      overlay: "soft",
    });
  });

  it("renders canonical media treatment and every hero fusion mode in editor and public", () => {
    const { config, block } = demoHeroConfig();
    block.variant = "centered";
    block.content.bannerImage = {
      url: "https://cdn.example/hero.jpg",
      cropX: 18,
      cropY: 82,
      zoom: 1.4,
      overlay: "medium",
      overlayColor: "#0b1020",
    };
    for (const fusion of ["none", "fade", "halo", "organic", "dominant"] as const) {
      block.style.fusion = fusion;
      const publicMarkup = renderToStaticMarkup(
        React.createElement(TemplateRenderer, {
          config,
          mode: "public",
          breakpoint: "desktop",
          brandingTier: "pro",
        }),
      );
      const editorMarkup = renderToStaticMarkup(
        React.createElement(TemplateRenderer, {
          config,
          mode: "edit",
          breakpoint: "desktop",
          brandingTier: "pro",
        }),
      );
      expect(publicMarkup).toContain("scale(1.4)");
      expect(editorMarkup).toContain("scale(1.4)");
      if (fusion === "fade") expect(publicMarkup).toContain("linear-gradient");
      if (fusion === "halo") expect(publicMarkup).toContain("box-shadow");
      if (fusion === "organic") expect(publicMarkup).toContain("32px 18px 32px 18px");
    }
  });

  it("accepts arch avatars while retaining legacy profile shape semantics", () => {
    const { config, block } = demoHeroConfig();
    block.content.avatar = { url: "https://cdn.example/avatar.jpg", shape: "arch" };
    config.profile.avatar.shape = "arch";
    const markup = renderToStaticMarkup(
      React.createElement(TemplateRenderer, {
        config,
        mode: "public",
        breakpoint: "mobile",
        brandingTier: "pro",
      }),
    );
    expect(markup).toContain("50% 50% 18% 18% / 45% 45% 22% 22%");
    expect(validateTemplate(config).valid).toBe(true);
  });

  it("persists media and fusion changes through the canonical reducer history", () => {
    const { config, block } = demoHeroConfig();
    let state = createInitialState(config);
    state = templateReducer(state, {
      type: "patchBlockField",
      id: block.id,
      path: "content.bannerImage",
      value: {
        url: "https://cdn.example/persisted.jpg",
        cropX: 24,
        cropY: 76,
        zoom: 1.6,
        overlay: "intense",
        overlayColor: "#101010",
      },
    });
    state = templateReducer(state, {
      type: "patchBlockField",
      id: block.id,
      path: "style.fusion",
      value: "halo",
    });
    const roundTrip = JSON.parse(JSON.stringify(state.config)) as BioTemplateConfig;
    expect(
      roundTrip.blocks.find((candidate) => candidate.id === block.id)?.content.bannerImage,
    ).toMatchObject({
      cropX: 24,
      cropY: 76,
      zoom: 1.6,
      overlay: "intense",
    });
    expect(roundTrip.blocks.find((candidate) => candidate.id === block.id)?.style.fusion).toBe(
      "halo",
    );
    const afterFusionUndo = templateReducer(state, { type: "undo" });
    expect(afterFusionUndo.config.blocks[0]?.style.fusion).not.toBe("halo");
    expect(afterFusionUndo.config.blocks[0]?.content.bannerImage?.zoom).toBe(1.6);
    const afterMediaUndo = templateReducer(afterFusionUndo, { type: "undo" });
    expect(afterMediaUndo.config.blocks[0]?.content.bannerImage?.zoom).not.toBe(1.6);
  });

  it("keeps branding entitlement protection independent from the new metadata", () => {
    expect(canRemoveCripqerBranding("free")).toBe(false);
    expect(canRemoveCripqerBranding("pro")).toBe(true);
  });

  it("removes, undoes and redoes an optional canonical element", () => {
    const { config, block } = demoHeroConfig();
    block.content.description = "L1 optional description";
    let state = createInitialState(config);

    state = templateReducer(state, {
      type: "setElementVisibility",
      id: block.id,
      path: "content.descriptionElement",
      visible: false,
    });
    expect(
      state.config.blocks.find((candidate) => candidate.id === block.id)?.content
        .descriptionElement,
    ).toMatchObject({ optional: true, visible: false });

    state = templateReducer(state, { type: "undo" });
    expect(
      state.config.blocks.find((candidate) => candidate.id === block.id)?.content
        .descriptionElement,
    ).toBeUndefined();

    state = templateReducer(state, { type: "redo" });
    expect(
      state.config.blocks.find((candidate) => candidate.id === block.id)?.content
        .descriptionElement,
    ).toMatchObject({ visible: false });
  });

  it("keeps protected elements visible and removes no structural block", () => {
    const { config, block } = demoHeroConfig();
    block.content.description = "Protected description";
    block.content.descriptionElement = { optional: true, protected: true };
    const state = templateReducer(createInitialState(config), {
      type: "setElementVisibility",
      id: block.id,
      path: "content.descriptionElement",
      visible: false,
    });
    expect(state.config.blocks).toHaveLength(config.blocks.length);
    expect(
      state.config.blocks.find((candidate) => candidate.id === block.id)?.content
        .descriptionElement,
    ).toEqual({ optional: true, protected: true });
  });

  it("applies the same visibility result in editor and public render modes", () => {
    const { config, block } = demoHeroConfig();
    block.content.description = "L1_RENDER_VISIBILITY";
    block.content.descriptionElement = { optional: true, visible: false };
    const publicMarkup = renderToStaticMarkup(
      React.createElement(TemplateRenderer, {
        config,
        mode: "public",
        breakpoint: "desktop",
        brandingTier: "pro",
      }),
    );
    const editorMarkup = renderToStaticMarkup(
      React.createElement(TemplateRenderer, {
        config,
        mode: "edit",
        breakpoint: "desktop",
        brandingTier: "pro",
      }),
    );
    expect(publicMarkup).not.toContain("L1_RENDER_VISIBILITY");
    expect(editorMarkup).not.toContain("L1_RENDER_VISIBILITY");
  });
});
