import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCatalogRegistry,
  CatalogDeclarationError,
  createDeclaredCatalogRegistry,
  isOfferDeclaredComplete,
  pendingOfferDeclarations,
  PLAN_OFFER_DECLARATIONS,
} from "../offers";
import { createProductionProviderRegistry, missingAdapterProviders } from "../adapters";

/**
 * B0 — SECURITY & FOUNDATION CONTRACT.
 *
 * These are regression gates for the two things B0 exists to fix. They assert
 * properties that a future change could silently undo:
 *
 *   · invitation codes are not enumerable by a browser role, and the redeem path
 *     is server-only, atomic and non-revealing;
 *   · no UI surface decides Premium on its own any more.
 *
 * The migration is asserted as SOURCE, not as a live database — the repository
 * cannot run a database in a unit test. Reading the DDL is the honest way to
 * pin "this statement must exist, and that one must not come back".
 */

const ROOT = process.cwd();
const MIGRATION = join(
  ROOT,
  "supabase/migrations/20261007000001_b0_billing_foundation_and_security.sql",
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * Executable SQL only: `--` comments are stripped, then whitespace collapsed.
 *
 * Both steps are load-bearing. The migration DOCUMENTS the dangerous policy it
 * removes by quoting it, and asserts that no new permissive policy has appeared.
 * Without stripping comments, that documentation would fail its own test — the
 * assertion must be about what the database will execute, never about prose.
 */
function sql(): string {
  return read(MIGRATION)
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .replace(/\s+/g, " ");
}

describe("B0.1 · invitation codes are not enumerable", () => {
  it("drops the policy that let every role list active codes", () => {
    expect(sql()).toContain(
      'DROP POLICY IF EXISTS "Anyone can read active codes for validation" ON public.invitation_codes',
    );
  });

  it("does NOT replace it with another permissive SELECT policy", () => {
    const text = sql();
    // The only SELECT policy that may survive is the admin-gated one, which the
    // baseline already defines. No new one may target invitation_codes here.
    const created = text.match(/CREATE POLICY[^;]*invitation_codes[^;]*;/gi) ?? [];
    expect(created).toHaveLength(0);
  });

  it("revokes the table from anon", () => {
    expect(sql()).toContain("REVOKE ALL ON TABLE public.invitation_codes FROM anon");
  });

  it("removes the legacy redeem function that was granted to anon", () => {
    const text = sql();
    expect(text).toContain(
      "DROP FUNCTION IF EXISTS public.redeem_invitation_code(text, uuid, text)",
    );
    expect(text).toContain("DROP FUNCTION IF EXISTS public.redeem_invitation_code_secure(text)");
  });

  it("makes the new redeem function server-only", () => {
    const text = sql();
    expect(text).toContain(
      "REVOKE ALL ON FUNCTION public.redeem_invitation_code_v1(uuid, text) FROM PUBLIC, anon, authenticated",
    );
    expect(text).toContain(
      "GRANT EXECUTE ON FUNCTION public.redeem_invitation_code_v1(uuid, text) TO service_role",
    );
  });

  it("hardens the SECURITY DEFINER function with a pinned search_path", () => {
    const text = sql();
    expect(text).toContain("SECURITY DEFINER");
    expect(text).toContain("SET search_path = public");
  });

  it("answers every failure mode with ONE indistinguishable reason", () => {
    const text = sql();
    // Unknown / inactive / expired / exhausted must all return the same value.
    const invalidCount = (text.match(/'reason', 'INVALID'/g) ?? []).length;
    expect(invalidCount).toBeGreaterThanOrEqual(4);
    // And no branch may leak a more specific reason.
    expect(text).not.toContain("'reason', 'EXPIRED'");
    expect(text).not.toContain("'reason', 'EXHAUSTED'");
    expect(text).not.toContain("'reason', 'INACTIVE'");
  });

  it("increments the usage counter — the legacy function never did", () => {
    expect(sql()).toContain("SET current_uses = current_uses + 1");
  });

  it("locks the code row so two concurrent redemptions cannot both win", () => {
    expect(sql()).toContain("FOR UPDATE");
  });
});

describe("B0 · billing_grants access model", () => {
  it("enables RLS and keeps browser roles out", () => {
    const text = sql();
    expect(text).toContain("ALTER TABLE public.billing_grants ENABLE ROW LEVEL SECURITY");
    expect(text).toContain("REVOKE ALL ON TABLE public.billing_grants FROM anon, authenticated");
    expect(text).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_grants TO service_role",
    );
  });

  it("creates no browser policy on the grants table", () => {
    const created = sql().match(/CREATE POLICY[^;]*billing_grants[^;]*;/gi) ?? [];
    expect(created).toHaveLength(0);
  });

  it("permits one grant per user and invitation code", () => {
    expect(sql()).toContain("billing_grants_user_invitation_unique");
  });
});

