import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createTemplatePack, fingerprint } from "./power-editor-template-factory.mjs";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "POWER_EDITOR_TEMPLATE_OWNER_ID"];

export function buildSyncPlan(pack = createTemplatePack()) {
  return pack.templates.map((template) => ({
    blueprintKey: template.id,
    name: template.name,
    fingerprint: createHash("sha256").update(fingerprint(template)).digest("hex"),
    category: template.category,
    archetype: template.archetype,
    pageConfig: template.page_config,
  }));
}

function configurationError() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Faltan variables requeridas: ${missing.join(", ")}.`);
}

function client() {
  configurationError();
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function readBlueprints(supabase, keys) {
  const { data, error } = await supabase
    .from("power_editor_template_blueprints")
    .select("blueprint_key, template_id, content_fingerprint")
    .in("blueprint_key", keys);
  if (error) throw error;
  return new Map((data ?? []).map((item) => [item.blueprint_key, item]));
}

async function readTemplateStatus(supabase, templateId) {
  const { data, error } = await supabase
    .from("power_editor_templates")
    .select("id, status")
    .eq("id", templateId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function applyPlan(supabase, plan) {
  const pack = createTemplatePack();
  const generatorVersion = pack.generatorVersion ?? "diversity-v2";
  const known = await readBlueprints(
    supabase,
    plan.map((item) => item.blueprintKey),
  );
  const result = { created: [], updated: [], skippedPublished: [], unchanged: [] };
  for (const item of plan) {
    const existing = known.get(item.blueprintKey);
    if (existing?.content_fingerprint === item.fingerprint) {
      result.unchanged.push(item.blueprintKey);
      continue;
    }
    if (existing?.template_id) {
      const target = await readTemplateStatus(supabase, existing.template_id);
      if (target?.status === "published") {
        result.skippedPublished.push(item.blueprintKey);
        continue;
      }
      const { error } = await supabase
        .from("power_editor_templates")
        .update({ name: item.name, page_config: item.pageConfig })
        .eq("id", existing.template_id);
      if (error) throw error;
      const { error: blueprintError } = await supabase
        .from("power_editor_template_blueprints")
        .update({
          content_fingerprint: item.fingerprint,
          category: item.category,
          archetype: item.archetype,
          generator_version: generatorVersion,
        })
        .eq("blueprint_key", item.blueprintKey);
      if (blueprintError) throw blueprintError;
      result.updated.push(item.blueprintKey);
      continue;
    }
    const { data: created, error: createError } = await supabase
      .from("power_editor_templates")
      .insert({
        owner_user_id: process.env.POWER_EDITOR_TEMPLATE_OWNER_ID,
        name: item.name,
        status: "draft",
        page_config: item.pageConfig,
      })
      .select("id")
      .single();
    if (createError) throw createError;
    const { error: blueprintError } = await supabase
      .from("power_editor_template_blueprints")
      .insert({
        blueprint_key: item.blueprintKey,
        template_id: created.id,
        content_fingerprint: item.fingerprint,
        category: item.category,
        archetype: item.archetype,
        generator_version: generatorVersion,
      });
    if (blueprintError) throw blueprintError;
    result.created.push(item.blueprintKey);
  }
  const { error: runError } = await supabase.from("power_editor_template_generation_runs").insert({
    generator_version: generatorVersion,
    seed: pack.seed,
    template_count: plan.length,
    audit: { ...pack.audit, result },
  });
  if (runError) throw runError;
  return result;
}

async function main() {
  const plan = buildSyncPlan();
  const apply = process.argv.includes("--apply");
  const confirmed = process.env.POWER_EDITOR_TEMPLATE_SYNC_CONFIRM === "I_UNDERSTAND";
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          templateCount: plan.length,
          blueprints: plan.map((item) => ({
            blueprintKey: item.blueprintKey,
            name: item.name,
            category: item.category,
            fingerprint: item.fingerprint,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!confirmed)
    throw new Error("La escritura requiere POWER_EDITOR_TEMPLATE_SYNC_CONFIRM=I_UNDERSTAND.");
  const result = await applyPlan(client(), plan);
  console.log(JSON.stringify({ mode: "applied", ...result }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
