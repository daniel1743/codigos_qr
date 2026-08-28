# Power Editor — Corrección V5 de pertenencia de perfiles

**Estado:** preparado para revisión manual; **no aplicado**.

## Diagnóstico confirmado

La auditoría del catálogo confirmó estas claves foráneas reales:

| Tabla y columna | Referencia real |
|---|---|
| `power_editor_templates.owner_user_id` | `auth.users(id)` |
| `power_editor_projects.owner_user_id` | `auth.users(id)` |
| `power_editor_projects.profile_id` | `public.profiles(id)` |
| `public.profiles.user_id` | `auth.users(id)` |

La V4 se aplicó correctamente como estructura, pero su política de creación y actualización usaba la condición `profile_id = auth.uid()`. Esa condición es incorrecta para este modelo: `profile_id` es el UUID de `public.profiles`, mientras `auth.uid()` es el UUID de la cuenta de Auth. El intento de prueba usó un UUID de perfil como `owner_user_id`; falló correctamente por la clave foránea y el `ROLLBACK` dejó la base sin datos de prueba.

V5 corrige exclusivamente esa validación. No cambia ninguna columna, tabla, índice, trigger, grant, ruta, UI ni dato existente. Tampoco toca la inmutabilidad de `template_id`, el guardado tras archivar un master o la restricción de eliminar sólo drafts propios.

> V5 requiere que V4 ya esté aplicada, como ocurre en este caso. No es una migración independiente ni debe ejecutarse en una base que no posea las dos políticas V4 de proyectos.

## Archivo SQL preparado

```text
supabase/migrations/20260826094500_fix_power_editor_profile_ownership_v5.sql
```

## SQL V5 completo

```sql
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
```

### Efecto de V5

| Política | Antes en V4 | Después en V5 |
|---|---|---|
| Crear proyecto | Exigía erróneamente `profile_id = auth.uid()`. | Exige que el perfil seleccionado tenga `profiles.user_id = auth.uid()`. |
| Actualizar proyecto | Exigía erróneamente `profile_id = auth.uid()`. | Conserva el proyecto propio sólo si el perfil sigue perteneciendo al usuario autenticado. |
| Validación de template en INSERT | Template publicado o `NULL`. | Sin cambios. |
| Actualización después de archivar master | Sin comprobación de estado del master. | Sin cambios. |
| Inmutabilidad de `template_id` | Sin privilegio UPDATE. | Sin cambios. |
| Delete | Sólo draft propio. | Sin cambios. |

El uso de `EXISTS` vincula el `profile_id` recibido a la identidad de Auth que ejecuta la solicitud. Por tanto, un usuario no puede usar el perfil de otra persona, aun conociendo su UUID.

## Preflight V5

Ejecutar sólo como lectura antes de aplicar V5. Deben aparecer las dos políticas y sus expresiones actuales de V4 con `profile_id = auth.uid()`. La segunda consulta confirma además que la subconsulta de V5 sobre `public.profiles` será visible bajo la RLS actual para `authenticated`.

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'power_editor_projects'
  AND policyname IN (
    'owners create drafts for their own profile from published templates',
    'owners update their own power editor drafts'
  )
ORDER BY policyname;

SELECT policyname, cmd, roles, qual
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd IN ('SELECT', 'ALL')
ORDER BY policyname;
```

Para esta base, la segunda consulta debe incluir la política de lectura pública ya observada, con acceso para `authenticated` (o `public`) y una expresión `USING` equivalente a `true`. Si no aparece una política de lectura que permita a `authenticated` ver el perfil, **no aplicar V5**: la subconsulta de pertenencia no podría verificar el perfil bajo RLS y habría que diseñar una alternativa segura.

## Rollback V5 actualizado

Este rollback devuelve **solamente las dos políticas** a la condición V4. No elimina tablas ni datos. Debe usarse sólo si se necesita revertir V5 antes de integrar interfaz.

```sql
BEGIN;

ALTER POLICY "owners create drafts for their own profile from published templates"
ON public.power_editor_projects
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
);

ALTER POLICY "owners update their own power editor drafts"
ON public.power_editor_projects
WITH CHECK (
  owner_user_id = auth.uid()
  AND profile_id = auth.uid()
);

COMMIT;
```

## Verificación posterior de V5

Después de aplicar V5, ejecuta la consulta siguiente. El campo `with_check` de ambas políticas debe mostrar una subconsulta sobre `public.profiles` con `profiles.id = profile_id` y `profiles.user_id = auth.uid()`.

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'power_editor_projects'
  AND policyname IN (
    'owners create drafts for their own profile from published templates',
    'owners update their own power editor drafts'
  )
ORDER BY policyname;

WITH expected AS (
  SELECT *
  FROM (
    VALUES
      ('template_id', false),
      ('name', true),
      ('page_config', true),
      ('owner_user_id', false),
      ('profile_id', false),
      ('status', false),
      ('published_page_config', false),
      ('published_at', false)
  ) AS checks(column_name, expected_update)
)
SELECT
  column_name,
  has_column_privilege(
    'authenticated',
    'public.power_editor_projects',
    column_name,
    'UPDATE'
  ) AS actual_update,
  expected_update
FROM expected
ORDER BY column_name;
```

