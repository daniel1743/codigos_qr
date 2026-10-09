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
 *   · No error body. A non-2xx body is never read into the error: it can echo
 *     request context and none of it is needed to classify the failure.
 */

export const MERCADOPAGO_API_BASE_URL = "https://api.mercadopago.com";

/** Explicit timeout. A billing lookup that hangs must fail, not wait. */
export const DEFAULT_MERCADOPAGO_TIMEOUT_MS = 8000;

/* ================================ errors ================================ */

export type MercadoPagoErrorCode =
  /** No access token is configured. Nothing was sent. */
  | "MISSING_ACCESS_TOKEN"
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

/**
 * Typed Mercado Pago failure.
 *
 * `message` is safe to surface: it never contains the access token, the request
 * headers, or the provider's response body. `status` carries the HTTP status
 * when there was a response, and `null` when the failure happened before one.
 */
export class MercadoPagoError extends Error {
  readonly code: MercadoPagoErrorCode;
  readonly status: number | null;

  constructor(code: MercadoPagoErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = "MercadoPagoError";
    this.code = code;
    this.status = status;
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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/**
 * Builds a client bound to one configuration.
 *
 * The access token is captured in the closure and is never placed in a header
 * the caller can read back, never interpolated into a message, and never
 * returned. A missing token fails BEFORE any request is attempted, so a
 * half-configured deployment cannot produce an unauthenticated call.
 */
export function createMercadoPagoClient(config: MercadoPagoConfig): MercadoPagoClient {
  const baseUrl = (config.baseUrl ?? MERCADOPAGO_API_BASE_URL).replace(/\/+$/, "");
  const timeoutMs = config.timeoutMs ?? DEFAULT_MERCADOPAGO_TIMEOUT_MS;

  return {
    async getJson(path: string): Promise<unknown> {
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

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new MercadoPagoError(
              "UNAUTHORIZED",
              "Mercado Pago rejected the configured credentials.",
              response.status,
            );
          }
          if (response.status === 404) {
            throw new MercadoPagoError("NOT_FOUND", "Mercado Pago resource not found.", 404);
          }
          throw new MercadoPagoError(
            "HTTP_ERROR",
            `Mercado Pago responded with HTTP ${response.status}.`,
            response.status,
          );
        }

        const text = await response.text();

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new MercadoPagoError(
            "INVALID_JSON",
            "Mercado Pago returned a body that is not JSON.",
            response.status,
          );
        }

        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new MercadoPagoError(
            "INVALID_JSON",
            "Mercado Pago returned JSON that is not an object.",
            response.status,
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
          );
        }
        throw new MercadoPagoError(
          "NETWORK_ERROR",
          "Mercado Pago request failed before a response was received.",
        );
      } finally {
        clearTimeout(timer);
      }
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
