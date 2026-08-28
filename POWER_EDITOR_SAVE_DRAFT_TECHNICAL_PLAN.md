# Plan técnico exacto — Conexión exclusiva de «Guardar borrador»

**Estado:** documento de revisión; no autorizado para implementar todavía.
**Base verificada:** las tablas de borradores V4 y la corrección RLS V5 fueron aplicadas manualmente y verificadas mediante consultas y transacciones con `ROLLBACK`.
**Objetivo único de una futura fase:** cargar y guardar el `PageConfig` de un **proyecto borrador propio ya existente**.

> Este plan no incluye Publicar, templates maestros, creación automática de proyectos, administración, QR, perfiles públicos, `public_id`, `slug`, URLs, navegación, el editor heredado ni el editor administrativo.

## 1. Veredicto técnico y prerrequisito innegociable

El camino más seguro es un adaptador de borrador remoto, de montaje controlado, entre la sesión Supabase y el componente aislado `EditorCandidate`. Ese adaptador debe recibir un `projectId` ya decidido por una capa superior autorizada, recuperar exclusivamente ese proyecto si pertenece al usuario autenticado y entregar su `page_config` hidratado al editor.

Actualmente, `EditorCandidate` no conoce la sesión, `profileId` ni `projectId`; la ruta temporal `/power-editor-preview` sólo monta `<EditorPremiumDesktop />`; y el botón Guardar escribe directamente en `localStorage`. No existe una fuente segura de `projectId` en el flujo congelado. Por ello, la implementación **no debe** adivinar un proyecto, tomar el último proyecto del usuario, crear uno automáticamente, fijar un UUID en código ni añadir un parámetro URL.

La integración propuesta sólo se podrá montar cuando una futura decisión, autorizada por separado, entregue un `projectId` procedente de un flujo explícito de selección o creación de borrador. Ese flujo no forma parte de este plan de Guardar.

| Regla | Decisión del plan |
|---|---|
| Identidad de propietario | `auth.getUser().data.user.id`; nunca email, metadata ni rol de cliente. |
| Perfil asociado | Se verifica que el proyecto se vincule a un perfil cuya condición sea `profiles.id = project.profile_id` y `profiles.user_id = auth.uid()`. |
| Identidad del proyecto | `projectId` obligatorio, inyectado por un contenedor autorizado; no por URL, `localStorage`, heurística ni hardcode. |
| Fuente definitiva de contenido | `power_editor_projects.page_config` en Supabase. |
| Fuente temporal de edición | Estado React en memoria. |
| `localStorage` | Se desactiva en el modo remoto; sólo seguirá existiendo en el preview aislado/local ya congelado. |
| Publicación | No se llama, no se implementa y no se modifica. |

## 2. Inventario auditado y frontera de cambios

| Archivo existente auditado | Hallazgo | Uso previsto / límite |
|---|---|---|
| `src/power-editor/client/src/pages/EditorCandidate.tsx` | Mantiene `page`, historial Undo/Redo y dos acciones Guardar que hoy escriben `localStorage`. | Será el único componente visual modificado, sólo para recibir estado inicial remoto y ejecutar un callback real de guardado. |
| `src/power-editor/client/src/lib/editorCandidateModel.ts` | Define `PageConfig`, `clonePageConfig()` y `hydratePageConfig()`. | No se modificará. Se reutilizará su hidratador antes del primer render remoto. |
| `src/services/power-editor-project.service.ts` | Ya contiene `getProjectById()` y `saveDraft()` con filtro por `id` y `owner_user_id`. | Se endurecerá como única puerta de datos del editor; no se invocarán sus métodos de templates. |
| `src/types/database.ts` | Ya tipa `PowerEditorProject`, incluyendo los campos de publicación. | No requiere cambio para el mínimo propuesto. |
| `src/lib/supabase/client.ts` | Expone el singleton `getBrowserSupabaseClient()`. | Se reutiliza; no se crean clientes ad hoc ni se exponen claves. |
| `src/routes/power-editor-preview.tsx` | Ruta temporal aislada que no contiene identidad de proyecto. | No se modifica en esta fase. |
| `src/routes/editor.tsx` | Editor heredado con perfiles, QR y publicación. | Congelado; no se importa, modifica ni reutiliza. |

