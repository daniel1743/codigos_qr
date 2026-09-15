--
-- PostgreSQL database dump
--

\restrict EyXaaqSObaonnhvdaOdM4F4rETXUySWdZiPEwNGJQlI27PGN2OFIF6dbqrFny77

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

-- Started on 2026-09-14 20:00:33

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 13 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 4173 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 461 (class 1255 OID 17937)
-- Name: check_is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.check_is_super_admin(p_user_id uuid) OWNER TO postgres;

--
-- TOC entry 458 (class 1255 OID 17924)
-- Name: claim_encrypted_document_download(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.claim_encrypted_document_download(p_short_url text) RETURNS TABLE(id uuid, encrypted_file_path text, iv text, salt text, original_filename text, mime_type text, success boolean, error_message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


ALTER FUNCTION public.claim_encrypted_document_download(p_short_url text) OWNER TO postgres;

--
-- TOC entry 459 (class 1255 OID 17925)
-- Name: decrement_document_downloads(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.decrement_document_downloads(p_document_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN

  UPDATE public.encrypted_documents
  SET current_downloads =
    GREATEST(
      0,
      COALESCE(current_downloads, 0) - 1
    )
  WHERE id = p_document_id;

END;
$$;


ALTER FUNCTION public.decrement_document_downloads(p_document_id uuid) OWNER TO postgres;

--
-- TOC entry 450 (class 1255 OID 17762)
-- Name: generate_invitation_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.generate_invitation_code() OWNER TO postgres;

--
-- TOC entry 4178 (class 0 OID 0)
-- Dependencies: 450
-- Name: FUNCTION generate_invitation_code(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.generate_invitation_code() IS 'Generate a unique invitation code';


--
-- TOC entry 447 (class 1255 OID 17548)
-- Name: generate_profile_public_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.generate_profile_public_id() OWNER TO postgres;

--
-- TOC entry 457 (class 1255 OID 17923)
-- Name: get_encrypted_document_delivery_secret(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_encrypted_document_delivery_secret(p_short_url text) RETURNS TABLE(id uuid, encrypted_file_path text, iv text, salt text, password_hash text, password_required boolean, original_filename text, mime_type text, revoked boolean, expire_at timestamp with time zone, max_downloads integer, current_downloads integer, one_time_download boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


ALTER FUNCTION public.get_encrypted_document_delivery_secret(p_short_url text) OWNER TO postgres;

--
-- TOC entry 456 (class 1255 OID 17922)
-- Name: get_encrypted_document_metadata(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_encrypted_document_metadata(p_short_url text) RETURNS TABLE(id uuid, name text, original_filename text, file_type text, file_size_bytes bigint, mime_type text, encryption_level text, password_required boolean, expire_at timestamp with time zone, max_downloads integer, current_downloads integer, one_time_download boolean, revoked boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


ALTER FUNCTION public.get_encrypted_document_metadata(p_short_url text) OWNER TO postgres;

--
-- TOC entry 455 (class 1255 OID 17914)
-- Name: increment_document_downloads(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_document_downloads(p_document_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.encrypted_documents
  SET current_downloads = current_downloads + 1,
      last_accessed_at = NOW()
  WHERE id = p_document_id;
END;
$$;


ALTER FUNCTION public.increment_document_downloads(p_document_id uuid) OWNER TO postgres;

--
-- TOC entry 449 (class 1255 OID 17602)
-- Name: increment_scan_count(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_scan_count(p_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE profiles
    SET scan_count = scan_count + 1
    WHERE id = p_id;
END;
$$;


ALTER FUNCTION public.increment_scan_count(p_id uuid) OWNER TO postgres;

--
-- TOC entry 460 (class 1255 OID 17926)
-- Name: log_document_access(uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_document_access(p_document_id uuid, p_success boolean, p_user_agent text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


ALTER FUNCTION public.log_document_access(p_document_id uuid, p_success boolean, p_user_agent text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 318 (class 1259 OID 17479)
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.profiles OWNER TO postgres;

--
-- TOC entry 4186 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_gradient; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_gradient IS 'Advanced gradient configuration for Premium QR codes';


--
-- TOC entry 4187 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_dots_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_dots_type IS 'Style of QR dots/modules (square, rounded, dots, classy, extra-rounded)';


--
-- TOC entry 4188 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_corners_square_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_corners_square_type IS 'Style of corner squares';


--
-- TOC entry 4189 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_corners_dot_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_corners_dot_type IS 'Style of corner dots';


--
-- TOC entry 4190 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_effect; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_effect IS 'Visual effect applied to QR (neon, glow)';


--
-- TOC entry 4191 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_demo_logo_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_demo_logo_id IS 'ID of demo logo if using Premium demo logos';


--
-- TOC entry 4192 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_corners_square_color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_corners_square_color IS 'Default color for the three QR corner finder squares';


--
-- TOC entry 4193 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_corners_dot_color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_corners_dot_color IS 'Default color for the inner QR corner dots';


--
-- TOC entry 4194 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_corner_top_left_color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_corner_top_left_color IS 'Top-left QR finder square custom color';


--
-- TOC entry 4195 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_corner_top_right_color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_corner_top_right_color IS 'Top-right QR finder square custom color';


--
-- TOC entry 4196 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_corner_bottom_left_color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_corner_bottom_left_color IS 'Bottom-left QR finder square custom color';


--
-- TOC entry 4197 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.qr_frame_style; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.qr_frame_style IS 'Decorative QR frame style: plain, stamp, badge, phone, tag, bottle';


--
-- TOC entry 4198 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.social_cover_style; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.social_cover_style IS 'Premium visual model used by social cover links.';


--
-- TOC entry 4199 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.social_cover_avatar_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.social_cover_avatar_enabled IS 'Use profile avatar as the social cover badge when available.';


--
-- TOC entry 4200 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.social_cover_height; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.social_cover_height IS 'Height in pixels for premium social cover links.';


--
-- TOC entry 4201 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.social_cover_width; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.social_cover_width IS 'Width percentage for premium social cover links.';


--
-- TOC entry 4202 (class 0 OID 0)
-- Dependencies: 318
-- Name: COLUMN profiles.banner_fusion_strength; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.banner_fusion_strength IS 'Strength from 0 to 100 for the visual transition between banner and profile background.';


--
-- TOC entry 465 (class 1255 OID 18478)
-- Name: patch_profile_basic_template_config(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb) RETURNS public.profiles
    LANGUAGE plpgsql
    SET search_path TO 'public'
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


ALTER FUNCTION public.patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb) OWNER TO postgres;

--
-- TOC entry 464 (class 1255 OID 18258)
-- Name: power_editor_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.power_editor_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.power_editor_set_updated_at() OWNER TO postgres;

--
-- TOC entry 4205 (class 0 OID 0)
-- Dependencies: 464
-- Name: FUNCTION power_editor_set_updated_at(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.power_editor_set_updated_at() IS 'Managed by Cripqer Power Editor draft persistence V4';


--
-- TOC entry 448 (class 1255 OID 17552)
-- Name: prevent_profile_public_id_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.prevent_profile_public_id_change() OWNER TO postgres;

--
-- TOC entry 467 (class 1255 OID 18785)
-- Name: publish_profile_canonical_snapshot(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb) RETURNS public.profiles
    LANGUAGE plpgsql
    SET search_path TO 'public'
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


ALTER FUNCTION public.publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb) OWNER TO postgres;

--
-- TOC entry 451 (class 1255 OID 17763)
-- Name: redeem_invitation_code(text, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

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
  SET current_uses = current_uses + 1
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'premium_id', v_premium_id,
    'tier', v_invitation.tier,
    'expires_at', v_expires_at
  );
END;
$$;


ALTER FUNCTION public.redeem_invitation_code(p_code text, p_user_id uuid, p_email text) OWNER TO postgres;

--
-- TOC entry 4209 (class 0 OID 0)
-- Dependencies: 451
-- Name: FUNCTION redeem_invitation_code(p_code text, p_user_id uuid, p_email text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.redeem_invitation_code(p_code text, p_user_id uuid, p_email text) IS 'Redeem an invitation code to grant Premium access';


--
-- TOC entry 466 (class 1255 OID 18479)
-- Name: set_profile_canonical_editor_config(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb) RETURNS public.profiles
    LANGUAGE plpgsql
    SET search_path TO 'public'
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


ALTER FUNCTION public.set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb) OWNER TO postgres;

--
-- TOC entry 446 (class 1255 OID 17478)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- TOC entry 453 (class 1255 OID 17796)
-- Name: track_link_click(uuid, uuid, text, text, numeric, numeric, text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) OWNER TO postgres;

--
-- TOC entry 4213 (class 0 OID 0)
-- Dependencies: 453
-- Name: FUNCTION track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) IS 'Track a link click event with geolocation and device info';


--
-- TOC entry 452 (class 1255 OID 17795)
-- Name: track_page_view(uuid, text, text, numeric, numeric, text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) OWNER TO postgres;

--
-- TOC entry 4215 (class 0 OID 0)
-- Dependencies: 452
-- Name: FUNCTION track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) IS 'Track a page view event with geolocation and device info';


--
-- TOC entry 454 (class 1255 OID 17824)
-- Name: update_demo_logos_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_demo_logos_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_demo_logos_updated_at() OWNER TO postgres;

--
-- TOC entry 462 (class 1255 OID 17981)
-- Name: update_template_bank_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_template_bank_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_template_bank_updated_at() OWNER TO postgres;

--
-- TOC entry 463 (class 1255 OID 18014)
-- Name: validate_template_state_transition(); Type: FUNCTION; Schema: public; Owner: postgres
--

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


ALTER FUNCTION public.validate_template_state_transition() OWNER TO postgres;

--
-- TOC entry 321 (class 1259 OID 17672)
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'admin'::text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT admin_users_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text])))
);


ALTER TABLE public.admin_users OWNER TO postgres;

--
-- TOC entry 4220 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE admin_users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.admin_users IS 'Users with administrative privileges for Template Factory and other admin features';


--
-- TOC entry 327 (class 1259 OID 17806)
-- Name: demo_logos; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.demo_logos OWNER TO postgres;

--
-- TOC entry 4222 (class 0 OID 0)
-- Dependencies: 327
-- Name: TABLE demo_logos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.demo_logos IS 'Demo logos library for Premium QR codes';


--
-- TOC entry 4223 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN demo_logos.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.demo_logos.category IS 'Logo category: business, food, beauty, tech, creative';


--
-- TOC entry 4224 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN demo_logos.tier; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.demo_logos.tier IS 'Access tier: free or premium';


--
-- TOC entry 329 (class 1259 OID 17895)
-- Name: document_access_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    ip_address text,
    user_agent text,
    success boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.document_access_logs OWNER TO postgres;

--
-- TOC entry 328 (class 1259 OID 17863)
-- Name: encrypted_documents; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.encrypted_documents OWNER TO postgres;

--
-- TOC entry 323 (class 1259 OID 17727)
-- Name: invitation_codes; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.invitation_codes OWNER TO postgres;

--
-- TOC entry 4228 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE invitation_codes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.invitation_codes IS 'Invitation codes to grant Premium access';


--
-- TOC entry 335 (class 1259 OID 19173)
-- Name: pages; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.pages OWNER TO postgres;

--
-- TOC entry 332 (class 1259 OID 18276)
-- Name: power_editor_projects; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.power_editor_projects OWNER TO postgres;

--
-- TOC entry 333 (class 1259 OID 18366)
-- Name: power_editor_template_blueprints; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.power_editor_template_blueprints OWNER TO postgres;

--
-- TOC entry 334 (class 1259 OID 18381)
-- Name: power_editor_template_generation_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.power_editor_template_generation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    generator_version text NOT NULL,
    seed text NOT NULL,
    template_count integer NOT NULL,
    audit jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT power_editor_template_generation_runs_template_count_check CHECK ((template_count > 0))
);


ALTER TABLE public.power_editor_template_generation_runs OWNER TO postgres;

--
-- TOC entry 331 (class 1259 OID 18259)
-- Name: power_editor_templates; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.power_editor_templates OWNER TO postgres;

--
-- TOC entry 322 (class 1259 OID 17699)
-- Name: premium_users; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.premium_users OWNER TO postgres;

--
-- TOC entry 4240 (class 0 OID 0)
-- Dependencies: 322
-- Name: TABLE premium_users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.premium_users IS 'Users with Premium access';


--
-- TOC entry 319 (class 1259 OID 17506)
-- Name: profile_links; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.profile_links OWNER TO postgres;

--
-- TOC entry 4242 (class 0 OID 0)
-- Dependencies: 319
-- Name: COLUMN profile_links.social_cover_image_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profile_links.social_cover_image_url IS 'Optional image used as the premium social cover badge for this link.';


--
-- TOC entry 324 (class 1259 OID 17764)
-- Name: qr_analytics; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.qr_analytics OWNER TO postgres;

--
-- TOC entry 4244 (class 0 OID 0)
-- Dependencies: 324
-- Name: TABLE qr_analytics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.qr_analytics IS 'Detailed analytics for QR code tracking';


--
-- TOC entry 4245 (class 0 OID 0)
-- Dependencies: 324
-- Name: COLUMN qr_analytics.event_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.qr_analytics.event_type IS 'Type of event: view (page view) or link_click';


--
-- TOC entry 4246 (class 0 OID 0)
-- Dependencies: 324
-- Name: COLUMN qr_analytics.session_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.qr_analytics.session_id IS 'Session identifier to group events from same visit';


--
-- TOC entry 4247 (class 0 OID 0)
-- Dependencies: 324
-- Name: COLUMN qr_analytics.ip_hash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.qr_analytics.ip_hash IS 'Hashed IP address for privacy-preserving unique visitor count';


--
-- TOC entry 325 (class 1259 OID 17797)
-- Name: qr_analytics_daily; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.qr_analytics_daily AS
 SELECT profile_id,
    date(created_at) AS date,
    event_type,
    count(*) AS count,
    count(DISTINCT session_id) AS unique_sessions,
    count(DISTINCT ip_hash) AS unique_visitors
   FROM public.qr_analytics
  GROUP BY profile_id, (date(created_at)), event_type;


ALTER VIEW public.qr_analytics_daily OWNER TO postgres;

--
-- TOC entry 326 (class 1259 OID 17801)
-- Name: qr_top_links; Type: VIEW; Schema: public; Owner: postgres
--

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


ALTER VIEW public.qr_top_links OWNER TO postgres;

--
-- TOC entry 320 (class 1259 OID 17583)
-- Name: qr_visual_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.qr_visual_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    foreground_color text DEFAULT '#000000'::text,
    background_color text DEFAULT '#ffffff'::text,
    logo_url text,
    logo_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.qr_visual_versions OWNER TO postgres;

--
-- TOC entry 330 (class 1259 OID 17954)
-- Name: template_bank; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.template_bank OWNER TO postgres;

--
-- TOC entry 4252 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE template_bank; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.template_bank IS 'Template Factory private library with administrative workflow support';


--
-- TOC entry 4253 (class 0 OID 0)
-- Dependencies: 330
-- Name: COLUMN template_bank.publication_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.template_bank.publication_status IS 'Workflow state: GENERATED_PRIVATE -> REVIEW_PENDING -> APPROVED -> PUBLIC';


--
-- TOC entry 4254 (class 0 OID 0)
-- Dependencies: 330
-- Name: COLUMN template_bank.generation_source; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.template_bank.generation_source IS 'Source of template: manual, generator_v1, etc';


--
-- TOC entry 4255 (class 0 OID 0)
-- Dependencies: 330
-- Name: COLUMN template_bank.batch_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.template_bank.batch_id IS 'Batch identifier for templates generated together by the automatic generator';


--
-- TOC entry 4256 (class 0 OID 0)
-- Dependencies: 330
-- Name: COLUMN template_bank.qa_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.template_bank.qa_score IS 'Automated QA score from 0.00 to 1.00';


--
-- TOC entry 3841 (class 2606 OID 17686)
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- TOC entry 3843 (class 2606 OID 17682)
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- TOC entry 3845 (class 2606 OID 17684)
-- Name: admin_users admin_users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_key UNIQUE (user_id);


--
-- TOC entry 3871 (class 2606 OID 17817)
-- Name: demo_logos demo_logos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demo_logos
    ADD CONSTRAINT demo_logos_pkey PRIMARY KEY (id);


--
-- TOC entry 3879 (class 2606 OID 17904)
-- Name: document_access_logs document_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3875 (class 2606 OID 17877)
-- Name: encrypted_documents encrypted_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encrypted_documents
    ADD CONSTRAINT encrypted_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3877 (class 2606 OID 17879)
-- Name: encrypted_documents encrypted_documents_short_url_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encrypted_documents
    ADD CONSTRAINT encrypted_documents_short_url_key UNIQUE (short_url);


--
-- TOC entry 3858 (class 2606 OID 17743)
-- Name: invitation_codes invitation_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_code_key UNIQUE (code);


--
-- TOC entry 3860 (class 2606 OID 17741)
-- Name: invitation_codes invitation_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 3911 (class 2606 OID 19187)
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- TOC entry 3913 (class 2606 OID 19189)
-- Name: pages pages_public_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_public_id_key UNIQUE (public_id);


--
-- TOC entry 3899 (class 2606 OID 18287)
-- Name: power_editor_projects power_editor_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.power_editor_projects
    ADD CONSTRAINT power_editor_projects_pkey PRIMARY KEY (id);


--
-- TOC entry 3902 (class 2606 OID 18375)
-- Name: power_editor_template_blueprints power_editor_template_blueprints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.power_editor_template_blueprints
    ADD CONSTRAINT power_editor_template_blueprints_pkey PRIMARY KEY (blueprint_key);


--
-- TOC entry 3905 (class 2606 OID 18390)
-- Name: power_editor_template_generation_runs power_editor_template_generation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.power_editor_template_generation_runs
    ADD CONSTRAINT power_editor_template_generation_runs_pkey PRIMARY KEY (id);


--
-- TOC entry 3894 (class 2606 OID 18270)
-- Name: power_editor_templates power_editor_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.power_editor_templates
    ADD CONSTRAINT power_editor_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 3852 (class 2606 OID 17711)
-- Name: premium_users premium_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.premium_users
    ADD CONSTRAINT premium_users_pkey PRIMARY KEY (id);


--
-- TOC entry 3854 (class 2606 OID 17713)
-- Name: premium_users premium_users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.premium_users
    ADD CONSTRAINT premium_users_user_id_key UNIQUE (user_id);


--
-- TOC entry 3837 (class 2606 OID 17517)
-- Name: profile_links profile_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_links
    ADD CONSTRAINT profile_links_pkey PRIMARY KEY (id);


--
-- TOC entry 3831 (class 2606 OID 17497)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 3833 (class 2606 OID 17499)
-- Name: profiles profiles_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_slug_key UNIQUE (slug);


--
-- TOC entry 3869 (class 2606 OID 17774)
-- Name: qr_analytics qr_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_analytics
    ADD CONSTRAINT qr_analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 3839 (class 2606 OID 17594)
-- Name: qr_visual_versions qr_visual_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_visual_versions
    ADD CONSTRAINT qr_visual_versions_pkey PRIMARY KEY (id);


--
-- TOC entry 3890 (class 2606 OID 17967)
-- Name: template_bank template_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_bank
    ADD CONSTRAINT template_bank_pkey PRIMARY KEY (id);


--
-- TOC entry 3846 (class 1259 OID 17698)
-- Name: idx_admin_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_users_email ON public.admin_users USING btree (email);


--
-- TOC entry 3847 (class 1259 OID 17697)
-- Name: idx_admin_users_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_users_user_id ON public.admin_users USING btree (user_id);


--
-- TOC entry 3872 (class 1259 OID 17818)
-- Name: idx_demo_logos_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demo_logos_category ON public.demo_logos USING btree (category);


--
-- TOC entry 3873 (class 1259 OID 17819)
-- Name: idx_demo_logos_tier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demo_logos_tier ON public.demo_logos USING btree (tier);


--
-- TOC entry 3855 (class 1259 OID 17749)
-- Name: idx_invitation_codes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invitation_codes_code ON public.invitation_codes USING btree (code);


--
-- TOC entry 3856 (class 1259 OID 17750)
-- Name: idx_invitation_codes_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invitation_codes_is_active ON public.invitation_codes USING btree (is_active);


--
-- TOC entry 3906 (class 1259 OID 19201)
-- Name: idx_pages_owner_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_owner_user_id ON public.pages USING btree (owner_user_id);


--
-- TOC entry 3907 (class 1259 OID 19202)
-- Name: idx_pages_profile_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_profile_id ON public.pages USING btree (profile_id);


--
-- TOC entry 3908 (class 1259 OID 19203)
-- Name: idx_pages_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pages_published ON public.pages USING btree (published);


--
-- TOC entry 3909 (class 1259 OID 19200)
-- Name: idx_pages_slug_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_pages_slug_unique ON public.pages USING btree (slug) WHERE (slug IS NOT NULL);


--
-- TOC entry 3895 (class 1259 OID 18305)
-- Name: idx_power_editor_projects_owner_updated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_power_editor_projects_owner_updated ON public.power_editor_projects USING btree (owner_user_id, updated_at DESC);


--
-- TOC entry 3896 (class 1259 OID 18306)
-- Name: idx_power_editor_projects_profile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_power_editor_projects_profile ON public.power_editor_projects USING btree (profile_id);


--
-- TOC entry 3897 (class 1259 OID 18307)
-- Name: idx_power_editor_projects_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_power_editor_projects_template ON public.power_editor_projects USING btree (template_id);


--
-- TOC entry 3900 (class 1259 OID 18391)
-- Name: idx_power_editor_template_blueprints_template_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_power_editor_template_blueprints_template_id ON public.power_editor_template_blueprints USING btree (template_id);


--
-- TOC entry 3903 (class 1259 OID 18392)
-- Name: idx_power_editor_template_generation_runs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_power_editor_template_generation_runs_created_at ON public.power_editor_template_generation_runs USING btree (created_at DESC);


--
-- TOC entry 3891 (class 1259 OID 18304)
-- Name: idx_power_editor_templates_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_power_editor_templates_owner ON public.power_editor_templates USING btree (owner_user_id);


--
-- TOC entry 3892 (class 1259 OID 18303)
-- Name: idx_power_editor_templates_status_updated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_power_editor_templates_status_updated ON public.power_editor_templates USING btree (status, updated_at DESC);


--
-- TOC entry 3848 (class 1259 OID 17725)
-- Name: idx_premium_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_premium_users_email ON public.premium_users USING btree (email);


--
-- TOC entry 3849 (class 1259 OID 17726)
-- Name: idx_premium_users_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_premium_users_expires_at ON public.premium_users USING btree (expires_at);


--
-- TOC entry 3850 (class 1259 OID 17724)
-- Name: idx_premium_users_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_premium_users_user_id ON public.premium_users USING btree (user_id);


--
-- TOC entry 3834 (class 1259 OID 17526)
-- Name: idx_profile_links_profile_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_links_profile_id ON public.profile_links USING btree (profile_id);


--
-- TOC entry 3835 (class 1259 OID 17527)
-- Name: idx_profile_links_profile_id_sort_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_links_profile_id_sort_order ON public.profile_links USING btree (profile_id, sort_order);


--
-- TOC entry 3826 (class 1259 OID 17611)
-- Name: idx_profiles_demo_logo_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_demo_logo_id ON public.profiles USING btree (qr_demo_logo_id);


--
-- TOC entry 3827 (class 1259 OID 17550)
-- Name: idx_profiles_public_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_profiles_public_id_unique ON public.profiles USING btree (public_id);


--
-- TOC entry 3828 (class 1259 OID 17524)
-- Name: idx_profiles_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_slug ON public.profiles USING btree (slug);


--
-- TOC entry 3829 (class 1259 OID 17525)
-- Name: idx_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_user_id ON public.profiles USING btree (user_id);


--
-- TOC entry 3861 (class 1259 OID 17786)
-- Name: idx_qr_analytics_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_analytics_created_at ON public.qr_analytics USING btree (created_at DESC);


--
-- TOC entry 3862 (class 1259 OID 17787)
-- Name: idx_qr_analytics_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_analytics_event_type ON public.qr_analytics USING btree (event_type);


--
-- TOC entry 3863 (class 1259 OID 17790)
-- Name: idx_qr_analytics_link_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_analytics_link_id ON public.qr_analytics USING btree (link_id) WHERE (link_id IS NOT NULL);


--
-- TOC entry 3864 (class 1259 OID 17791)
-- Name: idx_qr_analytics_profile_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_analytics_profile_date ON public.qr_analytics USING btree (profile_id, created_at DESC);


--
-- TOC entry 3865 (class 1259 OID 17788)
-- Name: idx_qr_analytics_profile_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_analytics_profile_event ON public.qr_analytics USING btree (profile_id, event_type);


--
-- TOC entry 3866 (class 1259 OID 17785)
-- Name: idx_qr_analytics_profile_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_analytics_profile_id ON public.qr_analytics USING btree (profile_id);


--
-- TOC entry 3867 (class 1259 OID 17789)
-- Name: idx_qr_analytics_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_analytics_session_id ON public.qr_analytics USING btree (session_id);


--
-- TOC entry 3880 (class 1259 OID 18008)
-- Name: idx_template_bank_approved_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_template_bank_approved_by ON public.template_bank USING btree (approved_by);


--
-- TOC entry 3881 (class 1259 OID 18006)
-- Name: idx_template_bank_batch_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_template_bank_batch_id ON public.template_bank USING btree (batch_id);


--
-- TOC entry 3882 (class 1259 OID 18004)
-- Name: idx_template_bank_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_template_bank_category ON public.template_bank USING btree (category);


--
-- TOC entry 3883 (class 1259 OID 17975)
-- Name: idx_template_bank_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_template_bank_created_by ON public.template_bank USING btree (created_by);


--
-- TOC entry 3884 (class 1259 OID 18005)
-- Name: idx_template_bank_industry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_template_bank_industry ON public.template_bank USING btree (industry);


--
-- TOC entry 3885 (class 1259 OID 17974)
-- Name: idx_template_bank_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_template_bank_public ON public.template_bank USING btree (is_public);


--
-- TOC entry 3886 (class 1259 OID 18003)
-- Name: idx_template_bank_publication_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_template_bank_publication_status ON public.template_bank USING btree (publication_status);


--
-- TOC entry 3887 (class 1259 OID 17973)
-- Name: idx_template_bank_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_template_bank_type ON public.template_bank USING btree (template_type);


--
-- TOC entry 3888 (class 1259 OID 18007)
-- Name: idx_template_bank_validation_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_template_bank_validation_status ON public.template_bank USING btree (validation_status);


--
-- TOC entry 3937 (class 2620 OID 17553)
-- Name: profiles prevent_profiles_public_id_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER prevent_profiles_public_id_change BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_public_id_change();


--
-- TOC entry 3940 (class 2620 OID 17825)
-- Name: demo_logos set_demo_logos_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_demo_logos_updated_at BEFORE UPDATE ON public.demo_logos FOR EACH ROW EXECUTE FUNCTION public.update_demo_logos_updated_at();


--
-- TOC entry 3946 (class 2620 OID 19204)
-- Name: pages set_pages_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3944 (class 2620 OID 18309)
-- Name: power_editor_projects set_power_editor_projects_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_power_editor_projects_updated_at BEFORE UPDATE ON public.power_editor_projects FOR EACH ROW EXECUTE FUNCTION public.power_editor_set_updated_at();


--
-- TOC entry 3945 (class 2620 OID 18393)
-- Name: power_editor_template_blueprints set_power_editor_template_blueprints_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_power_editor_template_blueprints_updated_at BEFORE UPDATE ON public.power_editor_template_blueprints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3943 (class 2620 OID 18308)
-- Name: power_editor_templates set_power_editor_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_power_editor_templates_updated_at BEFORE UPDATE ON public.power_editor_templates FOR EACH ROW EXECUTE FUNCTION public.power_editor_set_updated_at();


--
-- TOC entry 3939 (class 2620 OID 17523)
-- Name: profile_links set_profile_links_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_profile_links_updated_at BEFORE UPDATE ON public.profile_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3938 (class 2620 OID 17505)
-- Name: profiles set_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 3941 (class 2620 OID 17982)
-- Name: template_bank template_bank_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER template_bank_updated_at BEFORE UPDATE ON public.template_bank FOR EACH ROW EXECUTE FUNCTION public.update_template_bank_updated_at();


--
-- TOC entry 3942 (class 2620 OID 18015)
-- Name: template_bank validate_template_state_transition_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_template_state_transition_trigger BEFORE UPDATE ON public.template_bank FOR EACH ROW WHEN ((old.publication_status IS DISTINCT FROM new.publication_status)) EXECUTE FUNCTION public.validate_template_state_transition();


--
-- TOC entry 3919 (class 2606 OID 17692)
-- Name: admin_users admin_users_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- TOC entry 3920 (class 2606 OID 17687)
-- Name: admin_users admin_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3927 (class 2606 OID 17905)
-- Name: document_access_logs document_access_logs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_access_logs
    ADD CONSTRAINT document_access_logs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.encrypted_documents(id) ON DELETE CASCADE;


--
-- TOC entry 3926 (class 2606 OID 17880)
-- Name: encrypted_documents encrypted_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encrypted_documents
    ADD CONSTRAINT encrypted_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3914 (class 2606 OID 17826)
-- Name: profiles fk_profiles_demo_logo; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_profiles_demo_logo FOREIGN KEY (qr_demo_logo_id) REFERENCES public.demo_logos(id) ON DELETE SET NULL;


--
-- TOC entry 3923 (class 2606 OID 17744)
-- Name: invitation_codes invitation_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitation_codes
    ADD CONSTRAINT invitation_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- TOC entry 3935 (class 2606 OID 19190)
-- Name: pages pages_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id);


--
-- TOC entry 3936 (class 2606 OID 19195)
-- Name: pages pages_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- TOC entry 3931 (class 2606 OID 18288)
-- Name: power_editor_projects power_editor_projects_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.power_editor_projects
    ADD CONSTRAINT power_editor_projects_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3932 (class 2606 OID 18293)
-- Name: power_editor_projects power_editor_projects_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.power_editor_projects
    ADD CONSTRAINT power_editor_projects_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 3933 (class 2606 OID 18298)
-- Name: power_editor_projects power_editor_projects_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.power_editor_projects
    ADD CONSTRAINT power_editor_projects_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.power_editor_templates(id) ON DELETE SET NULL;


--
-- TOC entry 3934 (class 2606 OID 18376)
-- Name: power_editor_template_blueprints power_editor_template_blueprints_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.power_editor_template_blueprints
    ADD CONSTRAINT power_editor_template_blueprints_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.power_editor_templates(id) ON DELETE CASCADE;


--
-- TOC entry 3930 (class 2606 OID 18271)
-- Name: power_editor_templates power_editor_templates_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.power_editor_templates
    ADD CONSTRAINT power_editor_templates_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- TOC entry 3921 (class 2606 OID 17719)
-- Name: premium_users premium_users_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.premium_users
    ADD CONSTRAINT premium_users_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);


--
-- TOC entry 3922 (class 2606 OID 17714)
-- Name: premium_users premium_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.premium_users
    ADD CONSTRAINT premium_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3917 (class 2606 OID 17518)
-- Name: profile_links profile_links_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_links
    ADD CONSTRAINT profile_links_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 3915 (class 2606 OID 17852)
-- Name: profiles profiles_hero_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_hero_link_id_fkey FOREIGN KEY (hero_link_id) REFERENCES public.profile_links(id) ON DELETE SET NULL;


--
-- TOC entry 3916 (class 2606 OID 17500)
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 3924 (class 2606 OID 17780)
-- Name: qr_analytics qr_analytics_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_analytics
    ADD CONSTRAINT qr_analytics_link_id_fkey FOREIGN KEY (link_id) REFERENCES public.profile_links(id) ON DELETE SET NULL;


--
-- TOC entry 3925 (class 2606 OID 17775)
-- Name: qr_analytics qr_analytics_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_analytics
    ADD CONSTRAINT qr_analytics_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 3918 (class 2606 OID 17595)
-- Name: qr_visual_versions qr_visual_versions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qr_visual_versions
    ADD CONSTRAINT qr_visual_versions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 3928 (class 2606 OID 17998)
-- Name: template_bank template_bank_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_bank
    ADD CONSTRAINT template_bank_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- TOC entry 3929 (class 2606 OID 17968)
-- Name: template_bank template_bank_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.template_bank
    ADD CONSTRAINT template_bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4143 (class 3256 OID 17823)
-- Name: demo_logos Admin can delete demo logos; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can delete demo logos" ON public.demo_logos FOR DELETE USING ((auth.uid() IN ( SELECT admin_users.user_id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));


--
-- TOC entry 4134 (class 3256 OID 17757)
-- Name: premium_users Admin can delete premium users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can delete premium users" ON public.premium_users FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- TOC entry 4157 (class 3256 OID 18013)
-- Name: template_bank Admin can delete templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can delete templates" ON public.template_bank FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- TOC entry 4141 (class 3256 OID 17821)
-- Name: demo_logos Admin can insert demo logos; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can insert demo logos" ON public.demo_logos FOR INSERT WITH CHECK ((auth.uid() IN ( SELECT admin_users.user_id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));


--
-- TOC entry 4135 (class 3256 OID 17760)
-- Name: invitation_codes Admin can insert invitation codes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can insert invitation codes" ON public.invitation_codes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- TOC entry 4132 (class 3256 OID 17755)
-- Name: premium_users Admin can insert premium users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can insert premium users" ON public.premium_users FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- TOC entry 4139 (class 3256 OID 17794)
-- Name: qr_analytics Admin can read all analytics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can read all analytics" ON public.qr_analytics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE ((admin_users.user_id = auth.uid()) AND (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));


--
-- TOC entry 4123 (class 3256 OID 17758)
-- Name: invitation_codes Admin can read all invitation codes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can read all invitation codes" ON public.invitation_codes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- TOC entry 4130 (class 3256 OID 17753)
-- Name: premium_users Admin can read all premium users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can read all premium users" ON public.premium_users FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- TOC entry 4142 (class 3256 OID 17822)
-- Name: demo_logos Admin can update demo logos; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can update demo logos" ON public.demo_logos FOR UPDATE USING ((auth.uid() IN ( SELECT admin_users.user_id
   FROM public.admin_users
  WHERE (admin_users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))));


--
-- TOC entry 4136 (class 3256 OID 17761)
-- Name: invitation_codes Admin can update invitation codes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can update invitation codes" ON public.invitation_codes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- TOC entry 4133 (class 3256 OID 17756)
-- Name: premium_users Admin can update premium users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can update premium users" ON public.premium_users FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- TOC entry 4156 (class 3256 OID 18012)
-- Name: template_bank Admin can update templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can update templates" ON public.template_bank FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- TOC entry 4155 (class 3256 OID 18011)
-- Name: template_bank Admin can view all templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can view all templates" ON public.template_bank FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid()))));


--
-- TOC entry 4138 (class 3256 OID 17793)
-- Name: qr_analytics Anyone can insert analytics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can insert analytics" ON public.qr_analytics FOR INSERT WITH CHECK (true);


--
-- TOC entry 4124 (class 3256 OID 17759)
-- Name: invitation_codes Anyone can read active codes for validation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read active codes for validation" ON public.invitation_codes FOR SELECT USING ((is_active = true));


--
-- TOC entry 4140 (class 3256 OID 17820)
-- Name: demo_logos Anyone can read demo logos; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read demo logos" ON public.demo_logos FOR SELECT USING (true);


--
-- TOC entry 4147 (class 3256 OID 17839)
-- Name: demo_logos Owner email can manage demo logos; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owner email can manage demo logos" ON public.demo_logos USING ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text)) WITH CHECK ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text));


--
-- TOC entry 4146 (class 3256 OID 17838)
-- Name: invitation_codes Owner email can manage invitation codes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owner email can manage invitation codes" ON public.invitation_codes USING ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text)) WITH CHECK ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text));


--
-- TOC entry 4145 (class 3256 OID 17837)
-- Name: premium_users Owner email can manage premium users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owner email can manage premium users" ON public.premium_users USING ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text)) WITH CHECK ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text));


--
-- TOC entry 4144 (class 3256 OID 17836)
-- Name: admin_users Owner email can read admin users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owner email can read admin users" ON public.admin_users FOR SELECT USING ((lower((auth.jwt() ->> 'email'::text)) = 'falcondaniel37@gmail.com'::text));


--
-- TOC entry 4153 (class 3256 OID 18009)
-- Name: template_bank Public templates visible to everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public templates visible to everyone" ON public.template_bank FOR SELECT USING (((publication_status = 'PUBLIC'::text) AND (is_public = true)));


--
-- TOC entry 4152 (class 3256 OID 17943)
-- Name: admin_users Super admin can insert admin users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Super admin can insert admin users" ON public.admin_users FOR INSERT WITH CHECK (public.check_is_super_admin(auth.uid()));


--
-- TOC entry 4151 (class 3256 OID 17942)
-- Name: admin_users Super admin can read all admin users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Super admin can read all admin users" ON public.admin_users FOR SELECT USING ((public.check_is_super_admin(auth.uid()) OR (user_id = auth.uid())));


--
-- TOC entry 4131 (class 3256 OID 17754)
-- Name: premium_users User can read own premium status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "User can read own premium status" ON public.premium_users FOR SELECT USING ((user_id = auth.uid()));


--
-- TOC entry 4148 (class 3256 OID 17887)
-- Name: encrypted_documents Users can create own encrypted documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create own encrypted documents" ON public.encrypted_documents FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- TOC entry 4127 (class 3256 OID 17978)
-- Name: template_bank Users can create templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create templates" ON public.template_bank FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- TOC entry 4129 (class 3256 OID 17980)
-- Name: template_bank Users can delete their own templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own templates" ON public.template_bank FOR DELETE USING ((auth.uid() = created_by));


--
-- TOC entry 4125 (class 3256 OID 17600)
-- Name: qr_visual_versions Users can insert their own qr visual versions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own qr visual versions" ON public.qr_visual_versions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = qr_visual_versions.profile_id) AND (p.user_id = auth.uid())))));


--
-- TOC entry 4149 (class 3256 OID 17910)
-- Name: encrypted_documents Users can manage their own encrypted documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own encrypted documents" ON public.encrypted_documents TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4137 (class 3256 OID 17792)
-- Name: qr_analytics Users can read their own analytics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their own analytics" ON public.qr_analytics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = qr_analytics.profile_id) AND (profiles.user_id = auth.uid())))));


--
-- TOC entry 4126 (class 3256 OID 17601)
-- Name: qr_visual_versions Users can read their own qr visual versions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their own qr visual versions" ON public.qr_visual_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = qr_visual_versions.profile_id) AND (p.user_id = auth.uid())))));


--
-- TOC entry 4128 (class 3256 OID 17979)
-- Name: template_bank Users can update their own templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own templates" ON public.template_bank FOR UPDATE USING ((auth.uid() = created_by));


--
-- TOC entry 4150 (class 3256 OID 17911)
-- Name: document_access_logs Users can view logs of their own documents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view logs of their own documents" ON public.document_access_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.encrypted_documents
  WHERE ((encrypted_documents.id = document_access_logs.document_id) AND (encrypted_documents.user_id = auth.uid())))));


