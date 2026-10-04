import { describe, expect, it } from "vitest";
import { resolveCanonicalPublicPage, type PublicEntryIdentifier } from "./resolveCanonicalPublicPage";
import {
  CanonicalPublicPageReadError,
  createSupabaseCanonicalPublicPagePort,
  type CanonicalPublicReadClient,
  type ReadQuery,
  type ReadResult,
} from "./supabaseCanonicalPublicPagePort.server";

type RecordedCall =
  | { type: "rpc"; fn: string; args: Record<string, unknown> }
  | { type: "select"; table: string; columns: string; filters: [string, unknown][] };

interface ScriptedResult {
  data?: unknown;
  error?: unknown;
}

interface FakeScript {
  rpc?: Record<string, ScriptedResult>;
  table?: Record<string, ScriptedResult>;
}

/**
 * Fake read-only Supabase client: it only exposes `rpc` and
 * `from(table).select(cols).eq(...).eq(...).maybeSingle()` — there is NO
 * insert/update/delete/upsert surface, so a mutation would be impossible.
 * Every call is recorded so the tests can assert the exact RPC/table usage.
 */
function makeReadClient(script: FakeScript = {}) {
  const calls: RecordedCall[] = [];
  const client: CanonicalPublicReadClient = {
    async rpc(fn, args) {
      calls.push({ type: "rpc", fn, args });
      return (script.rpc?.[fn] ?? { data: null, error: null }) as ReadResult;
    },
    from(table) {
      return {
        select(columns) {
          const filters: [string, unknown][] = [];
          const query = {
            eq(column: string, value: unknown) {
              filters.push([column, value]);
              return query;
            },
            async maybeSingle(): Promise<ReadResult> {
              calls.push({ type: "select", table, columns, filters: [...filters] });
              return (script.table?.[table] ?? { data: null, error: null }) as ReadResult;
            },
            then(resolve: (v: ReadResult) => unknown, reject?: (e: unknown) => unknown) {
              return query.maybeSingle().then(resolve, reject);
            },
          };
          return query as unknown as ReadQuery;
        },
      };
    },
  };
  return { client, calls };
}

const REAL_BRIDGE = { data: [{ page_public_id: "VvUsngW", page_slug: "bienestar-en-claro" }], error: null };
const REAL_PROFILE = {
  data: { id: "1328bdad", public_id: "KTRdygd", slug: "vida-saludable-bienestar", published: true },
  error: null,
};

async function resolveWith(
  script: FakeScript,
  identifier: PublicEntryIdentifier,
) {
  const { client, calls } = makeReadClient(script);
  const port = createSupabaseCanonicalPublicPagePort(client);
  const target = await resolveCanonicalPublicPage(port, identifier);
  return { target, calls };
}

describe("adapter — real production case (KTRdygd / vida-saludable-bienestar → VvUsngW)", () => {
  it("legacy QR identity /p/KTRdygd resolves the modern published page", async () => {
    const { target, calls } = await resolveWith(
      { table: { profiles: REAL_PROFILE }, rpc: { get_published_magic_page_by_legacy_public_id: REAL_BRIDGE } },
      { kind: "legacy-profile-public-id", value: "KTRdygd" },
    );
    expect(target).toEqual({
      kind: "page",
      pagePublicId: "VvUsngW",
      pageSlug: "bienestar-en-claro",
      canonicalPath: "/pg/VvUsngW",
      resolvedFrom: "legacy-profile-public-id",
    });
    expect(calls).toContainEqual({
      type: "rpc",
      fn: "get_published_magic_page_by_legacy_public_id",
      args: { p_legacy_public_id: "KTRdygd" },
    });
    expect(calls).toContainEqual({
      type: "select",
      table: "profiles",
      columns: "id,public_id,slug,published",
      filters: [
        ["public_id", "KTRdygd"],
        ["published", true],
      ],
    });
  });

  it("legacy root alias /vida-saludable-bienestar resolves the same modern page", async () => {
    const { target, calls } = await resolveWith(
      { table: { profiles: REAL_PROFILE }, rpc: { get_published_magic_page_by_legacy_public_id: REAL_BRIDGE } },
      { kind: "legacy-profile-slug", value: "vida-saludable-bienestar" },
    );
    expect(target).toMatchObject({ kind: "page", pagePublicId: "VvUsngW" });
    expect(calls).toContainEqual({
      type: "select",
      table: "profiles",
      columns: "id,public_id,slug,published",
      filters: [
        ["slug", "vida-saludable-bienestar"],
        ["published", true],
      ],
    });
  });
});

const PUBLISHED_PAGE_ROW = {
  data: [
    {
      public_id: "VvUsngW",
      slug: "bienestar-en-claro",
      published_template_config: { documentType: "magic-page" },
    },
  ],
  error: null,
};

describe("adapter — 1/2 · migrated vs not migrated", () => {
  it("1) migrated profile resolves the modern published page", async () => {
    const { target } = await resolveWith(
      { table: { profiles: REAL_PROFILE }, rpc: { get_published_magic_page_by_legacy_public_id: REAL_BRIDGE } },
      { kind: "legacy-profile-public-id", value: "KTRdygd" },
    );
    expect(target.kind).toBe("page");
    expect(target).toMatchObject({ canonicalPath: "/pg/VvUsngW" });
  });

  it("2) not-migrated profile stays legacy (bridge returns nothing)", async () => {
    const { target } = await resolveWith(
      {
        table: {
          profiles: { data: { id: "legacy", public_id: "Legacy1", slug: "sin-pagina-todavia", published: true }, error: null },
        },
        rpc: { get_published_magic_page_by_legacy_public_id: { data: [], error: null } },
      },
      { kind: "legacy-profile-public-id", value: "Legacy1" },
    );
    expect(target).toEqual({
      kind: "legacy-profile",
      profilePublicId: "Legacy1",
      profileSlug: "sin-pagina-todavia",
      resolvedFrom: "legacy-profile-public-id",
    });
  });
});

