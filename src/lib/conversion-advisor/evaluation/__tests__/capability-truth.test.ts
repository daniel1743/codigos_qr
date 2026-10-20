/**
 * CA-9A — phase 1, the capability truth inventory. The four lists are DERIVED
 * from the catalog and the action registry, so these tests pin the derivation
 * and the classifications the report depends on. No provider, no network.
 */
import { describe, expect, it } from "vitest";

import {
  ALL_CAPABILITY_IDS,
  AVAILABLE_ACTIONS,
  CAPABILITY_TRUTH,
  CONDITIONAL_ACTIONS,
  CONDITIONALLY_SUPPORTED,
  FORBIDDEN_CLAIM_PATTERN_COUNT,
  NOT_IMPLEMENTED_ACTIONS,
  SUPPORTED_CAPABILITIES,
  UNSUPPORTED_CAPABILITIES,
  UNSUPPORTED_CAPABILITY_IDS,
  UNSUPPORTED_FEATURE_TERMS,
} from "../capability-truth";
import { CAPABILITY_CATALOG, CATALOG_VERIFIED_ON } from "../../capabilities/catalog";

describe("CA-9A capability truth — the derived lists", () => {
  it("splits the catalog into supported / conditional / unsupported with no loss", () => {
    const total =
      SUPPORTED_CAPABILITIES.length +
      CONDITIONALLY_SUPPORTED.length +
      UNSUPPORTED_CAPABILITIES.length;
    expect(total).toBe(CAPABILITY_CATALOG.length);
    expect(ALL_CAPABILITY_IDS.length).toBe(CAPABILITY_CATALOG.length);
  });

  it("marks the two PARTIAL capabilities as conditional, never as supported", () => {
    expect(CONDITIONALLY_SUPPORTED).toEqual(["crear_pagina", "plan_premium"]);
    expect(SUPPORTED_CAPABILITIES).not.toContain("plan_premium");
    expect(SUPPORTED_CAPABILITIES).not.toContain("crear_pagina");
  });

  it("keeps the planned and non-existent capabilities out of the supported set", () => {
    expect(UNSUPPORTED_CAPABILITIES).toContain("dominio_personalizado");
    expect(UNSUPPORTED_CAPABILITIES).toContain("bloques_no_disponibles");
    expect(SUPPORTED_CAPABILITIES).not.toContain("dominio_personalizado");
  });

  it("never lets a conditional or unsupported id look sellable", () => {
    for (const id of UNSUPPORTED_CAPABILITY_IDS) {
      expect(SUPPORTED_CAPABILITIES).not.toContain(id);
    }
  });

  it("records the catalog's verification date", () => {
    expect(CAPABILITY_TRUTH.catalog_verified_on).toBe(CATALOG_VERIFIED_ON);
  });
});

describe("CA-9A capability truth — actions", () => {
  it("lists exactly the available, conditional and not-implemented actions", () => {
    expect(AVAILABLE_ACTIONS).toEqual([
      "EXPLAIN_FEATURE",
      "EXPLAIN_FREE_PREMIUM",
      "NONE",
      "OPEN_HELP",
      "SHOW_EDITOR_HELP",
    ]);
    expect(CONDITIONAL_ACTIONS).toEqual(["OFFER_GUEST_EDITOR", "SHOW_TEMPLATE_PREVIEW"]);
    expect(NOT_IMPLEMENTED_ACTIONS).toEqual([]);
  });

  it("treats the guest editor as conditional, which is why it degrades to EXPLAIN", () => {
    expect(CONDITIONAL_ACTIONS).toContain("OFFER_GUEST_EDITOR");
    expect(AVAILABLE_ACTIONS).not.toContain("OFFER_GUEST_EDITOR");
  });
});

describe("CA-9A capability truth — forbidden claims", () => {
  it("reports the catalog's real pattern count", () => {
    // The patterns themselves are the authority (CA-4's `screenClaim`); this
    // constant is only `FORBIDDEN_CLAIM_PATTERNS.length` re-exported for the
    // report, so pinning it to a literal is what catches a pattern being added
    // or removed without the report being updated.
    expect(FORBIDDEN_CLAIM_PATTERN_COUNT).toBe(8);
  });

  it("describes every pattern class, allowing several patterns per description", () => {
    // `FORBIDDEN_CLAIMS` is a READABLE INDEX over the patterns, not a 1:1 mirror:
    // the two money-amount patterns (`$ 7.990` and `7.990 CLP`) share the one
    // description "any explicit money amount". So the list is shorter than the
    // pattern count by exactly that merge — asserting equality would be wrong.
    const described = CAPABILITY_TRUTH.forbidden_claims;
    expect(described.length).toBeGreaterThanOrEqual(6);
    expect(described.length).toBeLessThanOrEqual(FORBIDDEN_CLAIM_PATTERN_COUNT);
    expect(described.some((line) => line.includes("money amount"))).toBe(true);
    expect(described.some((line) => line.includes("guarantee"))).toBe(true);
  });

  it("names the features the product does not have", () => {
    expect(UNSUPPORTED_FEATURE_TERMS).toContain("subir videos");
    expect(UNSUPPORTED_FEATURE_TERMS).toContain("carrito de compras");
    expect(UNSUPPORTED_FEATURE_TERMS).toContain("conectar tu dominio");
    expect(UNSUPPORTED_FEATURE_TERMS).toContain("reserva nativa");
  });
});