## 3. Archivos exactos de una futura implementación autorizada

### 3.1 Archivos nuevos

| Archivo | Función exacta | Qué no hará |
|---|---|---|
| `src/power-editor/client/src/hooks/usePowerEditorDraft.ts` | Orquesta sesión, carga de un borrador propio, hidratación, estado de carga/guardado/error, control de concurrencia y guardado explícito. | No crea proyectos, no lista templates, no publica, no usa `localStorage` y no modifica rutas. |
| `src/power-editor/client/src/components/PowerEditorDraftSession.tsx` | Contenedor no visual del editor. Recibe `projectId` obligatorio; bloquea el montaje hasta que `usePowerEditorDraft` tenga un proyecto propio e inicializado. | No decide ni genera `projectId`, no modifica navegación, no crea selector de proyectos. |
| `src/services/power-editor-project.service.test.ts` | Pruebas unitarias mockeadas del contrato de lectura y actualización estricta de borrador. | No llama Supabase real ni crea datos. |
| `src/power-editor/client/src/hooks/usePowerEditorDraft.test.ts` | Pruebas del hook: estados, ownership, carrera de guardados, sesión y red. | No cambia `PageConfig` ni toca base de datos real. |
| `vitest.config.ts` | Configuración mínima de Vitest, porque el repositorio contiene una prueba `.test.ts` pero no posee configuración ni script de test visibles. | No altera Vite de producción. |
| `src/test/setup.ts` | Mocks compartidos de Supabase, `navigator.onLine` y notificaciones para pruebas deterministas. | No se carga en producción. |

### 3.2 Archivos que se modificarían

| Archivo | Cambio mínimo exacto | Invariantes preservadas |
|---|---|---|
| `src/power-editor/client/src/pages/EditorCandidate.tsx` | Añadir una interfaz opcional de persistencia remota: `initialPageConfig`, `onSaveDraft`, `saveState` y `remoteMode`. Ramificar los dos efectos de `localStorage` para que no se ejecuten en `remoteMode`. Sustituir los dos handlers directos de Guardar por un único `handleSaveDraft`. | No se altera renderer, estilos, paneles, zoom/pan, herramientas, bloques, historial, import/export, Preview ni `PageConfig`. |
| `src/services/power-editor-project.service.ts` | Añadir `getOwnedDraft(...)` que compone `getProjectById(...)` con la verificación de `profiles.user_id`; simplificar `saveDraft(...)` para que su payload admita sólo `{ page_config }`. | No se tocan los métodos de templates, no se agrega Publicar y no se envían campos de publicación, owner, perfil, template o status. |
| `package.json` | Sólo si la auditoría de dependencias confirma que Vitest no está declarado: añadir `test: "vitest run"` y la dependencia de desarrollo mínima. | No se modifican scripts de build, deploy ni configuración Supabase. |

### 3.3 Archivos que explícitamente no se crearán ni modificarán

No se modificarán `src/routes/editor.tsx`, `src/routes/admin/template-studio.tsx`, `src/routes/admin.tsx`, `src/routes/power-editor-preview.tsx`, `src/components/admin/**`, `src/components/editor/**`, `src/components/qr/**`, `src/services/profile.service.ts`, `src/services/link.service.ts`, migraciones de Supabase, `PageConfig`, CSS, navegación, rutas generadas ni ninguna página pública.

## 4. Contrato mínimo de datos

El contenedor se diseñará como una frontera explícita. El host autorizado deberá proporcionar sólo un identificador de proyecto existente; ningún dato de ownership será aceptado desde el usuario o desde la interfaz.

