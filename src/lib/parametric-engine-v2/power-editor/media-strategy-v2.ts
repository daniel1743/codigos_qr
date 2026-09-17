import type { FamilyId, PrimaryGoal } from "../types";
import type { ContentSourceV2 } from "./content-source";

/** Semantic media decisions made by Engine V2 before block planning. */
export const MEDIA_STRATEGIES_V2 = [
  "profile-first",
  "banner-first",
  "immersive-background",
  "gallery-first",
  "video-first",
  "portfolio-first",
  "catalog-first",
  "media-cards",
  "minimal-no-media",
] as const;

export type MediaStrategyV2 = (typeof MEDIA_STRATEGIES_V2)[number];

interface MediaStrategyInput {
  family: FamilyId;
  candidateId: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  ownerBanner: boolean;
  content: ContentSourceV2;
  /** Optional: enables deterministic, goal-aligned strategy selection. */
  primaryGoal?: PrimaryGoal;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hasMediaCards(content: ContentSourceV2): boolean {
  return Boolean(
    content.mediaCard || content.links?.some((link) => Boolean(link.imageUrl)),
  );
}

function hasUsableUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAvailable(strategy: MediaStrategyV2, input: MediaStrategyInput): boolean {
  switch (strategy) {
    case "profile-first":
      return hasUsableUrl(input.avatarUrl) || Boolean(input.content.image);
    case "banner-first":
    case "immersive-background":
      return hasUsableUrl(input.bannerUrl);
    case "gallery-first":
      return Boolean(input.content.gallery?.length);
    case "video-first":
      return Boolean(input.content.video);
    case "portfolio-first":
      return Boolean(input.content.portfolio?.length);
    case "catalog-first":
      return Boolean(input.content.products?.length);
    case "media-cards":
      return hasMediaCards(input.content);
    case "minimal-no-media":
      return true;
  }
}

const FAMILY_STRATEGIES: Record<FamilyId, readonly MediaStrategyV2[]> = {
  luxury: ["catalog-first", "banner-first", "immersive-background", "media-cards", "profile-first", "minimal-no-media"],
  creator: ["catalog-first", "gallery-first", "video-first", "portfolio-first", "media-cards", "banner-first", "profile-first"],
  corporate: ["catalog-first", "profile-first", "banner-first", "minimal-no-media", "media-cards"],
  energetic: ["catalog-first", "video-first", "gallery-first", "immersive-background", "media-cards", "banner-first"],
  editorial: ["catalog-first", "banner-first", "gallery-first", "portfolio-first", "minimal-no-media"],
  minimal: ["catalog-first", "minimal-no-media", "profile-first", "banner-first"],
};

/**
 * Deterministic, goal-aligned strategy preference. Only the catalog case is
 * pinned: a sell goal with supplied products has ONE unambiguous media story
 * (the catalog), so leaving it to the candidate hash would occasionally hide
 * the store's own products. Every other goal keeps the deterministic hash
 * selection so rich-media candidates remain structurally diverse.
 */
function goalAlignedStrategy(input: MediaStrategyInput): MediaStrategyV2 | null {
  if (input.primaryGoal === "sell" && (input.content.products?.length ?? 0) > 0) {
    return "catalog-first";
  }
  return null;
}

/**
 * Resolves a repeatable strategy from candidate identity and available host
 * content. Unsupported strategies are never selected as a fallback.
 */
export function resolveMediaStrategy(input: MediaStrategyInput): MediaStrategyV2 {
  const available = FAMILY_STRATEGIES[input.family].filter((strategy) =>
    isAvailable(strategy, input),
  );
  const choices: readonly MediaStrategyV2[] =
    available.length > 0 ? available : ["minimal-no-media"];

  // A supplied cover is an authored top-level visual, not optional decoration.
  // Keep the existing banner-led strategy vocabulary, but do not let the
  // candidate hash demote a real owner cover to a no-media composition.
  if (input.ownerBanner && hasUsableUrl(input.bannerUrl) && choices.includes("banner-first")) {
    return "banner-first";
  }

  const goalAligned = goalAlignedStrategy(input);
  if (goalAligned && choices.includes(goalAligned)) return goalAligned;

  return choices[stableHash(input.candidateId) % choices.length]!;
}

export function mediaStrategyHasMajorMedia(strategy: MediaStrategyV2): boolean {
  return strategy !== "minimal-no-media" && strategy !== "profile-first";
}
