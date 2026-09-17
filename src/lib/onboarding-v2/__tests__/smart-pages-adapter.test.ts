import { describe, expect, it } from "vitest";

import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import {
  SIMPLE_CONTACT_FIXTURE,
  mapOnboardingIntentV2ToEngineInput,
  validateOnboardingIntentV2,
} from "../index";
import {
  generateSmartPageFromOnboarding,
  mapOnboardingIntentV2ToSmartPagesRequest,
} from "../smart-pages-adapter";
import type { OnboardingIntentV2 } from "../types";
import type { OwnerContentInput } from "@/lib/page-generator/owner-content";

const NOW = "2026-09-15T12:00:00.000Z";
const image = (url: string) => ({ url, kind: "image" as const });

function intent(overrides: Partial<OnboardingIntentV2> = {}): OnboardingIntentV2 {
  return {
    ...SIMPLE_CONTACT_FIXTURE,
    identity: {
      ...SIMPLE_CONTACT_FIXTURE.identity,
      displayName: "Negocio Norte",
      professionOrActivity: "comercio local",
      bio: "Un negocio local con atención cercana.",
    },
    outcome: { primaryGoal: "show_services", experienceHint: "service_page" },
    actions: { primary: { type: "whatsapp", source: "inferred" }, secondary: [] },
    scope: { density: "complete", userSelected: true },
    ...overrides,
  };
}

function catalogOwner(): OwnerContentInput {
  return {
    identity: { businessName: "Tienda Norte", shortDescription: "Plantas para tu hogar." },
    products: [
      {
        id: "product-1",
        name: "Monstera deliciosa",
        description: "Planta de interior.",
        price: "$24.990",
        media: [image("https://cdn.example/product.jpg")],
        destination: "https://store.example/product-1",
      },
    ],
    contact: { whatsapp: "+56912345678" },
    media: { cover: image("https://cdn.example/store-cover.jpg") },
  };
}

function portfolioOwner(): OwnerContentInput {
  return {
    identity: { businessName: "Estudio Frame", shortDescription: "Fotografía con intención." },
    portfolioItems: [
      {
        name: "Boda en la costa",
        description: "Registro documental de la celebración.",
        media: [image("https://cdn.example/wedding.jpg")],
        destination: "https://frame.example/wedding",
      },
    ],
    media: { cover: image("https://cdn.example/frame-cover.jpg") },
  };
}

