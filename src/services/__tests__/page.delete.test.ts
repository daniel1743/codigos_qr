import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pageService } from "../page.service";

type Call = { method: string; args: unknown[] };

function fakeSupabase(options: {
  page: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  deleted: Record<string, unknown> | null;
}) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];

  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      const tableCalls: Call[] = [];
      const record = (method: string, args: unknown[]) => {
        tableCalls.push({ method, args });
        calls.push({ table, method, args });
      };
      chain.select = (...args: unknown[]) => {
        record("select", args);
        return chain;
      };
      chain.delete = () => {
        record("delete", []);
        return chain;
      };
      chain.eq = (column: string, value: unknown) => {
        record("eq", [column, value]);
        return chain;
      };
      chain.maybeSingle = () => {
        record("maybeSingle", []);
        if (table === "pages" && tableCalls.some((call) => call.method === "delete")) {
          return Promise.resolve({ data: options.deleted, error: null });
        }
        return Promise.resolve({
          data: table === "pages" ? options.page : options.profile,
          error: null,
        });
      };
      return chain;
    },
    calls,
  } as unknown as SupabaseClient & { calls: typeof calls };
}

const childPage = {
  id: "page-a",
  owner_user_id: "user-a",
  profile_id: "profile-a",
  slug: "promo-a",
  qr_config: { qr_background_color: "#fff" },
};

describe("pageService.deleteOwnedChildPage", () => {
  it("deletes only the authenticated user's child page", async () => {
    const fake = fakeSupabase({
      page: childPage,
      profile: { id: "profile-a" },
      deleted: { id: "page-a" },
    });

    await pageService.deleteOwnedChildPage(fake, "page-a", "user-a");

    const pageDelete = fake.calls.filter(
      (call) => call.table === "pages" && call.method === "delete",
    );
    expect(pageDelete).toHaveLength(1);
    expect(fake.calls).toContainEqual({ table: "pages", method: "eq", args: ["owner_user_id", "user-a"] });
    expect(fake.calls.some((call) => call.table === "profiles" && call.method === "delete")).toBe(false);
  });

  it("blocks a foreign page before issuing a delete", async () => {
    const fake = fakeSupabase({
      page: null,
      profile: null,
      deleted: null,
    });

    await expect(pageService.deleteOwnedChildPage(fake, "page-a", "user-b")).rejects.toThrow(
      "no existe o no te pertenece",
    );
    expect(fake.calls.some((call) => call.method === "delete")).toBe(false);
  });

  it("protects a malformed row that matches the primary profile identity", async () => {
    const fake = fakeSupabase({
      page: { ...childPage, id: "profile-a" },
      profile: { id: "profile-a" },
      deleted: null,
    });

    await expect(pageService.deleteOwnedChildPage(fake, "profile-a", "user-a")).rejects.toThrow(
      "página principal",
    );
    expect(fake.calls.some((call) => call.method === "delete")).toBe(false);
  });

  it("does not delete when the page profile is not owned", async () => {
    const fake = fakeSupabase({
      page: childPage,
      profile: null,
      deleted: null,
    });

    await expect(pageService.deleteOwnedChildPage(fake, "page-a", "user-a")).rejects.toThrow(
      "perfil de esta página",
    );
    expect(fake.calls.some((call) => call.method === "delete")).toBe(false);
  });
});
