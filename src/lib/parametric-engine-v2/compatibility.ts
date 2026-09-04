/**
 * Stage 6 — compatibility + capability downgrades.
 *
 * Nothing unsupported or visually invalid ever reaches the validator.
 * Every downgrade is explicit and recorded.
 */

import { SAFE_PALETTE } from "./palettes";
import { SAFE_PAIR, isApprovedPair } from "./typography";
import type {
  NormalizedIntent,
  RecipeBlock,
  RecipeDesign,
  RecipeStructure,
  RendererCapabilitiesV1,
} from "./types";
import { RESERVED_BLOCK_TYPES } from "./types";
import { contrastRatio } from "./utils";

export const MIN_TEXT_CONTRAST = 4.5;

export interface CompatibilityOutcome {
  design: RecipeDesign;
  structure: RecipeStructure;
  blocks: RecipeBlock[];
  downgrades: string[];
}

export function applyCompatibility(
  intent: NormalizedIntent,
  input: { design: RecipeDesign; structure: RecipeStructure; blocks: RecipeBlock[] },
  capabilities: RendererCapabilitiesV1,
): CompatibilityOutcome {
  const downgrades: string[] = [];
  const design: RecipeDesign = structuredClone(input.design);
  const structure: RecipeStructure = structuredClone(input.structure);

  /* -------------------------------------------------------- palette */
  const paletteOk =
    contrastRatio(design.palette.text, design.palette.background) >= MIN_TEXT_CONTRAST &&
    contrastRatio(design.palette.text, design.palette.surface) >= MIN_TEXT_CONTRAST &&
    contrastRatio(design.palette.text_muted, design.palette.background) >= MIN_TEXT_CONTRAST &&
    contrastRatio(design.palette.accent_contrast, design.palette.accent) >= MIN_TEXT_CONTRAST;
  if (!paletteOk) {
    design.palette = { ...SAFE_PALETTE };
    downgrades.push("palette:fallback_safe_palette");
  }

  /* ------------------------------------------------------ typography */
  if (!isApprovedPair(design.typography)) {
    design.typography = { ...design.typography, ...SAFE_PAIR };
    downgrades.push("typography:fallback_safe_pair");
  }

  /* ------------------------------------------------------ background */
  if (design.background.type === "radial-gradient" && !capabilities.radial_background) {
    design.background = { type: "solid", value: { kind: "solid", color: design.palette.background } };
    downgrades.push("background:radial_unsupported");
  }
  if (design.background.type === "linear-gradient" && !capabilities.gradient_background) {
    design.background = { type: "solid", value: { kind: "solid", color: design.palette.background } };
    downgrades.push("background:gradient_unsupported");
  }

  /* ----------------------------------------------------------- cards */
  if (design.card.enabled && !capabilities.professional_cards) {
    design.card.enabled = false;
    downgrades.push("card:professional_cards_unsupported");
  }
  if (design.card.enabled) {
    if (design.card.media_position === "right" && !capabilities.card_media_right) {
      design.card.media_position = capabilities.card_media_bottom ? "bottom" : "none";
      downgrades.push("card:media_right_unsupported");
    }
    if (design.card.media_position === "bottom" && !capabilities.card_media_bottom) {
      design.card.media_position = capabilities.card_media_right ? "right" : "none";
      downgrades.push("card:media_bottom_unsupported");
    }
    if (design.card.style === "elevated" && !capabilities.elevated_cards) {
      design.card.style = "bordered";
      downgrades.push("card:elevated_unsupported");
    }
  }
  // Identity avatars are never treated as card media.
  const hasCardMedia = intent.assets.has_card_media;
  const hasAvatar = intent.assets.has_avatar;
  const hasBanner = intent.assets.has_banner;
  if (!hasCardMedia && design.card.media_position !== "none") {
    design.card.media_position = "none";
    downgrades.push("card:media_without_asset");
  }

  /* --------------------------------------------------------- buttons */
  if (design.button.style === "outline" && design.geometry.border_style === "none") {
    design.geometry.border_style = "subtle";
    downgrades.push("button:outline_requires_border");
  }

  /* ---------------------------------------------------------- layout */
  if (design.spacing.horizontal_padding === "compact") {
    // 320px viability: never combine compact padding with compact item gap.
    design.spacing.horizontal_padding = "balanced";
    downgrades.push("layout:min_horizontal_padding");
  }

  /* ------------------------------------------------------- structure */
  if (structure.primary_action.presentation === "professional_card" && !design.card.enabled) {
    structure.primary_action.presentation = "button";
    downgrades.push("structure:professional_card_downgraded_to_button");
  }
  if (structure.hero.show_professional_badge && !capabilities.professional_badge) {
    structure.hero.show_professional_badge = false;
    downgrades.push("structure:professional_badge_unsupported");
  }
  if (structure.social_row.enabled && !capabilities.social_links) {
    structure.social_row.enabled = false;
    downgrades.push("structure:social_links_unsupported");
  }
  if (!design.card.enabled) {
    structure.links.presentation = "buttons";
    structure.links.max_primary_cards = 0;
  }
  if (structure.hero.show_avatar && !hasAvatar) {
    structure.hero.show_avatar = false;
    downgrades.push("structure:avatar_without_image");
  }
  if (structure.hero.show_banner && !hasBanner) {
    structure.hero.show_banner = false;
    downgrades.push("structure:banner_without_image");
  }
  if (structure.hero.mode !== "avatar_only" && !capabilities.hero_banner) {
    structure.hero.mode = "avatar_only";
    structure.hero.show_banner = false;
    structure.hero.show_avatar = hasAvatar;
    downgrades.push("structure:hero_banner_unsupported");
  }

  /* ---------------------------------------------------------- blocks */
  let blocks = input.blocks.filter((block) => {
    if ((RESERVED_BLOCK_TYPES as readonly string[]).includes(block.type)) {
      downgrades.push(`block:${block.type}_reserved_removed`);
      return false;
    }
    if (block.type === "social_links" && !structure.social_row.enabled) return false;
    if (
      block.type === "media" &&
      (!capabilities.media_block || !hasCardMedia || design.card.media_position === "none")
    ) {
      downgrades.push("block:media_removed");
      return false;
    }
    return true;
  });

  // A downgraded professional card is replaced IN PLACE so the conversion
  // block never loses its semantic position.
  if (structure.primary_action.presentation === "button") {
    blocks = blocks.map((block) =>
      block.type === "professional_card"
        ? { ...block, type: "primary_cta", role: "conversion" }
        : block,
    );
  }

  const hasConversion = blocks.some(
    (b) => b.type === "primary_cta" || b.type === "professional_card",
  );
  if (!hasConversion) {
    // Restored at the semantic conversion slot: after identity, before any
    // navigation/media block.
    const cta: RecipeBlock = { id: "primary_cta", type: "primary_cta", order: 0, role: "conversion" };
    let at = blocks.findIndex((b) => b.role === "navigation" || b.role === "media" || b.role === "meta");
    if (at < 0) at = blocks.length;
    blocks = [...blocks.slice(0, at), cta, ...blocks.slice(at)];
    downgrades.push("block:primary_cta_restored");
  }


  blocks = blocks.map((b, i) => ({ ...b, order: i }));

  return { design, structure, blocks, downgrades };
}
