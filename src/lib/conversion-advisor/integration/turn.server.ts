/**
 * CRIPQER Conversion Advisor — CA-7.1B · the guarded conversational turn.
 *
 * ONE entry point, server-only, that runs a complete turn — understand (CA-3),
 * then advise (CA-4) — with an INDEPENDENT CA-8 reservation in front of each
 * provider call. The invariant this file exists to hold:
 *
 *   EVERY PROVIDER CALL IS PRECEDED BY AN AUTHORISED RESERVATION,
 *   INCLUDING THE RETRIES INSIDE THAT CALL.
 *
 * Three things make that true rather than aspirational:
 *
 *  1. The reservation is taken BEFORE the operation runs, so there is no window
 *     in which a call can start unguarded.
 *  2. `attempts` is read from CA-1's EFFECTIVE configuration (`1 + maxRetries`),
 *     so a retry inside the provider reserves its own possible consumption
 *     instead of riding free on the first attempt's hold.
 *  3. An operation whose consumption cannot be established (`UNKNOWN`) is made
 *     to look like a FAILURE to the guard, never like a success with a
 *     fabricated number — a "0 tokens" success would reconcile the hold away
 *     and a timeout would cost nothing. `NOT_INVOKED` never reaches the guard
 *     at all: every path that produces it is refused before a reservation is
 *     requested, so nothing is ever charged for a call that did not happen.
 *
 * Nothing is imported from the landing, the Guest Editor or any route: this
 * module is a seam, not a surface. It does not decide actions either — CA-5's
 * allowlist and CA-4's own `decideAction` remain the only authorities.
 */

import { adviseFromSignals, type AdviseOutcome } from "../advisor/orchestrator.server";
import { fallbackResponse, type AdvisorResponse } from "../advisor/response";
import { decideAction } from "../advisor/strategy";
import { getAdvisorGuard, type AdvisorGuard, type CallResult } from "../guardrails/guard.server";
import { type DenialReason } from "../guardrails/ledger.server";
import {
  listenWithUsage,
  type ListenOutcome,
  type ListenUsage,
  type ListeningContext,
} from "../intents/classifier.server";
import { unknownSignals } from "../intents/contract";
import { resolveDeterministicSignals } from "../intents/deterministic";
import {
  readAdvisorProviderConfig,
  type AdvisorDeps,
  type AdvisorEnv,
  type AdvisorProviderConfig,
} from "../provider.server";
import { mergeTurn, SESSION_LIMITS, toListeningContext } from "../session/context";
import { createSession, getSession, saveContext } from "../session/store.server";
import {
  validateTurnRequest,
  type TurnFailureReason,
  type TurnOperationReport,
  type TurnOutcome,
} from "./contract";
import { emitAdvisorEvent, type AdvisorLogger } from "./observability.server";

/* ============================== session ================================= */

export interface AdvisorSessionHandle {
  readonly session_id: string;
  readonly turns_remaining: number;
}

/**
 * Opens a conversation's memory (CA-6). An id identifies a CONVERSATION and
 * nothing else: it is not proof of authorization, and CA-5 remains the only
 * thing that decides what may happen.
 */
export function startAdvisorSession(now: number = Date.now()): AdvisorSessionHandle {
  const session = createSession(now);
  return { session_id: session.id, turns_remaining: SESSION_LIMITS.maxTurnsTotal };
}

/* ============================ attempt budget ============================ */

/**
 * How many provider calls ONE operation may make.
 *
 * CA-1 runs `for (attempt = 0; attempt <= maxRetries; attempt += 1)`, so a
 * single logical operation is up to `1 + maxRetries` real calls — and each of
 * them can bill. The value is read from the EFFECTIVE config (CA-1 has already
 * defaulted and clamped it), never from a raw environment variable, so the
 * budget follows what the provider will really do if the operator changes it.
 */
export function effectiveAttempts(config: AdvisorProviderConfig): number {
  return 1 + Math.max(0, Math.floor(config.maxRetries));
}

