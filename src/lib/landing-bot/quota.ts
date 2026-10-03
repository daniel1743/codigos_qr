import { isLandingBotProTier } from "./config";

/** Monthly message allowances for the landing bot. */
export const LANDING_BOT_FREE_MONTHLY_LIMIT = 60;
export const LANDING_BOT_PRO_MONTHLY_LIMIT = 5000;

/** Canonical quota period key: "YYYY-MM" in UTC. */
export function currentQuotaPeriod(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Monthly limit for a given effective tier. */
export function landingBotMonthlyLimit(tier: string): number {
  return isLandingBotProTier(tier) ? LANDING_BOT_PRO_MONTHLY_LIMIT : LANDING_BOT_FREE_MONTHLY_LIMIT;
}

export interface InMemoryQuota {
  /** Increments the counter and returns the new count (never negative). */
  increment(key: string): number;
  peek(key: string): number;
  reset(): void;
}

/**
 * In-memory per-instance quota store, used only as a fail-safe fallback when the
 * durable Supabase store is unavailable. Mirrors the durable semantics: the
 * caller compares the returned count against the tier limit.
 */
export function createInMemoryQuota(): InMemoryQuota {
  const counts = new Map<string, number>();
  return {
    increment(key: string): number {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    peek(key: string): number {
      return counts.get(key) ?? 0;
    },
    reset(): void {
      counts.clear();
    },
  };
}
