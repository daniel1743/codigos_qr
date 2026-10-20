/**
 * CRIPQER Conversion Advisor — CA-7.2 · the landing adapter.
 *
 * A PURE, client-safe function that turns the advisor's own response contract
 * (`AdvisorResponse`, carried inside CA-7.1B's `TurnOutcome`) into the landing's
 * `AgentResponse` — `{ text, actions }`.
 *
 * It is deliberately narrow, and two facts about the two contracts are the
 * reason. Both were read from source before a line was written:
 *
 *  · TEXT. `AgentResponse` has exactly one text field and NO place for the
 *    advisor's `limitations`, `confidence` or `grounding_status`. So the reply
 *    the validator already approved is carried through VERBATIM, and the
 *    limitations are NOT carried. Appending them to `text` would rewrite a reply
 *    CA-4 approved and would leak its internal `respuesta_no_emitida:<reason>`
 *    marker into visitor-facing copy. The missing field is recorded as a
 *    contract gap (`LANDING_CONTRACT_GAPS`), never filled with an invention.
 *
 *  · ACTIONS. The landing's `AgentAction` vocabulary is about templates,
 *    quick-reply options, context patches and page creation. CA-5's allowlist is
 *    about explanation and navigation. The two vocabularies overlap in exactly
 *    two places — and both are traps:
 *      – `OFFER_GUEST_EDITOR` looks like the landing's `CREATE_PAGE`. Mapping it
 *        would turn a BLOCKED, uncertified flow into a privileged page creation
 *        the model's own response could trigger. The brief forbids both.
 *      – `SHOW_TEMPLATE_PREVIEW` looks like `PREVIEW_TEMPLATE`, but
 *        `PREVIEW_TEMPLATE` demands a landing `TemplateId`, and the advisor's
 *        response carries CAPABILITY ids (`tarjetas_bio`, `qr`, …), never
 *        template ids. Producing one would mean inventing an id.
 *    Every other CA-5 id — `EXPLAIN_FEATURE`, `EXPLAIN_FREE_PREMIUM`,
 *    `SHOW_EDITOR_HELP`, `NONE` — is informational or a no-op, and the landing
 *    has no informational action at all.
 *
 * So the crosswalk below is EMPTY BY DECISION, and every id records why. An
 * action with no authorised equivalence is OMITTED, the safe text is kept and the
 * structure stays valid — which is exactly what the brief asks for when there is
 * no equivalence. Nothing here invents a route, a template id, a permission or a
 * destination.
 *
 * PURITY: no network, no environment, no storage, no clock, no randomness, no
 * mutation of its input, and no server-only module anywhere in its VALUE-import
 * graph. `actions/registry.ts` is the only value import and it pulls nothing at
 * runtime; `AdvisorResponse`, `TurnOutcome`, `AgentAction` and `AgentResponse`
 * arrive as TYPE-ONLY imports, which the compiler erases.
 */

import type {
  AgentAction,
  AgentResponse,
} from "../../../features/approved-chat-landing/types/cripqer";
import { ACTION_IDS, nextBestActionToActionId, type ActionId } from "../actions/registry";
import type { TurnOutcome } from "./contract";

/* ============================== the crosswalk =========================== */

/**
 * CA-5's action id → the landing actions it authorises.
 *
 * A list, not a single action, because one CA-5 id could in principle authorise
 * more than one landing effect. EVERY entry is empty today; the comment on each
 * says which landing action was considered and why it was refused. The
 * `Record<ActionId, …>` type is what makes an omission a decision: adding an id
 * to CA-5's allowlist fails to compile here until it is classified.
 */
export const LANDING_ACTION_CROSSWALK: Readonly<Record<ActionId, readonly AgentAction[]>> = {
  // INFORMATION. The landing has no informational action, and the nearest
  // candidates are all wrong: `SHOW_OPTIONS` would put quick replies the visitor
  // never chose in front of them, and the explanation already lives in `text`.
  EXPLAIN_FEATURE: [],
  EXPLAIN_FREE_PREMIUM: [],
  SHOW_EDITOR_HELP: [],
  // The one thematically-aligned pair. `PREVIEW_TEMPLATE` needs a landing
  // `TemplateId`; the advisor's response cannot supply one without invention, so
  // the pair stays unmapped until a phase can hand over a CA-5-verified id.
  SHOW_TEMPLATE_PREVIEW: [],
  // CA-10B's executable action is INTERNAL navigation to `/help`. The landing's
  // `AgentAction` set has no internal-navigation member and no help/route
  // action, so there is no exact equivalence to map — inventing one would be the
  // adapter's old failure mode. The advisor's own UI contract carries the
  // action; this adapter stays empty.
  OPEN_HELP: [],
  // BLOCKED. Its only landing look-alike is `CREATE_PAGE` — privileged, and
  // forbidden by the brief. The Guest Editor is not certified in this worktree.
  OFFER_GUEST_EDITOR: [],
  // No action was proposed: nothing to map, and nothing to invent.
  NONE: [],
};

