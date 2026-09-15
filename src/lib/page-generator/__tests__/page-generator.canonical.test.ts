/**
 * PAGES_7 — real Engine V2 generation → canonical document.
 *
 * The REAL generator and the REAL `validateTemplate` are used here; nothing is
 * mocked. This is the proof that generated content is renderer-valid before it
 * can ever reach `pages.template_config`.
 */

import { describe, expect, it } from "vitest";

import { generateFromOnboardingIntentV2 } from "@/lib/onboarding-v2/engine-v2-generation";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { mapGeneratedPageToEngineInput, toCanonicalPageDocument } from "../adapter";
import type { GeneratedPageInput } from "../types";

const NOW = "2026-09-15T12:00:00.000Z";

function servicesInput(overrides: Partial<GeneratedPageInput> = {}): GeneratedPageInput {
  return {
    objective: "services",
    title: "Servicios",
    businessName: "Barbería Norte",
    activity: "Barbería",
    description: "Cortes, barba y cuidado personal.",
    cta: { type: "whatsapp", value: "+56912345678" },
    items: [
      { title: "Corte clásico", description: "Máquina y tijera", price: "$8.000" },
      { title: "Perfilado de barba" },
    ],
    ...overrides,
  };
}

function catalogInput(): GeneratedPageInput {
  return {
    objective: "catalog",
    title: "Catálogo",
    businessName: "Tienda Norte",
    activity: "Tienda de accesorios",
    coverImageUrl: "https://images.example.com/portada.jpg",
    cta: { type: "website", value: "https://tiendanorte.example/catalogo" },
    items: [
      {
        title: "Cinturón de cuero",
        price: "$19.990",
        imageUrl: "https://images.example.com/cinturon.jpg",
        url: "https://tiendanorte.example/cinturon",
      },
      {
        title: "Billetera de cuero",
        price: "$24.990",
        imageUrl: "https://images.example.com/billetera.jpg",
      },
    ],
  };
}

function portfolioInput(): GeneratedPageInput {
  return {
    objective: "portfolio",
    title: "Portafolio",
    businessName: "Estudio Norte",
    activity: "Fotografía",
    coverImageUrl: "https://images.example.com/portada.jpg",
    cta: { type: "whatsapp", value: "+56912345678" },
    items: [
      {
        title: "Boda en Valparaíso",
        imageUrl: "https://images.example.com/boda.jpg",
        url: "https://estudionorte.example/boda",
      },
    ],
  };
}

/** Owner input → adapter → REAL Engine V2 generator (no server boundary in tests). */
function realGenerate(input: GeneratedPageInput) {
  const mapped = mapGeneratedPageToEngineInput(input, { now: NOW });
  if (!mapped.ok) throw new Error(mapped.errors.join(" "));
  return generateFromOnboardingIntentV2(mapped.intent, {
    now: NOW,
    ...(mapped.contentBlocks ? { contentBlocks: mapped.contentBlocks } : {}),
    ...(mapped.engineOptions ? { engine: mapped.engineOptions } : {}),
  });
}

