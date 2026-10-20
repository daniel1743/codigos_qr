/**
 * CRIPQER Conversion Advisor — CA-7.4-A · the public projection.
 *
 * The one place a turn becomes something a surface may hold. It takes the result
 * CA-7.1B already produced (or the fact that there is none), and returns the
 * shape `ui-contract.ts` defines — never the outcome itself, never a field of it
 * that CA-7.1B marked as server-side.
 *
 * THREE ENTRY POINTS, because a surface really has three situations and they
 * differ in what may be trusted:
 *
 *   `pendingAdvisorTurn()`    — nothing has come back yet. Takes NO input, so
 *                               there is no server value to mistake for a state.
 *   `projectAdvisorTurn(...)` — a result, a typed refusal, or nothing at all.
 *   (there is no fourth.)
 *
 * WHAT THIS FILE REFUSES, structurally:
 *   · It never accepts an error OBJECT. The `error` variant carries no payload,
 *     so a stack trace, a provider message or a raw string cannot be published
 *     through it — not because they are filtered out, but because there is
 *     nowhere to put them.
 *   · It never accepts a message STRING from the boundary. A refusal arrives as
 *     a typed reason and is answered from a table, so a caller cannot place text
 *     in front of a visitor.
 *   · It never accepts a session id, a usage number, a latency or a denial kind.
 *     `conversation` copies the two counts CA-7.1B already publishes and nothing
 *     else.
 *
 * WHAT IT NEVER DOES: no provider call, no network, no clock, no randomness, no
 * storage, no environment. It reads a value and returns a value — the whole
 * module is pure. CA-10B adds two value imports (`actions/policy` and
 * `actions/registry`), both client-safe and side-effect free; the policy's
 * clock is read only on the Guest Editor branch, which this file never reaches,
 * so projecting a turn reads no clock either.
 *
 * THE FLOW IT BELONGS TO (unchanged by this phase, which wires nothing):
 *   browser input → a future guarded server function → CA-7.1B turn → CA-8
 *   reservations → CA-3 understanding → CA-4 advice → CA-7.2 safe adaptation →
 *   CA-7.4-A projection (this file) → a future surface.
 */

import { resolveAdvisorAction, revalidateExecutableAction } from "../actions/policy";
import { ACTION_REGISTRY } from "../actions/registry";
import type {
  AdvisorPendingProjection,
  AdvisorSettledProjection,
  AdvisorUiAction,
  AdvisorUiConversation,
  AdvisorUiNotice,
  AdvisorUiNoticeCode,
} from "./ui-contract";
import { ADVISOR_UI_CONTRACT_VERSION, ADVISOR_UI_NOTICE_TEXTS } from "./ui-contract";
import {
  PROCESSING_MESSAGE,
  REFUSAL_MESSAGES,
  REFUSAL_NOTICE_CODES,
  SETTLED_NOTICE_CODES,
  UNCONFIRMED_MESSAGE,
  classifyAdvisorTurn,
} from "./ui-state";
import type { TurnFailureReason, TurnOutcome } from "./contract";

/* ============================== the parts =============================== */

/**
 * A notice, always built from the table. A fresh object every call — never a
 * shared instance the caller could freeze, mutate or compare by identity.
 */
function noticeFor(code: AdvisorUiNoticeCode): AdvisorUiNotice {
  return { code, text: ADVISOR_UI_NOTICE_TEXTS[code] };
}

/**
 * The conversation's numbers, copied — not derived, not incremented, not
 * remembered from a previous turn. Whatever CA-7.1B reported is what a surface
 * sees, including when a refused turn left them unchanged.
 */
function conversationOf(outcome: TurnOutcome): AdvisorUiConversation {
  return {
    turns_used: outcome.session.turns_used,
    turns_remaining: outcome.session.turns_remaining,
  };
}

/* ============================== the action ============================== */

/**
 * CA-10B · the ONE executable action, derived — never copied from the reply.
 *
 * The flow is the brief's: CA-5 resolves the turn's action deterministically,
 * this function re-validates the descriptor with the STRICTER executable check,
 * and only then builds the contract's closed action. The destination is read
 * from `ACTION_REGISTRY.OPEN_HELP.destination_id`; no field of the model's
 * response is consulted for it, and `AdvisorResponse` has no destination field
 * to consult.
 *
 * REFUSALS, each structural:
 *  · a degraded turn may not act — the advisor could not consult the provider
 *    as intended, which is CA-7.2's own rule;
 *  · a decision that is not ALLOWED yields nothing (fallback, refusal, guard
 *    denial, disabled flag, missing evidence);
 *  · any id other than OPEN_HELP yields nothing — `OFFER_GUEST_EDITOR` and
 *    `SHOW_TEMPLATE_PREVIEW` keep their existing safe behavior;
 *  · a descriptor that fails `revalidateExecutableAction` yields nothing;
 *  · a registry destination that is not the contract's exact `/help` yields
 *    nothing (the two literals are pinned by a test).
 */
