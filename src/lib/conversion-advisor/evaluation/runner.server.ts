/**
 * CRIPQER Conversion Advisor — CA-9A · the real-provider evaluation harness.
 *
 * SERVER-SIDE ONLY (`.server.ts`). This is the seam the brief asks for: the
 * whole evaluation runs through the REAL pipeline —
 *
 *   CA-7.1B (guarded turn) → CA-8 (reservations) → CA-3 (understanding)
 *   → CA-4 (advice) → CA-6 (memory) → CA-7.4-A (projection)
 *
 * — and the ONLY thing CA-9B changes to go live is the injected `fetchImpl`.
 * There is no second classifier, no second advisor, no copy of the catalog and
 * no second memory here; a run reimplements nothing.
 *
 * WHAT IT GUARANTEES STRUCTURALLY:
 *   · The provider call is SERVER-SIDE by construction. This module runs in Node;
 *     nothing here is importable from a browser bundle (the `.server.ts` suffix
 *     and the server-only imports enforce it, and `isolation.test.ts` pins it).
 *   · The API key never reaches a DOM. It lives in the `AdvisorProviderConfig`
 *     the caller injects; this module never reads it, logs it or returns it.
 *   · Every response is validated as an `AdvisorUiResponse` before it counts, so
 *     a contract break is a MEASURED fact, not an assumption.
 *   · The output is stored through an injected `EvaluationStore` — locally, by
 *     default in memory, optionally as JSON on disk. Nothing is written anywhere
 *     the advisor itself could write.
 *
 * WHAT IT DOES NOT DO: it never calls a real provider on its own. With no
 * `providerDeps`, the transport is the mock. `real_provider_authorized` is false
 * for CA-9A, and going live is CA-9B's deliberate, budgeted act.
 */

import { REFUSAL_MESSAGES } from "../integration/ui-state";
import { validateAdvisorUiResponse } from "../integration/ui-contract";
import { projectAdvisorTurn } from "../integration/ui-projection";
import { runConversationalTurn, startAdvisorSession, type TurnRun } from "../integration/turn.server";
import { createAdvisorGuard, type AdvisorGuard } from "../guardrails/guard.server";
import { createInMemoryGuardrailLedger } from "../guardrails/ledger.server";
import { DEFAULT_ADVISOR_LIMITS, type AdvisorLimits } from "../guardrails/limits";
import type { AdvisorDeps, AdvisorProviderConfig } from "../provider.server";
import { __resetAllSessionsForTests } from "../session/store.server";
import {
  APPROVED_ADVISOR_BUDGET_PROFILE,
  evaluateHardCostCap,
  HARD_COST_CAP_STOP_REASON,
  requestUpperBoundUsd,
  resolveCampaignLimits,
  type AdvisorBudgetProfile,
  type HardCostCapDecision,
} from "./budget-profile";
import {
  addConsumption,
  computeCostBudget,
  createCostAccumulator,
  isOverBudget,
  PROVIDER_OPERATIONS_PER_TURN,
  type CostAccumulator,
  type CostBudget,
} from "./cost";
import { evaluateMemory, type MemoryReport } from "./memory";
import { mockDeps, MOCK_CONFIG } from "./mock-transport.server";
import { DEFAULT_RATE_BAND, pricingForModel, type AdvisorRateBand } from "./pricing";
import { scoreCase } from "./scorer";
import { evaluateStopConditions, type RunSummary, type StopVerdict } from "./stop-conditions";
import {
  addReportedRequestUsd,
  addUnknownRequestUsd,
  createUsdCostAccumulator,
  usdCostTotal,
  type UsdCostAccumulator,
} from "./usd-cost";
import type { CaseScore, EvaluationCase, TurnConsumption, TurnObservation } from "./types";

/* ============================== the store =============================== */

export interface EvaluationStore {
  save(result: DatasetRunResult): Promise<void> | void;
}

/** In-memory store: the default for local runs and tests. */
export function createMemoryStore(): EvaluationStore & { readonly result: DatasetRunResult | null } {
  let held: DatasetRunResult | null = null;
  return {
    get result() {
      return held;
    },
    save(result) {
      held = result;
    },
  };
}

