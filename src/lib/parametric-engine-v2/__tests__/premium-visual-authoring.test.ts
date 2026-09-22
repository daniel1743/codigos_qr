import { describe, expect, it } from "vitest";

import { generatePowerEditorTemplate } from "../power-editor";
import type { ContentSourceV2 } from "../power-editor/content-source";
import type { OnboardingIntentV1 } from "../types";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { inferArchetype } from "../business-signals";
import { normalizeIntent } from "../normalize";

const NOW = "2026-09-16T12:00:00.000Z";

function intent(
  businessType: string,
  goal: OnboardingIntentV1["primary_goal"],
  name: string,
  profession: string,
  bio: string,
  action: OnboardingIntentV1["primary_action"],
): OnboardingIntentV1 {
  return {
    business_type: businessType,
    business_other: businessType,
    primary_goal: goal,
    visual_personality: "professional",
    identity: { name, profession, bio, avatar_preview: null, banner_preview: null },
    assets: { card_media: true },
    primary_action: action,
    meta: { version: "1", completed_at: NOW },
  };
}

const scenarios = {
  services: {
    intent: intent(
      "Peluquería y belleza",
      "booking",
      "Studio Aura",
      "Peluquería y belleza",
      "Cortes, color y tratamientos de autor en un espacio íntimo.",
      { type: "booking", value: "https://cal.com/studio-aura" },
    ),
    content: {
      services: [
        { title: "Corte y peinado", price: "$18.000" },
        { title: "Coloración", price: "$35.000" },
      ],
      about: "Rituales precisos y resultados naturales.",
    } satisfies ContentSourceV2,
    archetype: "appointment_service" as const,
  },
  retail: {
    intent: intent(
      "Tienda de ropa",
      "sell",
      "Norte Concept",
      "Tienda de ropa",
      "Prendas esenciales y selecciones de temporada.",
      { type: "website", value: "https://example.com/norte-concept" },
    ),
    content: {
      products: [
        { title: "Chaqueta Urbana", price: "$49.990", imageUrl: "https://example.com/jacket.jpg" },
        { title: "Polera Essential", price: "$19.990", imageUrl: "https://example.com/shirt.jpg" },
      ],
    } satisfies ContentSourceV2,
    archetype: "retail" as const,
  },
  portfolio: {
    intent: intent(
      "Fotografía",
      "portfolio",
      "Luz Norte",
      "Fotografía",
      "Fotografía editorial y retratos con luz natural.",
      { type: "instagram", value: "https://instagram.com/luznorte" },
    ),
    content: {
      portfolio: [
        {
          label: "Editorial Nocturna",
          url: "https://example.com/night",
          imageUrl: "https://example.com/night.jpg",
        },
        {
          label: "Retratos Urbanos",
          url: "https://example.com/urban",
          imageUrl: "https://example.com/urban.jpg",
        },
      ],
    } satisfies ContentSourceV2,
    archetype: "portfolio_service" as const,
  },
} as const;

function generate(key: keyof typeof scenarios) {
  const { intent: i, content } = scenarios[key];
  const candidate = generatePowerEditorTemplate(i, { content, now: NOW });
  if (!candidate) throw new Error(`no candidate for ${key}`);
  return candidate;
}

