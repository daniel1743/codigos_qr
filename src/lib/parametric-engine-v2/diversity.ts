/**
 * V1.5 — diversity / anti-duplication.
 *
 * Prevents "the same design with different colors" from filling the Top N.
 */

import type { CompositionPattern } from "./composition-patterns";
import type { PageRecipeV1 } from "./types";
import { relativeLuminance } from "./utils";

export type PaletteMood = "light" | "dark" | "warm" | "cool" | "neutral";

export interface RecipeStructuralSignatureV1 {
  family: string;
  composition_pattern: CompositionPattern | "unknown";
  hero_mode: string;
  alignment: string;
  links_presentation: string;
  density: string;
  card_style: string;
  background_type: string;
  /* V1.5.1 — structural axes: palette-only variation is no longer diversity. */
  radius: string;
  border_style: string;
  card_action_style: string;
  spacing_rhythm: string;
  button_style: string;
  avatar_shape: string;
  heading_scale: string;
  palette_mood: PaletteMood;
}

/** Palette mood is the only non-structural dimension of the signature. */
const NON_STRUCTURAL_KEYS: (keyof RecipeStructuralSignatureV1)[] = ["palette_mood"];

export function paletteMood(recipe: PageRecipeV1): PaletteMood {
  const bg = recipe.design.palette.background;
  if (relativeLuminance(bg) < 0.25) return "dark";
  const accent = recipe.design.palette.accent;
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread < 30) return "neutral";
  if (r >= b) return "warm";
  return "cool";
}

export function structuralSignature(
  recipe: PageRecipeV1,
  pattern: CompositionPattern | "unknown" = "unknown",
): RecipeStructuralSignatureV1 {
  return {
    family: recipe.meta.family,
    composition_pattern: pattern,
    hero_mode: recipe.structure.hero.mode,
    alignment: recipe.structure.hero.identity_alignment,
    links_presentation: recipe.structure.links.presentation,
    density: recipe.design.geometry.density,
    card_style: recipe.design.card.enabled ? recipe.design.card.style : "no_cards",
    background_type: recipe.design.background.type,
    radius: recipe.design.geometry.radius,
    border_style: recipe.design.geometry.border_style,
    card_action_style: recipe.design.card.enabled ? recipe.design.card.action_style : "no_cards",
    spacing_rhythm: recipe.design.spacing.section_gap,
    button_style: recipe.design.button.style,
    avatar_shape: recipe.design.avatar.shape,
    heading_scale: recipe.design.typography.heading_scale,
    palette_mood: paletteMood(recipe),
  };
}

/** Number of differing signature dimensions. */
export function signatureDistance(
  a: RecipeStructuralSignatureV1,
  b: RecipeStructuralSignatureV1,
): number {
  const keys = Object.keys(a) as (keyof RecipeStructuralSignatureV1)[];
  return keys.reduce((sum, key) => sum + (a[key] === b[key] ? 0 : 1), 0);
}

/** Differing dimensions ignoring palette mood. */
export function structuralDistance(
  a: RecipeStructuralSignatureV1,
  b: RecipeStructuralSignatureV1,
): number {
  const keys = (Object.keys(a) as (keyof RecipeStructuralSignatureV1)[]).filter(
    (key) => !NON_STRUCTURAL_KEYS.includes(key),
  );
  return keys.reduce((sum, key) => sum + (a[key] === b[key] ? 0 : 1), 0);
}

export interface DiversityCandidate {
  signature: RecipeStructuralSignatureV1;
}

/**
 * Greedy deterministic selection: keeps input order (already score-ranked)
 * and admits a candidate only when it is far enough from every kept one.
 * If not enough distinct candidates exist, the threshold relaxes step by
 * step so the result count stays predictable.
 */
export function selectDistinctCandidates<T extends DiversityCandidate>(
  candidates: T[],
  desiredCount: number,
  minimumDistance = 2,
): T[] {
  const selected: T[] = [];
  for (let threshold = minimumDistance; threshold >= 0; threshold--) {
    for (const candidate of candidates) {
      if (selected.length >= desiredCount) break;
      if (selected.includes(candidate)) continue;
      const ok = selected.every((kept) => {
        const structural = structuralDistance(kept.signature, candidate.signature);
        // Above threshold 0, at least one STRUCTURAL dimension must differ.
        if (threshold > 0 && structural === 0) return false;
        return signatureDistance(kept.signature, candidate.signature) >= threshold;
      });
      if (ok) selected.push(candidate);
    }
    if (selected.length >= desiredCount) break;
  }
  return selected.slice(0, desiredCount);
}
