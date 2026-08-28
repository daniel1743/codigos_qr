# Cripqer — Auditoría de persistencia y rutas del Power Editor (Fase 0)

**Estado:** completada en solo lectura.
**No realizado:** migraciones, cambios de UI, redirecciones, sustitución de `/editor`, cambios de `public_id`/slug/QR, commit, push, merge o deploy.
**Rama auditada:** `chore/power-editor-isolated-copy` sobre `codigos_qr`.

> El objetivo de esta Fase 0 es definir cómo persistir el Power Editor sin romper perfiles, enlaces, QR ni rutas públicas existentes. Este informe no autoriza implementación.

## 1. Rutas y puntos de entrada actuales

| Entrada | Ubicación | Estado actual | Implicación futura |
|---|---|---|---|
| Editor heredado | `/editor` · `src/routes/editor.tsx` | Carga/guarda `profiles` y `profile_links`. | Debe permanecer intacto hasta que el nuevo flujo persista y publique correctamente. |
| Perfil propio | `MyProfilePage.tsx` | Su CTA va a `/editor`. | Punto de entrada a redirigir sólo en Fase 2 autorizada. |
| Landing | `src/routes/index.tsx` | Cuatro CTAs apuntan a `/editor`. | No modificar aún; son entradas de usuario a inventariar. |
| Documentos seguros | `encrypted-documents.tsx` | Contiene enlace a `/editor`. | No modificar aún; es una entrada de usuario separada. |
| Público por ID | `/p/$publicId` | Carga perfil publicado y enlaces habilitados. | Identidad pública crítica; no modificar en Fase 1. |
| Público por alias | `/$alias` | Carga perfil publicado por `slug`. | Alias y rutas reservadas deben preservarse. |
| Editor heredado administrativo | `/admin/template-studio` | Ruta montada y protegida por `admin_users`. | Congelada; no cambiar en esta fase. |
| Power Editor aislado | `/power-editor-preview`, `/power-editor-preview-mobile` | Preview local, no conectada a datos reales. | Base de integración; no exponer aún a usuarios. |

## 2. Datos existentes y propiedad

| Recurso | Tabla / servicio | Identidad y propiedad | Estado de publicación |
|---|---|---|---|
| Perfil | `profiles` · `profileService` | `user_id` enlaza a `auth.users`; RLS limita CRUD al dueño. | `published` controla exposición pública. |
| Enlace | `profile_links` · `linkService` | `profile_id` enlaza a `profiles`; RLS valida propiedad del perfil. | Sólo enlaces `enabled` de perfiles publicados son públicos. |
| QR visual | `qr_visual_versions` | Pertenece a `profile_id`. | Historial QR, no proyecto Power Editor. |
| QR público | `/p/$publicId` y `/$alias` | Depende de `profiles.public_id`, `profiles.slug` y `published`. | Estable; no se debe regenerar ni alterar. |
| Administración | `admin_users` · `isUserAdmin` | Fuente actual de rol administrativo. | Reutilizada por la ruta heredada admin. |

Las políticas de `profiles` y `profile_links` ya garantizan que un usuario sólo altere sus propios datos. La ruta pública por `public_id` consulta únicamente perfiles publicados y sus enlaces habilitados. [1] [2] [3]

## 3. Hallazgo principal: no existe persistencia de proyecto o plantilla

Las plantillas actuales son presets de código aplicados a un objeto `Partial<Profile>` en memoria. `TemplatePicker` y `AppearanceSection` no crean una entidad de plantilla, proyecto, borrador, snapshot ni versión. El script `generate_templates.cjs` sólo escribe `src/lib/design/template-presets.ts`; no genera capturas, proyectos ni registros de base de datos. [4]

El Power Editor, por su parte, tiene un contrato declarativo completo: `PageConfig`, `blocks[]`, versión, capabilities, tema, fondo, bloques, presets y migración de hidratación. Hoy lo guarda solamente bajo la clave local `cripqer.editor-candidate.v3`. [5]

> Por ello, persistir sólo campos sueltos de `PageConfig` dentro de `profiles` sería frágil y perdería semántica de bloques, orden, responsive, decoraciones, estilos y futuras versiones.

## 4. Modelo de persistencia propuesto — no aplicado

Se recomienda crear dos recursos nuevos, sin alterar `profiles` ni `profile_links`:

| Recurso propuesto | Columnas esenciales | Propósito |
|---|---|---|
| `power_editor_templates` | `id`, `owner_user_id`, `name`, `status`, `page_config jsonb`, `created_at`, `updated_at` | Master reutilizable que un administrador puede crear/publicar. |
| `power_editor_projects` | `id`, `owner_user_id`, `profile_id`, `template_id`, `name`, `status`, `page_config jsonb`, `published_page_config jsonb`, `created_at`, `updated_at` | Proyecto de un usuario; puede nacer desde un master sin alterar el master. |

### Propiedad y relación

`owner_user_id` debe coincidir con `auth.uid()` en RLS. `profile_id` enlaza a la fila existente de `profiles` del mismo dueño, pero no reemplaza los campos actuales. Un proyecto puede referir `template_id` de modo opcional para registrar su origen; el `page_config` se copia al crear proyecto para que cada usuario edite de forma independiente.

`published_page_config` se reserva para la fase de publicación. De ese modo, un usuario puede guardar borrador sin modificar lo que ya responde su QR público. La ruta pública actual seguirá leyendo `profiles` y `profile_links` hasta que exista un renderer público del nuevo formato y se autorice su activación.

