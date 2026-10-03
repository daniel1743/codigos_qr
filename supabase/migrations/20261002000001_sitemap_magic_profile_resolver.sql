-- Share the exact published Magic page eligibility and ordering used by the
-- legacy profile bridge with sitemap generation.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.get_canonical_published_magic_page_for_profile(
  p_profile_id UUID
)
RETURNS TABLE (
  profile_id UUID,
  page_public_id TEXT,
  page_slug TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    page.profile_id,
    page.public_id,
    page.slug
  FROM public.pages AS page
  WHERE page.profile_id = p_profile_id
    AND page.published = TRUE
    AND page.published_template_config IS NOT NULL
    AND page.published_template_config->>'documentType' = 'magic-page'
    AND page.published_template_config->>'version' = '1'
    AND page.published_template_config->'meta'->>'createdBy' = 'magic-editor'
    AND page.published_template_config->'meta'->>'schemaVersion' = '1'
  ORDER BY page.published_at DESC NULLS LAST, page.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.get_canonical_published_magic_page_for_profile(UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_published_magic_page_by_legacy_public_id(
  p_legacy_public_id TEXT
)
RETURNS TABLE (
  page_public_id TEXT,
  page_slug TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT canonical.page_public_id, canonical.page_slug
  FROM public.profiles AS profile
  CROSS JOIN LATERAL private.get_canonical_published_magic_page_for_profile(profile.id) AS canonical
  WHERE profile.public_id = p_legacy_public_id
    AND profile.published = TRUE;
$$;

REVOKE ALL ON FUNCTION public.get_published_magic_page_by_legacy_public_id(TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_magic_page_by_legacy_public_id(TEXT)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_sitemap_published_magic_page_mappings()
RETURNS TABLE (
  profile_public_id TEXT,
  page_public_id TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT profile.public_id, canonical.page_public_id
  FROM public.profiles AS profile
  CROSS JOIN LATERAL private.get_canonical_published_magic_page_for_profile(profile.id) AS canonical
  WHERE profile.published = TRUE
    AND profile.public_id IS NOT NULL
    AND canonical.page_public_id IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_sitemap_published_magic_page_mappings()
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sitemap_published_magic_page_mappings()
  TO anon;