describe("B0.2/B0.4 · no UI decides Premium on its own", () => {
  it("QRStudio no longer reads the premium table from the browser", () => {
    const source = read(join(ROOT, "src/components/qr/QRStudio.tsx"));
    expect(source).not.toContain('from("premium_users")');
    expect(source).not.toContain("hasPremiumAccessByEmail");
    // It asks the canonical boundary instead.
    expect(source).toContain("getMyPlanFn");
  });

  it("the hardcoded e-mail allowlist module is gone", () => {
    expect(existsSync(join(ROOT, "src/lib/entitlements.ts"))).toBe(false);
  });

  it("no source file consults an e-mail to decide paid access", () => {
    for (const file of [
      "src/lib/billing/plan-server.ts",
      "src/server/billing/plan-service.ts",
      "src/server/billing/entitlements.ts",
    ]) {
      const source = read(join(ROOT, file));
      expect(source).not.toContain("PREMIUM_DEV_EMAILS");
      expect(source).not.toContain("hasPremiumAccessByEmail");
    }
  });

  it("every consumer of a tier goes through the ONE service", () => {
    for (const file of [
      "src/lib/billing/analytics-entitlement-server.ts",
      "src/lib/landing-bot/server.ts",
      "src/lib/landing-bot/owner.server.ts",
    ]) {
      const source = read(join(ROOT, file));
      expect(source).toContain("resolveUserPlan");
      // The old subscription-only path must not survive anywhere.
      expect(source).not.toContain("resolveEntitlement(");
    }
  });
});

describe("B0.5 · provider adapters are declared, not faked", () => {
  it("the production registry configures no provider yet", () => {
    const registry = createProductionProviderRegistry();
    expect(registry.getAdapter("paypal")).toBeNull();
    expect(registry.getAdapter("mercado_pago")).toBeNull();
    expect(registry.getAdapter("stripe")).toBeNull();
  });

  it("names the providers still missing an adapter", () => {
    expect(missingAdapterProviders(createProductionProviderRegistry()).sort()).toEqual([
      "mercado_pago",
      "paypal",
    ]);
  });
});

describe("B0.6 · the catalog contract carries no invented price", () => {
  it("declares the full cross-product of what could be sold", () => {
    // 3 plans × 2 intervals × 3 providers
    expect(PLAN_OFFER_DECLARATIONS).toHaveLength(18);
    expect(new Set(PLAN_OFFER_DECLARATIONS.map((o) => o.planId)).size).toBe(3);
    expect(new Set(PLAN_OFFER_DECLARATIONS.map((o) => o.billingInterval)).size).toBe(2);
    expect(new Set(PLAN_OFFER_DECLARATIONS.map((o) => o.provider)).size).toBe(3);
  });

  it("leaves every commercial value pending and disabled", () => {
    expect(pendingOfferDeclarations()).toHaveLength(PLAN_OFFER_DECLARATIONS.length);
    for (const offer of PLAN_OFFER_DECLARATIONS) {
      expect(offer.status).toBe("pending");
      expect(offer.amount).toBeNull();
      expect(offer.currency).toBeNull();
      expect(offer.providerOfferReference).toBeNull();
      expect(offer.enabled).toBe(false);
    }
  });

  it("resolves to an EMPTY registry today, so checkout keeps failing closed", () => {
    expect(createDeclaredCatalogRegistry().offers).toHaveLength(0);
  });

  it("refuses to enable an offer that is not fully declared", () => {
    expect(() =>
      buildCatalogRegistry([
        {
          planId: "pro",
          billingInterval: "monthly",
          provider: "paypal",
          status: "pending",
          amount: null,
          currency: null,
          providerOfferReference: null,
          enabled: true, // ← the mistake this guard exists to catch
        },
      ]),
    ).toThrow(CatalogDeclarationError);
  });

  it("accepts a fully declared offer without inventing anything", () => {
    const registry = buildCatalogRegistry([
      {
        planId: "pro",
        billingInterval: "monthly",
        provider: "paypal",
        status: "approved",
        amount: 999,
        currency: "USD",
        providerOfferReference: "P-1AB23456CD789012E",
        enabled: true,
      },
    ]);
    expect(registry.offers).toHaveLength(1);
    expect(registry.offers[0]!.amount).toBe(999);
  });

  it("requires a real positive integer amount and a real currency", () => {
    const base = {
      planId: "pro",
      billingInterval: "monthly",
      provider: "paypal",
      status: "approved",
      enabled: true,
    } as const;

    expect(
      isOfferDeclaredComplete({
        ...base,
        amount: 0,
        currency: "USD",
        providerOfferReference: "P-1",
      }),
    ).toBe(false);
    expect(
      isOfferDeclaredComplete({
        ...base,
        amount: 9.99,
        currency: "USD",
        providerOfferReference: "P-1",
      }),
    ).toBe(false);
    expect(
      isOfferDeclaredComplete({
        ...base,
        amount: 999,
        currency: "usd",
        providerOfferReference: "P-1",
      }),
    ).toBe(false);
    expect(
      isOfferDeclaredComplete({
        ...base,
        amount: 999,
        currency: "USD",
        providerOfferReference: "  ",
      }),
    ).toBe(false);
    expect(
      isOfferDeclaredComplete({
        ...base,
        amount: 999,
        currency: "USD",
        providerOfferReference: "P-1",
      }),
    ).toBe(true);
  });
});