--
-- TOC entry 4154 (class 3256 OID 18010)
-- Name: template_bank Users can view own templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own templates" ON public.template_bank FOR SELECT USING ((auth.uid() = created_by));


--
-- TOC entry 4100 (class 0 OID 17672)
-- Dependencies: 321
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4104 (class 0 OID 17806)
-- Dependencies: 327
-- Name: demo_logos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.demo_logos ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4106 (class 0 OID 17895)
-- Dependencies: 329
-- Name: document_access_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4105 (class 0 OID 17863)
-- Dependencies: 328
-- Name: encrypted_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.encrypted_documents ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4102 (class 0 OID 17727)
-- Dependencies: 323
-- Name: invitation_codes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4121 (class 3256 OID 17537)
-- Name: profile_links owner_delete_link; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_delete_link ON public.profile_links FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.user_id = auth.uid())))));


--
-- TOC entry 4166 (class 3256 OID 19208)
-- Name: pages owner_delete_page; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_delete_page ON public.pages FOR DELETE TO authenticated USING ((auth.uid() = owner_user_id));


--
-- TOC entry 4116 (class 3256 OID 17531)
-- Name: profiles owner_delete_profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_delete_profile ON public.profiles FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 4118 (class 3256 OID 17533)
-- Name: profile_links owner_insert_link; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_insert_link ON public.profile_links FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.user_id = auth.uid())))));


