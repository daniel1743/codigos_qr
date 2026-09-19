-- PAGE LEVEL ANALYTICS V1
-- Extends the existing qr_analytics table. No second analytics platform.

ALTER TABLE public.qr_analytics
  ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interaction_type TEXT,
  ADD COLUMN IF NOT EXISTS item_id TEXT,
  ADD COLUMN IF NOT EXISTS item_label TEXT,
  ADD COLUMN IF NOT EXISTS target_url TEXT;

ALTER TABLE public.qr_analytics
  DROP CONSTRAINT IF EXISTS qr_analytics_interaction_type_check;

ALTER TABLE public.qr_analytics
  ADD CONSTRAINT qr_analytics_interaction_type_check
  CHECK (interaction_type IS NULL OR interaction_type IN ('button', 'whatsapp', 'product', 'service'));

CREATE INDEX IF NOT EXISTS idx_qr_analytics_page_date
  ON public.qr_analytics(page_id, created_at DESC)
  WHERE page_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qr_analytics_page_interaction
  ON public.qr_analytics(page_id, interaction_type)
  WHERE page_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.track_child_page_event(
  p_page_id UUID,
  p_event_type TEXT,
  p_interaction_type TEXT DEFAULT NULL,
  p_item_id TEXT DEFAULT NULL,
  p_item_label TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_profile_id UUID;
BEGIN
  IF p_event_type NOT IN ('view', 'link_click') THEN
    RETURN NULL;
  END IF;

  SELECT profile_id INTO v_profile_id
  FROM public.pages
  WHERE id = p_page_id
    AND published = TRUE
    AND published_template_config IS NOT NULL;

  IF v_profile_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.qr_analytics (
    profile_id, page_id, event_type, interaction_type, item_id, item_label,
    target_url, user_agent, referrer
  )
  VALUES (
    v_profile_id, p_page_id, p_event_type, p_interaction_type, p_item_id,
    p_item_label, p_url, p_user_agent, p_referrer
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.track_child_page_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_child_page_event(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Add the non-sensitive child-page identity to the existing public projections
-- so the public renderer can emit events without exposing owner fields.
DROP FUNCTION IF EXISTS public.get_public_page_by_public_id(TEXT);
CREATE FUNCTION public.get_public_page_by_public_id(p_public_id TEXT)
RETURNS TABLE (
  page_id UUID,
  public_id TEXT,
  title TEXT,
  page_type TEXT,
  published_template_config JSONB,
  slug TEXT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.public_id, p.title, p.page_type, p.published_template_config,
         p.slug, p.published_at
  FROM public.pages AS p
  WHERE p.public_id = p_public_id
    AND p.published = TRUE
    AND p.published_template_config IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_public_page_by_public_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_page_by_public_id(TEXT) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_public_page_by_slug(TEXT);
CREATE FUNCTION public.get_public_page_by_slug(p_slug TEXT)
RETURNS TABLE (
  page_id UUID,
  public_id TEXT,
  title TEXT,
  page_type TEXT,
  published_template_config JSONB,
  slug TEXT,
  published_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.public_id, p.title, p.page_type, p.published_template_config,
         p.slug, p.published_at
  FROM public.pages AS p
  WHERE p.slug = p_slug
    AND p.published = TRUE
    AND p.published_template_config IS NOT NULL
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_page_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_page_by_slug(TEXT) TO anon, authenticated;
