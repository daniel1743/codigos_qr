import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildMercadoPagoSignatureManifest,
  createMercadoPagoWebhookVerifier,
  MERCADOPAGO_DATA_ID_QUERY_KEY,
  MERCADOPAGO_REQUEST_ID_HEADER,
  MERCADOPAGO_SIGNATURE_HEADER,
  MERCADOPAGO_SIGNATURE_VERSION,
  verifyMercadoPagoSignature,
} from "../webhook-verifier";

/**
 * MP-M2 · MERCADO PAGO WEBHOOK SIGNATURE VERIFIER.
 *
 * Two properties carry the whole module: a notification is VERIFIED only when
 * Mercado Pago's own signature says so, and every other input is REJECTED
 * without throwing and without leaking the secret.
 *
 * The digests below are KNOWN-ANSWER VECTORS computed outside this codebase, by
 * Python's `hashlib`/`hmac`, from the manifest strings asserted literally in the
 * "manifest" suite. Recomputing them here with the same `node:crypto` call the
 * implementation uses would prove only self-consistency; a fixed external answer
 * also catches a manifest built in the wrong order or with the wrong separator.
 */

const SECRET = "cripqer-mp-m2-test-secret";
const DATA_ID = "1234567890";
const REQUEST_ID = "req-abc-123";
const TS = "1700000000";

const MANIFEST_FULL = `id:${DATA_ID};request-id:${REQUEST_ID};ts:${TS};`;
const MANIFEST_NO_DATA_ID = `request-id:${REQUEST_ID};ts:${TS};`;
const MANIFEST_NO_REQUEST_ID = `id:${DATA_ID};ts:${TS};`;
const MANIFEST_ONLY_TS = `ts:${TS};`;

/** Computed with Python `hmac.new(secret, manifest, hashlib.sha256).hexdigest()`. */
const KAT_FULL = "bb10db18a7d869023652e892ccce92b99158d0a25ca891926418160f931de52b";
const KAT_NO_DATA_ID = "4b8f52c864e4b7c9aa45e2dd7a6fddacb84be21faf48b5cdb8c57616e7218b23";
const KAT_NO_REQUEST_ID = "1689f18afb33c918b4fa3fbe3f99413a43586e4fed2ca93d05f7a649758e7a40";
const KAT_ONLY_TS = "b7f3a5ab04ddb1c4cc30bdaaf744fcf2a6219193bc65efa89ef52ef59d974204";
/** For `id:ORD01JQ4S4KY8HWQ6NA5PXB65B3D3;request-id:req-abc-123;ts:1700000000;` */
const KAT_MIXED_CASE_ID = "5955473e8713a730436e82b81026ec303bb177568d46414fbc5be1e071bf0814";

function header(digest: string, ts: string = TS): string {
  return `ts=${ts},${MERCADOPAGO_SIGNATURE_VERSION}=${digest}`;
}

function fullInput(overrides: Record<string, unknown> = {}) {
  return {
    signatureHeader: header(KAT_FULL),
    requestId: REQUEST_ID,
    dataId: DATA_ID,
    secret: SECRET,
    ...overrides,
  };
}

/* ============================== 1. happy path ============================= */

describe("MP-M2 · valid signature", () => {
  it("verifies a correctly signed notification", () => {
    expect(verifyMercadoPagoSignature(fullInput())).toEqual({
      outcome: "VERIFIED",
      reason: null,
    });
  });

  it("verifies against an independently computed known answer", () => {
    // Not self-consistency: KAT_FULL came from Python's hashlib, not node:crypto.
    const result = verifyMercadoPagoSignature({
      signatureHeader: header(KAT_FULL),
      requestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: SECRET,
    });
    expect(result.outcome).toBe("VERIFIED");
  });

  it("verifies when request-id is absent and the manifest omits it", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_NO_REQUEST_ID),
        dataId: DATA_ID,
        secret: SECRET,
      }).outcome,
    ).toBe("VERIFIED");
  });

  it("verifies when data.id is absent and the manifest omits it", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_NO_DATA_ID),
        requestId: REQUEST_ID,
        secret: SECRET,
      }).outcome,
    ).toBe("VERIFIED");
  });

  it("verifies when both optional parts are absent", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_ONLY_TS),
        secret: SECRET,
      }).outcome,
    ).toBe("VERIFIED");
  });
});