```ts
type PowerEditorDraftSessionProps = {
  projectId: string;
  mode: "mobile" | "desktop";
};

type DraftSaveState =
  | "loading"
  | "ready"
  | "saving"
  | "saved"
  | "offline"
  | "unauthenticated"
  | "missing_or_forbidden"
  | "error";

type RemoteEditorPersistence = {
  initialPageConfig: PageConfig;
  saveState: DraftSaveState;
  isDirty: boolean;
  onSaveDraft: (pageConfig: PageConfig) => Promise<void>;
};
```

El `EditorCandidate` recibe `initialPageConfig` **sólo después** de que el contenedor haya recuperado la fila propia y ejecutado `hydratePageConfig(project.page_config)`. De esa manera no aparece primero el diseño local/default y luego se reemplaza visualmente por el borrador remoto.

## 5. Flujo completo propuesto

1. **Sesión.** `usePowerEditorDraft` obtiene el cliente mediante `getBrowserSupabaseClient()` y llama a `supabase.auth.getUser()`. Instala una suscripción `onAuthStateChange` para invalidar el contexto si hay `SIGNED_OUT`, `TOKEN_REFRESH_FAILED` o cambio de usuario.

2. **`projectId`.** `PowerEditorDraftSession` recibe el `projectId` como prop obligatoria desde un futuro host autorizado. Si falta, no monta el editor y presenta un estado técnico de configuración incompleta; no crea ni selecciona un proyecto.

3. **Lectura protegida.** El hook llama a `powerEditorProjectService.getOwnedDraft(supabase, { projectId, ownerUserId: authUser.id })`. El servicio consulta `power_editor_projects` con filtros por `id` y `owner_user_id`; la RLS agrega una segunda barrera.

4. **Verificación perfil-propietario.** Con el `profile_id` devuelto, el servicio solicita sólo el perfil con condiciones equivalentes a `profiles.id = profile_id` y `profiles.user_id = authUser.id`. La política V5 y la RLS de `profiles` son la barrera final. Si no hay fila, el hook no expone el proyecto ni permite guardar.

5. **Estado de borrador.** El hook exige que `project.status === "draft"` para el modo Guardar borrador. No enviará una actualización si el proyecto no es draft. Antes de implementar se volverá a inspeccionar la expresión `USING` de la política UPDATE: si el RLS real no exige `status = 'draft'`, la protección en interfaz/servicio no sustituye una garantía de servidor y deberá solicitarse una autorización separada para endurecer esa política.

6. **Hidratación.** El hook ejecuta `hydratePageConfig(project.page_config)` una sola vez en memoria. No cambia el modelo `PageConfig`, no ejecuta una migración de datos y no realiza guardado al cargar.

7. **Edición.** `EditorCandidate` monta con esa configuración inicial. Su función `commit` y sus pilas `past`/`future` permanecen intactas. Cada cambio cambia únicamente estado React y marca una revisión local pendiente.

8. **Guardar explícito.** Ambos botones existentes Guardar invocan el mismo `handleSaveDraft`. El hook serializa un clon de `PageConfig`, comprueba que exista sesión, conectividad y proyecto propio, y llama a `powerEditorProjectService.saveDraft(...)`.

9. **Payload mínimo.** `saveDraft` envía exactamente:

```ts
{ page_config: clonePageConfig(currentPageConfig) }
```

La condición de la actualización sigue incluyendo `id = projectId` y `owner_user_id = authUser.id`. No se permiten `name`, `template_id`, `owner_user_id`, `profile_id`, `status`, `published_page_config` ni `published_at` en el payload del nuevo contrato.

10. **Confirmación.** Sólo después de que Supabase devuelva una fila actualizada, el hook actualiza la revisión confirmada, limpia `isDirty` si no hubo ediciones posteriores y comunica éxito. La notificación será una confirmación de persistencia real, no una simulación.

11. **Recarga.** Al recargar, el host vuelve a proporcionar el mismo `projectId`; el ciclo sesión → ownership → lectura → `hydratePageConfig` recupera el JSONB de Supabase. En modo remoto no se lee ni escribe `localStorage`.

