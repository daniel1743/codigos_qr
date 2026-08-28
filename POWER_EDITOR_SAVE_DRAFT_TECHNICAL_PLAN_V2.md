# Plan técnico corregido — Prueba controlada de Guardar borrador

**Estado:** preaprobado para revisión; **no autorizado para implementar todavía**.
**Alcance:** una ruta temporal autenticada para abrir un proyecto existente, editar exclusivamente `page_config`, guardarlo y recuperarlo tras recargar.
**Exclusiones:** no se toca `/editor`, `/admin/template-studio`, el editor administrativo, QR, `public_id`, slug, rutas públicas, navegación, templates maestros ni Publicar.

> El `projectId` puede estar en la URL. No es un secreto ni un permiso. La autorización real continúa siendo la combinación de sesión Supabase, filtros de propietario, RLS y una respuesta común para proyecto inexistente o ajeno.

## 1. Cambios de criterio respecto del plan previo

| Tema | Decisión corregida | Justificación técnica |
|---|---|---|
| Origen de `projectId` | Se recibe como parámetro de la ruta temporal `/internal/power-editor-draft/$projectId`. | Hace explícita la identidad del borrador sin cambiar `/editor`. Un UUID expuesto no elude RLS. |
| Estado editable | `draft` y `published` permiten guardar `page_config`; `archived` se bloquea. | `page_config` es el trabajo editable, mientras `published_page_config` es la instantánea pública. |
| Publicación | Fuera de alcance. | Guardar nunca copia datos a `published_page_config`, no cambia `published_at` ni cambia `status`. |
| Eventos de sesión | Se usarán únicamente los eventos instalados: `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`, `PASSWORD_RECOVERY` y `MFA_CHALLENGE_VERIFIED`. | La versión instalada es `@supabase/supabase-js ^2.112.3`; `TOKEN_REFRESH_FAILED` no forma parte de su contrato de tipos. |
| Pruebas automatizadas | No se añadirá Vitest ni se tocará `package.json` en esta fase. | El repositorio no declara Vitest, no tiene script `test` y no tiene el paquete instalado. Cualquier dependencia debe autorizarse por separado. |

## 2. Archivos de la futura implementación autorizada

### Se crearían

| Archivo | Propósito exacto |
|---|---|
| `src/routes/internal/power-editor-draft/$projectId.tsx` | Ruta temporal, no enlazada desde navegación. Lee `$projectId` con TanStack Router, exige sesión y monta el contenedor. No se edita `routeTree.gen.ts`: TanStack lo regenera. |
| `src/power-editor/client/src/components/PowerEditorDraftSession.tsx` | Contenedor de carga, autorización, hidratación y estado. Recibe `projectId`; no decide ni crea proyectos. |
| `src/power-editor/client/src/hooks/usePowerEditorDraft.ts` | Hook para cargar y guardar `page_config`, gestionar sesión, conectividad, error, concurrencia y recarga. |
| `docs/POWER_EDITOR_SAVE_DRAFT_TEST_EVIDENCE.md` | Evidencia de pruebas manuales, respuestas de red y campos antes/después; no contiene datos personales. |

### Se modificarían

| Archivo | Cambio limitado |
|---|---|
| `src/power-editor/client/src/pages/EditorCandidate.tsx` | Acepta `initialPageConfig`, `onSaveDraft`, `saveState` y `remoteMode`. En modo remoto, desactiva sus efectos de `localStorage` y ambos botones Guardar llaman al mismo callback real. No cambia renderer, diseño, bloques, herramientas, zoom/pan ni Undo/Redo. |
| `src/services/power-editor-project.service.ts` | Añade una función de lectura propia que combina proyecto y perfil; reduce `saveDraft` a un payload de sólo `{ page_config }`. No usa métodos de templates en esta fase. |

No se crearán ni modificarán migraciones, tablas, `PageConfig`, CSS, `src/routes/editor.tsx`, `src/routes/admin/template-studio.tsx`, rutas públicas ni navegación.

## 3. Flujo completo de la prueba

1. La ruta temporal recibe `$projectId`. Si está ausente o no es UUID, no monta el editor.
2. `PowerEditorDraftSession` llama `supabase.auth.getUser()` mediante el cliente existente. Sin usuario, muestra el componente actual de autenticación, sin redirección ni cambio de URL.
3. El servicio ejecuta una lectura con `id = projectId` y `owner_user_id = authUser.id`. La RLS de Supabase opera como segunda barrera.
4. El servicio confirma que existe un perfil con `profiles.id = project.profile_id` y `profiles.user_id = authUser.id`. Si falla cualquiera de las dos comprobaciones, devuelve únicamente `missing_or_forbidden`; no revela si un proyecto ajeno existe.
5. Sólo un proyecto con `status IN ('draft', 'published')` puede pasar a edición. Si es `archived`, el contenedor presenta estado de sólo lectura/bloqueado y no expone Guardar.
6. Antes de montar `EditorCandidate`, el hook ejecuta `hydratePageConfig(project.page_config)` una vez. El componente recibe ese estado como `initialPageConfig`; no aparece una plantilla local/default antes de la hidratación.
7. Cada edición sigue usando el estado React existente y la lógica actual `commit`/Undo/Redo. El hook marca una revisión pendiente, pero no realiza autoguardado.
8. Ambos botones existentes Guardar invocan `handleSaveDraft`, que llama a `saveDraft(projectId, authUser.id, clonePageConfig(page))`.
9. La actualización contiene sólo `page_config` y conserva filtros por `id` y `owner_user_id`. No envía `name`, `template_id`, `owner_user_id`, `profile_id`, `status`, `published_page_config` ni `published_at`.
10. Tras una respuesta exitosa con una fila real, el hook confirma la revisión persistida. Tras recargar, el mismo ciclo recupera el JSONB desde Supabase.

