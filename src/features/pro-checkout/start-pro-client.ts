/**
 * CRIPQER BILLING — THE CLIENT HALF OF THE `card_token_id` HANDOFF (MP-M3D.7)
 *
 * This module is the ONLY place in the browser that knows the start-pro endpoint
 * exists. It does one thing: carry a `card_token_id` that Mercado Pago's own
 * client integration produced, hand it to Cripqer's server as the single field of
 * a JSON body, and interpret the closed answer.
 *
 * WHAT THE BROWSER DOES NOT DECIDE, AND CANNOT EVEN EXPRESS HERE
 * There is no parameter for a user, a payer email, a plan, a price, a currency, a
 * frequency, a trial or a status. The server derives every one of those, and the
 * server's own contract REJECTS a body that tries to say otherwise. That is
 * deliberate on both sides: this module cannot send what it cannot express, and
 * the server refuses to accept it if it ever could.
 *
 * THE TOKEN NEVER RESTS
 * It arrives as an argument, goes into exactly one request body, and leaves
 * scope. It is not stored in a module variable, not attached to a result, not
 * placed in an error, not written to a console — including on the failure paths,
 * which is where a helpful-looking `console.error(error)` would put it. Every
 * result in the union below is a closed word or a bounded string that the server
 * itself sent; none of them can carry the token.
 *
 * WHY THE RESULT IS A CLOSED UNION RATHER THAN A THROWN ERROR
 * The caller is a React component that must render something for every outcome.
 * A union forces it to handle each one, and a `NETWORK_ERROR` — the case a thrown
 * `fetch` rejection would produce — becomes an ordinary branch rather than an
 * unhandled rejection in a payment form.
 */

/**
 * The one endpoint this module talks to. Same-origin and relative on purpose: an
 * absolute URL from an environment variable would add a second, configurable
 * destination for a payment request.
 */
export const START_PRO_PATH = "/api/billing/mercadopago/start-pro";

/** The largest token the server will accept. Kept equal by contract, not import. */
export const CLIENT_CARD_TOKEN_MAX_LENGTH = 128;

/**
 * What the client is allowed to receive back. Mirrors the server's response
 * contract exactly, because a status the client does not know about must be
 * treated as a failure rather than as an unnamed success.
 */
export type StartProResult =
  | {
      status: "READY";
      /** The subscription's provider status, e.g. `authorized`. Opaque text. */
      providerSubscriptionStatus: string | null;
      /** A provider checkout URL, or null when the provider issued none. */
      checkoutUrl: string | null;
    }
  | { status: "INVALID_REQUEST" }
  | { status: "UNCONFIGURED" }
  | { status: "PAYER_EMAIL_REQUIRED" }
  | { status: "ALREADY_IN_PROGRESS" }
  | { status: "PROVIDER_ERROR" }
  | { status: "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED" }
  | { status: "UNAUTHENTICATED" }
  | { status: "METHOD_NOT_ALLOWED" }
  | { status: "INTERNAL_ERROR" }
  /** The request never produced a response: offline, DNS, TLS, or aborted. */
  | { status: "NETWORK_ERROR" }
  /** A response that is not the documented contract. Never interpreted as success. */
  | { status: "UNEXPECTED_RESPONSE" };

const KNOWN_STATUSES: ReadonlySet<string> = new Set([
  "READY",
  "INVALID_REQUEST",
  "UNCONFIGURED",
  "PAYER_EMAIL_REQUIRED",
  "ALREADY_IN_PROGRESS",
  "PROVIDER_ERROR",
  "REMOTE_PREAPPROVAL_CREATED_CORRELATION_FAILED",
  "UNAUTHENTICATED",
  "METHOD_NOT_ALLOWED",
  "INTERNAL_ERROR",
]);

/**
 * Whether a value may be spent as a card token.
 *
 * The same bounds the server enforces, checked here as well so an obviously
 * unusable token never costs a network round trip. This is NOT a format
 * assertion: Mercado Pago owns the token format, and a client that invented one
 * would start rejecting valid tokens the day the provider changed shape.
 */
export function isUsableCardToken(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const token = value.trim();
  return token !== "" && token.length <= CLIENT_CARD_TOKEN_MAX_LENGTH;
}

/**
 * Builds the request body. Exactly one key, always.
 *
 * Returned as a literal `{ card_token_id }` — not assembled from a caller's
 * object — so there is no code path that could add a second field, and no test
 * that has to prove one is absent.
 */
export function buildStartProRequestBody(cardTokenId: string): { card_token_id: string } {
  return { card_token_id: cardTokenId.trim() };
}

function readReadyPayload(body: Record<string, unknown>): Extract<StartProResult, { status: "READY" }> {
  const providerSubscriptionStatus = body["providerSubscriptionStatus"];
  const checkoutUrl = body["checkoutUrl"];

  return {
    status: "READY",
    providerSubscriptionStatus:
      typeof providerSubscriptionStatus === "string" && providerSubscriptionStatus.trim() !== ""
        ? providerSubscriptionStatus.trim()
        : null,
    // Handed to a browser as a navigation target later, so the scheme is checked
    // here too. The server already refuses anything but https; a client that
    // trusted it would be one server change away from navigating somewhere else.
    checkoutUrl:
      typeof checkoutUrl === "string" && checkoutUrl.trim().startsWith("https://")
        ? checkoutUrl.trim()
        : null,
  };
}

export interface StartProOptions {
  /** The token Mercado Pago's client integration produced. */
  cardTokenId: string;
  /** Injected for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Lets a caller abandon an in-flight start, e.g. on unmount. */
  signal?: AbortSignal;
}

/**
 * Starts a PRO subscription with a card token. Never throws; never logs.
 *
 * A non-2xx response is not an exception here — the server answers every failure
 * with a documented status word and a 4xx/5xx code, and reading that word is how
 * the caller learns what to tell the payer.
 */
export async function startProWithCardToken(options: StartProOptions): Promise<StartProResult> {
  if (!isUsableCardToken(options.cardTokenId)) {
    return { status: "INVALID_REQUEST" };
  }

  const doFetch = options.fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== "function") {
    return { status: "NETWORK_ERROR" };
  }

  let response: Response;
  try {
    response = await doFetch(START_PRO_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildStartProRequestBody(options.cardTokenId)),
      // The session cookie is what proves identity to the server. Without it the
      // canonical auth seam answers 401 and no subscription is attempted.
      credentials: "same-origin",
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    });
  } catch {
    // A thrown fetch means nothing was received: offline, DNS, TLS, or an abort.
    // Not an error to report to a console — an outcome to render.
    return { status: "NETWORK_ERROR" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: "UNEXPECTED_RESPONSE" };
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { status: "UNEXPECTED_RESPONSE" };
  }

  const rawStatus = (body as Record<string, unknown>)["status"];
  if (typeof rawStatus !== "string" || !KNOWN_STATUSES.has(rawStatus)) {
    // A status this client has never heard of is NOT success. Treating an
    // unrecognised word as "probably fine" is how a client ends up showing a
    // confirmation for a subscription that was refused.
    return { status: "UNEXPECTED_RESPONSE" };
  }

  if (rawStatus === "READY") {
    return readReadyPayload(body as Record<string, unknown>);
  }

  return { status: rawStatus } as StartProResult;
}
