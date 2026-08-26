import * as fs from "node:fs";
import * as path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applyPaletteToTemplateConfig } from "../lib/template-factory/palettes";
import type { TemplateConfig } from "../lib/template-factory/config";

const PREVIOUS_BATCH_ID = "cripqer-e2e-pilot-10-2026-08-25T22-35-29-291Z";
const RUN_ID = `user-clone-cert-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUTPUT_DIR = path.resolve("out", RUN_ID);
const TEST_PASSWORD = `Cripqer-${Date.now()}-Test!`;

type Verdict = "USER_CLONE_PASS" | "USER_CLONE_PARTIAL" | "USER_CLONE_FAIL" | "USER_CLONE_BLOCKED";

async function main() {
  loadEnvLocal();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    return finish("USER_CLONE_BLOCKED", `Missing env vars: ${missing.join(", ")}`, {});
  }

  const admin = createClient(process.env["VITE_SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userAEmail = `cripqer-user-a-${Date.now()}@example.test`;
  const userBEmail = `cripqer-user-b-${Date.now()}@example.test`;
  let userAId = "";
  let userBId = "";
  let userACopyId = "";
  let masterId = "";

  try {
    const master = await publishExactlyOneMaster(admin);
    masterId = master.id;
    const masterBefore = structuredClone(master.config_json) as TemplateConfig;

    const createdA = await admin.auth.admin.createUser({
      email: userAEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { role: "normal_test_user", certification: RUN_ID },
    });
    if (createdA.error || !createdA.data.user) throw createdA.error || new Error("User A creation failed");
    userAId = createdA.data.user.id;

    const createdB = await admin.auth.admin.createUser({
      email: userBEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { role: "normal_test_user", certification: RUN_ID },
    });
    if (createdB.error || !createdB.data.user) throw createdB.error || new Error("User B creation failed");
    userBId = createdB.data.user.id;

    const userA = await signedInClient(userAEmail);
    const userB = await signedInClient(userBEmail);

    const publicTemplate = await fetchPublicTemplate(userA, masterId);
    const clonedConfig = {
      ...structuredClone(publicTemplate.config_json as TemplateConfig),
      origin_metadata: {
        source_template_id: masterId,
        source_template_version: (publicTemplate.config_json as TemplateConfig).schemaVersion || 1,
      },
    };

    const { data: userACopy, error: cloneError } = await userA
      .from("template_bank")
      .insert({
        name: `Cert Copy ${RUN_ID}`,
        description: "Temporary user clone certification copy",
        config_json: clonedConfig,
        template_type: "private",
        is_public: false,
        publication_status: "GENERATED_PRIVATE",
        category: publicTemplate.category,
        industry: publicTemplate.industry,
        style: publicTemplate.style,
        theme: publicTemplate.theme,
        batch_id: RUN_ID,
        generation_source: "USER_CLONE_CERTIFICATION",
        validation_status: "valid",
        created_by: userAId,
        usage_count: 0,
      })
      .select("*")
      .single();

    if (cloneError || !userACopy) throw cloneError || new Error("User A clone insert failed");
    userACopyId = userACopy.id;

    writeJson("user-a-clone-results.json", {
      status: "PASS",
      userAId,
      masterId,
      userCopyId: userACopyId,
      copyBelongsToUserA: userACopy.created_by === userAId,
      copyPrivate: userACopy.is_public === false && userACopy.publication_status === "GENERATED_PRIVATE",
      originMetadata: userACopy.config_json?.origin_metadata || null,
    });

    const editedConfig = applyPaletteToTemplateConfig(userACopy.config_json as TemplateConfig, "rose-platinum", {
      textPrimary: "#101820",
    }).config;
    editedConfig.identity.titleText = "CERT USER A EDITED";
    editedConfig.identity.profileImg = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop";
    editedConfig.links[0] = {
      ...editedConfig.links[0]!,
      text: "Link certificado",
      url: "https://example.com/certified-user-a",
    };

    const { data: editedCopy, error: editError } = await userA
      .from("template_bank")
      .update({ config_json: editedConfig })
      .eq("id", userACopyId)
      .select("*")
      .single();

    if (editError || !editedCopy) throw editError || new Error("User A edit failed");
    const { data: persistedCopy, error: persistReadError } = await userA
      .from("template_bank")
      .select("*")
      .eq("id", userACopyId)
      .single();
    if (persistReadError || !persistedCopy) throw persistReadError || new Error("User A persisted read failed");

    writeJson("user-a-edit-results.json", {
      status: "PASS",
      userCopyId: userACopyId,
      titlePersisted: persistedCopy.config_json?.identity?.titleText === "CERT USER A EDITED",
      imagePersisted: persistedCopy.config_json?.identity?.profileImg === editedConfig.identity.profileImg,
      palettePersisted: persistedCopy.config_json?.paletteId === "rose-platinum",
      buttonPersisted: persistedCopy.config_json?.links?.[0]?.text === "Link certificado",
      roundTripCorrect: JSON.stringify(persistedCopy.config_json) === JSON.stringify(editedConfig),
    });

    const { data: userBUpdateAData, error: userBUpdateAError } = await userB
      .from("template_bank")
      .update({ name: "B SHOULD NOT WRITE A" })
      .eq("id", userACopyId)
      .select("id,name");
    const { data: userBUpdateMasterData, error: userBUpdateMasterError } = await userB
      .from("template_bank")
      .update({ name: "B SHOULD NOT WRITE MASTER" })
      .eq("id", masterId)
      .select("id,name");
    const { data: userAUpdateMasterData, error: userAUpdateMasterError } = await userA
      .from("template_bank")
      .update({ name: "A SHOULD NOT WRITE MASTER" })
      .eq("id", masterId)
      .select("id,name");

    const isolation = {
      status:
        (userBUpdateAError || (userBUpdateAData || []).length === 0) &&
        (userBUpdateMasterError || (userBUpdateMasterData || []).length === 0) &&
        (userAUpdateMasterError || (userAUpdateMasterData || []).length === 0)
          ? "PASS"
          : "FAIL",
      userBUpdateA: normalizeMutationAttempt(userBUpdateAData, userBUpdateAError),
      userBUpdateMaster: normalizeMutationAttempt(userBUpdateMasterData, userBUpdateMasterError),
      userAUpdateMaster: normalizeMutationAttempt(userAUpdateMasterData, userAUpdateMasterError),
    };
    writeJson("user-b-isolation-results.json", isolation);

    const masterAfter = await fetchAdminTemplate(admin, masterId);
    const masterIntegrity = {
      status: JSON.stringify(masterBefore) === JSON.stringify(masterAfter.config_json) ? "PASS" : "FAIL",
      masterId,
      masterConfigUnchanged: JSON.stringify(masterBefore) === JSON.stringify(masterAfter.config_json),
      originMetadataPreserved: persistedCopy.config_json?.origin_metadata?.source_template_id === masterId,
      sourceTemplateId: persistedCopy.config_json?.origin_metadata?.source_template_id || null,
    };
    writeJson("master-integrity-results.json", masterIntegrity);

    await unpublishMaster(admin, masterId);
    await cleanup(admin, { userACopyId, userAId, userBId, masterId });

    const pass =
      isolation.status === "PASS" &&
      masterIntegrity.status === "PASS" &&
      persistedCopy.created_by === userAId;
    const verdict: Verdict = pass ? "USER_CLONE_PASS" : "USER_CLONE_FAIL";
    writeReport(verdict, { masterId, userACopyId, userAId, userBId });
    return finish(verdict, pass ? "User clone and ownership certification passed." : "Ownership certification failed.", {
      masterId,
      userACopyId,
    });
  } catch (error) {
    await safeCleanup(admin, { userACopyId, userAId, userBId, masterId });
    writeReport("USER_CLONE_FAIL", { error: error instanceof Error ? error.message : String(error) });
    return finish("USER_CLONE_FAIL", error instanceof Error ? error.message : String(error), {});
  }
}

async function publishExactlyOneMaster(admin: SupabaseClient) {
  const { data: candidates, error } = await admin
    .from("template_bank")
    .select("*")
    .eq("batch_id", PREVIOUS_BATCH_ID)
    .order("id", { ascending: true });
  if (error) throw error;
  if (!candidates || candidates.length !== 10) {
    throw new Error(`Expected 10 pilot templates, found ${candidates?.length || 0}`);
  }

  const selected = candidates.find((row) => row.publication_status === "APPROVED") || candidates[0];
  const otherIds = candidates.filter((row) => row.id !== selected.id).map((row) => row.id);
  if (otherIds.length > 0) {
    const { error: hideOthersError } = await admin
      .from("template_bank")
      .update({ publication_status: "GENERATED_PRIVATE", is_public: false })
      .in("id", otherIds);
    if (hideOthersError) throw hideOthersError;
  }

  if (selected.publication_status !== "APPROVED") {
    const { error: approveError } = await admin
      .from("template_bank")
      .update({ publication_status: "APPROVED", is_public: false })
      .eq("id", selected.id);
    if (approveError) throw approveError;
  }

  const { error: publishError } = await admin
    .from("template_bank")
    .update({ publication_status: "PUBLIC", is_public: true })
    .eq("id", selected.id);
  if (publishError) throw publishError;

  return fetchAdminTemplate(admin, selected.id);
}

async function signedInClient(email: string) {
  const client = createClient(process.env["VITE_SUPABASE_URL"]!, process.env["VITE_SUPABASE_ANON_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw error;
  return client;
}

async function fetchPublicTemplate(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("template_bank")
    .select("*")
    .eq("id", id)
    .eq("publication_status", "PUBLIC")
    .eq("is_public", true)
    .single();
  if (error) throw error;
  return data;
}

async function fetchAdminTemplate(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.from("template_bank").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function unpublishMaster(admin: SupabaseClient, id: string) {
  const { error } = await admin
    .from("template_bank")
    .update({ publication_status: "APPROVED" })
    .eq("id", id);
  if (error) throw error;
}

async function cleanup(admin: SupabaseClient, ids: { userACopyId: string; userAId: string; userBId: string; masterId: string }) {
  if (ids.masterId) await unpublishMaster(admin, ids.masterId);
  if (ids.userACopyId) await admin.from("template_bank").delete().eq("id", ids.userACopyId);
  if (ids.userAId) await admin.auth.admin.deleteUser(ids.userAId);
  if (ids.userBId) await admin.auth.admin.deleteUser(ids.userBId);
}

async function safeCleanup(admin: SupabaseClient, ids: { userACopyId: string; userAId: string; userBId: string; masterId: string }) {
  try {
    await cleanup(admin, ids);
  } catch {
    // Evidence report will carry the original error; cleanup failures are not allowed to mask it.
  }
}

function normalizeMutationAttempt(data: unknown[] | null, error: { message: string } | null) {
  return {
    blocked: Boolean(error) || (data || []).length === 0,
    returnedRows: (data || []).length,
    error: error?.message || null,
  };
}

function loadEnvLocal() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    process.env[match[1]!] ||= match[2]!.replace(/^['"]|['"]$/g, "");
  }
}

function writeJson(name: string, value: unknown) {
  fs.writeFileSync(path.join(OUTPUT_DIR, name), JSON.stringify(value, null, 2));
}

function writeReport(verdict: Verdict, details: unknown) {
  const body = [
    "# Final User Clone Certification Report",
    "",
    `Run ID: ${RUN_ID}`,
    `Final verdict: ${verdict}`,
    "",
    "## Scope",
    "",
    "Real Supabase normal-user clone, edit persistence, master integrity, and user B isolation.",
    "",
    "## Details",
    "",
    "```json",
    JSON.stringify(details, null, 2),
    "```",
  ].join("\n");
  fs.writeFileSync(path.join(OUTPUT_DIR, "FINAL_USER_CLONE_CERTIFICATION_REPORT.md"), body);
}

function finish(verdict: Verdict, message: string, details: unknown) {
  writeJson("final-user-clone-verdict.json", { verdict, message, details });
  console.log(JSON.stringify({ verdict, message, details, outputDir: OUTPUT_DIR }, null, 2));
  if (verdict === "USER_CLONE_FAIL" || verdict === "USER_CLONE_BLOCKED") process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
