/**
 * CA-8 — limits, budget, abuse protection and metrics. Simulated provider only.
 */
import { describe, expect, it, vi } from "vitest";

import { __setAdvisorGuardForTests, createAdvisorGuard, getAdvisorGuard } from "../guard.server";
import { createInMemoryGuardrailLedger } from "../ledger.server";
import {
  DEFAULT_ADVISOR_LIMITS,
  readAdvisorLimits,
  readAdvisorLimitsFromProcessEnv,
  type AdvisorLimits,
} from "../limits";

const limits = (patch: Partial<AdvisorLimits> = {}): AdvisorLimits => ({
  ...DEFAULT_ADVISOR_LIMITS,
  ...patch,
});

const T0 = 1_700_000_000_000;
const okCall =
  (tokens = 100) =>
  async () => ({ usage: { inputTokens: tokens, outputTokens: 0 }, latencyMs: 25 });

describe("CA8 — configuration falls on the safe side", () => {
  it("a malformed or non-positive value never widens a limit", () => {
    const parsed = readAdvisorLimits({
      ADVISOR_MAX_CONCURRENCY: "abc",
      ADVISOR_SESSION_REQUESTS_PER_MINUTE: "0",
      ADVISOR_DAILY_TOKEN_BUDGET: "-5",
      ADVISOR_GLOBAL_REQUESTS_PER_MINUTE: "999999",
    });
    expect(parsed.maxConcurrency).toBe(DEFAULT_ADVISOR_LIMITS.maxConcurrency);
    expect(parsed.sessionRequestsPerWindow).toBe(DEFAULT_ADVISOR_LIMITS.sessionRequestsPerWindow);
    expect(parsed.dailyTokenBudget).toBe(DEFAULT_ADVISOR_LIMITS.dailyTokenBudget);
    expect(parsed.globalRequestsPerWindow).toBe(6_000); // clamped, not honoured
  });

  it("the kill switch only reads as ON when it is exactly 'true'", () => {
    expect(readAdvisorLimits({ ADVISOR_KILL_SWITCH: "true" }).killSwitch).toBe(true);
    expect(readAdvisorLimits({ ADVISOR_KILL_SWITCH: "yes" }).killSwitch).toBe(false);
    expect(readAdvisorLimits({}).killSwitch).toBe(false);
  });
});

