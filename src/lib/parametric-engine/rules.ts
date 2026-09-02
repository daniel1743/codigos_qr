/**
 * Stages 4-5 — parameter resolution and semantic composition.
 *
 * Every decision here is a pure function of (normalized intent, profile,
 * variant). No randomness, no dates, no environment access.
 */

import { resolveCtaLabel, resolvePriorityOrder } from "./cta";
import { FAMILIES } from "./families";
import { PALETTES } from "./palettes";
import { FAMILY_PAIRS } from "./typography";
import type {
  Alignment,
  Density,
  HeroMode,
  DesignProfile,
  NormalizedIntent,
  RecipeBlock,
  RecipeConversion,
  RecipeDesign,
  RecipeStructure,
} from "./types";
import { pick, stableHash } from "./utils";

/** Deterministic index derived from stable intent facts + explicit variant. */
export function variantIndex(intent: NormalizedIntent, variant: number): number {
  const seed = [
    intent.business_category,
    intent.primary_goal,
    intent.visual_personality,
    intent.primary_action.type,
    String(variant),
  ].join("|");
  return stableHash(seed);
}

/** Composition axis hash. Variant 0 always yields the engine baseline. */
function axis(intent: NormalizedIntent, variant: number, name: string): number {
  if (variant === 0) return 0;
  return stableHash(
    [name, String(variant), intent.business_category, intent.primary_goal, intent.visual_personality].join("|"),
  );
}

function densityFromEnergy(energy: number): Density {
  if (energy >= 70) return "compact";
  if (energy >= 40) return "balanced";
  return "spacious";
}

export function resolveDesign(
  intent: NormalizedIntent,
  profile: DesignProfile,
  variant: number,
): RecipeDesign {
  const family = FAMILIES[profile.family];
  const index = variantIndex(intent, variant);

  const palette = pick(PALETTES[profile.family], index);
  const pair = pick(FAMILY_PAIRS[profile.family], index >>> 3);

  const baseDensity =
    profile.cta_pressure >= 80 ? densityFromEnergy(profile.visual_energy) : family.geometry.density;
  const densityAxis = axis(intent, variant, "density");
  const density: Density =
    variant === 0
      ? baseDensity
      : pick<Density>(["compact", "balanced", "spacious"], densityAxis >>> 2);

  const baseAlignment: Alignment =
    profile.trust_weight >= 75 ? "left" : profile.media_weight >= 70 ? "center" : family.alignment;
  const alignmentAxis = axis(intent, variant, "alignment");
  const alignment: Alignment =
    variant === 0 ? baseAlignment : (alignmentAxis >>> 4) % 2 === 0 ? baseAlignment : baseAlignment === "left" ? "center" : "left";

  const background: RecipeDesign["background"] =
    family.background.type === "linear-gradient"
      ? {
          type: "linear-gradient",
          value: { kind: "linear", angle: 180, from: palette.background, to: palette.surface },
        }
      : family.background.type === "radial-gradient"
        ? {
            type: "radial-gradient",
            value: { kind: "radial", position: "top", from: palette.surface, to: palette.background },
          }
        : { type: "solid", value: { kind: "solid", color: palette.background } };

  const cardsEnabled =
    family.card_affinity + (profile.media_weight - 50) / 2 >= 55 &&
    intent.primary_goal !== "social";

  return {
    palette,
    typography: {
      heading_family: pair.heading_family,
      body_family: pair.body_family,
      heading_weight: pair.heading_weight,
      body_weight: pair.body_weight,
      heading_scale: family.scales.heading,
      body_scale: family.scales.body,
    },
    geometry: {
      radius: family.geometry.radius,
      border_style: family.geometry.border_style,
      density,
    },
    background,
    avatar: {
      shape: family.avatar.shape,
      ring: family.avatar.ring,
      alignment,
    },
    button: {
      style: profile.cta_pressure >= 75 ? "solid" : family.button.style,
      shape: family.geometry.radius,
      alignment,
      icon_position: family.button.icon_position,
    },
    card: {
      enabled: cardsEnabled,
      media_position: !intent.assets.has_card_media
        ? "none"
        : variant !== 0 && (axis(intent, variant, "media") >>> 6) % 2 === 1
          ? profile.media_weight >= 70
            ? "right"
            : "bottom"
          : profile.media_weight >= 70
            ? "bottom"
            : "right",
      image_focal_y: 50,
      style: family.card.style,
      action_style: family.card.action_style,
    },
    spacing: {
      section_gap: density,
      item_gap: density === "spacious" ? "balanced" : density,
      horizontal_padding: density === "compact" ? "balanced" : density,
    },
  };
}