## 6. Comprobación de propiedad y confidencialidad

| Capa | Comprobación | Resultado esperado |
|---|---|---|
| Sesión | `supabase.auth.getUser()` devuelve `user.id`. | Sin sesión, no se consulta ni guarda borrador. |
| Consulta de proyecto | `id = projectId` y `owner_user_id = user.id`. | Un proyecto ajeno no devuelve una fila. |
| RLS de proyecto | Políticas V4/V5 evaluadas con JWT real. | Un cliente no puede suplantar `owner_user_id`. |
| Perfil | `profiles.id = project.profile_id AND profiles.user_id = user.id`. | El proyecto debe corresponder a un perfil realmente propio. |
| Actualización | Mismo `id` y `owner_user_id` más RLS. | No se puede escribir fila ajena. |
| Exposición de errores | Ausencia de fila se traduce a `missing_or_forbidden`. | No se revela si un UUID ajeno existe. |

El servicio ya preparado se reutilizará como único acceso a las tablas. Se prohibirá llamar directamente a `.from("power_editor_projects")` desde `EditorCandidate`, lo cual evita que decisiones de seguridad, filtros y payload se distribuyan en componentes visuales.

## 7. Estados de interfaz y errores

| Estado | Conducta técnica | Presentación funcional mínima |
|---|---|---|
| `loading` | El contenedor espera sesión, proyecto y perfil. | No monta `EditorCandidate`; muestra carga no editable. |
| `ready` | Proyecto propio hidratado y sin solicitud en curso. | Editor habilitado; Guardar disponible sólo si hay cambios. |
| `saving` | Existe una única promesa de guardado en vuelo. | Los dos botones Guardar quedan deshabilitados y muestran `Guardando…`. |
| `saved` | Supabase devolvió la fila actualizada. | Confirmación real y `isDirty = false` si no hubo edición nueva. |
| `offline` | `navigator.onLine === false` o fallo de red sin respuesta. | No se llama al servicio; se informa que los cambios siguen en memoria y hay que reintentar manualmente. |
| `error` | Error no clasificable de Supabase o JSON inválido. | No se borra el canvas local; se conserva la edición en memoria para reintento. |
| `missing_or_forbidden` | `maybeSingle()` no devuelve fila tras filtros/RLS. | Mensaje único, sin revelar existencia de proyecto ajeno; no se monta editor editable. |
| `unauthenticated` | Sin `user`, expiración JWT o evento de cierre de sesión. | Se detiene el guardado y se muestra el componente existente de autenticación; no se navega ni se cambia URL. |

La pérdida de conexión no activa guardado automático ni cola persistente. El usuario conserva la edición mientras la pestaña permanezca abierta y decide cuándo reintentar. Este comportamiento evita que una copia local se convierta silenciosamente en persistencia definitiva.

## 8. Prevención de guardados simultáneos o repetidos

El hook usará cuatro controles coordinados:

1. `inFlightSaveRef`: conserva la promesa activa; si ya existe, cualquier nuevo clic se ignora sin iniciar una segunda actualización.
2. `editingRevision`: aumenta por cada llamada existente a `commit`; `submittedRevision` captura la revisión exacta enviada.
3. `savedRevision`: se actualiza sólo cuando la respuesta pertenece a la última solicitud terminada. Si el usuario edita durante el guardado, el resultado no borra el estado pendiente de la edición posterior.
4. `lastSavedFingerprint`: hash/serialización estable del `PageConfig` confirmado. Si no hay diferencias, Guardar no ejecuta una petición redundante.

No habrá auto-save ni debounce que pueda ejecutar una operación inesperada. El usuario inicia todos los guardados. Si modifica contenido durante una petición, el primer guardado concluye y el estado queda como “cambios pendientes”; deberá pulsar Guardar una vez más para persistir la revisión nueva.

## 9. Undo/Redo y protección de campos inmutables

