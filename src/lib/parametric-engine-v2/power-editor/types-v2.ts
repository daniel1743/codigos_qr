/**
 * POWER EDITOR RECIPE V2 — the evolved Engine output contract.
 *
 * LEVEL 1 (semantics) stays the Engine's brain: family, energy, trust,
 * density, visual weight, CTA pressure, surface/background mood.
 * LEVEL 2 (resolved) is the concrete vocabulary the Power Editor renders.
 *
 * PageRecipeV1 is NOT replaced: every V2 recipe embeds the V1 recipe it was
 * derived from, so all existing engine tests and consumers keep working.
 */

import type {
  AnimationPreset,
  BlockMotionOverride,
  DecorativeFramePreset,
  MotionConfig,
  BlockType as PowerBlockType,
  BlockContent,
  BlockLayout,
  BlockStyle,
  LayoutId,
  ResponsiveVisibility,
  TemplateLayout,
  ThemeBackground,
  ThemeButtons,
  ThemeCards,
  ThemeColors,
  ThemeSpacing,
  ThemeTexture,
  ThemeTypography,
  TemplateBlock,
} from "@/premium-template-studio/types";
import type { CompositionPattern } from "../composition-patterns";
import type { DesignPresetId } from "../presets";
import type { FamilyId, PageRecipeV1, PrimaryGoal, VisualPersonality } from "../types";
import type { RecipeQualityScoreV1 } from "../quality-score";
import type { PowerEditorCapabilityKey } from "./capabilities-v2";
import type { MediaStrategyV2 } from "./media-strategy-v2";
import type { TopSignatureV2 } from "./top-composition-v2";

export const RECIPE_V2_VERSION = "2" as const;

/* ------------------------------------------------------------ level 1 */

export type SurfaceMood = "minimal" | "soft" | "glass" | "elevated" | "flat" | "luxury";
export type BackgroundMood =
  | "paper"
  | "clean"
  | "tinted"
  | "premium-dark"
  | "vivid"
  | "textured";

/** The semantic decisions the Engine actually reasons about. */
export interface RecipeSemanticsV2 {
  family: FamilyId;
  personality: VisualPersonality;
  primary_goal: PrimaryGoal;
  pattern: CompositionPattern;
  /** 0..100 deterministic scores inherited from the DesignProfile. */
  energy: number;
  trust: number;
  media_weight: number;
  cta_pressure: number;
  density: "compact" | "balanced" | "spacious";
  visual_weight: "light" | "medium" | "high";
  surface_mood: SurfaceMood;
  background_mood: BackgroundMood;
  /** Explicit media composition decision used by the block planner. */
  media_strategy: MediaStrategyV2;
  /** Semantic first-viewport identity used for candidate diversity. */
  top_signature: TopSignatureV2;
}

/* ------------------------------------------------------------ level 2 */

export interface RecipeVisualV2 {
  colors: ThemeColors;
  typography: ThemeTypography;
  background: ThemeBackground;
  cards: ThemeCards;
  buttons: ThemeButtons;
  spacing: ThemeSpacing;
  animation: AnimationPreset;
  /** V2: CSS-only texture layer (grain | paper | linen | mesh | frost). */
  texture: ThemeTexture;
  /** V2: full motion contract (preset + entrance + hover + timing). */
  motion: MotionConfig;
}

export interface RecipeAvatarV2 {
  size: number;
  radius: number;
  borderWidth: number;
  shadow: boolean;
  overlap: number;
  align: "left" | "center" | "right";
}

export interface RecipeBannerV2 {
  enabled: boolean;
  height: number;
  mobileHeight: number;
  overlay: number;
  blur: number;
  gradient: boolean;
  focalX: number;
  focalY: number;
  radius: number;
}

export interface RecipeLayoutV2 {
  id: LayoutId;
  header: TemplateLayout["header"];
  columns_desktop: number;
  columns_tablet: number;
}

/** A planned Power Editor block. Content is filled by the host/renderer step. */
export interface BlockPlanV2 {
  id: string;
  type: PowerBlockType;
  variant: string;
  role: "identity" | "conversion" | "navigation" | "media" | "proof" | "meta";
  order: number;
  style: BlockStyle;
  layout: BlockLayout;
  visibility: ResponsiveVisibility;
  animation: AnimationPreset;
  /** V2: per-block motion override honoured by the frozen renderer. */
  motion: BlockMotionOverride;
  /** V2: decorative frame preset applied through BlockStyle.frame. */
  frame: DecorativeFramePreset;
  /** Responsive overrides already supported by the frozen renderer. */
  responsive?: NonNullable<TemplateBlock["responsive"]>;
  /** Content hint: what the block is FOR. Real data comes from the host. */
  content: BlockContent;
}

export interface RecipeStructureV2 {
  blocks: BlockPlanV2[];
  primary_cta: { label: string; destination: string; emphasis: "strong" | "medium" | "soft" };
  secondary_cta: { label: string; destination: string } | null;
  media_position: "hero" | "after_identity" | "after_conversion" | "none";
  responsive: {
    mobile_columns: 1;
    stack_media_below_identity: boolean;
    hide_on_mobile: PowerBlockType[];
  };
}

/** Reserved names. Documented, never emitted while unsupported. */
export interface RecipeFutureSafeV2 {
  textures: string[];
  frames: string[];
  decorative_effects: string[];
  advanced_gradients: string[];
}

export interface PowerEditorRecipeV2 {
  meta: {
    recipe_version: typeof RECIPE_V2_VERSION;
    engine_version: string;
    generated_at: string;
    candidate_id: string;
    fingerprint: string;
    preset: DesignPresetId | null;
    quality: RecipeQualityScoreV1;
  };
  identity: {
    name: string;
    profession: string;
    bio: string;
    avatar: string | null;
    banner: string | null;
  };
  semantics: RecipeSemanticsV2;
  visual: RecipeVisualV2;
  avatar: RecipeAvatarV2;
  banner: RecipeBannerV2;
  layout: RecipeLayoutV2;
  structure: RecipeStructureV2;
  /** Which Power Editor capabilities this recipe intentionally activates. */
  capabilities_used: PowerEditorCapabilityKey[];
  /** Capabilities deliberately skipped, with the reason. */
  capabilities_skipped: { capability: string; reason: string }[];
  future_safe: RecipeFutureSafeV2;
  /** The V1 recipe this was derived from — never dropped. */
  source_recipe: PageRecipeV1;
}
