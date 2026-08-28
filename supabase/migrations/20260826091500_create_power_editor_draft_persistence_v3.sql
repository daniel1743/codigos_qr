-- Cripqer Power Editor persistence V3.
-- REVIEW ONLY: do not apply until manually approved in the real Supabase project.
--
-- Scope:
--   * Creates additive Power Editor template/project tables only.
--   * Keeps browser clients restricted to draft projects owned by auth.uid().
--   * Lets authenticated users read only templates already marked as published.
--   * Deliberately provides no browser path to create, edit, publish, or delete templates.
--
-- Non-scope:
--   * Does not read or depend on public.users.role, profiles.profile_role, or admin_users.
--   * Does not modify public.users, public.profiles, profile links, QR, public_id,
--     slug, public routes, documents, metrics, or existing data/policies.
--   * Does not publish projects or connect any UI action.

-- Create a Power Editor-only timestamp function without replacing a pre-existing object.
DO $$
DECLARE
  function_oid OID;
BEGIN
  SELECT to_regprocedure('public.power_editor_set_updated_at()')::OID INTO function_oid;

  IF function_oid IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.power_editor_set_updated_at()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SET search_path = public, pg_temp
      AS $body$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $body$
    $function$;

    COMMENT ON FUNCTION public.power_editor_set_updated_at()
      IS 'Managed by Cripqer Power Editor draft persistence V3';
  ELSIF COALESCE(obj_description(function_oid, 'pg_proc'), '')
      <> 'Managed by Cripqer Power Editor draft persistence V3' THEN
    RAISE EXCEPTION
      'Refusing to reuse pre-existing function public.power_editor_set_updated_at()';
  END IF;
END;
$$;

-- It is a trigger implementation, not a public RPC.
REVOKE ALL ON FUNCTION public.power_editor_set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.power_editor_set_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.power_editor_set_updated_at() FROM authenticated;

CREATE TABLE IF NOT EXISTS public.power_editor_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  page_config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.power_editor_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.power_editor_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  page_config JSONB NOT NULL,
  published_page_config JSONB,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_power_editor_templates_status_updated
  ON public.power_editor_templates (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_power_editor_templates_owner
  ON public.power_editor_templates (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_power_editor_projects_owner_updated
  ON public.power_editor_projects (owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_power_editor_projects_profile
  ON public.power_editor_projects (profile_id);
CREATE INDEX IF NOT EXISTS idx_power_editor_projects_template
  ON public.power_editor_projects (template_id);

-- Trigger creation is idempotent and affects only the two new tables.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.power_editor_templates'::regclass
      AND tgname = 'set_power_editor_templates_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER set_power_editor_templates_updated_at
    BEFORE UPDATE ON public.power_editor_templates
    FOR EACH ROW EXECUTE FUNCTION public.power_editor_set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.power_editor_projects'::regclass
      AND tgname = 'set_power_editor_projects_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER set_power_editor_projects_updated_at
    BEFORE UPDATE ON public.power_editor_projects
    FOR EACH ROW EXECUTE FUNCTION public.power_editor_set_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.power_editor_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_editor_projects ENABLE ROW LEVEL SECURITY;

-- Browser clients may read published masters but have no write privilege on masters.
REVOKE ALL ON TABLE public.power_editor_templates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.power_editor_projects FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.power_editor_templates TO authenticated;

-- Browser clients can save and delete only their own drafts. They cannot insert or
-- update owner_user_id, profile_id, status, published_page_config, or published_at.
GRANT SELECT, DELETE ON TABLE public.power_editor_projects TO authenticated;
GRANT INSERT (owner_user_id, profile_id, template_id, name, page_config)
  ON TABLE public.power_editor_projects TO authenticated;
GRANT UPDATE (template_id, name, page_config)
  ON TABLE public.power_editor_projects TO authenticated;

-- Policy creation is idempotent and never replaces an existing policy.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'power_editor_templates'
      AND policyname = 'published power editor templates are readable by authenticated users'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "published power editor templates are readable by authenticated users"
      ON public.power_editor_templates FOR SELECT TO authenticated
      USING (status = 'published')
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'power_editor_projects'
      AND policyname = 'owners read their own power editor projects'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "owners read their own power editor projects"
      ON public.power_editor_projects FOR SELECT TO authenticated
      USING (owner_user_id = auth.uid())
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'power_editor_projects'
      AND policyname = 'owners create drafts for their own profile from published templates'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "owners create drafts for their own profile from published templates"
      ON public.power_editor_projects FOR INSERT TO authenticated
      WITH CHECK (
        owner_user_id = auth.uid()
        AND profile_id = auth.uid()
        AND (
          template_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.power_editor_templates
            WHERE power_editor_templates.id = template_id
              AND power_editor_templates.status = 'published'
          )
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'power_editor_projects'
      AND policyname = 'owners update their own power editor drafts'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "owners update their own power editor drafts"
      ON public.power_editor_projects FOR UPDATE TO authenticated
      USING (owner_user_id = auth.uid())
      WITH CHECK (
        owner_user_id = auth.uid()
        AND profile_id = auth.uid()
        AND (
          template_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.power_editor_templates
            WHERE power_editor_templates.id = template_id
              AND power_editor_templates.status = 'published'
          )
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'power_editor_projects'
      AND policyname = 'owners delete their own power editor projects'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "owners delete their own power editor projects"
      ON public.power_editor_projects FOR DELETE TO authenticated
      USING (owner_user_id = auth.uid())
    $policy$;
  END IF;
END;
$$;
