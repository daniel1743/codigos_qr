/**
 * CRIPQER_SMART_PAGES_VISUAL_GENERATION_FORENSIC_TRACE_V1
 *
 * READ-ONLY forensic trace harness. It runs three deliberately different
 * businesses through the REAL production chain (onboarding intent ->
 * PageGenerationRequest -> PagePlanV1 -> host mapping -> PAGES_7 ->
 * Engine V2 -> BioTemplateConfig) and captures every intermediate contract.
 *
 * It never mocks a pure function, never touches the DB, never persists
 * production state, and never changes production behavior. It only writes
 * redacted JSON evidence to `cripqer-generation-forensic-trace/`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { resolveEngineContext } from "@/lib/parametric-engine-v2/context";
import { normalizeBusinessCategory, normalizeIntent } from "@/lib/parametric-engine-v2/normalize";
import {
  generatePowerEditorCandidates,
  normalizeContent,
} from "@/lib/parametric-engine-v2/power-editor";
import type { ContentSourceV2 } from "@/lib/parametric-engine-v2/power-editor/content-source";
import { buildDesignProfile } from "@/lib/parametric-engine-v2/strategy";
import type {
  OnboardingIntentV1,
  PrimaryGoal,
  VisualPersonality,
} from "@/lib/parametric-engine-v2/types";
import { generatePagePlan } from "@/lib/smart-pages/page-orchestrator";
import {
  generateSmartPageFromOnboarding,
  mapOnboardingIntentV2ToSmartPagesRequest,
} from "../smart-pages-adapter";
import type { OwnerContentInput } from "@/lib/page-generator/owner-content";
import type { OnboardingIntentV2 } from "../types";

const NOW = "2026-09-15T12:00:00.000Z";
const OUT_DIR = join(process.cwd(), "cripqer-generation-forensic-trace");

const image = (url: string) => ({ url, kind: "image" as const });

/* ------------------------------------------------------------------ */
/* Scenario fixtures (T1 onboarding intent + T2 owner content)          */
/* ------------------------------------------------------------------ */

