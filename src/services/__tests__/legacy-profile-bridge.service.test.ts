import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { profileService } from "../profile.service";

function fakeSupabase(data: unknown, error: unknown = null) {
  const calls: Array<{ fn: string; args: unknown }> = [];
  return {
    calls,
    rpc: async (fn: string, args: unknown) => {
      calls.push({ fn, args });
      return { data, error };
    },
  } as unknown as SupabaseClient & { calls: typeof calls };
}

describe("legacy profile QR bridge", () => {
  it("returns only the published Magic routing identity", async () => {
    const supabase = fakeSupabase([{ page_public_id: "MAGIC123", page_slug: "home" }]);

    await expect(
      profileService.getPublishedMagicPageByLegacyPublicId(supabase, "LEGACY123"),
    ).resolves.toEqual({ page_public_id: "MAGIC123", page_slug: "home" });
    expect(supabase.calls[0]).toEqual({
      fn: "get_published_magic_page_by_legacy_public_id",
      args: { p_legacy_public_id: "LEGACY123" },
    });
  });

  it("falls back when no published Magic page is returned", async () => {
    await expect(
      profileService.getPublishedMagicPageByLegacyPublicId(fakeSupabase([]), "LEGACY123"),
    ).resolves.toBeNull();
  });

  it("does not synthesize a route from malformed RPC data", async () => {
    await expect(
      profileService.getPublishedMagicPageByLegacyPublicId(
        fakeSupabase([{ page_public_id: null }]),
        "LEGACY123",
      ),
    ).resolves.toBeNull();
  });
});
