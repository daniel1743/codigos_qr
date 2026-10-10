import "@tanstack/react-start/server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { WebhookVerifier } from "../webhooks.ts";

/**
 * CRIPQER BILLING — MERCADO PAGO WEBHOOK SIGNATURE VERIFIER (MP-M2)
 *
 * Answers exactly one question, with no side effects: "did Mercado Pago sign
 * this notification?". It returns VERIFIED or REJECTED and nothing else.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   · No persistence, no Supabase, no ApplicationStore.
 *   · No entitlement resolution and no subscription state — a verified
 *     notification is not a paid subscription, and this module cannot make one.
 *   · No provider fetch. Verification is a local HMAC; nothing leaves the host.
 *   · No route, no endpoint, no checkout. MP-M2B owns the HTTP surface.
 *   · No logging. A secret cannot leak through a debug line because there are
 *     none, and every failure is reported as a closed enum, never as a value.
 *
 * WHY THERE IS NO SDK DEPENDENCY
 * The published Mercado Pago documentation defers the signature format to its
 * official SDKs, and the SDK implementations are reproduced here as ~60 lines of
 * `node:crypto` rather than a dependency that ships its own HTTP, retry and
 * telemetry defaults. The constants and the manifest are pinned by tests against
 * an independently computed known-answer vector.
 */

/* ============================== spec surface ============================== */

/** Notification header carrying `ts=<unix-seconds>,v1=<hex hmac>`. */
export const MERCADOPAGO_SIGNATURE_HEADER = "x-signature";

/** Notification header carrying the request id, when the sender includes it. */
export const MERCADOPAGO_REQUEST_ID_HEADER = "x-request-id";

/**
 * The notification's resource id. It is a QUERY parameter on the notification
 * URL — NOT a header — which is why it is named here rather than assumed to be
 * among the transport headers. See `createMercadoPagoWebhookVerifier`.
 */
export const MERCADOPAGO_DATA_ID_QUERY_KEY = "data.id";

/** The only signature version this implementation accepts. */
export const MERCADOPAGO_SIGNATURE_VERSION = "v1";

/** Hash algorithm behind `v1`. */
export const MERCADOPAGO_SIGNATURE_DIGEST = "sha256";

/** A `v1` value is the hex encoding of a 32-byte HMAC. */
export const MERCADOPAGO_SIGNATURE_HEX_LENGTH = 64;

/* ================================= result ================================= */

/**
 * Why a notification was rejected. A closed, secret-free enum: it never carries
 * the secret, the expected digest, or the digest we received, so a rejection can
 * be logged and counted without leaking anything.
 */
export type MercadoPagoWebhookRejectionReason =
  /** No signing secret is configured. Nothing was computed. */
  | "MISSING_SECRET"
  /** The `x-signature` header is absent or blank. */
  | "MISSING_SIGNATURE_HEADER"
  /** The header is present but carries neither a `ts` nor any `v<n>` pair. */
  | "MALFORMED_SIGNATURE_HEADER"
  /** The header carries hashes but no `ts`. */
  | "MISSING_TIMESTAMP"
  /** `ts` is present but is not an integer timestamp. */
  | "INVALID_TIMESTAMP"
  /** The header carries no value for the supported signature version. */
  | "MISSING_HASH"
  /** Everything was present and well-formed, and the digest did not match. */
  | "SIGNATURE_MISMATCH"
  /** The digest matched, but `ts` is further from now than the tolerance allows. */
  | "TIMESTAMP_OUT_OF_TOLERANCE"
  /** A freshness check was requested with a tolerance this module cannot apply. */
  | "INVALID_TOLERANCE_CONFIG";

/** Discriminated so a reason exists only where there is a rejection. */
export type MercadoPagoWebhookVerificationResult =
  | { outcome: "VERIFIED"; reason: null }
  | { outcome: "REJECTED"; reason: MercadoPagoWebhookRejectionReason };

const VERIFIED: MercadoPagoWebhookVerificationResult = { outcome: "VERIFIED", reason: null };

function reject(reason: MercadoPagoWebhookRejectionReason): MercadoPagoWebhookVerificationResult {
  return { outcome: "REJECTED", reason };
}

/* ================================ manifest ================================ */

export interface MercadoPagoSignatureManifestParts {
  /** Notification `data.id`. Omitted from the manifest when absent or blank. */
  dataId?: string | null | undefined;
  /** `x-request-id`. Omitted from the manifest when absent or blank. */
  requestId?: string | null | undefined;
  /** `ts` from `x-signature`. Always present in a manifest that gets signed. */
  ts: string;
}

