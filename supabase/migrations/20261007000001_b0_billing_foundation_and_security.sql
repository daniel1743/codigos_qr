-- CRIPQER · B0 — BILLING FOUNDATION & SECURITY
--
-- Context: the billing audit (CRIPQER_BILLING_MERCADOPAGO_PAYPAL_AUDIT_V1) found
-- that `invitation_codes` was readable by ANY client and that a SECURITY DEFINER
-- redeem function was executable by `anon` while taking the beneficiary identity
-- as a parameter. This migration closes both, and introduces the canonical grant
-- source the entitlement resolver needs so that Free/Pro stops being decided by
-- the browser.
--
-- SCOPE: security + data model only. No provider is integrated here, no price is
-- invented, no existing row is migrated (see the B0 close-out report for the
-- premium_users decision and its not-yet-applied backfill).
--
-- Everything is idempotent and fail-safe: every DROP is guarded, the hardcoded
-- e-mail policies are retired ONLY IF the explicit promotion below succeeded, and
-- no statement can leave a user locked out of the admin surface.

-- ============================================================================
-- 1. RETIRE THE HARDCODED-E-MAIL ESCAPE HATCHES (fail-safe)
-- ============================================================================
--
-- Four policies keyed on a literal e-mail address created an invisible,
-- permanent authorization exception living in SQL. They are replaced by an
-- explicit, visible `admin_users` row.
--
-- FAIL-SAFE ORDER: the promotion runs FIRST, and the policies are dropped only
-- when the promotion is verified to have taken effect. If the owner's auth user
-- does not exist yet, or the insert fails, the policies remain and nothing
-- breaks.

DO $$
DECLARE
  v_owner_email text := 'falcondaniel37@gmail.com';
  v_promoted    boolean := false;
BEGIN
  -- Explicit, data-backed promotion. Idempotent: it is a no-op when the owner
  -- already has an admin row.
  INSERT INTO public.admin_users (user_id, email, role)
  SELECT u.id, u.email, 'super_admin'
  FROM auth.users u
  WHERE lower(u.email) = v_owner_email
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_users a WHERE a.user_id = u.id
    );

  -- A second, independent promotion path: an admin row may already exist with a
  -- lower role. Upgrade it rather than tolerate a half-promoted owner.
  UPDATE public.admin_users a
  SET role = 'super_admin'
  WHERE lower(a.email) = v_owner_email
    AND a.role <> 'super_admin';

  SELECT EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE lower(a.email) = v_owner_email AND a.role = 'super_admin'
  ) INTO v_promoted;

  IF v_promoted THEN
    DROP POLICY IF EXISTS "Owner email can manage demo logos"      ON public.demo_logos;
    DROP POLICY IF EXISTS "Owner email can manage invitation codes" ON public.invitation_codes;
    DROP POLICY IF EXISTS "Owner email can manage premium users"    ON public.premium_users;
    DROP POLICY IF EXISTS "Owner email can read admin users"        ON public.admin_users;
    RAISE NOTICE 'B0: owner promoted to super_admin; hardcoded-email policies retired.';
  ELSE
    RAISE NOTICE 'B0: owner could not be promoted; hardcoded-email policies LEFT IN PLACE (fail-safe).';
  END IF;
END $$;

-- ============================================================================
-- 2. CLOSE THE ENUMERATION LEAK ON invitation_codes
-- ============================================================================
--
-- The policy below was created as:
--
--   CREATE POLICY "Anyone can read active codes for validation"
--     ON public.invitation_codes FOR SELECT USING ((is_active = true));
--
-- It carries NO `TO` clause, so it applies to every role — `anon` included. Its
-- name says "for validation", but `USING (is_active = true)` grants a full
-- listing of the table, not the validation of one code. That is the leak.
--
-- There is no replacement policy, and there must not be one: the client never
-- needs to read this table. Validation and redemption are now a single
-- server-side, service-role-only operation (§5).

DROP POLICY IF EXISTS "Anyone can read active codes for validation" ON public.invitation_codes;

-- `anon` has no business touching this table in any way.
REVOKE ALL ON TABLE public.invitation_codes FROM anon;

