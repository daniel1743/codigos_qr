-- =============================================================================
-- ADD SAFE PUBLIC RPC FOR PUBLISHED CHILD PAGES BY CUSTOM ALIAS
-- -----------------------------------------------------------------------------
-- PAGES_6 — per-page custom alias. Exposes one published child Page by its
-- optional `slug` to unauthenticated visitors, returning ONLY the public
-- rendering contract (same projection as get_public_page_by_public_id).
--
-- Global alias uniqueness is already enforced by the existing partial unique
-- index `idx_pages_slug_unique ON pages(slug) WHERE slug IS NOT NULL`, so no
-- new constraint is required here — this migration only adds the read RPC.
--
-- Security model (identical to the public_id RPC):
--   * SECURITY DEFINER (narrow projection; table RLS untouched)
--   * LANGUAGE sql, STABLE, search_path = ''
--   * fully-qualified public.pages, read-only SELECT, LIMIT 1
--   * REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO anon, authenticated
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_public_page_by_slug(
  p_slug TEXT
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
  WHERE p.slug = p_slug
    AND p.published = TRUE
    AND p.published_template_config IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL
  ON FUNCTION public.get_public_page_by_slug(TEXT)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.get_public_page_by_slug(TEXT)
  TO anon;

GRANT EXECUTE
  ON FUNCTION public.get_public_page_by_slug(TEXT)
  TO authenticated;