/**
 * A local JSON store. It writes ONE file under a directory the caller names; it
 * never touches a database, a bucket or a route. CA-9B points this at a scratch
 * directory.
 */
export function createJsonFileStore(directory: string, fileName = "ca9b-run.json"): EvaluationStore {
  return {
    async save(result) {
      const { mkdir, writeFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, fileName), JSON.stringify(result, null, 2), "utf8");
    },
  };
}

/* ============================== observations =========================== */

function usageStatusOf(run: TurnRun): TurnConsumption["usage_status"] {
  if (!run.ok) return "NOT_INVOKED";
  const statuses = [run.outcome.understanding.usage.status, run.outcome.commercial_advice.usage.status];
  if (statuses.includes("UNKNOWN")) return "UNKNOWN";
  if (statuses.includes("REPORTED")) return "REPORTED";
  return "NOT_INVOKED";
}

function tokensOf(run: TurnRun): { input: number; output: number } {
  if (!run.ok) return { input: 0, output: 0 };
  let input = 0;
  let output = 0;
  for (const report of [run.outcome.understanding, run.outcome.commercial_advice]) {
    if (report.usage.status === "REPORTED") {
      input += report.usage.usage.inputTokens;
      output += report.usage.usage.outputTokens;
    }
  }
  return { input, output };
}

/** Builds the observation for a turn that produced an outcome, or a refusal. */
function observationOf(run: TurnRun, providerCalls: number): TurnObservation {
  const tokens = tokensOf(run);
  const consumption: TurnConsumption = {
    provider_calls: providerCalls,
    input_tokens: tokens.input,
    output_tokens: tokens.output,
    usage_status: usageStatusOf(run),
  };

  if (!run.ok) {
    // The turn was refused before an answer could exist. The reply a visitor
    // reads comes from the refusal table; the state is REFUSED, not FALLBACK.
    return {
      reply: REFUSAL_MESSAGES[run.reason],
      detected_intents: [],
      relevant_capability_ids: [],
      suggested_action: "NONE",
      grounding_status: "FALLBACK",
      limitations: [],
      degraded: true,
      refused: true,
      error: false,
      consumption,
    };
  }

  return {
    reply: run.outcome.response.reply,
    detected_intents: run.outcome.response.detected_intents,
    relevant_capability_ids: run.outcome.response.relevant_capability_ids,
    suggested_action: run.outcome.response.suggested_action,
    grounding_status: run.outcome.response.grounding_status,
    limitations: run.outcome.response.limitations,
    degraded: run.outcome.degraded,
    refused: false,
    error: false,
    consumption,
  };
}

/* ================================ the run =============================== */

export interface RunOptions {
  /** The provider config. Defaults to the fictional mock config. */
  readonly config?: AdvisorProviderConfig | null;
  /** The transport and clock. Defaults to the mock transport. */
  readonly providerDeps?: AdvisorDeps;
  /**
   * Guard limits. Defaults to the approved campaign limits.
   *
   * CA-9C: supplying this object no longer resets the token budget to the
   * process default. `resolveCampaignLimits` honours an explicitly smaller
   * `dailyTokenBudget`, clamps a larger one to the approved cap, and treats a
   * value equal to `DEFAULT_ADVISOR_LIMITS.dailyTokenBudget` as "no opinion" —
   * see its comment for why that last case is the one that broke CA-9B's replay.
   */
  readonly limits?: AdvisorLimits;
  /** A guard to reuse across runs (for a shared process budget). */
  readonly guard?: AdvisorGuard;
  /** Reset the CA-6 session store before the run. Defaults to true locally. */
  readonly resetSessions?: boolean;
  readonly store?: EvaluationStore;
  /**
   * The approved budget profile the campaign runs under. Defaults to the
   * owner-approved profile. A caller may pass a TIGHTER profile; the caps of a
   * wider one are not honoured here — `resolveAdvisorBudgetProfile` is where a
   * widening request is clamped and reported.
   */
  readonly budgetProfile?: AdvisorBudgetProfile | undefined;
  /** Band used to price consumption. Defaults to the conservative PEAK. */
  readonly rateBand?: AdvisorRateBand | undefined;
  /**
   * Consulted BEFORE every provider call of a case. This is the executable hard
   * USD cap: a `false` decision stops the case and the campaign, and the reason
   * is preserved in the result.
   */
  readonly costGate?: (() => HardCostCapDecision) | undefined;
  /** Called after each settled turn, with what that turn consumed. */
  readonly onTurnSettled?: ((observation: TurnObservation) => void) | undefined;
}

