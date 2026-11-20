// @vitest-environment happy-dom
/**
 * Guest Editor V1 - G7.3 tests: the QR destination must be verifiable, not pretty.
 */
import { describe, expect, it } from "vitest";
import { expectedQrDestination, verifyQrDestination } from "../qrDestination";

const PUBLIC_ID = "yfLEdka";

describe("QR destination (G7.3)", () => {
  it("accepts the canonical QR URL of the page", () => {
    const check = verifyQrDestination({
      publicId: PUBLIC_ID,
      payload: expectedQrDestination(PUBLIC_ID),
    });
    expect(check.ok).toBe(true);
    expect(check.problems).toEqual([]);
    expect(check.expected).toBe("https://www.cripqer.dev/q/yfLEdka");
  });

  it("rejects a direct page URL: the QR must encode the /q/ namespace", () => {
    const check = verifyQrDestination({
      publicId: PUBLIC_ID,
      payload: "https://www.cripqer.dev/pg/yfLEdka",
    });
    expect(check.ok).toBe(false);
    expect(check.problems).toContain("ruta-no-canonica");
  });

  it("rejects an editor route", () => {
    const check = verifyQrDestination({
      publicId: PUBLIC_ID,
      payload: "https://www.cripqer.dev/pages/yfLEdka/edit",
    });
    expect(check.ok).toBe(false);
    expect(check.problems).toContain("ruta-de-editor");
  });

  it("rejects localhost and non-https payloads", () => {
    const local = verifyQrDestination({
      publicId: PUBLIC_ID,
      payload: "http://localhost:5173/q/yfLEdka",
    });
    expect(local.ok).toBe(false);
    expect(local.problems).toEqual(
      expect.arrayContaining(["no-https", "localhost", "origen-no-canonico"]),
    );

    const insecure = verifyQrDestination({
      publicId: PUBLIC_ID,
      payload: "http://www.cripqer.dev/q/yfLEdka",
    });
    expect(insecure.problems).toContain("no-https");
  });

  it("rejects a payload that carries data or points at another page", () => {
    const withData = verifyQrDestination({
      publicId: PUBLIC_ID,
      payload: "https://www.cripqer.dev/q/yfLEdka?email=ana@x.dev",
    });
    expect(withData.problems).toContain("query-inesperada");

    const otherPage = verifyQrDestination({
      publicId: PUBLIC_ID,
      payload: "https://www.cripqer.dev/q/otraPagina",
    });
    expect(otherPage.ok).toBe(false);
  });

  it("rejects an empty payload", () => {
    expect(verifyQrDestination({ publicId: PUBLIC_ID, payload: "" }).ok).toBe(false);
  });
});
