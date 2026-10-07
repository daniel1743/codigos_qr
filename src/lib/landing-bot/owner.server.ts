import { getPrivilegedSupabaseClient } from "../supabase/server-privileged";

export interface LandingBotOwner {
  ownerUserId: string | null;
  tier: string;
}

/**
 * Server-only resolution of the page owner and their *effective billing tier*.
 *
 * - Reads the owner from `pages.owner_user_id` (privileged client).
 * - Resolves the tier through the trusted billing resolver (never a browser flag).
 * - Fully fail-closed: any failure resolves to tier "free" and never throws,
 *   so a billing outage can only ever *reduce* access, never break the bot.
 */
export async function resolveLandingBotOwner(publicId: string): Promise<LandingBotOwner> {
  try {
    const supabase = getPrivilegedSupabaseClient();
    const { data: pageRow, error: pageError } = await supabase
      .from("pages")
      .select("owner_user_id")
      .eq("public_id", publicId)
      .maybeSingle();
    if (pageError) return { ownerUserId: null, tier: "free" };

    const ownerUserId = (pageRow as { owner_user_id?: string } | null)?.owner_user_id ?? null;
    if (!ownerUserId) return { ownerUserId: null, tier: "free" };

    // B0 — the ONE decision service, so the page owner's tier is the same answer
    // every other surface gets (subscription OR grant), never a subscription-only
    // view that would call an invited owner "free".
    const { resolveUserPlan } = await import("../../server/billing/plan-service");
    return { ownerUserId, tier: (await resolveUserPlan(ownerUserId)).effectiveTier };
  } catch (error) {
    console.warn("[landing-bot] tier resolution failed; defaulting to free.", error);
    return { ownerUserId: null, tier: "free" };
  }
}