--
-- TOC entry 4164 (class 3256 OID 19205)
-- Name: pages owner_insert_page; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_insert_page ON public.pages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = owner_user_id));


--
-- TOC entry 4113 (class 3256 OID 17528)
-- Name: profiles owner_insert_profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_insert_profile ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4119 (class 3256 OID 17534)
-- Name: profile_links owner_select_link; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_select_link ON public.profile_links FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.user_id = auth.uid())))));


--
-- TOC entry 4162 (class 3256 OID 19206)
-- Name: pages owner_select_page; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_select_page ON public.pages FOR SELECT TO authenticated USING ((auth.uid() = owner_user_id));


--
-- TOC entry 4114 (class 3256 OID 17529)
-- Name: profiles owner_select_profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_select_profile ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 4120 (class 3256 OID 17535)
-- Name: profile_links owner_update_link; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_update_link ON public.profile_links FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.user_id = auth.uid())))));


--
-- TOC entry 4165 (class 3256 OID 19207)
-- Name: pages owner_update_page; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_update_page ON public.pages FOR UPDATE TO authenticated USING ((auth.uid() = owner_user_id)) WITH CHECK ((auth.uid() = owner_user_id));


--
-- TOC entry 4115 (class 3256 OID 17530)
-- Name: profiles owner_update_profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_update_profile ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4161 (class 3256 OID 18312)
-- Name: power_editor_projects owners create drafts for their own profile from published templ; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "owners create drafts for their own profile from published templ" ON public.power_editor_projects FOR INSERT TO authenticated WITH CHECK (((owner_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = power_editor_projects.profile_id) AND (profiles.user_id = auth.uid())))) AND ((template_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.power_editor_templates
  WHERE ((power_editor_templates.id = power_editor_projects.template_id) AND (power_editor_templates.status = 'published'::text)))))));


