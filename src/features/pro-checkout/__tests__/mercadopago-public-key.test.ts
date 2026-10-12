import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MERCADOPAGO_PUBLIC_KEY_ENV_KEY,
  readMercadoPagoPublicKey,
} from "../mercadopago-public-key";

/**
 * MP-M3D.7 · the Public Key contract.
 *
 * The Public Key is the only Mercado Pago credential that may reach a browser, so
 * two things have to hold at once: it must be USABLE when it is present, and its
 * absence must fail closed rather than degrade. Both are asserted here, along
 * with the credential-naming rule that keeps its siblings off the client: only
 * the Public Key may carry a `VITE_` name.
 */

/**
 * Fixtures, marked as such in their own text.
 *
 * They carry the two prefixes the code actually branches on — `APP_USR-` for
 * production and `TEST-` for sandbox — and the alphabet Mercado Pago issues, so
 * they exercise the real parsing path. What they do NOT do is imitate a
 * credential's opaque middle: Mercado Pago access tokens share the `APP_USR-`
 * prefix, so a UUID-shaped fixture is indistinguishable from a leaked secret to
 * both a scanner and a reviewer reading a diff. The parser is a regex over the
 * alphabet and a length; realism in the middle adds no coverage and costs the
 * ability to tell at a glance that this is not a key.
 */
const LIVE_KEY = "APP_USR-fixture-not-a-real-key-0000-0000-0000";
const TEST_KEY = "TEST-fixture-not-a-real-key-0000-0000-0000";

const READER = "src/features/pro-checkout/mercadopago-public-key.ts";
const SOURCE = readFileSync(join(process.cwd(), READER), "utf8");

