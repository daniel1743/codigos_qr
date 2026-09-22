/**
 * QA-only generation trace recorder. Assembles a GenerationTraceV1 from the
 * REAL values captured at each generation boundary. Pure and deterministic; it
 * never re-runs or changes generation — it only classifies what already ran.
 */

import type { OwnerContentInput } from "@/lib/page-generator/owner-content";
import type { OnboardingIntentV2 } from "@/lib/onboarding-v2/types";
import type { OnboardingSmartPagesGenerationResult } from "@/lib/onboarding-v2/smart-pages-adapter";
import type { EngineV2StrategyTrace } from "@/lib/parametric-engine-v2/internal-entrypoint";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import {
  classifyBusinessCategory,
  classifyGoal,
  classifyPersonality,
  classifyTransformation,
  reauthored,
} from "./classify";
import { buildAutoDiagnosis, buildMediaDiagnostic, buildSummary } from "./diagnose";
import type {
  EngineStrategySnapshotV1,
  GenerationTraceV1,
  TraceStageV1,
  TransformationV1,
  VisualAuthoringSnapshotV1,
} from "./types";

interface BuildInput {
  traceId: string;
  scenarioId: string;
  intent: OnboardingIntentV2;
  ownerContent: OwnerContentInput;
  now: string;
  live: OnboardingSmartPagesGenerationResult;
  strategy: EngineV2StrategyTrace | null;
  unsplashConnected: boolean;
  pexelsConnected: boolean;
}

/* ------------------------------------------------------------ sanitizers */

function identitySummary(intent: OnboardingIntentV2) {
  return {
    displayName: intent.identity.displayName,
    professionOrActivity: intent.identity.professionOrActivity,
    bio: intent.identity.bio,
  };
}

function ownerSummary(ownerContent: OwnerContentInput) {
  return {
    identity: ownerContent.identity,
    services: ownerContent.services?.length ?? 0,
    products: ownerContent.products?.length ?? 0,
    menuItems: ownerContent.menuItems?.length ?? 0,
    portfolioItems: ownerContent.portfolioItems?.length ?? 0,
    events: ownerContent.events?.length ?? 0,
    contact: ownerContent.contact,
    hasAvatar: Boolean(ownerContent.media?.avatar),
    hasCover: Boolean(ownerContent.media?.cover),
  };
}

function planSummary(
  plan: NonNullable<Extract<OnboardingSmartPagesGenerationResult, { ok: true }>["plan"]>,
) {
  return {
    experienceType: plan.experienceType,
    heroVariant: plan.heroVariant,
    sections: plan.sections.map((s) => ({ kind: s.kind, order: s.order })),
    primaryCta: plan.ctaHierarchy.primary,
  };
}

/* ------------------------------------------------------------ engine */

function subtractScores(
  scores: Record<string, number>,
  bias: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [family, value] of Object.entries(scores)) {
    out[family] = value - (bias[family] ?? 0);
  }
  return out;
}

export function buildEngineSnapshot(
  strategy: EngineV2StrategyTrace | null,
): EngineStrategySnapshotV1 | null {
  if (!strategy) return null;
  return {
    businessCategory: strategy.normalized.businessCategory,
    visualPersonality: strategy.normalized.visualPersonality,
    primaryGoal: strategy.normalized.primaryGoal,
    archetype: strategy.archetype,
    familyBias: { ...strategy.familyBias },
    familyScores: { ...strategy.familyScores },
    familyScoresBeforeBias: subtractScores(strategy.familyScores, strategy.familyBias),
    selectedFamily: strategy.selectedFamily,
    layout: strategy.recipe.layout.id,
    pattern: strategy.recipe.semantics.pattern,
    preset: strategy.recipe.meta.preset,
    mediaStrategy: strategy.recipe.semantics.media_strategy,
    score: strategy.recipe.meta.quality.total,
    candidateId: strategy.recipe.meta.candidate_id,
    fingerprint: strategy.recipe.meta.fingerprint,
  };
}

export function buildVisualSnapshot(
  strategy: EngineV2StrategyTrace | null,
): VisualAuthoringSnapshotV1 | null {
  if (!strategy) return null;
  const recipe = strategy.recipe;
  const skipped = recipe.capabilities_skipped ?? [];
  const used = recipe.capabilities_used ?? [];
  return {
    family: recipe.semantics.family,
    typography: recipe.visual.typography as unknown as Record<string, unknown>,
    colors: recipe.visual.colors as unknown as Record<string, unknown>,
    background: recipe.visual.background as unknown as Record<string, unknown>,
    cards: recipe.visual.cards as unknown as Record<string, unknown>,
    buttons: recipe.visual.buttons as unknown as Record<string, unknown>,
    spacing: recipe.visual.spacing as unknown as Record<string, unknown>,
    motion: recipe.visual.motion as unknown as Record<string, unknown>,
    texture: recipe.visual.texture as unknown as Record<string, unknown>,
    selected: used,
    notSelected: skipped
      .filter((s) => !s.reason.includes("not_supported_by_renderer"))
      .map((s) => s.capability),
    unsupported: skipped
      .filter((s) => s.reason.includes("not_supported_by_renderer"))
      .map((s) => s.capability),
    blocks: recipe.structure.blocks.map((b) => ({ type: b.type, variant: b.variant })),
  };
}

