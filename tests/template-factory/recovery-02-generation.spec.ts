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

import { roundTripConfig, diffConfigs, findNonSerializable, isUnsafeUrl, type TemplateConfig } from "../../src/lib/template-factory/config";
import { generateTemplate, type ButtonCount } from "../../src/lib/template-factory/generator";
import { buildIngestionRecord, INITIAL_PUBLICATION_STATUS } from "../../src/lib/template-factory/ingestion";
import { computeQaScore, OVERFLOW_TOLERANCE_PX, QA_VIEWPORTS, type QaCheckResults, type QaFinding } from "../../src/lib/template-factory/qa";
import type { IndustryId } from "../../src/lib/template-factory/industries";

const ARTIFACTS = join(process.cwd(), "artifacts", "template-factory", "recovery-02");
const CONFIGS_DIR = join(ARTIFACTS, "generated-test-configs");
const SHOTS_DIR = join(ARTIFACTS, "screenshots");

const MATRIX = [
  { industry: "medical", recipe: "medical_clean", buttonCount: 2, seed: "rec02-medical-01", file: "medical-01" },
  { industry: "medical", recipe: "medical_clean", buttonCount: 5, seed: "rec02-medical-02", file: "medical-02" },
  { industry: "legal", recipe: "lawyer_executive", buttonCount: 2, seed: "rec02-legal-01", file: "legal-01" },
  { industry: "legal", recipe: "lawyer_executive", buttonCount: 4, seed: "rec02-legal-02", file: "legal-02" },
  { industry: "restaurant", recipe: "restaurant_premium", buttonCount: 2, seed: "rec02-restaurant-01", file: "restaurant-01" },
  { industry: "restaurant", recipe: "restaurant_premium", buttonCount: 4, seed: "rec02-restaurant-02", file: "restaurant-02" },
  { industry: "barber", recipe: "barber_modern", buttonCount: 2, seed: "rec02-barber-01", file: "barber-01" },
  { industry: "barber", recipe: "barber_modern", buttonCount: 5, seed: "rec02-barber-02", file: "barber-02" },
] as const satisfies readonly {
  industry: IndustryId;
  recipe: string;
  buttonCount: ButtonCount;
  seed: string;
  file: string;
}[];

function writeArtifact(name: string, data: unknown) {
  mkdirSync(ARTIFACTS, { recursive: true });
  writeFileSync(join(ARTIFACTS, name), JSON.stringify(data, null, 2), "utf8");
}

