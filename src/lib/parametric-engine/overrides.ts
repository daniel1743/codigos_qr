/**
 * Explicit user design control (DesignOverridesV1).
 *
 * Overrides are applied AFTER engine composition and BEFORE compatibility,
 * so the capability registry still has the final word on what the renderer
 * can display. Locked overrides are re-applied after compatibility whenever
 * the renderer supports them, so a user preference survives regeneration and
 * deterministic variant changes.
 */

import type {
  DesignOverridesV1,
  NormalizedIntent,
  OverrideKey,
  RecipeDesign,
  RecipeStructure,
  RendererCapabilitiesV1,
} from "./types";

export function isLocked(overrides: DesignOverridesV1 | undefined, key: OverrideKey): boolean {
  return Boolean(overrides?.locked?.includes(key));
}

function applyDensity(design: RecipeDesign, density: RecipeDesign["geometry"]["density"]) {
  design.geometry.density = density;
  design.spacing.section_gap = density;
  design.spacing.item_gap = density === "spacious" ? "balanced" : density;
  // 320px viability: horizontal padding is never compact.
  design.spacing.horizontal_padding = density === "compact" ? "balanced" : density;
}

function applyAlignment(
  design: RecipeDesign,
  structure: RecipeStructure,
  alignment: RecipeDesign["avatar"]["alignment"],
) {
  design.avatar.alignment = alignment;
  design.button.alignment = alignment;
  structure.hero.identity_alignment = alignment;
}

function applyLinksPresentation(
  design: RecipeDesign,
  structure: RecipeStructure,
  presentation: RecipeStructure["links"]["presentation"],
) {
  if (presentation === "buttons") {
    structure.links.presentation = "buttons";
    structure.links.max_primary_cards = 0;
    return;
  }
  design.card.enabled = true;
  structure.links.presentation = presentation;
  structure.links.max_primary_cards = Math.max(structure.links.max_primary_cards, 2);
}

export interface OverrideOutcome {
  design: RecipeDesign;
  structure: RecipeStructure;
  applied: string[];
}

export function applyOverrides(
  design: RecipeDesign,
  structure: RecipeStructure,
  overrides: DesignOverridesV1 | undefined,
  intent: NormalizedIntent,
): OverrideOutcome {
  const applied: string[] = [];
  if (!overrides) return { design, structure, applied };

  if (overrides.hero_mode) {
    structure.hero.mode = overrides.hero_mode;
    // Composition intent is expressed even when the asset is missing;
    // actual asset presence stays in show_avatar / show_banner.
    structure.hero.show_avatar =
      overrides.hero_mode !== "banner_only" && intent.assets.has_avatar;
    structure.hero.show_banner = overrides.hero_mode !== "avatar_only" && intent.assets.has_banner;
    applied.push("override:hero_mode");
  }
  if (overrides.identity_alignment) {
    applyAlignment(design, structure, overrides.identity_alignment);
    applied.push("override:identity_alignment");
  }
  if (overrides.density) {
    applyDensity(design, overrides.density);
    applied.push("override:density");
  }
  if (overrides.links_presentation) {
    applyLinksPresentation(design, structure, overrides.links_presentation);
    applied.push("override:links_presentation");
  }
  if (overrides.card_media_position && intent.assets.has_card_media) {
    design.card.media_position = overrides.card_media_position;
    applied.push("override:card_media_position");
  }

  return { design, structure, applied };
}

/** Re-applies locked preferences after compatibility, capability permitting. */
export function reapplyLockedOverrides(
  design: RecipeDesign,
  structure: RecipeStructure,
  overrides: DesignOverridesV1 | undefined,
  intent: NormalizedIntent,
  capabilities: RendererCapabilitiesV1,
): string[] {
  const applied: string[] = [];
  if (!overrides?.locked?.length) return applied;

  if (isLocked(overrides, "identity_alignment") && overrides.identity_alignment) {
    applyAlignment(design, structure, overrides.identity_alignment);
    applied.push("locked:identity_alignment");
  }
  if (isLocked(overrides, "density") && overrides.density) {
    applyDensity(design, overrides.density);
    applied.push("locked:density");
  }
  if (isLocked(overrides, "hero_mode") && overrides.hero_mode) {
    const wantsBanner = overrides.hero_mode !== "avatar_only";
    if (!wantsBanner || capabilities.hero_banner) {
      structure.hero.mode = overrides.hero_mode;
      structure.hero.show_avatar =
        overrides.hero_mode !== "banner_only" && intent.assets.has_avatar;
      structure.hero.show_banner = wantsBanner && intent.assets.has_banner;
      applied.push("locked:hero_mode");
    }
  }
  if (isLocked(overrides, "links_presentation") && overrides.links_presentation) {
    const wantsCards = overrides.links_presentation !== "buttons";
    if (!wantsCards || capabilities.professional_cards) {
      applyLinksPresentation(design, structure, overrides.links_presentation);
      applied.push("locked:links_presentation");
    }
  }
  if (
    isLocked(overrides, "card_media_position") &&
    overrides.card_media_position &&
    intent.assets.has_card_media &&
    design.card.enabled
  ) {
    const supported =
      overrides.card_media_position === "right"
        ? capabilities.card_media_right
        : capabilities.card_media_bottom;
    if (supported) {
      design.card.media_position = overrides.card_media_position;
      applied.push("locked:card_media_position");
    }
  }

  return applied;
}
