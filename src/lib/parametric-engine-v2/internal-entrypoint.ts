import "@tanstack/react-start/server-only";

import {
  acceptEngineGeneratedConfig,
  type CanonicalPageEnvelopeV1,
  type CripqerOnboardingIntentV1,
} from "@/lib/canonical-page";
import { CRIPQER_ACTION_HOST_POLICY_V1 } from "@/lib/host-contracts";
import {
  generatePowerEditorCandidates,
  generatePowerEditorTemplate,
  type GenerateV2Options,
  type PowerEditorRecipeV2,
} from "./power-editor";
import { normalizeContent, type ContentSourceV2 } from "./power-editor/content-source";
import { inferArchetype, type BusinessArchetype } from "./business-signals";
import { ARCHETYPE_STRATEGIES } from "./archetypes";
import { normalizeIntent } from "./normalize";
import { buildDesignProfile } from "./strategy";

/**
 * HOST SEAM — structured content pass-through (PAGES_7).
 *
 * Engine V2 decides which blocks exist and how they look, but it never invents
 * user data: a services / portfolio / product / event block is only planned when
 * the host actually supplies that content. The original host entrypoint mapped
 * only `bio` + `links`, so owner-supplied structured items were dropped before
 * reaching the engine.
 *
 * This additive pass-through lets a host caller forward already-structured
 * content. The engine's own `normalizeContent` still sanitizes, caps and drops
 * anything invalid, so no engine business logic, block planning, scoring or
 * rendering contract is changed by this seam.
 */
export type EngineV2HostContentBlocks = Partial<ContentSourceV2>;
import type { CuratedMediaResult } from "./media";
import type { SupervisorOutcome } from "./ai";
import type { BioTemplateConfig } from "@/premium-template-studio/types";
import type { MediaProvenanceV1 } from "@/premium-template-studio/types";
import type {
  BusinessCategory,
  FamilyId,
  OnboardingIntentV1,
  PrimaryActionType,
  PrimaryGoal,
  VisualPersonality,
} from "./types";

export interface EngineV2HostGenerationInput extends CripqerOnboardingIntentV1 {
  /** Explicit category from the semantic host; text inference is fallback only. */
  businessCategory?: BusinessCategory;
  /** Specific free-form activity when profession is outside the host catalogue. */
  businessOther?: string | null;
  userMedia?: {
    avatarUrl?: string;
    bannerUrl?: string;
    bannerProvenance?: MediaProvenanceV1;
  };
  preferredColor?: string;
  /**
   * Declares that the host really holds owner media (cover image and/or item
   * images). It only reports availability — the engine still decides which media
   * block, if any, is planned.
   */
  cardMedia?: boolean;
  primaryAction?: {
    type: PrimaryActionType;
    value: string;
  };
}

export interface EngineV2HostGenerationOptions {
  now?: string;
  engine?: GenerateV2Options;
  curatedMedia?: CuratedMediaResult;
  supervisor?: SupervisorOutcome;
  /**
   * PAGES_7 host seam: owner-supplied structured content (services, portfolio,
   * products, events, pricing, gallery, trust badges, stats, contact). Never
   * invented by the engine; invalid entries are dropped by `normalizeContent`.
   */
  contentBlocks?: EngineV2HostContentBlocks;
}

export interface EngineV2HostGenerationResult {
  editorConfig: BioTemplateConfig;
  canonicalEnvelope: CanonicalPageEnvelopeV1;
  generation: {
    candidateId: string;
    score: number;
    family: string;
    layout: string;
    fingerprint: string;
  };
  media: {
    status: "none" | "user-supplied" | "server-curated";
    providers: readonly string[];
    roles: readonly string[];
    assetCount: number;
    preferredColor?: string;
  };
  supervisor: SupervisorOutcome | null;
  hostActionPolicy: typeof CRIPQER_ACTION_HOST_POLICY_V1;
}

