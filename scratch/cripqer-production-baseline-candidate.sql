-- =============================================================================
-- Cripqer Production Baseline Candidate (REVIEW-ONLY)
--
-- Source : scratch/cripqer-live-schema-raw.sql (pg_dump --schema-only, PG 17.6)
-- Purpose: Recreate the CURRENT public structural contract on a fresh Supabase
--          project where auth/storage already exist.
--
-- External dependencies (NOT included here):
--   * auth schema (auth.users FKs, auth.uid(), auth.jwt())  -> Supabase-managed
--   * pgcrypto extension (gen_random_uuid())               -> Supabase default
--
-- Deliberately ABSENT (matches live production truth):
--   * claim_billing_event (missing in production)
--   * any row data (no COPY / INSERT data)
--
-- Removed as environment/Supabase boilerplate (not part of the structural
-- contract, re-established automatically on a fresh Supabase project):
--   * ALTER ... OWNER TO ... statements
--   * ALTER DEFAULT PRIVILEGES ... (supabase_admin/postgres defaults)
--   * pg_dump TOC comments, session SET boilerplate, \restrict/\unrestrict
-- =============================================================================

SET check_function_bodies = false;
SET search_path = public;

CREATE SCHEMA IF NOT EXISTS public;
COMMENT ON SCHEMA public IS 'standard public schema';

