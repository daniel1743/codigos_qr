ALTER TABLE public.profile_links
  ADD COLUMN IF NOT EXISTS social_cover_image_mode TEXT DEFAULT 'platform_icon'
  CHECK (social_cover_image_mode IN ('platform_icon', 'main_avatar', 'custom_image'));

COMMENT ON COLUMN public.profile_links.social_cover_image_mode IS
  'Image mode for premium social cover mark: platform_icon, main_avatar, or custom_image.';
