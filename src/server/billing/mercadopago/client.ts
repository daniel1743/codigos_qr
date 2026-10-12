import "@tanstack/react-start/server-only";

import type { MercadoPagoConfig } from "./types.ts";

/**
 * CRIPQER BILLING — MERCADO PAGO HTTP CLIENT (MP-M1)
 *
 * A minimal, server-side HTTP client for the Mercado Pago API. No SDK: the three
 * reads this phase needs are plain authenticated GETs, and a dependency that
 * ships its own retry, logging and telemetry defaults is a larger surface to
 * audit than the 80 lines below.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   · No retries. A billing read that fails is retried by the webhook host on
 *     redelivery (canonical events are re-claimable), not by a hidden loop that
 *     can turn one slow provider minute into a request storm.
 *   · No fallback. There is no "if the lookup fails, assume active" path — the
 *     caller gets a typed error and the event stays unapplied.
 *   · No logging. Nothing here writes to stdout/stderr, so a token cannot leak
 *     through a debug line.
 *   · No raw error body. A provider failure is never reproduced. What the error
 *     carries instead is a SANITIZED DIAGNOSTIC (`MercadoPagoDiagnostic`), built
 *     from a closed allowlist of provider fields, each one redacted and
 *     length-capped. The body itself is discarded, `message` never contains any
 *     of it, and no diagnostic value is ever returned to a caller as data.
 *
 * WRITES (MP-M3B)
 * MP-M3B adds exactly one write capability: `postJson`, used to provision the
 * remote PRO plan in a single, deliberate operator action. It is not a general
 * mutation surface — no retry, no background caller, and nothing imports it
 * automatically. Reads and writes share one implementation, so the token is
 * attached in one place, the timeout armed in one place and a failure
 * classified in one place — and a GET is the same request it was before
 * `postJson` existed.
 */

export const MERCADOPAGO_API_BASE_URL = "https://api.mercadopago.com";

/** Explicit timeout. A billing lookup that hangs must fail, not wait. */
export const DEFAULT_MERCADOPAGO_TIMEOUT_MS = 8000;

/* ================================ errors ================================ */

export type MercadoPagoErrorCode =
  /** No access token is configured. Nothing was sent. */
  | "MISSING_ACCESS_TOKEN"
  /**
   * Raised LOCALLY, before any request: this adapter refuses to send what it
   * was asked to send (e.g. a PRO plan request with no usable return URL).
   * Never produced by a provider response.
   */
  | "INVALID_REQUEST"
  /** 401/403 — credentials rejected. */
  | "UNAUTHORIZED"
  /** 404 — the resource does not exist (or is not visible to this token). */
  | "NOT_FOUND"
  /** The request exceeded the configured timeout. */
  | "TIMEOUT"
  /** The request failed before a response was received. */
  | "NETWORK_ERROR"
  /** A 2xx response whose body is not a JSON object. */
  | "INVALID_JSON"
  /** Any other non-2xx response. */
  | "HTTP_ERROR"
  /** The fetcher was asked for a provider it does not serve. */
  | "WRONG_PROVIDER"
  /** The fetcher was asked for a resource kind it has no path for. */
  | "UNSUPPORTED_RESOURCE_TYPE"
  /** A payment that references no preapproval: not a subscription event. */
  | "UNLINKED_PAYMENT";

/* ========================== provider diagnostics ======================== */

/**
 * How a provider call failed, as a closed category (MP-M3D.4).
 *
 * `MercadoPagoErrorCode` answers "what should the caller do" and is precise
 * enough to branch on. This answers the narrower, operational question "did the
 * provider answer us, and how" — the question an operator asks when a 502 has
 * already been returned and the only remaining evidence is what got logged.
 *
 * The mapping is total and documented in `failureCategoryForCode`. Codes raised
 * BEFORE anything left the process (`MISSING_ACCESS_TOKEN`, `INVALID_REQUEST`,
 * `WRONG_PROVIDER`, `UNSUPPORTED_RESOURCE_TYPE`, `UNLINKED_PAYMENT`) fall into
 * `PROVIDER_UNKNOWN_ERROR` — there is no provider outcome to categorize, and
 * the accompanying `code` still carries the precise local reason, so nothing is
 * lost. It is also the residual for any code a future phase adds.
 */