describe("CA8 — reservation before the call, reconciliation after", () => {
  it("holds budget BEFORE the call and replaces the estimate with real usage", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ dailyTokenBudget: 10_000, reservationTokens: 2_000 }),
    );
    const first = ledger.reserve("s1", T0);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(ledger.reconcile(first.reservation.id, 150, T0)).toBe(true);
    expect(ledger.metrics().inputTokens).toBe(0); // metrics count outcomes, not reconciliations
  });

  it("denies when the day's budget cannot cover another hold", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ dailyTokenBudget: 5_000, reservationTokens: 2_000, maxConcurrency: 10 }),
    );
    expect(ledger.reserve("s1", T0).ok).toBe(true);
    expect(ledger.reserve("s2", T0).ok).toBe(true);
    const third = ledger.reserve("s3", T0);
    expect(third).toEqual({ ok: false, reason: "BUDGET_EXHAUSTED" });
  });

  it("a released hold is spendable again; a reconciled one is not", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ dailyTokenBudget: 4_000, reservationTokens: 2_000, maxConcurrency: 10 }),
    );
    const held = ledger.reserve("s1", T0);
    const second = ledger.reserve("s2", T0);
    expect(held.ok && second.ok).toBe(true);
    if (!held.ok) return;
    expect(ledger.release(held.reservation.id)).toBe(true);
    expect(ledger.reserve("s3", T0).ok).toBe(true);
  });

  it("a conservative settlement is NOT spendable again: the hold becomes spend", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ dailyTokenBudget: 3_000, reservationTokens: 2_000, maxConcurrency: 10 }),
    );
    const held = ledger.reserve("s1", T0);
    if (!held.ok) throw new Error("expected a reservation");
    expect(ledger.settleUnknown(held.reservation.id, T0)).toBe(true);
    // The imputed 2_000 is spent, so the budget can no longer cover a second hold.
    expect(ledger.reserve("s2", T0)).toEqual({ ok: false, reason: "BUDGET_EXHAUSTED" });
  });

  it("settles a reservation exactly once: a second settlement never double-charges", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ dailyTokenBudget: 6_000, reservationTokens: 2_000, maxConcurrency: 10 }),
    );
    const held = ledger.reserve("s1", T0);
    if (!held.ok) throw new Error("expected a reservation");
    expect(ledger.settleUnknown(held.reservation.id, T0)).toBe(true);
    expect(ledger.settleUnknown(held.reservation.id, T0)).toBe(false);
    expect(ledger.reconcile(held.reservation.id, 500, T0)).toBe(false);
    expect(ledger.release(held.reservation.id, T0)).toBe(false);
    expect(ledger.metrics().unknownConsumptionSettlements).toBe(1);
    // Exactly ONE charge of 2_000 landed: 6_000 - 2_000 leaves room for two
    // more holds. A double charge would leave room for only one.
    expect(ledger.reserve("s2", T0).ok).toBe(true);
    expect(ledger.reserve("s3", T0).ok).toBe(true);
    expect(ledger.reserve("s4", T0)).toEqual({ ok: false, reason: "BUDGET_EXHAUSTED" });
  });

  it("charges usage that arrives after the hold was swept by its TTL", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({
        dailyTokenBudget: 3_000,
        reservationTokens: 1_000,
        reservationTtlMs: 1_000,
        maxConcurrency: 10,
      }),
    );
    const held = ledger.reserve("s1", T0);
    if (!held.ok) throw new Error("expected a reservation");
    // A later reservation runs the sweep, which drops the abandoned hold...
    const sweeper = ledger.reserve("s2", T0 + 1_001);
    if (!sweeper.ok) throw new Error("expected the sweeping reservation");
    ledger.release(sweeper.reservation.id, T0 + 1_001);
    // ...so the reconcile finds no row to report, yet the 900 tokens the
    // provider really billed are still charged to the day.
    expect(ledger.reconcile(held.reservation.id, 900, T0 + 1_001)).toBe(false);
    // 3_000 - 900 (charged) leaves room for two holds of 1_000, not three.
    expect(ledger.reserve("s3", T0 + 1_001).ok).toBe(true);
    expect(ledger.reserve("s4", T0 + 1_001).ok).toBe(true);
    expect(ledger.reserve("s5", T0 + 1_001)).toEqual({ ok: false, reason: "BUDGET_EXHAUSTED" });
  });

  it("charges the REAL usage even when it exceeds the reservation, with no hard ceiling", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ dailyTokenBudget: 3_000, reservationTokens: 100, maxConcurrency: 10 }),
    );
    const held = ledger.reserve("s1", T0);
    if (!held.ok) throw new Error("expected a reservation");
    // The provider burned far more than the estimate. The excess is absorbed,
    // not clamped: the budget is a soft ceiling, and the overshoot is counted.
    expect(ledger.reconcile(held.reservation.id, 5_000, T0)).toBe(true);
    expect(ledger.metrics().reconciliationMismatches).toBe(1);
    expect(ledger.reserve("s2", T0)).toEqual({ ok: false, reason: "BUDGET_EXHAUSTED" });
  });

  it("a retry reserves its own possible consumption instead of riding free", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ dailyTokenBudget: 5_000, reservationTokens: 2_000, maxConcurrency: 10 }),
    );
    // One call that may attempt the provider twice must hold for both attempts.
    expect(ledger.reserve("s1", T0, 2).ok).toBe(true);
    expect(ledger.reserve("s2", T0)).toEqual({ ok: false, reason: "BUDGET_EXHAUSTED" });
  });

  it("counts a reconciliation that exceeded its estimate", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ reservationTokens: 100, dailyTokenBudget: 10_000 }),
    );
    const held = ledger.reserve("s1", T0);
    if (!held.ok) throw new Error("expected a reservation");
    ledger.reconcile(held.reservation.id, 5_000, T0);
    expect(ledger.metrics().reconciliationMismatches).toBe(1);
  });

  it("reclaims leaked reservations so a crashed call cannot hold budget forever", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ maxConcurrency: 1, reservationTtlMs: 1_000, dailyTokenBudget: 10_000 }),
    );
    expect(ledger.reserve("s1", T0).ok).toBe(true);
    expect(ledger.reserve("s2", T0).ok).toBe(false); // concurrency full
    expect(ledger.reserve("s2", T0 + 1_001).ok).toBe(true); // the leak expired
  });
});

