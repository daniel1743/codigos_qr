/**
 * CRIPQER Conversion Advisor — CA-8 · the guardrail ledger.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ WHAT THIS FILE CAN AND CANNOT GUARANTEE                               │
 * │                                                                       │
 * │ The in-memory implementation below is PER PROCESS. It is exact inside  │
 * │ one instance and blind to every other: two instances each get their    │
 * │ own full budget, their own rate windows and their own concurrency cap. │
 * │                                                                       │
 * │ So: "the process will not exceed X" is a real guarantee.              │
 * │     "the product will not exceed X" is NOT — that needs a shared       │
 * │     implementation of `AdvisorGuardrailPort` (Redis, a table, a queue).│
 * │                                                                       │
 * │ Nothing here is presented as a global limit. The port exists precisely │
 * │ so the honest sentence stays true when the shared store arrives.       │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * No message text, no secrets and no conversation ever reach this module: it
 * only sees a session key, a token estimate and an outcome.
 */

import { type AdvisorLimits } from "./limits";

export type DenialReason =
  | "KILL_SWITCH"
  | "CIRCUIT_OPEN"
  | "CONCURRENCY_LIMIT"
  | "SESSION_RATE_LIMIT"
  | "GLOBAL_RATE_LIMIT"
  | "BUDGET_EXHAUSTED"
  /** The ledger could not answer. Refusing is the only safe reading. */
  | "GUARD_UNAVAILABLE";

export interface Reservation {
  readonly id: string;
  readonly sessionKey: string;
  readonly tokens: number;
  readonly at: number;
}

export type ReserveResult =
  | { readonly ok: true; readonly reservation: Reservation }
  | { readonly ok: false; readonly reason: DenialReason };

export interface AdvisorMetrics {
  readonly attempts: number;
  readonly successes: number;
  readonly failures: number;
  readonly latencyMsTotal: number;
  readonly latencyMsMax: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly denied: Readonly<Record<DenialReason, number>>;
  readonly reconciliationMismatches: number;
  /**
   * Failures whose real consumption is UNKNOWN and were charged the
   * conservative hold instead of being given back. Counted separately so the
   * cost of "we do not know" is visible rather than hidden inside `failures`.
   */
  readonly unknownConsumptionSettlements: number;
}

/**
 * The seam. A shared (cross-instance) implementation replaces the in-memory one
 * without touching the guard: same operations, same denial vocabulary.
 */
