-- =============================================================================
-- CRIPQER — Intelligent Analytics V1.1 · Phase C2A · SHADOW VERIFICATION SQL
-- =============================================================================
-- Validates the additive migration
--   supabase/migrations/20260922000000_analytics_v1_1_event_context.sql
-- against a DISPOSABLE / LOCAL / SHADOW database ONLY.
--
-- ⚠️  NEVER run this against remote production.
-- Schema assertions below are data-independent and run as service_role.
-- Row-level adapter behavior is covered by the deterministic TypeScript tests:
--   src/components/intelligent-analytics/analytics-v1-1-persistence-evolution.test.ts
-- =============================================================================

BEGIN;

-- 1. The four new columns exist, are NULLABLE and are text (no backfill).
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'qr_analytics'
    AND column_name IN ('source', 'utm_source', 'utm_campaign', 'qr_id')
    AND is_nullable = 'YES'
    AND data_type = 'text';

  IF v_count <> 4 THEN
    RAISE EXCEPTION 'C2A: expected 4 nullable text columns, found %', v_count;
  END IF;
END $$;

-- 2. The event_type constraint was widened to the canonical set while keeping
--    the legacy values valid.
DO $$
DECLARE
  v_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
  FROM pg_constraint
  WHERE conrelid = 'public.qr_analytics'::regclass
    AND conname = 'qr_analytics_event_type_check';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'C2A: qr_analytics_event_type_check missing';
  END IF;

  -- legacy preserved
  IF v_def NOT LIKE '%view%' OR v_def NOT LIKE '%link_click%' THEN
    RAISE EXCEPTION 'C2A: legacy event values not preserved in constraint: %', v_def;
  END IF;

  -- canonical future events admitted
  IF v_def NOT LIKE '%qr_scan%' OR v_def NOT LIKE '%lead_created%' OR v_def NOT LIKE '%page_view%' THEN
    RAISE EXCEPTION 'C2A: canonical event types not admitted in constraint: %', v_def;
  END IF;
END $$;

-- 3. session_id remains nullable (no new NOT NULL anywhere on the table).
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'qr_analytics'
    AND column_name = 'session_id'
    AND is_nullable = 'YES';

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'C2A: session_id is not nullable';
  END IF;
END $$;

-- 4. Constraint widening is a pure ADDITIVE change: the only destructive
--    statement is DROP CONSTRAINT IF EXISTS on the old event_type CHECK,
--    immediately re-added. No table/column drops present.
--    (Manual row-level tests are covered by the TypeScript adapter tests.)

ROLLBACK;

-- =============================================================================
-- MANUAL ROW-LEVEL SMOKE (run in a shadow DB with an existing profile_id,
-- then inspect results — do NOT commit against production):
--
--   -- legacy rows remain valid
--   INSERT INTO public.qr_analytics (profile_id, event_type)
--   VALUES ('<existing-profile-id>', 'view');
--
--   INSERT INTO public.qr_analytics (profile_id, event_type, link_id)
--   VALUES ('<existing-profile-id>', 'link_click', '<existing-link-id>');
--
--   -- enriched rows accepted, optional context NULL-safe
--   INSERT INTO public.qr_analytics (
--     profile_id, event_type, session_id, source, utm_source, utm_campaign, qr_id
--   ) VALUES (
--     '<existing-profile-id>', 'page_view', 'sess-1', 'qr', 'instagram', 'spring-2026', NULL
--   );
--
--   INSERT INTO public.qr_analytics (profile_id, event_type, qr_id)
--   VALUES ('<existing-profile-id>', 'qr_scan', 'qr-public-123');
--
--   -- canonical types must now be accepted; garbage must still be rejected
--   INSERT INTO public.qr_analytics (profile_id, event_type)
--   VALUES ('<existing-profile-id>', 'not_an_event');  -- must FAIL (check)
-- =============================================================================
