import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PublicTemplateRenderer } from "@/premium-template-studio/engine/PublicTemplateRenderer";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { SIMPLE_CONTACT_FIXTURE } from "@/lib/onboarding-v2/fixtures";
import {
  mapOnboardingIntentV2ToSmartPagesRequest,
  generateSmartPageFromOnboarding,
} from "@/lib/onboarding-v2/smart-pages-adapter";
import type { OnboardingIntentV2 } from "@/lib/onboarding-v2/types";
import { mapSmartPageToEngineInput } from "@/lib/page-generator/smart-pages-host-map";
import { generatePowerEditorTemplate } from "@/lib/parametric-engine-v2/power-editor";
import type {
  OnboardingIntentV1,
  PrimaryActionType,
  PrimaryGoal,
  VisualPersonality,
} from "@/lib/parametric-engine-v2/types";
import { generatePagePlan } from "@/lib/smart-pages/page-orchestrator";
import type { OwnerContentInput } from "@/lib/page-generator/owner-content";

const NOW = "2026-09-15T12:00:00.000Z";
const image = (url: string, alt: string) => ({ url, alt, kind: "image" as const });

function hostToEngineV1(
  input: ReturnType<typeof mapSmartPageToEngineInput> extends infer T
    ? T extends { ok: true }
      ? T["adapter"]["engineInput"]
      : never
    : never,
): OnboardingIntentV1 {
  const profession = input.profession.trim();
  const value = input.goal.trim().toLowerCase();
  const goal: PrimaryGoal = value.includes("whatsapp")
    ? "whatsapp"
    : value.includes("book") || value.includes("reserv") || value.includes("agenda")
      ? "booking"
      : value.includes("sell") || value.includes("venta") || value.includes("shop")
        ? "sell"
        : value.includes("portfolio") || value.includes("work") || value.includes("trabajo")
          ? "portfolio"
          : value.includes("social") || value.includes("follow")
            ? "social"
            : "leads";
  const style = input.style?.trim().toLowerCase() ?? "";
  const visual_personality: VisualPersonality = style.includes("minimal")
    ? "minimal"
    : style.includes("elegant")
      ? "elegant"
      : style.includes("luxury") || style.includes("premium") || style.includes("dark")
        ? "premium"
        : style.includes("energetic")
          ? "energetic"
          : style.includes("modern") || style.includes("creative") || style.includes("natural")
            ? "modern"
            : "professional";
  const name = input.content?.name?.trim() || profession;
  const hasCardMedia =
    input.cardMedia === true ||
    input.selectedFeatures?.some((feature) =>
      ["gallery", "portfolio", "media-card", "image", "video"].includes(feature),
    );
  const action = input.primaryAction;
  const primaryAction = action
    ? ({ type: action.type as PrimaryActionType, value: action.value } as const)
    : undefined;
  return {
    business_type: profession,
    business_other: input.businessOther?.trim() || null,
    primary_goal: goal,
    visual_personality,
    identity: {
      name,
      profession,
      bio: input.content?.bio?.trim() || `${name} — ${profession}`,
      avatar_preview: input.userMedia?.avatarUrl?.trim() || null,
      ...(input.userMedia?.bannerUrl ? { banner_preview: input.userMedia.bannerUrl.trim() } : {}),
    },
    ...(hasCardMedia ? { assets: { card_media: true } } : {}),
    ...(primaryAction ? { primary_action: primaryAction } : {}),
    meta: { version: "1", completed_at: NOW },
  } as OnboardingIntentV1;
}

type Scenario = {
  id: string;
  intent: OnboardingIntentV2;
  ownerContent: OwnerContentInput;
};

function scenarioIntent(
  overrides: Partial<OnboardingIntentV2> &
    Pick<OnboardingIntentV2, "identity" | "business" | "outcome" | "visualDirection">,
): OnboardingIntentV2 {
  return {
    ...SIMPLE_CONTACT_FIXTURE,
    identity: overrides.identity,
    business: overrides.business,
    outcome: overrides.outcome,
    visualDirection: overrides.visualDirection,
    contentNeeds: overrides.contentNeeds ?? { items: [] },
    actions: overrides.actions ?? { primary: null, secondary: [] },
    media: overrides.media ?? { preference: "own_media" },
    scope: overrides.scope ?? { density: "complete", userSelected: true },
    commercial: overrides.commercial,
    ownerContent: overrides.ownerContent,
    meta: { ...SIMPLE_CONTACT_FIXTURE.meta, completedAt: NOW },
  };
}

