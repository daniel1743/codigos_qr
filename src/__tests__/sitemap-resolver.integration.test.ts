import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.SITEMAP_INTEGRATION_SUPABASE_URL;
const anonKey = process.env.SITEMAP_INTEGRATION_SUPABASE_ANON_KEY;
const profilePublicId = process.env.SITEMAP_INTEGRATION_PROFILE_PUBLIC_ID;
const configured = Boolean(supabaseUrl && anonKey && profilePublicId);

describe.skipIf(!configured)("sitemap resolver RPC against Supabase anon role", () => {
  it("matches the public profile bridge for a real published profile", async () => {
    const supabase = createClient(supabaseUrl!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [batchResult, bridgeResult] = await Promise.all([
      supabase.rpc("get_sitemap_published_magic_page_mappings"),
      supabase.rpc("get_published_magic_page_by_legacy_public_id", {
        p_legacy_public_id: profilePublicId!,
      }),
    ]);

    expect(batchResult.error).toBeNull();
    expect(bridgeResult.error).toBeNull();
    const batchMapping = batchResult.data?.find(
      (mapping) => mapping.profile_public_id === profilePublicId,
    );
    const bridgePage = bridgeResult.data?.[0];
    expect(batchMapping?.page_public_id ?? null).toBe(bridgePage?.page_public_id ?? null);
  });
});
