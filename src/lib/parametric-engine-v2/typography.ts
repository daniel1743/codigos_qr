/**
 * Renderer-safe font tokens and approved heading/body pairings.
 *
 * The engine never emits font URLs or arbitrary family names — only tokens
 * the renderer maps to --tpl-font-*.
 */

import type { FamilyId, FontToken, FontWeight, RecipeTypography } from "./types";

export interface TypographyPair {
  heading_family: FontToken;
  body_family: FontToken;
  heading_weight: FontWeight;
  body_weight: FontWeight;
}

/** Only these pairings are considered visually compatible in V1. */
export const APPROVED_PAIRS: TypographyPair[] = [
  { heading_family: "serif-display", body_family: "sans-neutral", heading_weight: 700, body_weight: 400 },
  { heading_family: "serif-text", body_family: "sans-humanist", heading_weight: 600, body_weight: 400 },
  { heading_family: "sans-geometric", body_family: "sans-neutral", heading_weight: 700, body_weight: 400 },
  { heading_family: "sans-neutral", body_family: "sans-neutral", heading_weight: 600, body_weight: 400 },
  { heading_family: "sans-humanist", body_family: "sans-humanist", heading_weight: 600, body_weight: 400 },
  { heading_family: "sans-geometric", body_family: "sans-humanist", heading_weight: 700, body_weight: 500 },
];

export const FAMILY_PAIRS: Record<FamilyId, TypographyPair[]> = {
  editorial: [APPROVED_PAIRS[1]!, APPROVED_PAIRS[0]!],
  luxury: [APPROVED_PAIRS[0]!, APPROVED_PAIRS[1]!],
  corporate: [APPROVED_PAIRS[3]!, APPROVED_PAIRS[2]!],
  minimal: [APPROVED_PAIRS[3]!, APPROVED_PAIRS[4]!],
  creator: [APPROVED_PAIRS[2]!, APPROVED_PAIRS[4]!],
  energetic: [APPROVED_PAIRS[5]!, APPROVED_PAIRS[2]!],
};

export function isApprovedPair(t: RecipeTypography): boolean {
  return APPROVED_PAIRS.some(
    (p) =>
      p.heading_family === t.heading_family &&
      p.body_family === t.body_family &&
      p.heading_weight === t.heading_weight &&
      p.body_weight === t.body_weight,
  );
}

export const SAFE_PAIR: TypographyPair = APPROVED_PAIRS[3]!;