describe("adapter — 3 · modern page exists but is NOT published", () => {
  it("a page identity without a published document is not-found (draft never resolves, no legacy fallback)", async () => {
    const { target } = await resolveWith(
      {
        rpc: {
          get_public_page_by_public_id: {
            data: [{ public_id: "DraftOnly", slug: null, published_template_config: null }],
            error: null,
          },
        },
      },
      { kind: "page-public-id", value: "DraftOnly" },
    );
    expect(target).toEqual({ kind: "not-found", resolvedFrom: "page-public-id" });
  });

  it("an unpublished modern page never replaces an existing legacy profile", async () => {
    const { target } = await resolveWith(
      {
        table: { profiles: REAL_PROFILE },
        // An unpublished page is not bridged: the RPC yields no row.
        rpc: { get_published_magic_page_by_legacy_public_id: { data: null, error: null } },
      },
      { kind: "legacy-profile-slug", value: "vida-saludable-bienestar" },
    );
    expect(target.kind).toBe("legacy-profile");
  });
});

describe("adapter — 5 · page identities resolve the modern publication", () => {
  it("page public id uses get_public_page_by_public_id", async () => {
    const { target, calls } = await resolveWith(
      { rpc: { get_public_page_by_public_id: PUBLISHED_PAGE_ROW } },
      { kind: "page-public-id", value: "VvUsngW" },
    );
    expect(target).toEqual({
      kind: "page",
      pagePublicId: "VvUsngW",
      pageSlug: "bienestar-en-claro",
      canonicalPath: "/pg/VvUsngW",
      resolvedFrom: "page-public-id",
    });
    expect(calls).toContainEqual({
      type: "rpc",
      fn: "get_public_page_by_public_id",
      args: { p_public_id: "VvUsngW" },
    });
  });

  it("page alias uses get_public_page_by_slug", async () => {
    const { target, calls } = await resolveWith(
      { rpc: { get_public_page_by_slug: PUBLISHED_PAGE_ROW } },
      { kind: "page-slug", value: "bienestar-en-claro" },
    );
    expect(target).toMatchObject({ kind: "page", canonicalPath: "/pg/VvUsngW" });
    expect(calls).toContainEqual({
      type: "rpc",
      fn: "get_public_page_by_slug",
      args: { p_slug: "bienestar-en-claro" },
    });
  });
});

describe("adapter — 6 · infrastructure errors are explicit (no silent fallback)", () => {
  it("RPC failure rejects with the failing operation", async () => {
    const { client } = makeReadClient({
      rpc: { get_public_page_by_public_id: { data: null, error: { message: "boom" } } },
    });
    const port = createSupabaseCanonicalPublicPagePort(client);
    await expect(port.findPublishedPageByPublicId("VvUsngW")).rejects.toBeInstanceOf(
      CanonicalPublicPageReadError,
    );
    await expect(port.findPublishedPageByPublicId("VvUsngW")).rejects.toMatchObject({
      operation: "get_public_page_by_public_id",
    });
  });

  it("profiles read failure rejects with profiles.<column>", async () => {
    const { client } = makeReadClient({ table: { profiles: { data: null, error: { message: "boom" } } } });
    const port = createSupabaseCanonicalPublicPagePort(client);
    await expect(port.findPublishedProfileBySlug("vida-saludable-bienestar")).rejects.toMatchObject({
      operation: "profiles.slug",
    });
  });

  it("the resolver propagates the outage instead of falling back", async () => {
    const { client } = makeReadClient({
      rpc: { get_published_magic_page_by_legacy_public_id: { data: null, error: { message: "boom" } } },
      table: { profiles: REAL_PROFILE },
    });
    const port = createSupabaseCanonicalPublicPagePort(client);
    await expect(
      resolveCanonicalPublicPage(port, { kind: "legacy-profile-public-id", value: "KTRdygd" }),
    ).rejects.toBeInstanceOf(CanonicalPublicPageReadError);
  });
});

describe("adapter — 7 · nonexistent identifiers", () => {
  it("unknown page and unknown profile resolve to not-found", async () => {
    const byPage = await resolveWith({}, { kind: "page-public-id", value: "Ghost1" });
    expect(byPage.target).toEqual({ kind: "not-found", resolvedFrom: "page-public-id" });

    const byProfile = await resolveWith({}, { kind: "legacy-profile-public-id", value: "Ghost2" });
    expect(byProfile.target).toEqual({ kind: "not-found", resolvedFrom: "legacy-profile-public-id" });
  });
});

describe("adapter — read-only discipline", () => {
  it("only performs rpc + select reads", async () => {
    const { target, calls } = await resolveWith(
      { table: { profiles: REAL_PROFILE }, rpc: { get_published_magic_page_by_legacy_public_id: REAL_BRIDGE } },
      { kind: "legacy-profile-public-id", value: "KTRdygd" },
    );
    expect(target.kind).toBe("page");
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(["rpc", "select"]).toContain(call.type);
    }
  });
});
