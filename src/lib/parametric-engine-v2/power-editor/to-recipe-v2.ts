/**
 * PageRecipeV1 -> PowerEditorRecipeV2
 *
 * Level 1 semantics are read from the deterministic DesignProfile and the
 * composition pattern; Level 2 values come from the resolvers. The source
 * V1 recipe is embedded, never discarded.
 */

import { ENGINE_VERSION } from "../engine";
import { fingerprintRecipe } from "../fingerprint";
import type { CompositionPattern } from "../composition-patterns";
import type { DesignPresetId } from "../presets";
import type { RecipeQualityScoreV1 } from "../quality-score";
import type { DesignProfile, PageRecipeV1 } from "../types";
import {
  resolveAnimation,
  resolveAvatar,
  resolveBackground,
  resolveBanner,
  resolveButtons,
  resolveCards,
  resolveColors,
  resolveBackgroundMood,
  resolveLayout,
  resolveSpacing,
  resolveSurfaceMood,
  resolveTexture,
  resolveMotion,
  resolveTypography,
  resolveVisualWeight,
  hasUsableAsset,
} from "./resolvers";
import { planBlocks, type HeroSourceV2 } from "./blocks-v2";
import { normalizeContent, type ContentSourceV2 } from "./content-source";
import { resolveMediaStrategy, type MediaStrategyV2 } from "./media-strategy-v2";
import { resolveTopSignature } from "./top-composition-v2";
import {
  CAPABILITIES_UNLOCKED_BY_V2,
  resolvePowerEditorCapabilities,
  type PowerEditorCapabilities,
  type PowerEditorCapabilityKey,
} from "./capabilities-v2";
import {
  RECIPE_V2_VERSION,
  type BlockPlanV2,
  type PowerEditorRecipeV2,
  type RecipeSemanticsV2,
} from "./types-v2";

export interface BuildRecipeV2Input {
  recipe: PageRecipeV1;
  profile: DesignProfile;
  pattern: CompositionPattern;
  score: RecipeQualityScoreV1;
  content?: ContentSourceV2;
  capabilities?: Partial<PowerEditorCapabilities>;
  candidateId?: string;
  preset?: DesignPresetId | null;
  mediaStrategy?: MediaStrategyV2;
}

function densityOf(recipe: PageRecipeV1): RecipeSemanticsV2["density"] {
  return recipe.design.spacing.section_gap;
}

/**
 * Content density is a semantic response to what the host actually supplied.
 * A capable renderer must not turn a sparse link bio into a rich landing page.
 */
function contentDensityOf(
  recipe: PageRecipeV1,
  content: ContentSourceV2,
): RecipeSemanticsV2["density"] {
  const actionCount = (content.links?.length ?? 0) + (content.socials?.length ?? 0) + (content.quickActions?.length ?? 0);
  const richSections = [
    content.featured,
    content.image,
    content.gallery,
    content.portfolio,
    content.video,
    content.mediaCard,
    content.services,
    content.pricing,
    content.testimonials,
    content.faq,
    content.timeline,
    content.events,
    content.products,
    content.music,
    content.map,
  ].filter(Boolean).length;

  if (richSections === 0 && actionCount <= 3) return "compact";
  if (
    richSections >= 2 ||
    Boolean(content.gallery || content.portfolio || content.video || content.products)
  ) {
    return "spacious";
  }
  return densityOf(recipe);
}

function usedCapabilities(
  visualBackground: string,
  cardPreset: string,
  buttonVariant: string,
  layoutId: string,
  blocks: BlockPlanV2[],
): PowerEditorCapabilityKey[] {
  const used = new Set<PowerEditorCapabilityKey>();
  used.add(`background_${visualBackground}` as PowerEditorCapabilityKey);
  used.add(`card_preset_${cardPreset}` as PowerEditorCapabilityKey);
  used.add(`button_${buttonVariant}` as PowerEditorCapabilityKey);
  used.add(`layout_${layoutId.replace(/-/g, "_")}` as PowerEditorCapabilityKey);
  for (const block of blocks) used.add(`block_${block.type}` as PowerEditorCapabilityKey);
  return [...used].filter((key) => key in CAPABILITY_KEY_SET) as PowerEditorCapabilityKey[];
}

const CAPABILITY_KEY_SET = resolvePowerEditorCapabilities();