## 5. Mapeo explícito de datos

| Power Editor | Destino propuesto | Regla |
|---|---|---|
| `PageConfig.version`, `theme`, `background`, `blocks`, `presets`, capabilities | `power_editor_projects.page_config` | Guardar el JSON canónico completo, no descomponerlo prematuramente. |
| `PageConfig.profile` | Dentro de `page_config` | Es nivel de capability del editor, no la tabla `profiles`. |
| Banner y avatar del `PageConfig` | Props de bloques dentro de `page_config` | No sobrescribir `profiles.banner_url` ni `profiles.avatar_url` en Fase 1. |
| Bloque `links` / `socials` | Props del `PageConfig` | No tocar `profile_links` hasta decidir migración/publicación explícita. |
| Proyecto | `power_editor_projects` | Pertenece al usuario y se asocia opcionalmente a un perfil propio. |
| Master | `power_editor_templates` | Sólo para creación/reuso; no editarlo al personalizar un proyecto. |
| Perfil actual | `profiles` | Seguir siendo fuente de `public_id`, slug, QR y publicación actual. |

## 6. RLS propuesta — no aplicada

| Tabla | Lectura | Escritura |
|---|---|---|
| `power_editor_projects` | Dueño: `owner_user_id = auth.uid()` | Insert/update/delete sólo si `owner_user_id = auth.uid()` y el `profile_id` usado pertenece a ese mismo usuario. |
| `power_editor_templates` | Usuarios autenticados sólo para masters publicados; administrador puede leer todos. | Sólo administrador mediante la fuente `admin_users` ya existente. |
| `published_page_config` | No se vuelve pública directamente en Fase 1. | La publicación debe validarse en una fase posterior y conservar `profiles.published` como flag actual. |

No se propone una lista administrativa paralela, roles nuevos ni una política que permita que un usuario escriba proyectos ajenos.

## 7. Servicio propuesto — no creado

Un futuro `src/services/power-editor-project.service.ts` debería limitarse a: listar proyectos del dueño; crear proyecto desde master mediante copia; cargar proyecto del dueño; actualizar únicamente su `page_config`; guardar borrador; y, en una fase posterior, publicar versión. Debe reutilizar el cliente Supabase y el patrón de servicios existente, sin cambiar `profileService` ni `linkService`.

## 8. Cambio mínimo permitido para una futura Fase 1

| Archivo | Acción futura | Restricción |
|---|---|---|
| `supabase/migrations/<timestamp>_create_power_editor_projects.sql` | Crear las dos tablas, índices y RLS propuestas. | No modificar tablas/policies existentes. |
| `src/services/power-editor-project.service.ts` | Añadir CRUD propietario y creación desde master. | No tocar `profileService` o `linkService`. |
| `src/types/database.ts` | Añadir tipos nuevos si el proyecto no los genera. | No renombrar tipos existentes. |

No se requeriría cambio de UI, redirección, rutas públicas, QR, `public_id`, slug, `profiles`, `profile_links`, editor heredado ni `/admin/template-studio` para esa Fase 1 de datos.

## 9. Pruebas requeridas antes de avanzar

| Prueba | Resultado exigido |
|---|---|
| Usuario crea proyecto desde un master | Se crea una copia de `PageConfig`; el master no cambia. |
| Usuario guarda borrador | Sólo cambia su proyecto propio; QR/perfil público actual no cambia. |
| Usuario intenta leer/editar proyecto ajeno | RLS lo deniega. |
| Administrador gestiona masters | RLS permite la operación sólo con `admin_users`. |
| Usuarios existentes | Pueden seguir usando `/editor`, `/p/$publicId`, slug y QR sin regresión. |
| Datos actuales | `profiles`, `profile_links`, `public_id`, slug y QR no varían. |

## 10. Riesgos y rollback

| Riesgo | Mitigación | Rollback |
|---|---|---|
| Confundir `PageConfig.profile` con `profiles` | Usar nombres `power_editor_*` y JSON canónico. | Retirar sólo tablas/servicio nuevos antes de adoptar datos. |
| Cambiar QR público con un borrador | Separar `page_config` de `published_page_config`. | No hay cambio en rutas públicas durante Fase 1. |
| Sobrescribir master al personalizar | Copiar JSON al proyecto al crear. | El master nunca se edita desde proyecto. |
| Romper edición heredada | No modificar `/editor`, servicios ni tablas actuales. | Revertir sólo migración/servicio nuevos si fuera necesario. |

## 11. Conclusión y detención

La persistencia del Power Editor es viable sin romper el sistema actual, siempre que se introduzca como un recurso paralelo, propietario y versionable. No hay una entidad existente que pueda reutilizarse sin perder información: `profiles` representa una landing publicada heredada, no un documento de diseño por bloques.

**Detención de Fase 0:** no se aplicó migración, no se creó servicio, no se tocó UI y no se cambió ninguna ruta. La siguiente acción requiere permiso específico.

**¿Autorizas Fase 1: MODELO DE DATOS Y SERVICIO DE PERSISTENCIA?**

## Referencias

[1]: ./supabase/migrations/20260817000000_init.sql "Esquema base, RLS y Storage"
[2]: ./src/services/profile.service.ts "Servicio de perfiles"
[3]: ./src/services/link.service.ts "Servicio de enlaces"
[4]: ./src/components/editor/AppearanceSection.tsx "Plantillas y apariencia heredadas"
[5]: ./src/power-editor/client/src/lib/editorCandidateModel.ts "Contrato PageConfig del Power Editor"
