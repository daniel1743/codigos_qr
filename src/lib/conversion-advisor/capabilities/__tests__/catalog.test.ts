/**
 * CA-2 — catalog integrity tests.
 *
 * These are not "does it parse" tests: they are the rules that stop the advisor
 * from selling something CRIPQER cannot deliver. If one of these fails, the
 * catalog is not fit to answer a visitor.
 */
import { describe, expect, it } from "vitest";

import {
  CAPABILITY_CATALOG,
  CAPABILITY_PLANS,
  CAPABILITY_STATUSES,
  capabilitiesForPlan,
  findCapability,
  screenClaim,
} from "../catalog";

describe("catalog integrity", () => {
  it("has unique, non-empty capability ids", () => {
    const ids = CAPABILITY_CATALOG.map((entry) => entry.capability_id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.trim().length).toBeGreaterThan(0);
  });

  it("every entry carries evidence and a verification date", () => {
    for (const entry of CAPABILITY_CATALOG) {
      expect(entry.evidence.length, `${entry.capability_id} has no evidence`).toBeGreaterThan(0);
      // Each entry must pin at least one specific behaviour (`path:line`).
      // A bare path is accepted only as a companion ref (e.g. the test file
      // that exercises the capability), never as the sole evidence.
      // Evidence lives in `src/` or in a migration — a migration is frequently
      // the strongest proof (RLS policies decide what a user may actually do).
      const anchored = entry.evidence.filter((ref) => /^(src|supabase)\/.+:\d+$/.test(ref));
      expect(
        anchored.length,
        `${entry.capability_id} cites no line-anchored evidence`,
      ).toBeGreaterThan(0);
      for (const ref of entry.evidence) {
        expect(ref, `${entry.capability_id} evidence is not a repo path`).toMatch(
          /^(src|supabase)\/[^\s]+(:\d+)?$/,
        );
      }
      expect(entry.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("only uses declared statuses and plans", () => {
    for (const entry of CAPABILITY_CATALOG) {
      expect(CAPABILITY_STATUSES).toContain(entry.status);
      for (const plan of entry.available_plans) expect(CAPABILITY_PLANS).toContain(plan);
    }
  });

  it("a capability that is sold must name the plans that get it; one that is not must name none", () => {
    for (const entry of CAPABILITY_CATALOG) {
      const sold = entry.status === "AVAILABLE_VERIFIED" || entry.status === "PARTIAL";
      if (sold) {
        expect(
          entry.available_plans.length,
          `${entry.capability_id} is offered without plans`,
        ).toBeGreaterThan(0);
      } else {
        expect(
          entry.available_plans.length,
          `${entry.capability_id} is not available but lists plans`,
        ).toBe(0);
      }
    }
  });

  it("an entry that is not fully available states a limitation", () => {
    for (const entry of CAPABILITY_CATALOG) {
      if (entry.status === "AVAILABLE_VERIFIED") continue;
      expect(
        entry.limitations.length,
        `${entry.capability_id} claims a non-available status without a limitation`,
      ).toBeGreaterThan(0);
    }
  });

  it("every entry names at least one forbidden claim", () => {
    for (const entry of CAPABILITY_CATALOG) {
      expect(entry.forbidden_claims.length, `${entry.capability_id}`).toBeGreaterThan(0);
    }
  });

  it("related capabilities resolve inside the catalog", () => {
    for (const entry of CAPABILITY_CATALOG) {
      for (const related of entry.related_capabilities) {
        expect(findCapability(related), `${entry.capability_id} → ${related}`).not.toBeNull();
      }
    }
  });
});

describe("claim safety", () => {
  it("no allowed claim trips the forbidden-claim screen", () => {
    for (const entry of CAPABILITY_CATALOG) {
      for (const claim of entry.allowed_claims) {
        const verdict = screenClaim(claim);
        expect(
          verdict.safe,
          `${entry.capability_id}: "${claim}" matched ${verdict.matched.join(", ")}`,
        ).toBe(true);
      }
    }
  });

  it("catches prices, trial promises, unlimited/perpetual and roadmap language", () => {
    expect(screenClaim("Cuesta $7.990 al mes").safe).toBe(false);
    expect(screenClaim("Tienes 10 días gratis").safe).toBe(false);
    expect(screenClaim("QR ilimitados").safe).toBe(false);
    expect(screenClaim("Tu dominio para siempre").safe).toBe(false);
    expect(screenClaim("Próximamente tendremos catálogo").safe).toBe(false);
    expect(screenClaim("Te garantizamos ventas").safe).toBe(false);
  });

  it("lets grounded, non-commercial promises through", () => {
    expect(screenClaim("Puedes publicar tu tarjeta con un plan gratuito.").safe).toBe(true);
    expect(screenClaim("Tu asistente responde con la información que configures.").safe).toBe(true);
  });
});

describe("plan queries", () => {
  it("free and pro resolve without a paid-offer dependency", () => {
    expect(capabilitiesForPlan("free").length).toBeGreaterThan(0);
    expect(capabilitiesForPlan("pro").length).toBeGreaterThan(0);
  });

  it("branding removal is NOT offered to free", () => {
    const branding = findCapability("marca_cripqer");
    expect(branding?.available_plans).not.toContain("free");
  });

  it("the paid plan never advertises a price (the base has no enabled offer)", () => {
    const premium = findCapability("plan_premium");
    expect(premium?.status).toBe("PARTIAL");
    expect(premium?.limitations.join(" ")).toMatch(/precio/i);
  });
});
