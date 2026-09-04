import type { FamilyId } from "../types";
import type { ContentSourceV2 } from "./content-source";

/** Semantic media decisions made by Engine V2 before block planning. */
export const MEDIA_STRATEGIES_V2 = [
  "profile-first",
  "banner-first",
  "immersive-background",
  "gallery-first",
  "video-first",
  "portfolio-first",
  "media-cards",
  "minimal-no-media",
] as const;

export type MediaStrategyV2 = (typeof MEDIA_STRATEGIES_V2)[number];

interface MediaStrategyInput {
  family: FamilyId;
  candidateId: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  content: ContentSourceV2;
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
    case "media-cards":
      return hasMediaCards(input.content);
    case "minimal-no-media":
      return true;
  }
}

const FAMILY_STRATEGIES: Record<FamilyId, readonly MediaStrategyV2[]> = {
  luxury: ["banner-first", "immersive-background", "media-cards", "profile-first", "minimal-no-media"],
  creator: ["gallery-first", "video-first", "portfolio-first", "media-cards", "banner-first", "profile-first"],
  corporate: ["profile-first", "banner-first", "minimal-no-media", "media-cards"],
  energetic: ["video-first", "gallery-first", "immersive-background", "media-cards", "banner-first"],
  editorial: ["banner-first", "gallery-first", "portfolio-first", "minimal-no-media"],
  minimal: ["minimal-no-media", "profile-first", "banner-first"],
};

/**
 * Resolves a repeatable strategy from candidate identity and available host
 * content. Unsupported strategies are never selected as a fallback.
 */
export function resolveMediaStrategy(input: MediaStrategyInput): MediaStrategyV2 {
  const available = FAMILY_STRATEGIES[input.family].filter((strategy) =>
    isAvailable(strategy, input),
  );
  const choices = available.length > 0 ? available : ["minimal-no-media" as const];
  return choices[stableHash(input.candidateId) % choices.length]!;
}

export function mediaStrategyHasMajorMedia(strategy: MediaStrategyV2): boolean {
  return strategy !== "minimal-no-media" && strategy !== "profile-first";
}
