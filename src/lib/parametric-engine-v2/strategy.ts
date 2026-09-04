/**
 * Stages 2-3 — deterministic strategy + family selection.
 *
 * Personality influences family selection but never maps one-to-one:
 * business category and conversion goal carry comparable weight.
 */

import { FAMILY_PRIORITY } from "./families";
import type {
  BusinessCategory,
  DesignProfile,
  FamilyId,
  NormalizedIntent,
  PrimaryGoal,
  VisualPersonality,
} from "./types";
import { FAMILY_IDS } from "./types";
import { clamp, stableHash } from "./utils";

type Weights = Partial<Record<FamilyId, number>>;

const PERSONALITY_WEIGHTS: Record<VisualPersonality, Weights> = {
  elegant: { editorial: 32, luxury: 26, minimal: 14, corporate: 8 },
  minimal: { minimal: 34, editorial: 18, corporate: 10 },
  modern: { creator: 22, energetic: 18, minimal: 18, corporate: 14 },
  professional: { corporate: 34, editorial: 16, minimal: 12 },
  energetic: { energetic: 34, creator: 22, corporate: 6 },
  premium: { luxury: 36, editorial: 18, corporate: 10 },
};

const CATEGORY_WEIGHTS: Record<BusinessCategory, Weights> = {
  beauty: { luxury: 20, editorial: 16, creator: 12, minimal: 6 },
  professional: { corporate: 24, editorial: 12, minimal: 10 },
  creator: { creator: 24, energetic: 14, editorial: 8 },
  food: { energetic: 18, creator: 14, luxury: 10, corporate: 6 },
  fitness: { energetic: 20, corporate: 12, creator: 10 },
  local: { corporate: 18, minimal: 12, creator: 8 },
  freelancer: { editorial: 18, minimal: 16, corporate: 12 },
  other: { minimal: 12, corporate: 12, editorial: 8 },
};

const GOAL_WEIGHTS: Record<PrimaryGoal, Weights> = {
  whatsapp: { corporate: 12, energetic: 10, minimal: 8 },
  booking: { corporate: 14, luxury: 10, editorial: 6 },
  sell: { energetic: 14, creator: 10, corporate: 8 },
  leads: { corporate: 16, minimal: 8, editorial: 6 },
  portfolio: { editorial: 16, minimal: 10, creator: 10 },
  social: { creator: 20, energetic: 12 },
};

const ENERGY: Record<VisualPersonality, number> = {
  elegant: 30,
  minimal: 15,
  modern: 55,
  professional: 35,
  energetic: 85,
  premium: 45,
};

const CATEGORY_MEDIA: Record<BusinessCategory, number> = {
  beauty: 75,
  professional: 30,
  creator: 85,
  food: 80,
  fitness: 60,
  local: 45,
  freelancer: 55,
  other: 40,
};

const GOAL_PRESSURE: Record<PrimaryGoal, number> = {
  whatsapp: 80,
  booking: 85,
  sell: 90,
  leads: 75,
  portfolio: 45,
  social: 55,
};

const CATEGORY_TRUST: Record<BusinessCategory, number> = {
  beauty: 45,
  professional: 90,
  creator: 30,
  food: 45,
  fitness: 60,
  local: 65,
  freelancer: 60,
  other: 50,
};

export function buildDesignProfile(
  intent: NormalizedIntent,
  variant = 0,
  forcedFamily: FamilyId | null = null,
): DesignProfile {
  const scores = Object.fromEntries(FAMILY_IDS.map((f) => [f, 0])) as Record<FamilyId, number>;

  const apply = (weights: Weights) => {
    for (const [family, value] of Object.entries(weights)) {
      scores[family as FamilyId] += value ?? 0;
    }
  };

  apply(PERSONALITY_WEIGHTS[intent.visual_personality]);
  apply(CATEGORY_WEIGHTS[intent.business_category]);
  apply(GOAL_WEIGHTS[intent.primary_goal]);

  const family =
    forcedFamily ??
    (variant === 0
      ? selectFamily(scores)
      : selectFamilyVariant(scores, variant, intent));

  return {
    family,
    family_scores: scores,
    visual_energy: clamp(
      Math.round(ENERGY[intent.visual_personality] * 0.7 + GOAL_PRESSURE[intent.primary_goal] * 0.3),
      0,
      100,
    ),
    trust_weight: clamp(
      Math.round(
        CATEGORY_TRUST[intent.business_category] * 0.7 +
          (intent.visual_personality === "professional" ? 30 : 10),
      ),
      0,
      100,
    ),
    media_weight: clamp(
      Math.round(
        CATEGORY_MEDIA[intent.business_category] * 0.7 +
          (intent.primary_goal === "portfolio" ? 30 : intent.primary_goal === "social" ? 20 : 5),
      ),
      0,
      100,
    ),
    cta_pressure: GOAL_PRESSURE[intent.primary_goal],
  };
}

/**
 * Deterministic alternate family for variant != 0: chosen only among the
 * three highest-scoring (i.e. still strategically compatible) families.
 */
export function selectFamilyVariant(
  scores: Record<FamilyId, number>,
  variant: number,
  intent: NormalizedIntent,
): FamilyId {
  const ranked = [...FAMILY_PRIORITY].sort((a, b) => scores[b] - scores[a]);
  const top = ranked.slice(0, 3);
  const seed = stableHash(
    ["family", String(variant), intent.business_category, intent.primary_goal, intent.visual_personality].join("|"),
  );
  return top[seed % top.length] as FamilyId;
}

/** Highest score wins; ties resolved by the fixed FAMILY_PRIORITY order. */
export function selectFamily(scores: Record<FamilyId, number>): FamilyId {
  let best: FamilyId = FAMILY_PRIORITY[0]!;
  let bestScore = -Infinity;
  for (const family of FAMILY_PRIORITY) {
    const score = scores[family];
    if (score > bestScore) {
      best = family;
      bestScore = score;
    }
  }
  return best;
}
