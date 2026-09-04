/**
 * V1.5 — additive self-check.
 *
 * Runs the original V1 self-check first (backward compatibility gate), then
 * validates the V1.5 reserve layer. Pure and synchronous.
 */

import { generateCandidateSet } from "../candidates";
import { getAvailableControls, getEngineControlCatalog } from "../control-catalog";
import { resolveEngineContext } from "../context";
import { signatureDistance, structuralSignature } from "../diversity";
import { generatePageRecipe, generateWithTrace } from "../engine";
import { checkRecipeRendererCompatibility, fingerprintRecipe } from "../fingerprint";
import { buildFutureCompositionPlanFromNormalized } from "../future-plan";
import { DEFAULT_FUTURE_CAPABILITIES } from "../future-capabilities";
import { buildMotionStrategy } from "../motion";
import { normalizeIntent, validateIntent } from "../normalize";
import { validateAdvancedPalettes } from "../palettes-extended";
import { listPresets } from "../presets";
import { diffRecipes } from "../recipe-diff";
import { refineOptions } from "../refinements";
import { buildResponsiveStrategy } from "../responsive";
import { resolveCapabilities } from "../capabilities";
import { SUPPORTED_BLOCK_TYPES } from "../types";
import { validatePageRecipe } from "../validator";
import { runEngineSelfCheck } from "./self-check";
import { INDUSTRY_FIXTURES } from "./industry-intents";
import { SAMPLE_INTENTS } from "./intents";

export interface SelfCheckV15Result {
  passed: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
}

const NOW = "2026-01-01T00:00:00.000Z";