export type MercadoPagoFailureCategory =
  /** The provider answered with a non-2xx status. */
  | "PROVIDER_HTTP_ERROR"
  /** The request exceeded the configured timeout. */
  | "PROVIDER_TIMEOUT"
  /** The request failed before a response was received. */
  | "PROVIDER_NETWORK_ERROR"
  /** A 2xx response whose body could not be used. */
  | "PROVIDER_INVALID_RESPONSE"
  /** A failure with no provider outcome to categorize. */
  | "PROVIDER_UNKNOWN_ERROR";

const FAILURE_CATEGORY_BY_CODE: Record<MercadoPagoErrorCode, MercadoPagoFailureCategory> = {
  MISSING_ACCESS_TOKEN: "PROVIDER_UNKNOWN_ERROR",
  INVALID_REQUEST: "PROVIDER_UNKNOWN_ERROR",
  UNAUTHORIZED: "PROVIDER_HTTP_ERROR",
  NOT_FOUND: "PROVIDER_HTTP_ERROR",
  TIMEOUT: "PROVIDER_TIMEOUT",
  NETWORK_ERROR: "PROVIDER_NETWORK_ERROR",
  INVALID_JSON: "PROVIDER_INVALID_RESPONSE",
  HTTP_ERROR: "PROVIDER_HTTP_ERROR",
  WRONG_PROVIDER: "PROVIDER_UNKNOWN_ERROR",
  UNSUPPORTED_RESOURCE_TYPE: "PROVIDER_UNKNOWN_ERROR",
  UNLINKED_PAYMENT: "PROVIDER_UNKNOWN_ERROR",
};

/** Total: every code maps, so a category is always present. */
export function failureCategoryForCode(code: MercadoPagoErrorCode): MercadoPagoFailureCategory {
  return FAILURE_CATEGORY_BY_CODE[code] ?? "PROVIDER_UNKNOWN_ERROR";
}

/** Longest provider body this client will even look at. */
const MAX_PROVIDER_BODY_CHARS = 64_000;
/** Longest single sanitized string kept. */
const MAX_SANITIZED_CHARS = 300;
const MAX_CAUSE_ENTRIES = 5;

/**
 * Makes a provider-supplied string safe to keep.
 *
 * A provider error body is written by the provider and can echo request context
 * back — a payer email, a plan id, a fragment of an Authorization header. This
 * is the ONE place any of that text is touched, and it is touched destructively:
 *
 *   · only the first line survives, and control characters are dropped, so a
 *     value cannot forge a second log line;
 *   · anything shaped like an email address becomes `[redacted-email]`;
 *   · any run of 20+ identifier characters — a plan id, a token, a JWT segment —
 *     becomes `[redacted-id]`. Diagnostic WORDS are shorter than that
 *     (`card_token_id` is 13, `preapproval_plan_id` is 19), so the reason stays
 *     readable while the VALUE it refers to does not;
 *   · the result is capped, so no field can grow the error object without bound.
 *
 * Returns `null` for anything that is not a non-empty string: absence is
 * recorded as absence, never as the string "undefined" or "[object Object]".
 */
export function sanitizeProviderText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const firstLine = value.split(/[\r\n]/, 1)[0] ?? "";
  // eslint-disable-next-line no-control-regex -- dropping control chars is the point.
  const stripped = firstLine.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (stripped === "") return null;

  const redacted = stripped
    // An auth scheme and EVERYTHING after it, before any length rule can be
    // consulted. A short credential — `Bearer abc123` — is under the identifier
    // window below and would otherwise survive intact, so the scheme itself is
    // the anchor: nothing that follows one is kept, whatever its shape.
    .replace(/\b(?:Bearer|Basic|Token)\s+\S+/gi, "[redacted-auth]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .replace(/[A-Za-z0-9_.-]{20,}/g, "[redacted-id]")
    .replace(/\s{2,}/g, " ");

  return redacted.length > MAX_SANITIZED_CHARS
    ? `${redacted.slice(0, MAX_SANITIZED_CHARS)}…`
    : redacted;
}

