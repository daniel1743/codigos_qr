import "@tanstack/react-start/server-only";

/**
 * CRIPQER BILLING — THE `card_token_id` REQUEST CONTRACT (MP-M3D.7)
 *
 * This module is the ONLY place that decides what may cross from the browser to
 * this server for a Mercado Pago subscription start. It is pure, total and
 * side-effect free: it reads no request, sends nothing and calls nothing. The
 * route handler parses the JSON, this module judges it, and the flow interprets
 * the verdict — AFTER identity has been proven.
 *
 * WHY THIS EXISTS AT ALL
 * MP-M3D.6 established that Mercado Pago will not create a subscription attached
 * to a plan without a `card_token_id`, and MP-M3D.5 captured the provider saying
 * exactly that (`400 "card_token_id is required"`). The old flow read no body at
 * all — there was nothing a caller could send that reached Mercado Pago. That
 * property is now gone by necessity, and this file is the replacement: instead
 * of "no input", the contract is "EXACTLY ONE field, and nothing else can be
 * said".
 *
 * THE ONE FIELD
 * `card_token_id` is the single value a browser is allowed to contribute. It is
 * produced by Mercado Pago's own client integration inside Mercado Pago's own
 * card fields, so Cripqer's server never receives a PAN or a CVV (see the
 * module-level note in `preapproval-creation.ts`). Everything else the provider
 * needs — who the payer is, which plan, what status to create — this server
 * derives, and NO field exists by which a caller could propose any of them.
 *
 * WHAT A HOSTILE BODY CANNOT DO
 * Not "it is validated and rejected": there is no shape of this body that
 * changes the owner, the price, the currency, the interval, the plan, the trial
 * or the created status. `user_id`, `payer_email`, `preapproval_plan_id`,
 * `status`, `amount`, `currency`, `frequency`, `frequency_type`, `free_trial`,
 * `external_reference` and `payer_id` are not ignored — their PRESENCE is
 * rejected, so a caller cannot even learn whether they would have been honoured,
 * and an audit of "what can the browser influence" has one answer: the token.
 *
 * WHY UNKNOWN FIELDS ARE REJECTED RATHER THAN IGNORED
 * Ignoring is the friendlier choice and the worse one. A body carrying
 * `payer_email` would be silently accepted and quietly dropped, and the next
 * reader of this integration — or the next client build — would reasonably
 * conclude the field does something. Rejecting keeps the contract honest: if a
 * field is not part of it, sending it is an error, and the caller finds out at
 * once instead of shipping a belief that was never true. It also means a
 * downgrade attack (send extra fields, hope an older server honours one) fails
 * loudly.
 *
 * WHY THE TOKEN IS NEVER ECHOED
 * Every rejection below names WHAT was wrong, never the value. A `card_token_id`
 * is single-use and short-lived, but it is still payment material, and this
 * module is on the path from an untrusted request to a log line: the safest
 * rule available is that the token is never carried in a message, a reason or a
 * thrown error, so no downstream sink can leak what it was never given.
 */

/* ================================ bounds ================================ */

/**
 * The largest `card_token_id` this server will accept.
 *
 * Mercado Pago's documented tokens are opaque alphanumeric strings well under
 * this bound. The limit is not a format assertion — the provider owns the format
 * and this module must not invent one — it is a denial-of-service bound: an
 * unbounded string is forwarded to the provider on the server's own credential,
 * and `POST /preapproval` has no documented idempotency key, so a request built
 * from a megabyte of "token" could cost a real provider round trip.
 */
export const CARD_TOKEN_ID_MAX_LENGTH = 128;

/**
 * The complete set of field names this endpoint accepts. Exactly one.
 *
 * Declared as a frozen list rather than a check against a single name so that
 * the rejection path can be written as "anything not on this list", which is the
 * property that actually matters: a field added to a future client build is
 * refused by a server that has not been taught about it.
 */
export const START_PRO_ALLOWED_BODY_FIELDS: readonly string[] = Object.freeze(["card_token_id"]);

/* ================================ outcomes =============================== */

/**
 * Why a browser-supplied body was refused. Closed on purpose: each maps to one
 * response and one diagnostic, so a refusal is auditable without the value.
 */