CREATE FUNCTION public.check_is_super_admin(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
END;
$$;

CREATE FUNCTION public.claim_encrypted_document_download(p_short_url text) RETURNS TABLE(id uuid, encrypted_file_path text, iv text, salt text, original_filename text, mime_type text, success boolean, error_message text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_doc public.encrypted_documents%ROWTYPE;
BEGIN

  SELECT *
  INTO v_doc
  FROM public.encrypted_documents
  WHERE short_url = p_short_url
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      FALSE,
      'DOCUMENT_NOT_FOUND'::TEXT;

    RETURN;
  END IF;

  -- Revocation
  IF v_doc.revoked IS TRUE THEN

    RETURN QUERY
    SELECT
      v_doc.id,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      FALSE,
      'DOCUMENT_REVOKED'::TEXT;

    RETURN;

  END IF;

  -- Expiration
  IF v_doc.expire_at IS NOT NULL
     AND v_doc.expire_at <= CURRENT_TIMESTAMP THEN

    RETURN QUERY
    SELECT
      v_doc.id,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      FALSE,
      'DOCUMENT_EXPIRED'::TEXT;

    RETURN;

  END IF;

  -- One-time download
  IF v_doc.one_time_download IS TRUE
     AND COALESCE(v_doc.current_downloads, 0) >= 1 THEN

    RETURN QUERY
    SELECT
      v_doc.id,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      FALSE,
      'DOWNLOAD_LIMIT_REACHED'::TEXT;

    RETURN;

  END IF;

  -- Max downloads
  IF v_doc.max_downloads IS NOT NULL
     AND COALESCE(v_doc.current_downloads, 0) >= v_doc.max_downloads THEN

    RETURN QUERY
    SELECT
      v_doc.id,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      FALSE,
      'DOWNLOAD_LIMIT_REACHED'::TEXT;

    RETURN;

  END IF;

  -- Atomic claim while row lock is held
  UPDATE public.encrypted_documents
  SET
    current_downloads = COALESCE(current_downloads, 0) + 1,
    last_accessed_at = CURRENT_TIMESTAMP
  WHERE public.encrypted_documents.id = v_doc.id;

  RETURN QUERY
  SELECT
    v_doc.id,
    v_doc.encrypted_file_path,
    v_doc.iv,
    v_doc.salt,
    v_doc.original_filename,
    v_doc.mime_type,
    TRUE,
    NULL::TEXT;

END;
$$;

CREATE FUNCTION public.decrement_document_downloads(p_document_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN

  UPDATE public.encrypted_documents
    GREATEST(
      0,
      COALESCE(current_downloads, 0) - 1
    )
  WHERE id = p_document_id;

END;
$$;

CREATE FUNCTION public.generate_invitation_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := 'PREMIUM-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

    SELECT EXISTS(SELECT 1 FROM invitation_codes WHERE code = v_code) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION public.generate_invitation_code() IS 'Generate a unique invitation code';

CREATE FUNCTION public.generate_profile_public_id() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..7 LOOP
        result := result || substr(alphabet, floor(random() * length(alphabet) + 1)::INTEGER, 1);
    END LOOP;

    RETURN result;
END;
$$;

CREATE FUNCTION public.get_encrypted_document_delivery_secret(p_short_url text) RETURNS TABLE(id uuid, encrypted_file_path text, iv text, salt text, password_hash text, password_required boolean, original_filename text, mime_type text, revoked boolean, expire_at timestamp with time zone, max_downloads integer, current_downloads integer, one_time_download boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN

  RETURN QUERY
  SELECT
    d.id,
    d.encrypted_file_path,
    d.iv,
    d.salt,
    d.password_hash,
    d.password_required,
    d.original_filename,
    d.mime_type,
    d.revoked,
    d.expire_at,
    d.max_downloads,
    d.current_downloads,
    d.one_time_download
  FROM public.encrypted_documents AS d
  WHERE d.short_url = p_short_url
  LIMIT 1;

END;
$$;

CREATE FUNCTION public.get_encrypted_document_metadata(p_short_url text) RETURNS TABLE(id uuid, name text, original_filename text, file_type text, file_size_bytes bigint, mime_type text, encryption_level text, password_required boolean, expire_at timestamp with time zone, max_downloads integer, current_downloads integer, one_time_download boolean, revoked boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN

  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.original_filename,
    d.file_type,
    d.file_size_bytes,
    d.mime_type,
    d.encryption_level,
    d.password_required,
    d.expire_at,
    d.max_downloads,
    d.current_downloads,
    d.one_time_download,
    d.revoked
  FROM public.encrypted_documents AS d
  WHERE d.short_url = p_short_url
  LIMIT 1;

END;
$$;

CREATE FUNCTION public.increment_document_downloads(p_document_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.encrypted_documents
      last_accessed_at = NOW()
  WHERE id = p_document_id;
END;
$$;

CREATE FUNCTION public.increment_scan_count(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE profiles
    WHERE id = p_id;
END;
$$;

CREATE FUNCTION public.log_document_access(p_document_id uuid, p_success boolean, p_user_agent text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM public.encrypted_documents
    WHERE id = p_document_id
  ) THEN

    INSERT INTO public.document_access_logs (
      document_id,
      success,
      user_agent
    )
    VALUES (
      p_document_id,
      p_success,
      LEFT(p_user_agent, 1000)
    );

  END IF;

END;
$$;

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    slug text NOT NULL,
    display_name text NOT NULL,
    bio text,
    avatar_url text,
    banner_url text,
    avatar_shape text DEFAULT 'circle'::text,
    font_family text DEFAULT 'sans'::text,
    background_color text DEFAULT '#FFFFFF'::text,
    button_color text DEFAULT '#111111'::text,
    button_text_color text DEFAULT '#FFFFFF'::text,
    button_radius text DEFAULT 'rounded'::text,
    published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public_id text DEFAULT public.generate_profile_public_id() NOT NULL,
    ring_enabled boolean DEFAULT false,
    ring_color text DEFAULT '#000000'::text,
    ring_thickness text DEFAULT 'thin'::text,
    button_style text DEFAULT 'solid'::text NOT NULL,
    title_color text,
    title_size text DEFAULT 'lg'::text,
    title_weight text DEFAULT 'bold'::text,
    title_align text DEFAULT 'center'::text,
    bio_color text,
    bio_size text DEFAULT 'md'::text,
    bio_weight text DEFAULT 'normal'::text,
    bio_align text DEFAULT 'center'::text,
    button_text_size text DEFAULT 'md'::text,
    button_text_weight text DEFAULT 'semibold'::text,
    button_content_align text DEFAULT 'left'::text,
    button_icon_position text DEFAULT 'left'::text,
    qr_foreground_color character varying(20),
    qr_background_color character varying(20),
    qr_logo_url text,
    qr_logo_enabled boolean DEFAULT false,
    scan_count integer DEFAULT 0 NOT NULL,
    footer_enabled boolean DEFAULT false,
    footer_text character varying(255),
    theme_layout text DEFAULT 'classic_center'::text,
    theme_surface text DEFAULT 'transparent'::text,
    theme_spacing text DEFAULT 'standard'::text,
    qr_gradient jsonb,
    qr_dots_type character varying(30) DEFAULT 'square'::character varying,
    qr_corners_square_type character varying(30),
    qr_corners_dot_type character varying(30),
    qr_effect character varying(20) DEFAULT 'none'::character varying,
    qr_demo_logo_id uuid,
    decor_shape text DEFAULT 'none'::text,
    decor_particles text DEFAULT 'none'::text,
    decor_smoke text DEFAULT 'none'::text,
    decor_shadow text DEFAULT 'none'::text,
    decor_intensity text DEFAULT 'subtle'::text,
    qr_corners_square_color character varying(7),
    qr_corners_dot_color character varying(7),
    qr_corner_top_left_color character varying(7),
    qr_corner_top_right_color character varying(7),
    qr_corner_bottom_left_color character varying(7),
    qr_frame_style character varying(30) DEFAULT 'plain'::character varying,
    social_covers_enabled boolean DEFAULT false NOT NULL,
    hero_link_id uuid,
    social_cover_style character varying(40) DEFAULT 'badge_left'::character varying,
    social_cover_avatar_enabled boolean DEFAULT false,
    social_cover_height integer DEFAULT 64,
    social_cover_width integer DEFAULT 100,
    bio_bold_weight character varying(255) DEFAULT 'bold'::character varying,
    banner_fusion_strength integer DEFAULT 60 NOT NULL,
    template_id text,
    template_version integer DEFAULT 1 NOT NULL,
    template_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    button_border_thickness text DEFAULT 'none'::text,
    button_border_color text,
    title_font_family text,
    bio_font_family text,
    profession text,
    published_template_config jsonb,
    published_revision bigint,
    published_at timestamp with time zone,
    verification_variant text DEFAULT 'none'::text NOT NULL,
    CONSTRAINT no_empty_slug CHECK ((char_length(slug) > 0)),
    CONSTRAINT profiles_banner_fusion_strength_check CHECK (((banner_fusion_strength >= 0) AND (banner_fusion_strength <= 100))),
    CONSTRAINT profiles_button_style_check CHECK ((button_style = ANY (ARRAY['solid'::text, 'outline'::text, 'soft'::text, 'pill'::text, 'minimal'::text, 'line'::text, 'card'::text, 'premium_image_right'::text, 'premium_image_left'::text, 'premium_detail_arrow'::text, 'premium_classic_card'::text, 'premium_minimal_badge'::text]))),
    CONSTRAINT profiles_verification_variant_check CHECK ((verification_variant = ANY (ARRAY['none'::text, 'standard'::text, 'official-gold'::text]))),
    CONSTRAINT public_id_url_safe CHECK ((public_id ~ '^[A-Za-z0-9]+$'::text)),
    CONSTRAINT slug_is_lowercase CHECK ((slug = lower(slug))),
    CONSTRAINT valid_theme_layout CHECK ((theme_layout = ANY (ARRAY['classic_center'::text, 'cover_overlap'::text, 'editorial_left'::text, 'compact_profile'::text, 'hero_identity'::text, 'image_first'::text, 'minimal_center'::text, 'dark_statement'::text, 'professional_card'::text, 'soft_editorial'::text]))),
    CONSTRAINT valid_theme_spacing CHECK ((theme_spacing = ANY (ARRAY['compact'::text, 'standard'::text, 'generous'::text])))
);

COMMENT ON COLUMN public.profiles.qr_gradient IS 'Advanced gradient configuration for Premium QR codes';

COMMENT ON COLUMN public.profiles.qr_dots_type IS 'Style of QR dots/modules (square, rounded, dots, classy, extra-rounded)';

COMMENT ON COLUMN public.profiles.qr_corners_square_type IS 'Style of corner squares';

COMMENT ON COLUMN public.profiles.qr_corners_dot_type IS 'Style of corner dots';

COMMENT ON COLUMN public.profiles.qr_effect IS 'Visual effect applied to QR (neon, glow)';

COMMENT ON COLUMN public.profiles.qr_demo_logo_id IS 'ID of demo logo if using Premium demo logos';

COMMENT ON COLUMN public.profiles.qr_corners_square_color IS 'Default color for the three QR corner finder squares';

COMMENT ON COLUMN public.profiles.qr_corners_dot_color IS 'Default color for the inner QR corner dots';

COMMENT ON COLUMN public.profiles.qr_corner_top_left_color IS 'Top-left QR finder square custom color';

COMMENT ON COLUMN public.profiles.qr_corner_top_right_color IS 'Top-right QR finder square custom color';

COMMENT ON COLUMN public.profiles.qr_corner_bottom_left_color IS 'Bottom-left QR finder square custom color';

COMMENT ON COLUMN public.profiles.qr_frame_style IS 'Decorative QR frame style: plain, stamp, badge, phone, tag, bottle';

COMMENT ON COLUMN public.profiles.social_cover_style IS 'Premium visual model used by social cover links.';

COMMENT ON COLUMN public.profiles.social_cover_avatar_enabled IS 'Use profile avatar as the social cover badge when available.';

COMMENT ON COLUMN public.profiles.social_cover_height IS 'Height in pixels for premium social cover links.';

COMMENT ON COLUMN public.profiles.social_cover_width IS 'Width percentage for premium social cover links.';

COMMENT ON COLUMN public.profiles.banner_fusion_strength IS 'Strength from 0 to 100 for the visual transition between banner and profile background.';

CREATE FUNCTION public.patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb) RETURNS public.profiles
    LANGUAGE plpgsql
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
  WHERE id = p_profile_id
    AND user_id = auth.uid()
  RETURNING * INTO patched_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or not owned by the current user.';
  END IF;

  RETURN patched_profile;
END;
$$;

CREATE FUNCTION public.power_editor_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;

COMMENT ON FUNCTION public.power_editor_set_updated_at() IS 'Managed by Cripqer Power Editor draft persistence V4';

CREATE FUNCTION public.prevent_profile_public_id_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.public_id IS NOT NULL AND NEW.public_id IS DISTINCT FROM OLD.public_id THEN
        RAISE EXCEPTION 'public_id is immutable';
    END IF;

    RETURN NEW;
END;
$$;

CREATE FUNCTION public.publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb) RETURNS public.profiles
    LANGUAGE plpgsql
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

CREATE FUNCTION public.redeem_invitation_code(p_code text, p_user_id uuid, p_email text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_invitation invitation_codes%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
  v_premium_id UUID;
BEGIN
  -- Get invitation code
  SELECT * INTO v_invitation
  FROM invitation_codes
  WHERE code = p_code
  AND is_active = true
  FOR UPDATE;

  -- Validate code exists
  IF v_invitation.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido o inactivo');
  END IF;

  -- Validate not expired
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código expirado');
  END IF;

  -- Validate max uses
  IF v_invitation.current_uses >= v_invitation.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código agotado');
  END IF;

  -- Check if user already has premium
  IF EXISTS(SELECT 1 FROM premium_users WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya tienes acceso Premium');
  END IF;

  -- Calculate expiration
  IF v_invitation.duration_days IS NOT NULL THEN
    v_expires_at := NOW() + (v_invitation.duration_days || ' days')::INTERVAL;
  ELSE
    v_expires_at := NULL; -- Permanent
  END IF;

  -- Create premium user
  INSERT INTO premium_users (
    user_id,
    email,
    tier,
    source,
    invitation_code,
    expires_at
  )
  VALUES (
    p_user_id,
    p_email,
    v_invitation.tier,
    'invitation',
    p_code,
    v_expires_at
  )
  RETURNING id INTO v_premium_id;

  -- Increment code usage
  UPDATE invitation_codes
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'premium_id', v_premium_id,
    'tier', v_invitation.tier,
    'expires_at', v_expires_at
  );
END;
$$;

COMMENT ON FUNCTION public.redeem_invitation_code(p_code text, p_user_id uuid, p_email text) IS 'Redeem an invitation code to grant Premium access';

CREATE FUNCTION public.set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb) RETURNS public.profiles
    LANGUAGE plpgsql
    AS $$
DECLARE
  updated_profile public.profiles;
BEGIN
  IF p_editor_config IS NULL OR jsonb_typeof(p_editor_config) <> 'object' THEN
    RAISE EXCEPTION 'Canonical editorConfig must be a JSON object.';
  END IF;

  UPDATE public.profiles
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

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.track_link_click(p_profile_id uuid, p_link_id uuid, p_country text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_user_agent text DEFAULT NULL::text, p_device_type text DEFAULT 'unknown'::text, p_browser text DEFAULT NULL::text, p_os text DEFAULT NULL::text, p_referrer text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_ip_hash text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  INSERT INTO qr_analytics (
    profile_id,
    event_type,
    link_id,
    country,
    city,
    latitude,
    longitude,
    user_agent,
    device_type,
    browser,
    os,
    referrer,
    session_id,
    ip_hash
  )
  VALUES (
    p_profile_id,
    'link_click',
    p_link_id,
    p_country,
    p_city,
    p_latitude,
    p_longitude,
    p_user_agent,
    p_device_type,
    p_browser,
    p_os,
    p_referrer,
    p_session_id,
    p_ip_hash
  )
  RETURNING id INTO v_analytics_id;

  RETURN v_analytics_id;
END;
$$;

COMMENT ON FUNCTION public.track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) IS 'Track a link click event with geolocation and device info';

CREATE FUNCTION public.track_page_view(p_profile_id uuid, p_country text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_user_agent text DEFAULT NULL::text, p_device_type text DEFAULT 'unknown'::text, p_browser text DEFAULT NULL::text, p_os text DEFAULT NULL::text, p_referrer text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_ip_hash text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_analytics_id UUID;
BEGIN
  INSERT INTO qr_analytics (
    profile_id,
    event_type,
    country,
    city,
    latitude,
    longitude,
    user_agent,
    device_type,
    browser,
    os,
    referrer,
    session_id,
    ip_hash
  )
  VALUES (
    p_profile_id,
    'view',
    p_country,
    p_city,
    p_latitude,
    p_longitude,
    p_user_agent,
    p_device_type,
    p_browser,
    p_os,
    p_referrer,
    p_session_id,
    p_ip_hash
  )
  RETURNING id INTO v_analytics_id;

  RETURN v_analytics_id;
END;
$$;

COMMENT ON FUNCTION public.track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) IS 'Track a page view event with geolocation and device info';

CREATE FUNCTION public.update_demo_logos_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_template_bank_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.validate_template_state_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- GENERATED_PRIVATE can go to: REVIEW_PENDING, ARCHIVED, REJECTED
    IF OLD.publication_status = 'GENERATED_PRIVATE' THEN
        IF NEW.publication_status NOT IN ('GENERATED_PRIVATE', 'REVIEW_PENDING', 'ARCHIVED', 'REJECTED') THEN
            RAISE EXCEPTION 'Invalid transition from GENERATED_PRIVATE to %', NEW.publication_status;
        END IF;
    END IF;

    -- REVIEW_PENDING can go to: APPROVED, REJECTED, ARCHIVED
    IF OLD.publication_status = 'REVIEW_PENDING' THEN
        IF NEW.publication_status NOT IN ('REVIEW_PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED') THEN
            RAISE EXCEPTION 'Invalid transition from REVIEW_PENDING to %', NEW.publication_status;
        END IF;
    END IF;

    -- APPROVED can go to: PUBLIC, REVIEW_PENDING, ARCHIVED
    IF OLD.publication_status = 'APPROVED' THEN
        IF NEW.publication_status NOT IN ('APPROVED', 'PUBLIC', 'REVIEW_PENDING', 'ARCHIVED') THEN
            RAISE EXCEPTION 'Invalid transition from APPROVED to %', NEW.publication_status;
        END IF;
    END IF;

    -- PUBLIC can go to: APPROVED (unpublish), ARCHIVED
    IF OLD.publication_status = 'PUBLIC' THEN
        IF NEW.publication_status NOT IN ('PUBLIC', 'APPROVED', 'ARCHIVED') THEN
            RAISE EXCEPTION 'Invalid transition from PUBLIC to %', NEW.publication_status;
        END IF;
        -- When unpublishing, set is_public to false
        IF NEW.publication_status != 'PUBLIC' THEN
            NEW.is_public := false;
            NEW.published_at := NULL;
        END IF;
    END IF;

    -- REJECTED can go to: REVIEW_PENDING, ARCHIVED
    IF OLD.publication_status = 'REJECTED' THEN
        IF NEW.publication_status NOT IN ('REJECTED', 'REVIEW_PENDING', 'ARCHIVED') THEN
            RAISE EXCEPTION 'Invalid transition from REJECTED to %', NEW.publication_status;
        END IF;
    END IF;

    -- ARCHIVED can go to: REVIEW_PENDING, APPROVED (restore)
    IF OLD.publication_status = 'ARCHIVED' THEN
        IF NEW.publication_status NOT IN ('ARCHIVED', 'REVIEW_PENDING', 'APPROVED') THEN
            RAISE EXCEPTION 'Invalid transition from ARCHIVED to %', NEW.publication_status;
        END IF;
    END IF;

    -- Automatically set timestamps
    IF NEW.publication_status = 'APPROVED' AND OLD.publication_status != 'APPROVED' THEN
        NEW.approved_at := NOW();
        NEW.approved_by := auth.uid();
    END IF;

    IF NEW.publication_status = 'PUBLIC' AND OLD.publication_status != 'PUBLIC' THEN
        NEW.published_at := NOW();
        NEW.is_public := true;
    END IF;

    IF NEW.publication_status = 'ARCHIVED' AND OLD.publication_status != 'ARCHIVED' THEN
        NEW.archived_at := NOW();
    END IF;

    IF NEW.publication_status = 'REJECTED' AND OLD.publication_status != 'REJECTED' THEN
        NEW.rejected_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'admin'::text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT admin_users_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text])))
);