export function runEngineSelfCheckV15(): SelfCheckV15Result {
  const checks: { name: string; passed: boolean; detail: string }[] = [];
  const add = (name: string, passed: boolean, detail = "") => checks.push({ name, passed, detail });

  /* ------------------------------------------- 1. V1 backward compatibility */
  const v1 = runEngineSelfCheck();
  add("v1_self_check", v1.failed === 0, v1.failures.join(",").slice(0, 200));

  /* ------------------------- 2. no context => byte-identical to plain call */
  let identical = true;
  for (const { intent } of SAMPLE_INTENTS) {
    const a = JSON.stringify(generatePageRecipe(intent, { now: NOW }));
    const b = JSON.stringify(generatePageRecipe(intent, { now: NOW, variant: 0 }));
    if (a !== b) identical = false;
  }
  add("default_path_unchanged", identical);

  /* --------------------------------- 3. industry fixtures generate + valid */
  let industryOk = true;
  const details: string[] = [];
  for (const fixture of INDUSTRY_FIXTURES) {
    if (validateIntent(fixture.intent).length > 0) {
      industryOk = false;
      details.push(`${fixture.id}:invalid_intent`);
      continue;
    }
    const recipe = generatePageRecipe(fixture.intent, { now: NOW, context: fixture.context });
    const result = validatePageRecipe(recipe);
    if (!result.valid) {
      industryOk = false;
      details.push(`${fixture.id}:${result.issues[0]?.code ?? "invalid"}`);
    }
    const unsupported = recipe.blocks.filter(
      (b) => !(SUPPORTED_BLOCK_TYPES as readonly string[]).includes(b.type),
    );
    if (unsupported.length > 0) {
      industryOk = false;
      details.push(`${fixture.id}:unsupported_block`);
    }
  }
  add("industry_fixtures", industryOk, details.join(","));

  /* ------------------------------------------ 4. determinism with context */
  const sample = INDUSTRY_FIXTURES[0]!;
  const r1 = generatePageRecipe(sample.intent, { now: NOW, context: sample.context, variant: 2 });
  const r2 = generatePageRecipe(sample.intent, { now: NOW, context: sample.context, variant: 2 });
  add("context_determinism", JSON.stringify(r1) === JSON.stringify(r2));
  add("fingerprint_stable", fingerprintRecipe(r1) === fingerprintRecipe(r2));
  add("diff_identical", diffRecipes(r1, r2).identical);

  /* ------------------------------------------------ 5. future isolation */
  const normalized = normalizeIntent(sample.intent);
  const resolved = resolveEngineContext(normalized, sample.context);
  const plan = buildFutureCompositionPlanFromNormalized(normalized, sample.context);
  const leaked = r1.blocks.some(
    (b) => !(SUPPORTED_BLOCK_TYPES as readonly string[]).includes(b.type),
  );
  add("future_blocks_never_emitted", !leaked && plan.recommended_blocks.length >= 0);
  add(
    "future_capabilities_default_off",
    Object.values(DEFAULT_FUTURE_CAPABILITIES).every((v) => v === false),
  );
  add("responsive_dormant", buildResponsiveStrategy("centered_profile", "balanced", resolved.future) === null);
  add("motion_dormant", buildMotionStrategy(r1.meta.family, resolved.future) === null);

  /* ------------------------------------------------- 6. palettes contrast */
  const badPalettes = validateAdvancedPalettes();
  add("advanced_palettes_accessible", badPalettes.length === 0, badPalettes.join(","));

  /* ----------------------------------------------- 7. candidates + scoring */
  const set = generateCandidateSet(sample.intent, {
    now: NOW,
    context: sample.context,
    count: 3,
  });
  const uniqueFingerprints = new Set(set.candidates.map((c) => c.fingerprint)).size;
  add(
    "candidates_generated",
    set.candidates.length === 3 && uniqueFingerprints === set.candidates.length,
    `${set.candidates.length}/${set.evaluated.length}`,
  );
  const ranked = set.evaluated.every(
    (c, i) => i === 0 || set.evaluated[i - 1]!.score.total >= c.score.total,
  );
  add("candidates_ranked", ranked);
  const diverse = set.candidates.every((c, i) =>
    set.candidates.slice(0, i).every((o) => signatureDistance(o.signature, c.signature) >= 1),
  );
  add("candidates_diverse", diverse);

  const set2 = generateCandidateSet(sample.intent, { now: NOW, context: sample.context, count: 3 });
  add(
    "candidates_deterministic",
    JSON.stringify(set.candidates.map((c) => c.id)) ===
      JSON.stringify(set2.candidates.map((c) => c.id)),
  );

  /* ------------------------------------------------------ 8. refinements */
  const refined = refineOptions("calmer", { now: NOW, context: sample.context }, normalized);
  const refinedRecipe = generatePageRecipe(sample.intent, refined.options);
  add(
    "refinement_applies",
    validatePageRecipe(refinedRecipe).valid && refined.changed.length > 0,
    refined.changed.join(","),
  );
  const lockedRefine = refineOptions(
    "bolder",
    { now: NOW, overrides: { density: "spacious", locked: ["density"] } },
    normalized,
  );
  add(
    "refinement_respects_locks",
    lockedRefine.options.overrides?.density === "spacious",
    lockedRefine.ignored.join(","),
  );

  /* -------------------------------------------------------- 9. presets */
  let presetsOk = true;
  for (const preset of listPresets()) {
    const recipe = generatePageRecipe(sample.intent, {
      now: NOW,
      overrides: preset.overrides,
      context: sample.context,
    });
    if (!validatePageRecipe(recipe).valid) presetsOk = false;
  }
  add("presets_valid", presetsOk);

  /* ------------------------------------------ 10. controls + capabilities */
  const catalog = getEngineControlCatalog();
  const available = getAvailableControls(
    resolveCapabilities(),
    resolved.content,
    resolved.future,
  );
  add(
    "controls_capability_gated",
    catalog.length > available.length && available.every((c) => !c.required_future_capability),
    `${available.length}/${catalog.length}`,
  );

  const minimal = resolveCapabilities({
    professional_cards: false,
    hero_banner: false,
    radial_background: false,
    gradient_background: false,
    media_block: false,
    social_links: false,
    elevated_cards: false,
    professional_badge: false,
    card_media_right: false,
    card_media_bottom: false,
  });
  const minimalRecipe = generatePageRecipe(sample.intent, {
    now: NOW,
    context: sample.context,
    capabilities: minimal,
  });
  add(
    "minimal_renderer_compatible",
    checkRecipeRendererCompatibility(minimalRecipe, minimal).compatible,
  );

  /* ----------------------------------------------- 11. trace + structure */
  const traced = generateWithTrace(sample.intent, { now: NOW, context: sample.context });
  add(
    "trace_exposes_context",
    traced.ok && !!traced.value.trace.context && !!traced.value.trace.pattern,
  );
  add(
    "signature_stable",
    JSON.stringify(structuralSignature(r1)) === JSON.stringify(structuralSignature(r2)),
  );

  return { passed: checks.every((c) => c.passed), checks };
}
