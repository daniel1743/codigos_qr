/**
 * CRIPQER PARAMETRIC ENGINE — POWER EDITOR V2 LAYER
 *
 * PageRecipeV1 stays intact. This module adds an evolved output contract
 * able to express the full visual vocabulary of the Power Editor renderer.
 */

export {
  POWER_EDITOR_CAPABILITIES,
  CAPABILITIES_UNLOCKED_BY_V2,
  resolvePowerEditorCapabilities,
  supportsCapability,
} from "./capabilities-v2";
export type { PowerEditorCapabilities, PowerEditorCapabilityKey } from "./capabilities-v2";

export { RECIPE_V2_VERSION } from "./types-v2";
export type {
  BlockPlanV2,
  BackgroundMood,
  PowerEditorRecipeV2,
  RecipeAvatarV2,
  RecipeBannerV2,
  RecipeLayoutV2,
  RecipeSemanticsV2,
  RecipeStructureV2,
  RecipeVisualV2,
  SurfaceMood,
} from "./types-v2";
export { MEDIA_STRATEGIES_V2, resolveMediaStrategy } from "./media-strategy-v2";
export type { MediaStrategyV2 } from "./media-strategy-v2";
export { TOP_SIGNATURES_V2, resolveTopSignature } from "./top-composition-v2";
export type { TopCompositionInputV2, TopSignatureV2 } from "./top-composition-v2";
export {
  selectStructurallyDiverseCandidates,
  structuralSignatureKey,
  structuralSignatureV2,
} from "./diversity-v2";
export type { StructuralSignatureV2 } from "./diversity-v2";

export { normalizeContent, isSafeUrl, EMPTY_CONTENT } from "./content-source";
export type {
  ContentSourceV2,
  ContentEventV2,
  ContentFaqV2,
  ContentMapV2,
  ContentMusicV2,
  ContentPricingPlanV2,
  ContentProductV2,
  ContentQuickActionV2,
  ContentServiceV2,
  ContentStatV2,
  ContentTestimonialV2,
  ContentTimelineV2,
} from "./content-source";

export { buildPowerEditorRecipeV2 } from "./to-recipe-v2";
export type { BuildRecipeV2Input } from "./to-recipe-v2";
export { toBioTemplateConfig } from "./to-template-config";
export {
  contrastRatio,
  ensureReadable,
  isDarkColor,
  resolveButtons,
  resolveFrame,
  resolveLayout,
  resolveMotion,
  resolveTexture,
} from "./resolvers";
export { planBlocks } from "./blocks-v2";
export type { HeroSourceV2 } from "./blocks-v2";
export {
  resolveProfessionIcon,
  resolveProofIcon,
  resolveSemanticActionIcon,
} from "./semantic-icons";
export type { SupportedSemanticIcon } from "./semantic-icons";

export { generatePowerEditorCandidates, generatePowerEditorTemplate } from "./generate-v2";
export type { GenerateV2Options, PowerEditorCandidateV2 } from "./generate-v2";
