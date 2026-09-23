-- =============================================================================
-- CRIPQER — Intelligent Analytics V1.1 · Phase C2B2
-- CANONICAL ANALYTICS WRITE BOUNDARY (QA-ONLY — DO NOT APPLY TO PRODUCTION)
-- =============================================================================
-- Task: CRIPQER_ANALYTICS_V1_1_PHASE_C2B2_SINGLE_QA_PAGE_CANONICAL_EVENT_WRITES
--
-- Target database: cripqer-qa (project ref tjigzcyoogmvdkivypym) ONLY.
--
-- ⚠️  NEVER run this file against production project mlinfiuhkxdhlveflbkj.
-- ⚠️  This creates the ONE canonical Analytics V1.1 write boundary and adds a
--     normalized `platform` column. It is strictly additive.
--
-- Security model:
--   * The browser NEVER passes owner/profile/page identity.
--   * The RPC derives page_id + profile_id from the canonical public identity
--     (public_id) and only for PUBLISHED pages with a published document.
--   * event_type is validated against a fixed allowlist (qr_scan is NOT
--     accepted in this phase).
--   * platform is normalized deterministically from event_type (server-side).
--   * session_start is deduplicated server-side per session_id.
--   * All free-form metadata is bounded by length.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Normalized platform column (additive; legacy rows stay NULL).
-- ---------------------------------------------------------------------------
ALTER TABLE public.qr_analytics
  ADD COLUMN IF NOT EXISTS platform TEXT;

COMMENT ON COLUMN public.qr_analytics.platform IS
  'Normalized destination platform written by the canonical V1.1 write boundary (whatsapp, instagram, facebook, tiktok, youtube, linkedin). NULL for page/session/CTA/external-link events and all legacy rows.';

-- ---------------------------------------------------------------------------
-- 2) The ONE canonical Analytics V1.1 write boundary.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_public_id TEXT,
  p_event_type TEXT,
  p_session_id TEXT DEFAULT NULL,
  p_target_url TEXT DEFAULT NULL,
  p_item_id TEXT DEFAULT NULL,
  p_item_label TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
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
  v_event_id UUID;
BEGIN
  -- 1) Allowlisted canonical event types only. qr_scan / lead_created / share /
  --    return_visit / legacy "view" / "link_click" are intentionally rejected.
  IF p_event_type NOT IN (
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

  -- 5) Insert the bounded, validated event.
  INSERT INTO public.qr_analytics (
    profile_id,
    page_id,
    event_type,
    platform,
    target_url,
    item_id,
    item_label,
    session_id,
    source,
    utm_source,
    utm_campaign,
    user_agent,
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
    left(p_session_id, 256),
    left(p_source, 128),
    left(p_utm_source, 256),
    left(p_utm_campaign, 256),
    left(p_user_agent, 512),
    left(p_referrer, 2048)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.track_analytics_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_analytics_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
