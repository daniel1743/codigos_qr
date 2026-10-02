-- CRIPQER — page creation is an administrative capability.
-- Existing pages remain readable, editable and publishable by their owner.
-- Only INSERT is restricted to admin_users; this does not alter existing data.

DROP POLICY IF EXISTS owner_insert_page ON public.pages;

CREATE POLICY admin_insert_page ON public.pages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = owner_user_id
  AND EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
      AND admin_users.role IN ('admin', 'super_admin')
  )
);