/** The allowlist membership test, kept apart from the table it guards. */
const KNOWN_ACTION_IDS: ReadonlySet<string> = new Set<string>(ACTION_IDS);

/**
 * The landing actions a CA-5 action id authorises.
 *
 * An id OUTSIDE the allowlist authorises NOTHING: an unknown action is never
 * translated into a privileged one, it simply disappears. The check is on the
 * raw string, so it holds even if a caller passes an id the type system never
 * sanctioned.
 */
export function landingActionsForActionId(actionId: string): readonly AgentAction[] {
  if (!KNOWN_ACTION_IDS.has(actionId)) return [];
  return LANDING_ACTION_CROSSWALK[actionId as ActionId];
}

/* =============================== the adapter ============================ */

/**
 * What `AgentResponse` cannot receive from `AdvisorResponse`, recorded rather
 * than filled. Each entry is a field the landing contract simply does not have;
 * none of them is invented, and the adapter stays structurally valid without them.
 */
export const LANDING_CONTRACT_GAPS = {
  limitations:
    "AgentResponse has no field for CA-4's limitations. They are dropped, never appended to text.",
  confidence:
    "AgentResponse has no field for the advisor's confidence. It is dropped, never used to gate anything.",
  grounding_status:
    "AgentResponse has no field for the grounding status, so a degraded or fallback turn is indistinguishable in the output. It is compensated by emitting NO actions for such a turn.",
  actions:
    "No CA-5 action id has an exact equivalence in AgentAction that does not require inventing a template id, a route or a privilege. OPEN_HELP (internal navigation to /help) has no landing member at all, so the crosswalk is empty by decision.",
} as const;

/**
 * CA-5 resolves the model's proposal with `nextBestActionToActionId(action, strategy)`,
 * where the strategy is CA-4's dominant intent. That resolution only ever
 * discriminates between `EXPLAIN_FREE_PREMIUM` and `EXPLAIN_FEATURE`, and the
 * crosswalk above returns the same result for both, so the value is immaterial
 * here. `"OTHER"` is CA-4's OWN default (`primaryStrategyFromIntents` returns it
 * when no intent matches) — a real value, not a placeholder. A test walks the
 * whole `NextBestAction × Strategy` space to prove the crosswalk cannot depend
 * on it.
 */
const STRATEGY_IRRELEVANT_TO_CROSSWALK = "OTHER" as const;

/**
 * Whether this turn may produce an ACTION at all — a separate question from
 * which action it may produce, and deliberately answered by its own named
 * predicate so it can be tested directly.
 *
 * It has to be its own function because the crosswalk is empty today: with an
 * empty table the gate never fires, and a security property that is only ever
 * exercised by a table that happens to be empty is not proven, just untested.
 * Exported and asserted on directly, it is proven now, and a future non-empty
 * crosswalk inherits it unchanged.
 *
 * A turn may not act when it did not consult the provider as intended
 * (`degraded` — budget, rate limit, circuit breaker, kill switch, timeout,
 * unknown consumption) or when its answer failed CA-4's validator
 * (`grounding_status !== "GROUNDED"`). Both are refusals to act, never an
 * upgrade to one.
 */
export function mayActOnLanding(outcome: TurnOutcome): boolean {
  return !outcome.degraded && outcome.response.grounding_status === "GROUNDED";
}

/**
 * The one entry point. Pure and total: it always returns a valid `AgentResponse`.
 */
export function adaptAdvisorToAgentResponse(outcome: TurnOutcome): AgentResponse {
  const { response } = outcome;
  const actionId = nextBestActionToActionId(
    response.suggested_action,
    STRATEGY_IRRELEVANT_TO_CROSSWALK,
  );

  return {
    // Verbatim: the reply already passed CA-4's deterministic screen.
    text: response.reply,
    // A fresh array every call — never a shared table the caller could mutate.
    actions: mayActOnLanding(outcome) ? [...landingActionsForActionId(actionId)] : [],
  };
}