Los privilegios no cambian en V5: `name` y `page_config` deben seguir en `true`; todas las demás columnas listadas deben seguir en `false`.

## Prueba reversible V5 sin copiar manualmente el UUID de Auth

El siguiente bloque usa el UUID de perfil confirmado y obtiene internamente `profiles.user_id` como identidad de Auth. No es necesario reemplazar ningún UUID. Resuelve y establece primero esa identidad mientras se mantiene el rol propietario SQL y, sólo después, cambia a `authenticated`; así no depende de que la política de lectura se aplique antes de inicializar `auth.uid()`. Inserta estados temporales, demuestra el guardado después de archivar un master y demuestra que un proyecto publicado no puede borrarse como `authenticated`. Finaliza siempre en `ROLLBACK`.

> Ejecutar sólo después de que V5 haya sido aplicada y verificada. El resultado correcto es una fila para cada `INSERT`/`UPDATE` hasta el paso 5, y cero filas para el `DELETE` del paso 6.

```sql
BEGIN;

-- 1. Como propietario SQL, crear un master publicado temporal para el dueño real del perfil.
INSERT INTO public.power_editor_templates (
  owner_user_id,
  name,
  status,
  page_config
)
SELECT
  p.user_id,
  '__v5_master_' || txid_current()::text,
  'published',
  '{"_v5_test": true}'::jsonb
FROM public.profiles p
WHERE p.id = '76f36428-e71d-4bb3-bbea-060dee7732d7'::uuid
RETURNING id, name, status;

-- 2. Resolver el user_id real mientras sigue activo el propietario SQL.
SELECT set_config(
  'request.jwt.claim.sub',
  (
    SELECT p.user_id::text
    FROM public.profiles p
    WHERE p.id = '76f36428-e71d-4bb3-bbea-060dee7732d7'::uuid
  ),
  true
);

-- Sólo después, simular el navegador autenticado.
SET LOCAL ROLE authenticated;

INSERT INTO public.power_editor_projects (
  owner_user_id,
  profile_id,
  template_id,
  name,
  page_config
)
SELECT
  auth.uid(),
  '76f36428-e71d-4bb3-bbea-060dee7732d7'::uuid,
  t.id,
  '__v5_project_' || txid_current()::text,
  '{"_v5_test": true}'::jsonb
FROM public.power_editor_templates t
WHERE t.name = '__v5_master_' || txid_current()::text
  AND t.status = 'published'
RETURNING id, name, status, template_id;

-- 3. Archivar el master tras clonar el proyecto.
RESET ROLE;
UPDATE public.power_editor_templates
SET status = 'archived'
WHERE name = '__v5_master_' || txid_current()::text
RETURNING id, name, status;

-- 4. Resolver primero la identidad como propietario SQL.
RESET ROLE;
SELECT set_config(
  'request.jwt.claim.sub',
  (
    SELECT p.user_id::text
    FROM public.profiles p
    WHERE p.id = '76f36428-e71d-4bb3-bbea-060dee7732d7'::uuid
  ),
  true
);

-- El propietario autenticado sigue pudiendo guardar name/page_config.
SET LOCAL ROLE authenticated;

UPDATE public.power_editor_projects
SET name = '__v5_project_saved_after_master_archived_' || txid_current()::text
WHERE profile_id = '76f36428-e71d-4bb3-bbea-060dee7732d7'::uuid
  AND name = '__v5_project_' || txid_current()::text
RETURNING id, name, status, template_id;

-- 5. El propietario SQL marca el proyecto temporal como published.
RESET ROLE;
UPDATE public.power_editor_projects
SET status = 'published'
WHERE profile_id = '76f36428-e71d-4bb3-bbea-060dee7732d7'::uuid
  AND name = '__v5_project_saved_after_master_archived_' || txid_current()::text
RETURNING id, name, status;

-- 6. Resolver primero la identidad como propietario SQL.
RESET ROLE;
SELECT set_config(
  'request.jwt.claim.sub',
  (
    SELECT p.user_id::text
    FROM public.profiles p
    WHERE p.id = '76f36428-e71d-4bb3-bbea-060dee7732d7'::uuid
  ),
  true
);

-- Como authenticated, el DELETE del proyecto publicado debe devolver cero filas.
SET LOCAL ROLE authenticated;

DELETE FROM public.power_editor_projects
WHERE profile_id = '76f36428-e71d-4bb3-bbea-060dee7732d7'::uuid
  AND name = '__v5_project_saved_after_master_archived_' || txid_current()::text
RETURNING id;

ROLLBACK;
```

## Punto de parada

No se aplicó V5, no se conectó Guardar ni Publicar, no se modificaron `/editor`, `/admin/template-studio` ni rutas públicas, y no se realizó commit, push, merge ni despliegue. Tras la aplicación y verificación manual de V5 se necesitará una nueva autorización explícita antes de conectar cualquier interfaz.
