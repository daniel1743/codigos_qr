import { describe, expect, it } from "vitest";

import { inferArchetype } from "../business-signals";
import { normalizeIntent } from "../normalize";
import { buildDesignProfile } from "../strategy";
import { generatePowerEditorTemplate } from "../power-editor/generate-v2";
import type { ContentSourceV2 } from "../power-editor/content-source";
import type { OnboardingIntentV1 } from "../types";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";

const NOW = "2026-09-15T12:00:00.000Z";

function intent(
  business_type: string,
  primary_goal: OnboardingIntentV1["primary_goal"],
): OnboardingIntentV1 {
  return {
    business_type,
    business_other: business_type,
    primary_goal,
    visual_personality: "professional",
    identity: {
      name: business_type,
      profession: business_type,
      bio: `${business_type} descripción breve`,
      avatar_preview: null,
    },
    primary_action: { type: "website", value: "https://example.com" },
    meta: { version: "1", completed_at: NOW },
  };
}

const scenarios = {
  service: {
    intent: intent("Peluquería y belleza", "leads"),
    content: {
      services: [
        { title: "Corte y peinado", price: "$18.000" },
        { title: "Coloración", price: "$35.000" },
      ],
    } satisfies ContentSourceV2,
    archetype: "appointment_service" as const,
  },
  catalog: {
    intent: { ...intent("Tienda de ropa", "sell"), assets: { card_media: true } },
    content: {
      products: [
        {
          title: "Chaqueta Urbana",
          price: "$49.990",
          imageUrl: "https://example.com/jacket.jpg",
          ctaUrl: "https://example.com/jacket",
        },
        {
          title: "Polera Essential",
          price: "$19.990",
          imageUrl: "https://example.com/shirt.jpg",
          ctaUrl: "https://example.com/shirt",
        },
      ],
    } satisfies ContentSourceV2,
    archetype: "retail" as const,
  },
  portfolio: {
    intent: intent("Fotografía", "portfolio"),
    content: {
      portfolio: [
        {
          label: "Editorial Nocturna",
          imageUrl: "https://example.com/night.jpg",
          url: "https://example.com/night",
        },
        {
          label: "Retratos Urbanos",
          imageUrl: "https://example.com/urban.jpg",
          url: "https://example.com/urban",
        },
      ],
    } satisfies ContentSourceV2,
    archetype: "portfolio_service" as const,
  },
} as const;

describe("Engine V2 archetype family bias", () => {
  it("adds the existing archetype bias without replacing current scoring", () => {
    const generic = normalizeIntent(intent("Actividad general", "leads"));
    const profile = buildDesignProfile(generic);
    expect(profile.family_scores).toEqual({
      editorial: 30,
      luxury: 0,
      corporate: 62,
      minimal: 32,
      creator: 0,
      energetic: 0,
    });

    for (const scenario of Object.values(scenarios)) {
      const normalized = normalizeIntent(scenario.intent);
      expect(inferArchetype(normalized)).toBe(scenario.archetype);
    }
  });

  it("changes family scores from the inferred archetype strategy", () => {
    const service = buildDesignProfile(normalizeIntent(scenarios.service.intent));
    const catalog = buildDesignProfile(normalizeIntent(scenarios.catalog.intent));
    const portfolio = buildDesignProfile(normalizeIntent(scenarios.portfolio.intent));

    expect(service.family_scores).toEqual({
      editorial: 30,
      luxury: 12,
      corporate: 70,
      minimal: 32,
      creator: 8,
      energetic: 0,
    });
    expect(catalog.family_scores).toEqual({
      editorial: 24,
      luxury: 0,
      corporate: 64,
      minimal: 24,
      creator: 16,
      energetic: 26,
    });
    expect(portfolio.family_scores).toEqual({
      editorial: 56,
      luxury: 0,
      corporate: 46,
      minimal: 42,
      creator: 22,
      energetic: 0,
    });
    expect(service.family_scores.corporate).toBeGreaterThan(62);
    expect(catalog.family_scores.energetic).toBeGreaterThan(14);
    expect(portfolio.family_scores.editorial).toBeGreaterThan(40);
  });

  it("keeps selected families and canonical output deterministic", () => {
    const results = Object.values(scenarios).map(({ intent, content }) => {
      const first = generatePowerEditorTemplate(intent, { content, now: NOW });
      const second = generatePowerEditorTemplate(structuredClone(intent), { content, now: NOW });
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(first?.recipe.semantics.family).toBe(second?.recipe.semantics.family);
      expect(first?.recipe.fingerprint).toBe(second?.recipe.fingerprint);
      expect(first && validateTemplate(first.config).valid).toBe(true);
      return first!;
    });

    expect(results.map((result) => result.recipe.semantics.family)).toEqual([
      "minimal",
      "editorial",
      "editorial",
    ]);
    expect(results[0]?.config.blocks.some((block) => block.type === "services")).toBe(true);
    expect(results[2]?.config.blocks.some((block) => block.type === "portfolio")).toBe(true);
    const serialized = results.map((result) => JSON.stringify(result.config));
    expect(serialized[0]).toContain("Corte y peinado");
    expect(serialized[0]).toContain("$18.000");
    expect(serialized[2]).toContain("Editorial Nocturna");
    expect(serialized[2]).toContain("https://example.com/night.jpg");
  });
});