COMMENT ON TABLE public.admin_users IS 'Users with administrative privileges for Template Factory and other admin features';

CREATE TABLE public.demo_logos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    file_url text NOT NULL,
    preview_url text NOT NULL,
    tier text DEFAULT 'premium'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT demo_logos_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'premium'::text])))
);

COMMENT ON TABLE public.demo_logos IS 'Demo logos library for Premium QR codes';

COMMENT ON COLUMN public.demo_logos.category IS 'Logo category: business, food, beauty, tech, creative';

COMMENT ON COLUMN public.demo_logos.tier IS 'Access tier: free or premium';

CREATE TABLE public.document_access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    ip_address text,
    user_agent text,
    success boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.encrypted_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    original_filename text NOT NULL,
    file_type text NOT NULL,
    file_size_bytes bigint NOT NULL,
    mime_type text NOT NULL,
    encrypted_file_path text NOT NULL,
    iv text NOT NULL,
    salt text,
    encryption_level text NOT NULL,
    password_required boolean DEFAULT false,
    password_hash text,
    two_factor_enabled boolean DEFAULT false,
    expire_at timestamp with time zone,
    max_downloads integer,
    current_downloads integer DEFAULT 0,
    one_time_download boolean DEFAULT false,
    short_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone,
    revoked boolean DEFAULT false NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT encrypted_documents_encryption_level_check CHECK ((encryption_level = ANY (ARRAY['standard'::text, 'high'::text, 'maximum'::text])))
);