describe("CA8 — abuse barriers that a renewable session id cannot bypass", () => {
  it("caps concurrency", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ maxConcurrency: 2, dailyTokenBudget: 100_000 }),
    );
    expect(ledger.reserve("s1", T0).ok).toBe(true);
    expect(ledger.reserve("s2", T0).ok).toBe(true);
    expect(ledger.reserve("s3", T0)).toEqual({ ok: false, reason: "CONCURRENCY_LIMIT" });
  });

  it("caps requests per session", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ sessionRequestsPerWindow: 2, maxConcurrency: 50, dailyTokenBudget: 100_000 }),
    );
    expect(ledger.reserve("s1", T0).ok).toBe(true);
    expect(ledger.reserve("s1", T0).ok).toBe(true);
    expect(ledger.reserve("s1", T0)).toEqual({ ok: false, reason: "SESSION_RATE_LIMIT" });
    expect(ledger.reserve("s1", T0 + 60_001).ok).toBe(true); // next window
  });

  it("caps the process globally, so brand-new session ids do not buy new quota", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({
        globalRequestsPerWindow: 3,
        sessionRequestsPerWindow: 100,
        maxConcurrency: 50,
        dailyTokenBudget: 100_000,
      }),
    );
    expect(ledger.reserve("s1", T0).ok).toBe(true);
    expect(ledger.reserve("s2", T0).ok).toBe(true);
    expect(ledger.reserve("s3", T0).ok).toBe(true);
    // A freshly minted session id is not a fresh allowance.
    expect(ledger.reserve("s4-fresh", T0)).toEqual({ ok: false, reason: "GLOBAL_RATE_LIMIT" });
  });

  it("enforces the daily token budget, which no session id can reset", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ dailyTokenBudget: 3_000, reservationTokens: 2_000, maxConcurrency: 50 }),
    );
    const first = ledger.reserve("s1", T0);
    if (!first.ok) throw new Error("expected a reservation");
    ledger.reconcile(first.reservation.id, 3_000, T0);
    expect(ledger.reserve("s-otra-sesion", T0)).toEqual({ ok: false, reason: "BUDGET_EXHAUSTED" });
    expect(ledger.reserve("s-otra-sesion", T0 + 86_400_001).ok).toBe(true); // next day
  });
});

describe("CA8 — circuit breaker and emergency stop", () => {
  it("opens after the failure threshold and refuses while open", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ circuitFailureThreshold: 2, maxConcurrency: 50, dailyTokenBudget: 100_000 }),
    );
    ledger.recordOutcome({ ok: false, latencyMs: 10, inputTokens: 0, outputTokens: 0 }, T0);
    expect(ledger.isCircuitOpen(T0)).toBe(false);
    ledger.recordOutcome({ ok: false, latencyMs: 10, inputTokens: 0, outputTokens: 0 }, T0);
    expect(ledger.isCircuitOpen(T0)).toBe(true);
    expect(ledger.reserve("s1", T0)).toEqual({ ok: false, reason: "CIRCUIT_OPEN" });
  });

  it("lets exactly one probe through after the cooldown, and closes on success", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({
        circuitFailureThreshold: 1,
        circuitCooldownMs: 1_000,
        maxConcurrency: 50,
        dailyTokenBudget: 100_000,
      }),
    );
    ledger.recordOutcome({ ok: false, latencyMs: 10, inputTokens: 0, outputTokens: 0 }, T0);
    expect(ledger.reserve("s1", T0)).toEqual({ ok: false, reason: "CIRCUIT_OPEN" });

    const probe = ledger.reserve("s1", T0 + 1_001);
    expect(probe.ok).toBe(true);
    expect(ledger.reserve("s2", T0 + 1_001)).toEqual({ ok: false, reason: "CIRCUIT_OPEN" }); // one probe at a time

    ledger.recordOutcome({ ok: true, latencyMs: 20, inputTokens: 5, outputTokens: 5 }, T0 + 1_001);
    expect(ledger.isCircuitOpen(T0 + 1_001)).toBe(false);
    expect(ledger.reserve("s2", T0 + 1_002).ok).toBe(true);
  });

  it("the kill switch refuses everything, immediately", () => {
    const ledger = createInMemoryGuardrailLedger(
      limits({ killSwitch: true, dailyTokenBudget: 100_000 }),
    );
    expect(ledger.reserve("s1", T0)).toEqual({ ok: false, reason: "KILL_SWITCH" });
  });

  it("the switch is read at reserve time, so it does NOT interrupt a call in flight", async () => {
    // A mutable limits object stands in for the one the process is running
    // with: it shows exactly WHEN the switch is consulted.
    const live: { -readonly [K in keyof AdvisorLimits]: AdvisorLimits[K] } = limits({
      killSwitch: false,
      dailyTokenBudget: 100_000,
      maxConcurrency: 5,
    });
    const guard = createAdvisorGuard(live);

    // Assigned by the executor, which TypeScript does not track; the deferred
    // holder keeps the call type checkable.
    const deferred: { open: () => void } = { open: () => {} };
    const gate = new Promise<void>((resolve) => {
      deferred.open = resolve;
    });
    const slowCall = async () => {
      await gate;
      return { usage: { inputTokens: 10, outputTokens: 10 }, latencyMs: 5 };
    };

    const inFlight = guard.run("s1", slowCall, () => T0);
    // The switch flips while the provider call is already running.
    live.killSwitch = true;
    deferred.open();

    // The call in flight completes and is settled normally...
    expect((await inFlight).ok).toBe(true);
    // ...and only the NEXT call is refused.
    expect(await guard.run("s2", okCall(), () => T0)).toEqual({
      ok: false,
      denied: "KILL_SWITCH",
      source: "LEDGER",
    });
  });
});

