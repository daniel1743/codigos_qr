ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_cover_style VARCHAR(40) DEFAULT 'badge_left',
  ADD COLUMN IF NOT EXISTS social_cover_avatar_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_cover_height INTEGER DEFAULT 64;

ALTER TABLE public.profile_links
  ADD COLUMN IF NOT EXISTS social_cover_image_url TEXT;

COMMENT ON COLUMN public.profiles.social_cover_style IS 'Premium visual model used by social cover links.';
COMMENT ON COLUMN public.profiles.social_cover_avatar_enabled IS 'Use profile avatar as the social cover badge when available.';
COMMENT ON COLUMN public.profiles.social_cover_height IS 'Height in pixels for premium social cover links.';
COMMENT ON COLUMN public.profile_links.social_cover_image_url IS 'Optional image used as the premium social cover badge for this link.';