/** The allowlisted fields this client is willing to extract from a provider body. */
interface ProviderErrorFields {
  errorType: string | null;
  causeCodes: readonly string[];
  causeDescriptions: readonly string[];
  message: string | null;
}

const NO_PROVIDER_FIELDS: ProviderErrorFields = {
  errorType: null,
  causeCodes: [],
  causeDescriptions: [],
  message: null,
};

/**
 * Mercado Pago sends `cause[].code` as a string in some responses and as a
 * number in others, and the numeric form is the specific one — dropping it would
 * lose exactly the value that names the objection. Numbers carry no request
 * context, so they are stringified rather than discarded; everything else still
 * has to survive the redactor.
 */
function coerceProviderScalar(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return sanitizeProviderText(value);
}

function readStringArray(value: unknown, field: "code" | "description"): readonly string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value.slice(0, MAX_CAUSE_ENTRIES)) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const text = coerceProviderScalar((entry as Record<string, unknown>)[field]);
    if (text !== null) out.push(text);
  }
  return out;
}

/**
 * Extracts the allowlisted fields from a raw provider body.
 *
 * This function decides what is even LOOKED AT: `error`, `message` and
 * `cause[].{code,description}`. Every other key — a payer object, a card
 * fragment, an internal id — is never read, so it cannot be recorded, so no
 * later logging edit can leak what was never captured.
 *
 * A body that is absent, oversized, not JSON, or not an object yields nothing.
 * This never throws: a diagnostic is not worth failing a billing call over.
 */
export function readProviderErrorFields(text: string): ProviderErrorFields {
  if (text === "" || text.length > MAX_PROVIDER_BODY_CHARS) return NO_PROVIDER_FIELDS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NO_PROVIDER_FIELDS;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return NO_PROVIDER_FIELDS;
  }

  const record = parsed as Record<string, unknown>;
  const causeCodes = readStringArray(record["cause"], "code");
  return {
    errorType: sanitizeProviderText(record["error"]),
    causeCodes,
    causeDescriptions: readStringArray(record["cause"], "description"),
    message: sanitizeProviderText(record["message"]),
  };
}

/**
 * The safe, closed diagnostic attached to every `MercadoPagoError`.
 *
 * Every field is either a closed code, a number, or text that has been through
 * `sanitizeProviderText`. There is no field for the request, the token, a
 * header, a payer or a raw body, so there is nothing here a log line could
 * expose that the sanitizer did not already pass.
 */
export interface MercadoPagoDiagnostic {
  readonly providerName: "mercado_pago";
  /** The HTTP method that was sent, or `null` if nothing left the process. */
  readonly operationName: "GET" | "POST" | null;
  readonly failureCategory: MercadoPagoFailureCategory;
  /** The provider's HTTP status, or `null` when there was no response. */
  readonly providerHttpStatus: number | null;
  /** The provider's error class, e.g. `bad_request`. */
  readonly providerErrorType: string | null;
  /** The first cause code, e.g. the field the provider objected to. */
  readonly providerErrorCode: string | null;
  readonly providerCauseCodes: readonly string[];
  /** The provider's own top-level message, sanitized. */
  readonly providerMessage: string | null;
  readonly providerCauseDescriptions: readonly string[];
  /** The provider's request id, when it returns one. */
  readonly providerRequestId: string | null;
  /** Wall-clock time the attempt took, or `null` if nothing was sent. */
  readonly elapsedMs: number | null;
  readonly timeoutMs: number | null;
}