function navigationActionsFor(outcome: TurnOutcome): readonly AdvisorUiAction[] {
  if (outcome.degraded) return [];

  const decision = resolveAdvisorAction(outcome.response);
  if (decision.status !== "ALLOWED") return [];

  const descriptor = decision.descriptor;
  if (descriptor.action_id !== "OPEN_HELP") return [];
  if (!revalidateExecutableAction(descriptor).ok) return [];

  const destination = ACTION_REGISTRY.OPEN_HELP.destination_id;
  if (destination !== "/help" || descriptor.destination_id !== destination) return [];

  // A fresh object every call: no shared instance a caller could retain or
  // mutate.
  return [{ kind: "NAVIGATE_INTERNAL", action_id: "OPEN_HELP", destination: "/help" }];
}

/* =============================== the input ============================== */

/**
 * What a surface hands the projection.
 *
 * `error` carries NOTHING on purpose. A caller with a caught exception passes
 * the fact that it failed, not the failure: the projection has no field in which
 * a raw error could travel, which is what "ERROR no revela stack traces" means
 * as a structural property rather than as a filter somebody has to maintain.
 */
export type AdvisorTurnInput =
  | { readonly kind: "turn"; readonly outcome: TurnOutcome }
  | { readonly kind: "refusal"; readonly reason: TurnFailureReason }
  | { readonly kind: "error" };

/* ============================ client-local ============================== */

/**
 * A turn in flight. Client-local by construction: it takes no input, so it can
 * be produced before any request exists and can never be produced FROM a
 * response. `conversation` is `null` — the numbers this turn will produce are
 * not known yet, and showing the previous turn's count as if it were current
 * would be the false state this contract refuses to render.
 */
export function pendingAdvisorTurn(): AdvisorPendingProjection {
  return {
    version: ADVISOR_UI_CONTRACT_VERSION,
    status: "PROCESSING",
    message: PROCESSING_MESSAGE,
    notice: null,
    actions: [],
    conversation: null,
  };
}

/* ============================= the projection =========================== */

/**
 * The one server-derived entry point. PURE and TOTAL: it always returns a valid
 * `AdvisorSettledProjection`, and it never throws.
 *
 * The switch is EXHAUSTIVE and deliberately has no `default`. A new input
 * variant has to fail to compile here — with `noImplicitReturns` it does —
 * rather than quietly fall through to the safe state, which would turn a missing
 * decision into a silent misreport.
 */
export function projectAdvisorTurn(input: AdvisorTurnInput): AdvisorSettledProjection {
  switch (input.kind) {
    case "turn": {
      const { outcome } = input;
      const status = classifyAdvisorTurn(outcome);

      return {
        version: ADVISOR_UI_CONTRACT_VERSION,
        status,
        // Verbatim, always: a reply CA-4 validated is not rewritten here, and a
        // safe reply CA-4 built is not replaced by a sentence of ours. For a turn
        // the guard refused, this is CA-4's own safe failure text — the public
        // message a refusal is required to carry.
        message: outcome.response.reply,
        notice: status === "ANSWERED" ? null : noticeFor(SETTLED_NOTICE_CODES[status]),
        actions: navigationActionsFor(outcome),
        conversation: conversationOf(outcome),
      };
    }

    case "refusal": {
      // No outcome exists: the turn was refused before one could. The reason is
      // CA-7.1B's closed set, and what the visitor reads comes from the tables —
      // the notice says what can be done, and never which internal condition
      // fired.
      return {
        version: ADVISOR_UI_CONTRACT_VERSION,
        status: "REFUSED",
        message: REFUSAL_MESSAGES[input.reason],
        notice: noticeFor(REFUSAL_NOTICE_CODES[input.reason]),
        actions: [],
        conversation: null,
      };
    }

    case "error": {
      return {
        version: ADVISOR_UI_CONTRACT_VERSION,
        status: "ERROR",
        message: UNCONFIRMED_MESSAGE,
        notice: noticeFor(SETTLED_NOTICE_CODES.ERROR),
        actions: [],
        conversation: null,
      };
    }
  }
}