function normalized(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function visualPersonality(style: string | undefined): VisualPersonality {
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

function primaryGoal(goal: string): PrimaryGoal {
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

function contentFor(
  input: EngineV2HostGenerationInput,
  contentBlocks?: EngineV2HostContentBlocks,
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

function actionFor(
  input: EngineV2HostGenerationInput,
  content: ContentSourceV2,
): { type: PrimaryActionType; value: string } | null {
  if (input.primaryAction) return input.primaryAction;
  const firstLink = content.links?.[0];
  if (firstLink) return { type: "website", value: firstLink.url };
  return null;
}

function toEngineIntent(
  input: EngineV2HostGenerationInput,
  content: ContentSourceV2,
  now: string,
): OnboardingIntentV1 {
  const profession = input.profession.trim();
  if (profession.length < 2) throw new Error("profession must contain at least 2 characters.");
  const name = input.content?.name?.trim() || profession;
  const bio = input.content?.bio?.trim() || `${name} — ${profession}`;
  const selectedFeatures = input.selectedFeatures.map(normalized);
  const hasCardMedia =
    input.cardMedia === true ||
    selectedFeatures.some((feature) =>
      ["gallery", "portfolio", "media-card", "image", "video"].includes(feature),
    );
  const action = actionFor(input, content);

  return {
    business_type: profession,
    business_other: input.businessOther?.trim() || null,
    ...(input.businessCategory ? { business_category: input.businessCategory } : {}),
    primary_goal: primaryGoal(input.goal),
    visual_personality: visualPersonality(input.style),
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

/** QA diagnostic seam: exposes the exact legacy payload before validation. */
export function toEngineIntentForDiagnostics(
  input: EngineV2HostGenerationInput,
  options: { now?: string; contentBlocks?: EngineV2HostContentBlocks } = {},
): OnboardingIntentV1 {
  return toEngineIntent(
    input,
    contentFor(input, options.contentBlocks),
    options.now ?? new Date().toISOString(),
  );
}

function mediaMetadata(
  input: EngineV2HostGenerationInput,
  media: CuratedMediaResult | undefined,
): EngineV2HostGenerationResult["media"] {
  const userRoles = [
    ...(input.userMedia?.avatarUrl ? ["avatar"] : []),
    ...(input.userMedia?.bannerUrl ? ["banner"] : []),
  ];
  if (media) {
    const roles = Object.keys(media.assets);
    const providers = [
      ...new Set(
        Object.values(media.assets).flatMap((assets) =>
          (assets ?? []).map((asset) => asset.provider),
        ),
      ),
    ];
    return {
      status: "server-curated",
      providers,
      roles,
      assetCount: Object.values(media.assets).reduce(
        (total, assets) => total + (assets?.length ?? 0),
        0,
      ),
      ...(input.preferredColor ? { preferredColor: input.preferredColor } : {}),
    };
  }
  return {
    status: userRoles.length ? "user-supplied" : "none",
    providers: [],
    roles: userRoles,
    assetCount: userRoles.length,
    ...(input.preferredColor ? { preferredColor: input.preferredColor } : {}),
  };
}

export function generateCripqerPageWithEngineV2(
  input: EngineV2HostGenerationInput,
  options: EngineV2HostGenerationOptions = {},
): EngineV2HostGenerationResult {
  const now = options.now ?? new Date().toISOString();
  const content = contentFor(input, options.contentBlocks);
  const intent = toEngineIntent(input, content, now);
  const candidate = generatePowerEditorTemplate(intent, {
    ...(options.engine ?? {}),
    ...(Object.keys(content).length ? { content } : {}),
    now,
    ...(input.userMedia?.bannerProvenance ? { bannerProvenance: input.userMedia.bannerProvenance } : {}),
  });
  if (!candidate) throw new Error("Engine V2 did not produce an acceptable candidate.");
  const canonicalEnvelope = acceptEngineGeneratedConfig(candidate.config);
  return {
    editorConfig: canonicalEnvelope.editorConfig,
    canonicalEnvelope,
    generation: {
      candidateId: candidate.id,
      score: candidate.total_score,
      family: candidate.recipe.semantics.family,
      layout: candidate.recipe.layout.id,
      fingerprint: candidate.recipe.meta.fingerprint,
    },
    media: mediaMetadata(input, options.curatedMedia),
    supervisor: options.supervisor ?? null,
    hostActionPolicy: CRIPQER_ACTION_HOST_POLICY_V1,
  };
}

/**
 * QA-ONLY strategy trace for the Cripqer generation inspector.
 *
 * This is a NON-BEHAVIORAL diagnostic seam: it runs the exact same engine
 * functions as `generateCripqerPageWithEngineV2` (same `contentFor`, same
 * `toEngineIntent`, same candidate pipeline) and additionally exposes the
 * strategy decisions the engine already computed internally (normalized
 * category/personality/goal, inferred archetype, family_bias, family scores
 * and the full PowerEditorRecipeV2). It never changes generation output and is
 * never used by production callers.
 */
export interface EngineV2StrategyTrace {
  normalized: {
    businessType: string;
    businessCategory: BusinessCategory;
    businessOther: string | null;
    visualPersonality: VisualPersonality;
    primaryGoal: PrimaryGoal;
  };
  archetype: BusinessArchetype;
  familyBias: Partial<Record<FamilyId, number>>;
  familyScores: Record<FamilyId, number>;
  selectedFamily: FamilyId;
  recipe: PowerEditorRecipeV2;
}

export function generateCripqerPageWithEngineV2Traced(
  input: EngineV2HostGenerationInput,
  options: EngineV2HostGenerationOptions = {},
): EngineV2HostGenerationResult & { trace: EngineV2StrategyTrace } {
  const now = options.now ?? new Date().toISOString();
  const content = contentFor(input, options.contentBlocks);
  const intent = toEngineIntent(input, content, now);
  const normalized = normalizeIntent(intent);
  const archetype = inferArchetype(normalized);
  const familyBias = ARCHETYPE_STRATEGIES[archetype].family_bias;
  const profile = buildDesignProfile(normalized, 0);

  const candidates = generatePowerEditorCandidates(intent, {
    ...(options.engine ?? {}),
    ...(Object.keys(content).length ? { content } : {}),
    count: 1,
    now,
    ...(input.userMedia?.bannerProvenance ? { bannerProvenance: input.userMedia.bannerProvenance } : {}),
  });
  const candidate = candidates[0];
  if (!candidate) throw new Error("Engine V2 did not produce an acceptable candidate.");

  const canonicalEnvelope = acceptEngineGeneratedConfig(candidate.config);
  const result: EngineV2HostGenerationResult = {
    editorConfig: canonicalEnvelope.editorConfig,
    canonicalEnvelope,
    generation: {
      candidateId: candidate.id,
      score: candidate.total_score,
      family: candidate.recipe.semantics.family,
      layout: candidate.recipe.layout.id,
      fingerprint: candidate.recipe.meta.fingerprint,
    },
    media: mediaMetadata(input, options.curatedMedia),
    supervisor: options.supervisor ?? null,
    hostActionPolicy: CRIPQER_ACTION_HOST_POLICY_V1,
  };

  return {
    ...result,
    trace: {
      normalized: {
        businessType: intent.business_type,
        businessCategory: normalized.business_category,
        businessOther: intent.business_other,
        visualPersonality: normalized.visual_personality,
        primaryGoal: normalized.primary_goal,
      },
      archetype,
      familyBias,
      familyScores: profile.family_scores,
      selectedFamily: candidate.recipe.semantics.family as FamilyId,
      recipe: candidate.recipe,
    },
  };
}
