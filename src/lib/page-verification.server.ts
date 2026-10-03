import { getPrivilegedSupabaseClient } from "./supabase/server-privileged";

export type PageVerificationVariant = "none" | "standard" | "official-gold";

function normalize(value: unknown): PageVerificationVariant {
  return value === "official-gold" || value === "standard" ? value : "none";
}

/**
 * Trusted, server-only read of the page owner's `profiles.verification_variant`.
 *
 * - Uses the privileged (service-role) client so it never depends on RLS.
 * - Fully fail-safe: a missing key, RLS block, or any error resolves to "none",
 *   which is exactly today's generic behaviour. Nothing is ever thrown to the
 *   caller, so this can never break the public page render.
 */
export async function resolvePageVerification(publicId: string): Promise<PageVerificationVariant> {
  try {
    const supabase = getPrivilegedSupabaseClient();

    const { data: pageRow, error: pageError } = await supabase
      .from("pages")
      .select("owner_user_id")
      .eq("public_id", publicId)
      .maybeSingle();
    if (pageError) return "none";

    const ownerId = (pageRow as { owner_user_id?: string } | null)?.owner_user_id;
    if (!ownerId) return "none";

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("verification_variant")
      .eq("user_id", ownerId)
      .maybeSingle();
    if (profileError) return "none";

    return normalize((profileRow as { verification_variant?: string } | null)?.verification_variant);
  } catch (error) {
    console.error("resolvePageVerification failed (falling back to none):", error);
    return "none";
  }
}
