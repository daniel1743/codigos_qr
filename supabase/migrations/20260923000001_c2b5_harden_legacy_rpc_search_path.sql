-- =============================================================================
-- CRIPQER — Intelligent Analytics V1.1 · Phase C2B5
-- LEGACY WRITE RPC SEARCH_PATH HARDENING (QA-ONLY — DO NOT APPLY TO PRODUCTION)
-- =============================================================================
-- Task: CRIPQER_ANALYTICS_V1_1_PHASE_C2B5_SECURITY_AND_PRODUCTION_READINESS
--
-- Target database: cripqer-qa (project ref tjigzcyoogmvdkivypym) ONLY.
--
-- ⚠️  NEVER run this file against production project mlinfiuhkxdhlveflbkj.
--
-- Finding (C2B5 forensics):
--   `track_page_view` and `track_link_click` are SECURITY DEFINER functions that
--   (a) do NOT pin a safe `search_path` and (b) reference `qr_analytics` without
--   schema qualification. A SECURITY DEFINER function without `SET search_path`
--   executes with the caller's search_path, which is a documented hijack vector.
--
-- Hardening (this migration):
--   * Pin `SET search_path = public` on both legacy write RPCs.
--   * Fully qualify the target table (`public.qr_analytics`) so the INSERT can
--     never be redirected to a shadow table.
--   * Preserve the exact argument lists and the existing anon/authenticated/
--     service_role EXECUTE grants — this is a compatibility-only change. No
--     signature change, no behavior change, no data change.
--
-- Note (documented, NOT changed in C2B5):
--   These legacy RPCs still accept a caller-supplied `p_profile_id` (the old
--   profile-level QR tracking contract). This is a pre-existing abuse vector
--   (fabricated analytics injection), not a read exposure. It is out of scope
--   for C2B5 because no active src callers remain and changing it would break
--   the legacy profile-tracking contract. Tracked as open non-blocking debt.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) track_page_view — pin search_path + fully qualify the insert target.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_page_view(
  p_profile_id uuid,
  p_country text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text,
  p_latitude numeric DEFAULT NULL::numeric,
  p_longitude numeric DEFAULT NULL::numeric,
  p_user_agent text DEFAULT NULL::text,
  p_device_type text DEFAULT 'unknown'::text,
  p_browser text DEFAULT NULL::text,
  p_os text DEFAULT NULL::text,
  p_referrer text DEFAULT NULL::text,
  p_session_id text DEFAULT NULL::text,
  p_ip_hash text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  INSERT INTO public.qr_analytics (
    profile_id,
    event_type,
    country,
    city,
    latitude,
    longitude,
    user_agent,
    device_type,
    browser,
    os,
    referrer,
    session_id,
    ip_hash
  )
  VALUES (
    p_profile_id,
    'view',
    p_country,
    p_city,
    p_latitude,
    p_longitude,
    p_user_agent,
    p_device_type,
    p_browser,
    p_os,
    p_referrer,
    p_session_id,
    p_ip_hash
  )
  RETURNING id INTO v_analytics_id;

  RETURN v_analytics_id;
END;
$$;

-- Preserve the exact pre-existing grants (compatibility-only).
REVOKE ALL ON FUNCTION public.track_page_view(uuid, text, text, numeric, numeric, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_page_view(uuid, text, text, numeric, numeric, text, text, text, text, text, text, text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) track_link_click — pin search_path + fully qualify the insert target.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_link_click(
  p_profile_id uuid,
  p_link_id uuid,
  p_country text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text,
  p_latitude numeric DEFAULT NULL::numeric,
  p_longitude numeric DEFAULT NULL::numeric,
  p_user_agent text DEFAULT NULL::text,
  p_device_type text DEFAULT 'unknown'::text,
  p_browser text DEFAULT NULL::text,
  p_os text DEFAULT NULL::text,
  p_referrer text DEFAULT NULL::text,
  p_session_id text DEFAULT NULL::text,
  p_ip_hash text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  INSERT INTO public.qr_analytics (
    profile_id,
    event_type,
    link_id,
    country,
    city,
    latitude,
    longitude,
    user_agent,
    device_type,
    browser,
    os,
    referrer,
    session_id,
    ip_hash
  )
  VALUES (
    p_profile_id,
    'link_click',
    p_link_id,
    p_country,
    p_city,
    p_latitude,
    p_longitude,
    p_user_agent,
    p_device_type,
    p_browser,
    p_os,
    p_referrer,
    p_session_id,
    p_ip_hash
  )
  RETURNING id INTO v_analytics_id;

  RETURN v_analytics_id;
END;
$$;

-- Preserve the exact pre-existing grants (compatibility-only).
REVOKE ALL ON FUNCTION public.track_link_click(uuid, uuid, text, text, numeric, numeric, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_link_click(uuid, uuid, text, text, numeric, numeric, text, text, text, text, text, text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- ROLLBACK / RECOVERY (restore the pre-C2B5 definitions — only if the hardened
-- definitions must be reverted; data is never touched by this migration):
--
--   CREATE OR REPLACE FUNCTION public.track_page_view(...)  -- original body
--     LANGUAGE plpgsql SECURITY DEFINER;  -- without SET search_path
--   CREATE OR REPLACE FUNCTION public.track_link_click(...)  -- original body
--     LANGUAGE plpgsql SECURITY DEFINER;
-- =============================================================================
