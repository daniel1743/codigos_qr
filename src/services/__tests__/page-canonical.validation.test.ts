import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createBlankPageConfig } from "../../components/power-editor/blankPageConfig";
import { validateTemplate } from "../../premium-template-studio/engine/TemplateValidator";
import { pageCanonicalService } from "../page-canonical.service";

/**
 * CANONICAL PERSISTENCE VALIDATION (PAGES_3B).
 *
 * These tests run against the REAL `validateTemplate` (no mock). The existing
 * `page-canonical.service.test.ts` mocks the validator, which historically hid
 * the fact that a reduced child-page config (missing theme.colors,
 * theme.typography, layout.responsive) could be persisted and later rejected by
 * the public renderer. This file locks the canonical contract so a malformed
 * child-page document can never be saved or published again.
 */

const PAGE_ID = "page-1";
const USER_ID = "user-1";

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

function cloneWithout<T extends Record<string, unknown>>(config: T, path: string[]): T {
  const copy = JSON.parse(JSON.stringify(config)) as T;
  let node: Record<string, unknown> = copy;
  for (let i = 0; i < path.length - 1; i++) {
    node = node[path[i]!] as Record<string, unknown>;
  }
  delete node[path[path.length - 1]!];
  return copy;
}

const validEnvelope = () => ({
  schemaVersion: 1,
  editorConfig: createBlankPageConfig("Promo septiembre", "promotion"),
});

describe("createBlankPageConfig renderer-validity (PAGES_3B)", () => {
  it("produces a config accepted by the same canonical validator the public renderer uses", () => {
    const config = createBlankPageConfig("Promo septiembre", "promotion");
    const validation = validateTemplate(config);
    expect(validation.valid).toBe(true);
    // Canonical structural requirements (Phase 2 minimum structure).
    expect(config.theme.colors).toBeTruthy();
    expect(config.theme.typography).toBeTruthy();
    expect(config.layout.responsive).toBeTruthy();
    expect(Array.isArray(config.blocks)).toBe(true);
  });
});

describe("pageCanonicalService canonical validation (PAGES_3B)", () => {
  it("accepts a valid Page canonical document in saveDraft and persists only pages.template_config", async () => {
    const envelope = validEnvelope();
    const fake = createFakeSupabase((table) => {
      expect(table).toBe("pages");
      return { data: { template_config: envelope }, error: null };
    });

    await pageCanonicalService.saveDraft(fake, PAGE_ID, USER_ID, envelope.editorConfig);

    const updateCall = fake.allCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();
    const payload = updateCall!.args[0] as Record<string, unknown>;
    expect(payload["template_config"]).toEqual(envelope);
    // Draft save never touches published fields.
    expect(payload).not.toHaveProperty("published_template_config");
    expect(payload).not.toHaveProperty("published");
    // Draft save never touches the profile table.
    expect(fake.allCalls.every((c) => c.table === "pages")).toBe(true);
  });

  it("rejects a document missing theme.colors", async () => {
    const invalid = cloneWithout(validEnvelope().editorConfig, ["theme", "colors"]);
    const fake = createFakeSupabase(() => ({ data: null, error: null }));
    await expect(pageCanonicalService.saveDraft(fake, PAGE_ID, USER_ID, invalid)).rejects.toThrow(
      /no es válido/,
    );
    expect(fake.allCalls.some((c) => c.method === "update")).toBe(false);
  });

  it("rejects a document missing theme.typography", async () => {
    const invalid = cloneWithout(validEnvelope().editorConfig, ["theme", "typography"]);
    const fake = createFakeSupabase(() => ({ data: null, error: null }));
    await expect(pageCanonicalService.saveDraft(fake, PAGE_ID, USER_ID, invalid)).rejects.toThrow(
      /no es válido/,
    );
    expect(fake.allCalls.some((c) => c.method === "update")).toBe(false);
  });

  it("rejects a document missing layout.responsive", async () => {
    const invalid = cloneWithout(validEnvelope().editorConfig, ["layout", "responsive"]);
    const fake = createFakeSupabase(() => ({ data: null, error: null }));
    await expect(pageCanonicalService.saveDraft(fake, PAGE_ID, USER_ID, invalid)).rejects.toThrow(
      /no es válido/,
    );
    expect(fake.allCalls.some((c) => c.method === "update")).toBe(false);
  });

  it("publish cannot persist a malformed canonical snapshot", async () => {
    const invalid = cloneWithout(validEnvelope().editorConfig, ["theme", "colors"]);
    const fake = createFakeSupabase(() => ({ data: null, error: null }));
    await expect(
      pageCanonicalService.publish(fake, PAGE_ID, USER_ID, invalid, 0),
    ).rejects.toThrow(/no es válido/);
    expect(fake.allCalls.some((c) => c.method === "update")).toBe(false);
  });

  it("publish persists the exact validated canonical document as the published snapshot", async () => {
    const envelope = validEnvelope();
    const publishedRow = {
      id: PAGE_ID,
      public_id: "yfLEdka",
      published: true,
      published_revision: 1,
      published_at: "2026-11-09T00:00:00Z",
      published_template_config: envelope,
    };
    const fake = createFakeSupabase(() => ({ data: publishedRow, error: null }));

    const result = await pageCanonicalService.publish(
      fake,
      PAGE_ID,
      USER_ID,
      envelope.editorConfig,
      0,
    );

    expect(result.published).toBe(true);
    expect(result.published_revision).toBe(1);

    const updateCall = fake.allCalls.find((c) => c.method === "update");
    const payload = updateCall!.args[0] as Record<string, unknown>;
    expect(payload["published_template_config"]).toEqual(envelope);
    // The persisted snapshot equals the validated canonical document.
    expect(result.published_template_config).toEqual(envelope);
    expect(fake.allCalls.every((c) => c.table === "pages")).toBe(true);
  });
});