/** Trimmed string, or null for anything empty/blank/non-string. */
function normalizePart(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/**
 * Builds the exact string Mercado Pago signs.
 *
 * The shape is fixed by the official SDK: the `id` and `request-id` pairs are
 * included ONLY when their value is non-blank, `ts` is always included, pairs are
 * joined with a single `;`, and the whole manifest ends with a trailing `;`.
 *
 *     id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *
 * Exported because it is the one piece a reader must be able to check against the
 * spec without reading the verification logic around it.
 */
export function buildMercadoPagoSignatureManifest(
  parts: MercadoPagoSignatureManifestParts,
): string {
  const segments: string[] = [];

  const dataId = normalizePart(parts.dataId);
  if (dataId !== null) segments.push(`id:${dataId}`);

  const requestId = normalizePart(parts.requestId);
  if (requestId !== null) segments.push(`request-id:${requestId}`);

  segments.push(`ts:${normalizePart(parts.ts) ?? ""}`);

  return `${segments.join(";")};`;
}

/* ============================ header extraction =========================== */

interface ParsedSignatureHeader {
  ts: string | null;
  /** version key (`v1`, `v2`, …) -> hash value. */
  hashes: Record<string, string>;
}

const SIGNATURE_VERSION_KEY = /^v\d+$/;

/**
 * Parses `x-signature` strictly: split on `,`, then on the FIRST `=`, trim and
 * lowercase the key, skip empty keys and values, take `ts` as the timestamp and
 * any `v<n>` key as a hash.
 *
 * Duplicate keys are DEFINED, not accidental: the last occurrence of a key wins,
 * which is what the official SDK's dict assignment does. A malformed part is
 * skipped rather than throwing — a header that yields neither a `ts` nor any hash
 * is rejected as `MALFORMED_SIGNATURE_HEADER`.
 */
function parseSignatureHeader(header: string): ParsedSignatureHeader {
  const parsed: ParsedSignatureHeader = { ts: null, hashes: {} };

  for (const rawPart of header.split(",")) {
    const separator = rawPart.indexOf("=");
    if (separator < 0) continue;

    const key = rawPart.slice(0, separator).trim().toLowerCase();
    const value = rawPart.slice(separator + 1).trim();
    if (key === "" || value === "") continue;

    if (key === "ts") {
      parsed.ts = value;
    } else if (SIGNATURE_VERSION_KEY.test(key)) {
      parsed.hashes[key] = value;
    }
  }

  return parsed;
}

/**
 * Case-insensitive header read. Node's `req.headers` is already lowercase, so
 * this only matters for a host that forwards the original casing.
 */
function readHeader(headers: Record<string, string>, name: string): string | null {
  const direct = headers[name];
  if (typeof direct === "string") return direct;

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name) {
      const value = headers[key];
      if (typeof value === "string") return value;
    }
  }

  return null;
}

/* =============================== comparison =============================== */

const SHA256_HEX = new RegExp(`^[0-9a-f]{${MERCADOPAGO_SIGNATURE_HEX_LENGTH}}$`, "i");

/**
 * Constant-time comparison of two HMAC digests.
 *
 * Both sides are decoded from hex to their 32 raw bytes and compared with
 * `timingSafeEqual`, so the comparison time does not depend on where the first
 * differing byte is. Decoding also makes the compare case-insensitive, which is
 * correct for hex and avoids rejecting a sender that uppercases.
 *
 * A length mismatch short-circuits BEFORE `timingSafeEqual` (which throws on
 * unequal lengths). That is safe: the expected length is a published constant of
 * the algorithm, not a secret, so nothing about the key is revealed.
 */
function digestsMatch(expectedHex: string, receivedHex: string): boolean {
  if (!SHA256_HEX.test(receivedHex)) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length !== received.length) return false;

  return timingSafeEqual(expected, received);
}

/* =========================== freshness / replay =========================== */

/**
 * Freshness (anti-replay) policy, mirroring the official SDK's `tolerance_seconds`.
 *
 * The SDK's parameter is optional and DEFAULTS TO NO CHECK, so the default here is
 * the same: a `ts` that is old or in the future is accepted unless a caller asks
 * for a window. Inventing a window would be inventing policy — the SDK publishes
 * none, and the right value depends on clock skew and on how long Mercado Pago may
 * legitimately retry a delivery, neither of which this module can know. A host that
 * wants replay protection passes an explicit tolerance.
 *
 * Semantics, all taken from the SDK rather than chosen here:
 *   · `ts` is in SECONDS and the clock is in MILLISECONDS; the drift is
 *     `|now - ts * 1000|`. Getting that factor wrong is a 1000x error the SDK
 *     itself has shipped a fix for, hence the explicit `* 1000` below.
 *   · The absolute value means a FUTURE timestamp and an OLD one are treated
 *     identically — there is no "clock skew allowance" in one direction only.
 *   · The check runs AFTER the digest comparison. A forged `ts` cannot be used to
 *     probe the tolerance before the signature is known to be genuine.
 *   · The bound is inclusive: exactly `toleranceSeconds` away is still fresh.
 */