describe("PAGES_7 real Engine V2 generation → canonical document", () => {
  it("generates a renderer-valid canonical document for the services objective", () => {
    const generated = realGenerate(servicesInput());
    expect(generated.status).toBe("GENERATED");
    if (generated.status !== "GENERATED") return;

    const validation = validateTemplate(generated.editorConfig);
    expect(validation.valid).toBe(true);
    expect(validation.issues.filter((issue) => issue.level === "error")).toHaveLength(0);
    expect(generated.editorConfig.theme.colors).toBeTruthy();
    expect(generated.editorConfig.theme.typography).toBeTruthy();
    expect(generated.editorConfig.layout.responsive).toBeTruthy();
    expect(Array.isArray(generated.editorConfig.blocks)).toBe(true);
    expect(generated.editorConfig.blocks.length).toBeGreaterThan(0);
  });

  it("keeps the owner service items in the generated document", () => {
    const generated = realGenerate(servicesInput());
    expect(generated.status).toBe("GENERATED");
    if (generated.status !== "GENERATED") return;

    const servicesBlock = generated.editorConfig.blocks.find((block) => block.type === "services");
    expect(servicesBlock).toBeTruthy();
    const serialized = JSON.stringify(servicesBlock);
    expect(serialized).toContain("Corte clásico");
    expect(serialized).toContain("Perfilado de barba");
    // Owner-supplied price, never invented.
    expect(serialized).toContain("$8.000");
  });

  it("generates a CTA block bound to the owner's destination for every objective", () => {
    for (const input of [servicesInput(), catalogInput(), portfolioInput()]) {
      const generated = realGenerate(input);
      expect(generated.status).toBe("GENERATED");
      if (generated.status !== "GENERATED") continue;
      const cta = generated.editorConfig.blocks.find((block) => block.type === "cta");
      expect(cta, `${input.objective} must keep the owner CTA`).toBeTruthy();
      expect(JSON.stringify(cta)).toContain(
        input.cta?.type === "whatsapp" ? "+56912345678" : (input.cta?.value as string),
      );
    }
  });

  it("keeps owner products and portfolio items renderable", () => {
    const catalog = realGenerate(catalogInput());
    expect(catalog.status).toBe("GENERATED");
    if (catalog.status === "GENERATED") {
      const types = catalog.editorConfig.blocks.map((block) => block.type);
      expect(types).toContain("productGrid");
      const serialized = JSON.stringify(catalog.editorConfig.blocks);
      expect(serialized).toContain("Cinturón de cuero");
      expect(serialized).toContain("cinturon.jpg");
    }

    const portfolio = realGenerate(portfolioInput());
    expect(portfolio.status).toBe("GENERATED");
    if (portfolio.status === "GENERATED") {
      const types = portfolio.editorConfig.blocks.map((block) => block.type);
      expect(types).toContain("portfolio");
      const serialized = JSON.stringify(portfolio.editorConfig.blocks);
      expect(serialized).toContain("Boda en Valparaíso");
      expect(serialized).toContain("boda.jpg");
    }
  });

  it("produces a canonical envelope accepted by the existing envelope contract", () => {
    const generated = realGenerate(servicesInput());
    expect(generated.status).toBe("GENERATED");
    if (generated.status !== "GENERATED") return;

    const document = toCanonicalPageDocument(generated.editorConfig);
    expect(document.ok).toBe(true);
    if (!document.ok) return;
    expect(document.envelope.schemaVersion).toBe(1);
    expect(document.envelope.editorConfig).toBe(generated.editorConfig);
  });

  it("rejects a malformed document instead of repairing it (real validator, no draft fallback)", () => {
    const generated = realGenerate(servicesInput());
    expect(generated.status).toBe("GENERATED");
    if (generated.status !== "GENERATED") return;

    const broken = JSON.parse(JSON.stringify(generated.editorConfig)) as {
      theme: Record<string, unknown>;
      layout: Record<string, unknown>;
    };
    delete broken.theme["colors"];
    delete broken.layout["responsive"];

    const document = toCanonicalPageDocument(broken);
    expect(document.ok).toBe(false);
    if (document.ok) return;
    expect(document.errors.length).toBeGreaterThan(0);
  });

  it("never injects demo personas, invented prices, testimonials or lorem ipsum", () => {
    const { description: _description, ...withoutDescription } = servicesInput();
    const generated = realGenerate({
      ...withoutDescription,
      items: [{ title: "Corte clásico" }],
    });
    expect(generated.status).toBe("GENERATED");
    if (generated.status !== "GENERATED") return;

    const serialized = JSON.stringify(generated.editorConfig).toLowerCase();
    for (const forbidden of ["lorem", "ipsum", "testimonio", "cliente satisfecho", "juan pérez"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
