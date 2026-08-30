ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS title_font_family TEXT NULL,
  ADD COLUMN IF NOT EXISTS bio_font_family TEXT NULL;
