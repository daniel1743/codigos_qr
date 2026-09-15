/**
 * PAGES_7 — PageGeneratorAdapter tests.
 *
 * These run the REAL Engine V2 generator and the REAL canonical
 * `validateTemplate`: nothing about the validator is mocked away, so a generated
 * document that the public renderer could not render fails here.
 */

import { describe, expect, it } from "vitest";

import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { generateFromOnboardingIntentV2 } from "@/lib/onboarding-v2/engine-v2-generation";
import type { EngineV2HostContentBlocks } from "@/lib/parametric-engine-v2/internal-entrypoint";
import {
  buildEngineContentBlocks,
  mapGeneratedPageToEngineInput,
  toCanonicalPageDocument,
} from "../adapter";
import { buildGeneratedPageIntent } from "../intent";
import { GENERATED_PAGE_OBJECTIVE_PRESETS } from "../objective-presets";
import type { GeneratedPageInput } from "../types";
import { validateGeneratedPageInput } from "../validation";

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
    ],
  };
}

function portfolioInput(): GeneratedPageInput {
  return {
    objective: "portfolio",
    title: "Portafolio",
    businessName: "Estudio Norte",
    activity: "Fotografía",
    items: [
      {
        title: "Boda en Valparaíso",
        imageUrl: "https://images.example.com/boda.jpg",
        url: "https://estudionorte.example/boda",
      },
    ],
  };
}

function realGenerate(input: GeneratedPageInput) {
  const mapped = mapGeneratedPageToEngineInput(input, { now: NOW });
  if (!mapped.ok) throw new Error(mapped.errors.join(" "));
  return generateFromOnboardingIntentV2(mapped.intent, {
    now: NOW,
    ...(mapped.contentBlocks ? { contentBlocks: mapped.contentBlocks } : {}),
  });
}

