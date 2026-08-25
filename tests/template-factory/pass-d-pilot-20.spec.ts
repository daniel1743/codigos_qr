import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  exportConfig,
  loadConfig,
  measureOverflow,
  openRenderer,
  readRenderedSnapshot,
  validateInRenderer,
  type RendererErrors,
} from "./helpers/renderer";

import {
  diffConfigs,
  findNonSerializable,
  isUnsafeUrl,
  normalizeTemplateConfig,
  roundTripConfig,
  type TemplateConfig,
} from "../../src/lib/template-factory/config";
import { generateTemplate, GENERATOR_VERSION, type ButtonCount } from "../../src/lib/template-factory/generator";
import { buildIngestionRecord, INITIAL_PUBLICATION_STATUS } from "../../src/lib/template-factory/ingestion";
import type { IndustryId } from "../../src/lib/template-factory/industries";
import {
  computeQaScore,
  OVERFLOW_TOLERANCE_PX,
  QA_VIEWPORTS,
  type QaCheckResults,
  type QaFinding,
} from "../../src/lib/template-factory/qa";

const ROOT = join(process.cwd(), "artifacts", "template-factory", "pass-d-pilot-20");
const CONFIGS = join(ROOT, "configs");
const SCREENSHOTS = join(ROOT, "screenshots");
const RESPONSIVE = join(ROOT, "responsive");
const QA = join(ROOT, "qa");
const LOGS = join(ROOT, "logs");

const MATRIX = [
  ...pilotRows("medical", "medical_clean", [1, 2, 3, 4, 5]),
  ...pilotRows("legal", "lawyer_executive", [1, 2, 3, 4, 5]),
  ...pilotRows("restaurant", "restaurant_premium", [1, 2, 3, 4, 5]),
  ...pilotRows("barber", "barber_modern", [1, 2, 3, 4, 5]),
] as const;

function pilotRows(industry: IndustryId, recipe: string, counts: ButtonCount[]) {
  return counts.map((buttonCount, index) => ({
    industry,
    recipe,
    buttonCount,
    seed: `pilot-20-v1-${industry}-${String(index + 1).padStart(2, "0")}`,
    file: `${industry}-${String(index + 1).padStart(2, "0")}`,
    globalIndex:
      industry === "medical" ? index : industry === "legal" ? index + 5 : industry === "restaurant" ? index + 10 : index + 15,
  }));
}

function ensureDirs() {
  for (const dir of [ROOT, CONFIGS, SCREENSHOTS, RESPONSIVE, QA, LOGS]) {
    mkdirSync(dir, { recursive: true });
  }
}

function writeJson(relative: string, data: unknown) {
  writeFileSync(join(ROOT, relative), JSON.stringify(data, null, 2), "utf8");
}

function isPngReadable(path: string) {
  if (!existsSync(path) || statSync(path).size <= 0) return false;
  return readFileSync(path).subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
}

function qualityScore(input: {
  checks: QaCheckResults;
  contentComplete: boolean;
  visualOk: boolean;
  responsiveOk: boolean;
  variationBonus: number;
}) {
  const dimensions = {
    schema_validity: input.checks.schemaValid ? 0.2 : 0,
    renderer_success: input.checks.rendererSuccess ? 0.2 : 0,
    responsive_integrity: input.responsiveOk ? 0.15 : 0,
    content_completeness: input.contentComplete ? 0.15 : 0,
    action_validity: input.checks.urlSafety && input.checks.buttonIntegrity ? 0.15 : 0,
    visual_qa: input.visualOk ? 0.15 : 0,
    variation_bonus: input.variationBonus,
  };
  const raw = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
  return { score: Number(Math.min(1, raw).toFixed(2)), dimensions };
}

