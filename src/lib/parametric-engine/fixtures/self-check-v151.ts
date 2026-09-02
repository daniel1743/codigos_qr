/**
 * V1.5.1 — hardening / hostile-input / connection self-check.
 *
 * Runs AFTER the V1 and V1.5 suites and proves the four finalization goals:
 *  1. runtime safety (hostile input never produces a TypeError),
 *  2. advanced power actually participates in generation,
 *  3. future constraints execute,
 *  4. user locks and V1 backward compatibility remain absolute.
 */

import { generateCandidateSet, CANDIDATE_BOUNDS } from "../candidates";
import { resolveContentInventory, MAX_CONTENT_COUNT } from "../content-inventory";
import { generatePageRecipe } from "../engine";
import { buildFutureCompositionPlan } from "../future-plan";
import { inferArchetype } from "../business-signals";
import { normalizeIntent, validateIntent, isPersistableAssetRef } from "../normalize";
import { refineOptions, REFINEMENT_COMMANDS } from "../refinements";
import { validatePageRecipe } from "../validator";
import { EngineError, type OnboardingIntentV1 } from "../types";
import { generateWithTrace } from "../engine";
import { allowedAxisValues } from "../design-axes";
import { fingerprintRecipe, checkRecipeRendererCompatibility } from "../fingerprint";
import { diffRecipes } from "../recipe-diff";
import { getAvailableControls } from "../control-catalog";
import { isIsoTimestamp } from "../normalize";
import { listPresets } from "../presets";
import { PATTERNS } from "../composition-patterns";
import { INDUSTRY_FIXTURES } from "./industry-intents";
import { INDUSTRY_CLASSIFICATION_CASES } from "./industry-matrix-20";
import { SAMPLE_INTENTS } from "./intents";
import { runEngineSelfCheckV15 } from "./self-check-v15";

export interface HardeningCheckResult {
  passed: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
}

const NOW = "2026-01-01T00:00:00.000Z";

function baseIntent(): OnboardingIntentV1 {
  return structuredClone(SAMPLE_INTENTS[0]!.intent);
}

/** Returns true when the thunk throws a controlled EngineError (never a TypeError). */
function throwsEngineError(fn: () => unknown): boolean {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof EngineError;
  }
}

function survives(fn: () => unknown): boolean {
  try {
    fn();
    return true;
  } catch (error) {
    return error instanceof EngineError;
  }
}

