import { getPrivilegedSupabaseClient } from "../supabase/server-privileged";
import { currentQuotaPeriod, landingBotMonthlyLimit, type InMemoryQuota } from "./quota";

export interface LandingBotQuotaDecision {
  allowed: boolean;
  used: number;
  limit: number;
  period: string;
  durable: boolean;
}

/**
 * Durable per public_id / month quota enforced through the atomic
 * `consume_landing_bot_quota` Supabase RPC (service-role, server-only).
 *
 * Fail-safe: if the durable store is unavailable (RPC missing, key absent,
 * RLS, ...) it falls back to the in-memory store, so it can never break the
 * public bot. The tier limit is applied in JS for a single source of truth.
 */
export async function consumeLandingBotQuota(
  publicId: string,
  tier: string,
  fallback: InMemoryQuota,
): Promise<LandingBotQuotaDecision> {
  const period = currentQuotaPeriod();
  const limit = landingBotMonthlyLimit(tier);
  const key = `${publicId}:${period}`;

  let used: number | null = null;
  try {
    const supabase = getPrivilegedSupabaseClient();
    const { data, error } = await supabase.rpc("consume_landing_bot_quota", {
      p_public_id: publicId,
      p_period: period,
    });
    if (error) throw error;
    const parsed = typeof data === "number" ? data : Number(data);
    if (Number.isFinite(parsed)) used = parsed;
  } catch (error) {
    console.warn("[landing-bot] durable quota unavailable; using in-memory fallback.", error);
  }

  const durable = used !== null;
  const count = used ?? fallback.increment(key);
  return { allowed: count <= limit, used: count, limit, period, durable };
}
