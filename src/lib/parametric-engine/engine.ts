/**
 * Stage 8 — public engine entry points.
 *
 * generatePageRecipe() runs the full deterministic pipeline:
 * normalize -> strategy -> family -> parameters -> composition ->
 * compatibility -> validation -> immutable output.
 *
 * V1.5: an OPTIONAL EngineContextV1 may influence composition. With no
 * context supplied the pipeline is byte-identical to V1 (except the
 * timestamp), which is asserted by the fixtures self-check.
 */

import { applyAdvancedSelection } from "./axis-apply";
import { resolveCapabilities } from "./capabilities";
import { applyCompatibility } from "./compatibility";
import {
  PATTERNS,
  selectCompositionPattern,
  COMPOSITION_PATTERNS,
  patternRoleRank,
  type CompositionPattern,
} from "./composition-patterns";
import { resolveEngineContext, type EngineContextV1, type ResolvedContext } from "./context";
import { normalizeIntent, validateIntent } from "./normalize";
import {
  assertValidEngineContext,
  clampInt,
  throwIfInvalid,
  validateDesignOverrides,
  validateRendererCapabilities,
} from "./runtime-validation";
import { applyOverrides, reapplyLockedOverrides } from "./overrides";
import { composeBlocks, composeConversion, composeStructure, resolveDesign } from "./rules";
import { buildDesignProfile } from "./strategy";
import type {
  DesignOverridesV1,
  DesignProfile,
  EngineOptions,
  EngineResult,
  NormalizedIntent,
  OnboardingIntentV1,
  PageRecipeV1,
  RecipeBlock,
} from "./types";
import { EngineError } from "./types";
import { deepFreeze } from "./utils";
import { validatePageRecipe } from "./validator";

export const ENGINE_VERSION = "1" as const;

export interface GenerationTrace {
  normalized: NormalizedIntent;
  profile: DesignProfile;
  downgrades: string[];
  /** V1.5 — present only when a context was supplied. */
  context?: ResolvedContext;
  pattern?: CompositionPattern;
}

interface InternalResult {
  recipe: PageRecipeV1;
  trace: GenerationTrace;
}

