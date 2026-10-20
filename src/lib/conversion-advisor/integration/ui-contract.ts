/**
 * CRIPQER Conversion Advisor — CA-7.4-A · the public UI contract.
 *
 * Why this file exists. CA-7.3B found (H2, H3) that the landing's `AgentResponse`
 * — `{ text, actions }` — cannot say what KIND of turn a visitor is looking at: a
 * validated answer, a degraded turn, a safe fallback and a refusal all render as
 * one text bubble. This contract names the six states a surface must be able to
 * tell apart, and carries nothing else.
 *
 * WHAT IT IS NOT. It is not a second `TurnOutcome`. That type is the SERVER's
 * view and carries the guard's own bookkeeping — reservations, denial reasons,
 * per-operation usage, latency, attempt counts — which CA-7.1B documents as
 * never reaching a browser. None of it appears here, and
 * `validateAdvisorUiResponse` refuses unknown keys at every level, so none of it
 * can be added to a response without this file changing first.
 *
 * IMPORTS: NONE, deliberately, and that is the point. A module with no import
 * statement cannot pull the provider, the guardrail ledger, a credential or the
 * session store into a browser bundle — not by accident, not through a transitive
 * value import, and not by a future edit that looks harmless. The purity is a
 * property of the source that a test can read, not a claim in a comment.
 *
 * COMPATIBILITY WITH `AgentResponse`. On purpose this contract does NOT import
 * the landing's type: the correspondence is conceptual and recorded here —
 * `message` is `text`, `actions` is `actions`, and `status`, `notice` and
 * `conversation` are the fields the landing does not have. A test proves the
 * correspondence rather than asserting it: for every TurnOutcome in a fixture
 * battery, this contract's `message` and `actions` equal what CA-7.2's adapter
 * produces for the same outcome.
 */

/* =============================== version ================================ */

/**
 * The wire version, as a literal. A future shape is a NEW version — a compile
 * error at every consumer — instead of the same field names quietly meaning
 * something else.
 */
export const ADVISOR_UI_CONTRACT_VERSION = 1 as const;

export type AdvisorUiContractVersion = typeof ADVISOR_UI_CONTRACT_VERSION;

/* ================================ states ================================ */

/**
 * The six states, in the order a visitor meets them.
 *
 * The set is closed. Adding one is a compile error in `NOTICE_REQUIRED` and in
 * CA-7.4-A's status→notice table, which is how a new state has to be classified
 * before it can exist.
 */
export const ADVISOR_UI_STATUSES = [
  /** Client-local only: a turn is in flight. Never a server result. */
  "PROCESSING",
  /** A validated, grounded answer to a turn that ran as designed. */
  "ANSWERED",
  /** A grounded answer, but the turn carried a degradation condition. */
  "DEGRADED",
  /** No validated commercial answer exists; a safe reply is shown instead. */
  "FALLBACK",
  /** The request was refused before a normal answer could exist. */
  "REFUSED",
  /** No confirmed response at all: transport or integration failure. */
  "ERROR",
] as const;

export type AdvisorUiStatus = (typeof ADVISOR_UI_STATUSES)[number];

/**
 * Every state a COMPLETED turn can produce.
 *
 * `PROCESSING` is excluded from the type, not merely from the values: the
 * projection of a server result returns this type, so "the server answered and
 * the surface still shows PROCESSING" is not a rule to be tested — it cannot be
 * expressed. Only `pendingAdvisorTurn()` produces `PROCESSING`, and it receives
 * nothing to produce it from.
 */
export type AdvisorSettledStatus = Exclude<AdvisorUiStatus, "PROCESSING">;

/* =============================== notices ================================ */

/**
 * Which states must carry a notice.
 *
 * Exhaustive over the closed set: a new status fails to compile here until it is
 * classified, and `validateAdvisorUiResponse` enforces the same table on every
 * output. ANSWERED carries none — with no notice the surface renders a plain
 * turn, which is exactly what a validated answer is.
 */
export const NOTICE_REQUIRED: Readonly<Record<AdvisorUiStatus, boolean>> = {
  PROCESSING: false,
  ANSWERED: false,
  DEGRADED: true,
  FALLBACK: true,
  REFUSED: true,
  ERROR: true,
};

