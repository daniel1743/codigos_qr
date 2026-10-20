/**
 * CRIPQER Conversion Advisor — CA-7.4-C · the server half of the isolated host.
 *
 * SERVER-ONLY BY CONVENTION (`.ts` under `e2e/`, loaded through Vite's SSR
 * module runner, never reachable from the browser entry). It runs the REAL
 * pipeline — CA-7.1B, CA-8, CA-3, CA-4, CA-6 — and returns a CA-7.4-A
 * `AdvisorUiResponse`, or an out-of-contract payload when the scenario asks for
 * one. Nothing here reimplements a rule the pipeline already owns.
 *
 * CA-8 IS PER CONVERSATION, NOT PER TURN. Each session gets its own guard over
 * its own in-memory ledger, created once and reused for every turn of that
 * conversation — so reservations, the daily budget and the session window all
 * accumulate the way they do in production. A guard rebuilt per turn would reset
 * the budget every time and make "every call goes through CA-8" a claim with
 * nothing behind it.
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *  · It never calls `getAdvisorGuard()`. That singleton fixes its limits from
 *    the real environment for the whole process, so a browser test using it
 *    would inherit the operator's `ADVISOR_KILL_SWITCH` and the process budget.
 *  · It never passes `config: undefined`, because that makes CA-7.1B read
 *    `process.env` for a credential. The provider config is always explicit, and
 *    the key it carries is fictional and points at a domain that cannot resolve.
 *  · It never performs a real network call. The only `fetch` is the mock below,
 *    handed to CA-1 as `providerDeps.fetchImpl`.
 *
 * WHAT IT NEVER SENDS TO THE BROWSER: a `TurnOutcome`, a CA-8 metric, a session
 * id, a provider key, a stack trace or an internal guard reason. The HTTP layer
 * responds with the projected `AdvisorUiResponse` and nothing else; the call
 * counts and abort records stay in this module, where only the Node test reads
 * them — and they have no HTTP route at all.
 */

import { createAdvisorGuard, type AdvisorGuard } from "../../guardrails/guard.server";
import { createInMemoryGuardrailLedger } from "../../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS, type AdvisorLimits } from "../../guardrails/limits";
import { runConversationalTurn, startAdvisorSession } from "../../integration/turn.server";
import { projectAdvisorTurn } from "../../integration/ui-projection";
import { makeClock } from "../../preview/harness.server";
import type { AdvisorProviderConfig } from "../../provider.server";
import { __resetAllSessionsForTests } from "../../session/store.server";
import type { AdvisorE2eScenario } from "./scenarios";

/* ============================== fixtures ================================ */

/**
 * A key that is fictional, is never printed, and points at `.invalid` — a TLD
 * reserved by RFC 2606 so it can never resolve. The mock `fetch` never dials it,
 * but a mistake must not be able to reach a real host even in principle.
 */
const FICTIONAL_CONFIG: AdvisorProviderConfig = {
  apiKey: "sk-e2e-FICTIONAL-NOT-A-REAL-KEY",
  baseUrl: "https://e2e.invalid/v1",
  model: "deepseek-flash",
  timeoutMs: 5_000,
  maxOutputTokens: 400,
  maxRetries: 0,
  retryBaseDelayMs: 1,
};

/** The reply CA-4 accepts: grounded, inside its bounds, no forbidden claim. */
const SAFE_REPLY =
  "CRIPQER reúne tu información y tus enlaces en una sola página con QR. ¿Quieres que te cuente cómo se ve?";

/** A reply built to look like an attack, so the surface's rendering is tested. */
const HOSTILE_REPLY =
  '<img src=x onerror="window.__ca74c_xss=1"> <a href="https://evil.invalid/">pincha</a> <b>negrita</b>';

const listenJson = (patch: Record<string, unknown> = {}): string =>
  JSON.stringify({
    intents: ["DISCOVERY"],
    business_type: null,
    primary_goal: null,
    secondary_goals: [],
    expressed_needs: [],
    explicit_objections: [],
    current_tools: [],
    technical_familiarity: "UNKNOWN",
    purchase_readiness: "UNKNOWN",
    next_best_action: "EXPLAIN",
    confidence: 0.8,
    unknown_fields: [],
    ...patch,
  });

const adviseJson = (reply: string = SAFE_REPLY): string =>
  JSON.stringify({ reply, capability_ids: ["tarjetas_bio"], limitations: [] });

const okResponse = (content: string, usage: Record<string, unknown> = {}): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content } }], usage }), { status: 200 });

/**
 * Real usage numbers. CA-3/CA-4 read an ABSENT usage block as UNKNOWN
 * consumption, and CA-7.1B treats unknown consumption as a FAILED operation
 * rather than a free call — so the healthy fixture must report them, or it would
 * exercise the degraded path while claiming to exercise the healthy one.
 */
