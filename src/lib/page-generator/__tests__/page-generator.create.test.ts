/**
 * PAGES_7 — generated Page creation tests.
 *
 * The REAL Engine V2 generator and the REAL canonical validator run through the
 * REAL services (`pageService` + `pageCanonicalService`) against an in-memory
 * Supabase stub, so ownership, persistence target and canonical integrity are
 * asserted end to end.
 */

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { readCanonicalPageEnvelope } from "@/lib/canonical-page";
import { generateFromOnboardingIntentV2 } from "@/lib/onboarding-v2/engine-v2-generation";
import type { OnboardingV2GenerationResult } from "@/lib/onboarding-v2/engine-v2-generation";
import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { pageCanonicalService } from "@/services/page-canonical.service";
import { createGeneratedPage, type GeneratedPageEngineRequest } from "../create-page";
import type { GeneratedPageInput } from "../types";

const USER_ID = "user-1";
const PROFILE_ID = "profile-1";
const NOW = "2026-09-15T12:00:00.000Z";

type Row = Record<string, unknown>;
type Call = { method: string; args: unknown[] };

function inputFixture(overrides: Partial<GeneratedPageInput> = {}): GeneratedPageInput {
  return {
    objective: "services",
    title: "Servicios",
    businessName: "Barbería Norte",
    activity: "Barbería",
    description: "Cortes y cuidado de barba.",
    cta: { type: "whatsapp", value: "+56912345678" },
    items: [{ title: "Corte clásico", price: "$8.000" }],
    ...overrides,
  };
}

const realGenerate = async (
  request: GeneratedPageEngineRequest,
): Promise<OnboardingV2GenerationResult> =>
  generateFromOnboardingIntentV2(request.intent, {
    ...(request.now ? { now: request.now } : {}),
    ...(request.contentBlocks ? { contentBlocks: request.contentBlocks } : {}),
    ...(request.engineOptions ? { engine: request.engineOptions } : {}),
  });

