/**
 * CRIPQER Conversion Advisor — CA-7.3A · the preview view model.
 *
 * PURE. No server module, no network, no environment, no clock: it turns what a
 * completed turn produced into what a test surface is allowed to SHOW.
 *
 * This file is the security boundary of the preview, and that is its whole
 * reason to exist. A `TurnOutcome` carries diagnostics — per-operation usage,
 * latency, denial reasons, a session key — that must never be rendered. So the
 * projection is explicit and one-way: the reply text, a status, and a short
 * COMPREHENSIBLE note. The internal `degraded_reason` is read here and never
 * returned: "GUARD_DENIED:BUDGET_EXHAUSTED" is a fact about the guard, not
 * something a visitor should be able to probe.
 *
 * ACTIONS. The brief is unambiguous — the preview presents no executable
 * action, and `actions` is always `[]`. The adapter (CA-7.2) already returns an
 * empty list by decision; the view model carries it through unchanged and
 * exposes `hasExecutableActions` so the property is asserted, not assumed.
 */

import type {
  AgentAction,
  AgentResponse,
} from "../../../features/approved-chat-landing/types/cripqer";
import type { TurnOutcome } from "../integration/contract";

/* ================================ shape ================================= */

export type PreviewRole = "VISITOR" | "ADVISOR";

/**
 * PROCESSING — the turn is in flight; only a visitor message can be in this
 *              state.
 * ANSWERED   — a grounded commercial reply.
 * FALLBACK   — the model's answer did not pass CA-4's screen, so the safe reply
 *              is shown. NOT degraded: the provider was consulted and settled
 *              normally. It is still visibly different, because a visitor (and a
 *              reviewer) must be able to tell the two apart.
 * DEGRADED   — the turn could not consult the provider as intended (budget,
 *              rate limit, circuit breaker, kill switch, timeout, unknown
 *              consumption). The reply shown is CA-4's own safe one.
 * REFUSED    — refused before anything could be consulted (bad input, unknown
 *              session, turn limit, provider misconfigured). There is no
 *              `TurnOutcome` in this case, so no adapter call either.
 */
export type PreviewStatus = "PROCESSING" | "ANSWERED" | "FALLBACK" | "DEGRADED" | "REFUSED";

export interface PreviewMessage {
  readonly id: string;
  readonly role: PreviewRole;
  readonly text: string;
  readonly status: PreviewStatus;
  /** Always `[]`. Carried so the emptiness is a rendered fact, not a promise. */
  readonly actions: readonly AgentAction[];
  /** A short, comprehensible note. Never the internal reason. `null` if none. */
  readonly note: string | null;
}

/**
 * The label an ADVISOR message is shown with. A visitor's own message shares the
 * same status vocabulary (both messages of a settled turn carry the turn's
 * outcome) but must NOT be labelled with it: "Visitante · Respuesta del asesor"
 * is the kind of nonsense that makes a preview unreadable. Use
 * `previewStatusLabel`, which picks the right table for the role.
 */
export const PREVIEW_STATUS_LABEL: Readonly<Record<PreviewStatus, string>> = {
  PROCESSING: "Procesando…",
  ANSWERED: "Respuesta del asesor",
  FALLBACK: "Respuesta segura",
  DEGRADED: "Respuesta degradada",
  REFUSED: "Solicitud rechazada",
};

/**
 * The label a VISITOR message is shown with, for the same statuses. It describes
 * the fate of the message the visitor sent, not the shape of the reply.
 */
export const VISITOR_STATUS_LABEL: Readonly<Record<PreviewStatus, string>> = {
  PROCESSING: "Procesando…",
  ANSWERED: "Enviado",
  FALLBACK: "Enviado",
  DEGRADED: "Enviado, con aviso",
  REFUSED: "No enviado",
};

/** The status label to show for a given role. The only correct way to read them. */
export function previewStatusLabel(role: PreviewRole, status: PreviewStatus): string {
  return role === "VISITOR" ? VISITOR_STATUS_LABEL[status] : PREVIEW_STATUS_LABEL[status];
}

/* ============================== the notes =============================== */

/**
 * The only sentences the preview may attach to a turn. Each is deliberately
 * vague about WHY: a visitor cannot tell a spent budget from an open circuit
 * from a timeout, and the guard's state is not theirs to read.
 */