export const ADVISOR_UI_NOTICE_CODES = [
  "TURN_INCOMPLETE",
  "ANSWER_NOT_VERIFIED",
  "INPUT_REFUSED",
  "CONVERSATION_UNKNOWN",
  "CONVERSATION_LIMIT",
  "ADVISOR_UNAVAILABLE",
  "REQUEST_NOT_ATTENDED",
  "RESPONSE_UNCONFIRMED",
] as const;

export type AdvisorUiNoticeCode = (typeof ADVISOR_UI_NOTICE_CODES)[number];

/**
 * The visitor-facing copy, one fixed sentence per code.
 *
 * A TABLE, not a template: the notice text is looked up, never assembled, so no
 * internal reason can be interpolated into it. `validateAdvisorUiResponse`
 * checks that a notice's text IS the entry its code names, which makes
 * "nunca concatenar degraded_reason al aviso" a checked property instead of a
 * convention.
 *
 * What each sentence may say is bounded by what is already public: that a turn
 * was incomplete, that an answer is unverified, that a request was not attended.
 * None of them says WHICH guard condition fired — a visitor who could read the
 * difference between "budget exhausted" and "rate limited" would have turned the
 * guard into a probe, which is what CA-7.1B refuses to publish.
 */
export const ADVISOR_UI_NOTICE_TEXTS: Readonly<Record<AdvisorUiNoticeCode, string>> = {
  TURN_INCOMPLETE: "Esta respuesta está verificada, pero el turno no se completó del todo.",
  ANSWER_NOT_VERIFIED:
    "Esto no es una recomendación verificada: no pudimos confirmar una respuesta para tu mensaje.",
  INPUT_REFUSED: "Revisa el mensaje y vuelve a enviarlo.",
  CONVERSATION_UNKNOWN: "Inicia una conversación nueva para seguir.",
  CONVERSATION_LIMIT: "Inicia una conversación nueva para continuar.",
  ADVISOR_UNAVAILABLE: "Puedes intentarlo de nuevo más tarde.",
  REQUEST_NOT_ATTENDED: "No se generó una respuesta del asesor. Puedes intentarlo otra vez.",
  RESPONSE_UNCONFIRMED: "Vuelve a intentarlo en unos momentos.",
};

export interface AdvisorUiNotice {
  readonly code: AdvisorUiNoticeCode;
  readonly text: string;
}

/* =============================== the parts ============================== */

/**
 * The action slot.
 *
 * CA-10B opens it by exactly one member and no more. The union is CLOSED: an
 * action must be a `NAVIGATE_INTERNAL` carrying the action id `OPEN_HELP` and
 * the destination `/help`. There is no generic `{ href: string }` variant, no
 * arbitrary route, and no mutation or external variant — adding one is a
 * deliberate edit to this type and to the validator below, not a line somebody
 * adds to a mapping table.
 *
 * WHY THE DESTINATION IS A LITERAL HERE AS WELL AS IN THE REGISTRY. This file
 * imports nothing, deliberately (see the header), so it cannot read
 * `ACTION_REGISTRY.OPEN_HELP.destination_id`. The literal is therefore pinned:
 * `ui-projection` builds its action from the registry, and a test asserts the
 * contract's literal and the registry's destination are the same string. The
 * projection cannot compile or pass its tests if the two drift.
 *
 * The categories below name the closed vocabulary; `NAVIGATE_INTERNAL` is the
 * only one AUTHORISED for execution today. INFORMATION and NAVIGATION remain
 * design-only, and PRIVILEGED is not authorized (the Guest Editor is not
 * certified here).
 */
export const UI_ACTION_CATEGORIES = [
  "INFORMATION",
  "NAVIGATION",
  "PRIVILEGED",
  "NAVIGATE_INTERNAL",
] as const;

export type AdvisorUiActionCategory = (typeof UI_ACTION_CATEGORIES)[number];

/** The closed set of executable action kinds. One member. */
export const ADVISOR_UI_ACTION_KINDS = ["NAVIGATE_INTERNAL"] as const;

export type AdvisorUiActionKind = (typeof ADVISOR_UI_ACTION_KINDS)[number];

export const OPEN_HELP_ACTION_ID = "OPEN_HELP" as const;
export const OPEN_HELP_DESTINATION = "/help" as const;

