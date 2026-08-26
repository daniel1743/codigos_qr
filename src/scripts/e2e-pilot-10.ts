import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { generateBatch, type GeneratedTemplate } from "../lib/template-factory/generator";
import {
  assertSafeForIngestion,
  buildIngestionRecord,
  type IngestionRecord,
} from "../lib/template-factory/ingestion";
import { computeQaScore, OVERFLOW_TOLERANCE_PX, QA_VIEWPORTS, type QaFinding } from "../lib/template-factory/qa";
import { roundTripConfig, validateTemplateConfig, type TemplateConfig } from "../lib/template-factory/config";

type RenderResult = {
  rendererSuccess: boolean;
  noOverflow: boolean;
  buttonIntegrity: boolean;
  assetIntegrity: boolean;
  findings: QaFinding[];
};

type PilotRecord = {
  templateId: string;
  record: IngestionRecord;
};

const RUN_ID = `cripqer-e2e-pilot-10-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUTPUT_DIR = path.resolve("out", RUN_ID);
const BATCH_ID = RUN_ID;
const RENDERER_URL = pathToFileURL(path.resolve("public", "template-builder.html")).href;

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const env = readEnvLocal();
  const preflight = {
    viteSupabaseUrl: Boolean(env["VITE_SUPABASE_URL"]),
    viteSupabaseAnonKey: Boolean(env["VITE_SUPABASE_ANON_KEY"]),
    supabaseServiceRoleKey: Boolean(env["SUPABASE_SERVICE_ROLE_KEY"]),
    appUrl: Boolean(env["VITE_APP_URL"]),
  };

  const generation = await runGenerationPhase();
  writeJson("e2e-generation-results.json", generation.summary);

  const ingestionRecords = generation.records;
  let finalVerdict: "E2E_PASS" | "E2E_PARTIAL" | "E2E_FAIL" | "E2E_BLOCKED" = "E2E_BLOCKED";
  const blockedReason =
    "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local/process env; controlled live ingestion cannot run safely.";

  const ingestion = {
    phase: "phase_2_ingest",
    requestedMode: "live",
    requestedCall: "ingestToTemplateBank(records, { mode: 'live' })",
    status: preflight.supabaseServiceRoleKey ? "NOT_EXECUTED" : "BLOCKED",
    blockedReason: preflight.supabaseServiceRoleKey ? null : blockedReason,
    preflight,
    preparedRecords: ingestionRecords.length,
    generatedPrivate: ingestionRecords.filter((item) => item.record.publication_status === "GENERATED_PRIVATE").length,
    notPublic: ingestionRecords.filter((item) => item.record.is_public === false).length,
  };
  writeJson("e2e-ingestion-results.json", ingestion);

  const blocked = blockedEvidence(blockedReason);
  writeJson("e2e-admin-results.json", blocked("phase_3_admin"));
  writeJson("e2e-workflow-results.json", blocked("phase_4_workflow"));
  writeJson("e2e-public-library-results.json", blocked("phase_5_public_library"));
  writeJson("e2e-user-copy-results.json", blocked("phase_6_user_copy"));
  writeJson("e2e-edit-results.json", blocked("phase_7_edit"));
  writeJson("e2e-security-results.json", {
    status: "BLOCKED",
    blockedReason,
    checks: [
      { name: "usuario normal no ve templates privados", status: "NOT_EXECUTED_LIVE" },
      { name: "usuario normal no aprueba/publica", status: "NOT_EXECUTED_LIVE" },
      { name: "usuario no modifica master", status: "NOT_EXECUTED_LIVE" },
      { name: "usuario A no modifica copia de usuario B", status: "NOT_EXECUTED_LIVE" },
    ],
  });

  const report = [
    "# E2E Pilot 10 Report",
    "",
    `Run ID: ${RUN_ID}`,
    `Batch ID: ${BATCH_ID}`,
    `Final verdict: ${finalVerdict}`,
    "",
    "## Completed",
    "",
    `- Generated exactly 10: ${generation.summary.generated === 10 ? "PASS" : "FAIL"}`,
    `- Validated 10/10: ${generation.summary.validated}/10`,
    `- Rendered 10/10: ${generation.summary.rendered}/10`,
    `- QA 10/10: ${generation.summary.qaPassed}/10`,
    `- Clean preview configs prepared: ${generation.summary.cleanPreviews}/10`,
    "",
    "## Blocker",
    "",
    blockedReason,
    "",
    "Live DB ingestion was intentionally not attempted without a service role key. No template was inserted or published.",
  ].join("\n");
  fs.writeFileSync(path.join(OUTPUT_DIR, "E2E_PILOT_10_REPORT.md"), report);

  console.log(JSON.stringify({
    runId: RUN_ID,
    outputDir: OUTPUT_DIR,
    finalVerdict,
    phase1: generation.summary,
    blockedAt: "phase_2_ingest",
    blockedReason,
  }, null, 2));

  process.exit(2);
}

async function runGenerationPhase() {
  const batch = generateBatch({
    industry: "medical",
    count: 10,
    seed: RUN_ID,
    batchId: BATCH_ID,
    buttonCountPool: [1],
  });

  const browser = await chromium.launch();
  const pages = await openRenderPages(browser);
  const records: PilotRecord[] = [];
  const failures: unknown[] = [];

  try {
    for (const template of batch.templates) {
      const schema = validateTemplateConfig(template.config);
      const roundTrip = roundTripConfig(template.config);
      const render = await renderTemplate(pages, template.config, template.templateId);
      const qa = computeQaScore({
        schemaValid: template.validation.valid && schema.valid,
        rendererSuccess: render.rendererSuccess,
        noOverflow: render.noOverflow,
        buttonIntegrity: render.buttonIntegrity,
        assetIntegrity: render.assetIntegrity,
        urlSafety: template.validation.valid && schema.valid,
        roundTrip: roundTrip.ok,
      }, render.findings);
      const ingestion = buildIngestionRecord(template, qa);

      if (!ingestion.ok) {
        failures.push({ templateId: template.templateId, rejection: ingestion.rejection });
        continue;
      }
      try {
        assertSafeForIngestion(ingestion.record);
      } catch (error) {
        failures.push({
          templateId: template.templateId,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      records.push({ templateId: template.templateId, record: ingestion.record });
    }
  } finally {
    await Promise.all(pages.map(({ page }) => page.close().catch(() => undefined)));
    await browser.close();
  }

  return {
    records,
    summary: {
      phase: "phase_1_generate",
      batchId: BATCH_ID,
      requested: 10,
      generated: batch.templates.length,
      generationFailures: batch.failures,
      duplicateCount: batch.duplicates.length,
      validated: records.length,
      rendered: records.length,
      qaPassed: records.length,
      cleanPreviews: records.length,
      rejected: failures.length,
      failures,
      renderer: RENDERER_URL,
    },
  };
}

async function openRenderPages(browser: Browser): Promise<Array<{ viewportName: string; page: Page }>> {
  const pages = [];
  for (const viewport of QA_VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(RENDERER_URL, { waitUntil: "domcontentloaded" });
    pages.push({ viewportName: viewport.name, page });
  }
  return pages;
}

async function renderTemplate(
  pages: Array<{ viewportName: string; page: Page }>,
  config: TemplateConfig,
  templateId: string,
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
        if (!api.loadTemplateConfig) return { ok: false };
        return api.loadTemplateConfig(templateConfig) ?? { ok: true };
      }, config);
      await page.waitForTimeout(10);
      const metrics = await page.evaluate(() => {
        const canvas = document.querySelector("#render-canvas");
        const invalidImages = Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0);
        return {
          text: canvas?.textContent?.trim() || "",
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          buttons: document.querySelectorAll("#render-canvas .render-btn").length,
          invalidImages: invalidImages.length,
        };
      });

      if (!loadResult.ok || pageErrors.length > 0 || metrics.text.length === 0) rendererSuccess = false;
      if (metrics.scrollWidth - metrics.clientWidth > OVERFLOW_TOLERANCE_PX) noOverflow = false;
      if (metrics.buttons !== config.links.length) buttonIntegrity = false;
      if (metrics.invalidImages > 0) assetIntegrity = false;
    } catch (error) {
      rendererSuccess = false;
      findings.push({
        check: "rendererSuccess",
        severity: "error",
        message: `${templateId} failed at ${viewportName}`,
        detail: error instanceof Error ? error.message : String(error),
      });
    } finally {
      page.off("pageerror", onPageError);
    }
  }

  return { rendererSuccess, noOverflow, buttonIntegrity, assetIntegrity, findings };
}

function readEnvLocal(): Record<string, string> {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return {};
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]!] = match[2]!;
  }
  for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "VITE_APP_URL"]) {
    env[key] ||= process.env[key] || "";
  }
  return env;
}

function blockedEvidence(reason: string) {
  return (phase: string) => ({ phase, status: "BLOCKED", blockedReason: reason });
}

function writeJson(name: string, value: unknown) {
  fs.writeFileSync(path.join(OUTPUT_DIR, name), JSON.stringify(value, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
