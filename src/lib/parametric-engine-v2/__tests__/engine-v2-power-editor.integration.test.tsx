import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  generatePowerEditorCandidates,
  isSafeUrl,
  normalizeContent,
  buildPowerEditorRecipeV2,
  resolvePowerEditorCapabilities,
  resolveMediaStrategy,
  resolveProfessionIcon,
  resolveSemanticActionIcon,
  selectStructurallyDiverseCandidates,
  structuralSignatureV2,
  TOP_SIGNATURES_V2,
  toBioTemplateConfig,
  type ContentProductV2,
  type RecipeSemanticsV2,
} from "../power-editor";
import { normalizeIntent } from "../normalize";
import { buildDesignProfile } from "../strategy";
import { FONT_TOKENS } from "../types";
import { resolveTypography } from "../power-editor/resolvers";
import { planBlocks } from "../power-editor/blocks-v2";
import { PLAYGROUND_CASES } from "../power-editor/playground-cases";
import { EngineV2PowerEditorPlayground } from "../integration/EngineV2PowerEditorPlayground";
import {
  buildEngineV2PlaygroundPreviews,
  buildVisualQaScenarioPreviews,
} from "../integration/playground-model";
import { VISUAL_QA_CASES } from "../integration/visualQaCases";
import { PublicTemplateRenderer } from "@/premium-template-studio/engine/PublicTemplateRenderer";
import { REGISTERED_BLOCK_TYPES } from "@/premium-template-studio/engine/BlockRegistry";
import { getBlockDefinition } from "@/premium-template-studio/constants/blockDefinitions";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import type { BioTemplateConfig } from "@/premium-template-studio/types";
import { runEngineHardeningCheck, runEngineSelfCheck, runEngineSelfCheckV15 } from "../index";

const NOW = "2026-01-01T00:00:00.000Z";
const capabilities = resolvePowerEditorCapabilities();
const baseCandidate = generatePowerEditorCandidates(PLAYGROUND_CASES[0]!.intent, {
  content: PLAYGROUND_CASES[0]!.content,
  count: 1,
  now: NOW,
})[0]!;
const heroOff = {
  enabled: false,
  name: "",
  profession: "",
  bio: "",
  avatarUrl: null,
  bannerUrl: null,
  verified: false,
};

function semantics(
  family: RecipeSemanticsV2["family"],
  pattern: RecipeSemanticsV2["pattern"],
  overrides: Partial<RecipeSemanticsV2> = {},
): RecipeSemanticsV2 {
  return {
    ...baseCandidate.recipe.semantics,
    family,
    pattern,
    ...overrides,
  };
}

function links(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    label: `Action ${index + 1}`,
    url: `https://example.com/action-${index + 1}`,
  }));
}

function plannedLinks(count: number) {
  return planBlocks(
    baseCandidate.recipe.source_recipe,
    semantics("corporate", "compact_action"),
    { links: links(count) },
    capabilities,
    1,
    heroOff,
  ).find((block) => block.type === "buttonGroup");
}

function recipeWithMediaStrategy(
  mediaStrategy: "banner-first" | "immersive-background",
  banner: string | null,
) {
  const source = baseCandidate.recipe.source_recipe;
  const recipe = {
    ...source,
    identity: { ...source.identity, banner },
  };
  return buildPowerEditorRecipeV2({
    recipe,
    profile: buildDesignProfile(
      normalizeIntent(PLAYGROUND_CASES[0]!.intent),
      0,
      baseCandidate.recipe.semantics.family,
    ),
    pattern: baseCandidate.recipe.semantics.pattern,
    score: baseCandidate.recipe.meta.quality,
    content: PLAYGROUND_CASES[0]!.content,
    candidateId: `banner-mapping-${mediaStrategy}-${banner ? "asset" : "none"}`,
    mediaStrategy,
  });
}

