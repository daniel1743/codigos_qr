import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pageAliasService } from "../page-alias.service";

const PAGE_ID = "page-1";
const USER_ID = "user-1";
const ALIAS = "promo-septiembre";

type Call = { method: string; args: unknown[] };

function makeBuilder(
  record: (c: Call) => void,
  terminal: () => { data: unknown; error: unknown },
) {
  const builder: Record<string, unknown> = {
    select: (...args: unknown[]) => {
      record({ method: "select", args });
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
    neq: (column: string, value: unknown) => {
      record({ method: "neq", args: [column, value] });
      return builder;
    },
    maybeSingle: () => {
      record({ method: "maybeSingle", args: [] });
      return Promise.resolve(terminal());
    },
  };
  return builder;
}

function createFakeSupabase(opts: {
  onQuery: (table: string, calls: Call[]) => { data: unknown; error: unknown };
  onRpc?: (fn: string, args: unknown) => { data: unknown; error: unknown };
}) {
  const allCalls: { table: string; method: string; args: unknown[] }[] = [];
  const fake = {
    from: (table: string) => {
      const calls: Call[] = [];
      return makeBuilder(
        (c) => {
          calls.push(c);
          allCalls.push({ table, ...c });
        },
        () => opts.onQuery(table, calls),
      );
    },
    rpc: async (fn: string, args: unknown) => {
      allCalls.push({ table: `rpc:${fn}`, method: "rpc", args: [args] });
      return opts.onRpc ? opts.onRpc(fn, args) : { data: null, error: null };
    },
    allCalls,
  };
  return fake as unknown as SupabaseClient & { allCalls: typeof allCalls };
}

describe("pageAliasService.savePageAlias (PAGES_6)", () => {
  it("writes only pages.slug, scoped by id and owner_user_id", async () => {
    const fake = createFakeSupabase({
      onQuery: (table) => {
        expect(table).toBe("pages");
        return { data: { slug: ALIAS }, error: null };
      },
    });

    await pageAliasService.savePageAlias(fake, PAGE_ID, USER_ID, ALIAS);

    const updateCall = fake.allCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();
    const payload = updateCall!.args[0] as Record<string, unknown>;
    expect(payload).toEqual({ slug: ALIAS });
    // Must never touch canonical/identity fields.
    expect(payload).not.toHaveProperty("public_id");
    expect(payload).not.toHaveProperty("template_config");
    expect(payload).not.toHaveProperty("published_template_config");
    expect(payload).not.toHaveProperty("published_revision");
    expect(payload).not.toHaveProperty("qr_config");
    expect(payload).not.toHaveProperty("title");
    expect(payload).not.toHaveProperty("page_type");

    const eqCalls = fake.allCalls.filter((c) => c.method === "eq");
    expect(eqCalls.find((c) => c.args[0] === "id")?.args[1]).toBe(PAGE_ID);
    expect(eqCalls.find((c) => c.args[0] === "owner_user_id")?.args[1]).toBe(USER_ID);
  });

  it("clears the alias when passed null", async () => {
    const fake = createFakeSupabase({
      onQuery: () => ({ data: { slug: null }, error: null }),
    });

    const result = await pageAliasService.savePageAlias(fake, PAGE_ID, USER_ID, null);
    expect(result).toBeNull();

    const updateCall = fake.allCalls.find((c) => c.method === "update");
    expect(updateCall!.args[0]).toEqual({ slug: null });
  });

  it("rejects a foreign/missing page (0 rows matched)", async () => {
    const fake = createFakeSupabase({
      onQuery: () => ({ data: null, error: null }),
    });

    await expect(pageAliasService.savePageAlias(fake, PAGE_ID, USER_ID, ALIAS)).rejects.toThrow(
      /no pertenece al usuario/,
    );
  });
});

describe("pageAliasService.isAliasAvailable (PAGES_6)", () => {
  it("returns true when no other page owns the alias", async () => {
    const fake = createFakeSupabase({
      onQuery: () => ({ data: null, error: null }),
    });
    await expect(pageAliasService.isAliasAvailable(fake, ALIAS, PAGE_ID)).resolves.toBe(true);
  });

  it("returns false when another page already owns the alias", async () => {
    const fake = createFakeSupabase({
      onQuery: () => ({ data: { id: "other-page" }, error: null }),
    });
    await expect(pageAliasService.isAliasAvailable(fake, ALIAS, PAGE_ID)).resolves.toBe(false);
  });
});

describe("pageAliasService.getPublicPageByAlias (PAGES_6)", () => {
  const PUBLIC_ROW = {
    public_id: "yfLEdka",
    title: "Promo septiembre",
    page_type: "promotion",
    published_template_config: { editorConfig: {} },
    slug: ALIAS,
    published_at: "2026-09-15T00:00:00Z",
  };

  it("calls get_public_page_by_slug and returns the published row", async () => {
    const fake = createFakeSupabase({
      onQuery: () => ({ data: null, error: null }),
      onRpc: (fn, args) => {
        expect(fn).toBe("get_public_page_by_slug");
        expect(args).toEqual({ p_slug: ALIAS });
        return { data: [PUBLIC_ROW], error: null };
      },
    });

    const result = await pageAliasService.getPublicPageByAlias(fake, ALIAS);
    expect(result).toEqual(PUBLIC_ROW);
  });

  it("returns null for an unknown alias (empty result)", async () => {
    const fake = createFakeSupabase({
      onQuery: () => ({ data: null, error: null }),
      onRpc: () => ({ data: [], error: null }),
    });

    await expect(pageAliasService.getPublicPageByAlias(fake, "nope")).resolves.toBeNull();
  });
});
