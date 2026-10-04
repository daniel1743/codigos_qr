import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  isCanonicalPublicResolutionEnabled,
  isCanonicalPublicResolutionFlagOn,
  parseCanonicalPublicResolutionAllowlist,
} from "./canonicalPublicResolutionGate";

/** PHASE 3C: the pure gate receives raw SERVER env values — never an env bag. */
const gate = (
  flagValue: unknown,
  allowlistValue?: unknown,
  identifiers: readonly (string | null | undefined)[] = ["KTRdygd"],
) => ({ flagValue, allowlistValue, identifiers });

describe("canonical public resolution gate — OFF by default", () => {
  it("is disabled when the flag is absent (no env at all)", () => {
    expect(isCanonicalPublicResolutionEnabled(gate(undefined, "KTRdygd"))).toBe(false);
    expect(isCanonicalPublicResolutionFlagOn(undefined)).toBe(false);
  });

  it("is disabled for '', 'false' and anything other than exactly 'true'", () => {
    for (const value of [undefined, "", "false", "1", "TRUE", "yes", null, true, 1]) {
      expect(isCanonicalPublicResolutionEnabled(gate(value, "KTRdygd"))).toBe(false);
    }
  });

  it("requires a non-empty allowlist even when the flag is on", () => {
    for (const allowlist of [undefined, "", "   ", ",,,", 123, null]) {
      expect(isCanonicalPublicResolutionEnabled(gate("true", allowlist))).toBe(false);
    }
  });

  it("denies identifiers that are not allowlisted", () => {
    expect(
      isCanonicalPublicResolutionEnabled(
        gate("true", "KTRdygd,vida-saludable-bienestar", ["VvUsngW", "otro-perfil"]),
      ),
    ).toBe(false);
  });
});

describe("canonical public resolution gate — selective activation", () => {
  it("enables allowlisted profile public ids", () => {
    expect(isCanonicalPublicResolutionEnabled(gate("true", "KTRdygd"))).toBe(true);
  });

  it("enables allowlisted profile slugs", () => {
    expect(
      isCanonicalPublicResolutionEnabled(
        gate("true", "KTRdygd, vida-saludable-bienestar", ["vida-saludable-bienestar"]),
      ),
    ).toBe(true);
  });

  it("matches when any identifier of the visit is allowlisted", () => {
    expect(isCanonicalPublicResolutionEnabled(gate("true", "KTRdygd", [null, undefined, "  KTRdygd  "]))).toBe(
      true,
    );
  });

  it("trims both sides and ignores empty identifiers", () => {
    expect(
      isCanonicalPublicResolutionEnabled(
        gate("true", "  vida-saludable-bienestar  ", ["  vida-saludable-bienestar  "]),
      ),
    ).toBe(true);
    expect(isCanonicalPublicResolutionEnabled(gate("true", "KTRdygd", []))).toBe(false);
  });

  it("reports the global flag independently from the allowlist", () => {
    expect(isCanonicalPublicResolutionFlagOn("true")).toBe(true);
    expect(isCanonicalPublicResolutionFlagOn("false")).toBe(false);
  });

  it("parses only trimmed, non-empty string entries", () => {
    expect([...parseCanonicalPublicResolutionAllowlist("a, b ,,c")].sort()).toEqual(["a", "b", "c"]);
    expect(parseCanonicalPublicResolutionAllowlist(123).size).toBe(0);
    expect(parseCanonicalPublicResolutionAllowlist(null).size).toBe(0);
  });
});

describe("canonical public resolution gate — no configuration leaks", () => {
  it("is env-agnostic: no env READ, no import.meta.env, no VITE_ names", async () => {
    const source = await readFile(new URL("./canonicalPublicResolutionGate.ts", import.meta.url), "utf8");
    // Read-shaped matches only: the docstring may *mention* the env mechanisms
    // while explaining why the pure gate never touches them.
    expect(source).not.toMatch(/process\.env[[.]/);
    expect(source).not.toMatch(/import\.meta\.env[[.]/);
    expect(source).not.toMatch(/VITE_/);
  });
});