export interface CaseRun {
  readonly case_id: string;
  readonly observations: readonly TurnObservation[];
  readonly contract_ok: boolean;
  readonly contract_problems: readonly string[];
  readonly provider_calls: number;
  readonly max_calls_in_one_turn: number;
  /** True when the cost gate refused a turn, so its remaining turns were not sent. */
  readonly stopped_by_cost_gate: boolean;
}

export interface ScoredCase {
  readonly case_id: string;
  readonly category: EvaluationCase["category"];
  readonly score: CaseScore;
  readonly memory: MemoryReport | null;
}

/** Why a run stopped early. `null` means the dataset was exhausted. */
export type CampaignStopReason = typeof HARD_COST_CAP_STOP_REASON | "BUDGET_EXHAUSTED";

export interface DatasetRunResult {
  readonly cases: readonly ScoredCase[];
  readonly summary: RunSummary;
  readonly verdict: StopVerdict;
  /** Token accounting (CA-8 / CA-9A). */
  readonly cost: CostAccumulator;
  /** Money accounting (CA-9A.2). */
  readonly usd: UsdCostAccumulator;
  readonly budget: CostBudget;
  /** The caps this run actually used. */
  readonly profile: AdvisorBudgetProfile;
  /**
   * CA-9C — the GUARD limits this run actually used. CA-9B's offline replay
   * stopped at 121 of 168 records because the injected `limits` object carried a
   * 200 000 token budget; nothing in the result showed it. Recording the resolved
   * limits is what makes that failure visible instead of inferred.
   */
  readonly limits: AdvisorLimits;
  /** Preserved stop reason, so a truncated campaign cannot look complete. */
  readonly stop_reason: CampaignStopReason | null;
  /** Cases the campaign never sent because it stopped early. */
  readonly cases_not_sent: number;
  readonly contract_failures: number;
  readonly transport: "mock" | "real";
}

/**
 * Counts provider calls by wrapping the injected transport. The count is what
 * actually left the process, not what the reports claim — so a turn that made an
 * unexpected extra call is visible even if it settled cleanly.
 */
function countingTransport(inner: typeof fetch): { fetchImpl: typeof fetch; calls: () => number } {
  let calls = 0;
  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    calls += 1;
    return inner(input as RequestInfo, init);
  }) as typeof fetch;
  return { fetchImpl, calls: () => calls };
}

/**
 * CONV-02 · THE HARNESS NEVER TOUCHES THE GLOBAL `fetch`.
 *
 * The previous default (`baseDeps.fetchImpl ?? fetch`) meant a caller that
 * forgot to inject a transport silently sent REAL, PAID requests from whatever
 * machine ran the suite — and the report would have priced them as mocks. An
 * injected transport is now mandatory: absent, the run refuses before its first
 * turn instead of spending money by omission.
 */
function requireInjectedFetch(deps: AdvisorDeps): typeof fetch {
  if (deps.fetchImpl === undefined) {
    throw new Error(
      "EVALUATION_REQUIRES_INJECTED_FETCH: an evaluation run must receive its transport; " +
        "the global fetch is never used.",
    );
  }
  return deps.fetchImpl;
}