const scenarios: Scenario[] = [
  {
    id: "scenario-A-service-booking",
    intent: scenarioIntent({
      identity: {
        ...SIMPLE_CONTACT_FIXTURE.identity,
        displayName: "Studio Aura",
        professionOrActivity: "Peluquería y belleza",
        bio: "Cuidado, estilo y atención personalizada.",
      },
      business: { category: "beauty" },
      outcome: { primaryGoal: "bookings", experienceHint: "service_page" },
      visualDirection: { preference: "elegant" },
      actions: { primary: { type: "whatsapp", source: "user" }, secondary: [] },
      contentNeeds: { items: [{ type: "services" }, { type: "booking" }] },
      ownerContent: {
        identity: {
          businessName: "Studio Aura",
          shortDescription: "Cuidado, estilo y atención personalizada.",
        },
        services: [
          { name: "Corte y peinado", price: "$18.000" },
          { name: "Coloración", price: "$35.000" },
        ],
        contact: { whatsapp: "+56912345678" },
      },
    }),
    ownerContent: {
      identity: {
        businessName: "Studio Aura",
        shortDescription: "Cuidado, estilo y atención personalizada.",
      },
      services: [
        { name: "Corte y peinado", price: "$18.000" },
        { name: "Coloración", price: "$35.000" },
      ],
      contact: { whatsapp: "+56912345678" },
    },
  },
  {
    id: "scenario-B-retail-catalog",
    intent: scenarioIntent({
      identity: {
        ...SIMPLE_CONTACT_FIXTURE.identity,
        displayName: "Norte Concept",
        professionOrActivity: "Tienda de ropa",
        bio: "Prendas esenciales para todos los días.",
      },
      business: { category: "retail" },
      outcome: { primaryGoal: "sell", experienceHint: "catalog" },
      visualDirection: { preference: "modern" },
      actions: {
        primary: { type: "website", source: "user", value: "https://norte.example/shop" },
        secondary: [],
      },
      contentNeeds: { items: [{ type: "products" }] },
      ownerContent: {
        identity: {
          businessName: "Norte Concept",
          shortDescription: "Prendas esenciales para todos los días.",
        },
        products: [
          {
            name: "Chaqueta Urbana",
            price: "$49.990",
            media: [image("https://cdn.example/jacket.jpg", "Chaqueta Urbana")],
            destination: "https://norte.example/jacket",
          },
          {
            name: "Polera Essential",
            price: "$19.990",
            media: [image("https://cdn.example/shirt.jpg", "Polera Essential")],
            destination: "https://norte.example/shirt",
          },
        ],
        contact: { externalUrl: "https://norte.example/shop" },
        media: { cover: image("https://cdn.example/norte-cover.jpg", "Norte Concept") },
      },
    }),
    ownerContent: {
      identity: {
        businessName: "Norte Concept",
        shortDescription: "Prendas esenciales para todos los días.",
      },
      products: [
        {
          name: "Chaqueta Urbana",
          price: "$49.990",
          media: [image("https://cdn.example/jacket.jpg", "Chaqueta Urbana")],
          destination: "https://norte.example/jacket",
        },
        {
          name: "Polera Essential",
          price: "$19.990",
          media: [image("https://cdn.example/shirt.jpg", "Polera Essential")],
          destination: "https://norte.example/shirt",
        },
      ],
      contact: { externalUrl: "https://norte.example/shop" },
      media: { cover: image("https://cdn.example/norte-cover.jpg", "Norte Concept") },
    },
  },
  {
    id: "scenario-C-creative-portfolio",
    intent: scenarioIntent({
      identity: {
        ...SIMPLE_CONTACT_FIXTURE.identity,
        displayName: "Luz Norte",
        professionOrActivity: "Fotografía",
        bio: "Historias visuales con luz y carácter.",
      },
      business: { category: "creator" },
      outcome: { primaryGoal: "show_portfolio", experienceHint: "professional_landing" },
      visualDirection: { preference: "premium" },
      actions: { primary: null, secondary: [] },
      contentNeeds: { items: [{ type: "portfolio" }] },
      ownerContent: {
        identity: {
          businessName: "Luz Norte",
          shortDescription: "Historias visuales con luz y carácter.",
        },
        portfolioItems: [
          {
            name: "Editorial Nocturna",
            media: [image("https://cdn.example/night.jpg", "Editorial Nocturna")],
            destination: "https://luz.example/night",
          },
          {
            name: "Retratos Urbanos",
            media: [image("https://cdn.example/urban.jpg", "Retratos Urbanos")],
            destination: "https://luz.example/urban",
          },
        ],
        media: { cover: image("https://cdn.example/luz-cover.jpg", "Luz Norte") },
      },
    }),
    ownerContent: {
      identity: {
        businessName: "Luz Norte",
        shortDescription: "Historias visuales con luz y carácter.",
      },
      portfolioItems: [
        {
          name: "Editorial Nocturna",
          media: [image("https://cdn.example/night.jpg", "Editorial Nocturna")],
          destination: "https://luz.example/night",
        },
        {
          name: "Retratos Urbanos",
          media: [image("https://cdn.example/urban.jpg", "Retratos Urbanos")],
          destination: "https://luz.example/urban",
        },
      ],
      media: { cover: image("https://cdn.example/luz-cover.jpg", "Luz Norte") },
    },
  },
];

