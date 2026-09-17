import { describe, expect, it } from "vitest";

import { generateSmartPageFromOnboarding } from "@/lib/onboarding-v2/smart-pages-adapter";
import { generateCripqerPageWithEngineV2Traced } from "@/lib/parametric-engine-v2/internal-entrypoint";
import type { OnboardingIntentV2 } from "@/lib/onboarding-v2/types";
import type { OwnerContentInput } from "@/lib/page-generator/owner-content";
import { buildGenerationTrace } from "../recorder";

const NOW = "2026-09-15T12:00:00.000Z";
const image = (url: string) => ({ url, kind: "image" as const });

function makeIntent(overrides: Partial<OnboardingIntentV2> = {}): OnboardingIntentV2 {
  return {
    version: "2",
    identity: { displayName: "Negocio", professionOrActivity: "actividad", bio: "" },
    business: { category: "other" },
    outcome: { primaryGoal: "contacts", experienceHint: "other" },
    visualDirection: { preference: "let_cripqer_decide" },
    contentNeeds: { items: [{ type: "contact" }] },
    actions: { primary: null, secondary: [] },
    media: { preference: "no_preference" },
    scope: { density: "auto", userSelected: false },
    meta: { version: "2", completedAt: NOW, source: "onboarding_v2", locale: "es" },
    ...overrides,
  };
}

const SCENARIOS: Array<{ id: string; intent: OnboardingIntentV2; owner: OwnerContentInput }> = [
  {
    id: "SERVICE_BOOKING",
    intent: makeIntent({
      identity: { displayName: "Studio Aura", professionOrActivity: "Peluquería y belleza", bio: "Peluquería." },
      business: { category: "beauty", customCategory: "Peluquería y belleza" },
      outcome: { primaryGoal: "bookings", experienceHint: "service_page" },
      contentNeeds: { items: [{ type: "services" }, { type: "booking" }, { type: "contact" }] },
      actions: { primary: { type: "whatsapp", source: "user" }, secondary: [] },
      scope: { density: "complete", userSelected: true },
    }),
    owner: {
      identity: { businessName: "Studio Aura", shortDescription: "Peluquería y belleza" },
      services: [
        { name: "Corte y peinado", price: "$18.000" },
        { name: "Coloración", price: "$35.000" },
      ],
      contact: { whatsapp: "+56911112222" },
    },
  },
  {
    id: "RETAIL_CATALOG",
    intent: makeIntent({
      identity: { displayName: "Norte Concept", professionOrActivity: "Tienda de ropa", bio: "Ropa urbana." },
      business: { category: "retail", customCategory: "Tienda de ropa" },
      outcome: { primaryGoal: "sell", experienceHint: "catalog" },
      contentNeeds: { items: [{ type: "products" }, { type: "contact" }] },
      actions: { primary: { type: "whatsapp", source: "user" }, secondary: [] },
      scope: { density: "complete", userSelected: true },
    }),
    owner: {
      identity: { businessName: "Norte Concept", shortDescription: "Tienda de ropa" },
      products: [
        {
          name: "Chaqueta Urbana",
          price: "$49.990",
          media: [image("https://cdn.example/chaqueta.jpg")],
          destination: "https://store.example/chaqueta",
        },
      ],
      contact: { whatsapp: "+56933334444" },
      media: { cover: image("https://cdn.example/norte-cover.jpg") },
    },
  },
  {
    id: "CREATIVE_PORTFOLIO",
    intent: makeIntent({
      identity: { displayName: "Luz Norte", professionOrActivity: "Fotografía", bio: "Fotografía editorial." },
      business: { category: "creator", customCategory: "Fotografía" },
      outcome: { primaryGoal: "show_portfolio", experienceHint: "professional_landing" },
      contentNeeds: { items: [{ type: "portfolio" }, { type: "contact" }] },
      actions: { primary: { type: "website", source: "user", value: "https://luznorte.example" }, secondary: [] },
      scope: { density: "complete", userSelected: true },
    }),
    owner: {
      identity: { businessName: "Luz Norte", shortDescription: "Fotografía" },
      portfolioItems: [
        {
          name: "Editorial Nocturna",
          media: [image("https://cdn.example/nocturna.jpg")],
          destination: "https://luznorte.example/nocturna",
        },
      ],
      media: { cover: image("https://cdn.example/luz-cover.jpg") },
      contact: { whatsapp: "+56955556666" },
    },
  },
];

describe("generation trace recorder (integration)", () => {
  it.each(SCENARIOS.map((s) => [s.id, s] as const))(
    "captures a faithful trace for %s",
    (_name, scenario) => {
      const live = generateSmartPageFromOnboarding(scenario.intent, {
        ownerContent: scenario.owner,
        now: NOW,
      });
      expect(live.ok).toBe(true);
      if (!live.ok) return;

      const adapter = live.mapping.adapter;
      const traced = generateCripqerPageWithEngineV2Traced(adapter.engineInput, {
        now: NOW,
        ...(adapter.contentBlocks ? { contentBlocks: adapter.contentBlocks } : {}),
        ...(adapter.engineOptions ? { engine: adapter.engineOptions } : {}),
      });

      expect(traced.generation.fingerprint).toBe(live.result.generation.fingerprint);
      expect(traced.generation.family).toBe(live.result.generation.family);

      const trace = buildGenerationTrace({
        traceId: "CRPQ-TRACE-TEST",
        scenarioId: scenario.id,
        intent: scenario.intent,
        ownerContent: scenario.owner,
        now: NOW,
        live,
        strategy: traced.trace,
        unsplashConnected: false,
        pexelsConnected: false,
      });

      expect(trace.traceId).toBe("CRPQ-TRACE-TEST");
      expect(trace.stages.map((s) => s.id)).toEqual(["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"]);
      expect(trace.engine).not.toBeNull();
      expect(trace.visual).not.toBeNull();
      expect(trace.engine?.archetype).toBeTruthy();
      expect(trace.engine?.selectedFamily).toBeTruthy();
      expect(Object.keys(trace.engine?.familyBias ?? {}).length).toBeGreaterThan(0);
      expect(trace.summary.CANONICAL.status).toBe("OK");
      expect(trace.summary.RENDERER.status).toBe("OK");

      const field = (name: string) => trace.transformations.find((t) => t.field === name);
      expect(field("business category")?.status).toBe("DEGRADED");
      expect(field("visual personality")?.status).toBe("FALLBACK");
      expect(trace.visual?.notSelected.length).toBeGreaterThan(0);
    },
  );

  it("captures the bookings → leads goal degradation for the service scenario", () => {
    const scenario = SCENARIOS[0]!;
    const live = generateSmartPageFromOnboarding(scenario.intent, {
      ownerContent: scenario.owner,
      now: NOW,
    });
    if (!live.ok) throw new Error("expected ok");
    const adapter = live.mapping.adapter;
    const traced = generateCripqerPageWithEngineV2Traced(adapter.engineInput, {
      now: NOW,
      ...(adapter.contentBlocks ? { contentBlocks: adapter.contentBlocks } : {}),
    });
    const trace = buildGenerationTrace({
      traceId: "CRPQ-TRACE-TEST",
      scenarioId: scenario.id,
      intent: scenario.intent,
      ownerContent: scenario.owner,
      now: NOW,
      live,
      strategy: traced.trace,
      unsplashConnected: false,
      pexelsConnected: false,
    });
    const goal = trace.transformations.find((t) => t.field === "primary goal");
    expect(goal?.status).toBe("DEGRADED");
    expect(String(goal?.input)).toBe("bookings");
    expect(String(goal?.output)).toBe("leads");
  });
});