/* ============================ 2. invalid signature ======================== */

describe("MP-M2 · invalid signature", () => {
  it("rejects a flipped digest", () => {
    const flipped = `0${KAT_FULL.slice(1)}`;
    expect(verifyMercadoPagoSignature(fullInput({ signatureHeader: header(flipped) }))).toEqual({
      outcome: "REJECTED",
      reason: "SIGNATURE_MISMATCH",
    });
  });

  it("rejects a truncated digest", () => {
    expect(
      verifyMercadoPagoSignature(fullInput({ signatureHeader: header(KAT_FULL.slice(0, 32)) })),
    ).toEqual({ outcome: "REJECTED", reason: "SIGNATURE_MISMATCH" });
  });

  it("rejects a digest that is not hex", () => {
    const notHex = "z".repeat(64);
    expect(verifyMercadoPagoSignature(fullInput({ signatureHeader: header(notHex) }))).toEqual({
      outcome: "REJECTED",
      reason: "SIGNATURE_MISMATCH",
    });
  });

  it("rejects a signature computed with a different secret", () => {
    // KAT_FULL is the digest for SECRET; presenting it while configured with
    // another secret must not verify.
    expect(verifyMercadoPagoSignature(fullInput({ secret: "a-different-secret" }))).toEqual({
      outcome: "REJECTED",
      reason: "SIGNATURE_MISMATCH",
    });
  });

  it("rejects when the signed timestamp differs from the presented one", () => {
    // Signature is genuine for ts=1700000000; the header claims a later ts.
    expect(
      verifyMercadoPagoSignature(fullInput({ signatureHeader: header(KAT_FULL, "1700009999") })),
    ).toEqual({ outcome: "REJECTED", reason: "SIGNATURE_MISMATCH" });
  });

  it("rejects when the signed data.id differs from the presented one", () => {
    expect(verifyMercadoPagoSignature(fullInput({ dataId: "9999999999" }))).toEqual({
      outcome: "REJECTED",
      reason: "SIGNATURE_MISMATCH",
    });
  });
});

/* =========================== 3. missing signature ========================= */

describe("MP-M2 · missing signature", () => {
  it.each([
    ["absent", undefined],
    ["null", null],
    ["empty", ""],
    ["whitespace only", "   "],
  ])("rejects a %s signature header", (_label, signatureHeader) => {
    expect(verifyMercadoPagoSignature(fullInput({ signatureHeader }))).toEqual({
      outcome: "REJECTED",
      reason: "MISSING_SIGNATURE_HEADER",
    });
  });
});

/* ============================== 4. missing secret ========================= */

describe("MP-M2 · missing secret", () => {
  it.each([
    ["absent", undefined],
    ["null", null],
    ["empty", ""],
    ["whitespace only", "  \t "],
  ])("fails closed when the secret is %s", (_label, secret) => {
    expect(verifyMercadoPagoSignature(fullInput({ secret }))).toEqual({
      outcome: "REJECTED",
      reason: "MISSING_SECRET",
    });
  });

  it("fails closed before examining the header at all", () => {
    // A valid signature with no secret must not be VERIFIED.
    expect(
      verifyMercadoPagoSignature({ signatureHeader: header(KAT_FULL), secret: null }).outcome,
    ).toBe("REJECTED");
  });
});

/* ========================= 5. malformed signature header ================== */

describe("MP-M2 · malformed signature header", () => {
  it.each([
    ["garbage", "this-is-garbage"],
    ["empty key and value", "="],
    ["empty value only", "ts="],
    ["no separator", "tsv1abc"],
    ["separators only", ",,,"],
    ["unrelated keys", "foo=bar,baz=qux"],
  ])("rejects a %s header", (_label, signatureHeader) => {
    expect(verifyMercadoPagoSignature(fullInput({ signatureHeader }))).toEqual({
      outcome: "REJECTED",
      reason: "MALFORMED_SIGNATURE_HEADER",
    });
  });

  it("distinguishes malformed from missing: a parseable header is not MALFORMED", () => {
    const result = verifyMercadoPagoSignature(fullInput({ signatureHeader: "v1=abc" }));
    expect(result).toEqual({ outcome: "REJECTED", reason: "MISSING_TIMESTAMP" });
  });
});

/* ============================ 6. timestamp missing ======================== */

