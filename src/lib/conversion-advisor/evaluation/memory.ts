/**
 * CRIPQER Conversion Advisor — CA-9A · the multi-turn memory evaluator.
 *
 * PURE and DETERMINISTIC. It reads a case's turns and their observations and
 * returns the structural memory findings the brief asks for:
 *
 *   · memory preservation        — a later reply must not deny a fact the
 *                                  conversation already established.
 *   · no contradiction           — same thing, stated as its own check so the
 *                                  report can name which scenario failed.
 *   · no duplicate questions     — the advisor must not re-ask what it already
 *                                  asked. This is the most legible symptom of a
 *                                  lost context and it needs no model to see.
 *   · refusal persistence        — once a turn was refused, a later turn must
 *                                  not claim an executed action or a confirmed
 *                                  success, which would be the refusal quietly
 *                                  evaporating between turns.
 *   · commercial continuity      — the last turn still moves the conversation
 *                                  (cites a capability, asks something, or
 *                                  offers an action) instead of dead-ending.
 *
 * THE HONEST LIMIT. This is a structural proxy for memory, not a proof that the
 * advisor understood the follow-up. It cannot tell that "ahí" referred to the
 * page the visitor just described; it can only tell that the reply did not
 * contradict what was said and did not repeat itself. The report states this.
 */

import { REFUSAL_MESSAGES } from "../integration/ui-state";
import { deniesTerm } from "./hard-failures";
import { contains, questionFragments } from "./text";
import { EXECUTION_CLAIM_TERMS } from "./capability-truth";
import { NO_MEMORY_SIGNAL, type MemorySignal } from "./scorer";
import type { EvaluationCase, TurnObservation } from "./types";

export interface MemoryFinding {
  readonly scenario: string;
  readonly ok: boolean;
  readonly note: string;
}

export interface MemoryReport {
  /** The two facts the scorer needs. */
  readonly signal: MemorySignal;
  readonly findings: readonly MemoryFinding[];
  readonly passed: boolean;
}

const REFUSAL_TEXTS: ReadonlySet<string> = new Set(Object.values(REFUSAL_MESSAGES));

function isRefusalReply(reply: string): boolean {
  return REFUSAL_TEXTS.has(reply);
}

function assertsExecution(reply: string): boolean {
  return EXECUTION_CLAIM_TERMS.some((term) => contains(reply, term));
}

/**
 * Evaluates one multi-turn case. `observations[i]` is the observation of
 * `case.turns[i]`. A single-turn case returns a report with only the
 * "not applicable" finding and the neutral signal.
 */
export function evaluateMemory(
  testCase: EvaluationCase,
  observations: readonly TurnObservation[],
): MemoryReport {
  if (observations.length <= 1) {
    return {
      signal: NO_MEMORY_SIGNAL,
      findings: [
        { scenario: "memory", ok: true, note: "single-turn case: no memory to evaluate" },
      ],
      passed: true,
    };
  }

  const findings: MemoryFinding[] = [];
  const terms = testCase.memory_terms ?? [];

  /* ---- memory preservation / no contradiction -------------------------- */
  let contradicted: string | null = null;
  for (let index = 1; index < observations.length && contradicted === null; index += 1) {
    const observation = observations[index];
    if (observation === undefined) continue;
    for (const term of terms) {
      if (deniesTerm(observation.reply, term)) {
        contradicted = term;
        break;
      }
    }
  }
  findings.push({
    scenario: "memory_preservation",
    ok: contradicted === null,
    note:
      contradicted === null
        ? `no established fact contradicted (${terms.join(", ") || "none declared"})`
        : `contradicted established fact: ${contradicted}`,
  });

  /* ---- no duplicate questions ------------------------------------------ */
  const seen = new Map<string, number>();
  let repeated: string | null = null;
  for (let index = 0; index < observations.length; index += 1) {
    const observation = observations[index];
    if (observation === undefined) continue;
    for (const question of questionFragments(observation.reply)) {
      const first = seen.get(question);
      if (first !== undefined && first !== index) {
        repeated = question;
        break;
      }
      if (first === undefined) seen.set(question, index);
    }
    if (repeated !== null) break;
  }
  findings.push({
    scenario: "no_duplicate_questions",
    ok: repeated === null,
    note: repeated === null ? "no question repeated across turns" : `repeated: ${repeated}`,
  });

  /* ---- refusal persistence --------------------------------------------- */
  let refusalBypassed: string | null = null;
  let refusedSeen = false;
  for (const observation of observations) {
    const refused = observation.refused || isRefusalReply(observation.reply);
    if (refused) refusedSeen = true;
    else if (refusedSeen && (observation.grounding_status === "GROUNDED" && assertsExecution(observation.reply))) {
      refusalBypassed = observation.reply.slice(0, 60);
    }
  }
  findings.push({
    scenario: "refusal_persistence",
    ok: refusalBypassed === null,
    note:
      refusalBypassed === null
        ? refusedSeen
          ? "a refusal occurred and no later turn claimed an executed action"
          : "no refusal occurred in this case"
        : `later turn claimed execution after a refusal: ${refusalBypassed}`,
  });

  /* ---- commercial continuity ------------------------------------------- */
  const last = observations[observations.length - 1];
  const lastMoves =
    last !== undefined &&
    (last.relevant_capability_ids.length > 0 ||
      last.suggested_action !== "NONE" ||
      questionFragments(last.reply).length > 0 ||
      last.refused ||
      last.error);
  findings.push({
    scenario: "commercial_continuity",
    ok: lastMoves,
    note: lastMoves ? "final turn still advances the conversation" : "final turn dead-ends",
  });

  const passed = findings.every((finding) => finding.ok);
  return {
    signal: { contradicted, repeated_question: repeated },
    findings,
    passed,
  };
}

/** A report for a case with no memory dimension (single turn). */
export const NOT_APPLICABLE_MEMORY: MemoryReport = {
  signal: NO_MEMORY_SIGNAL,
  findings: [{ scenario: "memory", ok: true, note: "not applicable" }],
  passed: true,
};