La hidratación inicial no usa `commit`; por ello el historial empieza vacío con el borrador remoto como base. Las funciones actuales `commit`, `undo` y `redo` no se cambian. Guardar no llama `setPage`, no limpia `past`/`future` y no agrega una entrada al historial: persiste una instantánea clonada de `page` y actualiza únicamente el baseline de persistencia.

La protección se aplica tanto en aplicación como en base de datos:

| Campo | Protección en la futura aplicación | Protección ya verificada en base |
|---|---|---|
| `page_config` | Es el único campo del payload de `saveDraft`. | `authenticated` tiene UPDATE. |
| `name` | No se envía en la fase mínima. | Tiene UPDATE, pero el servicio no lo usa. |
| `template_id` | No existe en el payload ni en el callback de Guardar. | Sin privilegio UPDATE. |
| `owner_user_id` | No existe en el payload; filtro de ownership obligatorio. | Sin privilegio UPDATE y RLS. |
| `profile_id` | No existe en el payload; se verifica contra `profiles.user_id`. | Sin privilegio UPDATE y RLS V5. |
| `status` | No existe en el payload; el hook exige `draft`. | Sin privilegio UPDATE. |
| `published_page_config` | No existe en el payload, estado ni callback. | Sin privilegio UPDATE. |
| `published_at` | No existe en el payload, estado ni callback. | Sin privilegio UPDATE. |

No habrá llamada a un método “publish”, no habrá copia hacia `published_page_config` y no habrá escritura de `status = 'published'`.

## 10. Pruebas exactas de una implementación futura

### 10.1 Pruebas unitarias automatizadas

| Archivo de prueba | Caso | Aserción exacta |
|---|---|---|
| `power-editor-project.service.test.ts` | Lectura propia | La consulta incluye `.eq("id", projectId)` y `.eq("owner_user_id", userId)`. |
| `power-editor-project.service.test.ts` | Payload de guardado | El objeto enviado a `.update()` es exactamente `{ page_config }`; no contiene siete campos protegidos. |
| `power-editor-project.service.test.ts` | Fila inexistente o invisible | Devuelve error interno genérico de no encontrado, sin identificar si es ajena. |
| `usePowerEditorDraft.test.ts` | Carga propia | Monta sólo después de sesión, proyecto, perfil y `hydratePageConfig`. |
| `usePowerEditorDraft.test.ts` | Sesión expirada | Cambia a `unauthenticated`, cancela posibilidad de Save y no envía UPDATE. |
| `usePowerEditorDraft.test.ts` | Sin conexión | Cambia a `offline`, no llama `.update()` y conserva la revisión local. |
| `usePowerEditorDraft.test.ts` | Concurrencia | Dos clics durante una promesa activa producen una única llamada `saveDraft`. |
| `usePowerEditorDraft.test.ts` | Edición durante guardado | El éxito de la primera revisión no elimina `isDirty` de la segunda. |
| `usePowerEditorDraft.test.ts` | Proyecto no propio | No entrega `initialPageConfig` y usa estado `missing_or_forbidden`. |
| `EditorCandidate` | Undo/Redo | Guardar no altera longitudes de `past` ni `future`. |

Se ejecutarán, como mínimo, `pnpm lint`, `pnpm build` y `pnpm test` después de añadir explícitamente la infraestructura Vitest necesaria. Si el repositorio exige dependencias nuevas, se solicitará confirmación antes de instalarlas y se reiniciará el entorno de desarrollo tras la instalación.

### 10.2 Pruebas manuales y de seguridad

