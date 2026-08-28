# Power Editor — SQL manual final

## Alcance

Este documento contiene los dos SQL que quedan pendientes de ejecutar manualmente en Supabase. Ninguno fue aplicado por el trabajo autónomo. Ambos están separados de la ruta temporal de borradores y no modifican perfiles, enlaces, QR, `public_id`, slug, rutas públicas ni la interfaz administrativa.

| Archivo | Propósito | Efecto sobre datos actuales |
|---|---|---|
| `20260826095500_fix_power_editor_archived_update_v6.sql` | Impide que un proyecto `archived` pueda actualizarse desde `authenticated`. | Sólo modifica una política RLS de la tabla nueva `power_editor_projects`. |
| `20260826100000_create_power_editor_generator_audit_v1.sql` | Crea las dos tablas de procedencia y auditoría del generador. | No inserta templates ni proyectos; no toca tablas existentes salvo otorgar acceso de backend `service_role` a templates. |

## 1. Preflight V6 — política UPDATE

Ejecutar sólo lectura. Debe devolver exactamente una fila. `qual` de V5 no debe contener una exclusión de `archived`; por ello V6 añade el filtro explícito `status IN ('draft', 'published')` en `USING` y `WITH CHECK`.

```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'power_editor_projects'
  AND policyname = 'owners update their own power editor drafts'
  AND cmd = 'UPDATE';
```

## 2. Aplicar V6

Copiar y ejecutar el contenido completo de `20260826095500_fix_power_editor_archived_update_v6.sql`, desde `BEGIN;` hasta `COMMIT;`.

### Rollback V6

Esto vuelve exactamente a la política V5. No cambia filas.

```sql
BEGIN;

ALTER POLICY "owners update their own power editor drafts"
ON public.power_editor_projects
USING (owner_user_id = auth.uid())
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

### Verificación V6

```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'power_editor_projects'
  AND policyname = 'owners update their own power editor drafts'
  AND cmd = 'UPDATE';
```

El resultado debe contener `status IN ('draft', 'published')` en `qual` y `with_check`.

### Prueba reversible V6 como authenticated

Sustituir `<PROFILE_ID>` por un `profiles.id` que posea un `user_id` enlazado a `auth.users`. El resultado de `attempted_update` debe ser cero. `ROLLBACK` elimina el proyecto de prueba.

```sql
BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM public.profiles WHERE id = '<PROFILE_ID>'::uuid),
  true
);

SET LOCAL ROLE authenticated;

INSERT INTO public.power_editor_projects (owner_user_id, profile_id, name, page_config)
VALUES (
  auth.uid(),
  '<PROFILE_ID>'::uuid,
  '__v6_archived_guard_' || txid_current()::text,
  '{"v6_test": true}'::jsonb
);

RESET ROLE;

UPDATE public.power_editor_projects
SET status = 'archived'
WHERE profile_id = '<PROFILE_ID>'::uuid
  AND name = '__v6_archived_guard_' || txid_current()::text;

SET LOCAL ROLE authenticated;

WITH attempted_update AS (
  UPDATE public.power_editor_projects
  SET page_config = '{"v6_test": "must_not_write"}'::jsonb
  WHERE profile_id = '<PROFILE_ID>'::uuid
    AND name = '__v6_archived_guard_' || txid_current()::text
  RETURNING id
)
SELECT count(*) AS rows_updated FROM attempted_update;

ROLLBACK;
```

## 3. Preflight de tablas de auditoría del generador

Ejecutar sólo lectura. Debe devolver dos filas `absent`. Si alguna aparece `present`, no aplicar la migración: se debe revisar su estructura antes para no asumir propiedad.

```sql
SELECT
  object_name,
  CASE WHEN to_regclass('public.' || object_name) IS NULL THEN 'absent' ELSE 'present' END AS state
FROM (VALUES
  ('power_editor_template_blueprints'),
  ('power_editor_template_generation_runs')
) AS expected(object_name);
```

## 4. Aplicar las dos tablas de auditoría

Después del preflight, copiar y ejecutar el contenido completo de `20260826100000_create_power_editor_generator_audit_v1.sql`.

### Rollback de tablas de auditoría

Usar sólo si se decide retirar el sincronizador antes de registrar runs. Elimina sólo las dos tablas nuevas y su trigger dependiente.

```sql
BEGIN;
DROP TABLE IF EXISTS public.power_editor_template_generation_runs;
DROP TABLE IF EXISTS public.power_editor_template_blueprints;
COMMIT;
```

### Verificación posterior

```sql
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_catalog.pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN (
    'power_editor_template_blueprints',
    'power_editor_template_generation_runs'
  )
ORDER BY relname;

SELECT table_name, grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN (
    'power_editor_templates',
    'power_editor_template_blueprints',
    'power_editor_template_generation_runs'
  )
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;
```

Se esperan dos tablas con `rls_enabled = true`; ningún privilegio para `anon` o `authenticated`; y privilegios de `service_role` según la migración.

## 5. Activar el sincronizador después de SQL

El sincronizador no se ejecutó ni se conectó a Supabase. Una vez que las dos tablas hayan sido aplicadas y verificadas, se deben configurar en un entorno de servidor —nunca en el cliente— estas tres variables:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
POWER_EDITOR_TEMPLATE_OWNER_ID=<uuid-de-auth-users>
```

Primero ejecutar el modo seguro, sin red ni escrituras:

```bash
npm run templates:power:sync:dry-run
```

La escritura real queda deliberadamente protegida por una confirmación de entorno:

```bash
POWER_EDITOR_TEMPLATE_SYNC_CONFIRM=I_UNDERSTAND node scripts/sync-power-editor-template-pack.mjs --apply
```

El sincronizador crea masters con `status = 'draft'`; nunca publica automáticamente. Si una receta ya está enlazada a un master `published`, la omite en lugar de sobrescribirla.
