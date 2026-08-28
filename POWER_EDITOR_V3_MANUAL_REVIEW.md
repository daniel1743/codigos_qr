# Power Editor — Diagnóstico Supabase y revisión manual V3

**Estado:** preparado para revisión manual; no aplicado.

## Diagnóstico confirmado

La migración V2 se detuvo porque `public.admin_users` no existe en el Supabase real. La inspección de sólo lectura confirmó además que `public.users.role` y `public.profiles.profile_role` son modificables por los roles `anon` y `authenticated`. Por ello, ninguna de esas columnas es una fuente segura para otorgar autorización administrativa en una política RLS o función `SECURITY DEFINER`.

`profiles.id` sí tiene una clave foránea hacia `auth.users(id)` y sus políticas existentes comparan `auth.uid() = id`. La relación de propiedad correcta para un proyecto futuro es, por tanto, `profile_id = auth.uid()`; la V2 que intentaba usar `profiles.user_id` era incompatible con el esquema real.

La comprobación de presencia confirmó que los objetos siguientes permanecen ausentes: `public.power_editor_templates`, `public.power_editor_projects` y `public.power_editor_is_admin(uuid)`. No hay rollback de V2 pendiente.

| Decisión | Motivo |
|---|---|
| No reutilizar `admin_users` | No existe en el Supabase real. |
| No autorizar usando `users.role` ni `profiles.profile_role` | Ambos valores pueden ser modificados desde roles de cliente. |
| No crear función administrativa V3 | No hay una fuente administrativa de servidor que haya sido verificada. |
| Diferir gestión/publish de templates maestros | Es preferible a confiar en roles editables por navegador. |
| Permitir sólo borradores propios desde cliente | Puede protegerse mediante `owner_user_id = auth.uid()` y `profile_id = auth.uid()`. |

## Artefacto V3 a revisar

El SQL completo está en:

```text
supabase/migrations/20260826091500_create_power_editor_draft_persistence_v3.sql
```

V3 es estrictamente aditiva. Sólo crea dos tablas nuevas, cinco índices, un trigger function propio y dos triggers nuevos. Habilita RLS únicamente sobre las tablas nuevas, concede privilegios de columna limitados y añade cinco políticas nuevas.

No incluye `CREATE OR REPLACE`, `DROP`, `TRUNCATE`, `DELETE` ni `UPDATE` en su cuerpo de migración. No altera `public.users`, `public.profiles`, links, QR, `public_id`, slug, rutas, publicación existente, documentos, métricas ni filas actuales.

## Qué permite V3

| Recurso | Cliente autenticado | Resultado |
|---|---|---|
| `power_editor_templates` | `SELECT` bajo RLS | Puede leer sólo templates con `status = 'published'`. |
| `power_editor_templates` | Insertar, actualizar, borrar o publicar | Denegado: no existen grants de escritura ni políticas de escritura. |
| `power_editor_projects` | Leer | Sólo proyectos donde `owner_user_id = auth.uid()`. |
| `power_editor_projects` | Crear | Sólo un proyecto con `owner_user_id = auth.uid()` y `profile_id = auth.uid()`. Puede referir sólo a un template publicado o a `NULL`. |
| `power_editor_projects` | Actualizar | Sólo `template_id`, `name` y `page_config` de un proyecto propio. |
| `power_editor_projects` | Publicar | Denegado: el cliente no tiene privilegio sobre `status`, `published_page_config` ni `published_at`. |
| `power_editor_projects` | Borrar | Sólo proyectos propios. |

La tabla de templates comienza intencionalmente vacía. Su carga, creación, edición, archivado y publicación quedan fuera de esta fase y deben ocurrir más adelante sólo mediante un mecanismo de servidor con autorización administrativa verificable.

## Rollback manual V3

Ejecutar sólo si se desea desechar V3 antes de conectar cualquier interfaz. El rollback afecta únicamente los objetos V3 y se niega a borrar una función homónima no creada por V3.

