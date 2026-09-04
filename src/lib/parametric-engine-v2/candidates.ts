/**
 * V1.5 — deterministic candidate generation, scoring and ranking.
 *
 * Generates N valid recipes for the SAME intent, scores them with the
 * heuristic quality model, removes duplicates and enforces structural
 * diversity. No AI, no randomness: same inputs => same ordered output.
 */

import { resolveCapabilities } from "./capabilities";
import { selectCompositionPattern, type CompositionPattern } from "./composition-patterns";
import { resolveEngineContext, type EngineContextV1 } from "./context";
import { allowedAxisValues, type DesignAxis } from "./design-axes";
import {
  selectDistinctCandidates,
  structuralSignature,
  type RecipeStructuralSignatureV1,
} from "./diversity";
import { generateWithTrace } from "./engine";
import { fingerprintRecipe } from "./fingerprint";
import { normalizeIntent, validateIntent } from "./normalize";
import { paletteBankFor } from "./palettes-extended";
import { DESIGN_PRESETS_IDS, getPreset, mergePresetOverrides, type DesignPresetId } from "./presets";
import { isAcceptableQuality, scoreRecipe, type RecipeQualityScoreV1 } from "./quality-score";
import {
  assertValidEngineContext,
  clampInt,
  throwIfInvalid,
  validateDesignOverrides,
  validatePresetIds,
  validateRendererCapabilities,
} from "./runtime-validation";
import { buildDesignProfile } from "./strategy";
import { EngineError } from "./types";
import type {
  AdvancedSelectionV1,
  DesignOverridesV1,
  EngineOptions,
  FamilyId,
  OnboardingIntentV1,
  PageRecipeV1,
} from "./types";


export interface RecipeCandidateV1 {
  id: string;
  recipe: PageRecipeV1;
  score: RecipeQualityScoreV1;
  signature: RecipeStructuralSignatureV1;
  fingerprint: string;
  variant: number;
  preset: DesignPresetId | null;
  pattern: CompositionPattern | "unknown";
}

export interface CandidateOptions extends Omit<EngineOptions, "variant"> {
  /** How many candidates to return. Default 3. Bounded 1..10. */
  count?: number;
  /** How many variants to explore per preset. Default 3. Bounded 1..8. */
  variantsPerPreset?: number;
  /** Presets to explore. Defaults to all. Bounded to 50 known ids. */
  presets?: DesignPresetId[];
  /** Minimum structural distance between returned candidates. Default 2. */
  minimumDistance?: number;
  /** How many axis plans to explore per preset+variant. Default 2, max 4. */
  axisPlansPerVariant?: number;
}

export interface CandidateSetV1 {
  candidates: RecipeCandidateV1[];
  /** Everything generated and scored, before diversity selection. */
  evaluated: RecipeCandidateV1[];
  rejected: { id: string; reason: string }[];
}

/** V1.5.1 — hard bounds. Advanced generation can never become unbounded. */
export const CANDIDATE_BOUNDS = {
  count: { min: 1, max: 10 },
  variantsPerPreset: { min: 1, max: 8 },
  presets: { max: 50 },
  axisPlansPerVariant: { min: 1, max: 4 },
  pool: 200,
} as const;

/**
 * Deterministic family-safe axis plan. Index 0 always reproduces the first
 * allowed option of every axis, so plan 0 stays closest to the baseline.
 */
function axisPlan(family: FamilyId, seed: number): NonNullable<AdvancedSelectionV1["axes"]> {
  // Distinct co-prime strides per axis so short (2-value) axes really alternate
  // instead of cancelling out. Fully deterministic: seed => exact same plan.
  const STRIDE: Record<string, number> = {
    radius: 1,
    border_style: 3,
    background_type: 5,
    avatar_shape: 7,
    avatar_ring: 9,
    button_style: 11,
    button_icon_position: 13,
    card_style: 15,
    card_action_style: 17,
    heading_scale: 19,
    body_scale: 21,
    spacing_rhythm: 23,
  };
  const pick = <K extends DesignAxis>(axis: K) => {
    const values = allowedAxisValues(family, axis) as readonly string[];
    if (values.length === 0) return undefined;
    const stride = STRIDE[axis as string] ?? 1;
    return values[(seed * stride + values.length) % values.length];
  };
  return {
    radius: pick("radius") as never,
    border_style: pick("border_style") as never,
    background_type: pick("background_type") as never,
    avatar_shape: pick("avatar_shape") as never,
    avatar_ring: pick("avatar_ring") as never,
    button_style: pick("button_style") as never,
    button_icon_position: pick("button_icon_position") as never,
    card_style: pick("card_style") as never,
    card_action_style: pick("card_action_style") as never,
    heading_scale: pick("heading_scale") as never,
    body_scale: pick("body_scale") as never,
    spacing_rhythm: pick("spacing_rhythm") as never,
  };
}