CREATE TABLE public.invitation_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    max_uses integer DEFAULT 1,
    current_uses integer DEFAULT 0,
    tier text DEFAULT 'premium'::text,
    duration_days integer,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    CONSTRAINT invitation_codes_max_uses_check CHECK ((max_uses > 0)),
    CONSTRAINT invitation_codes_tier_check CHECK ((tier = ANY (ARRAY['premium'::text, 'premium_pro'::text])))
);

COMMENT ON TABLE public.invitation_codes IS 'Invitation codes to grant Premium access';

CREATE TABLE public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    public_id text DEFAULT public.generate_profile_public_id() NOT NULL,
    title text NOT NULL,
    page_type text DEFAULT 'landing'::text NOT NULL,
    template_config jsonb,
    published_template_config jsonb,
    published boolean DEFAULT false NOT NULL,
    published_revision integer DEFAULT 0 NOT NULL,
    published_at timestamp with time zone,
    slug text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT page_type_check CHECK ((page_type = ANY (ARRAY['landing'::text, 'promotion'::text, 'menu'::text, 'campaign'::text, 'event'::text])))
);

CREATE TABLE public.power_editor_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    template_id uuid,
    name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    page_config jsonb NOT NULL,
    published_page_config jsonb,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT power_editor_projects_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))
);

CREATE TABLE public.power_editor_template_blueprints (
    blueprint_key text NOT NULL,
    template_id uuid NOT NULL,
    content_fingerprint text NOT NULL,
    category text NOT NULL,
    archetype text NOT NULL,
    generator_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT power_editor_template_blueprints_content_fingerprint_check CHECK ((char_length(content_fingerprint) = 64))
);

CREATE TABLE public.power_editor_template_generation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    generator_version text NOT NULL,
    seed text NOT NULL,
    template_count integer NOT NULL,
    audit jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT power_editor_template_generation_runs_template_count_check CHECK ((template_count > 0))
);

CREATE TABLE public.power_editor_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    page_config jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT power_editor_templates_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))
);

CREATE TABLE public.premium_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    tier text DEFAULT 'premium'::text,
    source text DEFAULT 'admin_grant'::text,
    granted_by uuid,
    invitation_code text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT premium_users_source_check CHECK ((source = ANY (ARRAY['admin_grant'::text, 'invitation'::text, 'purchase'::text]))),
    CONSTRAINT premium_users_tier_check CHECK ((tier = ANY (ARRAY['premium'::text, 'premium_pro'::text])))
);

COMMENT ON TABLE public.premium_users IS 'Users with Premium access';