const USAGE_LISTEN = { prompt_tokens: 200, completion_tokens: 50 };
const USAGE_ADVISE = { prompt_tokens: 300, completion_tokens: 100 };

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/* ============================== the ledger ============================== */

export interface TurnRecord {
  readonly index: number;
  readonly scenario: string;
  readonly text: string;
  /** Provider calls this turn made. `0` is the whole point of the REFUSED case. */
  readonly providerCalls: number;
  readonly status: string;
  readonly aborted: boolean;
}

interface SessionState {
  readonly guard: AdvisorGuard;
  readonly now: () => number;
  readonly scenario: AdvisorE2eScenario;
}

let turnIndex = 0;
let turnsStarted = 0;
let providerCalls = 0;
let abortCount = 0;
let records: TurnRecord[] = [];
const sessions = new Map<string, SessionState>();
/** Per-scenario turn counters, so `fail-once` can fail once and then recover. */
const attempts = new Map<string, number>();

/**
 * Bumped by every reset. A turn in flight when the table is cleared belongs to
 * the previous generation, and its late completion must not write into the new
 * one — otherwise a test that abandons a pending turn would pollute the next
 * test's counts. Every mutation below is guarded by this.
 */
let generation = 0;

export function resetHost(): void {
  __resetAllSessionsForTests();
  generation += 1;
  turnIndex = 0;
  turnsStarted = 0;
  providerCalls = 0;
  abortCount = 0;
  records = [];
  sessions.clear();
  attempts.clear();
}

export function hostStats(): {
  readonly turns: number;
  /** Turns the host BEGAN, including one still in flight. */
  readonly turnsStarted: number;
  readonly providerCalls: number;
  readonly aborts: number;
  readonly sessions: number;
  readonly records: readonly TurnRecord[];
} {
  return {
    turns: records.length,
    turnsStarted,
    providerCalls,
    aborts: abortCount,
    sessions: sessions.size,
    records,
  };
}

export function noteAbort(): void {
  abortCount += 1;
}

/**
 * Starts a conversation and gives it its own guard. The scenario is fixed here
 * because the limits are a property of the CONVERSATION: a kill-switched advisor
 * refuses every turn of the session, not just the one that happened to ask.
 */
export function createSession(scenario: AdvisorE2eScenario): string {
  const now = makeClock();
  // The limits are a property of the CONVERSATION, so they are chosen once,
  // here. `refused` stops every turn before any call; `budget` allows exactly
  // one healthy turn (two provider requests) and denies the next, which is how
  // the accumulation across turns becomes observable from the browser.
  const limits: AdvisorLimits =
    scenario === "refused"
      ? { ...DEFAULT_ADVISOR_LIMITS, killSwitch: true }
      : scenario === "budget"
        ? { ...DEFAULT_ADVISOR_LIMITS, sessionRequestsPerWindow: 2 }
        : DEFAULT_ADVISOR_LIMITS;
  const guard = createAdvisorGuard(limits, createInMemoryGuardrailLedger(limits));
  const handle = startAdvisorSession(now()).session_id;
  sessions.set(handle, { guard, now, scenario });
  return handle;
}

/* ============================ the mock provider ========================= */

/**
 * The ONLY simulated thing in this phase. It returns scripted HTTP responses to
 * CA-1; it never opens a socket.
 */
function scriptedFetch(
  scenario: AdvisorE2eScenario,
  turnAttempt: number,
  gen: number,
): typeof fetch {
  const plan: readonly Response[] =
    scenario === "degraded"
      ? // Valid signals, NO usage → UNKNOWN consumption → the operation is
        // reported failed while its real signals are kept. That is CA-7.1B's own
        // DEGRADED path — not a 500, which yields fallback signals and FALLBACK.
        [okResponse(listenJson(), {}), okResponse(adviseJson(), USAGE_ADVISE)]
      : scenario === "hostile"
        ? [
            okResponse(listenJson(), USAGE_LISTEN),
            okResponse(adviseJson(HOSTILE_REPLY), USAGE_ADVISE),
          ]
        : scenario === "help"
          ? // A real OFFER_HELP proposal: CA-3's vocabulary → CA-5's registry →
            // CA-10B's closed action. Nothing here injects an action.
            [
              okResponse(listenJson({ next_best_action: "OFFER_HELP" }), USAGE_LISTEN),
              okResponse(adviseJson(), USAGE_ADVISE),
            ]
          : [okResponse(listenJson(), USAGE_LISTEN), okResponse(adviseJson(), USAGE_ADVISE)];

  let call = 0;
  return (async (_input: unknown, init?: RequestInit) => {
    // A call from a previous generation belongs to an abandoned test.
    if (gen === generation) providerCalls += 1;

    if (scenario === "slow") {
      // Waits for the abort, then rejects with it — the honest end of a
      // cancelled request. Never resolves on its own, which is what lets the
      // browser observe a turn that is genuinely in flight.
      return await new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) return reject(signal.reason);
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    }

    if (scenario === "delayed-answer") {
      // Deliberately IGNORES the abort: the turn finishes after the browser has
      // already cancelled it, so the surface meets a genuinely late answer and
      // must not turn its ERROR into an ANSWERED.
      await sleep(2_500);
      const late = plan[0];
      if (late === undefined) throw new Error("CA7_4C_E2E: no scripted response");
      return late;
    }

    const step = plan[Math.min(call, plan.length - 1)];
    call += 1;

    if (step === undefined) throw new Error("CA7_4C_E2E: no scripted response");
    const signal = init?.signal;
    if (signal?.aborted) throw signal.reason;
    return step;
  }) as typeof fetch;
}

