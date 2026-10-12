/**
 * CRIPQER BILLING — THE PUBLIC KEY CONTRACT (MP-M3D.7)
 *
 * The Public Key is the ONLY Mercado Pago credential allowed on the client. It
 * is public by design: Mercado Pago's own documentation says it "is normally used
 * in the frontend" and exists so that card data can be encrypted in the browser.
 * Every other credential — the Access Token, the Webhook Secret, the Client ID
 * and Client Secret — stays on the server, and none of them may ever be given a
 * `VITE_` name, because a `VITE_` prefix inlines the value into the client bundle
 * and publishes it.
 *
 * WHY THIS MODULE IS SEPARATE FROM THE COMPONENT THAT USES IT
 * "Which key, and is it usable" is a question with a total answer, and it is the
 * question whose failure mode is worst: a malformed key does not throw, it makes
 * Mercado Pago's own iframe fail to initialise, and the payer sees a dead form
 * with no explanation. Deciding it in a pure function means every malformed
 * shape can be enumerated in a test, including the shapes a browser cannot easily
 * be made to produce.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * It does not read `process.env`, it does not touch `window`, and it does not
 * have a default. The caller passes the environment record, so this function is
 * total, testable and impossible to accidentally satisfy from a test that set a
 * global. And there is NO fallback value: if the key is absent the checkout fails
 * closed and says so, rather than attempting a tokenization that would fail later
 * with a message about a card that was never the problem.
 */

/** The environment variable name. Declared once so no call site can misspell it. */
export const MERCADOPAGO_PUBLIC_KEY_ENV_KEY = "VITE_MERCADOPAGO_PUBLIC_KEY";

/**
 * Bounds copied from the server-side contract in spirit, not by import: this
 * module must never depend on a `server-only` file, and the bound exists here for
 * a different reason (a hostile or truncated build-time value) than it does
 * there (a hostile request body).
 */
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/** Mercado Pago keys are alphanumeric and hyphenated; anything else is not one. */
const PUBLIC_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

export type PublicKeyRejection =
  /** No `VITE_MERCADOPAGO_PUBLIC_KEY`, or one that is only whitespace. */
  | "NOT_CONFIGURED"
  /** Present, but not a shape Mercado Pago issues. */
  | "MALFORMED";

export type PublicKeyReadResult =
  | {
      ok: true;
      publicKey: string;
      /**
       * True for sandbox credentials. Surfaced so a caller can keep test and
       * production visibly apart — and so a TEST- key accidentally configured in
       * Production is a fact the UI can state, not a surprise discovered later.
       */
      isTest: boolean;
    }
  | { ok: false; reason: PublicKeyRejection };

/**
 * Judges the configured Public Key.
 *
 * TOTAL: returns a verdict for every input and never throws, so a caller can
 * render a fail-closed state without a try/catch. The returned key is TRIMMED —
 * a trailing newline from a copy-paste into a dashboard would otherwise produce a
 * key that looks right and initialises nothing.
 *
 * The error path carries no value: not the key, not its length, not its prefix.
 * A Public Key is not a secret, but it is still a credential, and a module that
 * echoes credentials is one refactor away from being asked to echo a different
 * one.
 */
export function readMercadoPagoPublicKey(env: unknown): PublicKeyReadResult {
  const record =
    typeof env === "object" && env !== null ? (env as Record<string, unknown>) : {};
  const raw = record[MERCADOPAGO_PUBLIC_KEY_ENV_KEY];

  if (raw === undefined || raw === null) return { ok: false, reason: "NOT_CONFIGURED" };
  if (typeof raw !== "string") return { ok: false, reason: "MALFORMED" };

  const publicKey = raw.trim();
  if (publicKey === "") return { ok: false, reason: "NOT_CONFIGURED" };

  if (publicKey.length < MIN_LENGTH) return { ok: false, reason: "MALFORMED" };
  if (publicKey.length > MAX_LENGTH) return { ok: false, reason: "MALFORMED" };
  if (!PUBLIC_KEY_PATTERN.test(publicKey)) return { ok: false, reason: "MALFORMED" };

  return { ok: true, publicKey, isTest: publicKey.startsWith("TEST-") };
}

/**
 * The browser's build-time environment, or an empty record when there is none.
 *
 * `import.meta.env` is replaced at build time by the bundler, so reading it here
 * rather than at module scope keeps this file importable from a test that wants
 * to exercise the no-environment path.
 */
export function readBrowserPublicKey(): PublicKeyReadResult {
  const env: unknown =
    typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : undefined;
  return readMercadoPagoPublicKey(env);
}
