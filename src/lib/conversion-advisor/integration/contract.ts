/**
 * CRIPQER Conversion Advisor — CA-7.1B · the conversational-turn contract.
 *
 * PURE: no server module is imported, no environment variable is read, nothing
 * touches the network. The `createServerFn` validator runs on the client as
 * well, so this file has to be able to refuse a malformed request without
 * dragging the provider, the guardrail ledger or a credential into the browser
 * bundle.
 *
 * The request is parsed into a FRESH object with exactly three keys. Every other
 * key the caller sends is dropped instead of forwarded: that is how a visitor
 * becomes structurally unable to supply provider configuration, a privileged
 * action, or any other field the turn might otherwise be tempted to trust.
 *
 * CONV-02 added the third key, `landingContext`: the landing's own product state
 * (business type, goal, channel, chosen style, last shown styles). It is bounded
 * and catalog-validated by `landing-context.ts`, it never carries a name, a
 * description, a transcript or a session id, and it grants the model nothing —
 * it only stops the advisor asking again for what the visitor already chose.
 */

import { type AdvisorResponse, type GroundingStatus } from "../advisor/response";
import { type DenialReason } from "../guardrails/ledger.server";
import { type ListenUsage } from "../intents/classifier.server";
import { type IntentId, type NextBestAction } from "../intents/contract";
import { sanitizeLandingContext, type LandingContextSnapshot } from "./landing-context";

/* =============================== bounds ================================= */

export const TURN_LIMITS = {
  /**
   * CA-1's own per-message limit (`ADVISOR_LIMITS.maxMessageChars`). Repeated
   * here as a number, not imported, to keep this file free of server modules;
   * a test pins the two together so the copy cannot drift unnoticed.
   */
  maxProviderMessageChars: 2_000,
  /**
   * What a visitor may send.
   *
   * CA-3 and CA-4 do not forward the visitor's text verbatim: both assemble a
   * larger message around it, and CA-1 refuses any single message over
   * `maxProviderMessageChars`. A message accepted here must therefore survive
   * that assembly, or the provider call is refused LOCALLY — after a
   * reservation was already held, which would charge the budget for a call that
   * never left the process.
   *
   * Worst case, from the frozen sources:
   *   CA-3 prepends "[contexto de esta misma conversación · rubro ya conocido:
   *   <80> · objetivo ya conocido: <80>]\n"                       ≈ 245 chars
   *   CA-4 prepends "Mensaje del visitante:\n"""…"""\n\nSeñales ya comprendidas
   *   (no las contradigas): " plus JSON.stringify of the bounded signals
   *   (3 intents + 60-char business_type + 120-char goal + 4 × 120-char
   *   objections, all with their keys)                          ≈ 890 chars
   * 2000 − 890 = 1110, so 1100 leaves the binding constraint (CA-4) with a
   * margin while staying far above any plausible chat message.
   */
  maxMessageChars: 1_100,
} as const;

/* ============================== failures ================================ */

export const TURN_FAILURE_REASONS = [
  "INVALID_INPUT",
  "SESSION_UNKNOWN",
  "TURN_LIMIT_REACHED",
  "PROVIDER_MISCONFIGURED",
] as const;

export type TurnFailureReason = (typeof TURN_FAILURE_REASONS)[number];

/**
 * What the caller may send. `sessionId` identifies a CONVERSATION, never a
 * person, and never authorises anything: CA-5 decides what may happen.
 *
 * `landingContext` is the landing's product snapshot, already sanitised into a
 * fresh object by the time it lands here, or `null` when the caller sent none.
 */
export interface TurnRequest {
  readonly sessionId: string;
  readonly message: string;
  readonly landingContext: LandingContextSnapshot | null;
}

export type TurnValidation =
  | { readonly ok: true; readonly request: TurnRequest }
  | { readonly ok: false; readonly reason: TurnFailureReason; readonly detail: string };