describe("SMART_PAGES_VISUAL_GENERATION_FORENSIC_TRACE_V1", () => {
  it("captures the real current chain for three materially different businesses", () => {
    const snapshots = scenarios.map((scenario) => {
      const t1 = scenario.intent;
      const mapped = mapOnboardingIntentV2ToSmartPagesRequest(t1, {
        ownerContent: scenario.ownerContent,
      });
      expect(mapped.ok).toBe(true);
      if (!mapped.ok) throw new Error(mapped.errors.join("; "));

      const t3 = mapped.request;
      const t4 = generatePagePlan(t3);
      const t5 = mapSmartPageToEngineInput(t3, { now: NOW }, t4);
      expect(t5.ok).toBe(true);
      if (!t5.ok) throw new Error(t5.errors.join("; "));

      const t6 = t5.generatedPageInput;
      const t7 = t5.adapter.engineInput;
      const generated = generateSmartPageFromOnboarding(t1, {
        ownerContent: scenario.ownerContent,
        now: NOW,
      });
      expect(generated.ok).toBe(true);
      if (!generated.ok) throw new Error(generated.errors.join("; "));
      const config = generated.result.editorConfig;
      const engineV1 = hostToEngineV1(t7);
      const candidate = generatePowerEditorTemplate(engineV1, {
        now: NOW,
        ...(t5.adapter.contentBlocks ? { content: t5.adapter.contentBlocks } : {}),
        ...(t5.adapter.engineOptions ? { ...t5.adapter.engineOptions } : {}),
      });
      expect(candidate).not.toBeNull();
      if (!candidate) throw new Error("No Engine V2 candidate from trace input.");
      const validation = validateTemplate(config);
      expect(validation.valid).toBe(true);

      const rendered = renderToStaticMarkup(
        createElement(PublicTemplateRenderer, { config, breakpoint: "desktop" }),
      );
      const renderedBlockIds = [...rendered.matchAll(/data-block-id="([^"]+)"/g)].map((m) => m[1]);

      return {
        id: scenario.id,
        T1_OnboardingIntent: t1,
        T2_OwnerContent: scenario.ownerContent,
        T3_PageGenerationRequest: t3,
        T4_PagePlan: t4,
        T5_HostMapping: { generatedPageInput: t6, diagnostics: t5.diagnostics },
        T6_GeneratedPageInput: t6,
        T7_EngineInput: t7,
        T7_EngineContentBlocks: t5.adapter.contentBlocks,
        T7_EngineOptions: t5.adapter.engineOptions,
        T7_EngineV1InternalEquivalent: engineV1,
        T8_EngineDecisions: {
          candidateId: generated.result.generation.candidateId,
          score: generated.result.generation.score,
          family: generated.result.generation.family,
          layout: generated.result.generation.layout,
          fingerprint: generated.result.generation.fingerprint,
          recipeMeta: candidate.recipe.meta,
          semantics: candidate.recipe.semantics,
          visual: candidate.recipe.visual,
          responsive: candidate.recipe.structure.responsive,
          blockPlan: candidate.recipe.structure.blocks,
        },
        T9_BioTemplateConfig: config,
        T10_Render: {
          valid: validation.valid,
          renderedBlockIds,
          renderedSectionCount: (rendered.match(/<section/g) ?? []).length,
          renderedMarkupLength: rendered.length,
          staticMarkup: rendered,
          containsBusinessName: rendered.includes(config.profile.name),
          containsOwnerItemNames:
            scenario.ownerContent.services
              ?.concat(
                scenario.ownerContent.products ?? [],
                scenario.ownerContent.portfolioItems ?? [],
              )
              .every((item) => rendered.includes(item.name)) ?? true,
        },
      };
    });

    mkdirSync("cripqer-generation-forensic-trace", { recursive: true });
    for (const snapshot of snapshots) {
      writeFileSync(
        join("cripqer-generation-forensic-trace", `${snapshot.id}.json`),
        JSON.stringify(snapshot, (key, value) => (key === "staticMarkup" ? undefined : value), 2),
      );
      writeFileSync(
        join("cripqer-generation-forensic-trace", `${snapshot.id}.html`),
        `<!doctype html><html><head><meta charset="utf-8"><style>${readFileSync("src/premium-template-studio/styles/studio.css", "utf8")}</style></head><body>${snapshot.T10_Render.staticMarkup}</body></html>`,
      );
    }
    writeFileSync(
      join("cripqer-generation-forensic-trace", "summary.json"),
      JSON.stringify(
        {
          generatedAt: NOW,
          scenarios: snapshots.map((s) => ({
            id: s.id,
            experience: s.T4_PagePlan.experienceType,
            sections: s.T4_PagePlan.sections.map((section) => section.kind),
            objective: s.T6_GeneratedPageInput.objective,
            engineInput: s.T7_EngineInput,
            family: s.T8_EngineDecisions.family,
            layout: s.T8_EngineDecisions.layout,
            theme: s.T9_BioTemplateConfig.theme,
            profile: s.T9_BioTemplateConfig.profile,
            blockTypes: s.T9_BioTemplateConfig.blocks.map((block) => block.type),
            render: s.T10_Render,
          })),
        },
        null,
        2,
      ),
    );
  });
});
