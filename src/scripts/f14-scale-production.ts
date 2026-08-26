import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import { generateBatch, type GeneratedTemplate } from "../lib/template-factory/generator";
import { INDUSTRY_IDS, type IndustryId } from "../lib/template-factory/industries";
import {
  assertSafeForIngestion,
  buildIngestionRecord,
  type IngestionRecord,
} from "../lib/template-factory/ingestion";
import {
  computeQaScore,
  OVERFLOW_TOLERANCE_PX,
  QA_VIEWPORTS,
  type QaFinding,
} from "../lib/template-factory/qa";
import { roundTripConfig, validateTemplateConfig, type TemplateConfig } from "../lib/template-factory/config";

type Candidate = {
  candidateId: string;
  sourceTemplateId: string;
  batchId: string;
  industry: IndustryId;
  configHash: string;
  qaScore: number;
  record: IngestionRecord;
};

type RenderResult = {
  rendererSuccess: boolean;
  noOverflow: boolean;
  buttonIntegrity: boolean;
  assetIntegrity: boolean;
  findings: QaFinding[];
};

const TARGET_CANDIDATES = 500;
const CONTROLLED_BATCH_SIZE = 100;
const BATCH_COUNT = TARGET_CANDIDATES / CONTROLLED_BATCH_SIZE;
const INDUSTRIES = INDUSTRY_IDS.slice(0, 10);
const PER_INDUSTRY_PER_BATCH = CONTROLLED_BATCH_SIZE / INDUSTRIES.length;
const RUN_ID = `tf-f14-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUTPUT_DIR = path.resolve("out", RUN_ID);
const RENDERER_URL = pathToFileURL(path.resolve("public", "template-builder.html")).href;

async function main() {
  if (CONTROLLED_BATCH_SIZE < 25 || CONTROLLED_BATCH_SIZE > 100) {
    throw new Error("Controlled batch size must stay between 25 and 100.");
  }
  if (TARGET_CANDIDATES > 1000) {
    throw new Error("Refusing uncontrolled large generation run.");
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const pages = await openRenderPages(browser);
  const candidates: Candidate[] = [];
  const failures: unknown[] = [];
  const seenHashes = new Map<string, string>();
  const duplicates: Array<{ candidateId: string; duplicateOfCandidateId: string; configHash: string }> = [];
  let rendererCrashes = 0;

  try {
    for (let batchIndex = 0; batchIndex < BATCH_COUNT; batchIndex += 1) {
      const batchId = `${RUN_ID}-b${String(batchIndex + 1).padStart(2, "0")}`;
      console.log(`F14 batch ${batchIndex + 1}/${BATCH_COUNT}: ${batchId}`);
      const batchCandidates: Candidate[] = [];

      for (const industry of INDUSTRIES) {
        const generated = generateBatch({
          industry,
          count: PER_INDUSTRY_PER_BATCH,
          seed: `${RUN_ID}:${batchId}:${industry}`,
          batchId,
          buttonCountPool: [1],
        });

        generated.failures.forEach((failure) => {
          failures.push({
            phase: "generation",
            batchId,
            industry,
            index: failure.index,
            errors: failure.errors,
          });
        });

        for (const template of generated.templates) {
          const candidateId = `${batchId}-${template.templateId}`;
          const duplicateOfCandidateId = seenHashes.get(template.configHash);
          if (duplicateOfCandidateId) {
            duplicates.push({
              candidateId,
              duplicateOfCandidateId,
              configHash: template.configHash,
            });
            continue;
          }
          seenHashes.set(template.configHash, candidateId);

          const candidate = await qualifyTemplate({
            candidateId,
            batchId,
            industry,
            template,
            pages,
          });
          rendererCrashes += candidate.rendererCrashes;
          if (candidate.ok) {
            batchCandidates.push(candidate.candidate);
          } else {
            failures.push(candidate.failure);
          }
        }
      }

      candidates.push(...batchCandidates);
      writeJson(path.join(OUTPUT_DIR, `${batchId}-private-records.json`), batchCandidates);
      writeJson(path.join(OUTPUT_DIR, `${batchId}-manifest.json`), buildBatchManifest(batchId, batchCandidates));
    }
  } finally {
    await Promise.all(pages.map(({ page }) => page.close().catch(() => undefined)));
    await browser.close();
  }

  const summary = buildSummary(candidates, failures, duplicates, rendererCrashes);
  writeJson(path.join(OUTPUT_DIR, "summary.json"), summary);
  writeJson(path.join(OUTPUT_DIR, "private-ingestion-records.json"), candidates);
  writeJson(path.join(OUTPUT_DIR, "failures.json"), failures);
  writeJson(path.join(OUTPUT_DIR, "duplicates.json"), duplicates);
  writeJson(path.join(OUTPUT_DIR, "monitor.json"), summary.monitor);

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.targets.privateCandidates || !summary.targets.controlledBatchSizes) {
    process.exit(1);
  }
}

async function qualifyTemplate(input: {
  candidateId: string;
  batchId: string;
  industry: IndustryId;
  template: GeneratedTemplate;
  pages: Array<{ viewportName: string; page: Page }>;
}): Promise<
  | { ok: true; candidate: Candidate; rendererCrashes: number }
  | { ok: false; failure: unknown; rendererCrashes: number }
> {
  const schema = validateTemplateConfig(input.template.config);
  const roundTrip = roundTripConfig(input.template.config);
  const render = await renderTemplate(input.pages, input.template.config, input.candidateId);
  const qa = computeQaScore(
    {
      schemaValid: input.template.validation.valid && schema.valid,
      rendererSuccess: render.rendererSuccess,
      noOverflow: render.noOverflow,
      buttonIntegrity: render.buttonIntegrity,
      assetIntegrity: render.assetIntegrity,
      urlSafety: input.template.validation.valid && schema.valid,
      roundTrip: roundTrip.ok,
    },
    [
      ...render.findings,
      ...schema.errors.map((message) => ({
        check: "schemaValid" as const,
        severity: "error" as const,
        message,
      })),
      ...roundTrip.differences.map((message) => ({
        check: "roundTrip" as const,
        severity: "warning" as const,
        message,
      })),
    ],
  );
  const rendererCrashes = render.rendererSuccess ? 0 : 1;
  const ingestion = buildIngestionRecord(input.template, qa);

  if (!ingestion.ok) {
    return {
      ok: false,
      rendererCrashes,
      failure: {
        phase: "private_ingestion",
        candidateId: input.candidateId,
        batchId: input.batchId,
        industry: input.industry,
        rejection: ingestion.rejection,
      },
    };
  }

  try {
    assertSafeForIngestion(ingestion.record);
  } catch (error) {
    return {
      ok: false,
      rendererCrashes,
      failure: {
        phase: "private_ingestion_safety",
        candidateId: input.candidateId,
        batchId: input.batchId,
        industry: input.industry,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }

  return {
    ok: true,
    rendererCrashes,
    candidate: {
      candidateId: input.candidateId,
      sourceTemplateId: input.template.templateId,
      batchId: input.batchId,
      industry: input.industry,
      configHash: input.template.configHash,
      qaScore: qa.scoreNormalized,
      record: ingestion.record,
    },
  };
}

function buildSummary(
  candidates: Candidate[],
  failures: unknown[],
  duplicates: unknown[],
  rendererCrashes: number,
) {
  const batchIds = Array.from(new Set(candidates.map((candidate) => candidate.batchId))).sort();
  const qaScores = candidates.map((candidate) => candidate.qaScore);
  const industryCounts = countBy(candidates.map((candidate) => candidate.industry));
  const batches = batchIds.map((batchId) => buildBatchManifest(batchId, candidates.filter((item) => item.batchId === batchId)));
  const accidentalPublication = candidates.filter(
    (candidate) => candidate.record.is_public || candidate.record.publication_status !== "GENERATED_PRIVATE",
  ).length;

  return {
    phaseId: "TF-F14-SCALE-PRODUCTION",
    runId: RUN_ID,
    requestedPrivateCandidates: TARGET_CANDIDATES,
    generatedPrivateCandidates: candidates.length,
    outputDir: OUTPUT_DIR,
    strategy: {
      controlledBatchSize: CONTROLLED_BATCH_SIZE,
      batchCount: BATCH_COUNT,
      industries: INDUSTRIES,
      automaticPublication: false,
      publicLibraryPrinciple: "curated, not everything generated",
    },
    batches,
    monitor: {
      duplicateRate: Number((duplicates.length / TARGET_CANDIDATES).toFixed(4)),
      failureRate: Number((failures.length / TARGET_CANDIDATES).toFixed(4)),
      rendererCrashes,
      qaDistribution: qaDistribution(qaScores),
      averageQaScore: average(qaScores),
      mostUsedIndustries: Object.entries(industryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([industry, count]) => ({ industry, count })),
      userTemplateAdoption: {
        status: "not_measured_in_local_generation",
        reason: "requires live usage_count / user clone telemetry after ingestion",
      },
      accidentalPublication,
    },
    targets: {
      privateCandidates: candidates.length === TARGET_CANDIDATES,
      controlledBatchSizes: batches.every(
        (batch) => batch.requestedQuantity >= 25 && batch.requestedQuantity <= 100,
      ),
      noUncontrolledThousands: TARGET_CANDIDATES <= 1000,
      accidentalPublication: accidentalPublication === 0,
    },
  };
}

function buildBatchManifest(batchId: string, candidates: Candidate[]) {
  const qaScores = candidates.map((candidate) => candidate.qaScore);
  return {
    id: batchId,
    generationDate: new Date().toISOString(),
    industries: Array.from(new Set(candidates.map((candidate) => candidate.industry))).sort(),
    requestedQuantity: CONTROLLED_BATCH_SIZE,
    generated: candidates.length,
    failed: CONTROLLED_BATCH_SIZE - candidates.length,
    approved: 0,
    rejected: 0,
    published: 0,
    averageQaScore: average(qaScores),
    generatorVersion: "generator-v1",
  };
}

async function openRenderPages(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const pages = [];
  for (const viewport of QA_VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    });
    await page.goto(RENDERER_URL, { waitUntil: "domcontentloaded" });
    pages.push({ viewportName: viewport.name, page });
  }
  return pages;
}

async function renderTemplate(
  pages: Array<{ viewportName: string; page: Page }>,
  config: TemplateConfig,
  candidateId: string,
): Promise<RenderResult> {
  const findings: QaFinding[] = [];
  let rendererSuccess = true;
  let noOverflow = true;
  let buttonIntegrity = true;
  let assetIntegrity = true;

  for (const { viewportName, page } of pages) {
    const pageErrors: string[] = [];
    const onPageError = (error: Error) => pageErrors.push(error.message);
    page.on("pageerror", onPageError);
    try {
      const loadResult = await page.evaluate((templateConfig) => {
        const api = window as typeof window & { loadTemplateConfig?: (config: unknown) => unknown };
        if (!api.loadTemplateConfig) return { ok: false, errors: ["loadTemplateConfig unavailable"] };
        return api.loadTemplateConfig(templateConfig) ?? { ok: true, errors: [] };
      }, config);
      await page.waitForTimeout(10);
      const metrics = await page.evaluate(() => {
        const canvas = document.querySelector("#render-canvas");
        const buttons = Array.from(document.querySelectorAll("#render-canvas .render-btn"));
        const invalidImages = Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0);
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          canvasText: canvas?.textContent?.trim() ?? "",
          buttons: buttons.length,
          invalidImages: invalidImages.length,
        };
      });

      if (!loadResult.ok || pageErrors.length > 0 || metrics.canvasText.length === 0) {
        rendererSuccess = false;
        findings.push({
          check: "rendererSuccess",
          severity: "error",
          message: `Renderer failed for ${candidateId} at ${viewportName}`,
          detail: JSON.stringify({ loadResult, pageErrors, canvasTextLength: metrics.canvasText.length }),
        });
      }
      if (metrics.scrollWidth - metrics.clientWidth > OVERFLOW_TOLERANCE_PX) {
        noOverflow = false;
        findings.push({
          check: "viewport",
          severity: "warning",
          message: `Horizontal overflow for ${candidateId} at ${viewportName}`,
        });
      }
      if (metrics.buttons !== config.links.length) {
        buttonIntegrity = false;
        findings.push({
          check: "buttonIntegrity",
          severity: "warning",
          message: `Button count mismatch for ${candidateId} at ${viewportName}`,
        });
      }
      if (metrics.invalidImages > 0) {
        assetIntegrity = false;
        findings.push({
          check: "assetIntegrity",
          severity: "warning",
          message: `Invalid image assets for ${candidateId} at ${viewportName}`,
        });
      }
    } catch (error) {
      rendererSuccess = false;
      findings.push({
        check: "rendererSuccess",
        severity: "error",
        message: `Renderer crashed for ${candidateId} at ${viewportName}`,
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      page.off("pageerror", onPageError);
    }
  }

  return { rendererSuccess, noOverflow, buttonIntegrity, assetIntegrity, findings };
}

function qaDistribution(scores: number[]) {
  return {
    "0.95-1.00": scores.filter((score) => score >= 0.95).length,
    "0.90-0.94": scores.filter((score) => score >= 0.9 && score < 0.95).length,
    "0.85-0.89": scores.filter((score) => score >= 0.85 && score < 0.9).length,
    "below-0.85": scores.filter((score) => score < 0.85).length,
  };
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