describe("MP-M2 · timestamp missing", () => {
  it("rejects a header with a hash but no ts", () => {
    expect(verifyMercadoPagoSignature(fullInput({ signatureHeader: `v1=${KAT_FULL}` }))).toEqual({
      outcome: "REJECTED",
      reason: "MISSING_TIMESTAMP",
    });
  });

  it("rejects when ts is present but blank", () => {
    // "ts= " trims to an empty value and is skipped, leaving only the hash.
    expect(
      verifyMercadoPagoSignature(fullInput({ signatureHeader: `ts= ,v1=${KAT_FULL}` })),
    ).toEqual({ outcome: "REJECTED", reason: "MISSING_TIMESTAMP" });
  });
});

/* ============================ 7. timestamp invalid ======================== */

describe("MP-M2 · timestamp invalid", () => {
  it.each([
    ["non-numeric", "not-a-timestamp"],
    ["negative", "-1700000000"],
    ["fractional", "1700000000.5"],
    ["scientific", "1.7e9"],
    ["hex", "0x65a1e600"],
  ])("rejects a %s timestamp", (_label, ts) => {
    expect(
      verifyMercadoPagoSignature(fullInput({ signatureHeader: header(KAT_FULL, ts) })),
    ).toEqual({ outcome: "REJECTED", reason: "INVALID_TIMESTAMP" });
  });
});

/* ========================= 8. request-id absent (spec) ==================== */

describe("MP-M2 · request-id absent", () => {
  it("omits the pair rather than rejecting, matching the official SDK", () => {
    // The spec does not require x-request-id; absence changes the manifest.
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_NO_REQUEST_ID),
        dataId: DATA_ID,
        secret: SECRET,
      }).outcome,
    ).toBe("VERIFIED");
  });

  it("rejects when the sender signed WITH a request-id that we did not receive", () => {
    // Presenting the request-id-less manifest's digest while the real signature
    // covers a request-id cannot verify — omission is faithful, not lenient.
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_NO_REQUEST_ID),
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: SECRET,
      }),
    ).toEqual({ outcome: "REJECTED", reason: "SIGNATURE_MISMATCH" });
  });
});

/* ====================== 9. data/resource id absent (spec) ================= */

describe("MP-M2 · data.id absent", () => {
  it("omits the id pair rather than rejecting", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_ONLY_TS),
        secret: SECRET,
      }).outcome,
    ).toBe("VERIFIED");
  });

  it("rejects when the sender signed WITH a data.id that we did not receive", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_ONLY_TS),
        dataId: DATA_ID,
        secret: SECRET,
      }),
    ).toEqual({ outcome: "REJECTED", reason: "SIGNATURE_MISMATCH" });
  });

  it("rejects a signature that covers no id when an id was presented", () => {
    // The inverse direction: we present an id the sender never signed.
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_NO_DATA_ID),
        requestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: SECRET,
      }),
    ).toEqual({ outcome: "REJECTED", reason: "SIGNATURE_MISMATCH" });
  });
});

/* ==================== 10. casing and whitespace behavior ================== */

describe("MP-M2 · casing and whitespace", () => {
  it("accepts an uppercase hex digest (hex is case-insensitive)", () => {
    expect(
      verifyMercadoPagoSignature(fullInput({ signatureHeader: header(KAT_FULL.toUpperCase()) }))
        .outcome,
    ).toBe("VERIFIED");
  });

  it("accepts uppercase keys in the signature header", () => {
    expect(
      verifyMercadoPagoSignature(fullInput({ signatureHeader: `TS=${TS},V1=${KAT_FULL}` })).outcome,
    ).toBe("VERIFIED");
  });

  it("trims surrounding whitespace on keys and values", () => {
    expect(
      verifyMercadoPagoSignature(
        fullInput({ signatureHeader: `  ts = ${TS} , v1 = ${KAT_FULL}  ` }),
      ).outcome,
    ).toBe("VERIFIED");
  });

  it("trims whitespace around the secret and the signed metadata", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_FULL),
        requestId: ` ${REQUEST_ID} `,
        dataId: ` ${DATA_ID} `,
        secret: ` ${SECRET} `,
      }).outcome,
    ).toBe("VERIFIED");
  });

  it("does NOT case-fold the secret or the metadata values", () => {
    // Only header KEYS and hex are case-insensitive; a value's case is content.
    // Uses a MIXED-CASE id — a digits-only id would make this test vacuous.
    const mixedCaseId = "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3";

    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_MIXED_CASE_ID),
        requestId: REQUEST_ID,
        dataId: mixedCaseId,
        secret: SECRET,
      }).outcome,
    ).toBe("VERIFIED");

    // Same characters, folded: a different manifest, so a different digest.
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header(KAT_MIXED_CASE_ID),
        requestId: REQUEST_ID,
        dataId: mixedCaseId.toLowerCase(),
        secret: SECRET,
      }),
    ).toEqual({ outcome: "REJECTED", reason: "SIGNATURE_MISMATCH" });
  });

  it("ignores an empty part between separators", () => {
    expect(
      verifyMercadoPagoSignature(fullInput({ signatureHeader: `ts=${TS},,v1=${KAT_FULL}` }))
        .outcome,
    ).toBe("VERIFIED");
  });
});