export function generateCandidateSet(
  intent: OnboardingIntentV1,
  options: CandidateOptions = {},
): CandidateSetV1 {
  const safeOptions: CandidateOptions =
    options && typeof options === "object" && !Array.isArray(options) ? options : {};
  throwIfInvalid("INVALID_OPTIONS", [
    ...validateDesignOverrides(safeOptions.overrides),
    ...validateRendererCapabilities(safeOptions.capabilities),
    ...validatePresetIds(safeOptions.presets),
  ]);
  assertValidEngineContext(safeOptions.context);

  const count = clampInt(safeOptions.count, { ...CANDIDATE_BOUNDS.count, fallback: 3 });
  const variants = clampInt(safeOptions.variantsPerPreset, {
    ...CANDIDATE_BOUNDS.variantsPerPreset,
    fallback: 3,
  });
  const axisPlans = clampInt(safeOptions.axisPlansPerVariant, {
    ...CANDIDATE_BOUNDS.axisPlansPerVariant,
    fallback: 2,
  });
  const presets = (safeOptions.presets ?? [...DESIGN_PRESETS_IDS]).slice(
    0,
    CANDIDATE_BOUNDS.presets.max,
  );
  const minimumDistance = clampInt(safeOptions.minimumDistance, { min: 0, max: 8, fallback: 2 });
  const capabilities = resolveCapabilities(safeOptions.capabilities);
  const context: EngineContextV1 = safeOptions.context ?? {};

  // V1.5.1 — malformed intents are rejected BEFORE normalization.
  const intentIssues = validateIntent(intent);
  if (intentIssues.length > 0) {
    throw new EngineError("INVALID_INTENT", "OnboardingIntentV1 is invalid.", intentIssues);
  }

  const normalized = normalizeIntent(intent);
  const resolved = resolveEngineContext(normalized, context);

  const evaluated: RecipeCandidateV1[] = [];
  const rejected: { id: string; reason: string }[] = [];
  const seen = new Set<string>();
  let generated = 0;

  const attempts: { preset: DesignPresetId | null; overrides: DesignOverridesV1 | undefined }[] = [
    { preset: null, overrides: safeOptions.overrides },
    ...presets.map((id) => ({
      preset: id,
      // Presets are soft: explicit user overrides and locks always win.
      overrides: mergePresetOverrides(getPreset(id), safeOptions.overrides),
    })),
  ];

  outer: for (const attempt of attempts) {
    for (let variant = 0; variant < variants; variant++) {
      for (let plan = 0; plan < axisPlans; plan++) {
        if (generated >= CANDIDATE_BOUNDS.pool) break outer;
        generated++;
        const id = `${attempt.preset ?? "engine"}#${variant}.${plan}`;
        const attemptOptions: EngineOptions = { ...safeOptions, context, variant };
        if (attempt.overrides) attemptOptions.overrides = attempt.overrides;
        // Plan 0 of the baseline attempt stays axis-free = baseline design.
        const family = attempt.overrides?.visual_family ?? null;
        if (plan > 0 || attempt.preset !== null) {
          const resolvedFamily: FamilyId =
            family ?? (buildDesignProfile(normalized, variant, null).family as FamilyId);
          const bank = paletteBankFor(resolvedFamily);
          const advanced: AdvancedSelectionV1 = {
            axes: axisPlan(resolvedFamily, variant * axisPlans + plan),
          };
          // Presets contribute their preferred composition SOFTLY.
          if (attempt.preset) advanced.pattern_hint = getPreset(attempt.preset).preferred_pattern;
          const palette = bank[(variant + plan) % Math.max(1, bank.length)];
          if (palette) advanced.palette = palette;
          attemptOptions.advanced = advanced;
        }
        const result = generateWithTrace(intent, attemptOptions);
        if (!result.ok) {
          rejected.push({ id, reason: result.error.code });
          continue;
        }
        const recipe = result.value.recipe;
        const fingerprint = fingerprintRecipe(recipe);
        if (seen.has(fingerprint)) {
          rejected.push({ id, reason: "duplicate" });
          continue;
        }
        const pattern =
          result.value.trace.pattern ??
          selectCompositionPattern({
            intent: normalized,
            signals: resolved.signals,
            strategy: resolved.strategy,
            content: resolved.content,
            variant,
          });
        const score = scoreRecipe(recipe, {
          intent: normalized,
          signals: resolved.signals,
          strategy: resolved.strategy,
          content: resolved.content,
          pattern,
          capabilities,
        });
        if (!isAcceptableQuality(score)) {
          rejected.push({ id, reason: "below_quality_floor" });
          continue;
        }
        seen.add(fingerprint);
        evaluated.push({
          id,
          recipe,
          score,
          signature: structuralSignature(recipe, pattern),
          fingerprint,
          variant,
          preset: attempt.preset,
          pattern,
        });
      }
    }
  }

  // Deterministic ranking: score desc, then stable id order.
  evaluated.sort((a, b) => (b.score.total - a.score.total) || a.id.localeCompare(b.id));

  const candidates = selectDistinctCandidates(evaluated, count, minimumDistance);
  return { candidates, evaluated, rejected };
}


/** Convenience: the single best-scoring candidate recipe. */
export function generateBestRecipe(
  intent: OnboardingIntentV1,
  options: CandidateOptions = {},
): PageRecipeV1 | null {
  const set = generateCandidateSet(intent, { ...options, count: 1 });
  return set.candidates[0]?.recipe ?? null;
}