CREATE TABLE public.profile_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    platform text NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    icon_key text,
    sort_order integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    social_cover_image_url text,
    subtitle text
);

COMMENT ON COLUMN public.profile_links.social_cover_image_url IS 'Optional image used as the premium social cover badge for this link.';

CREATE TABLE public.qr_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    event_type text NOT NULL,
    link_id uuid,
    country text,
    city text,
    latitude numeric(9,6),
    longitude numeric(9,6),
    user_agent text,
    device_type text,
    browser text,
    os text,
    created_at timestamp with time zone DEFAULT now(),
    referrer text,
    session_id text,
    ip_hash text,
    CONSTRAINT qr_analytics_device_type_check CHECK ((device_type = ANY (ARRAY['mobile'::text, 'desktop'::text, 'tablet'::text, 'unknown'::text]))),
    CONSTRAINT qr_analytics_event_type_check CHECK ((event_type = ANY (ARRAY['view'::text, 'link_click'::text])))
);

COMMENT ON TABLE public.qr_analytics IS 'Detailed analytics for QR code tracking';

COMMENT ON COLUMN public.qr_analytics.event_type IS 'Type of event: view (page view) or link_click';

COMMENT ON COLUMN public.qr_analytics.session_id IS 'Session identifier to group events from same visit';

COMMENT ON COLUMN public.qr_analytics.ip_hash IS 'Hashed IP address for privacy-preserving unique visitor count';

CREATE VIEW public.qr_analytics_daily AS
 SELECT profile_id,
    date(created_at) AS date,
    event_type,
    count(*) AS count,
    count(DISTINCT session_id) AS unique_sessions,
    count(DISTINCT ip_hash) AS unique_visitors
   FROM public.qr_analytics
  GROUP BY profile_id, (date(created_at)), event_type;

CREATE VIEW public.qr_top_links AS
 SELECT qa.profile_id,
    qa.link_id,
    pl.label AS link_label,
    pl.url AS link_url,
    count(*) AS click_count,
    count(DISTINCT qa.session_id) AS unique_clicks
   FROM (public.qr_analytics qa
     JOIN public.profile_links pl ON ((qa.link_id = pl.id)))
  WHERE (qa.event_type = 'link_click'::text)
  GROUP BY qa.profile_id, qa.link_id, pl.label, pl.url
  ORDER BY (count(*)) DESC;

CREATE TABLE public.qr_visual_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    foreground_color text DEFAULT '#000000'::text,
    background_color text DEFAULT '#ffffff'::text,
    logo_url text,
    logo_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.template_bank (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    preview_image text,
    config_json jsonb NOT NULL,
    css_variables jsonb,
    template_type text DEFAULT 'private'::text NOT NULL,
    is_public boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    usage_count integer DEFAULT 0,
    publication_status text DEFAULT 'GENERATED_PRIVATE'::text,
    category text,
    industry text,
    style text,
    theme text,
    layout text,
    schema_version integer DEFAULT 1,
    generation_source text DEFAULT 'manual'::text,
    generator_version text,
    batch_id text,
    validation_status text DEFAULT 'pending'::text,
    qa_score numeric(3,2),
    qa_findings jsonb DEFAULT '[]'::jsonb,
    approved_by uuid,
    approved_at timestamp with time zone,
    published_at timestamp with time zone,
    archived_at timestamp with time zone,
    rejected_at timestamp with time zone,
    rejection_reason text,
    CONSTRAINT template_bank_publication_status_check CHECK ((publication_status = ANY (ARRAY['GENERATED_PRIVATE'::text, 'REVIEW_PENDING'::text, 'APPROVED'::text, 'PUBLIC'::text, 'ARCHIVED'::text, 'REJECTED'::text]))),
    CONSTRAINT template_bank_template_type_check CHECK ((template_type = ANY (ARRAY['premium'::text, 'private'::text]))),
    CONSTRAINT template_bank_validation_status_check CHECK ((validation_status = ANY (ARRAY['pending'::text, 'valid'::text, 'invalid'::text])))
);

COMMENT ON TABLE public.template_bank IS 'Template Factory private library with administrative workflow support';

COMMENT ON COLUMN public.template_bank.publication_status IS 'Workflow state: GENERATED_PRIVATE -> REVIEW_PENDING -> APPROVED -> PUBLIC';

COMMENT ON COLUMN public.template_bank.generation_source IS 'Source of template: manual, generator_v1, etc';

COMMENT ON COLUMN public.template_bank.batch_id IS 'Batch identifier for templates generated together by the automatic generator';

COMMENT ON COLUMN public.template_bank.qa_score IS 'Automated QA score from 0.00 to 1.00';

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.demo_logos
    ADD CONSTRAINT demo_logos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.encrypted_documents
    ADD CONSTRAINT encrypted_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.encrypted_documents
    ADD CONSTRAINT encrypted_documents_short_url_key UNIQUE (short_url);

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_code_key UNIQUE (code);

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_public_id_key UNIQUE (public_id);

ALTER TABLE ONLY public.power_editor_projects
    ADD CONSTRAINT power_editor_projects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.power_editor_template_blueprints
    ADD CONSTRAINT power_editor_template_blueprints_pkey PRIMARY KEY (blueprint_key);

ALTER TABLE ONLY public.power_editor_template_generation_runs
    ADD CONSTRAINT power_editor_template_generation_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.power_editor_templates
    ADD CONSTRAINT power_editor_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.premium_users
    ADD CONSTRAINT premium_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.premium_users
    ADD CONSTRAINT premium_users_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.profile_links
    ADD CONSTRAINT profile_links_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.qr_analytics
    ADD CONSTRAINT qr_analytics_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.qr_visual_versions
    ADD CONSTRAINT qr_visual_versions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.template_bank
    ADD CONSTRAINT template_bank_pkey PRIMARY KEY (id);

CREATE INDEX idx_admin_users_email ON public.admin_users USING btree (email);

CREATE INDEX idx_admin_users_user_id ON public.admin_users USING btree (user_id);

CREATE INDEX idx_demo_logos_category ON public.demo_logos USING btree (category);

CREATE INDEX idx_demo_logos_tier ON public.demo_logos USING btree (tier);

CREATE INDEX idx_invitation_codes_code ON public.invitation_codes USING btree (code);

CREATE INDEX idx_invitation_codes_is_active ON public.invitation_codes USING btree (is_active);

CREATE INDEX idx_pages_owner_user_id ON public.pages USING btree (owner_user_id);

CREATE INDEX idx_pages_profile_id ON public.pages USING btree (profile_id);

CREATE INDEX idx_pages_published ON public.pages USING btree (published);

