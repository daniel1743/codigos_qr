# Power Editor — Migración V4 para revisión manual

**Estado:** aprobada estructuralmente para revisión; **no aplicada**.

El SQL completo se entrega además como archivo independiente en:

```text
supabase/migrations/20260826093000_create_power_editor_draft_persistence_v4.sql
```

V4 sustituye el borrador no ejecutado V3. Debe ejecutarse como un único bloque desde el SQL Editor, sólo después de su revisión final. Su `BEGIN; ... COMMIT;` garantiza que, si cualquiera de sus sentencias falla, PostgreSQL revierta todo el bloque y no persista un estado parcial.

## Correcciones solicitadas incorporadas

| Requisito | Implementación V4 |
|---|---|
| `template_id` inmutable después de INSERT | `GRANT UPDATE` concede exclusivamente `name` y `page_config`; no concede `template_id`. |
| Validar template en INSERT | La política INSERT conserva `template_id IS NULL` o template existente con `status = 'published'`. |
| Seguir editando tras archivar master | La política UPDATE no consulta `template_id` ni el estado de `power_editor_templates`. |
| Eliminar sólo drafts propios | La política DELETE exige `owner_user_id = auth.uid()` **y** `status = 'draft'`. |
| Ejecución atómica | El archivo completo está envuelto entre `BEGIN;` y `COMMIT;`. |

V4 no depende de `public.admin_users`, `public.users.role` ni `public.profiles.profile_role`. No crea una ruta de administración de templates maestros, no conecta interfaz, no permite publicar desde navegador y no modifica `/editor`, `/admin/template-studio`, rutas públicas, QR, perfiles existentes, documentos, métricas ni datos actuales.

## SQL V4 completo

```sql
-- Cripqer Power Editor persistence V4.
-- REVIEW ONLY: do not apply until manually approved in the real Supabase project.
--
-- This file supersedes the unexecuted V3 draft. It is a standalone migration for
-- an environment where power_editor_templates and power_editor_projects are absent.
-- It does not use public.admin_users, public.users.role, or profiles.profile_role.

BEGIN;

-- Create a Power Editor-only timestamp function without replacing an unknown object.
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
      IS 'Managed by Cripqer Power Editor draft persistence V4';
  ELSIF COALESCE(obj_description(function_oid, 'pg_proc'), '')
      <> 'Managed by Cripqer Power Editor draft persistence V4' THEN
    RAISE EXCEPTION
      'Refusing to reuse pre-existing function public.power_editor_set_updated_at()';
  END IF;
END;
$$;

-- It is only a trigger implementation, never a callable browser RPC.
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

-- Browser clients may read published masters but receive no write privilege on masters.
REVOKE ALL ON TABLE public.power_editor_templates FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.power_editor_projects FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.power_editor_templates TO authenticated;

-- Browser clients save drafts only. template_id is intentionally excluded from UPDATE,
-- so archival of a master template never prevents saving an already-cloned project.
GRANT SELECT, DELETE ON TABLE public.power_editor_projects TO authenticated;
GRANT INSERT (owner_user_id, profile_id, template_id, name, page_config)
  ON TABLE public.power_editor_projects TO authenticated;
GRANT UPDATE (name, page_config)
  ON TABLE public.power_editor_projects TO authenticated;

-- Policies are created only when absent. V4 is intended for a clean Power Editor schema.
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
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'power_editor_projects'
      AND policyname = 'owners delete their own power editor drafts'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "owners delete their own power editor drafts"
      ON public.power_editor_projects FOR DELETE TO authenticated
      USING (
        owner_user_id = auth.uid()
        AND status = 'draft'
      )
    $policy$;
  END IF;
END;
$$;

COMMIT;
```

## Rollback V4 actualizado

Ejecutar únicamente si se decide desechar V4 antes de conectar interfaz. Su propia transacción evita que el rollback quede a medias. Elimina exclusivamente los dos objetos de tabla V4 y su trigger function marcada como propiedad de V4.

```sql
BEGIN;

DROP TABLE IF EXISTS public.power_editor_projects;
DROP TABLE IF EXISTS public.power_editor_templates;

DO $$
DECLARE
  function_oid OID;
BEGIN
  SELECT to_regprocedure('public.power_editor_set_updated_at()')::OID INTO function_oid;

  IF function_oid IS NOT NULL THEN
    IF COALESCE(obj_description(function_oid, 'pg_proc'), '')
        = 'Managed by Cripqer Power Editor draft persistence V4' THEN
      DROP FUNCTION public.power_editor_set_updated_at();
    ELSE
      RAISE EXCEPTION
        'Refusing to drop function public.power_editor_set_updated_at(): not owned by Power Editor V4';
    END IF;
  END IF;
END;
$$;

COMMIT;
```

## Consultas de verificación de privilegios

Ejecutar después de aplicar V4. No modifica filas.

