# Auditoría de entorno posterior a Supabase

## Resultado manual confirmado

El propietario aplicó manualmente las dos piezas pendientes y compartió evidencia de las verificaciones. La política `owners update their own power editor drafts` ahora bloquea `archived` tanto en `qual` como en `with_check`, y valida `profile_id` junto a `profiles.user_id = auth.uid()`. Las tablas `power_editor_template_blueprints` y `power_editor_template_generation_runs` existen con RLS activo y sin grants de `anon` ni `authenticated`.

## Requisitos para una prueba autenticada de borrador

El cliente ya existente en `src/lib/supabase/client.ts` necesita únicamente estas variables de compilación públicas:

| Variable | Uso | Dónde debe vivir |
|---|---|---|
| `VITE_SUPABASE_URL` | URL pública del proyecto Supabase. | Configuración segura de entorno del frontend. |
| `VITE_SUPABASE_ANON_KEY` | Clave pública `anon` para que RLS aplique la identidad de la sesión. | Configuración segura de entorno del frontend. |
| `VITE_APP_URL` | URL base de la aplicación para navegación/control de entorno. | Configuración segura de entorno del frontend. |

No se leyeron, crearon ni modificaron archivos `.env` durante esta auditoría. El contenido de esos valores no debe ponerse en código, documentación, Git ni mensajes. La clave `service_role` no pertenece al frontend.

## Requisitos para el sincronizador protegido

El sincronizador de templates se ejecuta sólo en servidor. Para una ejecución real futura necesitará:

| Variable | Uso | Restricción |
|---|---|---|
| `SUPABASE_URL` | Endpoint del proyecto. | Sólo entorno de servidor. |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones de auditoría/sincronización a través de `service_role`. | Secreto; nunca exponer al cliente. |
| `POWER_EDITOR_TEMPLATE_OWNER_ID` | UUID de `auth.users` propietario de masters draft. | Sólo entorno de servidor. |
| `POWER_EDITOR_TEMPLATE_SYNC_CONFIRM=I_UNDERSTAND` | Confirmación explícita adicional para una futura escritura con `--apply`. | No usar en dry-run. |

## Conclusión

Las pruebas unitarias, el build y el dry-run se pueden ejecutar sin estos valores. La única validación bloqueada sin una configuración segura de entorno es una sesión real que cargue, guarde y recargue un borrador contra Supabase. No se intentará una escritura de red hasta contar con dichas variables configuradas de manera segura y con una autorización específica para dicha prueba.