-- `authenticated` KEEPS its privileges on purpose: InvitationCodesPanel manages
-- codes from the browser. Every row that role can reach is still gated by the
-- admin policies that already exist ("Admin can read/insert/update invitation
-- codes", which require an `admin_users` membership), so a normal authenticated
-- user resolves to zero rows. The grant is the privilege to *attempt* the
-- query; RLS remains the enforcement point.

-- ============================================================================
-- 3. REMOVE THE UNSAFE LEGACY REDEEM FUNCTIONS
-- ============================================================================
--
-- `redeem_invitation_code(p_code, p_user_id, p_email)` had three defects:
--   · SECURITY DEFINER, and granted to `anon` — an unauthenticated caller could
--     invoke it;
--   · it took the BENEFICIARY IDENTITY AS A PARAMETER, so a caller could name
--     any user id and grant Premium to somebody else;
--   · its usage UPDATE had no SET clause at all:
--         UPDATE invitation_codes WHERE id = v_invitation.id;
--     which is not valid SQL, so `max_uses` was never enforced on this path.
--
-- `redeem_invitation_code_secure` was better shaped (it read `auth.uid()`), but
-- it lacked `SET search_path` on a SECURITY DEFINER function and its result
-- echoed the tier back to the caller. Both are superseded by §5.

DROP FUNCTION IF EXISTS public.redeem_invitation_code(text, uuid, text);
DROP FUNCTION IF EXISTS public.redeem_invitation_code_secure(text);

-- ============================================================================
-- 4. CANONICAL GRANT SOURCE — public.billing_grants
-- ============================================================================
--
-- Paid subscriptions live in `billing_subscriptions`. Grants did not live
-- anywhere canonical: they were written into `premium_users`, which the browser
-- read directly and which the entitlement resolver never consulted. That is why
-- two systems could disagree about the same user.
--
-- `billing_grants` is the canonical home for every NON-subscription way of
-- getting paid access: an invitation code, an admin grant, a promotion, or a
-- legacy `premium_users` row during the compatibility window.
--
-- Deliberate design points:
--   · `plan_id` reuses the canonical vocabulary (pro|business|enterprise). The
--     legacy `premium`/`premium_pro` tiers map onto it — never the reverse.
--   · `expires_at IS NULL` means a permanent grant. That is a legitimate state,
--     not a missing value.
--   · `revoked_at` is a soft revoke: history is preserved, and a revoked grant
--     simply stops counting.
--   · Access mirrors the billing_* tables exactly: RLS on, no browser policy,
--     service_role only.

CREATE TABLE IF NOT EXISTS public.billing_grants (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id            text NOT NULL
                       CHECK (plan_id IN ('pro', 'business', 'enterprise')),
    grant_source       text NOT NULL
                       CHECK (grant_source IN ('invitation', 'admin', 'promotion', 'legacy_premium')),
    expires_at         timestamptz,
    revoked_at         timestamptz,
    granted_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    invitation_code_id uuid REFERENCES public.invitation_codes(id) ON DELETE SET NULL,
    note               text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.billing_grants IS
  'Canonical non-subscription source of paid access (invitation, admin, promotion, legacy). Read only by the entitlement resolver.';
COMMENT ON COLUMN public.billing_grants.expires_at IS
  'NULL means a permanent grant. A non-null past timestamp makes the grant inert without deleting it.';

-- One grant per (user, invitation code). A multi-use code may still be redeemed
-- by many DIFFERENT users; it can never be redeemed twice by the same one.
CREATE UNIQUE INDEX IF NOT EXISTS billing_grants_user_invitation_unique
  ON public.billing_grants (user_id, invitation_code_id)
  WHERE invitation_code_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS billing_grants_user_id_idx
  ON public.billing_grants (user_id);

-- Only unrevoked grants matter when resolving; this keeps that lookup cheap.
CREATE INDEX IF NOT EXISTS billing_grants_active_idx
  ON public.billing_grants (user_id, expires_at)
  WHERE revoked_at IS NULL;

DROP TRIGGER IF EXISTS set_billing_grants_updated_at ON public.billing_grants;
CREATE TRIGGER set_billing_grants_updated_at
  BEFORE UPDATE ON public.billing_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Access model — identical to the other billing tables. A browser role cannot
-- read, write or probe this table even with the anon key.
ALTER TABLE public.billing_grants ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.billing_grants FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.billing_grants TO service_role;

-- ============================================================================
-- 4b. THE E-MAIL ALLOWLIST BECOMES AN EXPLICIT GRANT (B0.4)
-- ============================================================================
--
-- `src/lib/entitlements.ts` held a hardcoded client-side allowlist
-- (`PREMIUM_DEV_EMAILS`) that granted Premium to one address from inside the
-- browser. That module has been DELETED: an authorization decision cannot live
-- in a client bundle, where it is invisible, unauditable and impossible to
-- revoke without a deploy.
--
-- Deleting it must not revoke access from whoever was on the list. So the
-- exception is CONVERTED rather than removed: the same users become an ordinary,
-- visible, revocable `admin` grant in the canonical table — the same mechanism
-- any future comped account will use.
--
-- Idempotent: a second run inserts nothing.

DO $$
DECLARE
  v_granted integer := 0;
BEGIN
  WITH target AS (
    SELECT u.id AS user_id
    FROM auth.users u
    WHERE lower(u.email) = 'falcondaniel37@gmail.com'
  ),
  inserted AS (
    INSERT INTO public.billing_grants (user_id, plan_id, grant_source, note)
    SELECT t.user_id, 'pro', 'admin',
           'Migrated from the retired PREMIUM_DEV_EMAILS client allowlist (B0.4).'
    FROM target t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.billing_grants g
      WHERE g.user_id = t.user_id AND g.grant_source = 'admin'
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_granted FROM inserted;

  IF v_granted > 0 THEN
    RAISE NOTICE 'B0: converted % allowlisted user(s) into explicit admin grants.', v_granted;
  ELSE
    RAISE NOTICE 'B0: no allowlisted user to convert (already granted, or user does not exist yet).';
  END IF;
END $$;

-- ============================================================================
-- 5. THE ONE SECURE REDEEM PATH — public.redeem_invitation_code_v1
-- ============================================================================
--
-- Contract:
--   · SERVER-ONLY. EXECUTE is granted to `service_role` and revoked from
--     PUBLIC/anon/authenticated, so the browser cannot call it at all. The
--     trusted identity is resolved server-side by `requireBillingUser()` and
--     passed in; the browser never supplies it.
--   · ATOMIC. The code row is locked `FOR UPDATE`, so two concurrent redemptions
--     of the same code serialise and `max_uses` cannot be exceeded by a race.
--   · NON-REVEALING. Unknown, inactive, expired and exhausted codes all return
--     the SAME `INVALID` reason. A caller cannot use the response to discover
--     which codes exist — which is what makes the §2 policy removal safe.
--   · IDEMPOTENT PER USER. A user can never hold two grants from the same code.
--   · NO CODE ECHOED. The response never repeats the code back.
--
-- `SET search_path = public` is mandatory on a SECURITY DEFINER function: without
-- it, a caller-controlled search_path can hijack the objects the function
-- resolves. The same hardening was applied to other legacy RPCs in
-- 20260923000001_c2b5_harden_legacy_rpc_search_path.sql.

CREATE OR REPLACE FUNCTION public.redeem_invitation_code_v1(
  p_user_id uuid,
  p_code    text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation invitation_codes%ROWTYPE;
  v_expires_at timestamptz;
  v_plan_id    text;
  v_grant_id   uuid;
BEGIN
  -- The identity is server-supplied. A missing one is a programming error on the
  -- host side, never a caller-supplied value.
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID');
  END IF;

  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID');
  END IF;

  -- Atomic claim. The row lock is what makes concurrent redemption safe.
  SELECT *
    INTO v_invitation
    FROM invitation_codes
   WHERE upper(btrim(code)) = upper(btrim(p_code))
     AND is_active = true
     FOR UPDATE;

  -- One identical answer for every failure mode. Do not split these branches
  -- into distinct messages: the difference is exactly what a code-guessing
  -- caller would use to learn which codes are real.
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID');
  END IF;

  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID');
  END IF;

  IF v_invitation.current_uses >= v_invitation.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID');
  END IF;

  -- Per-user idempotency. Only reachable for a code with uses left, so it can
  -- never be used to probe an exhausted code.
  IF EXISTS (
    SELECT 1 FROM billing_grants g
     WHERE g.user_id = p_user_id
       AND g.invitation_code_id = v_invitation.id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_REDEEMED');
  END IF;

  -- Legacy tiers map ONTO the canonical vocabulary, never the other way round.
  v_plan_id := CASE
    WHEN v_invitation.tier = 'premium_pro' THEN 'business'
    ELSE 'pro'
  END;

  v_expires_at := CASE
    WHEN v_invitation.duration_days IS NULL THEN NULL  -- permanent
    ELSE now() + make_interval(days => v_invitation.duration_days)
  END;

  INSERT INTO public.billing_grants (
    user_id, plan_id, grant_source, expires_at, invitation_code_id
  )
  VALUES (
    p_user_id, v_plan_id, 'invitation', v_expires_at, v_invitation.id
  )
  RETURNING id INTO v_grant_id;

  -- The counter was never incremented by the legacy function; it is now.
  UPDATE public.invitation_codes
     SET current_uses = current_uses + 1
   WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'ok', true,
    'grant_id', v_grant_id,
    'plan_id', v_plan_id,
    'expires_at', v_expires_at
  );
END;
$$;

COMMENT ON FUNCTION public.redeem_invitation_code_v1(uuid, text) IS
  'Server-only, atomic, non-revealing invitation redemption. Writes billing_grants.';

-- Service-role only. This is the whole point: no browser role can reach it.
REVOKE ALL ON FUNCTION public.redeem_invitation_code_v1(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_invitation_code_v1(uuid, text) TO service_role;

-- ============================================================================
-- 6. RESOLVER READ PATH
-- ============================================================================
--
-- The entitlement resolver reads grants through the privileged client, so no
-- additional privilege is needed here. This index-free grant is declared for
-- symmetry with the rest of the billing schema and costs nothing.

GRANT SELECT ON TABLE public.billing_grants TO service_role;
