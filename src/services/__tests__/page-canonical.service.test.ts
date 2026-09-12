import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("../../premium-template-studio/engine/TemplateValidator", () => ({
  validateTemplate: vi.fn(() => ({ valid: true, issues: [] })),
}));

import { pageCanonicalService } from "../page-canonical.service";

type Call = { method: string; args: unknown[] };
type Terminal = () => { data: unknown; error: unknown };

function makeBuilder(record: (c: Call) => void, terminal: Terminal) {
  const builder: Record<string, unknown> = {
    select: () => {
      record({ method: "select", args: [] });
      return builder;
    },
    update: (payload: unknown) => {
      record({ method: "update", args: [payload] });
      return builder;
    },
    eq: (column: string, value: unknown) => {
      record({ method: "eq", args: [column, value] });
      return builder;
    },
    maybeSingle: () => {
      record({ method: "maybeSingle", args: [] });
      return Promise.resolve(terminal());
    },
    single: () => {
      record({ method: "single", args: [] });
      return Promise.resolve(terminal());
    },
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(terminal()).then(resolve),
  };
  return builder;
}

interface FakeSupabase {
  allCalls: { table: string; method: string; args: unknown[] }[];
}

function createFakeSupabase(
  onQuery: (table: string, calls: Call[]) => { data: unknown; error: unknown },
): SupabaseClient & FakeSupabase {
  const allCalls: FakeSupabase["allCalls"] = [];
  const fake = {
    from: (table: string) => {
      const calls: Call[] = [];
      return makeBuilder(
        (call) => {
          calls.push(call);
          allCalls.push({ table, ...call });
        },
        () => onQuery(table, calls),
      );
    },
    allCalls,
  };
  return fake as unknown as SupabaseClient & FakeSupabase;
}

const PAGE_ID = "page-1";
const USER_ID = "user-1";
const EDITOR_CONFIG = { pageInstanceId: "bio-x", blocks: [] };

describe("pageCanonicalService.saveDraft", () => {
  it("writes only pages.template_config and does not touch published fields", async () => {
    const envelope = { schemaVersion: 1, editorConfig: EDITOR_CONFIG };
    const fake = createFakeSupabase((table, calls) => {
      expect(table).toBe("pages");
      return { data: { template_config: envelope }, error: null };
    });

    await pageCanonicalService.saveDraft(fake, PAGE_ID, USER_ID, EDITOR_CONFIG);

    const updateCall = fake.allCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();
    const payload = updateCall!.args[0] as Record<string, unknown>;
    expect(payload["template_config"]).toEqual(envelope);
    // Never writes published fields
    expect(payload).not.toHaveProperty("published_template_config");
    expect(payload).not.toHaveProperty("published");
    expect(payload).not.toHaveProperty("published_revision");

    const eqCalls = fake.allCalls.filter((c) => c.method === "eq");
    expect(eqCalls.map((c) => c.args[0])).toContain("id");
    expect(eqCalls.map((c) => c.args[0])).toContain("owner_user_id");
    expect(eqCalls.find((c) => c.args[0] === "id")?.args[1]).toBe(PAGE_ID);
    expect(eqCalls.find((c) => c.args[0] === "owner_user_id")?.args[1]).toBe(USER_ID);
  });

  it("rejects a foreign page (update matches 0 rows)", async () => {
    const fake = createFakeSupabase(() => ({ data: null, error: null }));
    await expect(
      pageCanonicalService.saveDraft(fake, PAGE_ID, USER_ID, EDITOR_CONFIG),
    ).rejects.toThrow("no pertenece al usuario");
  });
});

describe("pageCanonicalService.publish", () => {
  it("publishes the current snapshot and increments revision by exactly 1", async () => {
    const publishedRow = {
      id: PAGE_ID,
      public_id: "yfLEdka",
      published: true,
      published_revision: 1,
      published_at: "2026-11-09T00:00:00Z",
      published_template_config: { schemaVersion: 1, editorConfig: EDITOR_CONFIG },
    };
    const fake = createFakeSupabase(() => ({ data: publishedRow, error: null }));

    const result = await pageCanonicalService.publish(fake, PAGE_ID, USER_ID, EDITOR_CONFIG, 0);

    expect(result.published).toBe(true);
    expect(result.published_revision).toBe(1);

    const updateCall = fake.allCalls.find((c) => c.method === "update");
    const payload = updateCall!.args[0] as Record<string, unknown>;
    expect(payload["published"]).toBe(true);
    expect(payload["published_revision"]).toBe(1);
    expect(payload["published_at"]).toBeTruthy();
    expect(payload["published_template_config"]).toEqual({
      schemaVersion: 1,
      editorConfig: EDITOR_CONFIG,
    });

    // optimistic concurrency: published_revision must be part of the WHERE
    const revisionEq = fake.allCalls.find(
      (c) => c.method === "eq" && c.args[0] === "published_revision",
    );
    expect(revisionEq?.args[1]).toBe(0);
  });

  it("rejects a stale revision (cannot silently overwrite newer publish)", async () => {
    const fake = createFakeSupabase(() => ({ data: null, error: null }));
    await expect(
      pageCanonicalService.publish(fake, PAGE_ID, USER_ID, EDITOR_CONFIG, 0),
    ).rejects.toThrow("otra sesión");
  });
});
