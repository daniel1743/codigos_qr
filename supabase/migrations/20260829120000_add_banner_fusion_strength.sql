ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_fusion_strength INTEGER NOT NULL DEFAULT 60;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_banner_fusion_strength_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_banner_fusion_strength_check
        CHECK (banner_fusion_strength >= 0 AND banner_fusion_strength <= 100);
  END IF;
END
$$;

COMMENT ON COLUMN public.profiles.banner_fusion_strength IS
  'Strength from 0 to 100 for the visual transition between banner and profile background.';