/** Minimal in-memory PostgREST-shaped stub for profiles + pages. */
function createFakeSupabase(
  options: { user?: { id: string } | null; profileOwned?: boolean } = {},
) {
  const user = options.user === undefined ? { id: USER_ID } : options.user;
  const profileOwned = options.profileOwned ?? true;
  const pages: Row[] = [];
  const allCalls: { table: string; method: string; args: unknown[] }[] = [];
  let sequence = 0;

  function builder(table: string) {
    const calls: Call[] = [];
    const record = (call: Call) => {
      calls.push(call);
      allCalls.push({ table, ...call });
    };
    const eq = (column: string, value: unknown) => {
      record({ method: "eq", args: [column, value] });
      return api;
    };
    const terminal = (): { data: unknown; error: unknown } => {
      const insert = calls.find((call) => call.method === "insert");
      const update = calls.find((call) => call.method === "update");
      const isMaybeSingle = calls.some((call) => call.method === "maybeSingle");
      const matchRow = (candidates: Row[]) =>
        candidates.find((row) =>
          calls
            .filter((call) => call.method === "eq")
            .every((call) => row[call.args[0] as string] === call.args[1]),
        ) ?? null;

      if (table === "profiles") {
        if (!profileOwned) return { data: null, error: null };
        return {
          data: { id: PROFILE_ID, user_id: USER_ID },
          error: null,
        };
      }

      if (insert) {
        const payload = (insert.args[0] ?? {}) as Row;
        sequence += 1;
        const row: Row = {
          id: `page-${sequence}`,
          public_id: `pub${sequence}`,
          slug: null,
          published: false,
          published_revision: 0,
          published_at: null,
          published_template_config: null,
          template_config: null,
          created_at: NOW,
          updated_at: NOW,
          ...payload,
        };
        pages.push(row);
        return { data: row, error: null };
      }

      if (update) {
        const payload = (update.args[0] ?? {}) as Row;
        const row = matchRow(pages);
        if (!row) return { data: null, error: null };
        Object.assign(row, payload);
        return { data: row, error: null };
      }

      if (isMaybeSingle) {
        const eqs = calls.filter((call) => call.method === "eq");
        if (!eqs.length) return { data: null, error: null };
        return { data: matchRow(pages), error: null };
      }

      return { data: pages, error: null };
    };

    const api: Record<string, unknown> = {
      select: (...args: unknown[]) => {
        record({ method: "select", args });
        return api;
      },
      insert: (payload: unknown) => {
        record({ method: "insert", args: [payload] });
        return api;
      },
      update: (payload: unknown) => {
        record({ method: "update", args: [payload] });
        return api;
      },
      order: (...args: unknown[]) => {
        record({ method: "order", args });
        return api;
      },
      eq,
      maybeSingle: () => {
        record({ method: "maybeSingle", args: [] });
        return Promise.resolve(terminal());
      },
      single: () => {
        record({ method: "single", args: [] });
        return Promise.resolve(terminal());
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(terminal()).then(resolve),
    };
    return api;
  }

  const fake = {
    from: (table: string) => builder(table),
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    allCalls,
    pages,
  };
  return fake as unknown as SupabaseClient & { allCalls: typeof allCalls; pages: Row[] };
}

describe("PAGES_7 generated Page creation", () => {
  it("creates a Page owned by the authenticated user and saves the canonical draft to pages", async () => {
    const supabase = createFakeSupabase();
    const result = await createGeneratedPage({
      supabase,
      profileId: PROFILE_ID,
      input: inputFixture(),
      now: NOW,
      generate: realGenerate,
    });

    expect(result.status).toBe("CREATED");
    if (result.status !== "CREATED") return;

    const insert = supabase.allCalls.find(
      (call) => call.table === "pages" && call.method === "insert",
    );
    expect(insert).toBeTruthy();
    const payload = insert?.args[0] as Record<string, unknown>;
    expect(payload["owner_user_id"]).toBe(USER_ID);
    expect(payload["profile_id"]).toBe(PROFILE_ID);
    expect(payload["page_type"]).toBe("services");
    expect(payload["published"]).toBe(false);

    // The generator never writes to profiles and never creates a profile row.
    expect(
      supabase.allCalls.some(
        (call) =>
          call.table === "profiles" && (call.method === "insert" || call.method === "update"),
      ),
    ).toBe(false);
  });

  it("persists a canonical document that the real validator accepts", async () => {
    const supabase = createFakeSupabase();
    const result = await createGeneratedPage({
      supabase,
      profileId: PROFILE_ID,
      input: inputFixture(),
      now: NOW,
      generate: realGenerate,
    });
    expect(result.status).toBe("CREATED");
    if (result.status !== "CREATED") return;

    expect(validateTemplate(result.envelope.editorConfig).valid).toBe(true);
    expect(result.envelope.schemaVersion).toBe(1);
    expect(result.envelope.editorConfig.theme.colors).toBeTruthy();
    expect(result.envelope.editorConfig.theme.typography).toBeTruthy();
    expect(result.envelope.editorConfig.layout.responsive).toBeTruthy();
    expect(JSON.stringify(result.envelope.editorConfig.blocks)).toContain("Corte clásico");

    // Only `template_config` is written by the draft save.
    const update = supabase.allCalls.find(
      (call) => call.table === "pages" && call.method === "update",
    );
    expect(Object.keys((update?.args[0] as Record<string, unknown>) ?? {})).toEqual([
      "template_config",
    ]);

    // Read-back verification: the row really carries the validated envelope.
    const row = supabase.pages[0]!;
    const envelope = readCanonicalPageEnvelope(row["template_config"]);
    expect(envelope?.schemaVersion).toBe(1);
    expect(JSON.stringify(envelope?.editorConfig)).toBe(
      JSON.stringify(result.envelope.editorConfig),
    );
  });

  it("publishes the validated canonical snapshot with the existing service", async () => {
    const supabase = createFakeSupabase();
    const created = await createGeneratedPage({
      supabase,
      profileId: PROFILE_ID,
      input: inputFixture(),
      now: NOW,
      generate: realGenerate,
    });
    expect(created.status).toBe("CREATED");
    if (created.status !== "CREATED") return;

    const published = await pageCanonicalService.publish(
      supabase,
      created.page.id,
      USER_ID,
      created.envelope.editorConfig,
      0,
    );
    expect(published.published).toBe(true);
    expect(published.published_revision).toBe(1);
    expect(JSON.stringify(published.published_template_config)).toBe(
      JSON.stringify(created.envelope),
    );
  });

  it("rejects invalid owner input before generation runs", async () => {
    const supabase = createFakeSupabase();
    let generationCalls = 0;
    const result = await createGeneratedPage({
      supabase,
      profileId: PROFILE_ID,
      input: inputFixture({ title: "" }),
      now: NOW,
      generate: async (request) => {
        generationCalls += 1;
        return realGenerate(request);
      },
    });

    expect(result.status).toBe("FAILED");
    if (result.status !== "FAILED") return;
    expect(result.code).toBe("INVALID_INPUT");
    expect(generationCalls).toBe(0);
    expect(supabase.allCalls).toHaveLength(0);
  });

  it("rejects an invalid engine output and never persists a Page", async () => {
    const supabase = createFakeSupabase();
    const result = await createGeneratedPage({
      supabase,
      profileId: PROFILE_ID,
      input: inputFixture(),
      now: NOW,
      generate: async () => ({
        status: "INVALID_ENGINE_OUTPUT",
        onboardingIntent: inputFixture() as never,
        diagnostics: {
          mappedFields: [],
          inferredFields: [],
          deferredFields: [],
          unsupportedFields: [],
          warnings: [],
        },
        errors: ["blocks: Unknown block type"],
      }),
    });

    expect(result.status).toBe("FAILED");
    if (result.status !== "FAILED") return;
    expect(result.code).toBe("INVALID_ENGINE_OUTPUT");
    expect(supabase.allCalls.some((call) => call.method === "insert")).toBe(false);
  });

  it("requires an authenticated session and a profile owned by that user", async () => {
    const anonymous = createFakeSupabase({ user: null });
    const unauthenticated = await createGeneratedPage({
      supabase: anonymous,
      profileId: PROFILE_ID,
      input: inputFixture(),
      now: NOW,
      generate: realGenerate,
    });
    expect(unauthenticated.status).toBe("FAILED");
    if (unauthenticated.status === "FAILED") expect(unauthenticated.code).toBe("AUTH_REQUIRED");

    const foreign = createFakeSupabase({ profileOwned: false });
    const forbidden = await createGeneratedPage({
      supabase: foreign,
      profileId: "profile-of-another-user",
      input: inputFixture(),
      now: NOW,
      generate: realGenerate,
    });
    expect(forbidden.status).toBe("FAILED");
    if (forbidden.status === "FAILED") expect(forbidden.code).toBe("PAGE_CREATE_FAILED");
    expect(foreign.pages).toHaveLength(0);
  });
});
