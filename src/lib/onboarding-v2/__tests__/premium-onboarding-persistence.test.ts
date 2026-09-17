import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { generateFromOnboardingIntentV2 } from "../engine-v2-generation";
import { RICH_SERVICE_FIXTURE } from "../fixtures";
import { persistPremiumOnboardingGeneratedPage } from "../premium-onboarding-persistence";

const USER_ID = "user-premium";
const PROFILE_ID = "11111111-1111-4111-8111-111111111111";

type Row = Record<string, unknown>;

function fakeSupabase(
  options: {
    user?: { id: string } | null;
    profile?: { id: string; user_id: string } | null;
    invitePatchFails?: boolean;
  } = {},
) {
  const pages: Row[] = [];
  let sequence = 0;
  const user = options.user === undefined ? { id: USER_ID } : options.user;
  const profile =
    options.profile === undefined ? { id: PROFILE_ID, user_id: USER_ID } : options.profile;

  function table(name: string) {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const api: Record<string, unknown> = {};
    const record = (method: string, ...args: unknown[]) => {
      calls.push({ method, args });
      return api;
    };
    const matches = (rows: Row[]) =>
      rows.find((row) =>
        calls
          .filter((call) => call.method === "eq")
          .every((call) => row[call.args[0] as string] === call.args[1]),
      ) ?? null;
    const terminal = () => {
      if (name === "profiles") return { data: profile, error: null };
      const insert = calls.find((call) => call.method === "insert");
      const update = calls.find((call) => call.method === "update");
      if (insert) {
        sequence += 1;
        const row: Row = {
          id: `page-${sequence}`,
          public_id: `public-${sequence}`,
          title: "Página premium",
          page_type: "services",
          template_config: null,
          published: false,
          published_revision: 0,
          ...((insert.args[0] as Row) ?? {}),
        };
        pages.push(row);
        return { data: row, error: null };
      }
      if (update) {
        const row = matches(pages);
        if (!row) return { data: null, error: null };
        Object.assign(row, (update.args[0] as Row) ?? {});
        return { data: row, error: null };
      }
      return { data: matches(pages), error: null };
    };
    api["select"] = (...args: unknown[]) => record("select", ...args);
    api["insert"] = (value: unknown) => record("insert", value);
    api["update"] = (value: unknown) => record("update", value);
    api["eq"] = (column: string, value: unknown) => record("eq", column, value);
    api["maybeSingle"] = () => Promise.resolve(terminal());
    api["single"] = () => Promise.resolve(terminal());
    return api;
  }

  return {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (name: string) => table(name),
    rpc: async (name: string) =>
      options.invitePatchFails
        ? { data: null, error: new Error(`RPC failed: ${name}`) }
        : { data: { id: PROFILE_ID }, error: null },
    pages,
  } as unknown as SupabaseClient & { pages: Row[] };
}

function generatedFixture() {
  const result = generateFromOnboardingIntentV2(RICH_SERVICE_FIXTURE, {
    now: "2026-09-15T12:00:00.000Z",
  });
  if (result.status !== "GENERATED") throw new Error(result.errors.join(" "));
  return result;
}

describe("Premium onboarding canonical persistence", () => {
  it("rejects unauthenticated callers before creating a child page", async () => {
    const generated = generatedFixture();
    const supabase = fakeSupabase({ user: null });
    const result = await persistPremiumOnboardingGeneratedPage({
      supabase,
      profileId: PROFILE_ID,
      editorConfig: generated.editorConfig,
      title: "Página premium",
      pageType: "services",
      generation: generated.generationMetadata,
    });
    expect(result).toMatchObject({ status: "FAILED", code: "AUTH_REQUIRED" });
    expect(supabase.pages).toHaveLength(0);
  });

  it("rejects missing and foreign profiles without creating a page", async () => {
    const generated = generatedFixture();
    const missing = await persistPremiumOnboardingGeneratedPage({
      supabase: fakeSupabase({ profile: null }),
      profileId: PROFILE_ID,
      editorConfig: generated.editorConfig,
      title: "Página premium",
      pageType: "services",
      generation: generated.generationMetadata,
    });
    expect(missing).toMatchObject({ status: "FAILED", code: "PROFILE_NOT_FOUND" });

    const foreign = await persistPremiumOnboardingGeneratedPage({
      supabase: fakeSupabase({ profile: { id: PROFILE_ID, user_id: "other-user" } }),
      profileId: PROFILE_ID,
      editorConfig: generated.editorConfig,
      title: "Página premium",
      pageType: "services",
      generation: generated.generationMetadata,
    });
    expect(foreign).toMatchObject({ status: "FAILED", code: "FORBIDDEN" });
  });

  it("rejects invalid canonical input before the page authority is called", async () => {
    const supabase = fakeSupabase();
    const result = await persistPremiumOnboardingGeneratedPage({
      supabase,
      profileId: PROFILE_ID,
      editorConfig: {} as never,
      title: "Página premium",
      pageType: "services",
      generation: { candidateId: "test", score: 1, family: "minimal", layout: "compact" },
    });
    expect(result).toMatchObject({ status: "FAILED", code: "INVALID_CANONICAL" });
    expect(supabase.pages).toHaveLength(0);
  });

  it("creates one child page, saves the canonical draft, verifies read-after-write and clears invite state", async () => {
    const generated = generatedFixture();
    const supabase = fakeSupabase();
    const result = await persistPremiumOnboardingGeneratedPage({
      supabase,
      profileId: PROFILE_ID,
      editorConfig: generated.editorConfig,
      title: "Página premium",
      pageType: "services",
      generation: generated.generationMetadata,
    });
    expect(result).toMatchObject({
      status: "PERSISTED",
      profileId: PROFILE_ID,
      pageId: "page-1",
      publicId: "public-1",
      editorPath: "/pages/page-1/edit",
    });
    expect(supabase.pages).toHaveLength(1);
    expect(supabase.pages[0]?.["template_config"]).toMatchObject({
      schemaVersion: 1,
      editorConfig: generated.editorConfig,
    });
  });

  it("does not claim completed handoff when invite cleanup fails after persistence", async () => {
    const generated = generatedFixture();
    const supabase = fakeSupabase({ invitePatchFails: true });
    const result = await persistPremiumOnboardingGeneratedPage({
      supabase,
      profileId: PROFILE_ID,
      editorConfig: generated.editorConfig,
      title: "Página premium",
      pageType: "services",
      generation: generated.generationMetadata,
    });
    expect(result).toMatchObject({
      status: "FAILED",
      code: "HANDOFF_COMPLETION_FAILED",
      pageId: "page-1",
      editorPath: "/pages/page-1/edit",
    });
  });
});
