/**
 * CRIPQER Conversion Advisor — CA-7.4-A · the conversational state machine.
 *
 * Everything here is a DECISION, expressed as data or as one pure function:
 * which of the six states a turn produced, which notice it must carry, and what
 * the surface says when the server produced no reply at all. None of it touches
 * text the advisor wrote — that is `ui-projection.ts`'s job — and none of it
 * reads a server module.
 *
 * IMPORTS: type-only, every one of them. There is no value import in this file,
 * so it depends on nothing at runtime: it cannot reach the provider, the ledger,
 * the session store or the environment, because there is no code path along
 * which to reach them.
 *
 * THE PRECEDENCE, and why it is this order. A turn carries two independent
 * facts — whether it ran as designed, and whether its text is a validated
 * answer — so the four states they generate are not nested, they overlap. The
 * ladder resolves the overlap from the strongest statement to the weakest:
 *
 *   1. REFUSED   — the request (or the guard) was refused before a normal answer
 *                  could exist. Nothing was consulted, no turn was kept. This
 *                  outranks FALLBACK because it is a statement about the TURN,
 *                  while FALLBACK is one about its text; a refused turn's safe
 *                  reply must never be reported as a fallback answer that simply
 *                  was not verified.
 *   2. FALLBACK  — there is text, but no validated commercial answer behind it.
 *                  It outranks DEGRADED because a surface that showed a prudent
 *                  "may be incomplete" notice over a fallback would be presenting
 *                  a non-answer as an answer — the false visual state the brief
 *                  forbids. The safe text never claims to be advice, and neither
 *                  does its state.
 *   3. DEGRADED  — a validated answer from a turn that carried a degradation
 *                  condition. Real advice, honestly qualified.
 *   4. ANSWERED  — a validated answer from a turn that ran as designed.
 *
 * The engine's own default is `ANSWERED`: a classification that fell through
 * every refusal would have to be a grounded answer from a clean turn.
 */

import type { AdvisorSettledStatus, AdvisorUiNoticeCode } from "./ui-contract";
import type { TurnFailureReason, TurnOutcome } from "./contract";

/* ============================== the ladder ============================== */

/**
 * Whether the guard refused some part of this turn.
 *
 * `reservation: "DENIED"` means exactly one thing in CA-7.1B: the ledger refused
 * BEFORE the call, so nothing ran and nothing was spent. It is the client-safe
 * signal for that fact — the denial's KIND (`denied_reason`) lives on the report
 * too, and is deliberately never read: publishing which guard condition fired
 * would let a visitor probe the budget, the rate window and the kill switch.
 *
 * Exported and asserted on directly, for the same reason CA-7.2 exports
 * `mayActOnLanding`: a rule this load-bearing should be provable on its own, not
 * only through the function that happens to call it.
 */
export function guardRefused(outcome: TurnOutcome): boolean {
  return (
    outcome.understanding.reservation === "DENIED" ||
    outcome.commercial_advice.reservation === "DENIED"
  );
}

/**
 * The state a completed turn produces. Pure and total.
 *
 * The return type excludes `PROCESSING` structurally: no server result can put a
 * surface back into "we are waiting", which is one of the brief's invariants
 * made unfalsifiable rather than merely tested.
 */
export function classifyAdvisorTurn(outcome: TurnOutcome): AdvisorSettledStatus {
  if (guardRefused(outcome)) return "REFUSED";
  if (outcome.response.grounding_status !== "GROUNDED") return "FALLBACK";
  if (outcome.degraded) return "DEGRADED";
  return "ANSWERED";
}

/* ============================== the notices ============================= */

/**
 * The notice each settled state carries.
 *
 * Exhaustive over the settled set: a new state fails to compile here until it is
 * classified. `ANSWERED` is absent on purpose — a validated answer carries no
 * notice, and `NOTICE_REQUIRED` in the contract says so in the shared table the
 * validator enforces.
 */
export const SETTLED_NOTICE_CODES: Readonly<
  Record<Exclude<AdvisorSettledStatus, "ANSWERED">, AdvisorUiNoticeCode>
> = {
  DEGRADED: "TURN_INCOMPLETE",
  FALLBACK: "ANSWER_NOT_VERIFIED",
  REFUSED: "REQUEST_NOT_ATTENDED",
  ERROR: "RESPONSE_UNCONFIRMED",
} as const;

/**
 * Which guard denial is invisible. Every denial kind — budget, rate window,
 * circuit, concurrency, kill switch, an unavailable ledger — produces this ONE
 * code and this one sentence. A test projects outcomes that differ only in
 * `denied_reason` and asserts the outputs are byte-identical, which is what
 * "the guard cannot be probed through this contract" means as a fact.
 */
export const GUARD_DENIAL_NOTICE_CODE: AdvisorUiNoticeCode = "REQUEST_NOT_ATTENDED";

/**
 * The refusal's notice, per reason, for a request the guarded turn itself
 * refused — before any outcome could exist.
 *
 * An exhaustive `Record<TurnFailureReason, …>` is what makes an omission a
 * decision: CA-7.1B adding a reason fails to compile here until someone decides
 * what the visitor is told. Nothing here states the internal reason; each entry
 * says what the visitor can do about it, which is the only part they can act on.
 */
export const REFUSAL_NOTICE_CODES: Readonly<Record<TurnFailureReason, AdvisorUiNoticeCode>> = {
  INVALID_INPUT: "INPUT_REFUSED",
  SESSION_UNKNOWN: "CONVERSATION_UNKNOWN",
  TURN_LIMIT_REACHED: "CONVERSATION_LIMIT",
  PROVIDER_MISCONFIGURED: "ADVISOR_UNAVAILABLE",
} as const;

/**
 * What the surface renders as the turn's message when the server produced no
 * reply to carry through — because there is no reply.
 *
 * The projection never accepts a message STRING from the boundary, only a typed
 * reason, so this table is the whole of what a refusal can say. `PROVIDER_
 * MISCONFIGURED` names an unavailable advisor, which is a service fact the
 * visitor can act on; it never names a credential, a key or a configuration
 * variable.
 */
export const REFUSAL_MESSAGES: Readonly<Record<TurnFailureReason, string>> = {
  INVALID_INPUT: "No pudimos atender este mensaje tal como llegó.",
  SESSION_UNKNOWN: "Esta conversación ya no está disponible.",
  TURN_LIMIT_REACHED: "Esta conversación llegó a su límite de turnos.",
  PROVIDER_MISCONFIGURED: "El asesor no está disponible en este momento.",
} as const;

/* ========================= client-local copy ============================ */

/** The brief's own public text for a turn in flight. Fixed, not assembled. */
export const PROCESSING_MESSAGE = "Estamos preparando tu respuesta.";

/**
 * What an unconfirmed turn says. It states the one thing that is true — there is
 * no confirmed answer — and promises nothing about why, because the surface
 * cannot know: a transport failure and a server-side refusal that did not
 * survive the wire are indistinguishable here, and pretending otherwise would
 * report a guess as a fact.
 */
export const UNCONFIRMED_MESSAGE = "No obtuvimos una respuesta confirmada para este mensaje.";