describe("Engine V2 -> frozen Power Editor integration", () => {
  it("generates 12 valid configs and renders all through the current public renderer", () => {
    const previews = buildEngineV2PlaygroundPreviews();

    expect(previews).toHaveLength(12);
    for (const preview of previews) {
      expect(validateTemplate(preview.candidate.config).valid).toBe(true);
      expect(preview.candidate.config.blocks.length).toBeGreaterThan(0);
      expect(
        preview.candidate.recipe.structure.blocks.every((block) =>
          REGISTERED_BLOCK_TYPES.includes(block.type),
        ),
      ).toBe(true);
      expect(
        preview.candidate.recipe.structure.blocks.every((block) => {
          const definition = getBlockDefinition(block.type);
          return definition ? definition.variants.includes(block.variant) : false;
        }),
      ).toBe(true);

      const markup = renderToStaticMarkup(
        React.createElement(PublicTemplateRenderer, {
          config: preview.candidate.config,
          breakpoint: "desktop",
        }),
      );
      expect(markup.length).toBeGreaterThan(0);
    }
  });

  it("exposes the isolated playground as 12 real renderer previews", () => {
    const markup = renderToStaticMarkup(React.createElement(EngineV2PowerEditorPlayground));
    expect((markup.match(/data-testid="engine-v2-visual-candidate"/g) ?? []).length).toBe(12);
    expect(markup).toContain("Luxury Beauty");
    expect(markup).toContain("Creator Premium");
    expect(markup).toContain("Executive Consultant");
  }, 15_000);

  it("provides 12 distinct candidates for every visual QA scenario", () => {
    for (const scenario of VISUAL_QA_CASES) {
      const previews = buildVisualQaScenarioPreviews({ scenarioId: scenario.id });
      expect(previews).toHaveLength(12);
      expect(new Set(previews.map((preview) => preview.fingerprint)).size).toBe(12);
    }
  });

  it("keeps rich-media candidates meaningfully structurally diverse", () => {
    const previews = buildVisualQaScenarioPreviews({
      scenarioId: "creator-premium",
      candidateCount: 12,
    });
    const strictSelection = selectStructurallyDiverseCandidates(
      previews.map((preview) => preview.candidate),
      12,
    );
    const compositionKeys = strictSelection.map(
      (candidate) => structuralSignatureV2(candidate).topSignature,
    );
    const counts = new Map<string, number>();
    for (const key of compositionKeys) counts.set(key, (counts.get(key) ?? 0) + 1);

    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    expect(
      previews.every((preview) =>
        TOP_SIGNATURES_V2.includes(preview.candidate.recipe.semantics.top_signature),
      ),
    ).toBe(true);
    expect(new Set(previews.map((preview) => preview.candidate.recipe.semantics.media_strategy)).size)
      .toBeGreaterThanOrEqual(5);
    expect(previews.some((preview) => preview.candidate.recipe.visual.background.type === "image")).toBe(true);
    expect(
      previews.some((preview) =>
        preview.candidate.recipe.structure.blocks.some((block) => block.type === "gallery"),
      ),
    ).toBe(true);
    expect(
      previews.some((preview) =>
        preview.candidate.recipe.structure.blocks.some((block) => block.type === "video"),
      ),
    ).toBe(true);
    expect(
      previews.some((preview) =>
        preview.candidate.recipe.structure.blocks.some(
          (block) =>
            block.type === "links" &&
            block.content.items?.some((item) => item.presentation === "media-card"),
        ),
      ),
    ).toBe(true);
  });

  it("resolves media strategy deterministically and falls back without assets", () => {
    const input = {
      family: "creator" as const,
      candidateId: "qa-seed-17",
      avatarUrl: null,
      bannerUrl: null,
      content: {},
    };
    expect(resolveMediaStrategy(input)).toBe("minimal-no-media");
    expect(resolveMediaStrategy(input)).toBe(resolveMediaStrategy(input));

    const clean = normalizeContent({
      links: [
        {
          label: "Unsafe image",
          url: "https://example.com/link",
          imageUrl: "javascript:alert(1)",
        },
      ],
      mediaCard: {
        title: "Unsafe card",
        imageUrl: "data:image/png;base64,not-a-fixture",
      },
    });
    expect(clean.links?.[0]?.imageUrl).toBeUndefined();
    expect(clean.mediaCard).toBeUndefined();
    expect(isSafeUrl(clean.links?.[0]?.url)).toBe(true);
    expect(JSON.stringify(clean)).not.toContain("javascript:");
    expect(JSON.stringify(clean)).not.toContain("data:image");
  });

  it("maps banner-first to the canonical profile banner when an asset exists", () => {
    const banner = baseCandidate.recipe.source_recipe.identity.banner;
    expect(banner).toEqual(expect.any(String));
    if (!banner) throw new Error("Expected the fixture to provide a banner asset");
    const recipe = recipeWithMediaStrategy("banner-first", banner);
    const config = toBioTemplateConfig(recipe);

    expect(recipe.banner.enabled).toBe(true);
    expect(config.profile.banner.enabled).toBe(true);
    expect(config.profile.banner.imageUrl).toBe(banner);
    const markup = renderToStaticMarkup(
      React.createElement(PublicTemplateRenderer, { config, breakpoint: "desktop" }),
    );
    expect(markup).toContain(`src="${banner.replaceAll("&", "&amp;")}"`);
    expect(markup).toContain("object-position:50% 50%");
  });

  it("does not fabricate a banner when banner-first has no asset", () => {
    const recipe = recipeWithMediaStrategy("banner-first", null);
    const config = toBioTemplateConfig(recipe);

    expect(recipe.banner.enabled).toBe(false);
    expect(config.profile.banner.enabled).toBe(false);
    expect(config.profile.banner.imageUrl).toBeUndefined();
    const markup = renderToStaticMarkup(
      React.createElement(PublicTemplateRenderer, { config, breakpoint: "desktop" }),
    );
    expect(markup).not.toContain('alt="" loading="lazy"');
  });

  it("does not enable a banner for a whitespace-only asset", () => {
    const recipe = recipeWithMediaStrategy("banner-first", "   ");
    const config = toBioTemplateConfig(recipe);

    expect(recipe.banner.enabled).toBe(false);
    expect(config.profile.banner.enabled).toBe(false);
    expect(config.profile.banner.imageUrl).toBeUndefined();
  });

  it("keeps immersive background independent while preserving allowed banner coexistence", () => {
    const banner = baseCandidate.recipe.source_recipe.identity.banner;
    const recipe = recipeWithMediaStrategy("immersive-background", banner);
    const config = toBioTemplateConfig(recipe);

    expect(config.theme.background.type).toBe("image");
    expect(config.theme.background.imageUrl).toBe(banner);
    expect(config.profile.banner.enabled).toBe(true);
    expect(config.profile.banner.imageUrl).toBe(banner);
    expect(config.blocks.some((block) => block.type === "hero")).toBe(false);
  });

  it("keeps deterministic buttonGroup columns for 2, 4 and 6 actions", () => {
    expect(plannedLinks(2)?.layout.columns).toBe(2);
    expect(plannedLinks(4)?.layout.columns).toBe(2);
    expect(plannedLinks(6)?.layout.columns).toBe(2);
    expect(plannedLinks(3)?.layout.columns).toBe(1);
  });

  it("emits 75/25 media cards with safe image fallback", () => {
    const media = planBlocks(
      baseCandidate.recipe.source_recipe,
      semantics("creator", "portfolio_first", { media_weight: 70 }),
      {
        links: [
          {
            label: "Branding",
            url: "https://example.com/a",
            imageUrl: "https://example.com/a.jpg",
          },
          {
            label: "Editorial",
            url: "https://example.com/b",
            imageUrl: "https://example.com/b.jpg",
          },
        ],
      },
      capabilities,
      1,
      heroOff,
    ).find((block) => block.type === "links");

    expect(media?.content.items?.map((item) => item.presentation)).toEqual([
      "media-card",
      "media-card",
    ]);
    expect(media?.content.items?.map((item) => item.mediaPosition)).toEqual(["left", "right"]);

    const mediaConfig: BioTemplateConfig = {
      ...baseCandidate.config,
      blocks: baseCandidate.config.blocks.map((block) =>
        block.type === "links"
          ? {
              ...block,
              variant: "cards",
              content: {
                ...block.content,
                items: media?.content.items ?? [],
              },
            }
          : block,
      ),
    };
    const mediaMarkup = renderToStaticMarkup(
      React.createElement(PublicTemplateRenderer, {
        config: mediaConfig,
        breakpoint: "desktop",
      }),
    );
    expect(mediaMarkup).toContain('data-media-position="left"');
    expect(mediaMarkup).toContain('data-media-position="right"');
    expect(mediaMarkup).toContain("grid-template-columns:3fr 1fr");
    expect(mediaMarkup).toContain("grid-template-columns:1fr 3fr");

    const fallback = planBlocks(
      baseCandidate.recipe.source_recipe,
      semantics("creator", "portfolio_first", { media_weight: 70 }),
      { links: [{ label: "Blog", url: "https://example.com/blog" }] },
      capabilities,
      1,
      heroOff,
    ).find((block) => block.type === "links");
    expect(fallback?.content.items?.every((item) => item.presentation !== "media-card")).toBe(true);
  });

  it("generates a single image only when onboarding content supplies one", () => {
    const image = "https://example.com/editorial-image.jpg";
    const recipe = buildPowerEditorRecipeV2({
      recipe: baseCandidate.recipe.source_recipe,
      profile: buildDesignProfile(
        normalizeIntent(PLAYGROUND_CASES[0]!.intent),
        0,
        baseCandidate.recipe.semantics.family,
      ),
      pattern: "centered_profile",
      score: baseCandidate.recipe.meta.quality,
      content: { image: { url: image, alt: "Editorial image" } },
      candidateId: "single-image-p0",
      mediaStrategy: "profile-first",
    });
    const config = toBioTemplateConfig(recipe);
    const imageBlock = config.blocks.find((block) => block.type === "image");

    expect(imageBlock?.variant).toBe("framed");
    expect(imageBlock?.content.imageUrl).toBe(image);
    expect(validateTemplate(config).valid).toBe(true);

    const empty = buildPowerEditorRecipeV2({
      recipe: baseCandidate.recipe.source_recipe,
      profile: buildDesignProfile(
        normalizeIntent(PLAYGROUND_CASES[0]!.intent),
        0,
        baseCandidate.recipe.semantics.family,
      ),
      pattern: "centered_profile",
      score: baseCandidate.recipe.meta.quality,
      content: {},
      candidateId: "single-image-p0-empty",
      mediaStrategy: "minimal-no-media",
    });
    expect(empty.structure.blocks.some((block) => block.type === "image")).toBe(false);
  });

  it("uses the existing featuredMedia renderer path without duplicating featuredLink", () => {
    const recipe = buildPowerEditorRecipeV2({
      recipe: baseCandidate.recipe.source_recipe,
      profile: buildDesignProfile(
        normalizeIntent(PLAYGROUND_CASES[0]!.intent),
        0,
        baseCandidate.recipe.semantics.family,
      ),
      pattern: "media_story",
      score: baseCandidate.recipe.meta.quality,
      content: {
        featured: {
          title: "Featured story",
          subtitle: "A visual editorial feature",
          url: "https://example.com/featured",
          imageUrl: "https://example.com/featured.jpg",
        },
      },
      candidateId: "featured-media-p0",
      mediaStrategy: "immersive-background",
    });
    const featured = recipe.structure.blocks.filter((block) =>
      ["featuredMedia", "featuredLink"].includes(block.type),
    );

    expect(featured.map((block) => block.type)).toEqual(["featuredMedia"]);
    expect(featured[0]?.content.mediaType).toBe("image");
    expect(featured[0]?.content.imageUrl).toBeDefined();
  });

  it("selects singular product or productGrid according to supplied product count", () => {
    const makeRecipe = (products: ContentProductV2[]) =>
      buildPowerEditorRecipeV2({
        recipe: baseCandidate.recipe.source_recipe,
        profile: buildDesignProfile(
          normalizeIntent(PLAYGROUND_CASES[0]!.intent),
          0,
          baseCandidate.recipe.semantics.family,
        ),
        pattern: "conversion_first",
        score: baseCandidate.recipe.meta.quality,
        content: { products },
        candidateId: `products-${products?.length ?? 0}`,
        mediaStrategy: "profile-first",
      });
    const product = {
      title: "Signature plan",
      price: "180 €",
      imageUrl: "https://example.com/product.jpg",
      ctaLabel: "Comprar",
      ctaUrl: "https://example.com/buy",
    };

    const singular = makeRecipe([product]);
    expect(singular.structure.blocks.map((block) => block.type)).toContain("product");
    expect(singular.structure.blocks.map((block) => block.type)).not.toContain("productGrid");

    const grid = makeRecipe([product, { ...product, title: "Second plan" }]);
    expect(grid.structure.blocks.map((block) => block.type)).toContain("productGrid");
    expect(grid.structure.blocks.map((block) => block.type)).not.toContain("product");
  });

  it("emits existing per-block responsive overrides with mobile-safe spans", () => {
    const recipe = recipeWithMediaStrategy("banner-first", baseCandidate.recipe.source_recipe.identity.banner);
    const config = toBioTemplateConfig(recipe);

    expect(config.blocks.length).toBeGreaterThan(0);
    expect(config.blocks.every((block) => block.responsive?.mobile?.colSpan === 1)).toBe(true);
    expect(config.blocks.every((block) => block.responsive?.desktop?.colSpan)).toBe(true);
    expect(validateTemplate(config).valid).toBe(true);
  });

  it("uses deterministic semantic Lucide aliases without adding icons to every item", () => {
    expect(resolveSemanticActionIcon({ label: "WhatsApp", url: "https://wa.me/1" })).toBe("whatsapp");
    expect(resolveSemanticActionIcon({ label: "Reserva", url: "https://cal.com/demo" })).toBe("calendar");
    expect(resolveSemanticActionIcon({ label: "Contacto", url: "https://example.com/contacto" })).toBeUndefined();
    expect(resolveProfessionIcon("Manicurista", "luxury", 0)).toBe("sparkles");
    expect(resolveProfessionIcon("Manicurista", "luxury", 1)).toBeUndefined();
    expect(resolveProfessionIcon("Fitness trainer", "energetic", 0)).toBe("clock");

    const recipe = buildPowerEditorRecipeV2({
      recipe: baseCandidate.recipe.source_recipe,
      profile: buildDesignProfile(
        normalizeIntent(PLAYGROUND_CASES[0]!.intent),
        0,
        baseCandidate.recipe.semantics.family,
      ),
      pattern: "service_first",
      score: baseCandidate.recipe.meta.quality,
      content: {
        services: [
          { title: "Ritual facial" },
          { title: "Coloración" },
        ],
        quickActions: [{ label: "WhatsApp", url: "https://wa.me/1" }],
      },
      candidateId: "semantic-icons-p0",
      mediaStrategy: "profile-first",
    });
    const services = recipe.structure.blocks.find((block) => block.type === "services");
    const actions = recipe.structure.blocks.find((block) => block.type === "floatingActions");

    expect(services?.content.items?.map((item) => item.icon)).toEqual(["award", undefined]);
    expect(actions?.content.items?.[0]?.icon).toBe("whatsapp");
  });

  it("keeps banner treatment visible and resolves typography to distinct system stacks", () => {
    const bannerRecipe = recipeWithMediaStrategy(
      "banner-first",
      baseCandidate.recipe.source_recipe.identity.banner,
    );
    expect(bannerRecipe.banner.enabled).toBe(true);
    expect(bannerRecipe.banner.overlay).toBeLessThanOrEqual(0.4);
    expect(bannerRecipe.banner.blur).toBeLessThanOrEqual(2);

    const typographyValues = FONT_TOKENS.map((heading_family) =>
      resolveTypography(
        {
          ...baseCandidate.recipe.source_recipe,
          design: {
            ...baseCandidate.recipe.source_recipe.design,
            typography: {
              ...baseCandidate.recipe.source_recipe.design.typography,
              heading_family,
            },
          },
        },
        baseCandidate.recipe.semantics,
      ).headingFont,
    );

    expect(new Set(typographyValues).size).toBe(FONT_TOKENS.length);
    expect(typographyValues.join(" ")).not.toMatch(/Space Grotesk|Inter|DM Sans|Playfair Display|Instrument Serif/);
  });

  it("keeps the diagnostic top compositions deterministic and meaningfully varied", () => {
    const diagnosticIds = [
      "banner-manicurist",
      "banner-gardener",
      "banner-barber",
      "immersive-creator",
      "minimal-typographic",
    ];
    const signatures = diagnosticIds.map((scenarioId) => {
      const preview = buildVisualQaScenarioPreviews({ scenarioId, candidateCount: 1 })[0]!;
      return preview.candidate.recipe.semantics.top_signature;
    });

    expect(new Set(signatures).size).toBeGreaterThanOrEqual(3);
    expect(buildVisualQaScenarioPreviews({ scenarioId: "banner-manicurist", candidateCount: 1 })[0]!
      .candidate.recipe.semantics.media_strategy).toBe("banner-first");
    expect(buildVisualQaScenarioPreviews({ scenarioId: "immersive-creator", candidateCount: 1 })[0]!
      .candidate.recipe.semantics.media_strategy).toBe("immersive-background");
    expect(buildVisualQaScenarioPreviews({ scenarioId: "minimal-typographic", candidateCount: 1 })[0]!
      .candidate.recipe.semantics.media_strategy).toBe("minimal-no-media");
  });

  it("keeps top signatures deterministic and independent from cosmetic palette changes", () => {
    const candidate = generatePowerEditorCandidates(PLAYGROUND_CASES[0]!.intent, {
      content: PLAYGROUND_CASES[0]!.content,
      count: 1,
      now: NOW,
    })[0]!;
    const original = structuralSignatureV2(candidate);
    const recolored = structuralSignatureV2({
      recipe: {
        ...candidate.recipe,
        visual: {
          ...candidate.recipe.visual,
          colors: {
            ...candidate.recipe.visual.colors,
            primary: "#ff00aa",
            accent: "#00ffee",
          },
        },
      },
    });

    expect(original.topSignature).toBe(candidate.recipe.semantics.top_signature);
    expect(recolored.topSignature).toBe(original.topSignature);
    expect(recolored.layout).toBe(original.layout);
  });

  it("caps repeated top signatures when valid alternatives exist", () => {
    const pool = buildVisualQaScenarioPreviews({
      scenarioId: "creator-premium",
      candidateCount: 12,
    }).map((preview) => preview.candidate);
    const selected = selectStructurallyDiverseCandidates(pool, 12);
    const counts = new Map<string, number>();
    for (const candidate of selected) {
      const signature = candidate.recipe.semantics.top_signature;
      counts.set(signature, (counts.get(signature) ?? 0) + 1);
    }
    expect(selected.length).toBeGreaterThan(0);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
  });

  it("keeps profession QA cases on supported first-viewport strategies", () => {
    const cases = [
      ["banner-gardener", "banner-first"],
      ["banner-manicurist", "banner-first"],
      ["banner-barber", "banner-first"],
      ["fitness", undefined],
      ["executive-consultant", undefined],
      ["creator-premium", undefined],
    ] as const;

    for (const [scenarioId, mediaStrategy] of cases) {
      const preview = buildVisualQaScenarioPreviews({ scenarioId, candidateCount: 1 })[0]!;
      expect(TOP_SIGNATURES_V2).toContain(preview.candidate.recipe.semantics.top_signature);
      if (mediaStrategy) {
        expect(preview.candidate.recipe.semantics.media_strategy).toBe(mediaStrategy);
      }
      expect(preview.candidate.recipe.layout.header).toMatch(/^(overlap|stacked|inline|hero)$/);
      expect(preview.candidate.recipe.visual.typography.headingFont).toBeTruthy();
    }
  });

  it("selects the explicit media-hero fixture with existing renderer vocabulary", () => {
    const preview = buildVisualQaScenarioPreviews({
      scenarioId: "media-hero-creator",
      candidateCount: 1,
    })[0]!;
    const recipe = preview.candidate.recipe;

    expect(recipe.semantics.top_signature).toBe("media-hero");
    expect(recipe.semantics.media_strategy).toBe("video-first");
    expect(recipe.layout.id).toBe("bento");
    expect(recipe.layout.header).toBe("hero");
    expect(recipe.structure.blocks.some((block) => block.type === "video")).toBe(true);
    expect(recipe.banner.enabled).toBe(true);
    expect(recipe.identity.banner).toBeTruthy();
    expect(preview.candidate.config.profile.banner.imageUrl).toBe(recipe.identity.banner);
    expect(preview.candidate.config.blocks.some((block) => block.type === "video")).toBe(true);
    expect(recipe.visual.background.type).not.toBe("image");
    expect(
      renderToStaticMarkup(
        React.createElement(PublicTemplateRenderer, {
          config: preview.candidate.config,
          breakpoint: "desktop",
        }),
      ),
    ).toContain("Noah Frame");
    expect(validateTemplate(preview.candidate.config).valid).toBe(true);
  });

  it("carries textures, frames, motion and safe sticky/floating decisions into output", () => {
    const candidate = generatePowerEditorCandidates(PLAYGROUND_CASES[0]!.intent, {
      content: PLAYGROUND_CASES[0]!.content,
      count: 1,
      now: NOW,
    })[0]!;
    expect(candidate.config.theme.texture).toBeDefined();
    expect(candidate.config.motion?.duration).toEqual(expect.any(Number));
    expect(candidate.recipe.structure.blocks.some((block) => block.frame !== "none")).toBe(true);

    const sticky = planBlocks(
      baseCandidate.recipe.source_recipe,
      semantics("corporate", "conversion_first", { cta_pressure: 85 }),
      { bookingUrl: "https://example.com/book" },
      capabilities,
      1,
      heroOff,
    );
    expect(sticky.filter((block) => block.layout.sticky?.enabled).length).toBeLessThanOrEqual(1);
    expect(sticky.some((block) => block.layout.sticky?.enabled)).toBe(true);

    const collisionSafe = planBlocks(
      baseCandidate.recipe.source_recipe,
      semantics("energetic", "conversion_first", { cta_pressure: 90 }),
      {
        bookingUrl: "https://example.com/book",
        quickActions: [{ label: "WhatsApp", url: "https://wa.me/1" }],
      },
      capabilities,
      1,
      heroOff,
    );
    expect(
      collisionSafe.some((block) => block.layout.sticky?.enabled) &&
        collisionSafe.some((block) => block.layout.floating?.enabled),
    ).toBe(false);
  });

  it("keeps the supplied V1, V1.5 and V1.5.1 engine checks green", () => {
    expect(runEngineSelfCheck().failed).toBe(0);
    expect(runEngineSelfCheckV15().passed).toBe(true);
    expect(runEngineHardeningCheck().passed).toBe(true);
  });
});