/* ============================ the adapter ============================== */

/**
 * Thrown INSIDE a guarded call when the operation was attempted but its
 * consumption cannot be established.
 *
 * It travels through `guard.run`'s failure branch on purpose: that branch
 * charges the hold (`settleUnknown`) instead of reconciling a number nobody
 * measured. Returning "success" with 0/0 here is exactly the CA-8.1 defect in
 * which a timeout cost nothing and the daily ceiling stopped being a ceiling.
 */
class UnknownConsumptionError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`advisor consumption unknown: ${reason}`);
    this.name = "UnknownConsumptionError";
    this.reason = reason;
  }
}

/** What a guarded operation hands back to the guard: value + usage + latency. */
interface GuardedCallResult<T> extends CallResult {
  readonly value: T;
}

export type GuardedOperation<T> =
  | { readonly ok: true; readonly value: T; readonly report: TurnOperationReport }
  | {
      readonly ok: false;
      /** `LEDGER` = no reservation was granted. `PROVIDER` = it was granted and
       *  the call then failed or reported no usage. */
      readonly source: "LEDGER" | "PROVIDER";
      readonly denied: DenialReason | null;
      /** The specific cause, kept OUT OF BAND because the guard's failure
       *  branch flattens every provider error into `"PROVIDER_FAILED"`. */
      readonly reason: string;
      /** Always present: on failure it is the safe value CA-3/CA-4 already
       *  built, so the caller never has to reconstruct one. */
      readonly value: T;
      readonly report: TurnOperationReport;
    };

interface GuardedOperationOptions<T> {
  readonly guard: AdvisorGuard;
  readonly sessionKey: string;
  readonly attempts: number;
  readonly now: () => number;
  /**
   * Runs the operation ONCE and hands back its value plus the three-state usage
   * CA-3/CA-4 report. The caller adapts its own outcome shape here (`{ signals,
   * usage }` / `{ response, usage }`), so this module never reaches into the
   * internals of either operation to find the usage.
   */
  readonly call: () => Promise<{ readonly value: T; readonly usage: ListenUsage }>;
  /** Reads the real cause from the degraded value the operation already built. */
  readonly describeFailure: (value: T) => string | null;
  /** The value to use when the guard refused before the call could run. */
  readonly fallback: (reason: string) => T;
}

async function runGuardedOperation<T>(
  options: GuardedOperationOptions<T>,
): Promise<GuardedOperation<T>> {
  const { guard, sessionKey, attempts, now, call, describeFailure, fallback } = options;
  const startedAt = now();

  let degraded: T | null = null;
  let failureReason: string | null = null;

  const outcome = await guard.run<GuardedCallResult<T>>(
    sessionKey,
    async () => {
      const raw = await call();
      const latencyMs = Math.max(0, now() - startedAt);

      if (raw.usage.status === "REPORTED") {
        // The only branch that may reconcile: the numbers were measured.
        return { value: raw.value, usage: raw.usage.usage, latencyMs };
      }

      degraded = raw.value;
      failureReason =
        raw.usage.status === "UNKNOWN"
          ? (describeFailure(raw.value) ?? "USAGE_UNKNOWN")
          : "NOT_INVOKED_INSIDE_GUARD";
      throw new UnknownConsumptionError(failureReason);
    },
    now,
    { attempts, onProviderFailure: "CONSERVATIVE" },
  );

  if (outcome.ok) {
    return {
      ok: true,
      value: outcome.value.value,
      report: {
        reservation: "GRANTED",
        denied_reason: null,
        usage: { status: "REPORTED", usage: outcome.usage },
        latency_ms: outcome.latencyMs,
        attempts_reserved: attempts,
        failure_reason: null,
      },
    };
  }

  if (outcome.source === "LEDGER") {
    // Refused BEFORE the call: no provider latency is reported, because no
    // provider call happened. The denial is reported as a denial, and the usage
    // as NOT_INVOKED, without either being inferred from the other.
    const reason = `GUARD_DENIED:${outcome.denied}`;
    return {
      ok: false,
      source: "LEDGER",
      denied: outcome.denied,
      reason,
      value: fallback(reason),
      report: {
        reservation: "DENIED",
        denied_reason: outcome.denied,
        usage: { status: "NOT_INVOKED" },
        latency_ms: null,
        attempts_reserved: attempts,
        failure_reason: null,
      },
    };
  }

  const reason = failureReason ?? "PROVIDER_FAILED";
  return {
    ok: false,
    source: "PROVIDER",
    denied: null,
    reason,
    value: degraded ?? fallback(reason),
    report: {
      reservation: "GRANTED",
      denied_reason: null,
      // The call happened and its cost is unknown — never reported as a zero.
      usage: { status: "UNKNOWN" },
      latency_ms: Math.max(0, now() - startedAt),
      attempts_reserved: attempts,
      failure_reason: reason,
    },
  };
}