function resolveHeroMode(intent: NormalizedIntent, variant: number): HeroMode {
  const base: HeroMode = intent.assets.has_banner
    ? intent.assets.has_avatar
      ? "banner_avatar"
      : "banner_only"
    : "avatar_only";
  if (variant === 0 || !intent.assets.has_banner || !intent.assets.has_avatar) return base;
  return (axis(intent, variant, "hero") >>> 8) % 2 === 1 ? "banner_only" : "banner_avatar";
}

export function composeStructure(
  intent: NormalizedIntent,
  profile: DesignProfile,
  design: RecipeDesign,
  variant = 0,
): RecipeStructure {
  const socialFirst = intent.primary_goal === "social";
  const heroMode = resolveHeroMode(intent, variant);
  const professionalPresentation =
    design.card.enabled && (intent.primary_goal === "portfolio" || profile.trust_weight >= 80);

  return {
    hero: {
      enabled: true,
      mode: heroMode,
      identity_alignment: design.avatar.alignment,
      // Temporary (blob) avatars still count as present for composition.
      show_avatar: heroMode !== "banner_only" && intent.assets.has_avatar,
      show_banner: heroMode !== "avatar_only" && intent.assets.has_banner,
      show_profession: intent.identity.profession.length > 0,
      show_bio: intent.identity.bio.length > 0,
      show_professional_badge: profile.trust_weight >= 80,
    },
    social_row: {
      enabled: socialFirst || profile.media_weight >= 60,
      position: socialFirst ? "after_identity" : "after_primary_action",
    },
    primary_action: {
      enabled: true,
      presentation: professionalPresentation ? "professional_card" : "button",
      cta_label: resolveCtaLabel(intent.primary_action.type, intent.primary_goal),
    },
    links: {
      presentation: design.card.enabled
        ? variant !== 0 && (axis(intent, variant, "links") >>> 10) % 2 === 1
          ? socialFirst
            ? "cards"
            : "mixed"
          : socialFirst
            ? "mixed"
            : "cards"
        : "buttons",
      max_primary_cards: design.card.enabled ? (profile.media_weight >= 70 ? 3 : 2) : 0,
    },
    footer: { enabled: true, style: "minimal" },
  };
}

export function composeBlocks(structure: RecipeStructure, design: RecipeDesign): RecipeBlock[] {
  const blocks: Omit<RecipeBlock, "order">[] = [];
  const add = (id: string, type: RecipeBlock["type"], role: RecipeBlock["role"]) =>
    blocks.push({ id, type, role });

  add("hero", "hero", "identity");
  add("identity", "identity", "identity");

  if (structure.social_row.enabled && structure.social_row.position === "after_identity") {
    add("social_links", "social_links", "navigation");
  }

  if (structure.primary_action.presentation === "professional_card") {
    add("primary_cta", "professional_card", "conversion");
  } else {
    add("primary_cta", "primary_cta", "conversion");
  }

  if (structure.social_row.enabled && structure.social_row.position === "after_primary_action") {
    add("social_links", "social_links", "navigation");
  }

  if (structure.links.max_primary_cards > 0 || structure.links.presentation === "buttons") {
    add("link_list", "link_list", "navigation");
  }

  if (design.card.enabled && design.card.media_position === "bottom") {
    add("media", "media", "media");
  }

  add("footer", "footer", "meta");

  return blocks.map((b, i) => ({ ...b, order: i }));
}

export function composeConversion(
  intent: NormalizedIntent,
  structure: RecipeStructure,
): RecipeConversion {
  return {
    primary_goal: intent.primary_goal,
    primary_cta: {
      type: intent.primary_action.type,
      label: structure.primary_action.cta_label,
      destination: intent.primary_action.value,
    },
    priority_order: resolvePriorityOrder(intent.primary_goal, intent.primary_action.type),
  };
}
