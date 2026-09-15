-- =============================================================================
-- CREATE SAFE PUBLIC RPC FOR PUBLISHED CHILD PAGES
-- -----------------------------------------------------------------------------
-- Exposes exactly one published child Page by public_id to unauthenticated
-- visitors, returning ONLY the public rendering contract. The underlying
-- public.pages table remains protected by owner-only RLS (no anon SELECT
-- policy is added).
--
-- Authoritative public.pages column types (captured from live catalog):
--   public_id                  : text
--   title                      : text
--   page_type                  : text
--   published_template_config  : jsonb
--   slug                       : text
--   published_at               : timestamp with time zone
--
-- Security model:
--   * SECURITY DEFINER (reads via a narrow projection; table RLS untouched)
--   * LANGUAGE sql, STABLE, search_path = ''
--   * fully-qualified public.pages, no dynamic SQL, read-only SELECT, LIMIT 1
--   * REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO anon, authenticated
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_public_page_by_public_id(
  p_public_id TEXT
)
RETURNS TABLE (
  public_id TEXT,
  title TEXT,
  page_type TEXT,
  published_template_config JSONB,
  slug TEXT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.public_id,
    p.title,
    p.page_type,
    p.published_template_config,
    p.slug,
    p.published_at
  FROM public.pages AS p
  WHERE p.public_id = p_public_id
    AND p.published = TRUE
    AND p.published_template_config IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL
  ON FUNCTION public.get_public_page_by_public_id(TEXT)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.get_public_page_by_public_id(TEXT)
  TO anon;

GRANT EXECUTE
  ON FUNCTION public.get_public_page_by_public_id(TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Post-create verification: SECURITY DEFINER owner must be the same role that
-- owns public.pages (table owners bypass RLS by default), so the RPC can read
-- the published row through owner-only RLS by design.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_owner       oid;
  v_pages_owner oid;
BEGIN
  SELECT p.proowner INTO v_owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'get_public_page_by_public_id'
     AND p.prokind = 'f';

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'public page RPC: function not found after creation';
  END IF;

  SELECT c.relowner INTO v_pages_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'pages';

  IF v_owner IS DISTINCT FROM v_pages_owner THEN
    RAISE EXCEPTION 'public page RPC: function owner (%) differs from public.pages owner (%)', v_owner, v_pages_owner;
  END IF;
END $$;
