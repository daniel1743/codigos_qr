ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_cover_width INTEGER DEFAULT 100;

COMMENT ON COLUMN public.profiles.social_cover_width IS 'Width percentage for premium social cover links.';
