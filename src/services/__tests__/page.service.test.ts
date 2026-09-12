import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pageService, PageServiceError, ALLOWED_PAGE_TYPES } from "../page.service";
import type { Page } from "../../types/database";

type Row = Record<string, unknown>;
type Call = { method: string; args: unknown[] };
type Terminal = () => { data: unknown; error: unknown };

function makeBuilder(record: (call: Call) => void, terminal: Terminal) {
  const builder: Record<string, unknown> = {
    select: (...args: unknown[]) => {
      record({ method: "select", args });
      return builder;
    },
    eq: (column: string, value: unknown) => {
      record({ method: "eq", args: [column, value] });
      return builder;
    },
    order: (column: string, options: unknown) => {
      record({ method: "order", args: [column, options] });
      return builder;
    },
    insert: (payload: unknown) => {
      record({ method: "insert", args: [payload] });
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
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(terminal()).then(resolve),
  };
  return builder;
}

interface FakeSupabaseConfig {
  pages: Row[];
  profiles: Row[];
  insertedPage: Row | null;
}

function createFakeSupabase(config: FakeSupabaseConfig) {
  const allCalls: { table: string; method: string; args: unknown[] }[] = [];

  function terminalFor(table: string, calls: Call[]): { data: unknown; error: unknown } {
    if (table === "profiles") {
      const idEq = calls.find((c) => c.method === "eq" && c.args[0] === "id");
      const userIdEq = calls.find((c) => c.method === "eq" && c.args[0] === "user_id");
      const match = config.profiles.find(
        (p) => p.id === idEq?.args[1] && p.user_id === userIdEq?.args[1],
      );
      return { data: match ?? null, error: null };
    }

    const isInsert = calls.some((c) => c.method === "insert");
    const isMaybeSingle = calls.some((c) => c.method === "maybeSingle");

    if (isInsert) {
      return { data: config.insertedPage, error: null };
    }

    if (isMaybeSingle) {
      const idEq = calls.find((c) => c.method === "eq" && c.args[0] === "id");
      const ownerEq = calls.find((c) => c.method === "eq" && c.args[0] === "owner_user_id");
      const match = config.pages.find(
        (p) => p.id === idEq?.args[1] && p.owner_user_id === ownerEq?.args[1],
      );
      return { data: match ?? null, error: null };
    }

    const ownerEq = calls.find((c) => c.method === "eq" && c.args[0] === "owner_user_id");
    const profileEq = calls.find((c) => c.method === "eq" && c.args[0] === "profile_id");
    const filtered = config.pages.filter(
      (p) =>
        (!ownerEq || p.owner_user_id === ownerEq.args[1]) &&
        (!profileEq || p.profile_id === profileEq.args[1]),
    );
    return { data: filtered, error: null };
  }

  const fake = {
    from: (table: string) => {
      const calls: Call[] = [];
      return makeBuilder(
        (call) => {
          calls.push(call);
          allCalls.push({ table, ...call });
        },
        () => terminalFor(table, calls),
      );
    },
    allCalls,
  };

  return fake as unknown as SupabaseClient & { allCalls: typeof allCalls };
}

function makePage(overrides: Partial<Page> = {}): Row {
  return {
    id: "page-1",
    owner_user_id: "user-1",
    profile_id: "profile-1",
    public_id: "pub-page-1",
    title: "Promo septiembre",
    page_type: "promotion",
    template_config: null,
    published_template_config: null,
    published: false,
    published_revision: 0,
    published_at: null,
    slug: null,
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
    ...overrides,
  };
}

describe("pageService.listOwnPages", () => {
  it("returns only the authenticated user's own child pages", async () => {
    const fake = createFakeSupabase({
      pages: [
        makePage({ id: "page-1", owner_user_id: "user-1" }),
        makePage({ id: "page-2", owner_user_id: "user-2", public_id: "pub-page-2" }),
      ],
      profiles: [],
      insertedPage: null,
    });

    const pages = await pageService.listOwnPages(fake, "user-1", "profile-1");

    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe("page-1");

    const ownerFilters = fake.allCalls.filter(
      (c) => c.method === "eq" && c.args[0] === "owner_user_id",
    );
    expect(ownerFilters).toHaveLength(1);
    expect(ownerFilters[0].args[1]).toBe("user-1");
  });

  it("scopes the list to the active profile when provided", async () => {
    const fake = createFakeSupabase({
      pages: [
        makePage({ id: "page-1", profile_id: "profile-1" }),
        makePage({ id: "page-2", profile_id: "profile-2", public_id: "pub-page-2" }),
      ],
      profiles: [],
      insertedPage: null,
    });

    const pages = await pageService.listOwnPages(fake, "user-1", "profile-1");

    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe("page-1");
  });
});

describe("pageService.getOwnPageById", () => {
  it("returns a page the user owns", async () => {
    const fake = createFakeSupabase({
      pages: [makePage({ id: "page-1", owner_user_id: "user-1" })],
      profiles: [],
      insertedPage: null,
    });

    const page = await pageService.getOwnPageById(fake, "page-1", "user-1");
    expect(page?.id).toBe("page-1");
  });

  it("returns null for a foreign page", async () => {
    const fake = createFakeSupabase({
      pages: [makePage({ id: "page-1", owner_user_id: "user-2" })],
      profiles: [],
      insertedPage: null,
    });

    const page = await pageService.getOwnPageById(fake, "page-1", "user-1");
    expect(page).toBeNull();
  });
});

describe("pageService.createPage", () => {
  it("creates a child page for an owned profile with null config and draft state", async () => {
    const inserted = makePage({ id: "new-page", public_id: "pub-new-page" });
    const fake = createFakeSupabase({
      pages: [],
      profiles: [{ id: "profile-1", user_id: "user-1" }],
      insertedPage: inserted,
    });

    const created = await pageService.createPage(fake, {
      userId: "user-1",
      profileId: "profile-1",
      title: "  Promo septiembre  ",
      pageType: "promotion",
    });

    expect(created.id).toBe("new-page");
    expect(created.public_id).toBe("pub-new-page");
    expect(created.template_config).toBeNull();
    expect(created.published_template_config).toBeNull();
    expect(created.published).toBe(false);
    expect(created.published_revision).toBe(0);
    expect(created.published_at).toBeNull();

    const insertCall = fake.allCalls.find((c) => c.method === "insert");
    expect(insertCall).toBeTruthy();
    const payload = insertCall!.args[0] as Record<string, unknown>;
    expect(payload.owner_user_id).toBe("user-1");
    expect(payload.profile_id).toBe("profile-1");
    expect(payload.title).toBe("Promo septiembre");
    expect(payload.page_type).toBe("promotion");
    expect(payload.template_config).toBeNull();
    expect(payload.published).toBe(false);
    expect(payload.published_revision).toBe(0);
  });

  it("rejects an empty title", async () => {
    const fake = createFakeSupabase({ pages: [], profiles: [], insertedPage: null });
    await expect(
      pageService.createPage(fake, {
        userId: "user-1",
        profileId: "profile-1",
        title: "   ",
        pageType: "landing",
      }),
    ).rejects.toThrow(PageServiceError);
  });

  it("rejects an invalid page type", async () => {
    const fake = createFakeSupabase({ pages: [], profiles: [], insertedPage: null });
    await expect(
      pageService.createPage(fake, {
        userId: "user-1",
        profileId: "profile-1",
        title: "Ok",
        pageType: "bogus" as never,
      }),
    ).rejects.toThrow(PageServiceError);
  });

  it("cannot create a page under a foreign profile", async () => {
    const fake = createFakeSupabase({
      pages: [],
      profiles: [{ id: "profile-1", user_id: "user-2" }],
      insertedPage: null,
    });

    await expect(
      pageService.createPage(fake, {
        userId: "user-1",
        profileId: "profile-1",
        title: "Ok",
        pageType: "landing",
      }),
    ).rejects.toThrow("El perfil no existe o no te pertenece.");
  });

  it("requires an authenticated user", async () => {
    const fake = createFakeSupabase({ pages: [], profiles: [], insertedPage: null });
    await expect(
      pageService.createPage(fake, {
        userId: "",
        profileId: "profile-1",
        title: "Ok",
        pageType: "landing",
      }),
    ).rejects.toThrow(PageServiceError);
  });
});

describe("pageService.ALLOWED_PAGE_TYPES", () => {
  it("matches the page_type check constraint", () => {
    expect(ALLOWED_PAGE_TYPES).toEqual(["landing", "promotion", "menu", "campaign", "event"]);
  });
});
