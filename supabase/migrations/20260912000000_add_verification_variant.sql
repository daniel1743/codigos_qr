-- ============================================================
-- CRIPQER — OFFICIAL GOLD VERIFICATION VARIANT
-- Adds a system-controlled verification variant to profiles:
--   'none' | 'standard' | 'official-gold'
--
-- 'official-gold' is reserved exclusively for official Cripqer-owned /
-- founder / institutional profiles. It is NEVER user-selectable from the
-- Power Editor or any public client — only trusted backend/admin authority
-- may grant or remove it.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_variant TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_verification_variant_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_verification_variant_check
  CHECK (verification_variant IN ('none', 'standard', 'official-gold'));

-- ------------------------------------------------------------------
-- ONE-TIME INITIAL ASSIGNMENT
-- Grant 'official-gold' to the exact profile with slug 'daniel-falcon'
-- owned by the auth user whose email is 'falcondaniel37@gmail.com'.
--
-- The email is used ONLY to locate the correct auth user once; it is not
-- stored in application source code. This UPDATE is a no-op if the user,
-- the profile, or the slug does not match. If the auth user owns multiple
-- profiles, only the one with slug = 'daniel-falcon' is affected.
-- ------------------------------------------------------------------
UPDATE public.profiles AS p
SET verification_variant = 'official-gold'
FROM auth.users AS u
WHERE p.user_id = u.id
  AND lower(u.email) = lower('falcondaniel37@gmail.com')
  AND p.slug = 'daniel-falcon';
