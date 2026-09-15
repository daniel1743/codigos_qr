import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { createBlankPageConfig } from "../../components/power-editor/blankPageConfig";
import { validateTemplate } from "../../premium-template-studio/engine/TemplateValidator";
import { pageCanonicalService } from "../page-canonical.service";

/**
 * PAGES_3B — CONTROLLED LIVE REPAIR of the invalid published child page
 * `yfLEdka` (Promo septiembre).
 *
 * Repairs through the normal Page canonical service path
 * (`pageCanonicalService.saveDraft` + `pageCanonicalService.publish`), never an
 * ad-hoc direct UPDATE. Guarded by `RUN_P3B_REPAIR=true` so it is inert in
 * normal CI runs.
 */

const RUN_ENABLED = process.env.RUN_P3B_REPAIR === "true";

const PAGE_ID = "9a02efa0-f6de-4bf3-930f-edbed88c3e1e";
const OWNER_USER_ID = "8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165";
const PUBLIC_ID = "yfLEdka";
const EXPECTED_REVISION_BEFORE = 2;
const EXPECTED_REVISION_AFTER = 3;

function loadEnvFile(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/))
        .filter((m): m is RegExpMatchArray => Boolean(m))
        .map((m) => [m[1]!, m[2]!.trim().replace(/^['"]|['"]$/g, "")]),
    );
  } catch {
    return {};
  }
}

function env(name: string): string | undefined {
  return process.env[name] || loadEnvFile()[name];
}

describe.skipIf(!RUN_ENABLED)("PAGES_3B controlled yfLEdka repair", () => {
  it("repairs template_config and published_template_config through the canonical service", async () => {
    const supabaseUrl = env("VITE_SUPABASE_URL");
    const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) {
      throw new Error("Repair requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    // 1. Read and verify identity before mutating (Phase 6 STOP conditions).
    const { data: before, error: readError } = await supabase
      .from("pages")
      .select("*")
      .eq("public_id", PUBLIC_ID)
      .single();
    if (readError) throw readError;
    if (!before || before.id !== PAGE_ID) throw new Error("Page identity differs — STOP.");
    if (before.published_revision !== EXPECTED_REVISION_BEFORE) {
      throw new Error(
        `Concurrent change detected: expected revision ${EXPECTED_REVISION_BEFORE}, got ${before.published_revision}.`,
      );
    }

    // 2. Build the valid canonical document from the authoritative blank factory.
    const config = createBlankPageConfig("Promo septiembre", "promotion");
    const validation = validateTemplate(config);
    expect(validation.valid).toBe(true);

    // 3. Repair draft + published through the normal service path.
    await pageCanonicalService.saveDraft(supabase, PAGE_ID, OWNER_USER_ID, config);
    const published = await pageCanonicalService.publish(
      supabase,
      PAGE_ID,
      OWNER_USER_ID,
      config,
      EXPECTED_REVISION_BEFORE,
    );

    expect(published.published).toBe(true);
    expect(published.published_revision).toBe(EXPECTED_REVISION_AFTER);

    // 4. Verify the repaired database state (Phase 8).
    const { data: after, error: afterError } = await supabase
      .from("pages")
      .select("*")
      .eq("public_id", PUBLIC_ID)
      .single();
    if (afterError) throw afterError;

    expect(after.published).toBe(true);
    expect(after.published_revision).toBe(EXPECTED_REVISION_AFTER);

    const draftEditor = after.template_config?.editorConfig;
    const publishedEditor = after.published_template_config?.editorConfig;
    expect(draftEditor?.theme?.colors).toBeTruthy();
    expect(draftEditor?.theme?.typography).toBeTruthy();
    expect(draftEditor?.layout?.responsive).toBeTruthy();
    expect(Array.isArray(draftEditor?.blocks)).toBe(true);
    expect(publishedEditor?.theme?.colors).toBeTruthy();
    expect(publishedEditor?.theme?.typography).toBeTruthy();
    expect(publishedEditor?.layout?.responsive).toBeTruthy();
    expect(Array.isArray(publishedEditor?.blocks)).toBe(true);

    // Identity fields unchanged.
    expect(after.id).toBe(PAGE_ID);
    expect(after.public_id).toBe(PUBLIC_ID);
    expect(after.owner_user_id).toBe(OWNER_USER_ID);
    expect(after.profile_id).toBe("ff0cd302-07a4-4106-9a13-a14f9ded2f4b");
    expect(after.title).toBe("Promo septiembre");
    expect(after.page_type).toBe("promotion");
  }, 120_000);
});
