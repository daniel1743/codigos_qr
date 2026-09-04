/**
 * CRIPQER PARAMETRIC DESIGN ENGINE — public API.
 *
 * V1 surface is unchanged. V1.5 additions are optional and additive:
 * generatePageRecipe(intent) with no options behaves exactly like V1.
 */

/* --------------------------------------------------------------- V1 core */
export {
  ENGINE_VERSION,
  generatePageRecipe,
  generateWithTrace,
  tryGeneratePageRecipe,
  type GenerationTrace,
} from "./engine";
export {
  normalizeIntent,
  validateIntent,
  normalizeBusinessCategory,
  isSafeAssetRef,
  isIsoTimestamp,
  MAX_NAME,
  MAX_PROFESSION,
  MAX_BIO_INPUT,
  MAX_BIO_OUTPUT,
} from "./normalize";
export { validatePageRecipe } from "./validator";
export { DEFAULT_CAPABILITIES, resolveCapabilities } from "./capabilities";
export { FAMILIES, FAMILY_PRIORITY, type FamilyDefinition } from "./families";
export { buildDesignProfile, selectFamily, selectFamilyVariant } from "./strategy";
export { applyOverrides, reapplyLockedOverrides, isLocked } from "./overrides";
export {
  isValidDestination,
  isValidEmail,
  isValidHttpUrl,
  isValidInstagram,
  isValidWhatsApp,
  extractInstagramHandle,
} from "./destinations";
export { contrastRatio } from "./utils";
export { runEngineSelfCheck, type SelfCheckResult } from "./fixtures/self-check";

/* ------------------------------------------------------ V1.5 — context */
export {
  resolveEngineContext,
  type EngineContextV1,
  type ResolvedContext,
} from "./context";
export {
  BUSINESS_ARCHETYPES,
  CONVERSION_MODES,
  DELIVERY_MODES,
  GENERIC_SIGNALS,
  inferArchetype,
  normalizeGoalStack,
  resolveBusinessSignals,
  ARCHETYPE_SIGNAL_DEFAULTS,
  type BusinessArchetype,
  type BusinessSignalsV1,
  type ConversionMode,
  type DeliveryMode,
  type GoalStackV1,
  type Locality,
  type PriceModel,
  type ProofPriority,
} from "./business-signals";
export {
  ARCHETYPE_STRATEGIES,
  getArchetypeStrategy,
  type ArchetypeStrategy,
} from "./archetypes";
export {
  EMPTY_CONTENT_INVENTORY,
  hasContent,
  resolveContentInventory,
  type ContentInventoryV1,
  type ContentKey,
  type ContentSlot,
} from "./content-inventory";

/* -------------------------------------------- V1.5 — composition grammar */
export {
  COMPOSITION_PATTERNS,
  PATTERNS,
  patternRoleRank,
  selectCompositionPattern,
  type CompositionPattern,
  type PatternDefinition,
} from "./composition-patterns";
export {
  DESIGN_AXES,
  FAMILY_AXES,
  allowedAxisValues,
  isAllowedAxisValue,
  type DesignAxis,
  type FamilyAxisOptions,
} from "./design-axes";
export {
  ADVANCED_PALETTES,
  isPaletteAccessible,
  paletteBankFor,
  validateAdvancedPalettes,
  type AdvancedPalette,
  type PaletteDirection,
} from "./palettes-extended";

/* -------------------------------- V1.5 — presets, candidates, refinement */
export {
  DESIGN_PRESETS,
  DESIGN_PRESETS_IDS,
  getPreset,
  listPresets,
  mergePresetOverrides,
  type DesignPresetId,
  type DesignPresetV1,
} from "./presets";
export {
  generateBestRecipe,
  generateCandidateSet,
  type CandidateOptions,
  type CandidateSetV1,
  type RecipeCandidateV1,
} from "./candidates";
export {
  MIN_ACCEPTABLE_TOTAL,
  isAcceptableQuality,
  scoreRecipe,
  type RecipeQualityScoreV1,
  type ScoreContext,
} from "./quality-score";
export {
  paletteMood,
  selectDistinctCandidates,
  signatureDistance,
  structuralSignature,
  type PaletteMood,
  type RecipeStructuralSignatureV1,
} from "./diversity";
export {
  REFINEMENT_COMMANDS,
  listPresetIds,
  listRefinementCommands,
  refineOptions,
  refineWithPreset,
  type RefinementCommand,
  type RefinementResultV1,
} from "./refinements";

