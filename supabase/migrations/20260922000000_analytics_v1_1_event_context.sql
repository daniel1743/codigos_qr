-- =============================================================================
-- CRIPQER — Intelligent Analytics V1.1 · Phase C2A
-- ANALYTICS PERSISTENCE EVOLUTION (ADDITIVE ONLY — validated in QA, production via C2B7)
-- =============================================================================
-- Task: CRIPQER_ANALYTICS_V1_1_PHASE_C2A_PERSISTENCE_EVOLUTION_DRY_RUN
--
-- Strategy: Option C — Compatibility Projection + Incremental Evolution.
--   * qr_analytics remains the ONE canonical analytics store.
--   * This migration is STRICTLY ADDITIVE. No DROP TABLE / DROP COLUMN,
--     no rename of canonical columns, no historical rewrite, no fake backfill.
--   * Legacy rows ("view" / "link_click") remain valid and untouched.
--     NULL means unknown/unavailable; never infer fabricated values.
--
-- Lifecycle:
--   * Validated in the dedicated QA project (tjigzcyoogmvdkivypym).
--   * Production rollout requires the C2B7 gate sequence AND the deployed
--     production feature gate (global flag + page allowlist).
--   * Apply to production (mlinfiuhkxdhlveflbkj) only after the feature gate is
--     deployed/ready. Rollback/recovery is documented at the end of this file.
--
-- Compatibility notes:
--   * Existing RPC signatures are NOT changed:
--       - track_page_view(uuid, ...)
--       - track_link_click(uuid, uuid, ...)
--       - track_child_page_event(uuid, text, ...)
--     Existing callers keep working unchanged.
--   * No new production RPC is required in this phase.
--   * New columns are NULLABLE with no default → historical rows keep NULL.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Add nullable event-context columns (no backfill, default NULL).
--    Each column is justified by the C1 real-data gap matrix:
--      - source        → traffic attribution source (qr/direct/social/referral)
--      - utm_source    → UTM campaign source
--      - utm_campaign  → UTM campaign name
--      - qr_id         → QR entry identity for a future qr_scan write boundary
-- ---------------------------------------------------------------------------
ALTER TABLE public.qr_analytics
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS qr_id TEXT;

COMMENT ON COLUMN public.qr_analytics.source IS 'Traffic attribution source (e.g. qr, direct, social, referral). NULL = unknown.';
COMMENT ON COLUMN public.qr_analytics.utm_source IS 'UTM source parameter. NULL = unknown.';
COMMENT ON COLUMN public.qr_analytics.utm_campaign IS 'UTM campaign parameter. NULL = unknown.';
COMMENT ON COLUMN public.qr_analytics.qr_id IS 'QR entry identity recorded only by a QR-aware runtime point. page_view is NEVER assumed to be a qr_scan.';

-- ---------------------------------------------------------------------------
-- 2) Event type evolution — SAFE WIDENING, never a history rewrite.
--    Legacy values "view" and "link_click" remain valid. The read adapter
--    normalizes them; new canonical values may be written in a later phase.
-- ---------------------------------------------------------------------------
ALTER TABLE public.qr_analytics
  DROP CONSTRAINT IF EXISTS qr_analytics_event_type_check;

ALTER TABLE public.qr_analytics
  ADD CONSTRAINT qr_analytics_event_type_check
  CHECK (event_type IN (
    -- legacy values (never rewritten)
    'view',
    'link_click',
    -- canonical V1.1 event types (future writes, later phase)
    'page_view',
    'smart_page_view',
    'qr_scan',
    'cta_click',
    'whatsapp_click',
    'instagram_click',
    'facebook_click',
    'tiktok_click',
    'youtube_click',
    'linkedin_click',
    'external_link_click',
    'lead_created',
    'share',
    'session_start',
    'return_visit'
  ));

-- ---------------------------------------------------------------------------
-- 3) Index strategy — NO new indexes in this phase.
--    The C1 bounded real-data query is (page_id, created_at DESC), already
--    served by idx_qr_analytics_page_date. Session/utm indexes are NOT added
--    until the columns actually receive writes in a later phase.
-- ---------------------------------------------------------------------------

-- =============================================================================
-- ROLLBACK / RECOVERY (commented — run ONLY in a controlled QA/shadow DB if
-- the additive migration must be reverted before C2B):
--
--   ALTER TABLE public.qr_analytics
--     DROP COLUMN IF EXISTS source,
--     DROP COLUMN IF EXISTS utm_source,
--     DROP COLUMN IF EXISTS utm_campaign,
--     DROP COLUMN IF EXISTS qr_id;
--
--   ALTER TABLE public.qr_analytics DROP CONSTRAINT IF EXISTS qr_analytics_event_type_check;
--   ALTER TABLE public.qr_analytics
--     ADD CONSTRAINT qr_analytics_event_type_check
--     CHECK (event_type IN ('view', 'link_click'));
--
-- NOTE: rollback drops columns, so it would lose any data written to the new
-- columns. It is only safe before C2B begins writing them.
-- =============================================================================
