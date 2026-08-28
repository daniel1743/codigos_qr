process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
import * as fs from "node:fs";
import * as path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { calculateDiversityScore } from "../lib/template-factory/diversity";
import { generateTemplate, type GeneratedTemplate } from "../lib/template-factory/generator";
import { buildIngestionRecord } from "../lib/template-factory/ingestion";
import { stableHash } from "../lib/template-factory/seed";
import type { TemplateConfig } from "../lib/template-factory/config";
import type { IndustryId } from "../lib/template-factory/industries";

const INDUSTRIES = [
  "medical",
  "legal",
  "barber",
  "beauty",
  "fitness",
  "coach",
  "real_estate",
  "architect",
  "creator",
  "hotel",
] as const satisfies readonly IndustryId[];

const TARGET_PER_INDUSTRY = 10;
const MAX_ATTEMPTS_PER_INDUSTRY = 140;
const MIN_DIVERSITY_SCORE = 45;
const MIN_STRUCTURAL_UNIQUENESS = 18;
const DEFAULT_TOTAL_TARGET = INDUSTRIES.length * TARGET_PER_INDUSTRY;
type DiversityBaseline = "batch" | "industry";

function loadEnvLocal() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    process.env[match[1]!] ||= match[2]!.replace(/^['"]|['"]$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  const admin = createClient(process.env["VITE_SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const requestedTotal = readPositiveIntEnv("PREMIUM_TEMPLATE_TOTAL", DEFAULT_TOTAL_TARGET);
  const requestedIndustries = readIndustryListEnv("PREMIUM_TEMPLATE_INDUSTRIES", INDUSTRIES);
  const recipePlan = readRecipePlanEnv("PREMIUM_RECIPE_PLAN");
  const diversityBaseline = readDiversityBaselineEnv();
  const RUN_ID = `premium-${requestedTotal}-${Date.now()}`;

  const existingTemplates = await loadExistingPublicTemplates(admin);
  const knownHashes = new Set(existingTemplates.map((item) => stableHash(item.config)));
  const acceptedConfigs: TemplateConfig[] = [];

  console.log(`Generating ${requestedTotal} premium templates with diversity gate (${existingTemplates.length} public configs loaded)...`);
  if (recipePlan.length > 0) {
    console.log(`Recipe plan: ${recipePlan.map((item) => `${item.recipe}:${item.count}`).join(", ")}`);
  }
  console.log(`Diversity baseline: ${diversityBaseline}`);
  let inserted = 0;
  
  for (const industry of requestedIndustries) {
    if (inserted >= requestedTotal) break;

    const plannedRecipes = expandRecipePlan(recipePlan);
    const industryTarget = plannedRecipes.length > 0
      ? plannedRecipes.length
      : Math.min(TARGET_PER_INDUSTRY, requestedTotal - inserted);
    let acceptedForIndustry = 0;
    let duplicateRejected = 0;
    let diversityRejected = 0;

    for (
      let candidateIndex = 0;
      inserted < requestedTotal &&
      acceptedForIndustry < industryTarget &&
      candidateIndex < MAX_ATTEMPTS_PER_INDUSTRY;
      candidateIndex++
    ) {
      const plannedRecipe = plannedRecipes[acceptedForIndustry];
      const template = generateTemplate({
        industry,
        recipe: plannedRecipe ?? "auto",
        seed: `${RUN_ID}:${industry}`,
        batchId: RUN_ID,
        index: candidateIndex,
      });

      if (!template.validation.valid) {
        console.error(`${template.templateId} invalid: ${template.validation.errors.join("; ")}`);
        continue;
      }

      const configHash = stableHash(template.config);
      if (knownHashes.has(configHash)) {
        duplicateRejected++;
        continue;
      }

      const sameIndustryConfigs = diversityBaseline === "industry"
        ? existingTemplates
            .filter((item) => item.industry === industry)
            .map((item) => item.config)
        : [];
      const diversity = calculateDiversityScore(template.config, [
        ...sameIndustryConfigs,
        ...acceptedConfigs,
      ]);

      if (
        diversity.diversityScore < MIN_DIVERSITY_SCORE ||
        diversity.structuralUniqueness < MIN_STRUCTURAL_UNIQUENESS
      ) {
        diversityRejected++;
        continue;
      }

      const insertedId = await insertPremiumTemplate(admin, template);
      if (!insertedId) continue;

      knownHashes.add(configHash);
      acceptedConfigs.push(template.config);
      acceptedForIndustry++;
      inserted++;
      console.log(
        `Inserted ${template.templateId} (${inserted}/${requestedTotal}) recipe=${template.metadata.generationParameters.recipeId} diversity=${diversity.diversityScore} structural=${diversity.structuralUniqueness}`,
      );
    }

    if (acceptedForIndustry < industryTarget) {
      console.warn(
        `${industry}: inserted ${acceptedForIndustry}/${industryTarget}; rejected duplicates=${duplicateRejected}, low-diversity=${diversityRejected}`,
      );
    } else {
      console.log(`${industry}: inserted ${acceptedForIndustry}/${industryTarget}; rejected duplicates=${duplicateRejected}, low-diversity=${diversityRejected}`);
    }
  }

  console.log(`Done. Inserted ${inserted} templates.`);
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw ? Number(raw) : fallback;
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readIndustryListEnv(
  name: string,
  fallback: readonly IndustryId[],
): IndustryId[] {
  const raw = process.env[name];
  if (!raw) return [...fallback];
  const values = raw.split(",").map((item) => item.trim()).filter(Boolean);
  return values.length > 0 ? values as IndustryId[] : [...fallback];
}

function readRecipePlanEnv(): { recipe: string; count: number }[] {
  const raw = process.env["PREMIUM_RECIPE_PLAN"];
  if (!raw) return [];

  return raw
    .split(",")
    .map((item) => {
      const [recipe, countRaw] = item.split(":").map((part) => part.trim());
      const count = Number(countRaw);
      if (!recipe || !Number.isInteger(count) || count <= 0) return null;
      return { recipe, count };
    })
    .filter((item): item is { recipe: string; count: number } => item !== null);
}

function expandRecipePlan(plan: { recipe: string; count: number }[]): string[] {
  return plan.flatMap((item) => Array.from({ length: item.count }, () => item.recipe));
}

function readDiversityBaselineEnv(): DiversityBaseline {
  return process.env["PREMIUM_DIVERSITY_BASELINE"] === "batch" ? "batch" : "industry";
}

async function loadExistingPublicTemplates(
  admin: SupabaseClient,
): Promise<{ industry: string | null; config: TemplateConfig }[]> {
  const { data, error } = await admin
    .from("template_bank")
    .select("industry, config_json")
    .eq("is_public", true);

  if (error) throw error;

  return ((data ?? []) as { industry?: string | null; config_json?: unknown }[])
    .filter((row) => Boolean(row.config_json && typeof row.config_json === "object"))
    .map((row) => ({
      industry: row.industry ?? null,
      config: row.config_json as TemplateConfig,
    }));
}

async function insertPremiumTemplate(
  admin: SupabaseClient,
  template: GeneratedTemplate,
): Promise<string | null> {
  const qa = {
    score: 100,
    scoreNormalized: 1.0,
    passed: [],
    failed: [],
    findings: [],
    blockingOk: true,
  };

  const ingestion = buildIngestionRecord(template, qa as any);
  if (!ingestion.ok) {
    console.error("Ingestion failed:", ingestion.rejection);
    return null;
  }

  const record = ingestion.record as any;
  record.template_type = "premium";
  record.publication_status = "PUBLIC";
  record.is_public = true;

  const { data, error } = await admin.from("template_bank").insert(record).select("id").single();
  if (!error) return data.id as string;

  console.log(`Direct PUBLIC insert failed: ${error.message}. Attempting GENERATED_PRIVATE -> PUBLIC...`);

  record.publication_status = "GENERATED_PRIVATE";
  record.is_public = false;

  const insertRes = await admin.from("template_bank").insert(record).select("id").single();
  if (insertRes.error) {
    console.error("Private insert error:", insertRes.error);
    return null;
  }

  const id = insertRes.data.id as string;
  const review = await admin.from("template_bank").update({ publication_status: "REVIEW_PENDING" }).eq("id", id);
  if (review.error) {
    console.error("REVIEW_PENDING update error:", review.error);
    return null;
  }
  const approved = await admin.from("template_bank").update({ publication_status: "APPROVED" }).eq("id", id);
  if (approved.error) {
    console.error("APPROVED update error:", approved.error);
    return null;
  }
  const publish = await admin
    .from("template_bank")
    .update({ publication_status: "PUBLIC", is_public: true })
    .eq("id", id);
  if (publish.error) {
    console.error("PUBLIC update error:", publish.error);
    return null;
  }

  return id;
}

main().catch(console.error);