export interface AdvisorNavigateInternalAction {
  readonly kind: "NAVIGATE_INTERNAL";
  readonly action_id: "OPEN_HELP";
  readonly destination: "/help";
}

export type AdvisorUiAction = AdvisorNavigateInternalAction;

export const ADVISOR_UI_ACTION_KEYS: readonly string[] = ["kind", "action_id", "destination"];

/**
 * The only category authorised to execute. It is valid ONLY for
 * registry-backed internal destinations — enforcement lives in
 * `ui-projection` (which reads the registry) and in the validator below, which
 * accepts the one canonical shape and nothing else.
 */
export const AUTHORISED_UI_ACTION_CATEGORIES: readonly AdvisorUiActionCategory[] = [
  "NAVIGATE_INTERNAL",
];

/**
 * The conversation's public state: the two numbers CA-7.1B already publishes,
 * unchanged and uninterpreted. No session id (`session_id` is CA-7.1B's own
 * field and never travels through this contract), no key, no expiry, nothing
 * derived that could drift from the server's numbers.
 */
export interface AdvisorUiConversation {
  readonly turns_used: number;
  readonly turns_remaining: number;
}

export const UI_LIMITS = {
  /**
   * Mirrors CA-4's `ANSWER_LIMITS.maxReplyChars`, repeated as a number rather
   * than imported: `advisor/response.ts` reaches the provider by value, so
   * importing it would put a credential's module in this file's graph. A test
   * pins the two numbers together so the copy cannot drift unnoticed.
   *
   * CA-9C raised the source of this copy from 900 to 1 000 (see
   * `advisor/response.ts`); the pin is what forced this line to follow.
   */
  maxMessageChars: 1_000,
  /** Bounds the notice copy. A test asserts every entry of the table fits. */
  maxNoticeChars: 220,
} as const;

/* ============================== the shape =============================== */

interface AdvisorUiProjectionFields {
  readonly version: AdvisorUiContractVersion;
  /** The advisor's reply, verbatim — or this contract's own safe sentence. */
  readonly message: string;
  readonly notice: AdvisorUiNotice | null;
  readonly actions: readonly AdvisorUiAction[];
  /**
   * `null` exactly when no completed turn's numbers are known: a turn in
   * flight, a failure with no confirmed response, or a refusal that produced no
   * outcome. Never a guess, and never the previous turn's numbers presented as
   * current — a stale count is a false state, not a convenience.
   */
  readonly conversation: AdvisorUiConversation | null;
}

/**
 * A turn in flight. Client-local, and structurally unable to come from the
 * server: its `conversation` is narrowed to `null`, because at that moment the
 * surface does not know the turn's numbers yet.
 */
export interface AdvisorPendingProjection extends AdvisorUiProjectionFields {
  readonly status: "PROCESSING";
  readonly conversation: null;
}

/** A turn that completed, was refused, or never arrived. */
export interface AdvisorSettledProjection extends AdvisorUiProjectionFields {
  readonly status: AdvisorSettledStatus;
}

export type AdvisorUiResponse = AdvisorPendingProjection | AdvisorSettledProjection;

/* ============================= validation =============================== */

export interface AdvisorUiValidation {
  readonly ok: boolean;
  /** Machine-readable codes. Never an echo of the text that failed. */
  readonly problems: readonly string[];
}

const PROJECTION_KEYS: readonly string[] = [
  "version",
  "status",
  "message",
  "notice",
  "actions",
  "conversation",
];
const NOTICE_KEYS: readonly string[] = ["code", "text"];
const CONVERSATION_KEYS: readonly string[] = ["turns_used", "turns_remaining"];

const KNOWN_STATUSES: ReadonlySet<string> = new Set<string>(ADVISOR_UI_STATUSES);
const KNOWN_NOTICE_CODES: ReadonlySet<string> = new Set<string>(ADVISOR_UI_NOTICE_CODES);

