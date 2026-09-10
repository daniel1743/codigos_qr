import { describe, expect, it } from "vitest";
import {
  MAX_TRUST_SIGNALS,
  TRUST_SIGNAL_DEFINITIONS,
  USER_SELECTABLE_SIGNALS,
  isTrustSignalValid,
  normalizeTrustSignals,
  trustSignalLabel,
} from "../constants/trustSignals";

describe("Trust signal catalog", () => {
  it("exposes ~10 signal definitions", () => {
    expect(TRUST_SIGNAL_DEFINITIONS.length).toBe(10);
  });

  it("verified_profile is SYSTEM_ONLY (excluded from user selection)", () => {
    expect(USER_SELECTABLE_SIGNALS.some((d) => d.type === "verified_profile")).toBe(false);
  });

  it("verified_profile cannot be self-enabled without an authority", () => {
    expect(isTrustSignalValid({ id: "x", type: "verified_profile" })).toBe(false);
  });

  it("maximum active signals is 4", () => {
    expect(MAX_TRUST_SIGNALS).toBe(4);
  });
});

describe("Trust signal validation", () => {
  it("no-input signals are valid without a value", () => {
    expect(isTrustSignalValid({ id: "1", type: "availability_24h" })).toBe(true);
    expect(isTrustSignalValid({ id: "2", type: "local_business" })).toBe(true);
  });

  it("required empty inputs do not produce a public claim", () => {
    expect(isTrustSignalValid({ id: "1", type: "certification", value: "" })).toBe(false);
    expect(isTrustSignalValid({ id: "2", type: "award" })).toBe(false);
    expect(isTrustSignalValid({ id: "3", type: "response_time" })).toBe(false);
  });

  it("out-of-range values are invalid", () => {
    expect(isTrustSignalValid({ id: "1", type: "rating", value: 9 })).toBe(false);
    expect(isTrustSignalValid({ id: "2", type: "experience", value: 0 })).toBe(false);
    expect(isTrustSignalValid({ id: "3", type: "response_time", value: 200 })).toBe(false);
  });

  it("valid typed signals pass", () => {
    expect(isTrustSignalValid({ id: "1", type: "rating", value: 4.8, reviewCount: 126 })).toBe(true);
    expect(isTrustSignalValid({ id: "2", type: "experience", value: 8 })).toBe(true);
  });
});

describe("Renderer defensive handling", () => {
  it("never renders more than 4 signals even with malformed input", () => {
    const six = [1, 2, 3, 4, 5, 6].map((i) => ({
      id: String(i),
      type: "availability_24h" as const,
    }));
    expect(normalizeTrustSignals(six).length).toBe(4);
  });

  it("drops invalid signals (required input missing)", () => {
    const mixed = [
      { id: "1", type: "availability_24h" as const },
      { id: "2", type: "award" as const, value: "" },
      { id: "3", type: "local_business" as const },
    ];
    expect(normalizeTrustSignals(mixed).map((s) => s.id)).toEqual(["1", "3"]);
  });

  it("handles null/undefined", () => {
    expect(normalizeTrustSignals(null)).toEqual([]);
    expect(normalizeTrustSignals(undefined)).toEqual([]);
  });
});

describe("Display labels", () => {
  it("formats typed signals into Spanish", () => {
    expect(trustSignalLabel({ id: "1", type: "response_time", value: 2 })).toBe("Responde en 2 h");
    expect(trustSignalLabel({ id: "2", type: "rating", value: 4.8, reviewCount: 126 })).toBe(
      "★ 4.8 · 126 reseñas",
    );
    expect(trustSignalLabel({ id: "3", type: "experience", value: 8 })).toBe(
      "8 años de experiencia",
    );
    expect(trustSignalLabel({ id: "4", type: "customers_served", value: 500 })).toBe(
      "+500 clientes",
    );
    expect(trustSignalLabel({ id: "5", type: "availability_24h" })).toBe("Atención 24 h");
  });

  it("legacy label-only badges still render their label", () => {
    expect(trustSignalLabel({ id: "1", label: "Legacy" })).toBe("Legacy");
  });
});

describe("Canonical round-trip", () => {
  it("trust signals survive JSON serialization (persistence safety)", () => {
    const signals = [
      { id: "s1", type: "rating" as const, value: 4.8, reviewCount: 126 },
      { id: "s2", type: "availability_24h" as const },
    ];
    const parsed = JSON.parse(JSON.stringify({ badges: signals }));
    expect(parsed.badges).toEqual(signals);
  });
});