/* ------------------------------------------- V1.5 — dormant future layer */
export {
  DEFAULT_FUTURE_CAPABILITIES,
  FUTURE_CAPABILITY_KEYS,
  resolveFutureCapabilities,
  supportsAll,
  type FutureCapabilityKey,
  type FutureRendererCapabilitiesV1,
} from "./future-capabilities";
export {
  FUTURE_BLOCKS,
  FUTURE_BLOCK_TYPES,
  contentSatisfied,
  signalsFavor,
  type FutureBlockStrategy,
  type FutureBlockType,
} from "./future-blocks";
export {
  buildFutureCompositionPlan,
  buildFutureCompositionPlanFromNormalized,
  type FutureBlockPlanEntry,
  type FutureCompositionPlanV1,
  type FuturePlanOptions,
} from "./future-plan";
export {
  CONVERSION_PATTERNS,
  CONVERSION_PATTERN_STRATEGIES,
  selectConversionPattern,
  type ConversionPattern,
  type ConversionPatternStrategy,
} from "./conversion-patterns";
export {
  DEFAULT_RESPONSIVE_STRATEGY,
  buildResponsiveStrategy,
  type ContentWidth,
  type DesktopLayout,
  type MobileLayout,
  type ResponsiveStrategyV1,
} from "./responsive";
export {
  MOTION_LEVELS,
  NO_MOTION,
  buildMotionStrategy,
  type EntranceToken,
  type HoverToken,
  type MotionLevel,
  type MotionStrategyV1,
} from "./motion";

/* ------------------------------------- V1.5 — editor metadata + versioning */
export {
  ENGINE_CONTROL_CATALOG,
  getAvailableControls,
  getEngineControlCatalog,
  type ControlType,
  type EngineControlDescriptorV1,
} from "./control-catalog";
export {
  canonicalRecipeJson,
  checkRecipeRendererCompatibility,
  assertRecipeShape,
  fingerprintRecipe,
  type RecipeCompatibilityReport,
} from "./fingerprint";
export {
  diffRecipes,
  type RecipeDiffEntry,
  type RecipeDiffV1,
} from "./recipe-diff";
export {
  runEngineSelfCheckV15,
  type SelfCheckV15Result,
} from "./fixtures/self-check-v15";
export {
  INDUSTRY_FIXTURES,
  INDUSTRY_FIXTURE_BY_ID,
  type IndustryFixture,
} from "./fixtures/industry-intents";
export {
  INDUSTRY_CLASSIFICATION_CASES,
  type IndustryClassificationCase,
} from "./fixtures/industry-matrix-20";

/* ------------------------------------- V1.5.1 — runtime safety + wiring */
export {
  BUSINESS_SIGNAL_ENUMS,
  assertValidEngineContext,
  clampInt,
  isKnownPreset,
  validateBusinessSignalsPatch,
  validateContentInventoryPatch,
  validateDesignOverrides,
  validateEngineContext,
  validateFutureCapabilities,
  validateGoalStack,
  validatePresetIds,
  validateRendererCapabilities,
} from "./runtime-validation";
export { applyAdvancedSelection } from "./axis-apply";
export {
  FUTURE_BLOCK_CONSTRAINTS,
  FUTURE_BLOCK_EXCLUSIONS,
  evaluateBlockConstraints,
  resolveExclusion,
  type ConstraintCheck,
  type ConstraintPredicate,
  type ExclusionRule,
} from "./future-constraints";
export { CANDIDATE_BOUNDS } from "./candidates";
export { structuralDistance } from "./diversity";
export { MAX_CONTENT_COUNT, CONTENT_KEYS, contentCount } from "./content-inventory";
export { isPersistableAssetRef } from "./normalize";
export {
  runEngineHardeningCheck,
  type HardeningCheckResult,
} from "./fixtures/self-check-v151";

export * from "./types";