| Prueba | Procedimiento | Criterio de aceptación |
|---|---|---|
| Carga inicial | Abrir un host autorizado con un `projectId` propio existente. | El canvas coincide con `page_config` de Supabase; no hay parpadeo del default/local. |
| Guardado real | Editar un bloque y pulsar Guardar. Recargar. | El cambio reaparece desde Supabase. |
| Sin modificación | Pulsar Guardar dos veces sin editar. | Máximo una petición de actualización; la segunda se omite. |
| Doble clic | Simular red lenta y pulsar Guardar repetidamente. | Una sola UPDATE y controles deshabilitados. |
| Undo/Redo | Editar, Undo, Redo, Guardar, volver a Undo. | Historial visual sigue funcionando; guardado no lo reinicia. |
| Master archivado | Usar un proyecto clonado de master archivado, como ya se verificó por SQL. | `page_config` se guarda sin cambiar `template_id`. |
| Campos de publicación | Comparar fila antes/después de Save. | `published_page_config`, `published_at` y `status` no cambian. |
| Proyecto ajeno | Presentar un `projectId` no propio al contenedor de prueba. | No se carga contenido y no se filtra si el ID existe. |
| Sin conexión | Desactivar red antes de Guardar. | No hay UPDATE; la edición queda en memoria; reintento manual funciona al volver la red. |
| Sesión vencida | Cerrar sesión o invalidar sesión antes de Guardar. | No hay UPDATE; se solicita autenticación sin cambiar URL. |

## 11. Riesgos, decisiones pendientes y rollback

| Riesgo o decisión | Impacto | Mitigación / condición de avance |
|---|---|---|
| No existe fuente actual de `projectId` | No hay forma segura de elegir qué borrador cargar. | Bloqueante. Debe aprobarse por separado un host que reciba un `projectId` explícito, sin modificar URL ni elegir implícitamente. |
| Una política UPDATE podría no exigir `status = 'draft'` en su expresión RLS | Un cliente hostil con acceso directo podría modificar `page_config` de un proyecto publicado, aunque no pueda cambiar campos publicados. | Antes de implementar, releer la política. Si falta el predicado, solicitar autorización separada para una corrección RLS manual; no ocultarlo con lógica cliente. |
| IDs de perfil e identidad Auth son distintos | Pasar un `profile_id` como `owner_user_id` rompe FK. | El hook deriva propietario desde sesión y verifica `profiles.user_id`; nunca solicita UUID Auth al usuario. |
| Pérdida de red o sesión durante edición | Riesgo de perder cambios al cerrar pestaña sin guardar. | Estado explícito y aviso de cambios pendientes; sin auto-save ni `localStorage` definitivo. |
| JSONB válido pero `PageConfig` semánticamente inválido | El renderer podría no ser seguro de montar. | Capturar fallo de hidratación, conservar error, no guardar automáticamente y no sustituir datos existentes. |
| Múltiples perfiles/borradores | Una heurística podría abrir el borrador equivocado. | No seleccionar automáticamente; `projectId` explícito obligatorio. |

El rollback de esta futura fase será sólo de código: retirar el montaje del contenedor y revertir los cambios de los archivos de integración. No se revertirán V4 ni V5, no se ejecutará SQL y no se tocarán los datos de borradores ya guardados por usuarios. Si se llega a crear un commit autorizado en el futuro, el rollback será un `git revert` de ese commit de integración, nunca un reset destructivo y nunca un rollback de las migraciones verificadas.

## 12. Criterios de aceptación antes de cerrar la futura implementación

La fase sólo se considerará completada si el host autorizado proporciona un `projectId` explícito; un usuario autenticado carga exclusivamente su borrador; una edición se recupera tras recarga sin `localStorage`; Guardar envía sólo `page_config`; concurrencia, conexión y sesión se tratan de forma controlada; Undo/Redo se conserva; las pruebas automatizadas y manuales anteriores pasan; y no se modifica ninguno de los elementos congelados.

## 13. Estado al entregar este plan

No se editó código funcional, no se conectó Guardar, no se modificó `PageConfig`, no se crearon migraciones ni se modificó Supabase. Tampoco se tocaron `/editor`, `/admin/template-studio`, el editor administrativo, templates maestros, QR, `public_id`, slug, URLs, navegación ni páginas públicas. No se realizó commit, push, merge ni despliegue.

> **Punto de parada:** para implementar este plan se requiere una autorización explícita posterior y, antes de escribir código, una decisión sobre el host autorizado que suministrará el `projectId` sin romper los congelamientos actuales.
