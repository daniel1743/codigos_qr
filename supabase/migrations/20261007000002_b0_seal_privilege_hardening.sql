-- CRIPQER · B0-SEAL — PRIVILEGE HARDENING FOR THE FOUNDATION TABLES
--
-- Context: the B0 re-audit (CRIPQER_BILLING_MERCADOPAGO_PAYPAL_REAUDIT_V2) found
-- residual gaps that B0 itself did not close:
--
--   H1  `premium_users` kept `GRANT ALL ... TO anon, authenticated` from the
--       legacy baseline (20260914000000:1715-1716). RLS blocks `anon` from
--       reading rows today, but the grant is a standing, excessive permission:
--       the day RLS is disabled or a permissive policy is added, it becomes an
--       escalation path. It was Vector 4 of the V1 audit and was never closed.
--   H3  `admin_users` carries the same `GRANT ALL` shape (:1671-1672).
--
-- This migration reduces those privileges to the minimum the product actually
-- uses, and defensively re-asserts the two invitation-code controls so that
-- applying THIS migration alone (even without 20261007000001) cannot leave the
-- code-enumeration leak open.
--
-- SCOPE: table privileges and one policy. No data is migrated, no table is
-- dropped, no application behaviour changes. Every statement is idempotent.
--
-- SAFE BY CONSTRUCTION:
--   · `REVOKE ALL` plus an explicit `GRANT` leaves `authenticated` with exactly
--     SELECT/INSERT/UPDATE/DELETE — what the admin panels use — and removes
--     TRUNCATE, REFERENCES and TRIGGER, which nothing uses.
--   · `anon` loses everything: no anonymous surface reads these tables.
--   · RLS is untouched, so it remains the enforcement point either way.
--   · Supabase runs a migration inside a transaction, so each revoke/grant pair
--     is atomic: there is no window in which an admin panel is locked out.

-- ============================================================================
-- 1. premium_users — drop the anon grant, minimise the authenticated grant
-- ============================================================================
--
-- The legacy table stays (B0 chose the temporary compatibility window, not
-- deletion), but it stops being reachable by an anonymous role and stops
-- carrying permissions the product never uses.

REVOKE ALL ON TABLE public.premium_users FROM anon;

REVOKE ALL ON TABLE public.premium_users FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.premium_users TO authenticated;

-- ============================================================================
-- 2. admin_users — same shape, same fix
-- ============================================================================

REVOKE ALL ON TABLE public.admin_users FROM anon;

REVOKE ALL ON TABLE public.admin_users FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_users TO authenticated;

-- ============================================================================
-- 3. invitation_codes — defensive re-assert (independent of 20261007000001)
-- ============================================================================
--
-- 20261007000001 already drops this policy and revokes `anon`. Repeating it here
-- is idempotent and guarantees that applying THIS migration alone closes the
-- enumeration leak — the most severe finding of the V1 audit — even if the
-- earlier migration has not been applied yet.
--
-- No replacement policy is created: the browser must never read this table.

DROP POLICY IF EXISTS "Anyone can read active codes for validation" ON public.invitation_codes;

REVOKE ALL ON TABLE public.invitation_codes FROM anon;

REVOKE ALL ON TABLE public.invitation_codes FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invitation_codes TO authenticated;

-- ============================================================================
-- 4. generate_invitation_code() — remove the anonymous EXECUTE surface
-- ============================================================================
--
-- `public.generate_invitation_code()` (baseline :179) is a pure generator:
-- it returns a fresh code string and writes nothing. The baseline nonetheless
-- left it at `GRANT ALL ... TO anon, authenticated, service_role` (:1593-1595),
-- an excessive standing privilege: an anonymous caller can invoke it. The only
-- consumer is the admin panel (`src/components/admin/InvitationCodesPanel.tsx`),
-- which runs as `authenticated`, so `authenticated` keeps EXECUTE while `anon`
-- and PUBLIC lose it.
--
-- No replacement function is created: this is a privilege change only.

REVOKE ALL ON FUNCTION public.generate_invitation_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_invitation_code() FROM anon;
REVOKE ALL ON FUNCTION public.generate_invitation_code() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invitation_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invitation_code() TO service_role;

-- ============================================================================
-- 5. POST-CONDITION REPORT (no data change; makes the seal auditable)
-- ============================================================================

DO $$
DECLARE
  v_legacy_anon_redeem boolean;
BEGIN
  -- The dangerous function is dropped by 20261007000001. If it is still present
  -- after both migrations, the operator must know: it is executable by `anon`
  -- and takes the beneficiary identity as a parameter.
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'redeem_invitation_code'
  ) INTO v_legacy_anon_redeem;

  IF v_legacy_anon_redeem THEN
    RAISE WARNING 'B0-SEAL: legacy redeem_invitation_code(...) still exists. Apply 20261007000001_b0_billing_foundation_and_security.sql to remove it.';
  ELSE
    RAISE NOTICE 'B0-SEAL: enumeration policy gone, legacy redeem absent, privileges hardened.';
  END IF;
END $$;

-- ============================================================================
-- 6. END OF SEAL
-- ============================================================================
--
-- After this migration plus 20261007000001, B0 is closed at the database level:
--   · invitation codes cannot be listed by any browser role;
--   · redemption is server-only, atomic and non-revealing;
--   · `billing_grants` is service_role-only with RLS and no browser policy;
--   · `generate_invitation_code()` keeps EXECUTE only for `authenticated` and
--     `service_role`;
--   · `premium_users` and `admin_users` grant nothing to `anon` and only the
--     four DML privileges to `authenticated`.
