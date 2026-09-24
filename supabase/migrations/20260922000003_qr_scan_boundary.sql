-- =============================================================================
-- CRIPQER — Intelligent Analytics V1.1 · Phase C2B4B
-- REAL QR SCAN BOUNDARY (validated in QA — production rollout via C2B7 gates)
-- =============================================================================
-- Task: CRIPQER_ANALYTICS_V1_1_PHASE_C2B4B_REAL_QR_SCAN_BOUNDARY
--
-- Lifecycle:
--   * Validated in the dedicated QA project (tjigzcyoogmvdkivypym).
--   * Production rollout requires the C2B7 gate sequence AND the deployed
--     production feature gate (global flag + page allowlist).
--   * Apply to production (mlinfiuhkxdhlveflbkj) only after the feature gate is
--     deployed/ready. Rollback/recovery is documented at the end of this file.
--
-- Truth rule: a `qr_scan` is emitted ONLY by the dedicated QR redirect path
-- (`/q/{public_id}`). A direct `/pg/{public_id}` visit is a `page_view`, never a
-- `qr_scan`. This migration extends the ONE canonical write boundary so it can
-- accept the `qr_scan` event type and persist its QR identity (`qr_id`).
--
--   * RPC signature gains `p_qr_id TEXT DEFAULT NULL`.
--   * `qr_scan` is admitted to the allowlist (server-side).
--   * For `qr_scan`, `source` is forced to 'qr' (never trusted from the browser).
--   * `qr_id` is stored into the existing `qr_analytics.qr_id` column.
--   * No new columns, no fingerprinting, no IP storage, no geography.
-- =============================================================================

-- Remove the previous 12-argument signature so the canonical write boundary has
-- exactly ONE overload (the 13-argument one below).
DROP FUNCTION IF EXISTS public.track_analytics_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_public_id TEXT,
  p_event_type TEXT,
  p_session_id TEXT DEFAULT NULL,
  p_target_url TEXT DEFAULT NULL,
  p_item_id TEXT DEFAULT NULL,
  p_item_label TEXT DEFAULT NULL,
  p_qr_id TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page_id UUID;
  v_profile_id UUID;
  v_platform TEXT;
  v_device_type TEXT;
  v_source TEXT;
  v_event_id UUID;
BEGIN
  -- 1) Allowlisted canonical event types only. lead_created / share /
  --    return_visit / legacy "view" / "link_click" are intentionally rejected.
  IF p_event_type NOT IN (
    'qr_scan',
    'session_start',
    'page_view',
    'cta_click',
    'whatsapp_click',
    'instagram_click',
    'facebook_click',
    'tiktok_click',
    'youtube_click',
    'linkedin_click',
    'external_link_click'
  ) THEN
    RETURN NULL;
  END IF;

  -- 2) Derive canonical page/profile from the public identity. The browser is
  --    never trusted with owner_user_id / profile_id / page_id. Only published
  --    pages with a published document are eligible.
  SELECT p.id, p.profile_id
    INTO v_page_id, v_profile_id
    FROM public.pages AS p
   WHERE p.public_id = p_public_id
     AND p.published = TRUE
     AND p.published_template_config IS NOT NULL
   LIMIT 1;

  IF v_page_id IS NULL OR v_profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 3) Normalize platform deterministically from the event type (never from
  --    arbitrary browser input). external_link_click stays NULL by design.
  v_platform := CASE p_event_type
    WHEN 'whatsapp_click' THEN 'whatsapp'
    WHEN 'instagram_click' THEN 'instagram'
    WHEN 'facebook_click' THEN 'facebook'
    WHEN 'tiktok_click' THEN 'tiktok'
    WHEN 'youtube_click' THEN 'youtube'
    WHEN 'linkedin_click' THEN 'linkedin'
    ELSE NULL
  END;

  -- 4) session_start deduplication: at most once per analytics session.
  IF p_event_type = 'session_start' AND p_session_id IS NOT NULL THEN
    PERFORM 1
      FROM public.qr_analytics
     WHERE event_type = 'session_start'
       AND session_id = p_session_id
     LIMIT 1;
    IF FOUND THEN
      RETURN NULL;
    END IF;
  END IF;

  -- 5) Normalize the coarse device category against the existing CHECK
  --    contract. The browser helper already classifies deterministically from
  --    the user-agent; this is a server-side backstop that refuses any value
  --    outside the fixed allowlist (and stores NULL rather than inventing).
  v_device_type := CASE
    WHEN p_device_type IN ('mobile', 'desktop', 'tablet', 'unknown') THEN p_device_type
    ELSE NULL
  END;

  -- 6) A QR scan's source is always 'qr' (truthful boundary), never the
  --    arbitrary p_source supplied by the browser.
  v_source := CASE
    WHEN p_event_type = 'qr_scan' THEN 'qr'
    ELSE left(p_source, 128)
  END;

  -- 7) Insert the bounded, validated event.
  INSERT INTO public.qr_analytics (
    profile_id,
    page_id,
    event_type,
    platform,
    target_url,
    item_id,
    item_label,
    qr_id,
    session_id,
    source,
    utm_source,
    utm_campaign,
    user_agent,
    device_type,
    referrer
  )
  VALUES (
    v_profile_id,
    v_page_id,
    p_event_type,
    v_platform,
    left(p_target_url, 2048),
    left(p_item_id, 256),
    left(p_item_label, 512),
    left(p_qr_id, 256),
    left(p_session_id, 256),
    v_source,
    left(p_utm_source, 256),
    left(p_utm_campaign, 256),
    left(p_user_agent, 512),
    v_device_type,
    left(p_referrer, 2048)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.track_analytics_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_analytics_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
