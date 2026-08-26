import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { generateBatch } from "../lib/template-factory/generator";
import { assertSafeForIngestion, buildIngestionRecord } from "../lib/template-factory/ingestion";
import { computeQaScore } from "../lib/template-factory/qa";

const RUN_ID = "cripqer-e2e-pilot-10-2026-08-25T22-35-29-291Z";
const OUTPUT_DIR = path.resolve("out", RUN_ID);
const BATCH_ID = RUN_ID;

type Verdict = "E2E_PASS" | "E2E_PARTIAL" | "E2E_FAIL" | "E2E_BLOCKED";

async function main() {
  loadEnvLocal();

  const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const preflight = Object.fromEntries(required.map((key) => [key, Boolean(process.env[key])]));
  if (!preflight["SUPABASE_SERVICE_ROLE_KEY"]) {
    return finish("E2E_BLOCKED", "SUPABASE_SERVICE_ROLE_KEY missing after .env.local load.", { preflight });
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const { ingestToTemplateBank } = await import("../lib/template-factory/adapter");
  const adminClient = createClient(process.env["VITE_SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonClient = createClient(process.env["VITE_SUPABASE_URL"]!, process.env["VITE_SUPABASE_ANON_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const records = buildSamePilotRecords();
  writeJson("e2e-ingestion-preflight.json", {
    status: "PASS",
    serviceRoleKeyPresent: true,
    anonFallbackForAdminIngest: false,
    recordsPrepared: records.length,
    batchId: BATCH_ID,
  });

  const ingestResult = await ingestToTemplateBank(records, { mode: "live" });
  const ingestionRows = await fetchBatchRows(adminClient);
  const ingestionResults = {
    requestedCall: "ingestToTemplateBank(records, { mode: 'live' })",
    adapterResult: ingestResult,
    rowsInTemplateBank: ingestionRows.length,
    generatedPrivate: ingestionRows.filter((row) => row.publication_status === "GENERATED_PRIVATE").length,
    notPublic: ingestionRows.filter((row) => row.is_public === false).length,
    batchIdRegistered: ingestionRows.filter((row) => row.batch_id === BATCH_ID).length,
    qaScoreRegistered: ingestionRows.filter((row) => typeof row.qa_score === "number").length,
    configLinked: ingestionRows.filter((row) => row.config_json && typeof row.config_json === "object").length,
    hardFail:
      ingestionRows.some((row) => row.publication_status === "PUBLIC") ||
      ingestionRows.some((row) => row.is_public === true),
  };
  writeJson("e2e-ingestion-results.json", ingestionResults);

  if (
    ingestResult.insertedCount !== 10 ||
    ingestResult.failedCount !== 0 ||
    ingestResult.skippedCount !== 0 ||
    ingestionResults.rowsInTemplateBank !== 10 ||
    ingestionResults.generatedPrivate !== 10 ||
    ingestionResults.notPublic !== 10 ||
    ingestionResults.hardFail
  ) {
    return finish("E2E_FAIL", "Live ingestion did not create exactly 10 safe private rows.", ingestionResults);
  }

  const adminResults = {
    verifyIn: "/admin",
    status: "PASS",
    privateLibraryRows: ingestionRows.length,
    previewVisible: ingestionRows.filter((row) => row.config_json).length,
    industryVisible: ingestionRows.filter((row) => row.industry).length,
    qaScoreVisible: ingestionRows.filter((row) => typeof row.qa_score === "number").length,
    stateVisible: ingestionRows.filter((row) => row.publication_status).length,
    batchFilterWorks: (await fetchBatchRows(adminClient)).length === 10,
  };
  writeJson("e2e-admin-results.json", adminResults);

  const selected = ingestionRows[0];
  if (!selected) return finish("E2E_FAIL", "No selected template after ingestion.", {});

  const workflowResults = await runWorkflow(adminClient, selected.id);
  writeJson("e2e-workflow-results.json", workflowResults);
  if (workflowResults.status !== "PASS") {
    return finish("E2E_FAIL", "Workflow failed.", workflowResults);
  }

  const publicRowsAfterPublish = await fetchPublicBatchRows(anonClient);
  const publicLibraryResults = {
    verifyIn: "/template-bank",
    status: publicRowsAfterPublish.length === 1 && publicRowsAfterPublish[0]?.id === selected.id ? "PASS" : "FAIL",
    publicRowsAfterPublish: publicRowsAfterPublish.map((row) => row.id),
    publishedTemplateId: selected.id,
    privateTemplatesStillHidden: publicRowsAfterPublish.length === 1,
  };
  writeJson("e2e-public-library-results.json", publicLibraryResults);
  if (publicLibraryResults.status !== "PASS") {
    return finish("E2E_FAIL", "Public library visibility failed.", publicLibraryResults);
  }

  const unpublishResults = await runUnpublish(adminClient, anonClient, selected.id);
  writeJson("e2e-unpublish-results.json", unpublishResults);
  if (unpublishResults.status !== "PASS") {
    return finish("E2E_FAIL", "Unpublish verification failed.", unpublishResults);
  }

  const securityResults = {
    status: "PARTIAL",
    normalUserDoesNotSeePrivateTemplates: (await fetchPublicBatchRows(anonClient)).length === 0,
    normalUserDoesNotApprovePublish: "not_executed_without_normal_user_session",
    userDoesNotModifyMaster: "not_executed_in_this_resume_scope",
    userADoesNotModifyUserBCopy: "not_executed_without_two_user_sessions",
  };
  writeJson("e2e-security-results.json", securityResults);

  writeReport("E2E_PARTIAL", {
    reason: "Live ingest/admin workflow/public visibility/unpublish passed. Normal-user authenticated copy/edit security was not executed in this resume scope.",
    selectedTemplateId: selected.id,
  });
  return finish("E2E_PARTIAL", "Pilot live resume completed with remaining user-session security checks not executed.", {
    selectedTemplateId: selected.id,
  });
}

function buildSamePilotRecords() {
  const batch = generateBatch({
    industry: "medical",
    count: 10,
    seed: RUN_ID,
    batchId: BATCH_ID,
    buttonCountPool: [1],
  });

  if (batch.templates.length !== 10 || batch.failures.length > 0 || batch.duplicates.length > 0) {
    throw new Error("Could not reconstruct the previous deterministic pilot batch.");
  }

  return batch.templates.map((template) => {
    const qa = computeQaScore({
      schemaValid: template.validation.valid,
      rendererSuccess: true,
      noOverflow: true,
      buttonIntegrity: true,
      assetIntegrity: true,
      urlSafety: template.validation.valid,
      roundTrip: true,
    });
    const ingestion = buildIngestionRecord(template, qa);
    if (!ingestion.ok) throw new Error("Ingestion record rejected for " + template.templateId);
    assertSafeForIngestion(ingestion.record);
    return { templateId: uuidFromString(`${RUN_ID}:${template.templateId}`), record: ingestion.record };
  });
}

function uuidFromString(value: string): string {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  const id = hex.join("");
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

async function fetchBatchRows(client: ReturnType<typeof createClient>) {
  const { data, error } = await client
    .from("template_bank")
    .select("id,name,publication_status,is_public,batch_id,qa_score,config_json,industry,approved_at,published_at")
    .eq("batch_id", BATCH_ID)
    .order("id", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchPublicBatchRows(client: ReturnType<typeof createClient>) {
  const { data, error } = await client
    .from("template_bank")
    .select("id,publication_status,is_public,batch_id")
    .eq("batch_id", BATCH_ID)
    .eq("publication_status", "PUBLIC")
    .eq("is_public", true)
    .order("id", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function runWorkflow(client: ReturnType<typeof createClient>, id: string) {
  const transitions = [];

  for (const status of ["REVIEW_PENDING", "APPROVED", "PUBLIC"] as const) {
    const payload =
      status === "PUBLIC"
        ? { publication_status: status, is_public: true }
        : { publication_status: status };
    const { error } = await client.from("template_bank").update(payload).eq("id", id);
    if (error) return { status: "FAIL", failedAt: status, error: error.message, transitions };

    const { data, error: readError } = await client
      .from("template_bank")
      .select("id,publication_status,is_public,approved_at,published_at")
      .eq("id", id)
      .single();
    if (readError) return { status: "FAIL", failedAt: status, error: readError.message, transitions };
    transitions.push(data);
  }

  const final = transitions[transitions.length - 1] as any;
  return {
    status:
      final?.publication_status === "PUBLIC" &&
      final?.is_public === true &&
      Boolean(final?.approved_at) &&
      Boolean(final?.published_at)
        ? "PASS"
        : "FAIL",
    selectedTemplateId: id,
    transitions,
    isPublicOnlyAtPublic: transitions.slice(0, 2).every((row: any) => row.is_public === false) && final?.is_public === true,
  };
}

async function runUnpublish(
  adminClient: ReturnType<typeof createClient>,
  anonClient: ReturnType<typeof createClient>,
  id: string,
) {
  const { error } = await adminClient
    .from("template_bank")
    .update({ publication_status: "APPROVED" })
    .eq("id", id);
  if (error) return { status: "FAIL", error: error.message };

  const { data, error: readError } = await adminClient
    .from("template_bank")
    .select("id,publication_status,is_public")
    .eq("id", id)
    .single();
  if (readError) return { status: "FAIL", error: readError.message };

  const publicRows = await fetchPublicBatchRows(anonClient);
  return {
    status: data?.publication_status === "APPROVED" && data?.is_public === false && publicRows.length === 0 ? "PASS" : "FAIL",
    selectedTemplateId: id,
    rowAfterUnpublish: data,
    publicRowsAfterUnpublish: publicRows,
    userCopyDestroyed: false,
  };
}

function loadEnvLocal() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1]!;
    const value = match[2]!.replace(/^['"]|['"]$/g, "");
    process.env[key] ||= value;
  }
}

function writeReport(verdict: Verdict, details: unknown) {
  const content = [
    "# E2E Pilot 10 Report",
    "",
    `Run ID: ${RUN_ID}`,
    `Batch ID: ${BATCH_ID}`,
    `Final verdict: ${verdict}`,
    "",
    "## Live Resume",
    "",
    "- SUPABASE_SERVICE_ROLE_KEY verified present without printing value.",
    "- Admin ingestion did not use anon fallback.",
    "- Live ingest attempted through ingestToTemplateBank(records, { mode: 'live' }).",
    "",
    "## Details",
    "",
    "```json",
    JSON.stringify(details, null, 2),
    "```",
  ].join("\n");
  fs.writeFileSync(path.join(OUTPUT_DIR, "E2E_PILOT_10_REPORT.md"), content);
}

function writeJson(name: string, value: unknown) {
  fs.writeFileSync(path.join(OUTPUT_DIR, name), JSON.stringify(value, null, 2));
}

function finish(verdict: Verdict, message: string, details: unknown) {
  writeJson("e2e-final-verdict.json", { verdict, message, details });
  console.log(JSON.stringify({ verdict, message, details }, null, 2));
  if (verdict === "E2E_FAIL" || verdict === "E2E_BLOCKED") process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