/**
 * Whether an error carries a real provider-facing observation.
 *
 * `elapsedMs` is the marker, and it is the right one: it is set only after a
 * request actually left the process. An error raised locally — a missing token,
 * a refused payload — and an error a caller constructed by hand both report
 * `false`, so a consumer can keep its own diagnostics exactly as narrow as the
 * evidence, and a locally-refused start does not masquerade as a provider event.
 */
export function hasProviderObservation(diagnostic: MercadoPagoDiagnostic): boolean {
  return diagnostic.elapsedMs !== null;
}

/** The diagnostic for a failure that never reached the provider. */
function localDiagnostic(
  code: MercadoPagoErrorCode,
  timeoutMs: number | null,
): MercadoPagoDiagnostic {
  return {
    providerName: "mercado_pago",
    operationName: null,
    failureCategory: failureCategoryForCode(code),
    providerHttpStatus: null,
    providerErrorType: null,
    providerErrorCode: null,
    providerCauseCodes: [],
    providerMessage: null,
    providerCauseDescriptions: [],
    providerRequestId: null,
    elapsedMs: null,
    timeoutMs,
  };
}

/**
 * Typed Mercado Pago failure.
 *
 * `message` is safe to surface: it never contains the access token, the request
 * headers, or the provider's response body. `status` carries the HTTP status
 * when there was a response, and `null` when the failure happened before one.
 *
 * `diagnostic` (MP-M3D.4) is the safe, closed record of what the provider said.
 * It is deliberately a separate field: `message` stays a stable human sentence a
 * caller may surface, while `diagnostic` is machine-readable operator evidence.
 * Read `providerMessage` and `providerCauseDescriptions` as sanitized TEXT, never
 * as data to act on.
 *
 * `diagnostic` defaults to a local-only record, so a subclass — or a caller that
 * raises an error itself — still gets a well-formed category instead of
 * `undefined`.
 */
export class MercadoPagoError extends Error {
  readonly code: MercadoPagoErrorCode;
  readonly status: number | null;
  readonly diagnostic: MercadoPagoDiagnostic;

  constructor(
    code: MercadoPagoErrorCode,
    message: string,
    status: number | null = null,
    diagnostic?: MercadoPagoDiagnostic,
  ) {
    super(message);
    this.name = "MercadoPagoError";
    this.code = code;
    this.status = status;
    this.diagnostic = diagnostic ?? localDiagnostic(code, null);
  }
}

/* ================================ client ================================ */

export interface MercadoPagoClient {
  /**
   * Authenticated GET returning the parsed JSON body.
   *
   * Throws `MercadoPagoError` for every failure mode. Never returns a
   * non-object, and never returns a partially-parsed body.
   */
  getJson(path: string): Promise<unknown>;
}

/**
 * A client that can also WRITE.
 *
 * Kept separate from `MercadoPagoClient` on purpose: a consumer that only needs
 * to read keeps depending on the read-only type, so an accidental mutation in a
 * read path is a type error rather than a production surprise. MP-M3B has
 * exactly one consumer of this type — the PRO plan provisioning function — and
 * nothing in the application calls it automatically.
 */
export interface MercadoPagoWriteClient extends MercadoPagoClient {
  /**
   * Authenticated POST sending `body` as JSON, returning the parsed JSON body.
   *
   * Same failure discipline as `getJson`. The client does not interpret the
   * payload: it serializes what it is given and classifies what comes back.
   */
  postJson(path: string, body: unknown): Promise<unknown>;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/**
 * A provider request id is opaque, provider-issued, and NOT request context
 * echoed back — it is the one value an operator reads out loud to Mercado Pago
 * support, so it is kept verbatim rather than passed through the redactor (which
 * would eat the UUID). Safety comes from a strict SHAPE instead of from
 * redaction: identifier characters only, bounded length. Anything else — a space,
 * an `@`, a newline, an overlong value — is dropped rather than trimmed into
 * something plausible.
 */
const PROVIDER_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function readProviderRequestId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return PROVIDER_REQUEST_ID_PATTERN.test(trimmed) ? trimmed : null;
}