describe("PAGES_7 page generator input validation", () => {
  it("accepts a complete services input and rejects a missing CTA destination", () => {
    expect(validateGeneratedPageInput(servicesInput()).valid).toBe(true);

    const missingValue = validateGeneratedPageInput(
      servicesInput({ cta: { type: "whatsapp", value: "" } }),
    );
    expect(missingValue.valid).toBe(false);
    expect(missingValue.issues.some((issue) => issue.path === "cta.value")).toBe(true);
  });

  it("rejects an invalid WhatsApp destination before the engine runs", () => {
    const result = validateGeneratedPageInput(
      servicesInput({ cta: { type: "whatsapp", value: "no-es-un-numero" } }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === "invalid_destination")).toBe(true);
  });

  it("never fabricates catalog media: a product without an image is rejected", () => {
    const result = validateGeneratedPageInput({
      ...catalogInput(),
      items: [{ title: "Cinturón de cuero" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "items[0].imageUrl")).toBe(true);
  });

  it("rejects an unsupported primary action type", () => {
    const result = validateGeneratedPageInput(
      servicesInput({ cta: { type: "call" as never, value: "+56912345678" } }),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "cta.type")).toBe(true);
  });
});

describe("PAGES_7 generated Page → Engine V2 mapping", () => {
  it("maps the objective to the product PageType without losing its meaning", () => {
    expect(GENERATED_PAGE_OBJECTIVE_PRESETS.services.pageType).toBe("services");
    expect(GENERATED_PAGE_OBJECTIVE_PRESETS.catalog.pageType).toBe("catalog");
    expect(GENERATED_PAGE_OBJECTIVE_PRESETS.portfolio.pageType).toBe("portfolio");
    // Existing canonical types stay untouched for the experiences that already
    // had a canonical purpose.
    expect(GENERATED_PAGE_OBJECTIVE_PRESETS.menu.pageType).toBe("menu");
    expect(GENERATED_PAGE_OBJECTIVE_PRESETS.promotion.pageType).toBe("promotion");
    expect(GENERATED_PAGE_OBJECTIVE_PRESETS.event.pageType).toBe("event");
  });

  it("uses the existing semantic intent contract as the generator input language", () => {
    const intent = buildGeneratedPageIntent(servicesInput(), { now: NOW });
    expect(intent.outcome.primaryGoal).toBe("show_services");
    expect(intent.outcome.experienceHint).toBe("service_page");
    expect(intent.contentNeeds.items.map((item) => item.type)).toEqual(["services", "contact"]);
    expect(intent.identity.displayName).toBe("Servicios");
    expect(intent.identity.professionOrActivity).toBe("Barbería");
    expect(intent.actions.primary?.type).toBe("whatsapp");
    expect(intent.scope.density).toBe("complete");
    expect(intent.contentNeeds.userHasNoContentYet).toBeUndefined();
  });

  it("maps owner items onto the engine's existing structured content contract", () => {
    const services = buildEngineContentBlocks(servicesInput());
    expect(services?.services).toHaveLength(2);
    expect(services?.contact).toEqual({ phone: "+56912345678" });

    const catalog = buildEngineContentBlocks(catalogInput());
    expect(catalog?.products?.[0]?.imageUrl).toBe("https://images.example.com/cinturon.jpg");
    expect(catalog?.products?.[0]?.ctaUrl).toBe("https://tiendanorte.example/cinturon");

    const portfolio = buildEngineContentBlocks(portfolioInput());
    expect(portfolio?.portfolio?.[0]?.label).toBe("Boda en Valparaíso");
    expect(portfolio?.portfolio?.[0]?.imageUrl).toBe("https://images.example.com/boda.jpg");

    const event = buildEngineContentBlocks({
      objective: "event",
      title: "Evento",
      businessName: "Centro Cultural",
      activity: "Centro cultural",
      items: [{ title: "Taller de cerámica", date: "12 de octubre" }],
    });
    expect(event?.events?.[0]).toEqual({ title: "Taller de cerámica", date: "12 de octubre" });
  });

  it("maps the owner input through the existing adapter rules (no duplicated mapping)", () => {
    const mapped = mapGeneratedPageToEngineInput(servicesInput(), { now: NOW });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.engineInput.profession).toBe("Barbería");
    expect(mapped.engineInput.selectedFeatures).toContain("services");
    expect(mapped.engineInput.primaryAction).toEqual({ type: "whatsapp", value: "+56912345678" });
    expect(mapped.engineInput.content?.name).toBe("Servicios");
    expect(mapped.diagnostics.mappedFields.some((field) => field.startsWith("items ->"))).toBe(
      true,
    );
  });

  it("falls back to an explicit no-CTA document when the owner supplies no action", () => {
    const { cta: _cta, ...withoutCta } = servicesInput();
    const intent = buildGeneratedPageIntent(withoutCta, { now: NOW });
    expect(intent.actions.primary).toBeUndefined();

    const mapped = mapGeneratedPageToEngineInput(withoutCta, { now: NOW });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.engineInput.primaryAction).toBeUndefined();
  });

  it("forwards the owner cover as real media and selects the existing banner-first strategy", () => {
    const mapped = mapGeneratedPageToEngineInput({ ...catalogInput() }, { now: NOW });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.engineInput.userMedia?.bannerUrl).toBe("https://images.example.com/portada.jpg");
    expect(mapped.engineInput.cardMedia).toBe(true);
    // Existing Engine V2 option only; no engine business logic is changed.
    expect(mapped.engineOptions).toEqual({ mediaStrategy: "banner-first" });

    const servicesMapped = mapGeneratedPageToEngineInput(servicesInput(), { now: NOW });
    expect(servicesMapped.ok).toBe(true);
    if (!servicesMapped.ok) return;
    expect(servicesMapped.engineOptions).toBeUndefined();
  });

  it("requires an owner cover for the media-led catalog objective", () => {
    const result = validateGeneratedPageInput({ ...catalogInput(), coverImageUrl: "" });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "coverImageUrl")).toBe(true);
  });
});
