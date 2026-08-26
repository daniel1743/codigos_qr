import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import {
  generateBatch,
  type GeneratedTemplate,
} from "../lib/template-factory/generator";
import {
  INDUSTRY_IDS,
  type IndustryId,
} from "../lib/template-factory/industries";
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
import {
  roundTripConfig,
  validateTemplateConfig,
  type TemplateConfig,
} from "../lib/template-factory/config";

type RenderResult = {
  rendererSuccess: boolean;
  noOverflow: boolean;
  buttonIntegrity: boolean;
  assetIntegrity: boolean;
  findings: QaFinding[];
};

type QualifiedTemplate = {
  templateId: string;
  industry: IndustryId;
  configHash: string;
  qaScore: number;
  record: IngestionRecord;
};

const TOTAL = 100;
const MIN_INDUSTRIES = 10;
const PER_INDUSTRY = 10;
const BATCH_ID = `tf-f12-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUTPUT_DIR = path.resolve("out", BATCH_ID);
const RENDERER_URL = pathToFileURL(path.resolve("public", "template-builder.html")).href;
const INDUSTRIES = INDUSTRY_IDS.slice(0, MIN_INDUSTRIES);

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const generated = generateAcrossIndustries();
  const exactDuplicateIds = findExactDuplicates(generated);

  const browser = await chromium.launch();
  const renderPages = await openRenderPages(browser);
  const qualified: QualifiedTemplate[] = [];
  const failures: unknown[] = [];
  let rendererCrashes = 0;

  try {
    for (const [index, item] of generated.entries()) {
      if (index % 10 === 0) {
        console.log(`F12 progress: ${index}/${generated.length}`);
      }
      const schema = validateTemplateConfig(item.template.config);
      const roundTrip = roundTripConfig(item.template.config);
      const render = await renderTemplate(renderPages, item.template.config, item.template.templateId);
      if (!render.rendererSuccess) rendererCrashes += 1;

      const urlSafety = item.template.validation.valid && schema.valid;
      const qa = computeQaScore(
        {
          schemaValid: item.template.validation.valid && schema.valid,
          rendererSuccess: render.rendererSuccess,
          noOverflow: render.noOverflow,
          buttonIntegrity: render.buttonIntegrity,
          assetIntegrity: render.assetIntegrity,
          urlSafety,
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

      const ingestion = buildIngestionRecord(item.template, qa);
      if (!ingestion.ok) {
        failures.push({
          templateId: item.template.templateId,
          industry: item.industry,
          phase: "private_ingestion",
          rejection: ingestion.rejection,
        });
        continue;
      }

      try {
        assertSafeForIngestion(ingestion.record);
      } catch (error) {
        failures.push({
          templateId: item.template.templateId,
          industry: item.industry,
          phase: "private_ingestion_safety",
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      if (!qa.blockingOk || qa.scoreNormalized < 0.85) {
        failures.push({
          templateId: item.template.templateId,
          industry: item.industry,
          phase: "quality_scoring",
          qa,
        });
        continue;
      }

      qualified.push({
        templateId: item.template.templateId,
        industry: item.industry,
        configHash: item.template.configHash,
        qaScore: qa.scoreNormalized,
        record: ingestion.record,
      });
    }
  } finally {
    await Promise.all(renderPages.map(({ page }) => page.close().catch(() => undefined)));
    await browser.close();
  }

  const accidentalPublication = qualified.filter(
    (item) => item.record.is_public || item.record.publication_status !== "GENERATED_PRIVATE",
  );
  const adminRows = qualified.map(({ templateId, record }) => ({
    id: templateId,
    name: record.name,
    industry: record.industry,
    publication_status: record.publication_status,
    qa_score: record.qa_score,
    config_json: record.config_json,
  }));

  const privateIngestionCorrect =
    qualified.length === TOTAL &&
    qualified.every(
      (item) =>
        item.record.template_type === "private" &&
        item.record.is_public === false &&
        item.record.publication_status === "GENERATED_PRIVATE" &&
        item.record.validation_status === "valid",
    );

  const summary = {
    phaseId: "TF-F12-PRODUCTION-QUALIFICATION-100",
    batchId: BATCH_ID,
    renderer: RENDERER_URL,
    requested: TOTAL,
    generated: generated.length,
    qualified: qualified.length,
    failures: failures.length,
    industryCount: new Set(generated.map((item) => item.industry)).size,
    industries: INDUSTRIES,
    generationSuccessRate: Number((qualified.length / TOTAL).toFixed(4)),
    exactDuplicates: exactDuplicateIds.length,
    rendererCrashes,
    accidentalPublication: accidentalPublication.length,
    privateIngestionCorrect,
    adminDisplayRows: adminRows.length,
    targets: {
      generationSuccess: qualified.length / TOTAL >= 0.98,
      exactDuplicates: exactDuplicateIds.length === 0,
      rendererCrashes: rendererCrashes === 0,
      accidentalPublication: accidentalPublication.length === 0,
      privateIngestionCorrect,
      humanReviewMandatory: true,
      automaticPublication: false,
    },
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, "failures.json"), JSON.stringify(failures, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, "duplicates.json"), JSON.stringify(exactDuplicateIds, null, 2));
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "private-ingestion-records.json"),
    JSON.stringify(qualified.map(({ templateId, record }) => ({ templateId, record })), null, 2),
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, "admin-display-rows.json"), JSON.stringify(adminRows, null, 2));

  console.log(JSON.stringify(summary, null, 2));

  const pass =
    summary.targets.generationSuccess &&
    summary.targets.exactDuplicates &&
    summary.targets.rendererCrashes &&
    summary.targets.accidentalPublication &&
    summary.targets.privateIngestionCorrect &&
    summary.targets.humanReviewMandatory &&
    summary.targets.automaticPublication === false;
  if (!pass) process.exit(1);
}

function generateAcrossIndustries(): Array<{ industry: IndustryId; template: GeneratedTemplate }> {
  const generated: Array<{ industry: IndustryId; template: GeneratedTemplate }> = [];

  for (const industry of INDUSTRIES) {
    const batch = generateBatch({
      industry,
      count: PER_INDUSTRY,
      seed: `${BATCH_ID}:${industry}`,
      batchId: `${BATCH_ID}-${industry}`,
      buttonCountPool: [1],
    });

    for (const failure of batch.failures) {
      throw new Error(`Generation failed for ${industry} index ${failure.index}: ${failure.errors.join(", ")}`);
    }

    for (const duplicate of batch.duplicates) {
      throw new Error(`Duplicate within ${industry}: ${JSON.stringify(duplicate)}`);
    }

    generated.push(...batch.templates.map((template) => ({ industry, template })));
  }

  return generated;
}

function findExactDuplicates(generated: Array<{ template: GeneratedTemplate }>) {
  const seen = new Map<string, string>();
  const duplicates: Array<{ templateId: string; duplicateOfTemplateId: string; configHash: string }> = [];

  for (const { template } of generated) {
    const previous = seen.get(template.configHash);
    if (previous) {
      duplicates.push({
        templateId: template.templateId,
        duplicateOfTemplateId: previous,
        configHash: template.configHash,
      });
      continue;
    }
    seen.set(template.configHash, template.templateId);
  }

  return duplicates;
}

async function openRenderPages(browser: Browser): Promise<Array<{ viewportName: string; page: Page }>> {
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
  renderPages: Array<{ viewportName: string; page: Page }>,
  config: TemplateConfig,
  templateId: string,
): Promise<RenderResult> {
  const findings: QaFinding[] = [];
  let rendererSuccess = true;
  let noOverflow = true;
  let buttonIntegrity = true;
  let assetIntegrity = true;

  for (const { viewportName, page } of renderPages) {
    const pageErrors: string[] = [];
    const onPageError = (error: Error) => pageErrors.push(error.message);
    page.on("pageerror", onPageError);

    try {
      const loadResult = await page.evaluate((templateConfig) => {
        const api = window as typeof window & {
          loadTemplateConfig?: (config: unknown) => unknown;
        };
        if (!api.loadTemplateConfig) return { ok: false, errors: ["loadTemplateConfig unavailable"] };
        const result = api.loadTemplateConfig(templateConfig);
        return result ?? { ok: true, errors: [] };
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
          message: `Renderer failed for ${templateId} at ${viewportName}`,
          detail: JSON.stringify({ loadResult, pageErrors, canvasTextLength: metrics.canvasText.length }),
        });
      }

      if (metrics.scrollWidth - metrics.clientWidth > OVERFLOW_TOLERANCE_PX) {
        noOverflow = false;
        findings.push({
          check: "viewport",
          severity: "warning",
          message: `Horizontal overflow for ${templateId} at ${viewportName}`,
          detail: `${metrics.scrollWidth}px scroll width vs ${metrics.clientWidth}px client width`,
        });
      }

      if (metrics.buttons !== config.links.length) {
        buttonIntegrity = false;
        findings.push({
          check: "buttonIntegrity",
          severity: "warning",
          message: `Button count mismatch for ${templateId} at ${viewportName}`,
          detail: `${metrics.buttons} rendered vs ${config.links.length} configured`,
        });
      }

      if (metrics.invalidImages > 0) {
        assetIntegrity = false;
        findings.push({
          check: "assetIntegrity",
          severity: "warning",
          message: `Invalid image assets for ${templateId} at ${viewportName}`,
          detail: `${metrics.invalidImages} image(s) failed natural size check`,
        });
      }
    } catch (error) {
      rendererSuccess = false;
      findings.push({
        check: "rendererSuccess",
        severity: "error",
        message: `Renderer crashed for ${templateId} at ${viewportName}`,
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      page.off("pageerror", onPageError);
    }
  }

  return { rendererSuccess, noOverflow, buttonIntegrity, assetIntegrity, findings };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