/* ============================== the turn ================================ */

export interface TurnRequest {
  readonly text: string;
  readonly scenario: AdvisorE2eScenario;
  readonly handle: string;
}

export interface TurnResult {
  /** The HTTP status the host should answer with. */
  readonly status: number;
  /** The body to send: a validated contract response, or a deliberate violation. */
  readonly body: unknown;
}

/**
 * Runs one real turn and projects it. The returned body is what the browser
 * receives — and for `malformed` it is deliberately NOT a valid response, so the
 * surface's own validation is what has to catch it.
 */
export async function runTurn(request: TurnRequest): Promise<TurnResult> {
  const { text, scenario, handle } = request;
  const gen = generation;
  const turnAttempt = attempts.get(scenario) ?? 0;
  attempts.set(scenario, turnAttempt + 1);

  // The transport itself failing is not a pipeline outcome: the host answers
  // 5xx and the surface must turn that into ERROR on its own. `recover` fails
  // only its FIRST turn, so a manual retry has something that can succeed.
  if (scenario === "transport-error" || (scenario === "recover" && turnAttempt === 0)) {
    if (gen === generation) {
      turnsStarted += 1;
      records.push({
        index: (turnIndex += 1),
        scenario,
        text,
        providerCalls: 0,
        status: "TRANSPORT_ERROR",
        aborted: false,
      });
    }
    return { status: 500, body: { error: "transport failed" } };
  }

  // A payload outside the contract, returned with a 200 so that nothing but the
  // surface's validator stands between it and the DOM. It smuggles a session id,
  // a non-empty `actions`, and an unknown key.
  if (scenario === "malformed") {
    if (gen === generation) {
      turnsStarted += 1;
      records.push({
        index: (turnIndex += 1),
        scenario,
        text,
        providerCalls: 0,
        status: "MALFORMED",
        aborted: false,
      });
    }
    return {
      status: 200,
      body: {
        version: 1,
        status: "ANSWERED",
        message: "Esta carga no cumple el contrato y no debe renderizarse.",
        notice: null,
        actions: [{ kind: "NAVIGATE", href: "https://evil.invalid/" }],
        conversation: null,
        session_id: handle,
      },
    };
  }

  const session = sessions.get(handle);
  const now = session?.now ?? makeClock();
  // An unknown handle still runs, so CA-6 refuses it honestly as SESSION_UNKNOWN
  // — which is how the test shows that a restarted host loses the conversation.
  const guard =
    session?.guard ??
    createAdvisorGuard(
      DEFAULT_ADVISOR_LIMITS,
      createInMemoryGuardrailLedger(DEFAULT_ADVISOR_LIMITS),
    );

  // Counted at the START, not at the end: a turn that is still in flight — or
  // one the browser cancels — has still been begun, and a test that counted only
  // completed turns could not tell "one send accepted" from "none reached here".
  if (gen === generation) turnsStarted += 1;

  const before = providerCalls;
  // `fallback` is the only scenario with no provider: CA-7.1B's own "not
  // configured" branch, which makes NOT ONE reservation because there is no call
  // to authorise.
  const config = scenario === "fallback" ? null : FICTIONAL_CONFIG;

  const run = await runConversationalTurn(
    { sessionId: handle, message: text },
    {
      config,
      guard,
      providerDeps: {
        fetchImpl: scriptedFetch(scenario, turnAttempt, gen),
        now,
        sleep: async () => {},
      },
      now,
    },
  );

  const body = run.ok
    ? projectAdvisorTurn({ kind: "turn", outcome: run.outcome })
    : projectAdvisorTurn({ kind: "refusal", reason: run.reason });

  // A turn abandoned by a finished test belongs to a previous generation and is
  // dropped here, so its late completion cannot be read as the next test's.
  if (gen === generation) {
    records.push({
      index: (turnIndex += 1),
      scenario,
      text,
      providerCalls: providerCalls - before,
      status: run.ok ? body.status : run.reason,
      aborted: false,
    });
  }

  return { status: 200, body };
}
