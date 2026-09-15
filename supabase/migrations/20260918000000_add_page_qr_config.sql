-- PAGES_5 — Per-page QR customization.
--
-- Adds a single page-owned `qr_config` JSONB to `public.pages` so every child
-- Page can hold its own QR styling independently of the primary profile's
-- `profiles.qr_*` columns. The JSONB shape mirrors the existing QR Studio config
-- contract (`qr_foreground_color`, `qr_background_color`, `qr_dots_type`, ...).
--
-- RLS is already enforced by the existing `owner_update_page` /
-- `owner_select_page` policies (auth.uid() = owner_user_id); no new policy is
-- required. QR styling must NOT touch canonical page fields
-- (template_config / published_template_config / published_revision).
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS qr_config jsonb;

COMMENT ON COLUMN public.pages.qr_config IS
  'Page-owned QR customization (mirrors the QR Studio config contract). Independent of profiles.qr_* columns.';