function unknownKeys(value: object, allowed: readonly string[]): string[] {
  return Object.keys(value).filter((key) => !allowed.includes(key));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const KNOWN_ACTION_KINDS: ReadonlySet<string> = new Set<string>(ADVISOR_UI_ACTION_KINDS);

/**
 * One action, checked against the closed shape. Pure and total.
 *
 * A wrong destination is REPORTED rather than repaired: `https://…`, `/pages`,
 * `javascript:…`, protocol-relative forms, traversal and encoded traversal all
 * fail the same exact-equality check, because the only accepted value is the
 * literal `/help`.
 */
function actionProblems(value: unknown): string[] {
  if (!isPlainObject(value)) return ["action_not_object"];

  const problems: string[] = [];
  for (const key of Object.keys(value)) {
    if (!ADVISOR_UI_ACTION_KEYS.includes(key)) problems.push(`unknown_action_key:${key}`);
  }

  const kind = value["kind"];
  if (typeof kind !== "string" || !KNOWN_ACTION_KINDS.has(kind)) problems.push("bad_action_kind");
  if (value["action_id"] !== OPEN_HELP_ACTION_ID) problems.push("bad_action_id");
  if (value["destination"] !== OPEN_HELP_DESTINATION) problems.push("bad_action_destination");

  return problems;
}

/**
 * Every output this contract can produce, checked. Pure, total, and it never
 * throws: an invalid response is REPORTED, never repaired — the same posture
 * CA-4's validator takes toward the model's answer.
 *
 * It checks the shape and the determinism of the copy. It cannot check
 * provenance — that a `conversation` came from a real outcome, or that a
 * `REFUSED` really was refused — because that is a fact about how the value was
 * produced, not about the value. Those are proven where they are created: the
 * projection is the only producer, and its own tests walk the input space.
 */
export function validateAdvisorUiResponse(value: unknown): AdvisorUiValidation {
  const problems: string[] = [];

  if (!isPlainObject(value)) {
    return { ok: false, problems: ["not_an_object"] };
  }

  for (const key of unknownKeys(value, PROJECTION_KEYS)) problems.push(`unknown_key:${key}`);

  if (value["version"] !== ADVISOR_UI_CONTRACT_VERSION) problems.push("bad_version");

  const status = value["status"];
  if (typeof status !== "string" || !KNOWN_STATUSES.has(status)) {
    problems.push("bad_status");
  }

  const message = value["message"];
  if (typeof message !== "string" || message.trim() === "") problems.push("empty_message");
  else if (message.length > UI_LIMITS.maxMessageChars) problems.push("message_too_long");

  const actions = value["actions"];
  if (!Array.isArray(actions)) {
    problems.push("actions_not_array");
  } else {
    // The closed set has exactly one action. A second member is not "more
    // actions", it is an action the contract does not define.
    if (actions.length > 1) problems.push("too_many_actions");
    for (const action of actions) problems.push(...actionProblems(action));
  }

  const notice = value["notice"];
  const requiresNotice =
    typeof status === "string" && KNOWN_STATUSES.has(status)
      ? NOTICE_REQUIRED[status as AdvisorUiStatus]
      : false;

  if (notice === null) {
    if (requiresNotice) problems.push("missing_notice");
  } else if (!isPlainObject(notice)) {
    problems.push("notice_not_object");
  } else {
    if (!requiresNotice) problems.push("unexpected_notice");
    for (const key of unknownKeys(notice, NOTICE_KEYS)) problems.push(`unknown_notice_key:${key}`);

    const code = notice["code"];
    const text = notice["text"];
    if (typeof code !== "string" || !KNOWN_NOTICE_CODES.has(code)) {
      problems.push("bad_notice_code");
    } else {
      // The text is the TABLE's, never a caller's: that is what keeps a notice
      // from carrying a reason somebody assembled.
      if (text !== ADVISOR_UI_NOTICE_TEXTS[code as AdvisorUiNoticeCode]) {
        problems.push(`notice_text_not_deterministic:${code}`);
      }
    }
  }

  const conversation = value["conversation"];
  if (conversation !== null) {
    if (!isPlainObject(conversation)) {
      problems.push("conversation_not_object");
    } else {
      for (const key of unknownKeys(conversation, CONVERSATION_KEYS)) {
        problems.push(`unknown_conversation_key:${key}`);
      }
      for (const key of CONVERSATION_KEYS) {
        const count = conversation[key];
        if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
          problems.push(`bad_count:${key}`);
        }
      }
    }
  }

  return { ok: problems.length === 0, problems };
}
