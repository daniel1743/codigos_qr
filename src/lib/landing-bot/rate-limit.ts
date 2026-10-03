interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window rate limiter (in-memory, per process). Returns true when the
 * request is allowed. The clock is injectable for deterministic tests.
 *
 * Used as burst protection on top of the durable monthly quota.
 */
export function createRateLimiter(options: { windowMs: number; max: number; now?: () => number }) {
  const now = options.now ?? (() => Date.now());
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string): boolean {
      const current = now();
      const bucket = buckets.get(key);
      if (!bucket || current >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: current + options.windowMs });
        return true;
      }
      if (bucket.count >= options.max) return false;
      bucket.count += 1;
      return true;
    },
    reset(): void {
      buckets.clear();
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
