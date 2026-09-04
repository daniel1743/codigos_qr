-- Host readiness only: preserve the existing profiles.template_config JSONB
-- while allowing the Basic Editor to merge only its own top-level namespace.

CREATE OR REPLACE FUNCTION public.patch_profile_basic_template_config(
  p_profile_id UUID,
  p_patch JSONB
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  patched_profile public.profiles;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'Basic Editor patch must be a JSON object.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_patch) AS patch_keys(key_name)
    WHERE key_name NOT IN ('basic_link_presentations', 'professional_badge')
  ) THEN
    RAISE EXCEPTION 'Basic Editor cannot patch non-owned template config keys.';
  END IF;

  IF p_patch ? 'professional_badge'
     AND jsonb_typeof(p_patch->'professional_badge') <> 'boolean' THEN
    RAISE EXCEPTION 'professional_badge must be boolean.';
  END IF;

  IF p_patch ? 'basic_link_presentations'
     AND jsonb_typeof(p_patch->'basic_link_presentations') <> 'object' THEN
    RAISE EXCEPTION 'basic_link_presentations must be an object.';
  END IF;

  UPDATE public.profiles
  SET template_config = COALESCE(template_config, '{}'::jsonb) || p_patch
  WHERE id = p_profile_id
    AND user_id = auth.uid()
  RETURNING * INTO patched_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or not owned by the current user.';
  END IF;

  RETURN patched_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_canonical_editor_config(
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
  SET template_config = jsonb_set(
    jsonb_set(
      COALESCE(template_config, '{}'::jsonb),
      '{schemaVersion}',
      '1'::jsonb,
      true
    ),
    '{editorConfig}',
    p_editor_config,
    true
  )
  WHERE id = p_profile_id
    AND user_id = auth.uid()
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or not owned by the current user.';
  END IF;

  RETURN updated_profile;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.patch_profile_basic_template_config(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.patch_profile_basic_template_config(UUID, JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_profile_canonical_editor_config(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_canonical_editor_config(UUID, JSONB) TO authenticated;