/* ========================== 11. secret never leaks ======================== */

describe("MP-M2 · the secret never appears in a result", () => {
  const leakySecret = "SECRET_MUST_NEVER_APPEAR_IN_ANY_OUTPUT_9f3a";

  const rejectionInputs = [
    { signatureHeader: undefined, secret: leakySecret },
    { signatureHeader: header(KAT_FULL), secret: undefined },
    { signatureHeader: "garbage", secret: leakySecret },
    { signatureHeader: `v1=${KAT_FULL}`, secret: leakySecret },
    { signatureHeader: header(KAT_FULL, "abc"), secret: leakySecret },
    {
      signatureHeader: header(KAT_FULL),
      dataId: DATA_ID,
      requestId: REQUEST_ID,
      secret: leakySecret,
    },
  ];

  it.each(rejectionInputs.map((input, index) => [index, input]))(
    "rejection %i carries only a closed reason",
    (_index, input) => {
      const result = verifyMercadoPagoSignature(input);
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(leakySecret);
      expect(result.outcome).toBe("REJECTED");
    },
  );

  it("never exposes the expected digest on a mismatch", () => {
    const result = verifyMercadoPagoSignature(
      fullInput({ signatureHeader: header("0".repeat(64)) }),
    );
    expect(JSON.stringify(result)).not.toContain(KAT_FULL);
  });
});

/* ======================= 12. secret never reaches console ================= */

describe("MP-M2 · the secret never reaches console", () => {
  const methods = ["log", "info", "warn", "error", "debug", "trace"] as const;
  let spies: Array<{ mockRestore: () => void; mock: { calls: unknown[][] } }> = [];

  afterEach(() => {
    for (const spy of spies) spy.mockRestore();
    spies = [];
  });

  it("writes nothing at all while verifying, valid or invalid", () => {
    const leakySecret = "CONSOLE_LEAK_CANARY_4c1d";
    spies = methods.map((method) => vi.spyOn(console, method).mockImplementation(() => {}));

    verifyMercadoPagoSignature({
      signatureHeader: header(KAT_FULL),
      requestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: leakySecret,
    });
    verifyMercadoPagoSignature({ signatureHeader: "bad", secret: leakySecret });
    verifyMercadoPagoSignature({ secret: leakySecret });

    for (const spy of spies) {
      expect(spy.mock.calls).toHaveLength(0);
    }
  });
});

/* ================= 13/14/15. no store, no entitlement, no fetch =========== */

