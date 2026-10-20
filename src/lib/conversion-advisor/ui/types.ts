/**
 * CRIPQER Conversion Advisor — CA-7.4-B · the isolated UI's own vocabulary.
 *
 * This file holds the shapes and the copy the SURFACE owns: what a conversation
 * entry is, what the two participants are called, and which label each of the
 * six states is shown with. None of it is a server contract — CA-7.4-A's
 * `ui-contract.ts` remains the only definition of what a turn's public response
 * IS, and this file never redefines it.
 *
 * IMPORTS: type-only, from `ui-contract.ts` alone. There is no value import in
 * this file, so it has no runtime graph of its own and cannot be the path by
 * which a server module reaches a browser bundle.
 *
 * WHY THE TRANSPORT RETURNS `unknown`. The brief's contract says a transport's
 * output is an `AdvisorUiResponse`. Declaring it that way here would be a lie in
 * the types: a transport is an UNTRUSTED boundary — it is whatever the host
 * injected, possibly a `fetch` wrapper, possibly a mistake — and typing its
 * result as valid would make `validateAdvisorUiResponse` unreachable for every
 * real input. So the interface publishes `Promise<unknown>`, and the controller
 * is the one place that narrows it. The semantic contract the brief names is
 * enforced, and it is enforced where it can actually fail.
 */

import type {
  AdvisorUiAction,
  AdvisorUiResponse,
  AdvisorUiStatus,
} from "../integration/ui-contract";

/* ============================== the transport =========================== */

/**
 * What the surface hands a transport. Exactly the two things the brief names:
 * the text, and a signal it must honour.
 *
 * The transport OWNS the conversation's identity. A surface never sees a session
 * id, never generates one and never sends one — "no generar identificadores de
 * sesión reales dentro de la interfaz" is satisfied by there being no field in
 * which one could travel.
 */
export interface AdvisorTransportInput {
  readonly text: string;
  /** Aborted when the turn is cancelled or the surface unmounts. */
  readonly signal: AbortSignal;
}

/**
 * A transport, injected by the host. The ONLY way this surface reaches a turn.
 *
 * Nothing in this directory calls `fetch`, imports a server module, calls
 * `createServerFn` or reads `process.env`; a transport is the single seam, and a
 * test reads the source of every file here to prove it.
 */
export type AdvisorTransport = (input: AdvisorTransportInput) => Promise<unknown>;

/* ============================== the entries ============================= */

export const CONVERSATION_ROLES = ["VISITOR", "ADVISOR"] as const;

export type ConversationRole = (typeof CONVERSATION_ROLES)[number];

/** Who a message is from, as a visitor reads it. No branding, no product voice. */
export const ROLE_LABEL: Readonly<Record<ConversationRole, string>> = {
  VISITOR: "Tú",
  ADVISOR: "Asesor",
};

/**
 * What a VISITOR entry is: the visitor's own text, and nothing else.
 *
 * It deliberately does NOT carry a status. Labelling a visitor's message with the
 * ADVISOR's outcome ("Tú · Respuesta segura") is the kind of nonsense that makes
 * a transcript unreadable, and it would also mean the same fact was rendered
 * twice — once on each side of the exchange.
 */
export interface VisitorEntry {
  readonly id: string;
  readonly role: "VISITOR";
  readonly text: string;
}

/**
 * What an ADVISOR entry is: the public response for one turn, plus the text a
 * retry would resend.
 *
 * `response` is a value CA-7.4-A's projection produced or that
 * `validateAdvisorUiResponse` accepted — never a raw transport payload. The
 * component layer renders it and cannot reach past it.
 */
export interface AdvisorEntry {
  readonly id: string;
  readonly role: "ADVISOR";
  readonly response: AdvisorUiResponse;
  /**
   * The visitor's text for this turn, kept so a retry is a purely local act:
   * resending never requires looking up a neighbouring entry. `null` when there
   * is nothing to resend.
   */
  readonly retryText: string | null;
}

export type ConversationEntry = VisitorEntry | AdvisorEntry;

/**
 * Whether an entry offers the visitor a retry.
 *
 * Only a turn with NO confirmed response is retryable, and only ever on the
 * visitor's explicit action. There is no timer and no effect anywhere in this
 * directory that would resend by itself: a retry can consume budget, and the
 * brief requires that a spend be a person's decision.
 *
 * A TYPE PREDICATE, so the one caller that acts on the answer gets the narrowing
 * with it. Returning a bare boolean would leave `retry` reading `retryText` off
 * a union that includes a visitor entry — a compile error, or worse, a cast that
 * silences one.
 */
export function isRetryable(
  entry: ConversationEntry,
): entry is AdvisorEntry & { readonly retryText: string } {
  return entry.role === "ADVISOR" && entry.response.status === "ERROR" && entry.retryText !== null;
}

/* ================================ labels ================================ */

/**
 * The label each of the six states is shown with.
 *
 * Exhaustive over CA-7.4-A's closed set: a new status fails to compile here until
 * somebody decides what a visitor reads. The six strings are DISTINCT — a test
 * asserts it — because a label that read the same for two states would undo, at
 * the last step, the whole point of having six of them.
 *
 * These are the surface's words, not the contract's: CA-7.4-A publishes the
 * deterministic NOTICE sentences, and this table names the state beside them.
 */
export const ADVISOR_STATUS_LABEL: Readonly<Record<AdvisorUiStatus, string>> = {
  PROCESSING: "Procesando…",
  ANSWERED: "Respuesta del asesor",
  DEGRADED: "Respuesta con aviso",
  FALLBACK: "Respuesta segura",
  REFUSED: "Solicitud no atendida",
  ERROR: "Sin respuesta confirmada",
};

/** The accessible name of the conversation region, when the host gives none. */
export const DEFAULT_CONVERSATION_LABEL = "Conversación con el asesor";

/* ================================ actions =============================== */

/**
 * The visitor-facing label of each authorised action.
 *
 * Exhaustive over the contract's closed action-id set: a new executable action
 * fails to compile here until somebody writes the words a visitor reads. The
 * label is the SURFACE's copy, not the registry's — the registry's `label` is
 * product-facing data for the descriptor, and this surface owns its own text.
 */
export const ADVISOR_ACTION_LABEL: Readonly<Record<AdvisorUiAction["action_id"], string>> = {
  OPEN_HELP: "Abrir el centro de ayuda",
};

/* ================================ the state ============================= */

/**
 * Everything the surface renders, and nothing else.
 *
 * `inFlightAdvisorId` is the single-flight marker: it is non-null exactly while
 * one turn is waiting for a transport, which is what makes "one request at a
 * time per instance" a property of the state rather than a promise in a comment.
 */
export interface ConversationState {
  readonly entries: readonly ConversationEntry[];
  readonly inFlightAdvisorId: string | null;
}

export const EMPTY_CONVERSATION: ConversationState = { entries: [], inFlightAdvisorId: null };
