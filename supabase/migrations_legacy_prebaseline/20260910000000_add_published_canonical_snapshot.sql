ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS published_template_config JSONB,
  ADD COLUMN IF NOT EXISTS published_revision BIGINT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE public.profiles
SET
  published_template_config = template_config,
  published_revision = COALESCE(published_revision, 1),
  published_at = COALESCE(published_at, updated_at, now())
WHERE published = true
  AND published_template_config IS NULL
  AND template_config IS NOT NULL
  AND jsonb_typeof(template_config) = 'object'
  AND template_config->'schemaVersion' = '1'::jsonb
  AND jsonb_typeof(template_config->'editorConfig') = 'object';

CREATE OR REPLACE FUNCTION public.publish_profile_canonical_snapshot(
  p_profile_id UUID,
  p_editor_config JSONB
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  updated_profile public.profiles;
BEGIN
  IF p_editor_config IS NULL OR jsonb_typeof(p_editor_config) <> 'object' THEN
    RAISE EXCEPTION 'Canonical editorConfig must be a JSON object.';
  END IF;

  UPDATE public.profiles
  SET
    published_template_config = jsonb_build_object(
      'schemaVersion',
      1,
      'editorConfig',
      p_editor_config
    ),
    published_revision = COALESCE(published_revision, 0) + 1,
    published_at = now(),
    published = true
  WHERE id = p_profile_id
    AND user_id = auth.uid()
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or not owned by the current user.';
  END IF;

  RETURN updated_profile;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_profile_canonical_snapshot(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_profile_canonical_snapshot(UUID, JSONB) TO authenticated;