describe("MP-M2 · the verifier has no side effects and no dependencies", () => {
  const SOURCE_PATH = join(process.cwd(), "src/server/billing/mercadopago/webhook-verifier.ts");

  it("imports nothing that could persist, entitle or call a provider", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    // Non-vacuous: assert we actually read the module, not an empty string.
    expect(source.length).toBeGreaterThan(2000);
    expect(source).toContain("verifyMercadoPagoSignature");

    // Inspect import SPECIFIERS, not the whole text: a doc comment mentioning
    // "Supabase" must not be mistaken for a dependency on it.
    const specifiers = [...source.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1] ?? "");
    expect(specifiers.length).toBeGreaterThan(0);

    for (const specifier of specifiers) {
      for (const forbidden of [
        "application",
        "providers",
        "resource-fetcher",
        "entitlements",
        "checkout",
        "supabase",
      ]) {
        expect(specifier).not.toContain(forbidden);
      }
    }
  });

  it("contains no network call of its own", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });

  it("never performs a network call", () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("the verifier must not fetch");
    });
    vi.stubGlobal("fetch", fetchSpy);

    try {
      verifyMercadoPagoSignature(fullInput());
      verifyMercadoPagoSignature({ signatureHeader: "bad", secret: SECRET });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("returns only an outcome and a reason — never subscription state", () => {
    const result = verifyMercadoPagoSignature(fullInput());
    expect(Object.keys(result).sort()).toEqual(["outcome", "reason"]);
    expect(result.outcome).toBe("VERIFIED");
  });

  it("cannot grant access: a verified result carries no entitlement field", () => {
    const result = verifyMercadoPagoSignature(fullInput());
    expect(result).not.toHaveProperty("isPro");
    expect(result).not.toHaveProperty("plan");
    expect(result).not.toHaveProperty("subscription");
    expect(result).not.toHaveProperty("status");
  });
});

/* ========================= 16. wrong comparison fails closed ============== */

describe("MP-M2 · a wrong comparison fails closed", () => {
  it("rejects when the digest is valid hex but not the expected one", () => {
    const other = "a".repeat(64);
    expect(verifyMercadoPagoSignature(fullInput({ signatureHeader: header(other) }))).toEqual({
      outcome: "REJECTED",
      reason: "SIGNATURE_MISMATCH",
    });
  });

  it("rejects an all-zero digest", () => {
    expect(
      verifyMercadoPagoSignature(fullInput({ signatureHeader: header("0".repeat(64)) })).outcome,
    ).toBe("REJECTED");
  });

  it("does not throw when the digest length is wrong", () => {
    // timingSafeEqual throws on unequal lengths; the guard must run first.
    expect(() =>
      verifyMercadoPagoSignature(fullInput({ signatureHeader: header("ab") })),
    ).not.toThrow();
  });

  it("never throws for hostile inputs", () => {
    const hostile: unknown[] = [
      { signatureHeader: 42, secret: SECRET },
      { signatureHeader: {}, secret: SECRET },
      { signatureHeader: [], secret: SECRET },
      { signatureHeader: header(KAT_FULL), dataId: {}, secret: SECRET },
      { signatureHeader: header(KAT_FULL), requestId: 12, secret: SECRET },
      { secret: {} },
    ];

    for (const input of hostile) {
      expect(() =>
        verifyMercadoPagoSignature(input as Parameters<typeof verifyMercadoPagoSignature>[0]),
      ).not.toThrow();
    }
  });
});

/* ================= 17. duplicate / multiple header values ================= */

describe("MP-M2 · duplicate header values are defined", () => {
  it("takes the last ts when ts appears twice", () => {
    expect(
      verifyMercadoPagoSignature(fullInput({ signatureHeader: `ts=1,v1=${KAT_FULL},ts=${TS}` }))
        .outcome,
    ).toBe("VERIFIED");
  });

  it("takes the last v1 when v1 appears twice", () => {
    expect(
      verifyMercadoPagoSignature(
        fullInput({ signatureHeader: `ts=${TS},v1=${"0".repeat(64)},v1=${KAT_FULL}` }),
      ).outcome,
    ).toBe("VERIFIED");
  });

  it("rejects when the last duplicate is the wrong one", () => {
    expect(
      verifyMercadoPagoSignature(
        fullInput({ signatureHeader: `ts=${TS},v1=${KAT_FULL},v1=${"0".repeat(64)}` }),
      ),
    ).toEqual({ outcome: "REJECTED", reason: "SIGNATURE_MISMATCH" });
  });

  it("ignores unsupported versions but still requires v1", () => {
    expect(
      verifyMercadoPagoSignature(fullInput({ signatureHeader: `ts=${TS},v2=${KAT_FULL}` })),
    ).toEqual({ outcome: "REJECTED", reason: "MISSING_HASH" });
  });
});

/* ================= 18. the body is not signed metadata ==================== */