export const PREVIEW_NOTE = {
  notConfigured: "El asesor no está configurado en este entorno de prueba.",
  tooManyRequests:
    "Hubo demasiadas solicitudes seguidas. Espera unos segundos y vuelve a intentarlo.",
  /** The turn could not answer, so what is on screen is CA-4's safe reply. */
  temporarilyUnavailable:
    "El asesor no pudo responder con seguridad ahora mismo. Vuelve a intentarlo en unos segundos.",
  answerNotVerified: "El modelo no pasó la validación, así que se muestra el mensaje seguro.",
  /** The reply IS the model's, but the turn could not be accounted for. */
  turnNotVerified: "La respuesta se muestra, pero este turno no pudo verificarse por completo.",
} as const;

/** Rate-limit denials, by the suffix CA-8's vocabulary gives them. */
const RATE_LIMIT_SUFFIXES: readonly string[] = [
  "SESSION_RATE_LIMIT",
  "GLOBAL_RATE_LIMIT",
  "CONCURRENCY_LIMIT",
];

/* ============================ classification ============================ */

/** The status a COMPLETED turn is shown with. */
export function previewStatusFor(outcome: TurnOutcome): PreviewStatus {
  if (outcome.degraded) return "DEGRADED";
  return outcome.response.grounding_status === "GROUNDED" ? "ANSWERED" : "FALLBACK";
}

/**
 * The note a completed turn is shown with.
 *
 * TOTAL over the reason space: any reason the mapping does not recognise falls
 * to a generic sentence, so an unfamiliar diagnostic can never leak through by
 * omission. The tests pin that property, not the exact wording of each branch.
 *
 * The last two branches are chosen by what is ACTUALLY on screen rather than by
 * the cause: a degraded turn whose reply is grounded shows the model's own text
 * (the consumption was unmeasurable, not the answer), while a degraded turn
 * showing CA-4's safe reply says the advisor could not answer safely. Saying
 * "unavailable" next to a perfectly good reply would be a lie a reviewer could
 * catch, and saying "safe reply" next to the model's text would be another.
 */
export function previewNoteFor(outcome: TurnOutcome): string | null {
  const grounded = outcome.response.grounding_status === "GROUNDED";

  if (!outcome.degraded) {
    return grounded ? null : PREVIEW_NOTE.answerNotVerified;
  }

  const reason = outcome.degraded_reason ?? "";
  if (reason === "PROVIDER_NOT_CONFIGURED") return PREVIEW_NOTE.notConfigured;
  if (RATE_LIMIT_SUFFIXES.some((suffix) => reason.endsWith(suffix))) {
    return PREVIEW_NOTE.tooManyRequests;
  }
  // Budget, circuit, kill switch, guard unavailable, provider failure, timeout,
  // unknown consumption: no cause named, only what the surface is showing.
  return grounded ? PREVIEW_NOTE.turnNotVerified : PREVIEW_NOTE.temporarilyUnavailable;
}

/* ============================== the builders ============================ */

/** The visitor's own message, before anything has answered it. */
export function visitorPreviewMessage(id: string, text: string): PreviewMessage {
  return { id, role: "VISITOR", text, status: "PROCESSING", actions: [], note: null };
}

/** The same message once its turn has settled: the exchange's outcome. */
export function settledVisitorMessage(
  message: PreviewMessage,
  status: PreviewStatus,
): PreviewMessage {
  return { ...message, status };
}

/**
 * The advisor's message for a COMPLETED turn.
 *
 * `response` is what CA-7.2's adapter returned, and its `text` is carried
 * verbatim — it already passed CA-4's deterministic screen. Nothing is appended
 * to it: CA-4's `limitations` carry the internal marker `respuesta_no_emitida:
 * <reason>`, and the adapter drops them precisely so this projection never has
 * to.
 */
export function advisorPreviewMessage(
  id: string,
  response: AgentResponse,
  outcome: TurnOutcome,
): PreviewMessage {
  return {
    id,
    role: "ADVISOR",
    text: response.text,
    status: previewStatusFor(outcome),
    actions: [...response.actions],
    note: previewNoteFor(outcome),
  };
}

/**
 * The refusal message. A refusal never reaches the adapter — there is no
 * `TurnOutcome` — so the surface explains the refusal instead. `detail` is
 * CA-7.1B's own fixed, non-reflective sentence.
 */
export function refusedPreviewMessage(id: string, detail: string): PreviewMessage {
  return { id, role: "ADVISOR", text: detail, status: "REFUSED", actions: [], note: null };
}

/* ============================== invariants ============================== */

/**
 * Whether a message carries anything a surface could execute. The preview's
 * answer must always be "no"; the helper exists so a test can say so directly
 * rather than trusting the table to stay empty.
 */
export function hasExecutableActions(message: PreviewMessage): boolean {
  return message.actions.length > 0;
}

/** Every action the transcript would offer, across all messages. */
export function executableActions(messages: readonly PreviewMessage[]): readonly AgentAction[] {
  return messages.flatMap((message) => message.actions);
}
