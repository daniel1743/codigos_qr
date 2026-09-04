import type { CompositionPattern } from "../composition-patterns";
import type { FamilyId } from "../types";
import type { MediaStrategyV2 } from "./media-strategy-v2";
import type { RecipeLayoutV2 } from "./types-v2";

/**
 * Semantic first-viewport identities. These are Engine diagnostics and
 * selection keys, not new BioTemplateConfig fields.
 */
export const TOP_SIGNATURES_V2 = [
  "banner-overlap",
  "banner-stacked",
  "banner-inline",
  "media-hero",
  "immersive-profile",
  "typographic-minimal",
  "clean-profile",
  "editorial-cover",
] as const;

export type TopSignatureV2 = (typeof TOP_SIGNATURES_V2)[number];

export interface TopCompositionInputV2 {
  family: FamilyId;
  pattern: CompositionPattern;
  mediaStrategy: MediaStrategyV2;
  header: RecipeLayoutV2["header"];
  hasBanner: boolean;
  hasAvatar: boolean;
}

/**
 * Maps semantic intent to the existing frozen header/background vocabulary.
 * The avatar flag is deliberately part of the input so a future caller does
 * not mistake a text-only page for a profile composition; the current
 * supported signatures collapse that distinction into clean/typographic.
 */
export function resolveTopSignature(input: TopCompositionInputV2): TopSignatureV2 {
  if (input.mediaStrategy === "immersive-background" && input.hasBanner) {
    return "immersive-profile";
  }

  if (
    input.hasBanner &&
    input.family === "editorial" &&
    (input.pattern === "visual_cover" || input.pattern === "editorial_stack")
  ) {
    return "editorial-cover";
  }

  if (!input.hasBanner) {
    if (input.mediaStrategy === "minimal-no-media" && input.family === "minimal") {
      return "typographic-minimal";
    }
    return "clean-profile";
  }

  if (input.header === "hero") return "media-hero";
  if (input.header === "overlap") return "banner-overlap";
  if (input.header === "stacked") return "banner-stacked";
  return "banner-inline";
}