--
-- TOC entry 4160 (class 3256 OID 18314)
-- Name: power_editor_projects owners delete their own power editor drafts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "owners delete their own power editor drafts" ON public.power_editor_projects FOR DELETE TO authenticated USING (((owner_user_id = auth.uid()) AND (status = 'draft'::text)));


--
-- TOC entry 4159 (class 3256 OID 18311)
-- Name: power_editor_projects owners read their own power editor projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "owners read their own power editor projects" ON public.power_editor_projects FOR SELECT TO authenticated USING ((owner_user_id = auth.uid()));


--
-- TOC entry 4163 (class 3256 OID 18313)
-- Name: power_editor_projects owners update their own power editor drafts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "owners update their own power editor drafts" ON public.power_editor_projects FOR UPDATE TO authenticated USING (((owner_user_id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'published'::text])))) WITH CHECK (((owner_user_id = auth.uid()) AND (status = ANY (ARRAY['draft'::text, 'published'::text])) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = power_editor_projects.profile_id) AND (profiles.user_id = auth.uid()))))));


--
-- TOC entry 4112 (class 0 OID 19173)
-- Dependencies: 335
-- Name: pages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4109 (class 0 OID 18276)
-- Dependencies: 332
-- Name: power_editor_projects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.power_editor_projects ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4110 (class 0 OID 18366)
-- Dependencies: 333
-- Name: power_editor_template_blueprints; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.power_editor_template_blueprints ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4111 (class 0 OID 18381)
-- Dependencies: 334
-- Name: power_editor_template_generation_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.power_editor_template_generation_runs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4108 (class 0 OID 18259)
-- Dependencies: 331
-- Name: power_editor_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.power_editor_templates ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4101 (class 0 OID 17699)
-- Dependencies: 322
-- Name: premium_users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4098 (class 0 OID 17506)
-- Dependencies: 319
-- Name: profile_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4097 (class 0 OID 17479)
-- Dependencies: 318
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4122 (class 3256 OID 17538)
-- Name: profile_links public_select_published_link; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY public_select_published_link ON public.profile_links FOR SELECT TO anon USING (((enabled = true) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = profile_links.profile_id) AND (profiles.published = true))))));