export interface AdvisorGuardrailPort {
  /**
   * Holds budget BEFORE the call. `attempts` is how many provider attempts the
   * caller may make inside this one reservation (the provider retries on its
   * own), so a retry reserves its own possible consumption instead of riding
   * free on the first attempt's hold.
   */
  reserve(sessionKey: string, now?: number, attempts?: number): ReserveResult;
  /** Replaces the reservation's estimate with the real usage. */
  reconcile(id: string, actualTokens: number, now?: number): boolean;
  /**
   * Gives the reservation back IN FULL. Only correct when the provider is known
   * NOT to have received the request — otherwise the spend disappears from the
   * budget and the daily ceiling stops being a ceiling.
   */
  release(id: string, now?: number): boolean;
  /**
   * Charges a CONSERVATIVE amount for a reservation whose real consumption is
   * unknown (timeout, abort, transport error after the request may have been
   * sent). Never returns the whole hold: an unknown cost is not a zero cost.
   */
  settleUnknown(id: string, now?: number): boolean;
  recordOutcome(
    outcome: {
      readonly ok: boolean;
      readonly latencyMs: number;
      readonly inputTokens: number;
      readonly outputTokens: number;
    },
    now?: number,
  ): void;
  isCircuitOpen(now?: number): boolean;
  metrics(): AdvisorMetrics;
  __reset(): void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (now: number) => Math.floor(now / DAY_MS);

export function createInMemoryGuardrailLedger(
  limits: AdvisorLimits,
  idFactory: () => string = () => crypto.randomUUID(),
): AdvisorGuardrailPort {
  let reservations = new Map<string, Reservation>();
  /**
   * Reservations that have already been settled (reconciled, released or
   * conservatively charged). A settlement must happen EXACTLY ONCE: without
   * this, a reconcile that arrives after the hold was swept would charge a
   * second time, which is the double charge the ledger exists to prevent.
   * Bounded by the same TTL as the holds themselves.
   */
  let settled = new Map<string, number>();
  let sessionWindows = new Map<string, { windowStart: number; count: number }>();
  let globalWindow = { windowStart: 0, count: 0 };
  let spend = { day: dayKey(0), tokens: 0 };
  let consecutiveFailures = 0;
  let openedAt: number | null = null;
  let probeInFlight = false;

  const counters = {
    attempts: 0,
    successes: 0,
    failures: 0,
    latencyMsTotal: 0,
    latencyMsMax: 0,
    inputTokens: 0,
    outputTokens: 0,
    denied: {
      KILL_SWITCH: 0,
      CIRCUIT_OPEN: 0,
      CONCURRENCY_LIMIT: 0,
      SESSION_RATE_LIMIT: 0,
      GLOBAL_RATE_LIMIT: 0,
      BUDGET_EXHAUSTED: 0,
      GUARD_UNAVAILABLE: 0,
    } as Record<DenialReason, number>,
    reconciliationMismatches: 0,
    unknownConsumptionSettlements: 0,
  };

  function deny(reason: DenialReason): ReserveResult {
    counters.denied[reason] += 1;
    return { ok: false, reason };
  }

  function sweepLeaked(now: number): void {
    for (const [id, reservation] of reservations) {
      if (now - reservation.at > limits.reservationTtlMs) reservations.delete(id);
    }
    for (const [id, at] of settled) {
      if (now - at > limits.reservationTtlMs) settled.delete(id);
    }
  }

  /**
   * The single settlement path. Marks the reservation settled (so a second
   * settlement is refused, never double-charged) and adds `tokens` to the day's
   * spend. `tokens` is whatever the caller established: the real usage on a
   * reconciliation, the held estimate when the real usage is unknown.
   */
  function settle(id: string, tokens: number, now: number): void {
    if (settled.has(id)) return;
    settled.set(id, now);
    rollDay(now);
    spend.tokens += tokens;
  }

  function rollDay(now: number): void {
    const day = dayKey(now);
    if (spend.day !== day) spend = { day, tokens: 0 };
  }

  function windowAllows(
    window: { windowStart: number; count: number },
    max: number,
    windowMs: number,
    now: number,
  ): boolean {
    if (now - window.windowStart >= windowMs) {
      window.windowStart = now;
      window.count = 0;
    }
    return window.count < max;
  }

  return {
    reserve(sessionKey: string, now: number = Date.now(), attempts = 1): ReserveResult {
      if (limits.killSwitch) return deny("KILL_SWITCH");

      // Every attempt the caller may make inside this reservation can bill on
      // its own, so the hold covers all of them: a retry is not free.
      const wanted = limits.reservationTokens * Math.max(1, Math.floor(attempts) || 1);

      sweepLeaked(now);
      rollDay(now);

      // Circuit: open, or cooling down and already probing.
      if (openedAt !== null) {
        const cooled = now - openedAt >= limits.circuitCooldownMs;
        if (!cooled) return deny("CIRCUIT_OPEN");
        if (probeInFlight) return deny("CIRCUIT_OPEN");
      }

      if (reservations.size >= limits.maxConcurrency) return deny("CONCURRENCY_LIMIT");

      const session = sessionWindows.get(sessionKey) ?? { windowStart: now, count: 0 };
      if (!windowAllows(session, limits.sessionRequestsPerWindow, limits.sessionWindowMs, now)) {
        sessionWindows.set(sessionKey, session);
        return deny("SESSION_RATE_LIMIT");
      }
      session.count += 1;
      sessionWindows.set(sessionKey, session);

      if (!windowAllows(globalWindow, limits.globalRequestsPerWindow, limits.globalWindowMs, now)) {
        session.count -= 1; // the session slot is given back: this request never happened
        sessionWindows.set(sessionKey, session);
        return deny("GLOBAL_RATE_LIMIT");
      }
      globalWindow.count += 1;

      const reserved = [...reservations.values()].reduce((total, item) => total + item.tokens, 0);
      if (spend.tokens + reserved + wanted > limits.dailyTokenBudget) {
        globalWindow.count -= 1;
        session.count -= 1;
        sessionWindows.set(sessionKey, session);
        return deny("BUDGET_EXHAUSTED");
      }

      const reservation: Reservation = {
        id: idFactory(),
        sessionKey,
        tokens: wanted,
        at: now,
      };
      reservations.set(reservation.id, reservation);
      if (openedAt !== null) probeInFlight = true;
      return { ok: true, reservation };
    },

    reconcile(id: string, actualTokens: number, now: number = Date.now()): boolean {
      if (settled.has(id)) return false;
      const reservation = reservations.get(id);
      if (reservation) reservations.delete(id);
      if (openedAt !== null) probeInFlight = false;
      const actual =
        Number.isFinite(actualTokens) && actualTokens >= 0 ? Math.round(actualTokens) : 0;
      if (reservation && actual > reservation.tokens) counters.reconciliationMismatches += 1;
      // The real usage replaces the estimate — never the other way round. It is
      // charged even when the hold is no longer on the books (swept by its TTL
      // while the call was still in flight): the provider billed, so the budget
      // must see it. Charging above the estimate is deliberate: the excess is
      // absorbed rather than clamped, so no strict ceiling is claimed.
      settle(id, actual, now);
      return reservation !== undefined;
    },

    release(id: string, now: number = Date.now()): boolean {
      const reservation = reservations.get(id);
      if (!reservation) return false;
      reservations.delete(id);
      if (openedAt !== null) probeInFlight = false;
      // Nothing was spent, so nothing is charged — but the settlement still
      // happens, so a late reconcile for this id cannot charge afterwards.
      settle(id, 0, now);
      return true;
    },

    settleUnknown(id: string, now: number = Date.now()): boolean {
      if (settled.has(id)) return false;
      const reservation = reservations.get(id);
      if (!reservation) return false;
      reservations.delete(id);
      if (openedAt !== null) probeInFlight = false;
      // The provider may have consumed tokens we cannot see, so the hold is
      // imputed rather than returned. This is a floor on the spend, not a
      // measurement: the real figure is unknowable from here.
      counters.unknownConsumptionSettlements += 1;
      settle(id, reservation.tokens, now);
      return true;
    },

    recordOutcome(outcome, now: number = Date.now()): void {
      counters.attempts += 1;
      counters.latencyMsTotal += Math.max(0, outcome.latencyMs);
      counters.latencyMsMax = Math.max(counters.latencyMsMax, Math.max(0, outcome.latencyMs));
      counters.inputTokens += Math.max(0, outcome.inputTokens);
      counters.outputTokens += Math.max(0, outcome.outputTokens);

      if (outcome.ok) {
        counters.successes += 1;
        consecutiveFailures = 0;
        openedAt = null;
        probeInFlight = false;
        return;
      }
      counters.failures += 1;
      consecutiveFailures += 1;
      if (consecutiveFailures >= limits.circuitFailureThreshold) {
        openedAt = now;
        probeInFlight = false;
      }
    },

    isCircuitOpen(now: number = Date.now()): boolean {
      if (openedAt === null) return false;
      return now - openedAt < limits.circuitCooldownMs;
    },

    metrics(): AdvisorMetrics {
      return {
        attempts: counters.attempts,
        successes: counters.successes,
        failures: counters.failures,
        latencyMsTotal: counters.latencyMsTotal,
        latencyMsMax: counters.latencyMsMax,
        inputTokens: counters.inputTokens,
        outputTokens: counters.outputTokens,
        denied: { ...counters.denied },
        reconciliationMismatches: counters.reconciliationMismatches,
        unknownConsumptionSettlements: counters.unknownConsumptionSettlements,
      };
    },

    __reset(): void {
      reservations = new Map();
      settled = new Map();
      sessionWindows = new Map();
      globalWindow = { windowStart: 0, count: 0 };
      spend = { day: dayKey(0), tokens: 0 };
      consecutiveFailures = 0;
      openedAt = null;
      probeInFlight = false;
      counters.attempts = 0;
      counters.successes = 0;
      counters.failures = 0;
      counters.latencyMsTotal = 0;
      counters.latencyMsMax = 0;
      counters.inputTokens = 0;
      counters.outputTokens = 0;
      counters.reconciliationMismatches = 0;
      counters.unknownConsumptionSettlements = 0;
      for (const key of Object.keys(counters.denied) as DenialReason[]) counters.denied[key] = 0;
    },
  };
}