/**
 * A v4-shaped uuid, mirroring CA-6's `isValidSessionId`.
 *
 * Repeated rather than imported because that function lives in a server-only
 * module; a test proves this copy accepts and refuses exactly the same fixtures
 * as the real one, so the duplication cannot drift. The authoritative check is
 * still CA-6's — `getSession` refuses anything that is not a known session.
 */
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Keys the caller may send. Anything else is dropped, never forwarded. */
const REQUEST_KEYS: readonly string[] = ["sessionId", "message", "landingContext"];

/**
 * Bounds and types the turn. Total: it always answers, and every refusal is a
 * typed reason with a fixed, non-reflective message (nothing the visitor typed
 * is echoed back into an error string).
 */
export function validateTurnRequest(input: unknown): TurnValidation {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, reason: "INVALID_INPUT", detail: "La solicitud no es válida." };
  }

  const record = input as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!REQUEST_KEYS.includes(key)) {
      // Refusing the extra key is the point: a smuggled `config`, `action` or
      // `provider` field must not even be ignored silently at the edge.
      return { ok: false, reason: "INVALID_INPUT", detail: "La solicitud no es válida." };
    }
  }

  const sessionId = record["sessionId"];
  if (typeof sessionId !== "string" || !SESSION_ID_PATTERN.test(sessionId)) {
    return { ok: false, reason: "INVALID_INPUT", detail: "La sesión no es válida." };
  }

  const rawMessage = record["message"];
  if (typeof rawMessage !== "string") {
    return { ok: false, reason: "INVALID_INPUT", detail: "El mensaje no es válido." };
  }
  const message = rawMessage.trim();
  if (message === "") {
    return { ok: false, reason: "INVALID_INPUT", detail: "Escribe un mensaje para continuar." };
  }
  if (message.length > TURN_LIMITS.maxMessageChars) {
    return {
      ok: false,
      reason: "INVALID_INPUT",
      detail: `El mensaje supera el máximo de ${TURN_LIMITS.maxMessageChars} caracteres.`,
    };
  }

  // CONV-02. Absent is legitimate (a first turn, or a caller with no product
  // state); present must be EXACT. Every id is checked against the real catalog
  // and `readyForPage` is recomputed, so a client cannot authorise a page by
  // asserting one, nor smuggle an unknown template into the prompt.
  const landing = sanitizeLandingContext(record["landingContext"]);
  if (!landing.ok) {
    return { ok: false, reason: "INVALID_INPUT", detail: "El contexto de la landing no es válido." };
  }

  // A fresh object: the visitor's own object is never handed downstream.
  return { ok: true, request: { sessionId, message, landingContext: landing.value } };
}

/* ======================== per-operation reporting ======================= */

/** Whether a reservation was even asked for, kept apart from what was spent. */
export type ReservationState = "NOT_REQUESTED" | "GRANTED" | "DENIED";

/**
 * One guarded provider operation, as the server sees it.
 *
 * `reservation` and `usage` are reported SEPARATELY on purpose: "the guard
 * refused to authorise this call" and "this call consumed nothing" are
 * different facts, and inferring one from the other is how a budget quietly
 * stops meaning anything.
 */
export interface TurnOperationReport {
  readonly reservation: ReservationState;
  readonly denied_reason: DenialReason | null;
  /** CA-3's three-state vocabulary, reused verbatim rather than translated. */
  readonly usage: ListenUsage;
  /** `null` when the operation never ran: a duration that did not happen. */
  readonly latency_ms: number | null;
  /** Attempts the reservation had to cover: `1 + effective maxRetries`. */
  readonly attempts_reserved: number;
  /** Why it degraded, when it did. Never a visitor-facing string. */
  readonly failure_reason: string | null;
  /**
   * CA-12. Present only when the understanding was resolved locally, with no
   * provider call and no reservation. Absent on every provider-backed report —
   * including the `NOT_REQUESTED` report of an unconfigured provider, which is
   * a different fact. `reservation` stays `NOT_REQUESTED` and `usage`
   * `NOT_INVOKED`, because that is literally what happened.
   */
  readonly deterministic?: true;
}

/* ============================== the outcome ============================= */