CREATE UNIQUE INDEX idx_pages_slug_unique ON public.pages USING btree (slug) WHERE (slug IS NOT NULL);

CREATE INDEX idx_power_editor_projects_owner_updated ON public.power_editor_projects USING btree (owner_user_id, updated_at DESC);

CREATE INDEX idx_power_editor_projects_profile ON public.power_editor_projects USING btree (profile_id);

CREATE INDEX idx_power_editor_projects_template ON public.power_editor_projects USING btree (template_id);

CREATE UNIQUE INDEX idx_power_editor_template_blueprints_template_id ON public.power_editor_template_blueprints USING btree (template_id);

CREATE INDEX idx_power_editor_template_generation_runs_created_at ON public.power_editor_template_generation_runs USING btree (created_at DESC);

CREATE INDEX idx_power_editor_templates_owner ON public.power_editor_templates USING btree (owner_user_id);

CREATE INDEX idx_power_editor_templates_status_updated ON public.power_editor_templates USING btree (status, updated_at DESC);

CREATE INDEX idx_premium_users_email ON public.premium_users USING btree (email);

CREATE INDEX idx_premium_users_expires_at ON public.premium_users USING btree (expires_at);

CREATE INDEX idx_premium_users_user_id ON public.premium_users USING btree (user_id);

CREATE INDEX idx_profile_links_profile_id ON public.profile_links USING btree (profile_id);

CREATE INDEX idx_profile_links_profile_id_sort_order ON public.profile_links USING btree (profile_id, sort_order);

CREATE INDEX idx_profiles_demo_logo_id ON public.profiles USING btree (qr_demo_logo_id);

CREATE UNIQUE INDEX idx_profiles_public_id_unique ON public.profiles USING btree (public_id);

CREATE INDEX idx_profiles_slug ON public.profiles USING btree (slug);

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);

CREATE INDEX idx_qr_analytics_created_at ON public.qr_analytics USING btree (created_at DESC);

CREATE INDEX idx_qr_analytics_event_type ON public.qr_analytics USING btree (event_type);

CREATE INDEX idx_qr_analytics_link_id ON public.qr_analytics USING btree (link_id) WHERE (link_id IS NOT NULL);

CREATE INDEX idx_qr_analytics_profile_date ON public.qr_analytics USING btree (profile_id, created_at DESC);

CREATE INDEX idx_qr_analytics_profile_event ON public.qr_analytics USING btree (profile_id, event_type);

CREATE INDEX idx_qr_analytics_profile_id ON public.qr_analytics USING btree (profile_id);

CREATE INDEX idx_qr_analytics_session_id ON public.qr_analytics USING btree (session_id);

CREATE INDEX idx_template_bank_approved_by ON public.template_bank USING btree (approved_by);

CREATE INDEX idx_template_bank_batch_id ON public.template_bank USING btree (batch_id);

CREATE INDEX idx_template_bank_category ON public.template_bank USING btree (category);

CREATE INDEX idx_template_bank_created_by ON public.template_bank USING btree (created_by);

CREATE INDEX idx_template_bank_industry ON public.template_bank USING btree (industry);

CREATE INDEX idx_template_bank_public ON public.template_bank USING btree (is_public);

CREATE INDEX idx_template_bank_publication_status ON public.template_bank USING btree (publication_status);

CREATE INDEX idx_template_bank_type ON public.template_bank USING btree (template_type);

CREATE INDEX idx_template_bank_validation_status ON public.template_bank USING btree (validation_status);

CREATE TRIGGER prevent_profiles_public_id_change BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_public_id_change();

CREATE TRIGGER set_demo_logos_updated_at BEFORE UPDATE ON public.demo_logos FOR EACH ROW EXECUTE FUNCTION public.update_demo_logos_updated_at();

CREATE TRIGGER set_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_power_editor_projects_updated_at BEFORE UPDATE ON public.power_editor_projects FOR EACH ROW EXECUTE FUNCTION public.power_editor_set_updated_at();

CREATE TRIGGER set_power_editor_template_blueprints_updated_at BEFORE UPDATE ON public.power_editor_template_blueprints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_power_editor_templates_updated_at BEFORE UPDATE ON public.power_editor_templates FOR EACH ROW EXECUTE FUNCTION public.power_editor_set_updated_at();

CREATE TRIGGER set_profile_links_updated_at BEFORE UPDATE ON public.profile_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER template_bank_updated_at BEFORE UPDATE ON public.template_bank FOR EACH ROW EXECUTE FUNCTION public.update_template_bank_updated_at();

CREATE TRIGGER validate_template_state_transition_trigger BEFORE UPDATE ON public.template_bank FOR EACH ROW WHEN ((old.publication_status IS DISTINCT FROM new.publication_status)) EXECUTE FUNCTION public.validate_template_state_transition();

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.encrypted_documents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.encrypted_documents
    ADD CONSTRAINT encrypted_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_profiles_demo_logo FOREIGN KEY (qr_demo_logo_id) REFERENCES public.demo_logos(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);

ALTER TABLE ONLY public.power_editor_projects
    ADD CONSTRAINT power_editor_projects_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.power_editor_projects
    ADD CONSTRAINT power_editor_projects_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.power_editor_projects
    ADD CONSTRAINT power_editor_projects_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.power_editor_templates(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.power_editor_template_blueprints
    ADD CONSTRAINT power_editor_template_blueprints_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.power_editor_templates(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.power_editor_templates
    ADD CONSTRAINT power_editor_templates_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.premium_users
    ADD CONSTRAINT premium_users_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.premium_users
    ADD CONSTRAINT premium_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profile_links
    ADD CONSTRAINT profile_links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_hero_link_id_fkey FOREIGN KEY (hero_link_id) REFERENCES public.profile_links(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.qr_analytics
    ADD CONSTRAINT qr_analytics_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.profile_links(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.qr_analytics
    ADD CONSTRAINT qr_analytics_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.qr_visual_versions
    ADD CONSTRAINT qr_visual_versions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.template_bank
    ADD CONSTRAINT template_bank_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.template_bank
    ADD CONSTRAINT template_bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Admin can delete demo logos" ON public.demo_logos FOR DELETE USING ((auth.uid() IN ( SELECT admin_users.user_id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Admin can delete premium users" ON public.premium_users FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));

CREATE POLICY "Admin can delete templates" ON public.template_bank FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));

CREATE POLICY "Admin can insert demo logos" ON public.demo_logos FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT admin_users.user_id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Admin can insert invitation codes" ON public.invitation_codes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));

CREATE POLICY "Admin can insert premium users" ON public.premium_users FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));