/* ------------------------------------------------------ transformations */

function buildTransformations(input: BuildInput): TransformationV1[] {
  const { intent, ownerContent, live, strategy } = input;
  const out: TransformationV1[] = [];
  const mapping = live.ok && live.mapping.ok ? live.mapping : null;
  const engineInput = mapping?.adapter.engineInput;
  const contentBlocks = mapping?.adapter.contentBlocks;
  const request = live.ok ? live.request : null;
  const plan = live.ok ? live.plan : null;
  const config = live.ok ? live.result.editorConfig : null;

  const hasBlock = (key: string) => Boolean(contentBlocks && key in contentBlocks);

  out.push(
    classifyTransformation("business name", intent.identity.displayName, config?.profile?.name),
    classifyTransformation(
      "profession/activity",
      intent.identity.professionOrActivity,
      engineInput?.profession,
    ),
    classifyBusinessCategory(intent.business.category, strategy?.normalized.businessCategory),
    classifyGoal(intent.outcome.primaryGoal, strategy?.normalized.primaryGoal),
    classifyTransformation("experience type", intent.outcome.experienceHint, plan?.experienceType),
    classifyTransformation("sales mode", intent.commercial?.mode, request?.salesMode),
    classifyTransformation("density", intent.scope.density, request?.density),
    classifyPersonality(engineInput?.style, strategy?.normalized.visualPersonality),
    classifyTransformation(
      "content needs",
      intent.contentNeeds.items.map((i) => i.type),
      engineInput?.selectedFeatures,
    ),
    classifyTransformation(
      "services",
      ownerContent.services?.map((s) => s.name) ?? [],
      hasBlock("services") ? (contentBlocks as { services?: unknown[] }).services : undefined,
    ),
    classifyTransformation(
      "products",
      ownerContent.products?.map((p) => p.name) ?? [],
      hasBlock("products") ? (contentBlocks as { products?: unknown[] }).products : undefined,
    ),
    classifyTransformation(
      "portfolio",
      ownerContent.portfolioItems?.map((p) => p.name) ?? [],
      hasBlock("portfolio") ? (contentBlocks as { portfolio?: unknown[] }).portfolio : undefined,
    ),
    classifyTransformation("contact", ownerContent.contact, engineInput?.primaryAction?.value),
    classifyTransformation("owner media", ownerContent.media, engineInput?.userMedia),
    reauthored(
      "section types",
      plan?.sections.map((s) => s.kind),
    ),
    reauthored(
      "section order",
      plan?.sections.map((s) => s.order),
    ),
    reauthored("hero variant", plan?.heroVariant),
    reauthored("CTA position", plan?.ctaHierarchy.primary?.kind),
    strategy
      ? classifyTransformation(
          "archetype",
          intent.identity.professionOrActivity,
          strategy.archetype,
        )
      : classifyTransformation("archetype", intent.identity.professionOrActivity, undefined),
    strategy && Object.keys(strategy.familyBias).length
      ? classifyTransformation("family bias", "applied", "applied")
      : classifyTransformation(
          "family bias",
          "defined",
          undefined,
          "Archetype family_bias was not applied.",
        ),
    reauthored("visual family", strategy?.selectedFamily),
  );

  return out;
}

/* ------------------------------------------------------ stage assembly */

function stage(
  id: TraceStageV1["id"],
  name: string,
  contract: string,
  data: unknown,
  status: TraceStageV1["status"] = "ok",
): TraceStageV1 {
  return { id, name, contract, data, status, fields: [] };
}

