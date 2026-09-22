import { describe, expect, it } from "vitest";

import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { SIMPLE_CONTACT_FIXTURE } from "../index";
import { generateSmartPageFromOnboarding } from "../smart-pages-adapter";
import type { OnboardingIntentV2 } from "../types";
import type { OwnerContentInput } from "@/lib/page-generator/owner-content";

const NOW = "2026-09-16T12:00:00.000Z";
const image = (url: string) => ({ url, kind: "image" as const });

function intent(overrides: Partial<OnboardingIntentV2> = {}): OnboardingIntentV2 {
  return {
    ...SIMPLE_CONTACT_FIXTURE,
    identity: {
      ...SIMPLE_CONTACT_FIXTURE.identity,
      displayName: "Norte Concept",
      professionOrActivity: "Tienda de ropa",
      bio: "Prendas esenciales.",
    },
    outcome: { primaryGoal: "sell", experienceHint: "catalog" },
    actions: {
      primary: { type: "buy", source: "user", value: "https://store.example" },
      secondary: [],
    },
    scope: { density: "complete", userSelected: true },
    ...overrides,
  };
}

const retailOwner: OwnerContentInput = {
  identity: { businessName: "Norte Concept", shortDescription: "Prendas esenciales." },
  products: [
    {
      name: "Chaqueta Urbana",
      price: "$49.990",
      media: [image("https://cdn.example/jacket.jpg")],
      destination: "https://store.example/jacket",
    },
    {
      name: "Polera Essential",
      price: "$19.990",
      media: [image("https://cdn.example/shirt.jpg")],
      destination: "https://store.example/shirt",
    },
  ],
  media: { cover: image("https://cdn.example/store-cover.jpg") },
};

const portfolioOwner: OwnerContentInput = {
  identity: { businessName: "Luz Norte", shortDescription: "Fotografía editorial." },
  portfolioItems: [
    {
      name: "Editorial Nocturna",
      media: [image("https://cdn.example/night.jpg")],
      destination: "https://luz.example/night",
    },
    {
      name: "Retratos Urbanos",
      media: [image("https://cdn.example/urban.jpg")],
      destination: "https://luz.example/urban",
    },
  ],
  media: { cover: image("https://cdn.example/luz-cover.jpg") },
};

describe("durable owner media reaches the generated BioTemplateConfig", () => {
  it("maps a retail owner cover to the hero banner and product media to the productGrid", () => {
    const generated = generateSmartPageFromOnboarding(intent(), {
      ownerContent: retailOwner,
      now: NOW,
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const config = generated.result.editorConfig;
    expect(validateTemplate(config).valid).toBe(true);

    const grid = config.blocks.find((block) => block.type === "productGrid");
    expect(grid).toBeTruthy();
    const products = (grid?.content as { products?: Array<{ imageUrl?: string }> })?.products ?? [];
    expect(products.map((product) => product.imageUrl)).toEqual([
      "https://cdn.example/jacket.jpg",
      "https://cdn.example/shirt.jpg",
    ]);

    expect(config.profile.banner.imageUrl).toBe("https://cdn.example/store-cover.jpg");
  });

  it("maps portfolio media to the portfolio block and the cover to the hero banner", () => {
    const generated = generateSmartPageFromOnboarding(
      intent({
        outcome: { primaryGoal: "show_portfolio", experienceHint: "professional_landing" },
        actions: { primary: null, secondary: [] },
      }),
      { ownerContent: portfolioOwner, now: NOW },
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const config = generated.result.editorConfig;
    expect(validateTemplate(config).valid).toBe(true);

    const portfolio = config.blocks.find((block) => block.type === "portfolio");
    expect(portfolio).toBeTruthy();
    const items = (portfolio?.content as { items?: Array<{ imageUrl?: string }> })?.items ?? [];
    expect(items.map((item) => item.imageUrl)).toEqual([
      "https://cdn.example/night.jpg",
      "https://cdn.example/urban.jpg",
    ]);

    expect(config.profile.banner.imageUrl).toBe("https://cdn.example/luz-cover.jpg");
  });
});