describe("B0 · the migration is present where the project expects it", () => {
  it("lives in supabase/migrations", () => {
    expect(existsSync(MIGRATION)).toBe(true);
  });
});

/**
 * B0-SEAL — the residual privilege findings of the re-audit must stay closed.
 *
 * The re-audit (CRIPQER_BILLING_MERCADOPAGO_PAYPAL_REAUDIT_V2) found that B0 had
 * not reduced the legacy `GRANT ALL` on `premium_users` / `admin_users`, and that
 * the invitation-code closure depended entirely on a single migration. This block
 * pins the seal migration so neither can silently regress.
 */
const SEAL_MIGRATION = join(
  ROOT,
  "supabase/migrations/20261007000002_b0_seal_privilege_hardening.sql",
);

function sealSql(): string {
  return read(SEAL_MIGRATION)
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .replace(/\s+/g, " ");
}

describe("B0.7 · privilege hardening seal", () => {
  it("lives in supabase/migrations", () => {
    expect(existsSync(SEAL_MIGRATION)).toBe(true);
  });

  it("removes every anon grant from the legacy premium and admin tables", () => {
    const text = sealSql();
    expect(text).toContain("REVOKE ALL ON TABLE public.premium_users FROM anon");
    expect(text).toContain("REVOKE ALL ON TABLE public.admin_users FROM anon");
  });

  it("keeps authenticated on the four DML privileges and nothing more", () => {
    const text = sealSql();
    expect(text).toContain("REVOKE ALL ON TABLE public.premium_users FROM authenticated");
    expect(text).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.premium_users TO authenticated",
    );
    expect(text).toContain("REVOKE ALL ON TABLE public.admin_users FROM authenticated");
    expect(text).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_users TO authenticated",
    );
  });

  it("closes the enumeration leak even without the earlier migration", () => {
    const text = sealSql();
    expect(text).toContain(
      'DROP POLICY IF EXISTS "Anyone can read active codes for validation" ON public.invitation_codes',
    );
    expect(text).toContain("REVOKE ALL ON TABLE public.invitation_codes FROM anon");
  });

  it("creates no permissive policy on any hardened table", () => {
    const created = sealSql().match(/CREATE POLICY[^;]*;/gi) ?? [];
    expect(created).toHaveLength(0);
  });

  it("grants nothing at all to anon", () => {
    const grants = sealSql().match(/GRANT[^;]*TO anon[^;]*;/gi) ?? [];
    expect(grants).toHaveLength(0);
  });

  it("removes the anonymous EXECUTE surface on the invitation-code generator", () => {
    const text = sealSql();
    expect(text).toContain("REVOKE ALL ON FUNCTION public.generate_invitation_code() FROM anon");
    expect(text).toContain("REVOKE ALL ON FUNCTION public.generate_invitation_code() FROM PUBLIC");
    expect(text).toContain(
      "GRANT EXECUTE ON FUNCTION public.generate_invitation_code() TO authenticated",
    );
    expect(text).toContain(
      "GRANT EXECUTE ON FUNCTION public.generate_invitation_code() TO service_role",
    );
  });
});