CREATE POLICY "Admin can read all analytics" ON public.qr_analytics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.user_id = auth.uid()) AND (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admin can read all invitation codes" ON public.invitation_codes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));

CREATE POLICY "Admin can read all premium users" ON public.premium_users FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));

CREATE POLICY "Admin can update demo logos" ON public.demo_logos FOR UPDATE USING ((auth.uid() IN ( SELECT admin_users.user_id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));

CREATE POLICY "Admin can update invitation codes" ON public.invitation_codes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));

CREATE POLICY "Admin can update premium users" ON public.premium_users FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));

CREATE POLICY "Admin can update templates" ON public.template_bank FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));

CREATE POLICY "Admin can view all templates" ON public.template_bank FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));

CREATE POLICY "Anyone can insert analytics" ON public.qr_analytics FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read active codes for validation" ON public.invitation_codes FOR SELECT USING ((is_active = true));

CREATE POLICY "Anyone can read demo logos" ON public.demo_logos FOR SELECT USING (true);

CREATE POLICY "Owner email can manage demo logos" ON public.demo_logos USING ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text)) WITH CHECK ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text));

CREATE POLICY "Owner email can manage invitation codes" ON public.invitation_codes USING ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text)) WITH CHECK ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text));

CREATE POLICY "Owner email can manage premium users" ON public.premium_users USING ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text)) WITH CHECK ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text));

CREATE POLICY "Owner email can read admin users" ON public.admin_users FOR SELECT USING ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text));

CREATE POLICY "Public templates visible to everyone" ON public.template_bank FOR SELECT USING (((publication_status = 'PUBLIC'::text) AND (is_public = true)));

CREATE POLICY "Super admin can insert admin users" ON public.admin_users FOR INSERT WITH CHECK (public.check_is_super_admin(auth.uid()));

CREATE POLICY "Super admin can read all admin users" ON public.admin_users FOR SELECT USING ((public.check_is_super_admin(auth.uid()) OR (user_id = auth.uid())));

CREATE POLICY "User can read own premium status" ON public.premium_users FOR SELECT USING ((user_id = auth.uid()));

CREATE POLICY "Users can create own encrypted documents" ON public.encrypted_documents FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can create templates" ON public.template_bank FOR INSERT WITH CHECK ((auth.uid() = created_by));

CREATE POLICY "Users can delete their own templates" ON public.template_bank FOR DELETE USING ((auth.uid() = created_by));

CREATE POLICY "Users can insert their own qr visual versions" ON public.qr_visual_versions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = qr_visual_versions.profile_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "Users can manage their own encrypted documents" ON public.encrypted_documents TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can read their own analytics" ON public.qr_analytics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = qr_analytics.profile_id) AND (profiles.user_id = auth.uid())))));

CREATE POLICY "Users can read their own qr visual versions" ON public.qr_visual_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = qr_visual_versions.profile_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "Users can update their own templates" ON public.template_bank FOR UPDATE USING ((auth.uid() = created_by));

CREATE POLICY "Users can view logs of their own documents" ON public.document_access_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.encrypted_documents
  WHERE ((encrypted_documents.id = document_access_logs.document_id) AND (encrypted_documents.user_id = auth.uid())))));

CREATE POLICY "Users can view own templates" ON public.template_bank FOR SELECT USING ((auth.uid() = created_by));

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.demo_logos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.encrypted_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_delete_link ON public.profile_links FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.user_id = auth.uid())))));

CREATE POLICY owner_delete_page ON public.pages FOR DELETE TO authenticated USING ((auth.uid() = owner_user_id));

CREATE POLICY owner_delete_profile ON public.profiles FOR DELETE TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY owner_insert_link ON public.profile_links FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.user_id = auth.uid())))));

CREATE POLICY owner_insert_page ON public.pages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = owner_user_id));

CREATE POLICY owner_insert_profile ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY owner_select_link ON public.profile_links FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.user_id = auth.uid())))));

CREATE POLICY owner_select_page ON public.pages FOR SELECT TO authenticated USING ((auth.uid() = owner_user_id));

CREATE POLICY owner_select_profile ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY owner_update_link ON public.profile_links FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.user_id = auth.uid())))));

CREATE POLICY owner_update_page ON public.pages FOR UPDATE TO authenticated USING ((auth.uid() = owner_user_id)) WITH CHECK ((auth.uid() = owner_user_id));

CREATE POLICY owner_update_profile ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "owners create drafts for their own profile from published templ" ON public.power_editor_projects FOR INSERT TO authenticated WITH CHECK (((owner_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = power_editor_projects.profile_id) AND (profiles.user_id = auth.uid())))) AND ((template_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.power_editor_templates
  WHERE ((power_editor_templates.id = power_editor_projects.template_id) AND (power_editor_templates.status = 'published'::text)))))));

CREATE POLICY "owners delete their own power editor drafts" ON public.power_editor_projects FOR DELETE TO authenticated USING (((owner_user_id = auth.uid()) AND (status = 'draft'::text)));

CREATE POLICY "owners read their own power editor projects" ON public.power_editor_projects FOR SELECT TO authenticated USING ((owner_user_id = auth.uid()));

CREATE POLICY "owners update their own power editor drafts" ON public.power_editor_projects FOR UPDATE TO authenticated USING (((owner_user_id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'published'::text])))) WITH CHECK (((owner_user_id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'published'::text])) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = power_editor_projects.profile_id) AND (profiles.user_id = auth.uid()))))));

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.power_editor_projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.power_editor_template_blueprints ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.power_editor_template_generation_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.power_editor_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_published_link ON public.profile_links FOR SELECT TO anon USING (((enabled = true) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.published = true))))));

CREATE POLICY public_select_published_profile ON public.profiles FOR SELECT TO anon USING ((published = true));

CREATE POLICY "published power editor templates are readable by authenticated " ON public.power_editor_templates FOR SELECT TO authenticated USING ((status = 'published'::text));