## 4. Seguridad de estados y campos

| Campo o estado | Regla de la aplicación | Garantía existente en base | Requisito adicional antes de implementar |
|---|---|---|---|
| `page_config` | Único campo de guardado. | `authenticated` tiene UPDATE. | Ninguno. |
| `name` | No se envía en esta prueba. | Tiene UPDATE. | Ninguno; se mantiene fuera de payload. |
| `template_id` | Inmutable y ausente de payload. | UPDATE denegado. | Ninguno. |
| `owner_user_id` | Derivado de sesión y usado sólo como filtro. | UPDATE denegado y RLS. | Ninguno. |
| `profile_id` | Nunca enviado; se valida por `profiles.user_id`. | UPDATE denegado y RLS V5. | Ninguno. |
| `status` | No se envía. `draft`/`published` se habilitan; `archived` se bloquea. | UPDATE denegado. | **Preflight obligatorio:** comprobar que la política UPDATE de RLS también niega `archived`. |
| `published_page_config`, `published_at` | Nunca se leen para edición ni se envían. | UPDATE denegado. | Ninguno. |

### Bloqueo de archivados: condición de seguridad

La política V5 verificada protege ownership y perfil, pero la evidencia disponible no demuestra que su expresión `USING` excluya `status = 'archived'`. Un bloqueo sólo en el hook no protege contra una llamada directa a Supabase desde un cliente hostil. Si el preflight revela que falta el predicado, se detiene la implementación y se solicita una autorización separada para una corrección SQL manual, limitada a la política UPDATE de `power_editor_projects`.

La corrección candidata, que **no se redactará ni aplicará en esta fase**, deberá permitir `draft` y `published`, y denegar `archived`, sin cambiar permisos de columnas ni comportamiento de publicación.

## 5. Estados de interfaz y concurrencia

| Estado | Conducta |
|---|---|
| `loading` | El contenedor no monta el editor hasta resolver sesión, ownership, perfil e hidratación. |
| `ready` | El editor es editable cuando el estado es `draft` o `published`. |
| `saving` | Los dos botones Guardar se deshabilitan y muestran una indicación de guardado real. |
| `saved` | Se confirma sólo tras recibir fila actualizada de Supabase. |
| `offline` | No inicia UPDATE si `navigator.onLine` es falso o si hay un fallo de red; conserva cambios en memoria y solicita reintento manual. |
| `missing_or_forbidden` | No monta contenido editable y no diferencia inexistente de ajeno. |
| `unauthenticated` | Bloquea Guardar si `getUser()` falla, no hay usuario o llega `SIGNED_OUT`. Un fallo de refresh se identifica por el error real de lectura/guardado, no por un evento inexistente. |
| `archived` | Presenta bloqueo de edición; no llama al servicio. |

Para impedir duplicados se usarán `inFlightSaveRef`, una revisión creciente de edición y un fingerprint de la última configuración confirmada. Un segundo clic mientras existe una promesa se ignora. Si el usuario edita durante un guardado, el éxito de la revisión antigua no borra el estado pendiente de la revisión nueva; el usuario deberá guardar de nuevo. No se introduce autoguardado, cola persistente ni simulación mediante toast.

## 6. Pruebas permitidas sin nuevas dependencias

La auditoría confirma que el proyecto no tiene `vitest` instalado ni script `test`. En consecuencia, esta fase no promete pruebas Vitest. El mínimo verificable sin instalar paquetes será `pnpm lint` y `pnpm build`, más las pruebas manuales siguientes.

| Prueba manual | Resultado esperado |
|---|---|
| Ruta propia con `projectId` | Carga `page_config` desde Supabase y no usa el estado local. |
| Recarga | Recupera exactamente el último `page_config` guardado. |
| Doble clic Guardar | Una única petición UPDATE. |
| Edición durante guardado | La edición posterior conserva estado pendiente. |
| Proyecto ajeno | Estado `missing_or_forbidden`, sin revelar existencia ni contenido. |
| Sesión cerrada | Sin UPDATE y sin redirección forzada. |
| Red desconectada | Sin UPDATE, cambios en memoria y reintento manual. |
| Proyecto `published` | Permite actualizar sólo `page_config`; `published_page_config` no cambia. |
| Proyecto `archived` | No permite guardar desde UI y, tras el preflight RLS, tampoco desde cliente directo. |
| Undo/Redo | Guardar no añade ni borra entradas de historial. |

## 7. Rollback de código

El rollback futuro será únicamente de código: retirar la ruta temporal y el contenedor, y revertir la adaptación mínima de `EditorCandidate` y del servicio. No se revertirán V4/V5, no se modificará Supabase y no se borrará ningún borrador existente. Si se autoriza un commit posterior, se utilizará `git revert` sobre el commit concreto de integración, no un reset destructivo.

## 8. Punto de parada

Este documento no autoriza código. Para implementar se requieren dos confirmaciones explícitas: primero, el resultado del preflight de `status`; segundo, una autorización que diga que puede crearse y utilizarse exclusivamente la ruta temporal `/internal/power-editor-draft/$projectId` para Guardar borrador.