function makeIntent(overrides: Partial<OnboardingIntentV2> = {}): OnboardingIntentV2 {
  return {
    version: "2",
    identity: { displayName: "Business", professionOrActivity: "activity", bio: "" },
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

const SCENARIOS = {
  A: {
    id: "SERVICE_BOOKING",
    intent: makeIntent({
      identity: {
        displayName: "Studio Aura",
        professionOrActivity: "Peluquería y belleza",
        bio: "Peluquería y belleza con atención personalizada.",
      },
      business: { category: "beauty", customCategory: "Peluquería y belleza" },
      outcome: { primaryGoal: "bookings", experienceHint: "service_page" },
      contentNeeds: { items: [{ type: "services" }, { type: "booking" }, { type: "contact" }] },
      actions: { primary: { type: "whatsapp", source: "user" }, secondary: [] },
      scope: { density: "complete", userSelected: true },
    }),
    ownerContent: {
      identity: { businessName: "Studio Aura", shortDescription: "Peluquería y belleza" },
      services: [
        { name: "Corte y peinado", price: "$18.000" },
        { name: "Coloración", price: "$35.000" },
      ],
      contact: { whatsapp: "+56911112222" },
    } satisfies OwnerContentInput,
  },
  B: {
    id: "RETAIL_CATALOG",
    intent: makeIntent({
      identity: {
        displayName: "Norte Concept",
        professionOrActivity: "Tienda de ropa",
        bio: "Ropa urbana con identidad propia.",
      },
      business: { category: "retail", customCategory: "Tienda de ropa" },
      outcome: { primaryGoal: "sell", experienceHint: "catalog" },
      contentNeeds: { items: [{ type: "products" }, { type: "contact" }] },
      actions: { primary: { type: "whatsapp", source: "user" }, secondary: [] },
      scope: { density: "complete", userSelected: true },
    }),
    ownerContent: {
      identity: { businessName: "Norte Concept", shortDescription: "Tienda de ropa" },
      products: [
        {
          name: "Chaqueta Urbana",
          price: "$49.990",
          media: [image("https://cdn.example/chaqueta.jpg")],
          destination: "https://store.example/chaqueta",
        },
        {
          name: "Polera Essential",
          price: "$19.990",
          media: [image("https://cdn.example/polera.jpg")],
          destination: "https://store.example/polera",
        },
      ],
      contact: { whatsapp: "+56933334444" },
      media: { cover: image("https://cdn.example/norte-cover.jpg") },
    } satisfies OwnerContentInput,
  },
  C: {
    id: "CREATIVE_PORTFOLIO",
    intent: makeIntent({
      identity: {
        displayName: "Luz Norte",
        professionOrActivity: "Fotografía",
        bio: "Fotografía editorial y retratos urbanos.",
      },
      business: { category: "creator", customCategory: "Fotografía" },
      outcome: { primaryGoal: "show_portfolio", experienceHint: "professional_landing" },
      contentNeeds: { items: [{ type: "portfolio" }, { type: "contact" }] },
      actions: {
        primary: { type: "website", source: "user", value: "https://luznorte.example" },
        secondary: [],
      },
      scope: { density: "complete", userSelected: true },
    }),
    ownerContent: {
      identity: { businessName: "Luz Norte", shortDescription: "Fotografía" },
      portfolioItems: [
        {
          name: "Editorial Nocturna",
          media: [image("https://cdn.example/nocturna.jpg")],
          destination: "https://luznorte.example/nocturna",
        },
        {
          name: "Retratos Urbanos",
          media: [image("https://cdn.example/urbanos.jpg")],
          destination: "https://luznorte.example/urbanos",
        },
      ],
      media: { cover: image("https://cdn.example/luz-cover.jpg") },
      contact: { whatsapp: "+56955556666" },
    } satisfies OwnerContentInput,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Engine V1 intent reconstruction (trace-only replica of the engine's  */
/* private `toEngineIntent`/`contentFor`/`actionFor` seam) so we can      */
/* read the SAME pure recipe functions the engine uses, without any      */
/* production change. It is cross-checked against the real result.       */
/* ------------------------------------------------------------------ */

function normalized(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function visualPersonalityForTrace(style: string | undefined): VisualPersonality {
  const value = normalized(style);
  if (value.includes("minimal")) return "minimal";
  if (value.includes("elegant")) return "elegant";
  if (value.includes("luxury") || value.includes("premium") || value.includes("dark"))
    return "premium";
  if (value.includes("energetic")) return "energetic";
  if (value.includes("modern") || value.includes("creative") || value.includes("natural"))
    return "modern";
  return "professional";
}

function primaryGoalForTrace(goal: string): PrimaryGoal {
  const value = normalized(goal);
  if (value.includes("whatsapp")) return "whatsapp";
  if (value.includes("book") || value.includes("reserv") || value.includes("agenda"))
    return "booking";
  if (value.includes("sell") || value.includes("venta") || value.includes("shop")) return "sell";
  if (value.includes("portfolio") || value.includes("work") || value.includes("trabajo"))
    return "portfolio";
  if (value.includes("social") || value.includes("follow")) return "social";
  return "leads";
}

interface TraceHostInput {
  profession: string;
  businessOther?: string | null;
  goal: string;
  style?: string;
  selectedFeatures?: string[];
  cardMedia?: boolean;
  content?: { name?: string; bio?: string; links?: { label: string; url: string }[] };
  userMedia?: { avatarUrl?: string; bannerUrl?: string };
  primaryAction?: { type: string; value: string };
}

function toEngineIntentForTrace(
  input: TraceHostInput,
  content: ContentSourceV2,
  now: string,
): OnboardingIntentV1 {
  const profession = input.profession.trim();
  const name = input.content?.name?.trim() || profession;
  const bio = input.content?.bio?.trim() || `${name} — ${profession}`;
  const selectedFeatures = (input.selectedFeatures ?? []).map(normalized);
  const hasCardMedia =
    input.cardMedia === true ||
    selectedFeatures.some((f) =>
      ["gallery", "portfolio", "media-card", "image", "video"].includes(f),
    );
  const action = input.primaryAction
    ? {
        type: input.primaryAction.type as OnboardingIntentV1["primary_action"]["type"],
        value: input.primaryAction.value,
      }
    : content.links?.[0]
      ? { type: "website" as const, value: content.links[0].url }
      : null;

  return {
    business_type: profession,
    business_other: input.businessOther?.trim() || null,
    primary_goal: primaryGoalForTrace(input.goal),
    visual_personality: visualPersonalityForTrace(input.style),
    identity: {
      name,
      profession,
      bio,
      avatar_preview: input.userMedia?.avatarUrl?.trim() || null,
      ...(input.userMedia?.bannerUrl ? { banner_preview: input.userMedia.bannerUrl.trim() } : {}),
    },
    ...(hasCardMedia ? { assets: { card_media: true } } : {}),
    ...(action ? { primary_action: action } : {}),
    meta: { version: "1", completed_at: now },
  };
}

function contentForTrace(
  input: { content?: { bio?: string; links?: { label: string; url: string }[] } },
  contentBlocks?: Partial<ContentSourceV2>,
): ContentSourceV2 {
  const links = input.content?.links
    ?.map((link) => ({ label: link.label, url: link.url }))
    .filter((link) => link.label.trim() && link.url.trim());
  return normalizeContent({
    ...(contentBlocks ?? {}),
    ...(input.content?.bio?.trim() ? { about: input.content.bio } : {}),
    ...(links?.length ? { links } : {}),
  });
}

/* ------------------------------------------------------------------ */

type ScenarioKey = keyof typeof SCENARIOS;

function traceScenario(key: ScenarioKey) {
  const scenario = SCENARIOS[key];
  const intent = scenario.intent as OnboardingIntentV2;
  const ownerContent = scenario.ownerContent as OwnerContentInput;

  // T3 — onboarding -> PageGenerationRequest
  const mapped = mapOnboardingIntentV2ToSmartPagesRequest(intent, { ownerContent });
  if (!mapped.ok) throw new Error(`scenario ${key}: mapping failed: ${mapped.errors.join("; ")}`);
  const request = mapped.request;

  // T4 — PagePlanV1
  const plan = generatePagePlan(request);

  // T5-T9 — full real chain through host map + PAGES_7 + Engine V2 + validator
  const generated = generateSmartPageFromOnboarding(intent, { ownerContent, now: NOW });
  if (!generated.ok) {
    throw new Error(`scenario ${key}: generation failed: ${generated.errors.join("; ")}`);
  }
  const mapping = generated.mapping;
  const adapter = mapping.adapter;
  const editorConfig = generated.result.editorConfig;
  const generation = generated.result.generation;

  // T8 — enriched recipe evidence via the SAME pure engine functions.
  const content = contentForTrace(
    { content: adapter.engineInput.content },
    adapter.contentBlocks ?? undefined,
  );
  const v1intent = toEngineIntentForTrace(adapter.engineInput, content, NOW);
  const normalizedIntent = normalizeIntent(v1intent);
  const profile = buildDesignProfile(normalizedIntent, 0);
  const ctx = resolveEngineContext(normalizedIntent);
  const candidate = generatePowerEditorCandidates(v1intent, {
    count: 1,
    content,
    ...(adapter.engineOptions ?? {}),
  })[0];

  const config = editorConfig;
  const tags = config.metadata?.tags ?? [];

  return {
    id: scenario.id,
    T1_intent: {
      identity: intent.identity,
      business: intent.business,
      outcome: intent.outcome,
      visualDirection: intent.visualDirection,
      contentNeeds: intent.contentNeeds,
      actions: intent.actions,
      scope: intent.scope,
    },
    T2_ownerContent: ownerContent,
    T3_pageGenerationRequest: {
      businessType: request.businessType,
      goal: request.goal,
      density: request.density,
      salesMode: request.salesMode,
      experienceType: request.preferences?.experienceType,
      primaryAction: request.primaryAction,
      secondaryActions: request.secondaryActions,
      catalogs: request.content.catalogs.map((c) => ({
        kind: c.kind,
        itemCount: c.items.length,
        items: c.items.map((i) => ({ name: i.name, price: i.price, mediaCount: i.media.length })),
      })),
      contact: request.content.contact,
      mappedFields: mapped.diagnostics.mappedFields,
      deferredFields: mapped.diagnostics.deferredFields,
      unsupportedFields: mapped.diagnostics.unsupportedFields,
    },
    T4_pagePlan: {
      pageId: plan.pageId,
      experienceType: plan.experienceType,
      heroVariant: plan.heroVariant,
      sections: plan.sections.map((s) => ({ kind: s.kind, order: s.order, title: s.title })),
      ctaHierarchy: {
        primary: plan.ctaHierarchy.primary,
        secondary: plan.ctaHierarchy.secondary,
      },
      runtimeRequirements: plan.runtimeRequirements,
    },
    T5_hostMapping: {
      mappedFields: mapping.diagnostics.mappedFields,
      deferredFields: mapping.diagnostics.deferredFields,
      unsupportedFields: mapping.diagnostics.unsupportedFields,
      warnings: mapping.diagnostics.warnings,
    },
    T6_generatedPageInput: {
      objective: mapping.generatedPageInput.objective,
      title: mapping.generatedPageInput.title,
      businessName: mapping.generatedPageInput.businessName,
      activity: mapping.generatedPageInput.activity,
      style: mapping.generatedPageInput.style,
      coverImageUrl: mapping.generatedPageInput.coverImageUrl,
      cta: mapping.generatedPageInput.cta,
      items: mapping.generatedPageInput.items,
    },
    T7_engineInput: {
      profession: adapter.engineInput.profession,
      businessOther: adapter.engineInput.businessOther,
      goal: adapter.engineInput.goal,
      style: adapter.engineInput.style,
      selectedFeatures: adapter.engineInput.selectedFeatures,
      cardMedia: adapter.engineInput.cardMedia,
      content: adapter.engineInput.content,
      primaryAction: adapter.engineInput.primaryAction,
      userMedia: adapter.engineInput.userMedia,
      contentBlocks: adapter.contentBlocks,
      engineOptions: adapter.engineOptions,
      adapterMapped: adapter.diagnostics.mappedFields,
      adapterDeferred: adapter.diagnostics.deferredFields,
      adapterUnsupported: adapter.diagnostics.unsupportedFields,
    },
    T8_engineDecisions: {
      businessCategory: normalizeBusinessCategory(v1intent.business_type),
      archetype: ctx.signals.archetype,
      conversionMode: ctx.signals.conversion_mode,
      proofPriority: ctx.signals.proof_priority,
      priceModel: ctx.signals.price_model,
      visualPersonality: v1intent.visual_personality,
      primaryGoal: v1intent.primary_goal,
      familyScores: profile.family_scores,
      baselineFamily: profile.family,
      selectedFamily: generation.family,
      selectedLayout: generation.layout,
      candidateId: generation.candidateId,
      score: generation.score,
      fingerprint: generation.fingerprint,
      pattern: candidate?.recipe.semantics.pattern ?? tags[1] ?? null,
      preset: candidate?.recipe.meta.preset ?? null,
      mediaStrategy: candidate?.recipe.semantics.media_strategy ?? null,
      recipeFamily: candidate?.recipe.semantics.family ?? null,
      visual: candidate?.recipe.visual ?? null,
    },
    T9_bioTemplateConfig: {
      schemaVersion: config.schemaVersion,
      templateDefinitionId: config.templateDefinitionId,
      metadata: config.metadata,
      theme: config.theme,
      layoutId: config.layout?.id,
      layoutHeader: config.layout?.header,
      profile: {
        name: config.profile?.name,
        role: config.profile?.role,
        verified: config.profile?.verified,
      },
      blocks: config.blocks?.map((b) => ({
        type: b.type,
        variant: b.variant,
        contentKeys: b.content ? Object.keys(b.content) : [],
      })),
      motion: config.motion,
    },
    T10_renderSummary: {
      blockTypes: (config.blocks ?? []).map((b) => b.type),
      themeColors: config.theme?.colors,
      themeTypography: config.theme?.typography,
      themeBackground: config.theme?.background,
      themeCards: config.theme?.cards,
      themeButtons: config.theme?.buttons,
      validation: validateTemplate(config),
    },
  };
}

describe("CRIPQER forensic trace — three businesses through the full generation chain", () => {
  it("captures deterministic intermediate values for A/B/C and writes evidence", () => {
    mkdirSync(OUT_DIR, { recursive: true });

    const snapshots: Record<string, unknown> = {};
    const summaries: Record<string, unknown> = {};

    for (const key of ["A", "B", "C"] as const) {
      const trace = traceScenario(key);
      snapshots[`scenario-${key}`] = trace;
      writeFileSync(join(OUT_DIR, `scenario-${key}.json`), JSON.stringify(trace, null, 2), "utf8");
      summaries[key] = {
        id: trace.id,
        businessType: trace.T3_pageGenerationRequest.businessType,
        goal: trace.T3_pageGenerationRequest.goal,
        experienceType: trace.T4_pagePlan.experienceType,
        planSections: trace.T4_pagePlan.sections,
        objective: trace.T6_generatedPageInput.objective,
        archetype: trace.T8_engineDecisions.archetype,
        businessCategory: trace.T8_engineDecisions.businessCategory,
        baselineFamily: trace.T8_engineDecisions.baselineFamily,
        selectedFamily: trace.T8_engineDecisions.selectedFamily,
        layout: trace.T8_engineDecisions.selectedLayout,
        pattern: trace.T8_engineDecisions.pattern,
        preset: trace.T8_engineDecisions.preset,
        mediaStrategy: trace.T8_engineDecisions.mediaStrategy,
        familyScores: trace.T8_engineDecisions.familyScores,
        blockTypes: trace.T10_renderSummary.blockTypes,
        themeColors: trace.T10_renderSummary.themeColors,
        typography: trace.T10_renderSummary.themeTypography,
      };
    }

    writeFileSync(
      join(OUT_DIR, "summary.json"),
      JSON.stringify({ now: NOW, scenarios: summaries }, null, 2),
      "utf8",
    );

    // eslint-disable-next-line no-console
    console.log("FORENSIC_TRACE_SUMMARY=" + JSON.stringify(summaries, null, 2));

    // Success gate: all three must generate a valid canonical page.
    for (const key of ["A", "B", "C"] as const) {
      const trace = snapshots[`scenario-${key}`] as ReturnType<typeof traceScenario>;
      expect(trace.T10_renderSummary.validation.valid).toBe(true);
      expect(trace.T9_bioTemplateConfig.blocks.length).toBeGreaterThan(0);
    }
    expect(true).toBe(true);
  });
});
