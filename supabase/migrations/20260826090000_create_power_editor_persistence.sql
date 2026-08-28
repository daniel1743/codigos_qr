-- Power Editor persistence V2: additive, idempotent, and review-only.
-- Does not alter profiles, profile_links, QR, public_id, slug, public routes, or existing RLS.

-- Create an exclusive helper only if it is absent. It never replaces an unknown function.
DO $$
DECLARE
  function_oid OID;
BEGIN
  SELECT to_regprocedure('public.power_editor_is_admin(uuid)')::OID INTO function_oid;

  IF function_oid IS NULL THEN
    EXECUTE $function$
      CREATE FUNCTION public.power_editor_is_admin(p_user_id UUID)
      RETURNS BOOLEAN
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $body$
        SELECT EXISTS (
          SELECT 1
          FROM public.admin_users
          WHERE user_id = p_user_id
            AND role IN ('admin', 'super_admin')
        );
      $body$
    $function$;

    COMMENT ON FUNCTION public.power_editor_is_admin(UUID)
      IS 'Managed by Cripqer Power Editor persistence migration';
  ELSIF COALESCE(obj_description(function_oid, 'pg_proc'), '')
      <> 'Managed by Cripqer Power Editor persistence migration' THEN
    RAISE EXCEPTION
      'Refusing to reuse pre-existing function public.power_editor_is_admin(uuid)';
  END IF;
END;
$$;

-- The helper is callable by authenticated RLS policies only, never by PUBLIC or anon.
REVOKE ALL ON FUNCTION public.power_editor_is_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.power_editor_is_admin(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.power_editor_is_admin(UUID) TO authenticated;

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
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.power_editor_templates'::regclass
      AND tgname = 'set_power_editor_templates_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER set_power_editor_templates_updated_at
    BEFORE UPDATE ON public.power_editor_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.power_editor_projects'::regclass
      AND tgname = 'set_power_editor_projects_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER set_power_editor_projects_updated_at
    BEFORE UPDATE ON public.power_editor_projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.power_editor_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_editor_projects ENABLE ROW LEVEL SECURITY;

-- SQL privileges are deliberately narrower than RLS: project owners can save drafts only.
REVOKE ALL ON TABLE public.power_editor_templates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.power_editor_projects FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.power_editor_templates TO authenticated;
GRANT INSERT (owner_user_id, name, status, page_config)
  ON TABLE public.power_editor_templates TO authenticated;
GRANT UPDATE (name, status, page_config)
  ON TABLE public.power_editor_templates TO authenticated;
GRANT DELETE ON TABLE public.power_editor_templates TO authenticated;

GRANT SELECT, DELETE ON TABLE public.power_editor_projects TO authenticated;
GRANT INSERT (owner_user_id, profile_id, template_id, name, page_config)
  ON TABLE public.power_editor_projects TO authenticated;
GRANT UPDATE (name, page_config) ON TABLE public.power_editor_projects TO authenticated;

-- Policies are created only when absent, so re-running this migration does not duplicate them.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_editor_templates'
      AND policyname = 'published power editor templates are readable by authenticated users'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "published power editor templates are readable by authenticated users"
      ON public.power_editor_templates FOR SELECT TO authenticated
      USING (status = 'published' OR public.power_editor_is_admin(auth.uid()))
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_editor_templates'
      AND policyname = 'admins create power editor templates'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "admins create power editor templates"
      ON public.power_editor_templates FOR INSERT TO authenticated
      WITH CHECK (
        public.power_editor_is_admin(auth.uid())
        AND owner_user_id = auth.uid()
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_editor_templates'
      AND policyname = 'admins update power editor templates'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "admins update power editor templates"
      ON public.power_editor_templates FOR UPDATE TO authenticated
      USING (public.power_editor_is_admin(auth.uid()))
      WITH CHECK (public.power_editor_is_admin(auth.uid()))
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_editor_templates'
      AND policyname = 'admins delete power editor templates'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "admins delete power editor templates"
      ON public.power_editor_templates FOR DELETE TO authenticated
      USING (public.power_editor_is_admin(auth.uid()))
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_editor_projects'
      AND policyname = 'owners read their power editor projects'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "owners read their power editor projects"
      ON public.power_editor_projects FOR SELECT TO authenticated
      USING (owner_user_id = auth.uid())
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_editor_projects'
      AND policyname = 'owners create projects for their own profile from an eligible template'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "owners create projects for their own profile from an eligible template"
      ON public.power_editor_projects FOR INSERT TO authenticated
      WITH CHECK (
        owner_user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = profile_id
            AND profiles.user_id = auth.uid()
        )
        AND (
          template_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.power_editor_templates
            WHERE power_editor_templates.id = template_id
              AND (
                power_editor_templates.status = 'published'
                OR public.power_editor_is_admin(auth.uid())
              )
          )
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_editor_projects'
      AND policyname = 'owners update their own power editor drafts'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "owners update their own power editor drafts"
      ON public.power_editor_projects FOR UPDATE TO authenticated
      USING (owner_user_id = auth.uid())
      WITH CHECK (
        owner_user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = profile_id
            AND profiles.user_id = auth.uid()
        )
        AND (
          template_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.power_editor_templates
            WHERE power_editor_templates.id = template_id
              AND (
                power_editor_templates.status = 'published'
                OR public.power_editor_is_admin(auth.uid())
              )
          )
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_editor_projects'
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