```sql
WITH privilege_checks AS (
  SELECT
    column_name,
    has_column_privilege(
      'authenticated',
      'public.power_editor_projects',
      column_name,
      'UPDATE'
    ) AS authenticated_can_update
  FROM (
    VALUES
      ('template_id'),
      ('name'),
      ('page_config'),
      ('owner_user_id'),
      ('profile_id'),
      ('status'),
      ('published_page_config'),
      ('published_at')
  ) AS expected(column_name)
)
SELECT column_name, authenticated_can_update
FROM privilege_checks
ORDER BY column_name;

SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_catalog.pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('power_editor_templates', 'power_editor_projects')
ORDER BY relname;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('power_editor_templates', 'power_editor_projects')
ORDER BY tablename, policyname;
```

La primera consulta debe devolver este resultado lógico:

| Columna | `authenticated_can_update` esperado |
|---|---:|
| `name` | `true` |
| `page_config` | `true` |
| `template_id` | `false` |
| `owner_user_id` | `false` |
| `profile_id` | `false` |
| `status` | `false` |
| `published_page_config` | `false` |
| `published_at` | `false` |

Las tablas nuevas deben tener RLS `true`. Las políticas esperadas son cinco, incluyendo `owners delete their own power editor drafts`; su expresión `qual` debe contener tanto `owner_user_id = auth.uid()` como `status = 'draft'`.

## Prueba manual: master archivado no bloquea guardado del proyecto

Esta prueba es optativa y se realiza en una transacción que termina en `ROLLBACK`. Necesita un UUID de prueba que exista tanto en `auth.users` como en `public.profiles`.

1. Como propietario del SQL Editor, inserta temporalmente un template con `status = 'published'` y anota su `id`.
2. Como el mismo propietario, crea un proyecto temporal que lo use; anota el `id` del proyecto.
3. Como propietario del SQL Editor, cambia el template temporal a `status = 'archived'`.
4. Cambia localmente a `authenticated`, inyecta el UUID de Auth de prueba y actualiza sólo `name` o `page_config` del proyecto temporal.
5. La actualización debe devolver una fila; luego ejecuta `ROLLBACK`.

```sql
BEGIN;

-- Ejecutar como propietario SQL; reemplazar <UUID_AUTH_CON_PERFIL>.
INSERT INTO public.power_editor_templates (owner_user_id, name, status, page_config)
VALUES (
  '<UUID_AUTH_CON_PERFIL>',
  'Template temporal V4',
  'published',
  '{"version": 1}'::jsonb
)
RETURNING id;

-- Reemplazar <UUID_TEMPLATE_TEMPORAL> por el id devuelto arriba.
INSERT INTO public.power_editor_projects (owner_user_id, profile_id, template_id, name, page_config)
VALUES (
  '<UUID_AUTH_CON_PERFIL>',
  '<UUID_AUTH_CON_PERFIL>',
  '<UUID_TEMPLATE_TEMPORAL>',
  'Proyecto temporal V4',
  '{"version": 1}'::jsonb
)
RETURNING id;

-- Reemplazar <UUID_TEMPLATE_TEMPORAL> por el mismo id.
UPDATE public.power_editor_templates
SET status = 'archived'
WHERE id = '<UUID_TEMPLATE_TEMPORAL>';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<UUID_AUTH_CON_PERFIL>', true);

-- Reemplazar <UUID_PROYECTO_TEMPORAL>. Debe devolver una fila pese al template archivado.
UPDATE public.power_editor_projects
SET name = 'Proyecto editable tras archivar master'
WHERE id = '<UUID_PROYECTO_TEMPORAL>'
RETURNING id, name, template_id;

ROLLBACK;
```

## Prueba manual: proyecto publicado no puede eliminarse por `authenticated`

Esta prueba también termina en `ROLLBACK`. Para preparar el estado publicado se usa el propietario del SQL Editor; el intento de borrar se ejecuta con el rol simulado `authenticated`.

```sql
BEGIN;

-- El propietario SQL prepara un proyecto existente de prueba como published.
UPDATE public.power_editor_projects
SET status = 'published'
WHERE id = '<UUID_PROYECTO_DE_PRUEBA>'
  AND owner_user_id = '<UUID_AUTH_CON_PERFIL>';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<UUID_AUTH_CON_PERFIL>', true);

-- Debe devolver cero filas: DELETE sólo acepta status = draft.
DELETE FROM public.power_editor_projects
WHERE id = '<UUID_PROYECTO_DE_PRUEBA>'
RETURNING id;

ROLLBACK;
```

## Prueba negativa: `template_id` no es actualizable

La tentativa siguiente debe fallar por privilegio de columna. Como un error aborta una transacción en PostgreSQL, realizarla en una pestaña/ejecución separada y terminar con `ROLLBACK` antes de seguir con otra prueba.

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<UUID_AUTH_CON_PERFIL>', true);

UPDATE public.power_editor_projects
SET template_id = NULL
WHERE id = '<UUID_PROYECTO_DE_PRUEBA>';

ROLLBACK;
```

## Punto de parada

No se ejecutó V4. No se conectó Guardar ni Publicar, no se modificaron `/editor` ni `/admin/template-studio`, y no se hizo commit, push, merge ni deploy. Tras una eventual aplicación y verificación manual de V4 se requiere autorización explícita nueva antes de integrar UI o resolver la administración segura de templates maestros.
