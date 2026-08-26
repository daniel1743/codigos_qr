/**
 * TF-F6-PASS-B-LIVE Certification Script
 * 
 * Execution Prerequisite:
 * MUST run with SUPABASE_SERVICE_ROLE_KEY and an authenticated Admin Session
 * locally or in a controlled environment.
 * 
 * Usage:
 * npx tsx src/scripts/f6-certify.ts
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "../lib/env";

async function runCertification() {
  console.log("=== STARTING TF-F6-PASS-B-LIVE CERTIFICATION ===");

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env?.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is required to run live DB certification.");
    process.exit(1);
  }

  const adminClient = createClient(env.supabaseUrl, serviceRoleKey);
  const anonClient = createClient(env.supabaseUrl, env.supabaseAnonKey);

  // Fixture constraint: count: 1, production: false, cleanup: mandatory
  const fixtureId = "f6-cert-" + Date.now();

  try {
    console.log("[1] Creating fixture template (GENERATED_PRIVATE)...");
    const { error: insertErr } = await adminClient.from("template_bank").insert({
      id: fixtureId,
      name: "F6 Cert Fixture",
      description: "Test template for live workflow verification",
      config_json: {},
      is_public: false,
      publication_status: "GENERATED_PRIVATE",
      template_type: "private",
    });

    if (insertErr) throw new Error("Insert failed: " + insertErr.message);
    console.log("    => SUCCESS (Authorized insert verified)");

    // RLS Verify: Anon cannot read private
    console.log("[2] Verifying anon RLS on private template...");
    const { data: anonRead } = await anonClient.from("template_bank").select("*").eq("id", fixtureId);
    if (anonRead && anonRead.length > 0) throw new Error("Anon could read private template!");
    console.log("    => SUCCESS (Public cannot read private)");

    // Workflow: GENERATED_PRIVATE -> REVIEW_PENDING
    console.log("[3] Workflow: GENERATED_PRIVATE -> REVIEW_PENDING...");
    let { error: w1Err } = await adminClient.from("template_bank")
      .update({ publication_status: "REVIEW_PENDING" })
      .eq("id", fixtureId);
    if (w1Err) throw w1Err;
    console.log("    => SUCCESS");

    // Workflow: REVIEW_PENDING -> APPROVED
    console.log("[4] Workflow: REVIEW_PENDING -> APPROVED...");
    let { error: w2Err } = await adminClient.from("template_bank")
      .update({ publication_status: "APPROVED" })
      .eq("id", fixtureId);
    if (w2Err) throw w2Err;
    console.log("    => SUCCESS");

    // Workflow: APPROVED -> PUBLIC
    console.log("[5] Workflow: APPROVED -> PUBLIC...");
    let { error: w3Err } = await adminClient.from("template_bank")
      .update({ publication_status: "PUBLIC", is_public: true })
      .eq("id", fixtureId);
    if (w3Err) throw w3Err;

    const { data: pCheck } = await adminClient.from("template_bank").select("is_public").eq("id", fixtureId).single();
    if (!pCheck?.is_public) throw new Error("PUBLIC state did not set is_public=true");
    console.log("    => SUCCESS (Public transition verified)");

    // RLS Verify: Anon CAN read public
    console.log("[6] Verifying anon RLS on public template...");
    const { data: anonReadPublic } = await anonClient.from("template_bank").select("*").eq("id", fixtureId);
    if (!anonReadPublic || anonReadPublic.length === 0) throw new Error("Anon could NOT read public template!");
    console.log("    => SUCCESS (Public can read actual PUBLIC)");

    // Workflow: PUBLIC -> APPROVED (Unpublish)
    console.log("[7] Workflow: PUBLIC -> APPROVED (Unpublish)...");
    let { error: w4Err } = await adminClient.from("template_bank")
      .update({ publication_status: "APPROVED" })
      .eq("id", fixtureId);
    if (w4Err) throw w4Err;

    const { data: unpCheck } = await adminClient.from("template_bank").select("is_public").eq("id", fixtureId).single();
    if (unpCheck?.is_public) throw new Error("Unpublish did NOT set is_public=false");
    console.log("    => SUCCESS (Unpublish removes public visibility)");

    // Reject Verify: GENERATED_PRIVATE -> PUBLIC
    console.log("[8] Workflow Safety: Reverting to GENERATED_PRIVATE and attempting direct PUBLIC jump...");
    // Force reset for test
    await adminClient.from("template_bank").update({ publication_status: "GENERATED_PRIVATE" }).eq("id", fixtureId);

    const { error: rejectErr } = await adminClient.from("template_bank")
      .update({ publication_status: "PUBLIC" })
      .eq("id", fixtureId);
    
    if (!rejectErr) throw new Error("System ALLOWED GENERATED_PRIVATE -> PUBLIC jump!");
    console.log("    => SUCCESS (Direct public transition correctly blocked by trigger)");

  } catch (err) {
    console.error("CERTIFICATION FAILED:", err);
  } finally {
    console.log("[9] Executing mandatory cleanup...");
    const { error: delErr } = await adminClient.from("template_bank").delete().eq("id", fixtureId);
    if (delErr) console.error("Cleanup failed:", delErr.message);
    else console.log("    => Cleanup complete.");
  }
}

runCertification().catch(console.error);