--
-- TOC entry 4117 (class 3256 OID 17532)
-- Name: profiles public_select_published_profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY public_select_published_profile ON public.profiles FOR SELECT TO anon USING ((published = true));


--
-- TOC entry 4158 (class 3256 OID 18310)
-- Name: power_editor_templates published power editor templates are readable by authenticated ; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "published power editor templates are readable by authenticated " ON public.power_editor_templates FOR SELECT TO authenticated USING ((status = 'published'::text));


--
-- TOC entry 4103 (class 0 OID 17764)
-- Dependencies: 324
-- Name: qr_analytics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.qr_analytics ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4099 (class 0 OID 17583)
-- Dependencies: 320
-- Name: qr_visual_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.qr_visual_versions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4107 (class 0 OID 17954)
-- Dependencies: 330
-- Name: template_bank; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.template_bank ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4174 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- TOC entry 4175 (class 0 OID 0)
-- Dependencies: 461
-- Name: FUNCTION check_is_super_admin(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_is_super_admin(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.check_is_super_admin(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_is_super_admin(p_user_id uuid) TO service_role;


--
-- TOC entry 4176 (class 0 OID 0)
-- Dependencies: 458
-- Name: FUNCTION claim_encrypted_document_download(p_short_url text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.claim_encrypted_document_download(p_short_url text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_encrypted_document_download(p_short_url text) TO service_role;


--
-- TOC entry 4177 (class 0 OID 0)
-- Dependencies: 459
-- Name: FUNCTION decrement_document_downloads(p_document_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.decrement_document_downloads(p_document_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.decrement_document_downloads(p_document_id uuid) TO service_role;


--
-- TOC entry 4179 (class 0 OID 0)
-- Dependencies: 450
-- Name: FUNCTION generate_invitation_code(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_invitation_code() TO anon;
GRANT ALL ON FUNCTION public.generate_invitation_code() TO authenticated;
GRANT ALL ON FUNCTION public.generate_invitation_code() TO service_role;


--
-- TOC entry 4180 (class 0 OID 0)
-- Dependencies: 447
-- Name: FUNCTION generate_profile_public_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_profile_public_id() TO anon;
GRANT ALL ON FUNCTION public.generate_profile_public_id() TO authenticated;
GRANT ALL ON FUNCTION public.generate_profile_public_id() TO service_role;


--
-- TOC entry 4181 (class 0 OID 0)
-- Dependencies: 457
-- Name: FUNCTION get_encrypted_document_delivery_secret(p_short_url text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_encrypted_document_delivery_secret(p_short_url text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_encrypted_document_delivery_secret(p_short_url text) TO service_role;


--
-- TOC entry 4182 (class 0 OID 0)
-- Dependencies: 456
-- Name: FUNCTION get_encrypted_document_metadata(p_short_url text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_encrypted_document_metadata(p_short_url text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_encrypted_document_metadata(p_short_url text) TO anon;
GRANT ALL ON FUNCTION public.get_encrypted_document_metadata(p_short_url text) TO authenticated;
GRANT ALL ON FUNCTION public.get_encrypted_document_metadata(p_short_url text) TO service_role;


--
-- TOC entry 4183 (class 0 OID 0)
-- Dependencies: 455
-- Name: FUNCTION increment_document_downloads(p_document_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.increment_document_downloads(p_document_id uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_document_downloads(p_document_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_document_downloads(p_document_id uuid) TO service_role;


--
-- TOC entry 4184 (class 0 OID 0)
-- Dependencies: 449
-- Name: FUNCTION increment_scan_count(p_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.increment_scan_count(p_id uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_scan_count(p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_scan_count(p_id uuid) TO service_role;


--
-- TOC entry 4185 (class 0 OID 0)
-- Dependencies: 460
-- Name: FUNCTION log_document_access(p_document_id uuid, p_success boolean, p_user_agent text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.log_document_access(p_document_id uuid, p_success boolean, p_user_agent text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.log_document_access(p_document_id uuid, p_success boolean, p_user_agent text) TO service_role;


--
-- TOC entry 4203 (class 0 OID 0)
-- Dependencies: 318
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- TOC entry 4204 (class 0 OID 0)
-- Dependencies: 465
-- Name: FUNCTION patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb) TO service_role;


--
-- TOC entry 4206 (class 0 OID 0)
-- Dependencies: 464
-- Name: FUNCTION power_editor_set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.power_editor_set_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION public.power_editor_set_updated_at() TO service_role;


--
-- TOC entry 4207 (class 0 OID 0)
-- Dependencies: 448
-- Name: FUNCTION prevent_profile_public_id_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_profile_public_id_change() TO anon;
GRANT ALL ON FUNCTION public.prevent_profile_public_id_change() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_profile_public_id_change() TO service_role;


--
-- TOC entry 4208 (class 0 OID 0)
-- Dependencies: 467
-- Name: FUNCTION publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb) TO service_role;


--
-- TOC entry 4210 (class 0 OID 0)
-- Dependencies: 451
-- Name: FUNCTION redeem_invitation_code(p_code text, p_user_id uuid, p_email text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.redeem_invitation_code(p_code text, p_user_id uuid, p_email text) TO anon;
GRANT ALL ON FUNCTION public.redeem_invitation_code(p_code text, p_user_id uuid, p_email text) TO authenticated;
GRANT ALL ON FUNCTION public.redeem_invitation_code(p_code text, p_user_id uuid, p_email text) TO service_role;


--
-- TOC entry 4211 (class 0 OID 0)
-- Dependencies: 466
-- Name: FUNCTION set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb) TO service_role;


--
-- TOC entry 4212 (class 0 OID 0)
-- Dependencies: 446
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- TOC entry 4214 (class 0 OID 0)
-- Dependencies: 453
-- Name: FUNCTION track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO anon;
GRANT ALL ON FUNCTION public.track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO authenticated;
GRANT ALL ON FUNCTION public.track_link_click(p_profile_id uuid, p_link_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO service_role;


--
-- TOC entry 4216 (class 0 OID 0)
-- Dependencies: 452
-- Name: FUNCTION track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO anon;
GRANT ALL ON FUNCTION public.track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO authenticated;
GRANT ALL ON FUNCTION public.track_page_view(p_profile_id uuid, p_country text, p_city text, p_latitude numeric, p_longitude numeric, p_user_agent text, p_device_type text, p_browser text, p_os text, p_referrer text, p_session_id text, p_ip_hash text) TO service_role;


--
-- TOC entry 4217 (class 0 OID 0)
-- Dependencies: 454
-- Name: FUNCTION update_demo_logos_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_demo_logos_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_demo_logos_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_demo_logos_updated_at() TO service_role;


--
-- TOC entry 4218 (class 0 OID 0)
-- Dependencies: 462
-- Name: FUNCTION update_template_bank_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_template_bank_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_template_bank_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_template_bank_updated_at() TO service_role;


--
-- TOC entry 4219 (class 0 OID 0)
-- Dependencies: 463
-- Name: FUNCTION validate_template_state_transition(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_template_state_transition() TO anon;
GRANT ALL ON FUNCTION public.validate_template_state_transition() TO authenticated;
GRANT ALL ON FUNCTION public.validate_template_state_transition() TO service_role;


--
-- TOC entry 4221 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE admin_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_users TO anon;
GRANT ALL ON TABLE public.admin_users TO authenticated;
GRANT ALL ON TABLE public.admin_users TO service_role;


--
-- TOC entry 4225 (class 0 OID 0)
-- Dependencies: 327
-- Name: TABLE demo_logos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.demo_logos TO anon;
GRANT ALL ON TABLE public.demo_logos TO authenticated;
GRANT ALL ON TABLE public.demo_logos TO service_role;


--
-- TOC entry 4226 (class 0 OID 0)
-- Dependencies: 329
-- Name: TABLE document_access_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_access_logs TO anon;
GRANT ALL ON TABLE public.document_access_logs TO authenticated;
GRANT ALL ON TABLE public.document_access_logs TO service_role;


--
-- TOC entry 4227 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE encrypted_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.encrypted_documents TO anon;
GRANT ALL ON TABLE public.encrypted_documents TO authenticated;
GRANT ALL ON TABLE public.encrypted_documents TO service_role;


--
-- TOC entry 4229 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE invitation_codes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.invitation_codes TO anon;
GRANT ALL ON TABLE public.invitation_codes TO authenticated;
GRANT ALL ON TABLE public.invitation_codes TO service_role;


--
-- TOC entry 4230 (class 0 OID 0)
-- Dependencies: 335
-- Name: TABLE pages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pages TO anon;
GRANT ALL ON TABLE public.pages TO authenticated;
GRANT ALL ON TABLE public.pages TO service_role;


--
-- TOC entry 4231 (class 0 OID 0)
-- Dependencies: 332
-- Name: TABLE power_editor_projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.power_editor_projects TO service_role;
GRANT SELECT,DELETE ON TABLE public.power_editor_projects TO authenticated;


--
-- TOC entry 4232 (class 0 OID 0)
-- Dependencies: 332 4231
-- Name: COLUMN power_editor_projects.owner_user_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(owner_user_id) ON TABLE public.power_editor_projects TO authenticated;


--
-- TOC entry 4233 (class 0 OID 0)
-- Dependencies: 332 4231
-- Name: COLUMN power_editor_projects.profile_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(profile_id) ON TABLE public.power_editor_projects TO authenticated;


--
-- TOC entry 4234 (class 0 OID 0)
-- Dependencies: 332 4231
-- Name: COLUMN power_editor_projects.template_id; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(template_id) ON TABLE public.power_editor_projects TO authenticated;


--
-- TOC entry 4235 (class 0 OID 0)
-- Dependencies: 332 4231
-- Name: COLUMN power_editor_projects.name; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(name),UPDATE(name) ON TABLE public.power_editor_projects TO authenticated;


--
-- TOC entry 4236 (class 0 OID 0)
-- Dependencies: 332 4231
-- Name: COLUMN power_editor_projects.page_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT INSERT(page_config),UPDATE(page_config) ON TABLE public.power_editor_projects TO authenticated;


--
-- TOC entry 4237 (class 0 OID 0)
-- Dependencies: 333
-- Name: TABLE power_editor_template_blueprints; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.power_editor_template_blueprints TO service_role;


--
-- TOC entry 4238 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE power_editor_template_generation_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.power_editor_template_generation_runs TO service_role;


--
-- TOC entry 4239 (class 0 OID 0)
-- Dependencies: 331
-- Name: TABLE power_editor_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.power_editor_templates TO service_role;
GRANT SELECT ON TABLE public.power_editor_templates TO authenticated;


--
-- TOC entry 4241 (class 0 OID 0)
-- Dependencies: 322
-- Name: TABLE premium_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.premium_users TO anon;
GRANT ALL ON TABLE public.premium_users TO authenticated;
GRANT ALL ON TABLE public.premium_users TO service_role;


--
-- TOC entry 4243 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE profile_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profile_links TO anon;
GRANT ALL ON TABLE public.profile_links TO authenticated;
GRANT ALL ON TABLE public.profile_links TO service_role;


--
-- TOC entry 4248 (class 0 OID 0)
-- Dependencies: 324
-- Name: TABLE qr_analytics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.qr_analytics TO anon;
GRANT ALL ON TABLE public.qr_analytics TO authenticated;
GRANT ALL ON TABLE public.qr_analytics TO service_role;


--
-- TOC entry 4249 (class 0 OID 0)
-- Dependencies: 325
-- Name: TABLE qr_analytics_daily; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.qr_analytics_daily TO anon;
GRANT ALL ON TABLE public.qr_analytics_daily TO authenticated;
GRANT ALL ON TABLE public.qr_analytics_daily TO service_role;


--
-- TOC entry 4250 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE qr_top_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.qr_top_links TO anon;
GRANT ALL ON TABLE public.qr_top_links TO authenticated;
GRANT ALL ON TABLE public.qr_top_links TO service_role;


--
-- TOC entry 4251 (class 0 OID 0)
-- Dependencies: 320
-- Name: TABLE qr_visual_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.qr_visual_versions TO anon;
GRANT ALL ON TABLE public.qr_visual_versions TO authenticated;
GRANT ALL ON TABLE public.qr_visual_versions TO service_role;


--
-- TOC entry 4257 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE template_bank; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.template_bank TO anon;
GRANT ALL ON TABLE public.template_bank TO authenticated;
GRANT ALL ON TABLE public.template_bank TO service_role;


--
-- TOC entry 2441 (class 826 OID 16494)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2442 (class 826 OID 16495)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2440 (class 826 OID 16493)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2444 (class 826 OID 16497)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2439 (class 826 OID 16492)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 2443 (class 826 OID 16496)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


-- Completed on 2026-09-14 20:01:03

--
-- PostgreSQL database dump complete
--

\unrestrict EyXaaqSObaonnhvdaOdM4F4rETXUySWdZiPEwNGJQlI27PGN2OFIF6dbqrFny77

