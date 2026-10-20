/**
 * CRIPQER Conversion Advisor — CA-8 · configurable limits.
 *
 * Pure: no clock, no store, no I/O. Every limit can be lowered without a code
 * change, and an unreadable value falls back to the SAFE side of the default —
 * a typo in an environment variable must never widen a limit.
 */

export interface AdvisorLimits {
  /** Emergency stop. When true the advisor never calls the provider. */
  readonly killSwitch: boolean;
  /** Requests allowed per session inside the window. */
  readonly sessionRequestsPerWindow: number;
  readonly sessionWindowMs: number;
  /**
   * Requests allowed across ALL sessions in this process. This is the barrier
   * that does NOT depend on a renewable session id.
   */
  readonly globalRequestsPerWindow: number;
  readonly globalWindowMs: number;
  /** In-flight provider calls allowed at once. */
  readonly maxConcurrency: number;
  /** Tokens (input+output) the process may spend per day. */
  readonly dailyTokenBudget: number;
  /** Tokens held by a single reservation before the call happens. */
  readonly reservationTokens: number;
  /** A reservation older than this is considered leaked and is reclaimed. */
  readonly reservationTtlMs: number;
  /** Consecutive provider failures that open the circuit. */
  readonly circuitFailureThreshold: number;
  /** How long the circuit stays open before a single probe is allowed. */
  readonly circuitCooldownMs: number;
}

export const DEFAULT_ADVISOR_LIMITS: AdvisorLimits = {
  killSwitch: false,
  sessionRequestsPerWindow: 12,
  sessionWindowMs: 60_000,
  globalRequestsPerWindow: 120,
  globalWindowMs: 60_000,
  maxConcurrency: 4,
  dailyTokenBudget: 200_000,
  reservationTokens: 2_000,
  reservationTtlMs: 60_000,
  circuitFailureThreshold: 5,
  circuitCooldownMs: 60_000,
};

export interface AdvisorLimitsEnv {
  ADVISOR_KILL_SWITCH?: string | undefined;
  ADVISOR_SESSION_REQUESTS_PER_MINUTE?: string | undefined;
  ADVISOR_GLOBAL_REQUESTS_PER_MINUTE?: string | undefined;
  ADVISOR_MAX_CONCURRENCY?: string | undefined;
  ADVISOR_DAILY_TOKEN_BUDGET?: string | undefined;
  ADVISOR_CIRCUIT_FAILURE_THRESHOLD?: string | undefined;
}

/**
 * Reads a positive integer, or the fallback. Values that are not positive
 * integers are ignored rather than interpreted: "0" or "abc" cannot disable a
 * protection, and a huge value is clamped to the ceiling.
 */
function positiveInt(raw: string | undefined, fallback: number, ceiling: number): number {
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, ceiling);
}

export function readAdvisorLimits(env: AdvisorLimitsEnv = {}): AdvisorLimits {
  return {
    killSwitch: env.ADVISOR_KILL_SWITCH?.trim().toLowerCase() === "true",
    sessionRequestsPerWindow: positiveInt(
      env.ADVISOR_SESSION_REQUESTS_PER_MINUTE,
      DEFAULT_ADVISOR_LIMITS.sessionRequestsPerWindow,
      600,
    ),
    sessionWindowMs: DEFAULT_ADVISOR_LIMITS.sessionWindowMs,
    globalRequestsPerWindow: positiveInt(
      env.ADVISOR_GLOBAL_REQUESTS_PER_MINUTE,
      DEFAULT_ADVISOR_LIMITS.globalRequestsPerWindow,
      6_000,
    ),
    globalWindowMs: DEFAULT_ADVISOR_LIMITS.globalWindowMs,
    maxConcurrency: positiveInt(
      env.ADVISOR_MAX_CONCURRENCY,
      DEFAULT_ADVISOR_LIMITS.maxConcurrency,
      64,
    ),
    dailyTokenBudget: positiveInt(
      env.ADVISOR_DAILY_TOKEN_BUDGET,
      DEFAULT_ADVISOR_LIMITS.dailyTokenBudget,
      10_000_000,
    ),
    reservationTokens: DEFAULT_ADVISOR_LIMITS.reservationTokens,
    reservationTtlMs: DEFAULT_ADVISOR_LIMITS.reservationTtlMs,
    circuitFailureThreshold: positiveInt(
      env.ADVISOR_CIRCUIT_FAILURE_THRESHOLD,
      DEFAULT_ADVISOR_LIMITS.circuitFailureThreshold,
      100,
    ),
    circuitCooldownMs: DEFAULT_ADVISOR_LIMITS.circuitCooldownMs,
  };
}

/**
 * The limits the process actually runs with, read from the real environment.
 *
 * WHEN THIS IS READ — and this is the whole truth about the emergency stop:
 * exactly once per process, the first time the shared guard is built. Nothing
 * re-reads it afterwards. So `ADVISOR_KILL_SWITCH=true` takes effect on a
 * deploy/restart, NOT on a running process, and it is per instance — with N
 * instances you must deploy N times, which a single deploy does.
 *
 * The switch is checked at `reserve` time only, so it never interrupts a call
 * already in flight: that call finishes and is settled normally. "Stops the
 * next call" is what is true; "stops everything instantly" is not claimed.
 */
export function readAdvisorLimitsFromProcessEnv(): AdvisorLimits {
  if (typeof process === "undefined") return readAdvisorLimits({});
  const env = process.env;
  return readAdvisorLimits({
    ADVISOR_KILL_SWITCH: env["ADVISOR_KILL_SWITCH"],
    ADVISOR_SESSION_REQUESTS_PER_MINUTE: env["ADVISOR_SESSION_REQUESTS_PER_MINUTE"],
    ADVISOR_GLOBAL_REQUESTS_PER_MINUTE: env["ADVISOR_GLOBAL_REQUESTS_PER_MINUTE"],
    ADVISOR_MAX_CONCURRENCY: env["ADVISOR_MAX_CONCURRENCY"],
    ADVISOR_DAILY_TOKEN_BUDGET: env["ADVISOR_DAILY_TOKEN_BUDGET"],
    ADVISOR_CIRCUIT_FAILURE_THRESHOLD: env["ADVISOR_CIRCUIT_FAILURE_THRESHOLD"],
  });
}