ALTER TABLE public.qr_analytics ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.qr_visual_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.template_bank ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON FUNCTION public.check_is_super_admin(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.check_is_super_admin(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_is_super_admin(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.claim_encrypted_document_download(p_short_url text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_encrypted_document_download(p_short_url text) TO service_role;

REVOKE ALL ON FUNCTION public.decrement_document_downloads(p_document_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.decrement_document_downloads(p_document_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.generate_invitation_code() TO anon;
GRANT ALL ON FUNCTION public.generate_invitation_code() TO authenticated;
GRANT ALL ON FUNCTION public.generate_invitation_code() TO service_role;

GRANT ALL ON FUNCTION public.generate_profile_public_id() TO anon;
GRANT ALL ON FUNCTION public.generate_profile_public_id() TO authenticated;
GRANT ALL ON FUNCTION public.generate_profile_public_id() TO service_role;

REVOKE ALL ON FUNCTION public.get_encrypted_document_delivery_secret(p_short_url text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_encrypted_document_delivery_secret(p_short_url text) TO service_role;

REVOKE ALL ON FUNCTION public.get_encrypted_document_metadata(p_short_url text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_encrypted_document_metadata(p_short_url text) TO anon;
GRANT ALL ON FUNCTION public.get_encrypted_document_metadata(p_short_url text) TO authenticated;
GRANT ALL ON FUNCTION public.get_encrypted_document_metadata(p_short_url text) TO service_role;

GRANT ALL ON FUNCTION public.increment_document_downloads(p_document_id uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_document_downloads(p_document_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_document_downloads(p_document_id uuid) TO service_role;

GRANT ALL ON FUNCTION public.increment_scan_count(p_id uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_scan_count(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_scan_count(p_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.log_document_access(p_document_id uuid, p_success boolean, p_user_agent text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.log_document_access(p_document_id uuid, p_success boolean, p_user_agent text) TO service_role;

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

REVOKE ALL ON FUNCTION public.patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.power_editor_set_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.power_editor_set_updated_at() TO service_role;

GRANT ALL ON FUNCTION public.prevent_profile_public_id_change() TO anon;
GRANT ALL ON FUNCTION public.prevent_profile_public_id_change() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_profile_public_id_change() TO service_role;

REVOKE ALL ON FUNCTION public.publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb) TO service_role;

GRANT ALL ON FUNCTION public.redeem_invitation_code(p_code text, p_user_id uuid, p_email text) TO anon;
GRANT ALL ON FUNCTION public.redeem_invitation_code(p_code text, p_user_id uuid, p_email text) TO authenticated;
GRANT ALL ON FUNCTION public.redeem_invitation_code(p_code text, p_user_id uuid, p_email text) TO service_role;

REVOKE ALL ON FUNCTION public.set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb) TO service_role;

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

GRANT ALL ON FUNCTION public.track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO anon;
GRANT ALL ON FUNCTION public.track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO authenticated;
GRANT ALL ON FUNCTION public.track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO service_role;

GRANT ALL ON FUNCTION public.track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO anon;
GRANT ALL ON FUNCTION public.track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO authenticated;
GRANT ALL ON FUNCTION public.track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO service_role;

GRANT ALL ON FUNCTION public.update_demo_logos_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_demo_logos_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_demo_logos_updated_at() TO service_role;

GRANT ALL ON FUNCTION public.update_template_bank_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_template_bank_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_template_bank_updated_at() TO service_role;

GRANT ALL ON FUNCTION public.validate_template_state_transition() TO anon;
GRANT ALL ON FUNCTION public.validate_template_state_transition() TO authenticated;
GRANT ALL ON FUNCTION public.validate_template_state_transition() TO service_role;

GRANT ALL ON TABLE public.admin_users TO anon;
GRANT ALL ON TABLE public.admin_users TO authenticated;
GRANT ALL ON TABLE public.admin_users TO service_role;

GRANT ALL ON TABLE public.demo_logos TO anon;
GRANT ALL ON TABLE public.demo_logos TO authenticated;
GRANT ALL ON TABLE public.demo_logos TO service_role;

GRANT ALL ON TABLE public.document_access_logs TO anon;
GRANT ALL ON TABLE public.document_access_logs TO authenticated;
GRANT ALL ON TABLE public.document_access_logs TO service_role;

GRANT ALL ON TABLE public.encrypted_documents TO anon;
GRANT ALL ON TABLE public.encrypted_documents TO authenticated;
GRANT ALL ON TABLE public.encrypted_documents TO service_role;

GRANT ALL ON TABLE public.invitation_codes TO anon;
GRANT ALL ON TABLE public.invitation_codes TO authenticated;
GRANT ALL ON TABLE public.invitation_codes TO service_role;

GRANT ALL ON TABLE public.pages TO anon;
GRANT ALL ON TABLE public.pages TO authenticated;
GRANT ALL ON TABLE public.pages TO service_role;

GRANT ALL ON TABLE public.power_editor_projects TO service_role;
GRANT SELECT,DELETE ON TABLE public.power_editor_projects TO authenticated;

GRANT INSERT(owner_user_id) ON TABLE public.power_editor_projects TO authenticated;

GRANT INSERT(profile_id) ON TABLE public.power_editor_projects TO authenticated;

GRANT INSERT(template_id) ON TABLE public.power_editor_projects TO authenticated;

GRANT INSERT(name),UPDATE(name) ON TABLE public.power_editor_projects TO authenticated;

GRANT INSERT(page_config),UPDATE(page_config) ON TABLE public.power_editor_projects TO authenticated;

GRANT ALL ON TABLE public.power_editor_template_blueprints TO service_role;

GRANT ALL ON TABLE public.power_editor_template_generation_runs TO service_role;

GRANT ALL ON TABLE public.power_editor_templates TO service_role;
GRANT SELECT ON TABLE public.power_editor_templates TO authenticated;

GRANT ALL ON TABLE public.premium_users TO anon;
GRANT ALL ON TABLE public.premium_users TO authenticated;
GRANT ALL ON TABLE public.premium_users TO service_role;

GRANT ALL ON TABLE public.profile_links TO anon;
GRANT ALL ON TABLE public.profile_links TO authenticated;
GRANT ALL ON TABLE public.profile_links TO service_role;

GRANT ALL ON TABLE public.qr_analytics TO anon;
GRANT ALL ON TABLE public.qr_analytics TO authenticated;
GRANT ALL ON TABLE public.qr_analytics TO service_role;

GRANT ALL ON TABLE public.qr_analytics_daily TO anon;
GRANT ALL ON TABLE public.qr_analytics_daily TO authenticated;
GRANT ALL ON TABLE public.qr_analytics_daily TO service_role;

GRANT ALL ON TABLE public.qr_top_links TO anon;
GRANT ALL ON TABLE public.qr_top_links TO authenticated;
GRANT ALL ON TABLE public.qr_top_links TO service_role;

GRANT ALL ON TABLE public.qr_visual_versions TO anon;
GRANT ALL ON TABLE public.qr_visual_versions TO authenticated;
GRANT ALL ON TABLE public.qr_visual_versions TO service_role;

GRANT ALL ON TABLE public.template_bank TO anon;
GRANT ALL ON TABLE public.template_bank TO authenticated;
GRANT ALL ON TABLE public.template_bank TO service_role;
