import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pageQrService } from "../page-qr.service";
import type { PageQrConfig } from "../../types/database";

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

const CONFIG: PageQrConfig = { qr_foreground_color: "#8b5cf6", qr_background_color: "#ffffff" };

describe("pageQrService (PAGES_5)", () => {
  it("writes only pages.qr_config and never touches profiles or canonical fields", async () => {
    const fake = createFakeSupabase((table) => {
      expect(table).toBe("pages");
      return { data: { qr_config: CONFIG }, error: null };
    });

    await pageQrService.saveQrConfig(fake, PAGE_ID, USER_ID, CONFIG);

    const updateCall = fake.allCalls.find((c) => c.method === "update");
    expect(updateCall).toBeTruthy();
    const payload = updateCall!.args[0] as Record<string, unknown>;
    expect(payload["qr_config"]).toEqual(CONFIG);
    // Must never touch canonical page fields.
    expect(payload).not.toHaveProperty("template_config");
    expect(payload).not.toHaveProperty("published_template_config");
    expect(payload).not.toHaveProperty("published_revision");
    // Must never touch the profiles table.
    expect(fake.allCalls.every((c) => c.table === "pages")).toBe(true);
  });

  it("scopes the write to the owner via owner_user_id", async () => {
    const fake = createFakeSupabase(() => ({ data: { qr_config: CONFIG }, error: null }));
    await pageQrService.saveQrConfig(fake, PAGE_ID, USER_ID, CONFIG);

    const eqCalls = fake.allCalls.filter((c) => c.method === "eq");
    expect(eqCalls.map((c) => c.args[0])).toContain("id");
    expect(eqCalls.map((c) => c.args[0])).toContain("owner_user_id");
    expect(eqCalls.find((c) => c.args[0] === "id")?.args[1]).toBe(PAGE_ID);
    expect(eqCalls.find((c) => c.args[0] === "owner_user_id")?.args[1]).toBe(USER_ID);
  });

  it("rejects a foreign/missing page (update matches 0 rows)", async () => {
    const fake = createFakeSupabase(() => ({ data: null, error: null }));
    await expect(pageQrService.saveQrConfig(fake, PAGE_ID, USER_ID, CONFIG)).rejects.toThrow(
      /no pertenece al usuario/,
    );
  });

  it("getQrConfig returns the page-owned config and null for foreign pages", async () => {
    const fake = createFakeSupabase(() => ({ data: { qr_config: CONFIG }, error: null }));
    const config = await pageQrService.getQrConfig(fake, PAGE_ID, USER_ID);
    expect(config).toEqual(CONFIG);

    const empty = createFakeSupabase(() => ({ data: null, error: null }));
    await expect(pageQrService.getQrConfig(empty, PAGE_ID, USER_ID)).resolves.toBeNull();
  });
});
