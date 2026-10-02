-- CRIPQER — official gold verification for the owner profile
--
-- The public renderer already treats profiles.verification_variant as the
-- trusted authority. This migration only assigns the reserved variant to the
-- existing owner/admin account; it does not expose the field to the editor.
-- The update is intentionally idempotent and affects no other profile.

UPDATE public.profiles AS p
SET verification_variant = 'official-gold'
FROM public.admin_users AS a
JOIN auth.users AS u ON u.id = a.user_id
WHERE p.user_id = a.user_id
  AND a.role IN ('admin', 'super_admin')
  AND lower(COALESCE(u.email, a.email)) = 'falcondaniel37@gmail.com';