export type CardTokenRejection =
  /** No `card_token_id` field, or one that is not a non-empty string. */
  | "MISSING_CARD_TOKEN"
  /** A `card_token_id` that is a string but empty, whitespace or over the bound. */
  | "INVALID_CARD_TOKEN"
  /** At least one field that is not on `START_PRO_ALLOWED_BODY_FIELDS`. */
  | "UNEXPECTED_FIELDS"
  /** The body was not a JSON object at all (array, scalar, null, or unparsable). */
  | "MALFORMED_BODY";

export type CardTokenReadResult =
  | { ok: true; cardTokenId: string }
  | { ok: false; reason: CardTokenRejection };

/* ============================== the judgement =========================== */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Judges an already-parsed request body against the frozen contract.
 *
 * TOTAL: it returns a verdict for every possible input and never throws, so the
 * caller can ask "may this request proceed" without a try/catch that might
 * accidentally swallow something else.
 *
 * ORDER OF CHECKS, and why it is this order:
 *   1. shape      — a non-object cannot be judged field by field
 *   2. extra keys — before reading the token, so a body carrying `payer_email`
 *                   is refused as a contract violation rather than reported as
 *                   a token problem that would send a debugger down the wrong
 *                   path
 *   3. the token  — present, a string, non-empty, within the bound
 *
 * The returned `cardTokenId` is TRIMMED. Mercado Pago's tokens carry no
 * meaningful whitespace, and a pasted token with a trailing newline would
 * otherwise be forwarded and rejected by the provider as invalid — a failure
 * whose cause would look, from the outside, exactly like a bad card.
 */
export function readCardTokenFromBody(body: unknown): CardTokenReadResult {
  if (!isPlainObject(body)) {
    return { ok: false, reason: "MALFORMED_BODY" };
  }

  for (const key of Object.keys(body)) {
    if (!START_PRO_ALLOWED_BODY_FIELDS.includes(key)) {
      return { ok: false, reason: "UNEXPECTED_FIELDS" };
    }
  }

  const raw: unknown = body["card_token_id"];
  if (raw === undefined || raw === null) {
    return { ok: false, reason: "MISSING_CARD_TOKEN" };
  }
  if (typeof raw !== "string") {
    return { ok: false, reason: "MISSING_CARD_TOKEN" };
  }

  const token = raw.trim();
  if (token === "") {
    return { ok: false, reason: "INVALID_CARD_TOKEN" };
  }
  if (token.length > CARD_TOKEN_ID_MAX_LENGTH) {
    return { ok: false, reason: "INVALID_CARD_TOKEN" };
  }

  return { ok: true, cardTokenId: token };
}

/**
 * Parses raw request text into a value this module can judge.
 *
 * Separate from `readCardTokenFromBody` because the two failures are genuinely
 * different: text that is not JSON never became a body, while a body that is
 * JSON but the wrong shape did. Both end in the same refusal, but keeping them
 * distinguishable means a future metric can tell "the client sent garbage" from
 * "the client sent the wrong contract" without re-reading the request.
 *
 * Text length is bounded BEFORE parsing: a hostile body should not be able to
 * make this server allocate a large parse tree on an endpoint that holds a
 * payment credential.
 */
export const START_PRO_MAX_BODY_BYTES = 4096;

export function parseJsonBody(text: string): unknown | undefined {
  if (typeof text !== "string") return undefined;
  if (text.length === 0) return undefined;
  if (text.length > START_PRO_MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Reads and judges the browser's body in one step. Never throws.
 *
 * The length is bounded TWICE and for two different reasons. A declared
 * `content-length` over the bound is refused WITHOUT reading the stream, so an
 * oversized body never has to be buffered at all; the text bound inside
 * `parseJsonBody` then covers the case where the header was absent, lied about,
 * or the request was chunked — a client that omits `content-length` must not
 * get a free pass to make this server hold an arbitrary string on an endpoint
 * that carries a payment credential.
 *
 * The `await request.text()` is wrapped because a request body can fail to
 * arrive (a client that disconnects mid-upload). That is a refusal, not a crash:
 * a broken stream must not be able to escape as an unhandled rejection in a
 * handler whose whole contract is "every failure becomes a status".
 */
export async function readCardTokenFromRequest(request: {
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}): Promise<CardTokenReadResult> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const length = Number.parseInt(declared, 10);
    if (Number.isFinite(length) && length > START_PRO_MAX_BODY_BYTES) {
      return { ok: false, reason: "MALFORMED_BODY" };
    }
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, reason: "MALFORMED_BODY" };
  }

  return readCardTokenFromBody(parseJsonBody(text));
}
