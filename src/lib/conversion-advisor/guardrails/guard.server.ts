/**
 * CRIPQER Conversion Advisor — CA-8 · the fail-closed guard.
 *
 * Order of operations for every provider call:
 *
 *   reserve  → the budget is held BEFORE the call (an estimate, not a wish)
 *   call     → the only step that can fail in the outside world
 *   reconcile→ real usage replaces the estimate
 *   settle   → on failure, the hold is NOT given back by default: the provider
 *              may have consumed tokens we cannot see, so a conservative
 *              imputation is kept. Only a failure the caller knows never left
 *              the process is released in full (`onProviderFailure`).
 *
 * Every refusal is a typed denial, never an exception and never a silent
 * allow. If the ledger cannot answer, the answer is "no".
 *
 * The guarantee is per PROCESS — see the header of `ledger.server.ts`. The
 * global rate window and the daily budget are the two barriers that do not
 * depend on a session id, so renewing a session does not buy unlimited calls
 * *within one process*; across processes they multiply, and that is stated
 * rather than hidden.
 */

import {
  type AdvisorLimits,
  type AdvisorLimitsEnv,
  readAdvisorLimits,
  readAdvisorLimitsFromProcessEnv,
} from "./limits";
import {
  createInMemoryGuardrailLedger,
  type AdvisorGuardrailPort,
  type AdvisorMetrics,
  type DenialReason,
} from "./ledger.server";

export interface CallUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface CallResult {
  readonly usage: CallUsage;
  readonly latencyMs: number;
}

export type GuardedOutcome<T> =
  | { readonly ok: true; readonly value: T; readonly usage: CallUsage; readonly latencyMs: number }
  | { readonly ok: false; readonly denied: DenialReason; readonly source: "LEDGER" }
  | { readonly ok: false; readonly denied: "PROVIDER_FAILED"; readonly source: "PROVIDER" };

export interface AdvisorGuard {
  readonly limits: AdvisorLimits;
  readonly port: AdvisorGuardrailPort;
  run<T extends CallResult>(
    sessionKey: string,
    call: () => Promise<T>,
    now?: () => number,
    options?: GuardRunOptions,
  ): Promise<GuardedOutcome<T>>;
  metrics(): AdvisorMetrics;
  isCircuitOpen(now?: number): boolean;
}

export interface GuardRunOptions {
  /**
   * How many provider attempts this one call may make. The provider retries on
   * its own (CA-1 `maxRetries`), so a single guarded call can bill more than
   * once; declaring it here makes each attempt reserve its own possible
   * consumption. Defaults to 1.
   */
  readonly attempts?: number;
  /**
   * What to do when the call throws.
   *
   *  · `"CONSERVATIVE"` (default) — the provider MAY have received the request
   *    and consumed tokens we cannot see (timeout, abort, connection lost after
   *    the send). The hold is imputed, not returned.
   *  · `"RELEASE"` — the caller KNOWS the request never reached the provider
   *    (its own pre-flight refused, no key, a local validation error). Only
   *    then is giving the whole hold back correct.
   *
   * Defaulting to `"CONSERVATIVE"` is the point: an unknown cost is charged,
   * because a budget that refunds every failure is not a budget.
   */
  readonly onProviderFailure?: "CONSERVATIVE" | "RELEASE";
}

function safeSessionKey(sessionKey: string): string {
  // The ledger never needs to know who this is; an opaque, bounded key is all
  // it gets, so no identifier larger than the key can leak into its maps.
  return sessionKey.slice(0, 64);
}

/**
 * `port` is injectable on purpose: it is the seam where a SHARED ledger
 * (Redis, a table, a queue) replaces the per-process one without touching the
 * guard. Tests use it to prove the fail-closed behaviour.
 */
export function createAdvisorGuard(
  limits: AdvisorLimits = readAdvisorLimitsFromProcessEnv(),
  port: AdvisorGuardrailPort = createInMemoryGuardrailLedger(limits),
): AdvisorGuard {
  return {
    limits,
    port,

    async run<T extends CallResult>(
      sessionKey: string,
      call: () => Promise<T>,
      now: () => number = Date.now,
      options: GuardRunOptions = {},
    ): Promise<GuardedOutcome<T>> {
      const key = safeSessionKey(sessionKey);

      let reservationId: string;
      try {
        const reserved = port.reserve(key, now(), options.attempts ?? 1);
        if (!reserved.ok) return { ok: false, denied: reserved.reason, source: "LEDGER" };
        reservationId = reserved.reservation.id;
      } catch {
        // The ledger failing must never mean "go ahead".
        return { ok: false, denied: "GUARD_UNAVAILABLE", source: "LEDGER" };
      }

      const startedAt = now();
      try {
        const result = await call();
        port.reconcile(reservationId, result.usage.inputTokens + result.usage.outputTokens, now());
        port.recordOutcome(
          {
            ok: true,
            latencyMs: result.latencyMs,
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
          },
          now(),
        );
        return { ok: true, value: result, usage: result.usage, latencyMs: result.latencyMs };
      } catch {
        // The call threw. Whether the provider got the request decides what
        // happens to the hold — and the safe default is that it did.
        if (options.onProviderFailure === "RELEASE") {
          port.release(reservationId, now());
        } else {
          port.settleUnknown(reservationId, now());
        }
        port.recordOutcome(
          { ok: false, latencyMs: now() - startedAt, inputTokens: 0, outputTokens: 0 },
          now(),
        );
        return { ok: false, denied: "PROVIDER_FAILED", source: "PROVIDER" };
      }
    },

    metrics: () => port.metrics(),
    isCircuitOpen: (at?: number) => port.isCircuitOpen(at),
  };
}

/* --------------------------- process-wide instance ---------------------- */

let sharedGuard: AdvisorGuard | null = null;

/**
 * One guard per process. Callers that need an isolated ledger (tests, a
 * different limit set) build their own with `createAdvisorGuard`.
 *
 * `env` defaults to the REAL process environment, not `{}`: an earlier version
 * defaulted to empty, so whichever caller happened to arrive first could
 * permanently install the default limits and silently ignore the operator's
 * `ADVISOR_KILL_SWITCH`. The first caller still fixes the limits for the life
 * of the process — that is the propagation model, stated rather than implied.
 */
export function getAdvisorGuard(env?: AdvisorLimitsEnv): AdvisorGuard {
  if (sharedGuard === null) {
    sharedGuard = createAdvisorGuard(
      env === undefined ? readAdvisorLimitsFromProcessEnv() : readAdvisorLimits(env),
    );
  }
  return sharedGuard;
}

/** Test/ops helper: replaces the shared guard. */
export function __setAdvisorGuardForTests(guard: AdvisorGuard | null): void {
  sharedGuard = guard;
}

/** Content-free snapshot: counters only, never a message or an identifier. */
export function advisorMetricsSnapshot(): AdvisorMetrics {
  return getAdvisorGuard().metrics();
}
