-- =============================================================================
-- CRIPQER — SECURE FIRST-PAGE CREATION BOUNDARY (V1)
-- -----------------------------------------------------------------------------
-- Product contract: an authenticated owner with NO canonical page yet may
-- create EXACTLY ONE initial landing page, server-side controlled.
--
-- This migration does NOT restore `owner_insert_page` and does NOT widen any
-- existing policy: general INSERT into public.pages stays restricted to
-- `admin_users` (see 20260930000001_restrict_page_creation_to_admins.sql).
-- The only new capability is the narrow function below.
--
-- Enforced here (server-side, not by the client):
--   * auth.uid() must exist
--   * owner_user_id = auth.uid()
--   * page_type = 'landing' (the caller cannot choose it)
--   * published = false (draft only)
--   * the caller must not already own a canonical (non-catalog) page
--   * concurrent attempts for the same user are serialized
--
-- A `catalog` row is an EXTENSION of a landing and never counts as the landing
-- itself — the same rule as `selectLandingPage` in
-- src/lib/editor-routing/resolveCanonicalMagicPage.ts.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_initial_landing_page()
RETURNS public.pages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile_id uuid;
  v_title text;
  v_page public.pages;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED'
      USING MESSAGE = 'Debes iniciar sesión para crear tu página.';
  END IF;

  -- Serialize concurrent attempts for the same owner so the one-initial-page
  -- rule cannot be bypassed by two parallel requests.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_uid::text)::bigint);

  IF EXISTS (
    SELECT 1
    FROM public.pages AS p
    WHERE p.owner_user_id = v_uid
      AND COALESCE(p.page_type, '') <> 'catalog'
  ) THEN
    RAISE EXCEPTION 'INITIAL_PAGE_ALREADY_EXISTS'
      USING MESSAGE = 'Ya tienes una página. Ábrela para editarla.';
  END IF;

  SELECT pr.id, pr.display_name
    INTO v_profile_id, v_title
  FROM public.profiles AS pr
  WHERE pr.user_id = v_uid
  ORDER BY pr.created_at ASC
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'PROFILE_REQUIRED'
      USING MESSAGE = 'Necesitas un perfil para crear tu página.';
  END IF;

  INSERT INTO public.pages (
    owner_user_id,
    profile_id,
    title,
    page_type,
    template_config,
    published_template_config,
    published,
    published_revision,
    published_at,
    slug
  )
  VALUES (
    v_uid,
    v_profile_id,
    COALESCE(NULLIF(btrim(v_title), ''), 'Mi página'),
    'landing',
    NULL,
    NULL,
    false,
    0,
    NULL,
    NULL
  )
  RETURNING * INTO v_page;

  RETURN v_page;
END;
$$;

COMMENT ON FUNCTION public.create_initial_landing_page() IS
  'Creates the caller''s ONE initial landing page. Enforces auth.uid() ownership, page_type = landing, draft-only state and the one-canonical-page rule. General pages INSERT remains admin-only.';

REVOKE ALL ON FUNCTION public.create_initial_landing_page() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_initial_landing_page() TO authenticated;