/** Runs one case: every turn, in order, against the real pipeline. */
export async function runCase(testCase: EvaluationCase, options: RunOptions = {}): Promise<CaseRun> {
  const config = options.config === undefined ? MOCK_CONFIG : options.config;
  const baseDeps = options.providerDeps ?? mockDeps();
  const injectedFetch = requireInjectedFetch(baseDeps);
  const limits = options.limits ?? DEFAULT_ADVISOR_LIMITS;
  const guard =
    options.guard ?? createAdvisorGuard(limits, createInMemoryGuardrailLedger(limits));

  const handle = startAdvisorSession().session_id;
  const observations: TurnObservation[] = [];
  const contractProblems: string[] = [];
  let providerCalls = 0;
  let maxCallsInOneTurn = 0;
  let stoppedByCostGate = false;

  for (const message of testCase.turns) {
    // The USD gate runs BEFORE the call. A `false` here means the cap is reached,
    // so this turn — and every turn after it — is never sent.
    if (options.costGate !== undefined && !options.costGate().allow) {
      stoppedByCostGate = true;
      break;
    }

    const transport = countingTransport(injectedFetch);
    const before = transport.calls();
    const run = await runConversationalTurn(
      { sessionId: handle, message },
      { config, guard, providerDeps: { ...baseDeps, fetchImpl: transport.fetchImpl } },
    );
    const callsThisTurn = transport.calls() - before;
    providerCalls += callsThisTurn;
    maxCallsInOneTurn = Math.max(maxCallsInOneTurn, callsThisTurn);

    // Contract check: the turn, projected and validated exactly as a surface
    // would receive it. A refusal has no outcome to project, so it is checked
    // through the refusal projection instead.
    const projection = run.ok
      ? projectAdvisorTurn({ kind: "turn", outcome: run.outcome })
      : projectAdvisorTurn({ kind: "refusal", reason: run.reason });
    const validation = validateAdvisorUiResponse(projection);
    if (!validation.ok) contractProblems.push(`${testCase.id}:${validation.problems.join(",")}`);

    const observation = observationOf(run, callsThisTurn);
    observations.push(observation);
    options.onTurnSettled?.(observation);
  }

  return {
    case_id: testCase.id,
    observations,
    contract_ok: contractProblems.length === 0,
    contract_problems: contractProblems,
    provider_calls: providerCalls,
    max_calls_in_one_turn: maxCallsInOneTurn,
    stopped_by_cost_gate: stoppedByCostGate,
  };
}

/**
 * Charges one settled turn into the money accumulator.
 *
 * REPORTED consumption is billed from the measurement; UNKNOWN consumption is
 * IMPUTED at the CA-8 reservation floor (never zero, never "known"); a turn that
 * never reached the provider contributes nothing.
 */
function chargeTurnUsd(
  accumulator: UsdCostAccumulator,
  consumption: TurnConsumption,
  pricing: ReturnType<typeof pricingForModel>,
  band: AdvisorRateBand,
  reservedTokens: number,
): UsdCostAccumulator {
  if (pricing === null) return accumulator;
  if (consumption.usage_status === "NOT_INVOKED" || consumption.provider_calls <= 0) {
    return accumulator;
  }
  if (consumption.usage_status === "UNKNOWN") {
    return addUnknownRequestUsd(accumulator, {
      pricing,
      requests: consumption.provider_calls,
      reservedTokens,
      band,
    });
  }
  return addReportedRequestUsd(accumulator, {
    pricing,
    band,
    usage: {
      input_tokens: consumption.input_tokens,
      output_tokens: consumption.output_tokens,
      cached_input_tokens: consumption.cached_input_tokens ?? null,
      requests: consumption.provider_calls,
    },
  });
}

/**
 * Runs a whole dataset under the APPROVED budget: one guard, one token
 * accumulator and one money accumulator span every case, and the hard USD cap is
 * consulted before every turn. That is what makes `HARD_COST_CAP_REACHED`
 * executable rather than a number in a report.
 *
 * The token ceiling the guard runs with is the approved token cap (a caller may
 * only tighten it), so the two approved caps are enforced by the same run:
 * `BUDGET_EXHAUSTED` when the tokens run out first, `HARD_COST_CAP_REACHED` when
 * the money does.
 */
