ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_fusion_strength INTEGER NOT NULL DEFAULT 60,
  ADD CONSTRAINT profiles_banner_fusion_strength_check
    CHECK (banner_fusion_strength >= 0 AND banner_fusion_strength <= 100);

COMMENT ON COLUMN public.profiles.banner_fusion_strength IS
  'Strength from 0 to 100 for the visual transition between banner and profile background.';
