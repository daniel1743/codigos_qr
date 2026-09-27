-- CRIPQER_LEGACY_QR_IDENTITY_PRESERVATION_P0_V1
-- Resolve a historical profile QR to a published Magic child page without
-- exposing profile ownership, drafts, or any private page columns.

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
  SELECT
    page.public_id,
    page.slug
  FROM public.profiles AS profile
  INNER JOIN public.pages AS page
    ON page.profile_id = profile.id
  WHERE profile.public_id = p_legacy_public_id
    AND profile.published = TRUE
    AND page.published = TRUE
    AND page.published_template_config IS NOT NULL
    AND page.published_template_config->>'documentType' = 'magic-page'
    AND page.published_template_config->>'version' = '1'
    AND page.published_template_config->'meta'->>'createdBy' = 'magic-editor'
    AND page.published_template_config->'meta'->>'schemaVersion' = '1'
  ORDER BY page.published_at DESC NULLS LAST, page.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL
  ON FUNCTION public.get_published_magic_page_by_legacy_public_id(TEXT)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.get_published_magic_page_by_legacy_public_id(TEXT)
  TO anon, authenticated;