export interface MercadoPagoFreshnessPolicy {
  /**
   * Milliseconds clock. Injected so tests are deterministic; defaults to
   * `Date.now`. Must return milliseconds, to match `ts * 1000`.
   */
  now?: (() => number) | undefined;
  /**
   * Maximum accepted `|now - ts|`, in seconds. `null`/`undefined` disables the
   * check entirely (the SDK default). Must be a finite number `>= 0` to be
   * applied — anything else is `INVALID_TOLERANCE_CONFIG`, never a silent pass.
   */
  toleranceSeconds?: number | null | undefined;
}

function isFatalTolerance(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Applies the freshness policy to an ALREADY-VERIFIED signature.
 *
 * Returns null when the notification is fresh (or when no window was requested),
 * and the rejection reason otherwise. Failure is closed in both directions: a
 * tolerance that cannot be applied rejects rather than being ignored, so a caller
 * who believes they configured replay protection cannot silently have none.
 */
function checkFreshness(
  ts: string,
  policy: MercadoPagoFreshnessPolicy,
): MercadoPagoWebhookRejectionReason | null {
  const tolerance = policy.toleranceSeconds;
  if (tolerance === null || tolerance === undefined) return null;

  if (!isFatalTolerance(tolerance)) {
    // Configured but unusable. Rejecting is the only safe reading: quietly
    // skipping the check would be a fail-open the caller never asked for.
    return "INVALID_TOLERANCE_CONFIG";
  }

  const clock = policy.now ?? Date.now;
  const driftMs = Math.abs(clock() - Number(ts) * 1000);

  return driftMs > tolerance * 1000 ? "TIMESTAMP_OUT_OF_TOLERANCE" : null;
}

/* ============================== verification ============================== */

export interface MercadoPagoSignatureVerificationInput extends MercadoPagoFreshnessPolicy {
  /** Raw `x-signature` header value. */
  signatureHeader?: string | null | undefined;
  /** Raw `x-request-id` header value. Optional — the manifest omits it if absent. */
  requestId?: string | null | undefined;
  /**
   * The notification's `data.id`, taken from the notification URL's QUERY string.
   *
   * This is the parameter the host must populate from the request's query string —
   * it is NOT a header, and this module never reads it from one. Optional: the
   * manifest omits the `id:` pair when it is absent, which is what the official SDK
   * does. Passing the BODY's `data.id` is not equivalent (see the module report):
   * the body is not signed, so a value taken from it can differ from the signed one
   * without the digest noticing.
   */
  dataId?: string | null | undefined;
  /** Signing secret. Server-side only; never returned, logged or serialized. */
  secret?: string | null | undefined;
}

/**
 * Verifies a Mercado Pago webhook signature. Pure and total: it never throws and
 * never touches anything outside its arguments.
 *
 * Failure is always closed. A missing secret, a missing or unreadable header, an
 * absent or non-numeric `ts`, a digest mismatch, and — when a window is configured
 * — a `ts` outside it all return REJECTED. None of them can produce a VERIFIED
 * result, and none of them can raise.
 *
 * This is the canonical primitive for Mercado Pago. The frozen two-argument
 * `WebhookVerifier` seam cannot carry a query parameter, so a host holding the real
 * request (MP-M2B) must call THIS function with `dataId` read from
 * `new URL(req.url).searchParams.get("data.id")` rather than routing the value
 * through the seam's header bag.
 */
export function verifyMercadoPagoSignature(
  input: MercadoPagoSignatureVerificationInput,
): MercadoPagoWebhookVerificationResult {
  const secret = normalizePart(input.secret);
  if (secret === null) return reject("MISSING_SECRET");

  const header = normalizePart(input.signatureHeader);
  if (header === null) return reject("MISSING_SIGNATURE_HEADER");

  const { ts, hashes } = parseSignatureHeader(header);
  if (ts === null && Object.keys(hashes).length === 0) {
    return reject("MALFORMED_SIGNATURE_HEADER");
  }
  if (ts === null) return reject("MISSING_TIMESTAMP");
  if (!/^\d+$/.test(ts)) return reject("INVALID_TIMESTAMP");

  const received = hashes[MERCADOPAGO_SIGNATURE_VERSION];
  if (received === undefined) return reject("MISSING_HASH");

  const manifest = buildMercadoPagoSignatureManifest({
    dataId: input.dataId,
    requestId: input.requestId,
    ts,
  });
  const expected = createHmac(MERCADOPAGO_SIGNATURE_DIGEST, secret)
    .update(manifest, "utf8")
    .digest("hex");

  // Signature first, freshness second — the SDK's order. A caller probing the
  // tolerance with a forged `ts` learns nothing until the digest is genuine.
  if (!digestsMatch(expected, received)) return reject("SIGNATURE_MISMATCH");

  const stale = checkFreshness(ts, input);
  if (stale !== null) return reject(stale);

  return VERIFIED;
}

/* ============================ frozen seam adapter ========================= */

/**
 * A notification as the frozen seam presents it: the raw body and the transport
 * headers. Nothing here can carry a query parameter, which is the whole reason
 * `resolveDataId` below exists.
 */
export interface MercadoPagoWebhookSeamRequest {
  rawBody: string;
  headers: Record<string, string>;
}

export interface MercadoPagoWebhookVerifierOptions extends MercadoPagoFreshnessPolicy {
  /** Signing secret. Server-side only. */
  webhookSecret: string | null;
  /**
   * REQUIRED. Supplies the notification's signed `data.id`, which is a query
   * parameter and therefore is NOT in `headers`.
   *
   * The seam's two arguments cannot express a query string, so the caller must
   * read it from its own request and return it here — for example
   * `(req) => new URL(urlOf(req)).searchParams.get("data.id")`. There is
   * deliberately no header fallback: this module will NOT look for a `data.id`
   * header, because inventing one would mean verifying against a value that
   * Mercado Pago never signed.
   */
  resolveDataId: (request: MercadoPagoWebhookSeamRequest) => string | null | undefined;
}

/**
 * Adapts the core to the frozen `WebhookVerifier` seam
 * (`verify(rawBody, headers) -> boolean`) so MP-M2B can hand it to a
 * `ProviderAdapter.verifier` without touching that contract.
 *
 * TWO THINGS THE CALLER MUST KNOW
 *
 * 1. `rawBody` IS DELIBERATELY UNUSED. Mercado Pago's signature covers a
 *    manifest of request METADATA — `data.id`, `x-request-id`, `ts` — and no part
 *    of the JSON body. Signing or reading the body here would be a false sense of
 *    coverage, so the parameter is accepted (the contract requires it) and
 *    ignored, and the body is never parsed.
 *
 * 2. `data.id` IS NOT A HEADER. It arrives as a query parameter, and the frozen
 *    two-argument seam has no slot for one. Rather than smuggle it through the
 *    header bag — which would misrepresent the transport AND invite a host to
 *    supply an unsigned value — the adapter takes a REQUIRED `resolveDataId`
 *    callback that the host implements against its real request. When the value
 *    is absent the manifest simply omits the `id:` pair, exactly as the SDK does;
 *    if Mercado Pago signed WITH an id, the digests cannot match and the
 *    notification is rejected rather than accepted.
 *
 *    A host that already holds the request should prefer calling
 *    `verifyMercadoPagoSignature` directly and skip this bridge entirely, since
 *    that path can also report WHY a notification was rejected.
 *
 * A missing secret, a missing `resolveDataId`, or a resolver that throws does not
 * propagate: the first makes every call return false, and the second and third are
 * caught and treated as "no id". Failing closed at construction would be equally
 * safe, but a host that routes a misconfiguration into an exception can turn it
 * into a 5xx; returning false keeps the surface quiet and the access denied.
 */
export function createMercadoPagoWebhookVerifier(
  options: MercadoPagoWebhookVerifierOptions,
): WebhookVerifier {
  const { webhookSecret, resolveDataId, now, toleranceSeconds } = options;
  const resolve = typeof resolveDataId === "function" ? resolveDataId : () => null;

  return {
    verify(rawBody: string, headers: Record<string, string>): boolean {
      void rawBody;

      let dataId: string | null | undefined = null;
      try {
        dataId = resolve({ rawBody, headers });
      } catch {
        // A resolver that throws must not become a 500, and must not be read as
        // "the id matched". Treat it as absent: the digest then decides.
        dataId = null;
      }

      return (
        verifyMercadoPagoSignature({
          signatureHeader: readHeader(headers, MERCADOPAGO_SIGNATURE_HEADER),
          requestId: readHeader(headers, MERCADOPAGO_REQUEST_ID_HEADER),
          dataId,
          secret: webhookSecret,
          now,
          toleranceSeconds,
        }).outcome === "VERIFIED"
      );
    },
  };
}
