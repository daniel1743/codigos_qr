/**
 * V1.5 — RecipeQualityScoreV1.
 *
 * A DETERMINISTIC HEURISTIC ranking system. It is not a claim of objective
 * aesthetic truth. No AI, no network, no computer vision.
 */

import type { ArchetypeStrategy } from "./archetypes";
import type { BusinessSignalsV1 } from "./business-signals";
import type { CompositionPattern } from "./composition-patterns";
import type { ContentInventoryV1 } from "./content-inventory";
import { checkRecipeRendererCompatibility } from "./fingerprint";
import type { NormalizedIntent, PageRecipeV1, RendererCapabilitiesV1 } from "./types";
import { clamp, contrastRatio } from "./utils";

export interface RecipeQualityScoreV1 {
  accessibility: number;
  business_fit: number;
  conversion_fit: number;
  content_fit: number;
  hierarchy: number;
  mobile_viability: number;
  visual_coherence: number;
  capability_fit: number;
  total: number;
}

export interface ScoreContext {
  intent: NormalizedIntent;
  signals: BusinessSignalsV1;
  strategy: ArchetypeStrategy;
  content: ContentInventoryV1;
  pattern: CompositionPattern;
  capabilities: RendererCapabilitiesV1;
}

const round = (n: number) => Math.round(clamp(n, 0, 100));

function accessibilityScore(recipe: PageRecipeV1): number {
  const p = recipe.design.palette;
  const ratios = [
    contrastRatio(p.text, p.background),
    contrastRatio(p.text, p.surface),
    contrastRatio(p.text_muted, p.background),
    contrastRatio(p.accent_contrast, p.accent),
  ];
  const worst = Math.min(...ratios);
  const base = worst >= 7 ? 100 : worst >= 4.5 ? 80 + (worst - 4.5) * 8 : 0;
  const legible = recipe.design.typography.body_scale === "sm" ? -5 : 0;
  return round(base + legible);
}

function businessFit(recipe: PageRecipeV1, ctx: ScoreContext): number {
  const w = ctx.strategy.weights;
  let score = 60;
  if (ctx.strategy.preferred_patterns.includes(ctx.pattern)) score += 20;
  const trustLeaning =
    recipe.structure.hero.identity_alignment === "left" || recipe.structure.hero.show_professional_badge;
  if (w.trust >= 75) score += trustLeaning ? 12 : -8;
  const visualLeaning =
    recipe.structure.hero.mode !== "avatar_only" || recipe.design.card.media_position !== "none";
  if (w.visual >= 80) score += visualLeaning ? 12 : -10;
  if (w.visual <= 30 && recipe.design.background.type !== "solid") score -= 6;
  return round(score);
}

function conversionFit(recipe: PageRecipeV1, ctx: ScoreContext): number {
  let score = 60;
  const pressure = ctx.strategy.weights.cta_pressure;
  const conversionIndex = recipe.blocks.findIndex((b) => b.role === "conversion");
  const navIndex = recipe.blocks.findIndex((b) => b.role === "navigation");
  if (conversionIndex >= 0 && (navIndex < 0 || conversionIndex < navIndex)) score += 20;
  else score -= 15;
  if (pressure >= 80 && recipe.design.button.style === "solid") score += 12;
  if (pressure >= 80 && recipe.design.button.style === "outline") score -= 8;
  if (recipe.conversion.primary_cta.destination.length > 0) score += 5;
  if (ctx.signals.urgency === "high" && recipe.design.geometry.density === "spacious") score -= 5;
  return round(score);
}

function contentFit(recipe: PageRecipeV1, ctx: ScoreContext): number {
  let score = 70;
  const hasVisualContent =
    ctx.intent.assets.has_banner || ctx.intent.assets.has_card_media || ctx.content.gallery.available;
  if (recipe.structure.hero.mode !== "avatar_only" && !ctx.intent.assets.has_banner) score -= 25;
  if (recipe.design.card.media_position !== "none" && !ctx.intent.assets.has_card_media) score -= 25;
  if (hasVisualContent && recipe.structure.hero.mode === "avatar_only" && recipe.design.card.media_position === "none")
    score -= 8;
  if (!ctx.intent.identity.bio && recipe.structure.hero.show_bio) score -= 10;
  return round(score);
}

function hierarchyScore(recipe: PageRecipeV1): number {
  let score = 70;
  const roles = recipe.blocks.map((b) => b.role);
  if (roles[0] === "identity") score += 15;
  if (roles[roles.length - 1] === "meta") score += 5;
  const conversion = roles.indexOf("conversion");
  if (conversion > 0 && conversion <= 2) score += 10;
  if (recipe.design.typography.heading_scale === recipe.design.typography.body_scale) score -= 5;
  return round(score);
}

function mobileViability(recipe: PageRecipeV1): number {
  let score = 85;
  if (recipe.design.spacing.horizontal_padding === "compact") score -= 40;
  if (recipe.design.geometry.density === "compact" && recipe.design.spacing.item_gap === "compact") score -= 10;
  if (recipe.design.card.media_position === "right") score -= 5;
  if (recipe.blocks.length > 8) score -= 10;
  return round(score);
}

function visualCoherence(recipe: PageRecipeV1): number {
  let score = 80;
  const { geometry, button, card, background } = recipe.design;
  if (button.shape !== geometry.radius) score -= 10;
  if (button.style === "outline" && geometry.border_style === "none") score -= 15;
  if (card.style === "elevated" && geometry.border_style === "defined") score -= 5;
  if (background.type !== "solid" && geometry.density === "compact") score -= 5;
  if (recipe.design.avatar.alignment !== recipe.structure.hero.identity_alignment) score -= 10;
  return round(score);
}

function capabilityFit(recipe: PageRecipeV1, ctx: ScoreContext): number {
  const report = checkRecipeRendererCompatibility(recipe, ctx.capabilities);
  return report.compatible ? 100 : round(100 - report.unsupported.length * 25);
}

const WEIGHTS = {
  accessibility: 0.2,
  business_fit: 0.15,
  conversion_fit: 0.18,
  content_fit: 0.12,
  hierarchy: 0.1,
  mobile_viability: 0.12,
  visual_coherence: 0.08,
  capability_fit: 0.05,
} as const;

export function scoreRecipe(recipe: PageRecipeV1, ctx: ScoreContext): RecipeQualityScoreV1 {
  const dims = {
    accessibility: accessibilityScore(recipe),
    business_fit: businessFit(recipe, ctx),
    conversion_fit: conversionFit(recipe, ctx),
    content_fit: contentFit(recipe, ctx),
    hierarchy: hierarchyScore(recipe),
    mobile_viability: mobileViability(recipe),
    visual_coherence: visualCoherence(recipe),
    capability_fit: capabilityFit(recipe, ctx),
  };
  const total = round(
    Object.entries(WEIGHTS).reduce(
      (sum, [key, weight]) => sum + dims[key as keyof typeof dims] * weight,
      0,
    ),
  );
  return { ...dims, total };
}

/** Clearly weak combinations are rejected before ranking. */
export const MIN_ACCEPTABLE_TOTAL = 45;

export function isAcceptableQuality(score: RecipeQualityScoreV1): boolean {
  return score.total >= MIN_ACCEPTABLE_TOTAL && score.accessibility > 0 && score.mobile_viability >= 50;
}
