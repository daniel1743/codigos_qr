-- CRIPQER_PERMANENT_PUBLIC_IDENTITY_CONTRACT
--
-- A profile's public_id is the permanent identity of its QR destination.
-- Editable profile columns are draft state; this snapshot is the public state
-- selected by the last publish operation.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS published_profile_config JSONB;

CREATE OR REPLACE FUNCTION public.publish_profile_snapshot(p_profile_id UUID)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile public.profiles;
  snapshot_profile JSONB;
  snapshot_links JSONB;
BEGIN
  SELECT to_jsonb(p) - ARRAY[
    'id', 'user_id', 'scan_count', 'published', 'published_profile_config',
    'published_template_config', 'published_revision', 'published_at',
    'created_at', 'updated_at'
  ]::TEXT[]
  INTO snapshot_profile
  FROM public.profiles AS p
  WHERE p.id = p_profile_id AND p.user_id = auth.uid();

  IF snapshot_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found or not owned by the current user.';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.sort_order, l.created_at), '[]'::jsonb)
  INTO snapshot_links
  FROM public.profile_links AS l
  WHERE l.profile_id = p_profile_id;

  UPDATE public.profiles AS p
  SET published_profile_config = jsonb_build_object(
        'schemaVersion', 1,
        'profile', snapshot_profile,
        'links', snapshot_links
      ),
      published = TRUE,
      published_revision = COALESCE(p.published_revision, 0) + 1,
      published_at = now()
  WHERE p.id = p_profile_id AND p.user_id = auth.uid()
  RETURNING p.* INTO updated_profile;

  RETURN updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_profile_snapshot(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_profile_snapshot(UUID) TO authenticated;

-- Keep the canonical Power Editor publication on the same public snapshot
-- boundary. This preserves the existing RPC contract while ensuring metadata
-- and links cannot drift away from the published document.
CREATE OR REPLACE FUNCTION public.publish_profile_canonical_snapshot(
  p_profile_id UUID,
  p_editor_config JSONB
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile public.profiles;
BEGIN
  IF p_editor_config IS NULL OR jsonb_typeof(p_editor_config) <> 'object' THEN
    RAISE EXCEPTION 'Canonical editorConfig must be a JSON object.';
  END IF;

  UPDATE public.profiles AS p
  SET published_template_config = jsonb_build_object(
        'schemaVersion', 1,
        'editorConfig', p_editor_config
      ),
      published_profile_config = jsonb_build_object(
        'schemaVersion', 1,
        'profile', to_jsonb(p) - ARRAY[
          'id', 'user_id', 'scan_count', 'published', 'published_profile_config',
          'published_template_config', 'published_revision', 'published_at',
          'created_at', 'updated_at'
        ]::TEXT[],
        'links', COALESCE((
          SELECT jsonb_agg(to_jsonb(l) ORDER BY l.sort_order, l.created_at)
          FROM public.profile_links AS l
          WHERE l.profile_id = p.id
        ), '[]'::jsonb)
      ),
      published_revision = COALESCE(p.published_revision, 0) + 1,
      published_at = now(),
      published = TRUE
  WHERE p.id = p_profile_id AND p.user_id = auth.uid()
  RETURNING p.* INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or not owned by the current user.';
  END IF;

  RETURN updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_profile_canonical_snapshot(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_profile_canonical_snapshot(UUID, JSONB) TO authenticated;

-- Existing published profiles get a one-time baseline snapshot. Future edits
-- remain drafts until an explicit publish call promotes them.
UPDATE public.profiles AS p
SET published_profile_config = jsonb_build_object(
  'schemaVersion', 1,
  'profile', to_jsonb(p) - ARRAY[
    'id', 'user_id', 'scan_count', 'published', 'published_profile_config',
    'published_template_config', 'published_revision', 'published_at',
    'created_at', 'updated_at'
  ]::TEXT[],
  'links', COALESCE((
    SELECT jsonb_agg(to_jsonb(l) ORDER BY l.sort_order, l.created_at)
    FROM public.profile_links AS l
    WHERE l.profile_id = p.id
  ), '[]'::jsonb)
)
WHERE p.published = TRUE AND p.published_profile_config IS NULL;
