import "@tanstack/react-start/server-only";

import {
  acceptEngineGeneratedConfig,
  type CanonicalPageEnvelopeV1,
  type CripqerOnboardingIntentV1,
} from "@/lib/canonical-page";
import { CRIPQER_ACTION_HOST_POLICY_V1 } from "@/lib/host-contracts";
import { generatePowerEditorTemplate, type GenerateV2Options } from "./power-editor";
import { normalizeContent, type ContentSourceV2 } from "./power-editor/content-source";
import type { CuratedMediaResult } from "./media";
import type { SupervisorOutcome } from "./ai";
import type { BioTemplateConfig } from "@/premium-template-studio/types";
import type {
  OnboardingIntentV1,
  PrimaryActionType,
  PrimaryGoal,
  VisualPersonality,
} from "./types";

export interface EngineV2HostGenerationInput extends CripqerOnboardingIntentV1 {
  /** Specific free-form activity when profession is outside the host catalogue. */
  businessOther?: string | null;
  userMedia?: {
    avatarUrl?: string;
    bannerUrl?: string;
  };
  preferredColor?: string;
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

function contentFor(input: EngineV2HostGenerationInput): ContentSourceV2 {
  const links = input.content?.links
    ?.map((link) => ({ label: link.label, url: link.url }))
    .filter((link) => link.label.trim() && link.url.trim());
  return normalizeContent({
    ...(input.content?.bio?.trim() ? { about: input.content.bio } : {}),
    ...(links?.length ? { links } : {}),
  });
}

function actionFor(
  input: EngineV2HostGenerationInput,
  content: ContentSourceV2,
): { type: PrimaryActionType; value: string } {
  if (input.primaryAction) return input.primaryAction;
  const firstLink = content.links?.[0];
  if (firstLink) return { type: "website", value: firstLink.url };
  throw new Error(
    "Engine V2 requires primaryAction or at least one valid content link; no destination was invented.",
  );
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
  const hasCardMedia = selectedFeatures.some((feature) =>
    ["gallery", "portfolio", "media-card", "image", "video"].includes(feature),
  );
  const action = actionFor(input, content);

  return {
    business_type: profession,
    business_other: input.businessOther?.trim() || null,
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
    primary_action: action,
    meta: { version: "1", completed_at: now },
  };
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
  const content = contentFor(input);
  const intent = toEngineIntent(input, content, now);
  const candidate = generatePowerEditorTemplate(intent, {
    ...(options.engine ?? {}),
    ...(Object.keys(content).length ? { content } : {}),
    now,
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