/* ============================== the turn =============================== */

export interface TurnDeps {
  /**
   * `undefined` (or absent) reads the REAL process environment; an explicit
   * `null` means "not configured", which makes no call and asks for no
   * reservation. The two are different on purpose: one is a deployment fact,
   * the other is a caller's decision.
   */
  readonly config?: AdvisorProviderConfig | null;
  readonly guard?: AdvisorGuard;
  readonly providerDeps?: AdvisorDeps;
  readonly now?: () => number;
  /**
   * CA-12. `"on"` lets the FIRST turn of a conversation skip the understanding
   * provider call when `resolveDeterministicSignals` proves the intent locally.
   * Default `"off"`: the canonical two-call pipeline, which is what the
   * evaluation harness and every internal caller keep using, and what a
   * rollback returns to without touching the routes.
   */
  readonly fastPath?: "on" | "off";
  /**
   * CONV-02. Where advisor events go. Absent uses the module's console sink; a
   * test injects a recorder. A sink that throws cannot fail the turn.
   */
  readonly logger?: AdvisorLogger;
}

export type TurnRun =
  | { readonly ok: true; readonly outcome: TurnOutcome }
  | { readonly ok: false; readonly reason: TurnFailureReason; readonly detail: string };

function idleReport(): TurnOperationReport {
  return {
    reservation: "NOT_REQUESTED",
    denied_reason: null,
    usage: { status: "NOT_INVOKED" },
    latency_ms: null,
    attempts_reserved: 0,
    failure_reason: null,
  };
}

function readProviderConfigFromProcessEnv(): AdvisorProviderConfig | null {
  // Every key is copied explicitly: `process.env` is an index-signature object
  // and is not structurally safe to hand to a closed interface.
  const env = process.env;
  const keys: AdvisorEnv = {
    DEEPSEEK_API_KEY: env["DEEPSEEK_API_KEY"],
    DEEPSEEK_BASE_URL: env["DEEPSEEK_BASE_URL"],
    DEEPSEEK_MODEL: env["DEEPSEEK_MODEL"],
    ADVISOR_MODEL: env["ADVISOR_MODEL"],
    ADVISOR_TIMEOUT_MS: env["ADVISOR_TIMEOUT_MS"],
    ADVISOR_MAX_OUTPUT_TOKENS: env["ADVISOR_MAX_OUTPUT_TOKENS"],
    ADVISOR_MAX_RETRIES: env["ADVISOR_MAX_RETRIES"],
  };
  return readAdvisorProviderConfig(keys);
}

/**
 * Runs one complete conversational turn.
 *
 * Order is the guarantee: validate → resolve the session → resolve the provider
 * → reserve → call, twice, each with its own hold. Every refusal happens before
 * anything can spend, so a refused turn is free BY CONSTRUCTION rather than by
 * careful accounting afterwards.
 */