export async function runDataset(
  dataset: readonly EvaluationCase[],
  options: RunOptions = {},
): Promise<DatasetRunResult> {
  // Fail closed BEFORE the first case: a dataset run without an injected
  // transport is refused, not silently sent through the global fetch.
  requireInjectedFetch(options.providerDeps ?? mockDeps());
  if (options.resetSessions !== false) __resetAllSessionsForTests();

  const profile = options.budgetProfile ?? APPROVED_ADVISOR_BUDGET_PROFILE;
  const band = options.rateBand ?? DEFAULT_RATE_BAND;
  const budget = computeCostBudget(profile);
  const limits = resolveCampaignLimits(options.limits, profile);
  const guard = options.guard ?? createAdvisorGuard(limits, createInMemoryGuardrailLedger(limits));
  const config = options.config === undefined ? MOCK_CONFIG : options.config;

  // No verified price for the configured model ⇒ nothing may be spent. The gate
  // then refuses every request rather than pricing it with someone else's rate.
  const pricing = pricingForModel(config?.model ?? profile.model);
  const maxOutputTokens = config?.maxOutputTokens ?? 0;
  const turnUpperBound =
    pricing === null
      ? 0
      : requestUpperBoundUsd({
          pricing,
          reservedTokens: limits.reservationTokens * PROVIDER_OPERATIONS_PER_TURN,
          maxOutputTokens: maxOutputTokens * PROVIDER_OPERATIONS_PER_TURN,
          attempts: 1,
          band,
        });

  let accumulator = createCostAccumulator();
  let usd = createUsdCostAccumulator();

  const gate = (): HardCostCapDecision =>
    evaluateHardCostCap({
      spentUsd: usdCostTotal(usd),
      capUsd: pricing === null ? Number.NaN : profile.hardCostCapUsd,
      nextRequestUpperBoundUsd: turnUpperBound,
    });

  const scored: ScoredCase[] = [];
  let contractFailures = 0;
  let maxCallsInOneTurn = 0;
  let costCapReached = false;
  let casesSent = 0;
  let stopReason: CampaignStopReason | null = null;

  for (const testCase of dataset) {
    if (pricing === null) {
      costCapReached = true;
      stopReason = HARD_COST_CAP_STOP_REASON;
      break;
    }
    if (!gate().allow) {
      costCapReached = true;
      stopReason = HARD_COST_CAP_STOP_REASON;
      break;
    }

    const run = await runCase(testCase, {
      ...options,
      guard,
      costGate: gate,
      onTurnSettled: (observation) => {
        usd = chargeTurnUsd(usd, observation.consumption, pricing, band, limits.reservationTokens);
      },
    });
    contractFailures += run.contract_problems.length;
    maxCallsInOneTurn = Math.max(maxCallsInOneTurn, run.max_calls_in_one_turn);

    for (const observation of run.observations) {
      accumulator = addConsumption(accumulator, observation.consumption);
    }

    if (run.observations.length === 0) {
      // The gate refused the case's very first turn: nothing was sent, so there is
      // nothing to score. Its remaining cases are not sent either.
      costCapReached = true;
      stopReason = HARD_COST_CAP_STOP_REASON;
      break;
    }
    casesSent += 1;

    const memory = run.observations.length > 1 ? evaluateMemory(testCase, run.observations) : null;
    const last = run.observations[run.observations.length - 1];
    const score = scoreCase(testCase, last as TurnObservation, {
      memory: memory === null ? null : memory.signal,
    });
    scored.push({ case_id: testCase.id, category: testCase.category, score, memory });

    if (run.stopped_by_cost_gate) {
      costCapReached = true;
      stopReason = HARD_COST_CAP_STOP_REASON;
      break;
    }
    if (isOverBudget(accumulator, budget)) {
      costCapReached = true;
      if (stopReason === null) stopReason = "BUDGET_EXHAUSTED";
      break;
    }
  }

  const summary: RunSummary = {
    cases_scored: scored.length,
    cases_hard_failed: scored.filter((entry) => entry.score.hard_failures.length > 0).length,
    cost_cap_reached: costCapReached,
    max_provider_calls_in_one_turn: maxCallsInOneTurn,
    secret_exposures: scored.filter((entry) =>
      entry.score.hard_failures.includes("SECRET_EXPOSURE"),
    ).length,
    ca8_bypasses: scored.filter((entry) =>
      entry.score.hard_failures.includes("CA8_REFUSAL_BYPASS"),
    ).length,
    contract_failures: contractFailures,
    production_writes: 0,
  };

  const result: DatasetRunResult = {
    cases: scored,
    summary,
    verdict: evaluateStopConditions(summary),
    cost: accumulator,
    usd,
    budget,
    profile,
    limits,
    stop_reason: stopReason,
    cases_not_sent: Math.max(0, dataset.length - casesSent),
    contract_failures: contractFailures,
    transport: options.config === undefined ? "mock" : "real",
  };

  if (options.store) await options.store.save(result);
  return result;
}