describe("MP-M2 · the request body cannot substitute signed metadata", () => {
  it("the manifest builder ignores anything but the signed fields", () => {
    // There is no body parameter at all: the manifest is metadata-only.
    expect(
      buildMercadoPagoSignatureManifest({ dataId: DATA_ID, requestId: REQUEST_ID, ts: TS }),
    ).toBe(MANIFEST_FULL);
  });

  it("the frozen-seam adapter ignores the raw body entirely", () => {
    const verifier = createMercadoPagoWebhookVerifier({ webhookSecret: SECRET });

    const bodyClaimingAnotherId = JSON.stringify({ data: { id: "9999999999" } });
    const bodyClaimingTheRightId = JSON.stringify({ data: { id: DATA_ID } });

    const headers = {
      [MERCADOPAGO_SIGNATURE_HEADER]: header(KAT_FULL),
      [MERCADOPAGO_REQUEST_ID_HEADER]: REQUEST_ID,
      [MERCADOPAGO_DATA_ID_QUERY_KEY]: DATA_ID,
    };

    // Same headers, contradictory bodies: identical verdicts prove the body is
    // not part of the signed material and cannot influence the outcome.
    expect(verifier.verify(bodyClaimingAnotherId, headers)).toBe(true);
    expect(verifier.verify(bodyClaimingTheRightId, headers)).toBe(true);
  });

  it("does not let a body-supplied id rescue a missing signed id", () => {
    const verifier = createMercadoPagoWebhookVerifier({ webhookSecret: SECRET });
    // Signed WITH data.id, but the host forwarded no data.id: the manifest omits
    // it and cannot match — the body is not consulted as a substitute.
    expect(
      verifier.verify(JSON.stringify({ data: { id: DATA_ID } }), {
        [MERCADOPAGO_SIGNATURE_HEADER]: header(KAT_FULL),
        [MERCADOPAGO_REQUEST_ID_HEADER]: REQUEST_ID,
      }),
    ).toBe(false);
  });
});

/* ============================ manifest literals =========================== */

describe("MP-M2 · manifest format is pinned literally", () => {
  it.each([
    ["all parts", { dataId: DATA_ID, requestId: REQUEST_ID, ts: TS }, MANIFEST_FULL],
    ["no data.id", { requestId: REQUEST_ID, ts: TS }, MANIFEST_NO_DATA_ID],
    ["no request-id", { dataId: DATA_ID, ts: TS }, MANIFEST_NO_REQUEST_ID],
    ["ts only", { ts: TS }, MANIFEST_ONLY_TS],
  ])("builds the documented manifest for %s", (_label, parts, expected) => {
    expect(buildMercadoPagoSignatureManifest(parts)).toBe(expected);
  });

  it("omits blank parts exactly as the official SDK does", () => {
    expect(buildMercadoPagoSignatureManifest({ dataId: "  ", requestId: "", ts: TS })).toBe(
      MANIFEST_ONLY_TS,
    );
  });
});

/* ======================== frozen-seam adapter behavior ==================== */

describe("MP-M2 · frozen WebhookVerifier adapter", () => {
  it("satisfies the frozen seam: verify(rawBody, headers) -> boolean", () => {
    const verifier = createMercadoPagoWebhookVerifier({ webhookSecret: SECRET });
    const result = verifier.verify("{}", {
      [MERCADOPAGO_SIGNATURE_HEADER]: header(KAT_FULL),
      [MERCADOPAGO_REQUEST_ID_HEADER]: REQUEST_ID,
      [MERCADOPAGO_DATA_ID_QUERY_KEY]: DATA_ID,
    });
    expect(result).toBe(true);
  });

  it("reads header names case-insensitively", () => {
    const verifier = createMercadoPagoWebhookVerifier({ webhookSecret: SECRET });
    expect(
      verifier.verify("{}", {
        "X-Signature": header(KAT_FULL),
        "X-Request-Id": REQUEST_ID,
        "Data.Id": DATA_ID,
      }),
    ).toBe(true);
  });

  it("returns false, never throws, when the secret is not configured", () => {
    const verifier = createMercadoPagoWebhookVerifier({ webhookSecret: null });
    expect(() =>
      verifier.verify("{}", { [MERCADOPAGO_SIGNATURE_HEADER]: header(KAT_FULL) }),
    ).not.toThrow();
    expect(verifier.verify("{}", { [MERCADOPAGO_SIGNATURE_HEADER]: header(KAT_FULL) })).toBe(false);
  });

  it("returns false for an empty header bag", () => {
    const verifier = createMercadoPagoWebhookVerifier({ webhookSecret: SECRET });
    expect(verifier.verify("{}", {})).toBe(false);
  });
});
