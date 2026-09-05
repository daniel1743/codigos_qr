import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { readCanonicalPageEnvelope, type CanonicalPageEnvelopeV1 } from "@/lib/canonical-page";
import { canonicalPageService } from "@/services/canonical-page.service";
import { SIMPLE_CONTACT_FIXTURE, RICH_SERVICE_FIXTURE } from "../fixtures";
import { generateFromOnboardingIntentV2 } from "../engine-v2-generation";
import { persistOnboardingGeneratedPageV2 } from "../canonical-persistence";

const QA_PROFILE_SLUG = "qa-dual-editor-test";
const LIVE_QA_ENABLED = process.env.RUN_ONBOARDING_V2_LIVE_QA === "true";

function loadEnvFile(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => [match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]),
    );
  } catch {
    return {};
  }
}

function env(name: string): string | undefined {
  return process.env[name] || loadEnvFile()[name];
}

describe.skipIf(!LIVE_QA_ENABLED)("Onboarding V2 live canonical persistence QA", () => {
  it("persists simple and rich generated pages only for the dedicated QA profile", async () => {
    const supabaseUrl = env("VITE_SUPABASE_URL");
    const supabaseAnonKey = env("VITE_SUPABASE_ANON_KEY");
    const qaEmail = env("QA_EMAIL");
    const qaPassword = env("QA_PASSWORD");
    if (!supabaseUrl || !supabaseAnonKey || !qaEmail || !qaPassword) {
      throw new Error("Live QA requires local Supabase anon and QA authentication variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    let originalEditorConfig: CanonicalPageEnvelopeV1["editorConfig"] | null = null;

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: qaEmail,
        password: qaPassword,
      });
      if (authError || !authData.user?.id) {
        throw new Error(`Live QA authentication failed: ${authError?.message ?? "no user"}`);
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,user_id,slug,template_config")
        .eq("slug", QA_PROFILE_SLUG)
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile)
        throw new Error("Dedicated QA profile was not found for the authenticated user.");

      const original = readCanonicalPageEnvelope(profile.template_config);
      if (!original) throw new Error("Dedicated QA profile has no valid canonical envelope.");
      originalEditorConfig = original.editorConfig;

      const simpleGenerated = generateFromOnboardingIntentV2(SIMPLE_CONTACT_FIXTURE, {
        now: "2026-09-04T12:00:00.000Z",
      });
      expect(simpleGenerated.status).toBe("GENERATED");
      if (simpleGenerated.status !== "GENERATED") return;

      const simplePersisted = await persistOnboardingGeneratedPageV2({
        supabase,
        profileId: profile.id,
        intent: SIMPLE_CONTACT_FIXTURE,
        generatedResult: simpleGenerated,
      });
      expect(simplePersisted.status).toBe("PERSISTED");
      if (simplePersisted.status !== "PERSISTED") return;
      expect(simplePersisted.persisted.schemaVersion).toBe(1);
      expect(simplePersisted.verified.editorConfig).toEqual(simpleGenerated.editorConfig);

      const richGenerated = generateFromOnboardingIntentV2(RICH_SERVICE_FIXTURE, {
        now: "2026-09-04T12:01:00.000Z",
      });
      expect(richGenerated.status).toBe("GENERATED");
      if (richGenerated.status !== "GENERATED") return;

      const richPersisted = await persistOnboardingGeneratedPageV2({
        supabase,
        profileId: profile.id,
        intent: RICH_SERVICE_FIXTURE,
        generatedResult: richGenerated,
      });
      expect(richPersisted.status).toBe("PERSISTED");
      if (richPersisted.status !== "PERSISTED") return;
      expect(richPersisted.persisted.schemaVersion).toBe(1);
      expect(richPersisted.verified.editorConfig).toEqual(richGenerated.editorConfig);
    } finally {
      if (originalEditorConfig) {
        const { data: currentUser } = await supabase.auth.getUser();
        if (currentUser.user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("slug", QA_PROFILE_SLUG)
            .eq("user_id", currentUser.user.id)
            .maybeSingle();
          if (profile?.id) {
            await canonicalPageService.save(supabase, profile.id, originalEditorConfig);
          }
        }
      }
      await supabase.auth.signOut();
    }
  }, 120_000);
});