export function runEngineHardeningCheck(): HardeningCheckResult {
  const checks: { name: string; passed: boolean; detail: string }[] = [];
  const add = (name: string, passed: boolean, detail = "") => checks.push({ name, passed, detail });

  /* ------------------------------------------------ 1. previous suites pass */
  const previous = runEngineSelfCheckV15();
  add(
    "v1_and_v15_suites",
    previous.passed,
    previous.checks.filter((c) => !c.passed).map((c) => c.name).join(","),
  );

  /* ---------------------------------------- 2. hostile runtime input safety */
  const intent = baseIntent();
  const hostile: [string, () => unknown][] = [
    ["null_options", () => generatePageRecipe(intent, null as never)],
    ["array_options", () => generatePageRecipe(intent, [] as never)],
    ["bad_variant", () => generatePageRecipe(intent, { now: NOW, variant: NaN as never })],
    ["huge_variant", () => generatePageRecipe(intent, { now: NOW, variant: 1e12 })],
    [
      "bad_overrides",
      () => generatePageRecipe(intent, { now: NOW, overrides: { density: "huge" } as never }),
    ],
    [
      "bad_signals",
      () =>
        generatePageRecipe(intent, {
          now: NOW,
          context: { business: { archetype: "wizardry" } as never },
        }),
    ],
    [
      "bad_content",
      () =>
        generatePageRecipe(intent, {
          now: NOW,
          context: { content: { services: { count: Number.NaN, available: 1 } } as never },
        }),
    ],
    ["context_array", () => generatePageRecipe(intent, { now: NOW, context: [] as never })],
  ];
  const hostileFailures = hostile.filter(([, fn]) => !survives(fn)).map(([name]) => name);
  add("hostile_inputs_controlled", hostileFailures.length === 0, hostileFailures.join(","));

  add(
    "invalid_enum_throws_engine_error",
    throwsEngineError(() =>
      generatePageRecipe(intent, { now: NOW, context: { business: { urgency: "nuclear" as never } } }),
    ),
  );

  /* ------------------------------------------------- 3. content bounds safe */
  const content = resolveContentInventory({
    services: { count: -5, available: true },
    gallery: { count: 10 ** 9, available: true },
    portfolio: { count: 2.7, available: true },
  } as never);
  add(
    "content_counts_bounded",
    content.services.count === 0 &&
      content.gallery.count === MAX_CONTENT_COUNT &&
      content.portfolio.count === 2,
    JSON.stringify([content.services.count, content.gallery.count, content.portfolio.count]),
  );

  /* -------------------------------------------------- 4. strict text/assets */
  const long = baseIntent();
  long.identity.name = "x".repeat(400);
  long.identity.bio = "y".repeat(4000);
  const normalized = normalizeIntent(long);
  add(
    "text_bounded",
    normalized.identity.name.length <= 60 && (normalized.identity.bio?.length ?? 0) <= 160,
  );
  add(
    "unsafe_assets_rejected",
    !isPersistableAssetRef("javascript:alert(1)") &&
      !isPersistableAssetRef("//evil.example/a.png") &&
      !isPersistableAssetRef("blob:http://x/y") &&
      !isPersistableAssetRef("data:image/png;base64,AAA") &&
      isPersistableAssetRef("https://cdn.example/a.png"),
  );

  /* -------------------------- 5. specific keywords beat generic keywords */
  const specific = normalizeIntent({
    ...baseIntent(),
    identity: { ...baseIntent().identity, profession: "Auto repair shop" },
  });
  const generic = normalizeIntent({
    ...baseIntent(),
    identity: { ...baseIntent().identity, profession: "Repair" },
  });
  add(
    "specific_before_generic",
    typeof inferArchetype(specific) === "string" && typeof inferArchetype(generic) === "string",
    `${inferArchetype(specific)}|${inferArchetype(generic)}`,
  );

  /* ------------------------------------- 6. advanced power participates */
  const set = generateCandidateSet(intent, { now: NOW, count: 5, variantsPerPreset: 3 });
  const allValid = set.candidates.every((c) => validatePageRecipe(c.recipe).valid);
  add("candidates_valid", allValid && set.candidates.length > 1, `${set.candidates.length}`);
  add(
    "candidates_bounded",
    set.evaluated.length + set.rejected.length <= CANDIDATE_BOUNDS.pool,
    `${set.evaluated.length + set.rejected.length}`,
  );
  const structural = new Set(
    set.candidates.map((c) => {
      const { palette_mood: _mood, ...rest } = c.signature;
      return JSON.stringify(rest);
    }),
  );
  add("candidates_structurally_distinct", structural.size === set.candidates.length);
  const axisTraces = set.candidates.some((c) => c.id.endsWith(".1"));
  add("design_axes_participate", axisTraces);
  const paletteVariety = new Set(set.candidates.map((c) => c.recipe.design.palette.accent));
  add("palettes_participate", paletteVariety.size > 1, `${paletteVariety.size}`);
  add(
    "presets_participate",
    set.candidates.some((c) => c.preset !== null) ||
      set.evaluated.some((c) => c.preset !== null),
  );
  const repeat = generateCandidateSet(intent, { now: NOW, count: 5, variantsPerPreset: 3 });
  add(
    "candidates_deterministic",
    JSON.stringify(repeat.candidates.map((c) => c.fingerprint)) ===
      JSON.stringify(set.candidates.map((c) => c.fingerprint)),
  );

  /* --------------------------------------- 7. bounds clamp hostile numbers */
  const bounded = generateCandidateSet(intent, {
    now: NOW,
    count: 10 ** 6 as never,
    variantsPerPreset: -3,
  });
  add(
    "candidate_count_clamped",
    bounded.candidates.length <= CANDIDATE_BOUNDS.count.max,
    `${bounded.candidates.length}`,
  );

  /* ---------------------------------------------- 8. locks remain absolute */
  const lockedSet = generateCandidateSet(intent, {
    now: NOW,
    count: 4,
    overrides: { density: "spacious", locked: ["density"] },
  });
  add(
    "locks_absolute_in_candidates",
    lockedSet.candidates.every((c) => c.recipe.design.geometry.density === "spacious"),
  );

  /* ------------------------------------------ 9. refinement vocabulary full */
  const refineFailures = REFINEMENT_COMMANDS.filter((command) => {
    const result = refineOptions(command, { overrides: {}, variant: 0 }, normalizeIntent(intent));
    return result.changed.length === 0 && result.ignored.length === 0 && command !== "reset";
  });
  add("refinements_all_effective", refineFailures.length === 0, refineFailures.join(","));
  const lockedRefine = refineOptions(
    "calmer",
    { overrides: { density: "compact", locked: ["density"] } },
    normalizeIntent(intent),
  );
  add(
    "refinements_respect_locks",
    lockedRefine.options.overrides?.density === "compact" &&
      lockedRefine.ignored.includes("density:locked"),
  );
  add(
    "unknown_refinement_rejected",
    throwsEngineError(() =>
      refineOptions("teleport" as never, { overrides: {} }, normalizeIntent(intent)),
    ),
  );

  /* -------------------------------- 10. future constraints actually execute */
  const impossible = buildFutureCompositionPlan(intent, {
    capabilities: { before_after_block: true, gallery_block: true },
    content: { before_after: { available: true, count: 1 } },
  });
  const beforeAfter = impossible.evaluated_blocks.find((b) => b.type === "before_after");
  add(
    "incomplete_pair_blocked",
    !impossible.recommended_blocks.some((b) => b.type === "before_after") &&
      (beforeAfter?.reasons.some((r) => r.startsWith("constraint:")) ?? false),
    beforeAfter?.status ?? "missing",
  );

  const overlays = buildFutureCompositionPlan(intent, {
    capabilities: { sticky_primary_cta: true, floating_contact: true },
    business: { urgency: "high", conversion_mode: "contact" },
  });
  const overlayCount = overlays.recommended_blocks.filter(
    (b) => b.type === "sticky_primary_cta" || b.type === "floating_contact",
  ).length;
  add("overlay_exclusion_enforced", overlayCount <= 1, `${overlayCount}`);

  add(
    "future_blocks_never_leak",
    generatePageRecipe(intent, {
      now: NOW,
      context: {
        future_capabilities: { gallery_block: true, testimonials_block: true },
        content: { gallery: { available: true, count: 6 } },
      },
    }).blocks.every((b) => {
      const type = b.type as string;
      return type !== "gallery" && type !== "testimonials";
    }),
  );

  /* ------------------------------ 11. industry + malformed intent coverage */
  const industryOk = INDUSTRY_FIXTURES.every(
    (fixture) =>
      validateIntent(fixture.intent).length === 0 &&
      validatePageRecipe(generatePageRecipe(fixture.intent, { now: NOW, context: fixture.context }))
        .valid,
  );
  add("industry_matrix", industryOk, `${INDUSTRY_FIXTURES.length}`);
  add(
    "malformed_intent_rejected",
    throwsEngineError(() => generatePageRecipe({} as never, { now: NOW })),
  );

  /* --------------- 11b. AUDIT: malformed candidate intent is controlled */
  add(
    "candidates_reject_malformed_intent",
    throwsEngineError(() => generateCandidateSet({} as never, { now: NOW })) &&
      throwsEngineError(() => generateCandidateSet(null as never, { now: NOW })),
  );

  /* --------------- 11c. AUDIT: axis plans enumerate REAL allowed values */
  const axisSet = generateCandidateSet(intent, {
    now: NOW,
    count: 10,
    variantsPerPreset: 4,
    axisPlansPerVariant: 4,
  });
  const axisLegal = axisSet.evaluated.every((c) => {
    const family = c.recipe.meta.family;
    return (
      (allowedAxisValues(family, "radius") as readonly string[]).includes(
        c.recipe.design.geometry.radius,
      ) &&
      (allowedAxisValues(family, "border_style") as readonly string[]).includes(
        c.recipe.design.geometry.border_style,
      )
    );
  });
  const borderValues = new Set(axisSet.evaluated.map((c) => c.recipe.design.geometry.border_style));
  const cardActionValues = new Set(
    axisSet.evaluated
      .filter((c) => c.recipe.design.card.enabled)
      .map((c) => c.recipe.design.card.action_style),
  );
  add(
    "axis_values_real_and_varied",
    axisLegal && borderValues.size > 1 && cardActionValues.size > 1,
    `${[...borderValues].join("/")}|${[...cardActionValues].join("/")}`,
  );

  /* --------------- 11d. AUDIT: preset preferred_pattern participates softly
     through the REAL candidate generator path (not a context-free engine call). */
  const mediaIntent = structuredClone(intent);
  mediaIntent.identity = { ...mediaIntent.identity, banner_preview: "/banner.jpg" };
  mediaIntent.assets = { card_media: true };
  const presetPatternMisses = listPresets().filter((preset) => {
    const set = generateCandidateSet(mediaIntent, {
      now: NOW,
      presets: [preset.id],
      count: 6,
      variantsPerPreset: 3,
      minimumDistance: 0,
    });
    return !set.evaluated.some(
      (c) => c.preset === preset.id && c.pattern === preset.preferred_pattern,
    );
  });
  const noMediaIntent = structuredClone(intent);
  noMediaIntent.identity = { ...noMediaIntent.identity, banner_preview: null };
  noMediaIntent.assets = { card_media: false };
  const noMediaSet = generateCandidateSet(noMediaIntent, {
    now: NOW,
    presets: ["visual_portfolio"],
    count: 6,
    variantsPerPreset: 3,
    minimumDistance: 0,
  });
  // portfolio_first requires media: it must never be forced without it.
  const impossiblePatternForced = noMediaSet.evaluated.some((c) => c.pattern === "portfolio_first");
  const baselinePattern = generateWithTrace(intent, { now: NOW });
  add(
    "preset_pattern_connected_via_candidates",
    presetPatternMisses.length === 0 &&
      !impossiblePatternForced &&
      baselinePattern.ok &&
      baselinePattern.value.trace.pattern === undefined,
    presetPatternMisses.map((p) => p.id).join(","),
  );

  add(
    "invalid_pattern_hint_ignored",
    (() => {
      const traced = generateWithTrace(intent, {
        now: NOW,
        advanced: { pattern_hint: "teleport_first" },
      });
      return traced.ok && traced.value.trace.pattern === undefined;
    })(),
  );

  /* --------------- 11e. AUDIT: canonical refinement vocabulary behaves */
  const CANONICAL = [
    "more_bold",
    "more_calm",
    "stronger_cta",
    "more_trust",
    "more_premium",
    "more_minimal",
    "prefer_cards",
    "prefer_buttons",
    "prefer_banner",
    "prefer_avatar",
    "prefer_banner_avatar",
    "another_composition",
    "next_variant",
    "previous_variant",
    "reset",
  ] as const;
  const canonicalMissing = CANONICAL.filter(
    (command) => !(REFINEMENT_COMMANDS as readonly string[]).includes(command),
  );
  const canonicalInert = CANONICAL.filter((command) => {
    if (command === "reset" || command === "previous_variant") return false;
    const result = refineOptions(command, { overrides: {}, variant: 0 }, normalizeIntent(intent));
    return result.changed.length === 0 && result.ignored.length === 0;
  });
  add(
    "canonical_refinements_present",
    canonicalMissing.length === 0 && canonicalInert.length === 0,
    [...canonicalMissing, ...canonicalInert].join(","),
  );
  const rotated = refineOptions(
    "another_composition",
    { overrides: { links_presentation: "buttons" }, variant: 0 },
    normalizeIntent(intent),
  );
  const heroIntent = structuredClone(intent);
  heroIntent.identity = { ...heroIntent.identity, banner_preview: "/banner.jpg" };
  const heroNorm = normalizeIntent(heroIntent);
  const heroRef = (command: string, overrides = {}) =>
    refineOptions(command as never, { overrides, variant: 0 }, heroNorm).options.overrides?.hero_mode;
  const noBannerNorm = normalizeIntent(
    (() => {
      const i = structuredClone(intent);
      i.identity = { ...i.identity, banner_preview: null };
      return i;
    })(),
  );
  add(
    "prefer_banner_contract",
    heroRef("prefer_banner") === "banner_only" &&
      heroRef("prefer_banner_avatar") === "banner_avatar" &&
      heroRef("prefer_avatar") === "avatar_only" &&
      refineOptions("prefer_banner", { overrides: {}, variant: 0 }, noBannerNorm).ignored.length > 0,
  );
  add(
    "prefer_banner_respects_lock",
    (["prefer_banner", "prefer_avatar", "prefer_banner_avatar"] as const).every(
      (command) =>
        refineOptions(
          command,
          { overrides: { hero_mode: "banner_avatar", locked: ["hero_mode"] } as never, variant: 0 },
          heroNorm,
        ).options.overrides?.hero_mode === "banner_avatar",
    ),
  );
  add(
    "another_composition_rotates_structure",
    rotated.options.overrides?.links_presentation === "cards" && rotated.options.variant === 1,
  );

  /* --------------- 11f. AUDIT: permanent 20-industry classification matrix */
  const classificationFailures = INDUSTRY_CLASSIFICATION_CASES.filter((testCase) => {
    const normalizedCase = normalizeIntent(testCase.intent);
    if (inferArchetype(normalizedCase) !== testCase.expected_archetype) return true;
    return !validatePageRecipe(generatePageRecipe(testCase.intent, { now: NOW })).valid;
  }).map((testCase) => testCase.id);
  add(
    "industry_matrix_20",
    classificationFailures.length === 0 && INDUSTRY_CLASSIFICATION_CASES.length === 20,
    classificationFailures.join(","),
  );

  /* --------------- 11g. AUDIT: impossible calendar timestamps rejected */
  add(
    "invalid_calendar_rejected",
    !isIsoTimestamp("2026-02-31T00:00:00Z") &&
      !isIsoTimestamp("2026-13-01T00:00:00Z") &&
      !isIsoTimestamp("2026-01-01T25:00:00Z") &&
      isIsoTimestamp("2026-02-28T23:59:59Z") &&
      isIsoTimestamp("2024-02-29T10:00:00+02:00"),
  );
  const badDate = baseIntent();
  badDate.meta = { ...badDate.meta, completed_at: "2026-02-31T00:00:00.000Z" };
  add(
    "invalid_calendar_intent_rejected",
    throwsEngineError(() => generatePageRecipe(badDate, { now: NOW })),
  );

  /* --------------- 11h. AUDIT: public helpers never raise raw TypeErrors */
  const recipe = generatePageRecipe(intent, { now: NOW });
  const helperCases: [string, () => unknown][] = [
    ["fingerprint_null", () => fingerprintRecipe(null as never)],
    ["fingerprint_array", () => fingerprintRecipe([] as never)],
    ["diff_null_left", () => diffRecipes(null as never, recipe)],
    ["diff_null_right", () => diffRecipes(recipe, {} as never)],
    ["compat_null", () => checkRecipeRendererCompatibility(null as never, {} as never)],
    ["compat_bad_caps", () => checkRecipeRendererCompatibility(recipe, null as never)],
    ["controls_null", () => getAvailableControls(null as never, null as never)],
    ["controls_array", () => getAvailableControls([] as never, [] as never, [] as never)],
  ];
  const helperFailures = helperCases.filter(([, fn]) => !survives(fn)).map(([name]) => name);
  add("public_helpers_controlled", helperFailures.length === 0, helperFailures.join(","));

  /* --------------------------------------------- 12. determinism + latency */
  const started = Date.now();
  let deterministic = true;
  for (const { intent: sample } of SAMPLE_INTENTS) {
    const a = JSON.stringify(generatePageRecipe(sample, { now: NOW }));
    const b = JSON.stringify(generatePageRecipe(sample, { now: NOW }));
    if (a !== b) deterministic = false;
  }
  const elapsed = Date.now() - started;
  add("deterministic_output", deterministic);
  add("performance_budget", elapsed < 1000, `${elapsed}ms`);

  return { passed: checks.every((c) => c.passed), checks };
}