test("PASS D — pilot batch local de 20 templates", async ({ page }) => {
  test.setTimeout(180_000);
  ensureDirs();
  expect(MATRIX.length).toBe(20);

  const rendererErrors: RendererErrors = await openRenderer(page);
  const results: unknown[] = [];
  const roundTripResults: unknown[] = [];
  const responsiveResults: unknown[] = [];
  const qualityScores: unknown[] = [];
  const publicationSafety: unknown[] = [];
  const humanReview: unknown[] = [];

  for (const row of MATRIX) {
    const generated = generateTemplate({
      industry: row.industry,
      recipe: row.recipe,
      buttonCount: row.buttonCount,
      seed: row.seed,
      batchId: "PILOT-20-V1",
      index: row.globalIndex,
    });

    const configPath = join(CONFIGS, `${row.file}.json`);
    writeFileSync(configPath, JSON.stringify(generated.config, null, 2), "utf8");

    const localValidation = generated.validation;
    const normalized = normalizeTemplateConfig(generated.config);
    const normalizedDiff = diffConfigs(generated.config, normalized);
    const nonSerializable = findNonSerializable(generated.config);
    const serializationBytes = JSON.stringify(generated.config).length;

    const loadResult = await loadConfig(page, generated.config);
    const rendererValidation = await validateInRenderer(page, generated.config);
    const rendered = await readRenderedSnapshot(page);
    const exported = (await exportConfig(page)) as TemplateConfig;
    const rendererDiff = diffConfigs(generated.config, exported);
    const localRoundTrip = roundTripConfig(generated.config);
    const unsafeUrls = generated.config.links.filter((link) => isUnsafeUrl(link.url)).map((link) => link.url);
    const smartActionRows = generated.config.links.map((link) => ({
      text: link.text,
      actionType: link.actionType ?? "url",
      url: link.url,
      waMessage: link.waMessage ?? "",
      safe: !isUnsafeUrl(link.url),
    }));

    const viewportRows = [];
    for (const viewport of QA_VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const overflow = await measureOverflow(page);
      viewportRows.push({
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
        overflowPx: overflow.overflowPx,
        overflow: overflow.overflowPx > OVERFLOW_TOLERANCE_PX,
      });
    }
    await page.setViewportSize({ width: 430, height: 932 });
    const extraOverflow = await measureOverflow(page);
    viewportRows.push({
      name: "430x932",
      width: 430,
      height: 932,
      overflowPx: extraOverflow.overflowPx,
      overflow: extraOverflow.overflowPx > OVERFLOW_TOLERANCE_PX,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const screenshotPath = join(SCREENSHOTS, `${row.file}.png`);
    await page.screenshot({ path: screenshotPath });

    const buttonIntegrity =
      rendered.buttonCount === row.buttonCount &&
      JSON.stringify(rendered.buttonTexts) === JSON.stringify(generated.config.links.map((link) => link.text));
    const visualFindings: string[] = [];
    if (!rendered.titleText) visualFindings.push("missing title");
    if (!rendered.profileSrc) visualFindings.push("missing profile image");
    if (!isPngReadable(screenshotPath)) visualFindings.push("screenshot not readable");
    if (viewportRows.some((viewport) => viewport.overflow)) visualFindings.push("viewport overflow");

    const checks: QaCheckResults = {
      schemaValid: localValidation.valid && rendererValidation.valid && normalizedDiff.length === 0,
      rendererSuccess: loadResult.ok && rendererErrors.pageErrors.length === 0 && rendered.buttonCount > 0,
      noOverflow: viewportRows.every((viewport) => !viewport.overflow),
      buttonIntegrity,
      assetIntegrity: Boolean(generated.config.identity.profileImg),
      urlSafety: unsafeUrls.length === 0,
      roundTrip: localRoundTrip.ok && rendererDiff.length === 0,
    };
    const findings: QaFinding[] = [
      ...viewportRows
        .filter((viewport) => viewport.overflow)
        .map((viewport) => ({
          check: "viewport" as const,
          severity: "warning" as const,
          message: `Overflow horizontal en ${viewport.name}`,
          detail: `${viewport.overflowPx}px`,
        })),
      ...visualFindings.map((finding) => ({
        check: "rendererSuccess" as const,
        severity: "warning" as const,
        message: finding,
      })),
    ];
    const qa = computeQaScore(checks, findings);
    const contentComplete =
      Boolean(generated.config.identity.titleText) &&
      Boolean(generated.config.identity.subtitleText) &&
      generated.config.links.length === row.buttonCount &&
      generated.config.socials.items.length > 0;
    const quality = qualityScore({
      checks,
      contentComplete,
      visualOk: visualFindings.length === 0,
      responsiveOk: viewportRows.every((viewport) => !viewport.overflow),
      variationBonus: generated.config.appearance.banner.enabled ? 0 : -0.02,
    });
    const ingestion = buildIngestionRecord(generated, qa);
    const privateSafe =
      ingestion.ok &&
      ingestion.record.publication_status === INITIAL_PUBLICATION_STATUS &&
      ingestion.record.is_public === false &&
      !("published_at" in ingestion.record);
    const screenshotRelative = `screenshots/${row.file}.png`;
    const status =
      checks.schemaValid &&
      checks.rendererSuccess &&
      checks.noOverflow &&
      checks.buttonIntegrity &&
      checks.urlSafety &&
      checks.roundTrip &&
      privateSafe &&
      isPngReadable(screenshotPath)
        ? "PASS"
        : "FAIL";

    const common = {
      template_id: generated.templateId,
      industry: row.industry,
      seed: row.seed,
      recipe: row.recipe,
      generatorVersion: GENERATOR_VERSION,
      configHash: generated.configHash,
      themeId: generated.config.appearance.themeId,
      buttonPresetId: generated.config.appearance.btnPresetId,
      layout: generated.config.layout.gridCols === 1 ? "list" : "grid",
      typography: {
        logo: generated.config.appearance.fontLogo,
        heading: generated.config.appearance.fontHeading,
      },
      buttonCount: row.buttonCount,
      configPath: `configs/${row.file}.json`,
      screenshotPath: screenshotRelative,
    };

    results.push({
      ...common,
      generated: true,
      validated: localValidation.valid,
      rendered: loadResult.ok && rendered.buttonCount > 0,
      screenshot: isPngReadable(screenshotPath),
      round_trip: checks.roundTrip,
      responsive_sample: row.globalIndex % 5 < 2,
      qa_score: quality.score,
      status,
      validation: localValidation,
      rendererValidation,
      nonSerializable,
      unsafeUrls,
      smartActions: smartActionRows,
      visualFindings,
      rendererErrors,
    });
    roundTripResults.push({
      ...common,
      localRoundTrip,
      rendererDifferences: rendererDiff,
      waMessagePreserved: rendererDiff.every((diff) => !diff.includes("waMessage")),
      verdict: checks.roundTrip ? "PASS" : "FAIL",
    });
    if (row.globalIndex % 5 < 2) {
      responsiveResults.push({ ...common, viewports: viewportRows, verdict: checks.noOverflow ? "PASS" : "FAIL" });
      writeJson(`responsive/${row.file}.json`, { ...common, viewports: viewportRows, verdict: checks.noOverflow ? "PASS" : "FAIL" });
    }
    qualityScores.push({ ...common, qaScore: quality.score, dimensions: quality.dimensions, qa, recommendedStatus: status === "PASS" ? "READY_FOR_HUMAN_REVIEW" : "NEEDS_FIX" });
    publicationSafety.push({ ...common, publication_status: ingestion.ok ? ingestion.record.publication_status : null, is_public: ingestion.ok ? ingestion.record.is_public : null, published_at: null, verdict: privateSafe ? "PASS" : "FAIL" });
    humanReview.push({ template_id: generated.templateId, industry: row.industry, seed: row.seed, recipe: row.recipe, screenshot_path: screenshotRelative, config_path: `configs/${row.file}.json`, qa_score: quality.score, qa_findings: qa.findings, recommended_status: status === "PASS" ? "READY_FOR_HUMAN_REVIEW" : "NEEDS_FIX" });
    writeJson(`qa/${row.file}.json`, { ...common, qa, quality, visualFindings, status });

    expect(status, `${row.file}: ${JSON.stringify({ checks, visualFindings, rendererDiff, unsafeUrls })}`).toBe("PASS");
  }

  const distribution = Object.fromEntries(
    (["medical", "legal", "restaurant", "barber"] as const).map((industry) => [
      industry,
      results.filter((result) => (result as { industry: IndustryId }).industry === industry).length,
    ]),
  );
  const determinismRows = (["medical", "legal", "restaurant", "barber"] as const).map((industry) => {
    const row = MATRIX.find((candidate) => candidate.industry === industry)!;
    const a = generateTemplate({ industry: row.industry, recipe: row.recipe, buttonCount: row.buttonCount, seed: row.seed, batchId: "PILOT-20-V1", index: row.globalIndex });
    const b = generateTemplate({ industry: row.industry, recipe: row.recipe, buttonCount: row.buttonCount, seed: row.seed, batchId: "PILOT-20-V1", index: row.globalIndex });
    return {
      industry,
      template_id: a.templateId,
      seed: row.seed,
      sameConfig: JSON.stringify(a.config) === JSON.stringify(b.config),
      sameConfigHash: a.configHash === b.configHash,
      configHashA: a.configHash,
      configHashB: b.configHash,
    };
  });
  const duplicateGroups = new Map<string, unknown[]>();
  for (const result of results) {
    const row = result as { industry: string; themeId: string; buttonPresetId: string; layout: string; buttonCount: number; typography: { logo: string; heading: string } };
    const fingerprint = [row.industry, row.themeId, row.buttonPresetId, row.layout, row.buttonCount, row.typography.logo, row.typography.heading].join("|");
    duplicateGroups.set(fingerprint, [...(duplicateGroups.get(fingerprint) ?? []), result]);
  }
  const exactDuplicates = results.length - new Set(results.map((result) => (result as { configHash: string }).configHash)).size;
  const nearDuplicates = [...duplicateGroups.values()].filter((group) => group.length > 1);
  const variation = Object.fromEntries(
    (["medical", "legal", "restaurant", "barber"] as const).map((industry) => {
      const rows = results.filter((result) => (result as { industry: IndustryId }).industry === industry) as {
        themeId: string;
        buttonPresetId: string;
        layout: string;
        typography: { logo: string; heading: string };
        buttonCount: number;
        configHash: string;
      }[];
      return [
        industry,
        {
          count: rows.length,
          themes: [...new Set(rows.map((row) => row.themeId))],
          buttonPresets: [...new Set(rows.map((row) => row.buttonPresetId))],
          layouts: [...new Set(rows.map((row) => row.layout))],
          typography: [...new Set(rows.map((row) => `${row.typography.logo} / ${row.typography.heading}`))],
          buttonCounts: [...new Set(rows.map((row) => row.buttonCount))],
          hashes: rows.map((row) => row.configHash),
          verdict: new Set(rows.map((row) => row.configHash)).size === rows.length ? "PASS" : "FAIL",
        },
      ];
    }),
  );

  const summary = {
    batchId: "PILOT-20-V1",
    total: results.length,
    pass: results.filter((result) => (result as { status: string }).status === "PASS").length,
    fail: results.filter((result) => (result as { status: string }).status === "FAIL").length,
    distribution,
    exactDuplicates,
    nearDuplicateGroups: nearDuplicates.length,
    responsiveSamples: responsiveResults.length,
    verdict:
      results.length === 20 &&
      Object.values(distribution).every((count) => count === 5) &&
      exactDuplicates === 0 &&
      determinismRows.every((row) => row.sameConfig && row.sameConfigHash)
        ? "PASS"
        : "FAIL",
  };

  writeJson("batch-manifest.json", { generatedAt: new Date().toISOString(), batchId: "PILOT-20-V1", matrix: MATRIX, summary });
  writeJson("generation-results.json", { generatedAt: new Date().toISOString(), summary, executionMatrix: results });
  writeJson("determinism-results.json", { generatedAt: new Date().toISOString(), results: determinismRows, verdict: determinismRows.every((row) => row.sameConfig && row.sameConfigHash) ? "PASS" : "FAIL" });
  writeJson("duplicate-analysis.json", { generatedAt: new Date().toISOString(), exactDuplicates, nearDuplicates, variation, verdict: exactDuplicates === 0 ? "PASS" : "FAIL" });
  writeJson("round-trip-results.json", { generatedAt: new Date().toISOString(), results: roundTripResults, verdict: roundTripResults.every((row) => (row as { verdict: string }).verdict === "PASS") ? "PASS" : "FAIL" });
  writeJson("responsive-results.json", { generatedAt: new Date().toISOString(), minimumRequired: 8, sampled: responsiveResults.length, results: responsiveResults, verdict: responsiveResults.length >= 8 && responsiveResults.every((row) => (row as { verdict: string }).verdict === "PASS") ? "PASS" : "FAIL" });
  writeJson("quality-scores.json", { generatedAt: new Date().toISOString(), scoreRange: { min: 0, max: 1 }, results: qualityScores });
  writeJson("human-review-manifest.json", { generatedAt: new Date().toISOString(), publishAllowed: false, entries: humanReview });
  writeJson("publication-safety-results.json", { generatedAt: new Date().toISOString(), expected: { publication_status: INITIAL_PUBLICATION_STATUS, is_public: false }, results: publicationSafety, verdict: publicationSafety.every((row) => (row as { verdict: string }).verdict === "PASS") ? "PASS" : "FAIL" });

  expect(summary).toMatchObject({
    total: 20,
    pass: 20,
    fail: 0,
    exactDuplicates: 0,
    responsiveSamples: 8,
    verdict: "PASS",
  });
});