export function buildPowerEditorRecipeV2(input: BuildRecipeV2Input): PowerEditorRecipeV2 {
  const { recipe, profile, pattern, score } = input;
  const capabilities = resolvePowerEditorCapabilities(input.capabilities);
  const content = normalizeContent(input.content);

  const family = recipe.meta.family;
  const density = contentDensityOf(recipe, content);
  const visual_weight = resolveVisualWeight(profile);
  const media_strategy =
    input.mediaStrategy ??
    resolveMediaStrategy({
      family,
      candidateId: input.candidateId ?? recipe.meta.generated_at,
      avatarUrl: recipe.identity.avatar,
      bannerUrl: recipe.identity.banner,
      content,
    });

  const hasBanner = hasUsableAsset(recipe.identity.banner);
  const layout = resolveLayout(pattern, hasBanner, media_strategy);
  const semantics: RecipeSemanticsV2 = {
    family,
    personality: recipe.meta.personality,
    primary_goal: recipe.meta.primary_goal,
    pattern,
    energy: profile.visual_energy,
    trust: profile.trust_weight,
    media_weight: profile.media_weight,
    cta_pressure: profile.cta_pressure,
    density,
    visual_weight,
    surface_mood: resolveSurfaceMood(family, profile, recipe.design.card.style),
    background_mood: resolveBackgroundMood(family, profile, recipe.design.background),
    media_strategy,
    top_signature: resolveTopSignature({
      family,
      pattern,
      mediaStrategy: media_strategy,
      header: layout.header,
      hasBanner,
      hasAvatar: hasUsableAsset(recipe.identity.avatar),
    }),
  };
  const colors = resolveColors(recipe);
  const visual = {
    colors,
    typography: resolveTypography(recipe, semantics),
    background: resolveBackground(recipe, colors, semantics, capabilities),
    cards: resolveCards(recipe, semantics, capabilities),
    buttons: resolveButtons(recipe, semantics, capabilities),
    spacing: resolveSpacing(semantics, layout.id),
    animation: resolveAnimation(semantics),
    texture: resolveTexture(semantics, capabilities),
    motion: resolveMotion(semantics, capabilities),
  };

  /**
   * V2: cover-led patterns open with a real `hero` block instead of the
   * header composition, so the profile banner is intentionally disabled to
   * avoid two competing hero surfaces.
   */
  const useHeroBlock =
    capabilities.block_hero &&
    capabilities.hero_replaces_profile_header &&
    (pattern === "visual_cover" || pattern === "media_story") &&
    Boolean(recipe.identity.banner || recipe.identity.avatar);

  const hero: HeroSourceV2 = {
    enabled: useHeroBlock,
    name: recipe.identity.name,
    profession: recipe.identity.profession,
    bio: recipe.identity.bio,
    avatarUrl: recipe.identity.avatar,
    bannerUrl: recipe.identity.banner,
    verified: recipe.structure.hero.show_professional_badge,
  };

  const blocks = planBlocks(
    recipe,
    semantics,
    content,
    capabilities,
    layout.columns_desktop,
    hero,
    layout.columns_tablet,
  );
  const resolvedBanner = resolveBanner(recipe, semantics);
  const banner = useHeroBlock
    ? { ...resolvedBanner, enabled: false }
    : media_strategy === "banner-first" && hasUsableAsset(recipe.identity.banner)
      ? { ...resolvedBanner, enabled: true }
      : resolvedBanner;

  const skipped: PowerEditorRecipeV2["capabilities_skipped"] = [];
  if (!banner.enabled) {
    skipped.push({
      capability: "banner_image",
      reason: useHeroBlock ? "replaced_by_hero_block" : "no_banner_asset",
    });
  }
  if (!useHeroBlock)
    skipped.push({
      capability: "block_hero",
      reason: "renderer_always_composes_profile_header",
    });
  if (!content.stats) skipped.push({ capability: "block_stats", reason: "no_stats_content" });
  if (!content.services) skipped.push({ capability: "block_services", reason: "no_services_content" });
  if (!content.testimonials)
    skipped.push({ capability: "block_testimonials", reason: "no_testimonials_content" });
  if (!content.pricing) skipped.push({ capability: "block_pricing", reason: "no_pricing_content" });
  if (!content.faq) skipped.push({ capability: "block_faq", reason: "no_faq_content" });
  if (visual.texture.preset === "none")
    skipped.push({ capability: "texture_grain", reason: "family_material_is_flat" });
  if (!content.gallery) skipped.push({ capability: "block_gallery", reason: "no_gallery_content" });
  if (!content.portfolio)
    skipped.push({ capability: "block_portfolio", reason: "no_portfolio_content" });
  if (!content.video) skipped.push({ capability: "block_video", reason: "no_video_content" });
  for (const key of ["multi_stop_gradient", "background_mesh", "arbitrary_css"]) {
    skipped.push({ capability: key, reason: "not_supported_by_renderer" });
  }

  const capsUsed = usedCapabilities(
    visual.background.type,
    visual.cards.preset,
    visual.buttons.variant,
    layout.id,
    blocks,
  );
  if (visual.texture.preset !== "none") {
    capsUsed.push(`texture_${visual.texture.preset}` as PowerEditorCapabilityKey);
  }
  if (visual.motion.preset !== "none") capsUsed.push("motion_presets");

  return {
    meta: {
      recipe_version: RECIPE_V2_VERSION,
      engine_version: ENGINE_VERSION,
      generated_at: recipe.meta.generated_at,
      candidate_id: input.candidateId ?? "primary",
      fingerprint: fingerprintRecipe(recipe),
      preset: input.preset ?? null,
      quality: score,
    },
    identity: { ...recipe.identity },
    semantics,
    visual,
    avatar: resolveAvatar(recipe, semantics, layout),
    banner,
    layout,
    structure: {
      blocks,
      primary_cta: {
        label: recipe.conversion.primary_cta.label,
        destination: recipe.conversion.primary_cta.destination,
        emphasis:
          semantics.cta_pressure >= 62 ? "strong" : semantics.cta_pressure >= 38 ? "medium" : "soft",
      },
      secondary_cta: null,
      media_position:
        pattern === "visual_cover" || pattern === "media_story"
          ? "hero"
          : blocks.some((b) => b.role === "media")
            ? "after_conversion"
            : "none",
      responsive: {
        mobile_columns: 1,
        stack_media_below_identity: true,
        hide_on_mobile: [],
      },
    },
    capabilities_used: capsUsed,
    capabilities_skipped: skipped,
    future_safe: {
      textures: ["metal", "fabric"],
      frames: ["corner-ornaments"],
      decorative_effects: ["vignette", "parallax"],
      advanced_gradients: ["mesh-background", "conic", "multi-stop"],
    },
    source_recipe: recipe,
  };
}

export { CAPABILITIES_UNLOCKED_BY_V2 };
