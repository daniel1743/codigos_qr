-- Allow Basic Editor to persist onboarding invite status safely
-- without replacing the entire template_config JSONB column.

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
    WHERE key_name NOT IN (
      'basic_link_presentations',
      'professional_badge',
      'onboarding_v2_invite_status'
    )
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

  IF p_patch ? 'onboarding_v2_invite_status'
     AND jsonb_typeof(p_patch->'onboarding_v2_invite_status') <> 'string' THEN
    RAISE EXCEPTION 'onboarding_v2_invite_status must be a string.';
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