/**
 * The source with its comments removed.
 *
 * The scans below ask what this module DOES, and this module's comments discuss
 * the very things they forbid — the header says in prose that it does not read
 * `process.env`. A substring check over the raw file reads that sentence as a
 * read. Checking the code rather than the file is the difference between testing
 * the behaviour and testing the documentation.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Only a `//` that starts a line or follows whitespace, so the `//` inside a
    // URL literal is not mistaken for the start of a comment.
    .replace(/(^|\s)\/\/.*$/gm, "");
}

const CODE = codeOnly(SOURCE);

describe("MP-M3D.7 · Public Key · naming", () => {
  it("reads exactly one variable, and it is the documented VITE_ name", () => {
    expect(MERCADOPAGO_PUBLIC_KEY_ENV_KEY).toBe("VITE_MERCADOPAGO_PUBLIC_KEY");
  });

  it("no other Mercado Pago credential is named with a VITE_ prefix anywhere in the feature", () => {
    // A `VITE_` name is inlined into the client bundle — a published secret. The
    // Access Token, the Webhook Secret and the OAuth pair must never be given
    // one, and the cheapest place to catch that is a scan of the whole feature.
    const featureDir = join(process.cwd(), "src/features/pro-checkout");
    const files = ["mercadopago-public-key.ts", "start-pro-client.ts", "mercadopago-sdk.ts"];

    for (const file of files) {
      const source = readFileSync(join(featureDir, file), "utf8");
      const viteNames = source.match(/VITE_[A-Z0-9_]+/g) ?? [];
      for (const name of viteNames) {
        expect(name, `${file} references ${name}`).toBe(MERCADOPAGO_PUBLIC_KEY_ENV_KEY);
      }
      for (const forbidden of [
        "MERCADOPAGO_ACCESS_TOKEN",
        "MERCADOPAGO_WEBHOOK_SECRET",
        "CLIENT_SECRET",
        "WEBHOOK_SECRET",
      ]) {
        expect(source, `${file} references ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it("the reader carries no key value, no default and no process.env", () => {
    // A default key is worse than a missing one: it makes the fail-closed path
    // unreachable, and the failure it hides surfaces as a dead card form rather
    // than as a configuration error. A committed key is worse still, so the
    // source is scanned for the two prefixes Mercado Pago issues.
    expect(CODE).not.toMatch(/APP_USR-[A-Za-z0-9-]{8,}/);
    expect(CODE).not.toMatch(/["']TEST-[A-Za-z0-9-]{8,}["']/);
    // `??` and `||` are how a fallback would be written.
    expect(CODE).not.toMatch(/PUBLIC_KEY_ENV_KEY\][^;]{0,40}(\?\?|\|\|)\s*["']/);
    expect(CODE).not.toContain("process.env");
    // The proxy for the browser's environment is `import.meta.env`, replaced at
    // build time. `process.env` in a client module is either dead code or a
    // server variable that will silently be `undefined` at runtime.
    expect(CODE).toContain("import.meta.env");
  });
});

describe("MP-M3D.7 · Public Key · a usable key", () => {
  it("accepts a live key and marks it as not-test", () => {
    expect(readMercadoPagoPublicKey({ [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: LIVE_KEY })).toEqual({
      ok: true,
      publicKey: LIVE_KEY,
      isTest: false,
    });
  });

  it("accepts a sandbox key and marks it as test", () => {
    const result = readMercadoPagoPublicKey({ [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: TEST_KEY });

    expect(result).toEqual({ ok: true, publicKey: TEST_KEY, isTest: true });
  });

  it("trims surrounding whitespace, which a copy-paste into a dashboard adds", () => {
    for (const raw of [`  ${LIVE_KEY}  `, `\n${LIVE_KEY}\n`, `\t${LIVE_KEY}`]) {
      const result = readMercadoPagoPublicKey({ [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: raw });
      expect(result.ok && result.publicKey).toBe(LIVE_KEY);
    }
  });

  it("accepts the whole alphabet Mercado Pago issues, and no narrower one", () => {
    // `-` and `_` are both allowed deliberately. The two failures this guards
    // against are not symmetric: a client whose grammar is LOOSER than the
    // provider's costs nothing here, while one that is TIGHTER starts rejecting a
    // valid key — and the symptom of that is a payer staring at a dead card form
    // with nothing in any log to explain it. So the pattern rejects only
    // characters that are a problem in their own right: quotes, separators,
    // markup, whitespace, anything outside ASCII.
    const urlsafe = "APP_USR-fixture_not-a-real_key-0000";
    expect(readMercadoPagoPublicKey({ [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: urlsafe })).toEqual({
      ok: true,
      publicKey: urlsafe,
      isTest: false,
    });
  });

  it("ignores every other variable in the environment record", () => {
    const result = readMercadoPagoPublicKey({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      MERCADOPAGO_ACCESS_TOKEN: "APP_USR-server-only",
      [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: LIVE_KEY,
    });

    expect(result).toEqual({ ok: true, publicKey: LIVE_KEY, isTest: false });
  });
});

describe("MP-M3D.7 · Public Key · fails closed", () => {
  const NOT_CONFIGURED: unknown[] = [
    {},
    { [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: undefined },
    { [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: null },
    { [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: "" },
    { [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: "   " },
    { [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: "\n\t " },
  ];

  it.each(NOT_CONFIGURED.map((env, i) => ({ env, i })))(
    "reports NOT_CONFIGURED for absent-or-blank #$i",
    ({ env }) => {
      expect(readMercadoPagoPublicKey(env)).toEqual({ ok: false, reason: "NOT_CONFIGURED" });
    },
  );

  const MALFORMED: unknown[] = [
    "short",
    "x".repeat(129),
    `${LIVE_KEY} extra`,
    `"${LIVE_KEY}"`,
    `'${LIVE_KEY}'`,
    `${LIVE_KEY};DROP`,
    `${LIVE_KEY}<script>`,
    "APP_USR-fixture.not-a-real-key",
    "clé-invalide-é",
    42,
    true,
    [],
    {},
  ];

  it.each(MALFORMED.map((value, i) => ({ value, i })))(
    "reports MALFORMED for unusable value #$i",
    ({ value }) => {
      expect(readMercadoPagoPublicKey({ [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: value })).toEqual({
        ok: false,
        reason: "MALFORMED",
      });
    },
  );

  it("is total: it never throws, whatever it is handed", () => {
    const hostile: unknown[] = [undefined, null, 0, "", "text", [], [1], () => undefined];

    for (const env of hostile) {
      const result = readMercadoPagoPublicKey(env);
      expect(typeof result.ok).toBe("boolean");
      if (!result.ok) expect(["NOT_CONFIGURED", "MALFORMED"]).toContain(result.reason);
    }
  });

  it("never echoes the key on the failure path", () => {
    // Not a secret, but still a credential — and a module that echoes one is one
    // refactor away from being asked to echo a different one.
    const marker = "APP_USR-MARKER-must-not-be-echoed";
    const results = [
      readMercadoPagoPublicKey({ [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: `${marker} with spaces` }),
      readMercadoPagoPublicKey({ [MERCADOPAGO_PUBLIC_KEY_ENV_KEY]: marker.repeat(20) }),
    ];

    for (const result of results) {
      expect(result.ok).toBe(false);
      expect(JSON.stringify(result)).not.toContain("MARKER");
      expect(JSON.stringify(result)).not.toContain("APP_USR");
    }
  });
});