describe("Engine V2 premium visual authoring expansion", () => {
  it("keeps an owner cover out of minimal media and threads avatar/hero media", () => {
    const ownerIntent = {
      ...scenarios.services.intent,
      identity: {
        ...scenarios.services.intent.identity,
        avatar_preview: "https://cdn.example.com/aura-avatar.jpg",
        banner_preview: "https://cdn.example.com/aura-cover.jpg",
      },
    } satisfies OnboardingIntentV1;
    const candidate = generatePowerEditorTemplate(ownerIntent, {
      content: scenarios.services.content,
      now: NOW,
      advanced: { pattern_hint: "visual_cover" },
      bannerProvenance: { origin: "owner" },
    });

    expect(candidate).not.toBeNull();
    expect(candidate!.recipe.semantics.media_strategy).toBe("banner-first");
    expect(candidate!.recipe.layout.id).toBe("full-width");
    expect(candidate!.recipe.layout.header).toBe("hero");
    expect(candidate!.recipe.structure.blocks.some((block) => block.type === "hero")).toBe(true);
    expect(candidate!.recipe.identity.avatar).toBe("https://cdn.example.com/aura-avatar.jpg");
    expect(candidate!.recipe.identity.banner).toBe("https://cdn.example.com/aura-cover.jpg");
    expect(candidate!.config.profile.avatarUrl).toBe("https://cdn.example.com/aura-avatar.jpg");
    expect(candidate!.config.blocks.find((block) => block.type === "hero")?.content).toMatchObject({
      avatar: { url: "https://cdn.example.com/aura-avatar.jpg" },
      bannerImage: { url: "https://cdn.example.com/aura-cover.jpg" },
    });
    expect(validateTemplate(candidate!.config).valid).toBe(true);
  });

  it("infers the expected archetype for every golden scenario", () => {
    for (const scenario of Object.values(scenarios)) {
      expect(inferArchetype(normalizeIntent(scenario.intent))).toBe(scenario.archetype);
    }
  });

  it("produces canonical-valid, deterministic output for every scenario", () => {
    for (const key of Object.keys(scenarios) as (keyof typeof scenarios)[]) {
      const first = generate(key);
      const second = generate(key);
      expect(first.recipe.meta.fingerprint).toBe(second.recipe.meta.fingerprint);
      expect(JSON.stringify(first.config)).toBe(JSON.stringify(second.config));
      expect(validateTemplate(first.config).valid).toBe(true);
    }
  });

  it("renders retail products (catalog is never dropped as a media story)", () => {
    const retail = generate("retail");
    expect(retail.recipe.semantics.media_strategy).toBe("catalog-first");
    expect(retail.config.blocks.some((block) => block.type === "productGrid")).toBe(true);
  });

  it("gives each archetype a materially different visual identity", () => {
    const services = generate("services");
    const retail = generate("retail");
    const portfolio = generate("portfolio");

    expect(services.config.theme.background.type).toBe("gradient");
    expect(retail.config.theme.background.type).toBe("gradient");
    expect(portfolio.config.theme.background.type).toBe("gradient");
    expect(
      new Set([
        services.config.theme.background.gradient?.angle,
        retail.config.theme.background.gradient?.angle,
        portfolio.config.theme.background.gradient?.angle,
      ]).size,
    ).toBeGreaterThan(1);

    expect(services.config.theme.cards.preset).toBe("elevated");
    expect(retail.config.theme.cards.preset).toBe("soft");
    expect(portfolio.config.theme.cards.preset).toBe("minimal");

    expect(services.config.theme.buttons.variant).toBe("solid");
    expect(retail.config.theme.buttons.variant).toBe("gradient");
    expect(portfolio.config.theme.buttons.variant).toBe("outline");

    expect(services.config.profile.banner.enabled).toBe(true);
    expect(retail.config.profile.banner.enabled).toBe(true);
    expect(portfolio.config.profile.banner.enabled).toBe(true);

    for (const config of [services.config, retail.config, portfolio.config]) {
      expect(config.theme.colors.primary).not.toBe(config.theme.colors.accent);
      expect(config.theme.background.gradient?.from).not.toBe(config.theme.background.gradient?.to);
    }

    expect(services.config.blocks.some((b) => b.type === "services")).toBe(true);
    expect(retail.config.blocks.some((b) => b.type === "productGrid")).toBe(true);
    expect(portfolio.config.blocks.some((b) => b.type === "portfolio")).toBe(true);
  });

  it("differentiates the three cases beyond color and block type", () => {
    const signatures = (Object.keys(scenarios) as (keyof typeof scenarios)[]).map((key) => {
      const c = generate(key);
      return [
        c.config.theme.background.gradient?.angle,
        c.config.theme.cards.preset,
        c.config.theme.buttons.variant,
        c.config.theme.typography.headingSize,
      ].join("|");
    });
    expect(new Set(signatures).size).toBe(3);
  });

  it("keeps Engine-authored service card material available to the renderer", () => {
    const services = generate("services");
    const block = services.config.blocks.find((candidate) => candidate.type === "services");
    expect(block?.style.shadow).toBeUndefined();
    expect(services.config.theme.cards).toMatchObject({
      preset: "elevated",
      borderWidth: 1,
      shadow: expect.stringMatching(/md|lg/),
    });
  });
});