describe("CA8 — the guard wraps a call and always answers", () => {
  it("runs the call and reconciles with the real usage", async () => {
    const guard = createAdvisorGuard(limits({ dailyTokenBudget: 10_000 }));
    const outcome = await guard.run("s1", okCall(300), () => T0);
    expect(outcome.ok).toBe(true);
    expect(guard.metrics().successes).toBe(1);
    expect(guard.metrics().inputTokens).toBe(300);
  });

  it("does not call the provider when the ledger denies", async () => {
    const guard = createAdvisorGuard(limits({ killSwitch: true }));
    const call = vi.fn(okCall());
    const outcome = await guard.run("s1", call);
    expect(outcome).toEqual({ ok: false, denied: "KILL_SWITCH", source: "LEDGER" });
    expect(call).not.toHaveBeenCalled();
  });

  it("charges the hold conservatively when the provider fails with unknown consumption", async () => {
    const guard = createAdvisorGuard(
      limits({ dailyTokenBudget: 3_000, reservationTokens: 2_000, maxConcurrency: 5 }),
    );
    const failing = async () => {
      throw new Error("provider exploded");
    };
    const outcome = await guard.run("s1", failing as never);
    expect(outcome).toEqual({ ok: false, denied: "PROVIDER_FAILED", source: "PROVIDER" });
    expect(guard.metrics().failures).toBe(1);
    expect(guard.metrics().unknownConsumptionSettlements).toBe(1);
    // The hold did NOT come back: a timeout may still have cost tokens, so the
    // budget must not treat the failure as free.
    expect(await guard.run("s2", okCall())).toEqual({
      ok: false,
      denied: "BUDGET_EXHAUSTED",
      source: "LEDGER",
    });
  });

  it("releases the hold only when the caller knows the request never left", async () => {
    const guard = createAdvisorGuard(
      limits({ dailyTokenBudget: 3_000, reservationTokens: 2_000, maxConcurrency: 5 }),
    );
    const neverSent = async () => {
      throw new Error("refused before the send");
    };
    const outcome = await guard.run("s1", neverSent as never, () => T0, {
      onProviderFailure: "RELEASE",
    });
    expect(outcome).toEqual({ ok: false, denied: "PROVIDER_FAILED", source: "PROVIDER" });
    expect(guard.metrics().unknownConsumptionSettlements).toBe(0);
    // Nothing was sent, so nothing was spent: the budget is intact.
    expect((await guard.run("s2", okCall(1_000), () => T0)).ok).toBe(true);
  });

  it("reserves for every attempt the provider may make, not just the first", async () => {
    const failing = async () => {
      throw new Error("provider exploded");
    };
    // A single-attempt call holds 2_000; a two-attempt call holds 4_000. Both
    // settle conservatively, so what is left of the 5_000 budget differs by
    // exactly the extra attempt's hold.
    const once = createAdvisorGuard(
      limits({ dailyTokenBudget: 5_000, reservationTokens: 2_000, maxConcurrency: 5 }),
    );
    await once.run("s1", failing as never, () => T0, { attempts: 1 });
    expect((await once.run("s2", okCall(10), () => T0)).ok).toBe(true);

    const twice = createAdvisorGuard(
      limits({ dailyTokenBudget: 5_000, reservationTokens: 2_000, maxConcurrency: 5 }),
    );
    await twice.run("s1", failing as never, () => T0, { attempts: 2 });
    // 5_000 - 4_000 imputed leaves only 1_000: the retry was not free.
    expect(await twice.run("s2", okCall(10), () => T0)).toEqual({
      ok: false,
      denied: "BUDGET_EXHAUSTED",
      source: "LEDGER",
    });
  });

  it("fails closed when the ledger itself throws", async () => {
    const healthy = createInMemoryGuardrailLedger(limits());
    const broken = {
      ...healthy,
      reserve: () => {
        throw new Error("ledger down");
      },
    };
    const guard = createAdvisorGuard(limits(), broken);
    const call = vi.fn(okCall());
    const outcome = await guard.run("s1", call);
    expect(outcome).toEqual({ ok: false, denied: "GUARD_UNAVAILABLE", source: "LEDGER" });
    expect(call).not.toHaveBeenCalled();
  });
});