export async function runConversationalTurn(input: unknown, deps: TurnDeps = {}): Promise<TurnRun> {
  // 0. Bound the input before anything else can act on it.
  const validation = validateTurnRequest(input);
  if (!validation.ok) {
    emitAdvisorEvent(
      "advisor.turn.refused",
      { reason: validation.reason },
      deps.logger,
      deps.now ?? Date.now,
    );
    return { ok: false, reason: validation.reason, detail: validation.detail };
  }
  const { sessionId, message, landingContext } = validation.request;

  const now = deps.now ?? (() => Date.now());
  const providerDeps = deps.providerDeps ?? {};

  emitAdvisorEvent(
    "advisor.turn.received",
    {
      landing_slot: landingContext?.expectedSlot ?? null,
      landing_ready: landingContext === null ? null : landingContext.readyForPage,
      fast_path: deps.fastPath === "on",
    },
    deps.logger,
    now,
  );

  // 1. The conversation's memory. An unknown id and an expired one are
  //    indistinguishable here, exactly as CA-6 defines them.
  const session = getSession(sessionId, now());
  if (session === null) {
    emitAdvisorEvent("advisor.turn.refused", { reason: "SESSION_UNKNOWN" }, deps.logger, now);
    return { ok: false, reason: "SESSION_UNKNOWN", detail: "La sesión no existe o caducó." };
  }

  // 2. The turn budget, checked BEFORE the call. CA-6 also refuses at save
  //    time, but by then the provider would already have been paid for a turn
  //    that cannot be kept; refusing here means the limit costs nothing.
  const turnsUsed = session.context.turns_total;
  if (turnsUsed >= SESSION_LIMITS.maxTurnsTotal) {
    emitAdvisorEvent(
      "advisor.turn.refused",
      { reason: "TURN_LIMIT_REACHED", turns_used: turnsUsed },
      deps.logger,
      now,
    );
    return {
      ok: false,
      reason: "TURN_LIMIT_REACHED",
      detail: "Esta conversación llegó a su límite de turnos. Inicia una nueva.",
    };
  }

  // 3. Which provider, if any. A misconfigured one is refused here rather than
  //    inside the call, so no reservation is ever made for it.
  let config: AdvisorProviderConfig | null;
  try {
    config = deps.config === undefined ? readProviderConfigFromProcessEnv() : deps.config;
  } catch {
    emitAdvisorEvent(
      "advisor.turn.refused",
      { reason: "PROVIDER_MISCONFIGURED" },
      deps.logger,
      now,
    );
    return {
      ok: false,
      reason: "PROVIDER_MISCONFIGURED",
      detail: "El asesor no está disponible ahora mismo.",
    };
  }

  const listeningContext: ListeningContext = toListeningContext(session.context, message);
  const model = config === null ? null : config.model;
  const totalStartedAt = now();

  // 4. Not configured: CA-4's own safe reply, and NOT ONE reservation. There is
  //    no provider call, so there is nothing to authorise — asking the guard
  //    would charge the budget for a call that cannot happen.
  if (config === null) {
    const signals = unknownSignals("PROVIDER_NOT_CONFIGURED");
    const advised = await adviseFromSignals(
      signals,
      listeningContext,
      null,
      providerDeps,
      landingContext,
    );
    emitAdvisorEvent(
      "advisor.turn.unconfigured",
      { model: null, turns_used: turnsUsed },
      deps.logger,
      now,
    );
    return {
      ok: true,
      outcome: {
        session_id: sessionId,
        model: null,
        response: advised.response,
        degraded: true,
        degraded_reason: "PROVIDER_NOT_CONFIGURED",
        understanding: idleReport(),
        commercial_advice: idleReport(),
        latency_ms: {
          understanding: null,
          commercial_advice: null,
          total: Math.max(0, now() - totalStartedAt),
        },
        session: {
          turns_used: turnsUsed,
          turns_remaining: SESSION_LIMITS.maxTurnsTotal - turnsUsed,
        },
        persisted: false,
      },
    };
  }

  const guard = deps.guard ?? getAdvisorGuard();
  // One key per conversation: the session rate window counts PROVIDER CALLS for
  // this visitor, which is what CA-8 means by a per-session limit. Namespaced
  // so a future shared ledger cannot collide with another subsystem's keys.
  const sessionKey = `advisor:${sessionId}`;
  const attempts = effectiveAttempts(config);

  // 5. UNDERSTANDING — its own reservation, held before its own call.
  //
  //    CA-12 FAST PATH. On the FIRST turn only, a message whose intent a local
  //    rule proves (an instruction aimed at the model, an explicit price
  //    question, an explicit creation request) needs no interpreter. The
  //    deterministic resolution produces the SAME signal vocabulary, so CA-4,
  //    CA-5 and CA-8 below run unchanged; only the understanding reservation and
  //    call are absent, because there is nothing to authorise — no provider call
  //    happens. `deterministic: true` records that distinction instead of
  //    pretending a reservation was granted.
  const deterministic =
    deps.fastPath === "on" && turnsUsed === 0 ? resolveDeterministicSignals(message) : null;

  const understanding: GuardedOperation<ListenOutcome> =
    deterministic === null
      ? await runGuardedOperation<ListenOutcome>({
          guard,
          sessionKey,
          attempts,
          now,
          call: async () => {
            const outcome = await listenWithUsage(listeningContext, config, providerDeps);
            return { value: outcome, usage: outcome.usage };
          },
          describeFailure: (value) => value.signals.fallback_reason,
          fallback: (reason) => ({
            signals: unknownSignals(reason),
            usage: { status: "NOT_INVOKED" },
          }),
        })
      : {
          ok: true,
          value: { signals: deterministic.signals, usage: { status: "NOT_INVOKED" } },
          report: {
            reservation: "NOT_REQUESTED",
            denied_reason: null,
            usage: { status: "NOT_INVOKED" },
            latency_ms: null,
            attempts_reserved: 0,
            failure_reason: null,
            deterministic: true,
          },
        };

  const signals = understanding.value.signals;

  // 6. COMMERCIAL ADVICE — a SECOND, INDEPENDENT reservation, built from the
  //    signals already obtained. CA-3 is never run again: the understanding is
  //    the step above, and re-running it would be a duplicated call.
  //
  //    It runs even when the understanding FAILED, which is CA-4's own
  //    behaviour (`adviseVisitor` knows nothing about the listening step's
  //    trouble and simply proceeds with the safe signals). A LEDGER refusal, by
  //    contrast, stops the turn: nothing was authorised, so nothing may be
  //    attempted. That is the ONLY case that skips the commercial step, and it
  //    is exactly when `understanding` is the failure variant carrying a reason.
  const commercial =
    understanding.ok || understanding.source === "PROVIDER"
      ? await runGuardedOperation<AdviseOutcome>({
          guard,
          sessionKey,
          attempts,
          now,
          call: async () => {
            const outcome = await adviseFromSignals(
              signals,
              listeningContext,
              config,
              providerDeps,
              landingContext,
            );
            return { value: outcome, usage: outcome.usage };
          },
          describeFailure: (value) => value.response.limitations[0] ?? null,
          fallback: (reason) => ({
            response: fallbackResponse(signals, reason, decideAction(signals).action),
            usage: { status: "NOT_INVOKED" },
          }),
        })
      : null;

  const response: AdvisorResponse =
    commercial === null
      ? // Reached only when the understanding was refused by the ledger, so the
        // failure variant is the one in hand and its reason is the real cause.
        fallbackResponse(
          signals,
          understanding.ok ? "GUARD_DENIED" : understanding.reason,
          decideAction(signals).action,
        )
      : commercial.value.response;

  const understandingLatency = understanding.report.latency_ms;
  const commercialLatency = commercial === null ? null : commercial.report.latency_ms;

  // CONV-02 · observability. One event per guarded operation, one per ledger
  // refusal, and the turn's own outcome. Every payload goes through the
  // allowlist in `observability.server.ts`: the message, the reply, a provider
  // body, a header, a key, the session id and the denial's reason are not
  // fields it can emit, so none of them can reach a log from here.
  emitAdvisorEvent(
    "advisor.understanding.completed",
    {
      model,
      reservation: understanding.report.reservation,
      usage_status: understanding.report.usage.status,
      attempts_reserved: understanding.report.attempts_reserved,
      latency_ms: understanding.report.latency_ms,
      fast_path: understanding.report.deterministic === true,
      status: understanding.ok ? "OK" : "DEGRADED",
    },
    deps.logger,
    now,
  );
  if (commercial !== null) {
    emitAdvisorEvent(
      "advisor.advice.completed",
      {
        model,
        reservation: commercial.report.reservation,
        usage_status: commercial.report.usage.status,
        attempts_reserved: commercial.report.attempts_reserved,
        latency_ms: commercial.report.latency_ms,
        intents: signals.intents,
        status: commercial.ok ? "OK" : "DEGRADED",
      },
      deps.logger,
      now,
    );
  }
  if (!understanding.ok && understanding.source === "LEDGER") {
    emitAdvisorEvent("advisor.guard.denied", { status: "DENIED" }, deps.logger, now);
  }
  if (commercial !== null && !commercial.ok && commercial.source === "LEDGER") {
    emitAdvisorEvent("advisor.guard.denied", { status: "DENIED" }, deps.logger, now);
  }

  /**
   * Why the turn is degraded, or `null` when it ran as designed.
   *
   * A reply that fell back because the VALIDATOR rejected the model's answer is
   * NOT degradation: that is the safety system working, and the provider was
   * consulted and settled normally.
   */
  let degradedReason: string | null = null;
  if (!understanding.ok) {
    degradedReason =
      understanding.source === "LEDGER"
        ? understanding.reason
        : `UNDERSTANDING_FAILED:${understanding.reason}`;
  } else if (commercial !== null && !commercial.ok) {
    degradedReason =
      commercial.source === "LEDGER" ? commercial.reason : `COMMERCIAL_FAILED:${commercial.reason}`;
  }

  // 7. Persist only a turn that was really understood. A refused turn learned
  //    nothing, so writing it would invent a conversation that did not happen.
  //    A deterministic understanding was not a provider consultation, but it
  //    DID produce the signals and the reply this turn is built on, so its
  //    memory must be kept exactly like a consulted turn's.
  const consulted =
    understanding.report.reservation === "GRANTED" || understanding.report.deterministic === true;
  const merged = mergeTurn(session.context, {
    userMessage: message,
    assistantMessage: response.reply,
    signals,
  });
  const persisted = consulted && saveContext(sessionId, merged, now()).ok;
  const turnsAfter = persisted ? merged.turns_total : turnsUsed;

  if (degradedReason !== null) {
    emitAdvisorEvent(
      "advisor.turn.degraded",
      { model, reason: degradedReason, status: "DEGRADED" },
      deps.logger,
      now,
    );
  }
  emitAdvisorEvent(
    "advisor.turn.completed",
    {
      model,
      latency_ms: Math.max(0, now() - totalStartedAt),
      turns_used: turnsAfter,
      turns_remaining: SESSION_LIMITS.maxTurnsTotal - turnsAfter,
      persisted,
      degraded: degradedReason !== null,
      intents: signals.intents,
    },
    deps.logger,
    now,
  );

  return {
    ok: true,
    outcome: {
      session_id: sessionId,
      model,
      response,
      degraded: degradedReason !== null,
      degraded_reason: degradedReason,
      understanding: understanding.report,
      commercial_advice: commercial === null ? idleReport() : commercial.report,
      latency_ms: {
        understanding: understandingLatency,
        commercial_advice: commercialLatency,
        total: Math.max(0, now() - totalStartedAt),
      },
      session: {
        turns_used: turnsAfter,
        turns_remaining: SESSION_LIMITS.maxTurnsTotal - turnsAfter,
      },
      persisted,
    },
  };
}
