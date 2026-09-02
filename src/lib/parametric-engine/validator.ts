/**
 * Stage 7 — full PageRecipeV1 validation. An invalid recipe is never returned.
 */

import { MIN_TEXT_CONTRAST } from "./compatibility";
import { isApprovedPair } from "./typography";
import type { PageRecipeV1, ValidationIssue, ValidationResult } from "./types";
import {
  CANONICAL_CTA_LABELS,
  FAMILY_IDS,
  HERO_MODES,
  FONT_TOKENS,
  FONT_WEIGHTS,
  PRIMARY_ACTION_TYPES,
  PRIMARY_GOALS,
  RESERVED_BLOCK_TYPES,
  SUPPORTED_BLOCK_TYPES,
  VISUAL_PERSONALITIES,
} from "./types";
import { contrastRatio, isHex } from "./utils";

const RADII = ["sharp", "soft", "rounded", "pill"];
const DENSITIES = ["compact", "balanced", "spacious"];

export function validatePageRecipe(recipe: PageRecipeV1): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fail = (path: string, code: string, message: string) =>
    issues.push({ path, code, message });

  if (!recipe || typeof recipe !== "object") {
    return { valid: false, issues: [{ path: "recipe", code: "type", message: "Recipe must be an object." }] };
  }

  /* ------------------------------------------------------------- meta */
  const m = recipe.meta;
  if (!m || m.recipe_version !== "1" || m.engine_version !== "1" || m.source_intent_version !== "1") {
    fail("meta", "version", "Recipe/engine/intent versions must all be '1'.");
  }
  if (!m || typeof m.generated_at !== "string" || Number.isNaN(Date.parse(m.generated_at))) {
    fail("meta.generated_at", "format", "generated_at must be an ISO timestamp.");
  }
  if (!FAMILY_IDS.includes(m?.family as never)) fail("meta.family", "enum", "Unknown family.");
  if (!VISUAL_PERSONALITIES.includes(m?.personality as never)) {
    fail("meta.personality", "enum", "Unknown personality.");
  }
  if (!PRIMARY_GOALS.includes(m?.primary_goal as never)) {
    fail("meta.primary_goal", "enum", "Unknown goal.");
  }

  /* --------------------------------------------------------- identity */
  const id = recipe.identity;
  if (!id || typeof id.name !== "string" || id.name.trim().length < 2) {
    fail("identity.name", "required", "identity.name is required.");
  }
  if (!id || typeof id.profession !== "string") fail("identity.profession", "type", "Must be a string.");
  if (!id || typeof id.bio !== "string") fail("identity.bio", "type", "Must be a string.");
  if (id && id.avatar !== null && typeof id.avatar !== "string") {
    fail("identity.avatar", "type", "Must be a string or null.");
  }
  for (const key of ["avatar", "banner"] as const) {
    const value = id?.[key];
    if (value !== null && typeof value !== "string") {
      fail(`identity.${key}`, "type", "Must be a string or null.");
    }
    if (typeof value === "string" && value.startsWith("blob:")) {
      fail(`identity.${key}`, "blob_url", "Blob URLs must never enter the recipe contract.");
    }
  }

  /* ----------------------------------------------------------- design */
  const d = recipe.design;
  if (!d) {
    fail("design", "required", "design is required.");
    return { valid: false, issues };
  }

  for (const [key, value] of Object.entries(d.palette ?? {})) {
    if (!isHex(value as string)) fail(`design.palette.${key}`, "color", "Must be a #rrggbb hex value.");
  }
  const p = d.palette;
  if (p && isHex(p.text) && isHex(p.background)) {
    if (contrastRatio(p.text, p.background) < MIN_TEXT_CONTRAST) {
      fail("design.palette.text", "contrast", "Text/background contrast below 4.5:1.");
    }
    if (contrastRatio(p.text, p.surface) < MIN_TEXT_CONTRAST) {
      fail("design.palette.text", "contrast", "Text/surface contrast below 4.5:1.");
    }
    if (contrastRatio(p.text_muted, p.background) < MIN_TEXT_CONTRAST) {
      fail("design.palette.text_muted", "contrast", "Muted text contrast below 4.5:1.");
    }
    if (contrastRatio(p.accent_contrast, p.accent) < MIN_TEXT_CONTRAST) {
      fail("design.palette.accent", "contrast", "CTA text/accent contrast below 4.5:1.");
    }
    if (contrastRatio(p.border, p.background) < 1.2) {
      fail("design.palette.border", "contrast", "Border is indistinguishable from background.");
    }
  }

  const t = d.typography;
  if (!FONT_TOKENS.includes(t?.heading_family as never) || !FONT_TOKENS.includes(t?.body_family as never)) {
    fail("design.typography", "font_token", "Only approved renderer-safe font tokens are allowed.");
  }
  if (!FONT_WEIGHTS.includes(t?.heading_weight as never) || !FONT_WEIGHTS.includes(t?.body_weight as never)) {
    fail("design.typography", "weight", "Font weight not allowed.");
  }
  if (t && !isApprovedPair(t)) {
    fail("design.typography", "pair", "Heading/body pairing is not approved.");
  }

  if (!RADII.includes(d.geometry?.radius)) fail("design.geometry.radius", "enum", "Unknown radius.");
  if (!DENSITIES.includes(d.geometry?.density)) fail("design.geometry.density", "enum", "Unknown density.");
  if (d.button?.style === "outline" && d.geometry?.border_style === "none") {
    fail("design.button.style", "invalid_combo", "Outline buttons require a visible border style.");
  }
  if ((d.button as unknown as { style: string })?.style === "card") {
    fail("design.button.style", "deprecated", "button_style=card is deprecated; card is a presentation mode.");
  }

  const bg = d.background;
  if (!bg || !["solid", "linear-gradient", "radial-gradient"].includes(bg.type)) {
    fail("design.background.type", "enum", "Unknown background type.");
  } else if (typeof bg.value !== "object" || bg.value === null) {
    fail("design.background.value", "type", "Background value must be structured, never a raw CSS string.");
  } else {
    const v = bg.value as Record<string, unknown>;
    const colors =
      v["kind"] === "solid" ? [v["color"]] : [v["from"], v["to"]];
    for (const c of colors) {
      if (typeof c !== "string" || !isHex(c)) {
        fail("design.background.value", "color", "Background colors must be hex values.");
      }
    }
    if (v["kind"] === "linear" && typeof v["angle"] !== "number") {
      fail("design.background.value.angle", "type", "Linear gradient angle must be a number.");
    }
  }

  if (d.card && (d.card.image_focal_y < 0 || d.card.image_focal_y > 100)) {
    fail("design.card.image_focal_y", "range", "image_focal_y must be between 0 and 100.");
  }
  if (d.card && !["right", "bottom", "none"].includes(d.card.media_position)) {
    fail("design.card.media_position", "enum", "Card media position must be right, bottom or none.");
  }
  if (d.spacing?.horizontal_padding === "compact") {
    fail("design.spacing.horizontal_padding", "viability_320", "Compact horizontal padding breaks 320px viability.");
  }

  /* -------------------------------------------------------- structure */
  const s = recipe.structure;
  if (!s?.hero?.enabled) fail("structure.hero.enabled", "required", "Hero must be enabled.");
  if (!HERO_MODES.includes(s?.hero?.mode as never)) {
    fail("structure.hero.mode", "enum", "Unknown hero mode.");
  }
  if (s?.hero?.mode === "avatar_only" && s.hero.show_banner) {
    fail("structure.hero.show_banner", "invalid_combo", "avatar_only hero cannot show a banner.");
  }
  if (s?.hero?.mode === "banner_only" && s.hero.show_avatar) {
    fail("structure.hero.show_avatar", "invalid_combo", "banner_only hero cannot show an avatar.");
  }
  if (!s?.primary_action?.enabled) fail("structure.primary_action.enabled", "required", "Primary action required.");
  if (!CANONICAL_CTA_LABELS.includes(s?.primary_action?.cta_label as never)) {
    fail("structure.primary_action.cta_label", "canonical", "CTA label is not in the canonical set.");
  }
  if (s?.primary_action?.presentation === "professional_card" && !d.card?.enabled) {
    fail("structure.primary_action.presentation", "invalid_combo", "Professional card requires cards enabled.");
  }
  if (s && s.links.max_primary_cards > 0 && s.links.presentation === "buttons") {
    fail("structure.links", "invalid_combo", "Button presentation cannot declare primary cards.");
  }
  if (!s?.footer?.enabled) fail("structure.footer.enabled", "required", "Footer must be enabled.");

  /* ----------------------------------------------------------- blocks */
  const blocks = recipe.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    fail("blocks", "required", "At least one block is required.");
  } else {
    const ids = new Set<string>();
    blocks.forEach((b, i) => {
      if ((RESERVED_BLOCK_TYPES as readonly string[]).includes(b.type)) {
        fail(`blocks[${i}].type`, "reserved", `Reserved block "${b.type}" must not be emitted in V1.`);
      } else if (!(SUPPORTED_BLOCK_TYPES as readonly string[]).includes(b.type)) {
        fail(`blocks[${i}].type`, "enum", "Unknown block type.");
      }
      if (b.order !== i) fail(`blocks[${i}].order`, "order", "Block order must be contiguous and ascending.");
      if (ids.has(b.id)) fail(`blocks[${i}].id`, "duplicate", "Duplicate block id.");
      ids.add(b.id);
    });
    if (!blocks.some((b) => b.type === "primary_cta" || b.type === "professional_card")) {
      fail("blocks", "missing_conversion", "A conversion block is required.");
    }
    if (!blocks.some((b) => b.type === "footer")) fail("blocks", "missing_footer", "Footer block is required.");
  }

  /* ------------------------------------------------------- conversion */
  const c = recipe.conversion;
  if (!PRIMARY_GOALS.includes(c?.primary_goal as never)) {
    fail("conversion.primary_goal", "enum", "Unknown goal.");
  }
  if (c && c.primary_goal !== recipe.meta?.primary_goal) {
    fail("conversion.primary_goal", "mismatch", "Goal must match meta.primary_goal.");
  }
  if (!PRIMARY_ACTION_TYPES.includes(c?.primary_cta?.type as never)) {
    fail("conversion.primary_cta.type", "enum", "Unknown action type.");
  }
  if (!CANONICAL_CTA_LABELS.includes(c?.primary_cta?.label as never)) {
    fail("conversion.primary_cta.label", "canonical", "CTA label is not canonical.");
  }
  if (typeof c?.primary_cta?.destination !== "string" || !c.primary_cta.destination.trim()) {
    fail("conversion.primary_cta.destination", "required", "Destination is required.");
  }
  if (!Array.isArray(c?.priority_order) || c.priority_order.length === 0) {
    fail("conversion.priority_order", "required", "Priority order is required.");
  } else if (c.priority_order[0] !== c.primary_cta.type) {
    fail("conversion.priority_order", "order", "Primary action must lead the priority order.");
  }

  /* ---------------------------------------------------- serialization */
  if (!isJsonSerializable(recipe)) {
    fail("recipe", "serialization", "Recipe must be plain JSON (no functions, DOM nodes or blob URLs).");
  }

  return { valid: issues.length === 0, issues };
}

export function isJsonSerializable(value: unknown): boolean {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): boolean => {
    if (v === null) return true;
    const type = typeof v;
    if (type === "string" || type === "boolean") return true;
    if (type === "number") return Number.isFinite(v as number);
    if (type === "function" || type === "symbol" || type === "undefined" || type === "bigint") return false;
    if (type === "object") {
      const obj = v as object;
      if (seen.has(obj)) return false;
      seen.add(obj);
      if (Array.isArray(obj)) return obj.every(walk);
      if (Object.getPrototypeOf(obj) !== Object.prototype && Object.getPrototypeOf(obj) !== null) {
        return false;
      }
      return Object.values(obj as Record<string, unknown>).every(walk);
    }
    return false;
  };
  return walk(value);
}