describe("CA8 — metrics carry no content", () => {
  it("exposes counters only, with a fixed shape", () => {
    const guard = createAdvisorGuard(limits());
    const snapshot = guard.metrics();
    expect(Object.keys(snapshot).sort()).toEqual(
      [
        "attempts",
        "denied",
        "failures",
        "inputTokens",
        "latencyMsMax",
        "latencyMsTotal",
        "reconciliationMismatches",
        "successes",
        "outputTokens",
        "unknownConsumptionSettlements",
      ].sort(),
    );
    const serialised = JSON.stringify(snapshot);
    expect(serialised).not.toMatch(/@|mensaje|reply|content/i);
  });

  it("counts denials by reason", () => {
    const ledger = createInMemoryGuardrailLedger(limits({ killSwitch: true }));
    ledger.reserve("s1", T0);
    expect(ledger.metrics().denied.KILL_SWITCH).toBe(1);
  });
});

describe("CA8 — how the emergency switch actually loads and propagates", () => {
  const withEnv = (patch: Record<string, string | undefined>, body: () => void): void => {
    const saved = { ...process.env };
    try {
      Object.assign(process.env, patch);
      body();
    } finally {
      for (const key of Object.keys(patch)) delete process.env[key];
      Object.assign(process.env, saved);
    }
  };

  it("reads the real environment, not an empty object", () => {
    // The regression this pins: `getAdvisorGuard()` used to default to `{}`, so
    // the first caller permanently installed the default limits and the
    // operator's kill switch was ignored for the life of the process.
    withEnv({ ADVISOR_KILL_SWITCH: "true" }, () => {
      __setAdvisorGuardForTests(null);
      expect(getAdvisorGuard().limits.killSwitch).toBe(true);
      __setAdvisorGuardForTests(null);
    });
  });

  it("keeps the limits it was built with: a later env change is NOT picked up", () => {
    withEnv({ ADVISOR_KILL_SWITCH: "false" }, () => {
      __setAdvisorGuardForTests(null);
      const guard = getAdvisorGuard();
      expect(guard.limits.killSwitch).toBe(false);
      process.env["ADVISOR_KILL_SWITCH"] = "true";
      // Same object, same limits: the switch takes effect on a restart/deploy,
      // never on a running process.
      expect(getAdvisorGuard().limits.killSwitch).toBe(false);
      expect(getAdvisorGuard()).toBe(guard);
      __setAdvisorGuardForTests(null);
    });
  });

  it("an explicit env argument still wins over the process environment", () => {
    withEnv({ ADVISOR_KILL_SWITCH: "true" }, () => {
      __setAdvisorGuardForTests(null);
      expect(getAdvisorGuard({ ADVISOR_KILL_SWITCH: "false" }).limits.killSwitch).toBe(false);
      __setAdvisorGuardForTests(null);
    });
  });

  it("readAdvisorLimitsFromProcessEnv reflects the process environment", () => {
    withEnv({ ADVISOR_MAX_CONCURRENCY: "7" }, () => {
      expect(readAdvisorLimitsFromProcessEnv().maxConcurrency).toBe(7);
    });
    expect(readAdvisorLimitsFromProcessEnv().maxConcurrency).toBe(
      DEFAULT_ADVISOR_LIMITS.maxConcurrency,
    );
  });
});

describe("CA8 — the limit is per process, and the code says so", () => {
  it("two guards = two full budgets (this is the limitation, demonstrated)", async () => {
    const first = createAdvisorGuard(limits({ dailyTokenBudget: 2_500, reservationTokens: 2_000 }));
    const second = createAdvisorGuard(
      limits({ dailyTokenBudget: 2_500, reservationTokens: 2_000 }),
    );

    expect((await first.run("s1", okCall(2_000))).ok).toBe(true);
    expect((await first.run("s1", okCall(2_000))).ok).toBe(false); // first process is spent
    expect((await second.run("s1", okCall(2_000))).ok).toBe(true); // the other has its own budget
  });
});
