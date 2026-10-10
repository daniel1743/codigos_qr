import "@tanstack/react-start/server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { WebhookVerifier } from "../webhooks.ts";
import type { MercadoPagoConfig } from "./types.ts";

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
  | "SIGNATURE_MISMATCH";

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

/* ============================== verification ============================== */

export interface MercadoPagoSignatureVerificationInput {
  /** Raw `x-signature` header value. */
  signatureHeader?: string | null | undefined;
  /** Raw `x-request-id` header value. Optional — the manifest omits it if absent. */
  requestId?: string | null | undefined;
  /**
   * The notification's `data.id`, taken from the notification URL's QUERY string.
   * Optional: the manifest omits the `id:` pair when it is absent, which is what
   * the official SDK does. Passing the body's `data.id` instead is a host choice
   * the documentation calls out — see the module report.
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
 * absent or non-numeric `ts`, and a digest mismatch all return REJECTED — none of
 * them can produce a VERIFIED result, and none of them can raise.
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

  return digestsMatch(expected, received) ? VERIFIED : reject("SIGNATURE_MISMATCH");
}

/* ============================ frozen seam adapter ========================= */

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
 *    two-argument seam has no slot for one. This adapter therefore reads it from
 *    the header bag under its canonical query name `data.id`, and a host wired to
 *    this adapter MUST forward the query value there. A host that has the real
 *    request — MP-M2B — should prefer calling `verifyMercadoPagoSignature`
 *    directly with `data.id` read from the query, and skip this bridge entirely.
 *    When the value is absent the manifest simply omits the `id:` pair, exactly
 *    as the SDK does; if Mercado Pago signed WITH an id, the digests cannot match
 *    and the notification is rejected rather than accepted.
 *
 * A missing secret does not throw here: it makes every `verify` call return
 * false. Failing closed at construction would be equally safe, but a host that
 * routes a misconfiguration into an exception can turn it into a 5xx; returning
 * false keeps the surface quiet and the access denied.
 */
export function createMercadoPagoWebhookVerifier(
  config: Pick<MercadoPagoConfig, "webhookSecret">,
): WebhookVerifier {
  const secret = config.webhookSecret;

  return {
    verify(rawBody: string, headers: Record<string, string>): boolean {
      void rawBody;

      return (
        verifyMercadoPagoSignature({
          signatureHeader: readHeader(headers, MERCADOPAGO_SIGNATURE_HEADER),
          requestId: readHeader(headers, MERCADOPAGO_REQUEST_ID_HEADER),
          dataId: readHeader(headers, MERCADOPAGO_DATA_ID_QUERY_KEY),
          secret,
        }).outcome === "VERIFIED"
      );
    },
  };
}