```sql
DROP TABLE IF EXISTS public.power_editor_projects;
DROP TABLE IF EXISTS public.power_editor_templates;

DO $$
DECLARE
  function_oid OID;
BEGIN
  SELECT to_regprocedure('public.power_editor_set_updated_at()')::OID INTO function_oid;

  IF function_oid IS NOT NULL THEN
    IF COALESCE(obj_description(function_oid, 'pg_proc'), '')
        = 'Managed by Cripqer Power Editor draft persistence V3' THEN
      DROP FUNCTION public.power_editor_set_updated_at();
    ELSE
      RAISE EXCEPTION
        'Refusing to drop function public.power_editor_set_updated_at(): not owned by Power Editor V3';
    END IF;
  END IF;
END;
$$;
```

## Verificación posterior

Ejecutar después de aplicar V3. Todas son consultas de lectura de catálogo, salvo los conteos agregados de tablas existentes al final.

```sql
-- Debe devolver las dos tablas nuevas.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('power_editor_templates', 'power_editor_projects')
ORDER BY table_name;

-- Ambas deben mostrar RLS habilitado.
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_catalog.pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('power_editor_templates', 'power_editor_projects')
ORDER BY relname;

-- Debe devolver cinco políticas, con los nombres de V3.
SELECT tablename, policyname, cmd, roles
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('power_editor_templates', 'power_editor_projects')
ORDER BY tablename, policyname;

-- Los únicos UPDATE autenticados para proyectos deben ser template_id, name y page_config.
SELECT table_name, column_name, privilege_type, grantee
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name IN ('power_editor_templates', 'power_editor_projects')
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type, column_name;

SELECT
  has_column_privilege('authenticated', 'public.power_editor_projects', 'status', 'UPDATE')
    AS client_can_update_status,
  has_column_privilege('authenticated', 'public.power_editor_projects', 'published_page_config', 'UPDATE')
    AS client_can_update_published_page_config,
  has_column_privilege('authenticated', 'public.power_editor_projects', 'published_at', 'UPDATE')
    AS client_can_update_published_at,
  has_table_privilege('authenticated', 'public.power_editor_templates', 'INSERT')
    AS client_can_create_templates;

-- Debe conservar los mismos conteos anotados antes de V3.
SELECT
  (SELECT count(*) FROM public.users) AS users_count,
  (SELECT count(*) FROM public.profiles) AS profiles_count;
```

Resultados esperados: dos tablas; RLS `true` en ambas; cinco políticas; las tres columnas de publicación con valor `false`; y `client_can_create_templates = false`. Los conteos de `users` y `profiles` no deben cambiar.

## Prueba manual RLS de borrador

Usar una cuenta de prueba que tenga una fila existente en `profiles` con `profiles.id` igual a su UUID de Auth. Este bloque se deshace siempre con `ROLLBACK`.

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<UUID_AUTH_USUARIO_DE_PRUEBA>', true);

-- Debe permitir el borrador propio sin template.
INSERT INTO public.power_editor_projects (
  owner_user_id,
  profile_id,
  name,
  page_config
)
VALUES (
  '<UUID_AUTH_USUARIO_DE_PRUEBA>',
  '<UUID_AUTH_USUARIO_DE_PRUEBA>',
  'Borrador RLS temporal',
  '{"version":1}'::jsonb
)
RETURNING id, owner_user_id, profile_id, name, status;

ROLLBACK;
```

No se debe probar la publicación desde SQL Editor en la misma transacción si la sentencia se espera que falle, porque PostgreSQL marcará la transacción como abortada. La verificación de privilegios por columna anterior ya demuestra que un cliente no puede actualizar campos de publicación.

## Punto de parada

V3 no conecta Guardar, Publicar, `/editor`, rutas públicas ni el Power Editor. No se creó commit, push, merge ni deploy. Tras una eventual aplicación y verificación manual de V3, se necesita una autorización explícita nueva antes de integrar UI o diseñar una fuente administrativa de servidor para templates maestros.
