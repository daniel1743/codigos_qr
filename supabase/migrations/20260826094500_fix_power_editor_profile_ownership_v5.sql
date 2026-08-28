-- Cripqer Power Editor persistence V5.
-- REVIEW ONLY: apply manually only after reviewing the preflight and rollback.
--
-- Corrects V4's profile ownership predicate. V4 correctly stores profile_id as a
-- foreign key to public.profiles(id), while public.profiles is owned by user_id.
-- This migration changes only the WITH CHECK expressions of two V4 policies.

BEGIN;

ALTER POLICY "owners create drafts for their own profile from published templates"
ON public.power_editor_projects
WITH CHECK (
  owner_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = profile_id
      AND profiles.user_id = auth.uid()
  )
  AND (
    template_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.power_editor_templates
      WHERE power_editor_templates.id = template_id
        AND power_editor_templates.status = 'published'
    )
  )
);

ALTER POLICY "owners update their own power editor drafts"
ON public.power_editor_projects
WITH CHECK (
  owner_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = profile_id
      AND profiles.user_id = auth.uid()
  )
);

COMMIT;