export interface TurnSessionState {
  readonly turns_used: number;
  readonly turns_remaining: number;
}

export interface TurnLatency {
  readonly understanding: number | null;
  readonly commercial_advice: number | null;
  readonly total: number;
}

/**
 * SERVER-SIDE view of a completed turn. It carries diagnostics — per-operation
 * usage, latency, denial reasons — that must never reach a browser: publishing
 * "the daily budget is exhausted" to a visitor would turn the guard into a
 * probe. `toPublicTurnResult` is the only projection to the wire, and it names
 * every field it publishes instead of spreading this object.
 */
export interface TurnOutcome {
  readonly session_id: string;
  /**
   * CONV-02. The provider model this turn resolved to (`ADVISOR_MODEL` →
   * `DEEPSEEK_MODEL` → `deepseek-flash`), or `null` when no provider was
   * configured and the reply was CA-4's safe fallback. It is the observable
   * evidence that the turn used the canonical advisor path and not another
   * brain, so it is published — the id of a model is not a secret.
   */
  readonly model: string | null;
  /** CA-4's own response contract, carried through unchanged. */
  readonly response: AdvisorResponse;
  /** True when the turn could not consult the provider as intended. */
  readonly degraded: boolean;
  readonly degraded_reason: string | null;
  readonly understanding: TurnOperationReport;
  readonly commercial_advice: TurnOperationReport;
  readonly latency_ms: TurnLatency;
  readonly session: TurnSessionState;
  /** False when the turn was refused before anything could be consulted. */
  readonly persisted: boolean;
}

/* ============================ the wire shape ============================ */

/**
 * What a browser receives. Deliberately narrow: no usage, no latency, no
 * denial reason, no attempt count, no session key. `degraded` is a bare
 * boolean — enough for the surface to offer a retry, not enough to read the
 * guard's state.
 */
export interface PublicTurnResult {
  readonly session_id: string;
  /** CONV-02: which canonical model answered, or `null` without a provider. */
  readonly model: string | null;
  readonly reply: string;
  readonly detected_intents: readonly IntentId[];
  readonly relevant_capability_ids: readonly string[];
  readonly suggested_action: NextBestAction;
  readonly limitations: readonly string[];
  readonly grounding_status: GroundingStatus;
  readonly degraded: boolean;
  readonly turns_used: number;
  readonly turns_remaining: number;
}

export function toPublicTurnResult(outcome: TurnOutcome): PublicTurnResult {
  return {
    session_id: outcome.session_id,
    model: outcome.model,
    reply: outcome.response.reply,
    detected_intents: outcome.response.detected_intents,
    relevant_capability_ids: outcome.response.relevant_capability_ids,
    suggested_action: outcome.response.suggested_action,
    limitations: outcome.response.limitations,
    grounding_status: outcome.response.grounding_status,
    degraded: outcome.degraded,
    turns_used: outcome.session.turns_used,
    turns_remaining: outcome.session.turns_remaining,
  };
}

/* ===================== CONV-02 · the facade's wire union ================= */

/**
 * The CLOSED union `askAdvisorAssistantFn` answers with.
 *
 * A refusal is a VALUE, not an exception: the facade's provider has to map it to
 * its own stable text, and a thrown error would lose the typed reason and depend
 * on how a particular client serialises exceptions. `UNAVAILABLE` exists for the
 * one case the pipeline does not model — an unexpected throw below it — so even
 * then the wire stays inside the union.
 *
 * Nothing else may cross: no usage, no denial reason, no provider body, no
 * stack, no credential, no session secret beyond the conversation id the landing
 * already owns.
 */
export const ASSISTANT_TURN_FAILURE_CODES = [
  ...TURN_FAILURE_REASONS,
  "UNAVAILABLE",
] as const;

export type AssistantTurnFailureCode = (typeof ASSISTANT_TURN_FAILURE_CODES)[number];

export type AssistantTurnResult =
  | { readonly ok: true; readonly data: PublicTurnResult }
  | { readonly ok: false; readonly code: AssistantTurnFailureCode; readonly message: string };