function pngReadable(path: string): boolean {
  if (!existsSync(path) || statSync(path).size <= 0) return false;
  const signature = readFileSync(path).subarray(0, 8);
  return signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

test("RECOVERY 02 — genera exactamente 8 templates autorizados con evidencia", async ({ page }) => {
  mkdirSync(CONFIGS_DIR, { recursive: true });
  mkdirSync(SHOTS_DIR, { recursive: true });

  const rendererErrors: RendererErrors = await openRenderer(page);
  const results: unknown[] = [];

  for (let index = 0; index < MATRIX.length; index++) {
    const row = MATRIX[index]!;
    const generated = generateTemplate({
      industry: row.industry,
      recipe: row.recipe,
      buttonCount: row.buttonCount,
      seed: row.seed,
      batchId: "rec02-authorized-8",
      index,
    });

    const configPath = join(CONFIGS_DIR, `${row.file}.json`);
    writeFileSync(configPath, JSON.stringify(generated.config, null, 2), "utf8");

    const localValidation = generated.validation;
    const serialized = JSON.stringify(generated.config);
    const nonSerializable = findNonSerializable(generated.config);
    const roundTrip = roundTripConfig(generated.config);

    const loadResult = await loadConfig(page, generated.config);
    const rendered = await readRenderedSnapshot(page);
    const rendererValidation = await validateInRenderer(page, generated.config);
    const exported = (await exportConfig(page)) as TemplateConfig;
    const rendererDiff = diffConfigs(generated.config, exported);

    const viewportResults: { name: string; width: number; height: number; overflowPx: number; overflow: boolean }[] = [];
    for (const viewport of QA_VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const overflow = await measureOverflow(page);
      viewportResults.push({
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
        overflowPx: overflow.overflowPx,
        overflow: overflow.overflowPx > OVERFLOW_TOLERANCE_PX,
      });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const screenshotPath = join(SHOTS_DIR, `${row.file}.png`);
    await page.screenshot({ path: screenshotPath });

    const unsafeUrls = generated.config.links.filter((link) => isUnsafeUrl(link.url)).map((link) => link.url);
    const buttonIntegrity =
      rendered.buttonCount === row.buttonCount &&
      JSON.stringify(rendered.buttonTexts) === JSON.stringify(generated.config.links.map((link) => link.text));

    const qaChecks: QaCheckResults = {
      schemaValid: localValidation.valid && rendererValidation.valid,
      rendererSuccess: loadResult.ok && rendered.buttonCount > 0 && rendererErrors.pageErrors.length === 0,
      noOverflow: viewportResults.every((viewport) => !viewport.overflow),
      buttonIntegrity,
      assetIntegrity: Boolean(generated.config.identity.profileImg),
      urlSafety: unsafeUrls.length === 0,
      roundTrip: roundTrip.ok && rendererDiff.length === 0,
    };

    const findings: QaFinding[] = viewportResults
      .filter((viewport) => viewport.overflow)
      .map((viewport) => ({
        check: "viewport",
        severity: "warning",
        message: `Overflow horizontal en ${viewport.name}`,
        detail: `${viewport.overflowPx}px`,
      }));
    const qa = computeQaScore(qaChecks, findings);
    const ingestion = buildIngestionRecord(generated, qa);

    const screenshotRelative = `screenshots/${row.file}.png`;
    const failureReasons = [
      !localValidation.valid ? "local validation failed" : null,
      !rendererValidation.valid ? "renderer validation failed" : null,
      !loadResult.ok ? "renderer load failed" : null,
      nonSerializable.length > 0 ? "non-serializable values found" : null,
      !roundTrip.ok ? "config round-trip failed" : null,
      rendererDiff.length > 0 ? "renderer round-trip differences found" : null,
      unsafeUrls.length > 0 ? "unsafe URLs found" : null,
      !buttonIntegrity ? "rendered button integrity failed" : null,
      !qa.blockingOk ? "QA blocking checks failed" : null,
      !ingestion.ok ? "ingestion rejected template" : null,
      ingestion.ok && ingestion.record.publication_status !== INITIAL_PUBLICATION_STATUS
        ? "publication status is not GENERATED_PRIVATE"
        : null,
      ingestion.ok && ingestion.record.is_public !== false ? "is_public is not false" : null,
      !pngReadable(screenshotPath) ? "screenshot is missing, empty, or not PNG-readable" : null,
    ].filter((reason): reason is string => Boolean(reason));

    const verdict = failureReasons.length === 0 ? "PASS" : "FAIL";

    results.push({
      industry: row.industry,
      recipe: row.recipe,
      seed: row.seed,
      buttonCount: row.buttonCount,
      templateId: generated.templateId,
      configHash: generated.configHash,
      themeId: generated.config.appearance.themeId,
      buttonPresetId: generated.config.appearance.btnPresetId,
      content: {
        titleText: generated.config.identity.titleText,
        subtitleText: generated.config.identity.subtitleText,
        buttonTexts: generated.config.links.map((link) => link.text),
      },
      validation: localValidation,
      serialization: { bytes: serialized.length, nonSerializable },
      renderer: {
        loadResult,
        validation: rendererValidation,
        renderedButtonCount: rendered.buttonCount,
        renderedButtonTexts: rendered.buttonTexts,
        rendererErrors,
      },
      roundTrip: {
        configRoundTrip: roundTrip,
        rendererDifferences: rendererDiff,
      },
      qa,
      viewportResults,
      unsafeUrls,
      screenshotPath: screenshotRelative,
      screenshot: {
        exists: existsSync(screenshotPath),
        sizeBytes: existsSync(screenshotPath) ? statSync(screenshotPath).size : 0,
        pngReadable: pngReadable(screenshotPath),
      },
      publicationStatus: ingestion.ok ? ingestion.record.publication_status : null,
      isPublic: ingestion.ok ? ingestion.record.is_public : null,
      failureReasons,
      verdict,
    });
  }

  const countByIndustry = (industry: IndustryId) =>
    results.filter((result) => (result as { industry: IndustryId }).industry === industry).length;

  const variation = Object.fromEntries(
    (["medical", "legal", "restaurant", "barber"] as const).map((industry) => {
      const rows = results.filter((result) => (result as { industry: IndustryId }).industry === industry) as {
        configHash: string;
        themeId: string;
        buttonPresetId: string;
        content: { buttonTexts: string[] };
        seed: string;
      }[];
      return [
        industry,
        {
          hashes: rows.map((row) => row.configHash),
          seeds: rows.map((row) => row.seed),
          themeIds: rows.map((row) => row.themeId),
          buttonPresetIds: rows.map((row) => row.buttonPresetId),
          buttonArrangements: rows.map((row) => row.content.buttonTexts),
          allDifferent: new Set(rows.map((row) => row.configHash)).size === rows.length,
        },
      ];
    }),
  );

  const determinismSource = MATRIX[0]!;
  const determinismA = generateTemplate({
    industry: determinismSource.industry,
    recipe: determinismSource.recipe,
    buttonCount: determinismSource.buttonCount,
    seed: determinismSource.seed,
    batchId: "rec02-authorized-8",
    index: 0,
  });
  const determinismB = generateTemplate({
    industry: determinismSource.industry,
    recipe: determinismSource.recipe,
    buttonCount: determinismSource.buttonCount,
    seed: determinismSource.seed,
    batchId: "rec02-authorized-8",
    index: 0,
  });

  const determinism = {
    input: determinismSource,
    sameConfig: JSON.stringify(determinismA.config) === JSON.stringify(determinismB.config),
    sameConfigHash: determinismA.configHash === determinismB.configHash,
    configHashA: determinismA.configHash,
    configHashB: determinismB.configHash,
  };

  const summary = {
    total: results.length,
    pass: results.filter((result) => (result as { verdict: string }).verdict === "PASS").length,
    fail: results.filter((result) => (result as { verdict: string }).verdict === "FAIL").length,
    medical_count: countByIndustry("medical"),
    legal_count: countByIndustry("legal"),
    restaurant_count: countByIndustry("restaurant"),
    barber_count: countByIndustry("barber"),
    determinism,
    variation,
  };

  writeArtifact("test-generation-results.json", {
    executedAt: new Date().toISOString(),
    matrix: MATRIX,
    results,
    summary,
    rendererNotes:
      "Los screenshots se renderizan por file:// usando public/template-builder.html; fuentes/iconos remotos pueden depender de CDN.",
    verdict:
      summary.total === 8 &&
      summary.pass === 8 &&
      summary.medical_count === 2 &&
      summary.legal_count === 2 &&
      summary.restaurant_count === 2 &&
      summary.barber_count === 2 &&
      determinism.sameConfig &&
      determinism.sameConfigHash &&
      Object.values(variation).every((value) => value.allDifferent)
        ? "PASS"
        : "FAIL",
  });

  expect(summary).toMatchObject({
    total: 8,
    pass: 8,
    fail: 0,
    medical_count: 2,
    legal_count: 2,
    restaurant_count: 2,
    barber_count: 2,
  });
  expect(determinism.sameConfig).toBe(true);
  expect(determinism.sameConfigHash).toBe(true);
  expect(Object.values(variation).every((value) => value.allDifferent)).toBe(true);
  for (const result of results as { file?: string; templateId: string; verdict: string; failureReasons: string[] }[]) {
    expect(result.verdict, `${result.templateId}: ${result.failureReasons.join("; ")}`).toBe("PASS");
  }
});
