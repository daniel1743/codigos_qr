-- =============================================================================
-- PAGES_7 — EXTEND CANONICAL PAGE TYPE CONTRACT (services / catalog / portfolio)
-- -----------------------------------------------------------------------------
-- The Page Generator creates real child Pages for the business experiences the
-- product roadmap requires: Servicios, Catálogo and Portafolio. Those three
-- purposes are semantically distinct from "landing" and will be needed by the
-- future Conversion Core, so they are represented honestly in the canonical
-- `pages.page_type` contract instead of being mislabeled as "landing".
--
-- Scope of this migration:
--   * ONLY the `page_type_check` CHECK constraint is replaced.
--   * The five existing types are preserved byte-for-byte.
--   * No column, index, RLS policy, RPC, function or table is touched.
--   * No existing row can become invalid: the new set is a strict superset.
-- =============================================================================

ALTER TABLE public.pages
  DROP CONSTRAINT IF EXISTS page_type_check;

ALTER TABLE public.pages
  ADD CONSTRAINT page_type_check
  CHECK (
    page_type = ANY (
      ARRAY[
        'landing'::text,
        'promotion'::text,
        'menu'::text,
        'campaign'::text,
        'event'::text,
        'services'::text,
        'catalog'::text,
        'portfolio'::text
      ]
    )
  );