export function buildGenerationTrace(input: BuildInput): GenerationTraceV1 {
  const { intent, ownerContent, live, strategy, unsplashConnected, pexelsConnected } = input;
  const engine = buildEngineSnapshot(strategy);
  const visual = buildVisualSnapshot(strategy);
  const transformations = buildTransformations(input);

  const stages: TraceStageV1[] = [];
  stages.push(
    stage("T1", "ONBOARDING INTENT", "OnboardingIntentV2", {
      identity: identitySummary(intent),
      business: intent.business,
      outcome: intent.outcome,
      visualDirection: intent.visualDirection,
      contentNeeds: intent.contentNeeds,
      actions: intent.actions,
      scope: intent.scope,
    }),
    stage("T2", "OWNER CONTENT", "OwnerContentInput", ownerSummary(ownerContent)),
  );

  let failure: GenerationTraceV1["failure"];

  if (!live.ok) {
    if (!live.mapping) {
      stages.push(stage("T3", "SMART PAGES REQUEST", "PageGenerationRequest", null, "failed"));
      failure = {
        stage: "T3",
        stageName: "SMART PAGES REQUEST",
        code: live.code ?? "MAPPING_ERROR",
        message: live.errors[0] ?? "Mapping failed.",
      };
    } else if (!live.mapping.ok) {
      stages.push(stage("T3", "SMART PAGES REQUEST", "PageGenerationRequest", "mapped"));
      stages.push(stage("T5", "HOST MAPPING", "GeneratedPageInput", null, "failed"));
      failure = {
        stage: "T5",
        stageName: "HOST MAPPING",
        code: "HOST_MAPPING_ERROR",
        message: live.errors[0] ?? "Host mapping failed.",
      };
    } else {
      stages.push(stage("T3", "SMART PAGES REQUEST", "PageGenerationRequest", "mapped"));
      stages.push(stage("T4", "PAGE PLAN", "PagePlanV1", planSummary(live.mapping.plan)));
      stages.push(stage("T5", "HOST MAPPING", "GeneratedPageInput", "mapped"));
      stages.push(stage("T6", "PAGES_7 / ENGINE INPUT", "EngineV2HostGenerationInput", "mapped"));
      stages.push(stage("T7", "ENGINE STRATEGY", "EngineV2StrategyTrace", null, "failed"));
      failure = {
        stage: "T7",
        stageName: "ENGINE STRATEGY",
        code: "ENGINE_GENERATION_ERROR",
        message: live.errors[0] ?? "Engine generation failed.",
      };
    }
  } else {
    const mapping = live.mapping;
    if (!mapping.ok) throw new Error("Unexpected mapping failure on a successful generation.");
    const adapter = mapping.adapter;
    stages.push(
      stage("T3", "SMART PAGES REQUEST", "PageGenerationRequest", {
        businessType: live.request.businessType,
        goal: live.request.goal,
        density: live.request.density,
        salesMode: live.request.salesMode,
        experienceType: live.request.preferences?.experienceType,
        primaryAction: live.request.primaryAction,
      }),
      stage("T4", "PAGE PLAN", "PagePlanV1", planSummary(live.plan)),
      stage("T5", "HOST MAPPING", "GeneratedPageInput", {
        objective: mapping.generatedPageInput.objective,
        title: mapping.generatedPageInput.title,
        activity: mapping.generatedPageInput.activity,
        style: mapping.generatedPageInput.style,
        coverImageUrl: mapping.generatedPageInput.coverImageUrl,
        cta: mapping.generatedPageInput.cta,
        itemCount: mapping.generatedPageInput.items.length,
      }),
      stage("T6", "PAGES_7 / ENGINE INPUT", "EngineV2HostGenerationInput", {
        profession: adapter.engineInput.profession,
        goal: adapter.engineInput.goal,
        style: adapter.engineInput.style,
        selectedFeatures: adapter.engineInput.selectedFeatures,
        cardMedia: adapter.engineInput.cardMedia,
        hasUserMedia: Boolean(
          adapter.engineInput.userMedia?.avatarUrl || adapter.engineInput.userMedia?.bannerUrl,
        ),
        contentBlocks: adapter.contentBlocks ? Object.keys(adapter.contentBlocks) : [],
        engineOptions: adapter.engineOptions ?? null,
      }),
      stage("T7", "ENGINE STRATEGY", "EngineV2StrategyTrace", engine),
      stage("T8", "VISUAL AUTHORING", "PowerEditorRecipeV2", visual),
    );

    const validation = validateTemplate(live.result.editorConfig);
    stages.push(
      stage("T9", "CANONICAL OUTPUT", "BioTemplateConfig", {
        schemaVersion: live.result.editorConfig.schemaVersion,
        templateDefinitionId: live.result.editorConfig.templateDefinitionId,
        themeId: live.result.editorConfig.theme?.id,
        layoutId: live.result.editorConfig.layout?.id,
        blockTypes: (live.result.editorConfig.blocks ?? []).map((b) => b.type),
        generation: live.result.generation,
        media: live.result.media,
        validation: { valid: validation.valid, issueCount: validation.issues.length },
      }),
    );
  }

  stages.push(
    stage("T10", "RENDERER", "PublicTemplateRenderer", {
      renderer: "PublicTemplateRenderer → TemplateRenderer",
      appliesTheme: true,
      appliesTypography: true,
      appliesBackground: true,
      appliesCards: true,
      appliesButtons: true,
      appliesMotion: true,
      unsupported: [],
      status: live.ok ? "rendered" : "not-rendered (generation failed)",
    }),
  );

  const media = buildMediaDiagnostic({
    ownerContent,
    hasUserMedia:
      live.ok && live.mapping.ok
        ? Boolean(
            live.mapping.adapter.engineInput.userMedia?.avatarUrl ||
            live.mapping.adapter.engineInput.userMedia?.bannerUrl,
          )
        : false,
    archetype: strategy?.archetype ?? null,
    mediaStrategy: strategy?.recipe.semantics.media_strategy ?? null,
    unsplashConnected,
    pexelsConnected,
  });

  const diagnostics = buildAutoDiagnosis({ transformations, engine, visual });
  const summary = buildSummary({ transformations, engine, visual, media, canonicalValid: live.ok });

  return {
    traceId: input.traceId,
    startedAt: input.now,
    scenarioId: input.scenarioId,
    stages,
    transformations,
    engine,
    visual,
    media,
    diagnostics,
    firstDivergence:
      transformations.find((transformation) => transformation.status !== "PRESERVED") ?? null,
    summary,
    ...(failure ? { failure } : {}),
  };
}