describe("SMART_PAGES_5 onboarding → PageGenerationRequest", () => {
  it("keeps legacy Onboarding V2 payloads valid and preserves the old Engine path", () => {
    expect(validateOnboardingIntentV2(SIMPLE_CONTACT_FIXTURE)).toEqual({ valid: true, issues: [] });
    const legacyEngine = mapOnboardingIntentV2ToEngineInput(SIMPLE_CONTACT_FIXTURE);
    expect(legacyEngine.ok).toBe(true);
  });

  it("maps truthful service content, price, density and WhatsApp owner fact", () => {
    const mapped = mapOnboardingIntentV2ToSmartPagesRequest(intent(), {
      ownerContent: {
        services: [{ name: "Corte clásico", description: "Corte y barba.", price: "$8.000" }],
        contact: { whatsapp: "+56912345678" },
      },
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.request.businessType).toBe("comercio local");
    expect(mapped.request.density).toBe("rich");
    expect(mapped.request.content.catalogs[0]?.items[0]).toMatchObject({
      name: "Corte clásico",
      price: { label: "$8.000" },
    });
    expect(mapped.request.primaryAction).toMatchObject({
      kind: "whatsapp",
      target: "+56912345678",
      enabled: true,
    });
  });

  it("uses intent.ownerContent when a caller does not pass a separate owner-content argument", () => {
    const mapped = mapOnboardingIntentV2ToSmartPagesRequest(
      intent({
        ownerContent: {
          services: [{ name: "Diagnóstico", price: "$5.000" }],
          contact: { whatsapp: "+56912345678" },
        },
      }),
    );
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.request.content.catalogs[0]?.items[0]?.name).toBe("Diagnóstico");
  });

  it("maps catalog products through the existing retail-compatible request", () => {
    const mapped = mapOnboardingIntentV2ToSmartPagesRequest(
      intent({
        identity: {
          ...intent().identity,
          displayName: "Tienda Norte",
          professionOrActivity: "retail",
        },
        outcome: { primaryGoal: "sell", experienceHint: "catalog" },
        actions: {
          primary: { type: "buy", source: "user", value: "https://store.example" },
          secondary: [],
        },
      }),
      { ownerContent: catalogOwner() },
    );
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.request.goal).toBe("sell");
    expect(mapped.request.preferences?.experienceType).toBe("catalog");
    expect(mapped.request.content.catalogs[0]?.items[0]).toMatchObject({
      name: "Monstera deliciosa",
      price: { label: "$24.990" },
      media: [{ url: "https://cdn.example/product.jpg" }],
      action: { target: "https://store.example/product-1" },
    });
    expect(mapped.request.content.catalogs[0]?.items[0]?.attributes).toEqual(
      expect.arrayContaining([
        { key: "url", label: "Owner destination", value: "https://store.example/product-1" },
      ]),
    );
  });

  it("maps menu item, price and category without inventing a product", () => {
    const mapped = mapOnboardingIntentV2ToSmartPagesRequest(
      intent({ actions: { primary: null, secondary: [] } }),
      {
        ownerContent: {
          menuItems: [{ name: "Limonada", category: "Bebidas", price: "$3.500" }],
        },
      },
    );
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.request.preferences?.experienceType).toBe("menu");
    expect(mapped.request.content.catalogs[0]?.kind).toBe("menu");
    expect(mapped.request.content.catalogs[0]?.items[0]).toMatchObject({
      name: "Limonada",
      price: { label: "$3.500" },
      categoryId: "owner-category-bebidas",
    });
    expect(mapped.request.content.catalogs[0]?.categories).toEqual([
      { id: "owner-category-bebidas", name: "Bebidas", order: 0 },
    ]);
    expect(mapped.request.content.catalogs[0]?.items).toHaveLength(1);
  });

  it("enforces portfolio media and real destination readiness", () => {
    const ready = mapOnboardingIntentV2ToSmartPagesRequest(
      intent({
        identity: {
          ...intent().identity,
          displayName: "Estudio Frame",
          professionOrActivity: "fotografía",
        },
        outcome: { primaryGoal: "show_portfolio", experienceHint: "professional_landing" },
        actions: { primary: null, secondary: [] },
      }),
      { ownerContent: portfolioOwner() },
    );
    expect(ready.ok).toBe(true);
    if (ready.ok) expect(ready.request.preferences?.experienceType).toBe("portfolio");

    const incomplete = mapOnboardingIntentV2ToSmartPagesRequest(
      intent({
        outcome: { primaryGoal: "show_portfolio", experienceHint: "professional_landing" },
        actions: { primary: null, secondary: [] },
      }),
      { ownerContent: { portfolioItems: [{ name: "Proyecto sin media" }] } },
    );
    expect(incomplete).toMatchObject({ ok: false, code: "NEEDS_INPUT" });
    if (!incomplete.ok) {
      expect(incomplete.diagnostics.missingOwnerFacts).toEqual(
        expect.arrayContaining([
          "portfolioItems[0].media",
          "portfolioItems[0].destination",
          "media.cover",
        ]),
      );
    }
  });

  it("returns a diagnostic for an intended WhatsApp action without a real destination", () => {
    const result = mapOnboardingIntentV2ToSmartPagesRequest(intent(), { ownerContent: {} });
    expect(result).toMatchObject({ ok: false, code: "NEEDS_INPUT" });
    if (!result.ok) {
      expect(result.diagnostics.missingOwnerFacts).toContain(
        "actions.primary.whatsapp.destination",
      );
      expect(JSON.stringify(result)).not.toContain("wa.me");
      expect(JSON.stringify(result)).not.toContain("+569");
    }
  });

  it("does not generate when required owner content is missing and keeps optional facts absent", () => {
    const missing = mapOnboardingIntentV2ToSmartPagesRequest(
      intent({ outcome: { primaryGoal: "show_services", experienceHint: "service_page" } }),
      { ownerContent: { contact: { whatsapp: "+56912345678" } } },
    );
    expect(missing).toMatchObject({ ok: false, code: "NEEDS_INPUT" });
    if (!missing.ok) expect(missing.diagnostics.missingOwnerFacts).toContain("services");

    const optional = mapOnboardingIntentV2ToSmartPagesRequest(intent(), {
      ownerContent: {
        services: [{ name: "Consulta" }],
        contact: { whatsapp: "+56912345678" },
      },
    });
    expect(optional.ok).toBe(true);
    if (optional.ok) {
      const item = optional.request.content.catalogs[0]?.items[0];
      expect(item?.price).toBeUndefined();
      expect(item?.media).toEqual([]);
    }
  });

  it("does not fabricate owner content, destinations or media", () => {
    const result = mapOnboardingIntentV2ToSmartPagesRequest(
      intent({
        contentNeeds: { items: [{ type: "products" }] },
        outcome: { primaryGoal: "sell", experienceHint: "catalog" },
        actions: { primary: null, secondary: [] },
      }),
      { ownerContent: { identity: { businessName: "Tienda vacía" } } },
    );
    expect(result).toMatchObject({ ok: false, code: "NEEDS_INPUT" });
    if (!result.ok) {
      expect(result.diagnostics.missingOwnerFacts).toContain("products");
      expect(JSON.stringify(result)).not.toContain("Producto");
      expect(JSON.stringify(result)).not.toContain("https://");
      expect(JSON.stringify(result)).not.toContain("wa.me");
    }
  });

  it.each<[string, OnboardingIntentV2, OwnerContentInput]>([
    [
      "services",
      intent(),
      { services: [{ name: "Corte", price: "$8.000" }], contact: { whatsapp: "+56912345678" } },
    ],
    [
      "catalog",
      intent({
        outcome: { primaryGoal: "sell", experienceHint: "catalog" },
        actions: {
          primary: { type: "buy", source: "user", value: "https://store.example" },
          secondary: [],
        },
      }),
      catalogOwner(),
    ],
    [
      "portfolio",
      intent({
        outcome: { primaryGoal: "show_portfolio", experienceHint: "professional_landing" },
        actions: { primary: null, secondary: [] },
      }),
      portfolioOwner(),
    ],
    [
      "menu",
      intent({ actions: { primary: null, secondary: [] } }),
      { menuItems: [{ name: "Limonada", category: "Bebidas", price: "$3.500" }] },
    ],
  ])(
    "runs %s through Smart Pages, host mapping, Engine V2 and canonical validation",
    (_name, sourceIntent, ownerContent) => {
      const generated = generateSmartPageFromOnboarding(sourceIntent, { ownerContent, now: NOW });
      expect(generated.ok).toBe(true);
      if (!generated.ok) return;
      expect(validateTemplate(generated.result.editorConfig).valid).toBe(true);
      expect(generated.plan.experienceType).not.toBe("listings");
      expect(generated.result.editorConfig.blocks.length).toBeGreaterThan(0);
    },
  );

  it("exposes a premium-UI-safe surface without persistence or Engine internals", () => {
    const result = mapOnboardingIntentV2ToSmartPagesRequest(intent(), {
      ownerContent: { services: [{ name: "Consulta" }], contact: { whatsapp: "+56912345678" } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.version).toBe("1");
    expect(result.diagnostics).toEqual(
      expect.objectContaining({
        mappedFields: expect.any(Array),
        deferredFields: expect.any(Array),
      }),
    );
    expect(result).not.toHaveProperty("pageId");
    expect(result).not.toHaveProperty("publicId");
  });
});