/** Later sources win, but `undefined` never overwrites a defined value. */
function mergeOverrides(
  base: DesignOverridesV1 | undefined,
  priority: DesignOverridesV1 | undefined,
): DesignOverridesV1 | undefined {
  if (!base) return priority;
  if (!priority) return base;
  const merged: DesignOverridesV1 = { ...base };
  for (const [key, value] of Object.entries(priority)) {
    if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

function patternOverrides(
  pattern: CompositionPattern,
  intent: NormalizedIntent,
): DesignOverridesV1 {
  const influence = PATTERNS[pattern].influence;
  const soft: DesignOverridesV1 = {};
  // Composition never invents assets: banner-led heroes need a banner.
  if (influence.hero_mode && intent.assets.has_banner) soft.hero_mode = influence.hero_mode;
  if (influence.identity_alignment) soft.identity_alignment = influence.identity_alignment;
  if (influence.links_presentation) soft.links_presentation = influence.links_presentation;
  if (influence.density) soft.density = influence.density;
  return soft;
}

function reorderByPattern(blocks: RecipeBlock[], pattern: CompositionPattern): RecipeBlock[] {
  const rank = patternRoleRank(pattern);
  return blocks
    .map((block, index) => ({ block, index }))
    .sort((a, b) => {
      const ra = rank[a.block.role];
      const rb = rank[b.block.role];
      if (ra !== rb) return ra - rb;
      return a.index - b.index;
    })
    .map(({ block }, index) => ({ ...block, order: index }));
}

function run(intent: OnboardingIntentV1, rawOptions: EngineOptions = {}): InternalResult {
  // Hostile callers may pass null / arrays / primitives despite the type.
  const options: EngineOptions =
    rawOptions && typeof rawOptions === "object" && !Array.isArray(rawOptions) ? rawOptions : {};
  throwIfInvalid("INVALID_OPTIONS", [
    ...validateDesignOverrides(options.overrides),
    ...validateRendererCapabilities(options.capabilities),
  ]);
  assertValidEngineContext(options.context);
  const intentIssues = validateIntent(intent);
  if (intentIssues.length > 0) {
    throw new EngineError("INVALID_INTENT", "OnboardingIntentV1 is invalid.", intentIssues);
  }

  const normalized = normalizeIntent(intent);
  const capabilities = resolveCapabilities(options.capabilities);
  const variant = clampInt(options.variant, { min: 0, max: 999, fallback: 0 });

  /* ------------------------------------------------ optional V1.5 context */
  const context: EngineContextV1 | undefined = options.context;
  const resolvedContext = context ? resolveEngineContext(normalized, context) : null;
  const hint = options.advanced?.pattern_hint;
  const patternHint: CompositionPattern | null =
    typeof hint === "string" && (COMPOSITION_PATTERNS as readonly string[]).includes(hint)
      ? (hint as CompositionPattern)
      : null;
  // V1.5.1 freeze fix — a valid, CONTENT-COMPATIBLE advanced hint wins over
  // business strategy (soft preference), otherwise strategy decides.
  const hintHasMedia =
    normalized.assets.has_banner ||
    normalized.assets.has_card_media ||
    (resolvedContext
      ? resolvedContext.content.gallery.available || resolvedContext.content.portfolio.available
      : false);
  const hintUsable =
    patternHint !== null && (!PATTERNS[patternHint].requires_media || hintHasMedia);
  const pattern = hintUsable
    ? patternHint
    : resolvedContext
      ? selectCompositionPattern({
          intent: normalized,
          signals: resolvedContext.signals,
          strategy: resolvedContext.strategy,
          content: resolvedContext.content,
          variant,
        })
      : // Baseline stays pattern-free when no context and no usable hint.
        null;


  const overrides = pattern
    ? mergeOverrides(patternOverrides(pattern, normalized), options.overrides)
    : options.overrides;

  const forcedFamily = overrides?.visual_family ?? null;
  const profile = buildDesignProfile(normalized, variant, forcedFamily);

  const baseDesign = resolveDesign(normalized, profile, variant);
  const baseStructure = composeStructure(normalized, profile, baseDesign, variant);
  // V1.5.1 — advanced axis/palette selection (advanced paths only).
  const axisApplied = applyAdvancedSelection(baseDesign, profile.family, options.advanced);
  const overridden = applyOverrides(baseDesign, baseStructure, overrides, normalized);
  const baseBlocks = composeBlocks(overridden.structure, overridden.design);

  const compat = applyCompatibility(
    normalized,
    { design: overridden.design, structure: overridden.structure, blocks: baseBlocks },
    capabilities,
  );

  const locked = reapplyLockedOverrides(
    compat.design,
    compat.structure,
    overrides,
    normalized,
    capabilities,
  );

  const blocks = pattern ? reorderByPattern(compat.blocks, pattern) : compat.blocks;

  const recipe: PageRecipeV1 = {
    meta: {
      recipe_version: "1",
      engine_version: ENGINE_VERSION,
      source_intent_version: "1",
      // Timestamp only — it never influences any visual parameter.
      generated_at: options.now ?? new Date().toISOString(),
      family: profile.family,
      personality: normalized.visual_personality,
      primary_goal: normalized.primary_goal,
    },
    identity: { ...normalized.identity },
    design: compat.design,
    structure: compat.structure,
    blocks,
    conversion: composeConversion(normalized, compat.structure),
  };

  const validation = validatePageRecipe(recipe);
  if (!validation.valid) {
    throw new EngineError("INVALID_RECIPE", "Generated recipe failed validation.", validation.issues);
  }

  const trace: GenerationTrace = {
    normalized,
    profile,
    downgrades: [...axisApplied, ...compat.downgrades, ...overridden.applied, ...locked],
  };
  if (resolvedContext) trace.context = resolvedContext;
  if (pattern) trace.pattern = pattern;

  return { recipe: deepFreeze(recipe), trace };
}

/** Throws EngineError on invalid intent or invalid generated recipe. */
export function generatePageRecipe(
  intent: OnboardingIntentV1,
  options?: EngineOptions,
): PageRecipeV1 {
  return run(intent, options).recipe;
}

/** Non-throwing variant for UI/QA surfaces. */
export function tryGeneratePageRecipe(
  intent: OnboardingIntentV1,
  options?: EngineOptions,
): EngineResult<PageRecipeV1> {
  try {
    return { ok: true, value: run(intent, options).recipe };
  } catch (error) {
    if (error instanceof EngineError) {
      return { ok: false, error: { code: error.code, message: error.message, issues: error.issues } };
    }
    return {
      ok: false,
      error: {
        code: "UNEXPECTED",
        message: error instanceof Error ? error.message : "Unknown engine error.",
        issues: [],
      },
    };
  }
}

/** Same pipeline, plus the resolved parameters — for QA/debug surfaces only. */
export function generateWithTrace(
  intent: OnboardingIntentV1,
  options?: EngineOptions,
): EngineResult<InternalResult> {
  try {
    return { ok: true, value: run(intent, options) };
  } catch (error) {
    if (error instanceof EngineError) {
      return { ok: false, error: { code: error.code, message: error.message, issues: error.issues } };
    }
    throw error;
  }
}

export type { InternalResult as EngineRunResult };
