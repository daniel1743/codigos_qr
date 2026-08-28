-- Cripqer Power Editor persistence V6.
-- REVIEW ONLY: apply manually after the V6 preflight succeeds.
-- This changes only the UPDATE policy on the V4/V5 projects table.

BEGIN;

ALTER POLICY "owners update their own power editor drafts"
ON public.power_editor_projects
USING (
  owner_user_id = auth.uid()
  AND status IN ('draft', 'published')
)
WITH CHECK (
  owner_user_id = auth.uid()
  AND status IN ('draft', 'published')
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = profile_id
      AND profiles.user_id = auth.uid()
  )
);

COMMIT;