/** Reads a response header without letting a hostile or mock response throw. */
function readRequestIdHeader(response: Response): string | null {
  try {
    return readProviderRequestId(response.headers?.get?.("x-request-id") ?? null);
  } catch {
    return null;
  }
}

/**
 * Reads the body without letting the read itself decide the classification.
 *
 * If the body read fails (the timeout fired mid-body, the stream broke) that is
 * NOT a reason to forget that the provider already answered with a status — the
 * status is the more valuable fact, so an unreadable body degrades to empty.
 */
async function readBodySafely(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/** The diagnostic for a failure the provider answered — a status was received. */
function responseDiagnostic(input: {
  method: "GET" | "POST";
  code: MercadoPagoErrorCode;
  httpStatus: number;
  fields: ProviderErrorFields;
  requestId: string | null;
  elapsedMs: number;
  timeoutMs: number;
}): MercadoPagoDiagnostic {
  return {
    providerName: "mercado_pago",
    operationName: input.method,
    failureCategory: failureCategoryForCode(input.code),
    providerHttpStatus: input.httpStatus,
    providerErrorType: input.fields.errorType,
    providerErrorCode: input.fields.causeCodes[0] ?? null,
    providerCauseCodes: input.fields.causeCodes,
    providerMessage: input.fields.message,
    providerCauseDescriptions: input.fields.causeDescriptions,
    providerRequestId: input.requestId,
    elapsedMs: input.elapsedMs,
    timeoutMs: input.timeoutMs,
  };
}

/**
 * The diagnostic for a failure with no provider answer: a timeout or a broken
 * transport. `providerHttpStatus` stays `null` — that absence IS the signal that
 * distinguishes "Mercado Pago said no" from "we never heard back".
 */
function transportDiagnostic(input: {
  method: "GET" | "POST";
  code: MercadoPagoErrorCode;
  elapsedMs: number;
  timeoutMs: number;
}): MercadoPagoDiagnostic {
  return {
    ...localDiagnostic(input.code, input.timeoutMs),
    operationName: input.method,
    elapsedMs: input.elapsedMs,
  };
}

/**
 * Builds a client bound to one configuration.
 *
 * The access token is captured in the closure and is never placed in a header
 * the caller can read back, never interpolated into a message, and never
 * returned. A missing token fails BEFORE any request is attempted, so a
 * half-configured deployment cannot produce an unauthenticated call.
 *
 * Reads and writes run through the same `requestJson`: identical timeout,
 * identical error classification, identical header discipline. A GET carries no
 * body and no `Content-Type` — those appear only when a body is sent.
 */
export function createMercadoPagoClient(config: MercadoPagoConfig): MercadoPagoWriteClient {
  const baseUrl = (config.baseUrl ?? MERCADOPAGO_API_BASE_URL).replace(/\/+$/, "");
  const timeoutMs = config.timeoutMs ?? DEFAULT_MERCADOPAGO_TIMEOUT_MS;

  async function requestJson(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const token = config.accessToken;
    if (typeof token !== "string" || token.trim() === "") {
      throw new MercadoPagoError(
        "MISSING_ACCESS_TOKEN",
        "Mercado Pago access token is not configured.",
      );
    }

    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // Armed AFTER the token gate, so a failure that sent nothing reports
    // `elapsedMs: null` instead of a meaningless zero.
    const startedAt = Date.now();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    let payload: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    try {
      const init: RequestInit = { method, headers, signal: controller.signal };
      if (payload !== undefined) init.body = payload;

      const response = await fetch(url, init);

      // Read once, here, and only through the allowlist. `cause` is where Mercado
      // Pago names the field it objected to, so a bare status is not enough to
      // tell "the plan does not exist" from "this flow needs a card token".
      const requestId = readRequestIdHeader(response);

      if (!response.ok) {
        const fields = readProviderErrorFields(await readBodySafely(response));
        const elapsedMs = Date.now() - startedAt;
        const withDiagnostic = (code: MercadoPagoErrorCode, message: string): MercadoPagoError =>
          new MercadoPagoError(
            code,
            message,
            response.status,
            responseDiagnostic({
              method,
              code,
              httpStatus: response.status,
              fields,
              requestId,
              elapsedMs,
              timeoutMs,
            }),
          );

        if (response.status === 401 || response.status === 403) {
          throw withDiagnostic("UNAUTHORIZED", "Mercado Pago rejected the configured credentials.");
        }
        if (response.status === 404) {
          throw withDiagnostic("NOT_FOUND", "Mercado Pago resource not found.");
        }
        throw withDiagnostic(
          "HTTP_ERROR",
          `Mercado Pago responded with HTTP ${response.status}.`,
        );
      }

      const text = await readBodySafely(response);

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new MercadoPagoError(
          "INVALID_JSON",
          "Mercado Pago returned a body that is not JSON.",
          response.status,
          responseDiagnostic({
            method,
            code: "INVALID_JSON",
            httpStatus: response.status,
            fields: readProviderErrorFields(text),
            requestId,
            elapsedMs: Date.now() - startedAt,
            timeoutMs,
          }),
        );
      }

      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new MercadoPagoError(
          "INVALID_JSON",
          "Mercado Pago returned JSON that is not an object.",
          response.status,
          responseDiagnostic({
            method,
            code: "INVALID_JSON",
            httpStatus: response.status,
            fields: readProviderErrorFields(text),
            requestId,
            elapsedMs: Date.now() - startedAt,
            timeoutMs,
          }),
        );
      }

      return parsed;
    } catch (error) {
      // Typed failures keep their classification; everything else is
      // classified here so no raw fetch error escapes with a token-bearing
      // request object attached to it.
      if (error instanceof MercadoPagoError) throw error;
      if (isAbortError(error)) {
        throw new MercadoPagoError(
          "TIMEOUT",
          `Mercado Pago request timed out after ${timeoutMs}ms.`,
          null,
          transportDiagnostic({
            method,
            code: "TIMEOUT",
            elapsedMs: Date.now() - startedAt,
            timeoutMs,
          }),
        );
      }
      throw new MercadoPagoError(
        "NETWORK_ERROR",
        "Mercado Pago request failed before a response was received.",
        null,
        transportDiagnostic({
          method,
          code: "NETWORK_ERROR",
          elapsedMs: Date.now() - startedAt,
          timeoutMs,
        }),
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    getJson(path: string): Promise<unknown> {
      return requestJson("GET", path);
    },
    postJson(path: string, body: unknown): Promise<unknown> {
      return requestJson("POST", path, body);
    },
  };
}

/* ============================ env resolution ============================ */

/** Environment variable names. Server-side only — never `VITE_*`. */
export const MERCADOPAGO_ENV_KEYS = {
  accessToken: "MERCADOPAGO_ACCESS_TOKEN",
  webhookSecret: "MERCADOPAGO_WEBHOOK_SECRET",
  proPlanId: "MERCADOPAGO_PRO_PLAN_ID",
} as const;

function readEnv(env: Record<string, string | undefined>, key: string): string | null {
  const value = env[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Reads the Mercado Pago configuration from the server environment.
 *
 * Absent, empty and whitespace-only all resolve to `null`, so "not configured"
 * is one state rather than three. No value is defaulted: an unset token stays
 * unset and the client fails closed on first use.
 */
export function readMercadoPagoConfigFromEnv(
  env?: Record<string, string | undefined>,
): MercadoPagoConfig {
  const source = env ?? (typeof process !== "undefined" && process.env ? process.env : {});

  return {
    accessToken: readEnv(source, MERCADOPAGO_ENV_KEYS.accessToken),
    webhookSecret: readEnv(source, MERCADOPAGO_ENV_KEYS.webhookSecret),
    proPlanId: readEnv(source, MERCADOPAGO_ENV_KEYS.proPlanId),
  };
}
