# Auditoría de ubicación del trabajo — Power Editor

**Identificador:** `CRIPQER-VERIFY-WORKSPACE-ORIGIN-01`
**Fecha:** 27 de agosto de 2026
**Modo:** sólo lectura para código, datos, Git y Supabase
**Repositorio auditado:** `daniel1743/codigos_qr`
**Rama auditada:** `chore/power-editor-isolated-copy`

## 1. Respuesta corta y directa

**PARCIALMENTE.** La copia trasplantada del Power Editor sí existe dentro de la raíz Git de `codigos_qr` y los cambios nuevos de integración, scripts, persistencia y documentación se encuentran físicamente dentro de ese worktree. Sin embargo, esos cambios recientes están **sin commit y sin push**. Por lo tanto, hoy no aparecerían al fusionar la rama.

El proyecto original de Manus sigue existiendo en una raíz Git separada, `/home/ubuntu/cripqer-landing`. Contiene la fuente histórica del Power Editor y el preview actualmente visible, pero no contiene la integración local de borradores, el generador, los SQL pendientes ni la documentación V6 creada en el worktree de `codigos_qr`.

> La ubicación correcta de los cambios recientes es el worktree local de `codigos_qr`; su estado actual es local pendiente, no GitHub.

## 2. Entorno activo demostrado

| Evidencia | Resultado observado |
|---|---|
| Directorio de trabajo auditado | `/home/ubuntu/codigos_qr-power-editor-isolated` |
| Raíz Git | `/home/ubuntu/codigos_qr-power-editor-isolated` |
| Rama activa | `chore/power-editor-isolated-copy` |
| HEAD local | `be1c43a2be401ee59f22e0762d2bdf159c7a2717` |
| Remoto `origin` | `https://github.com/daniel1743/codigos_qr.git` para fetch y push |
| Referencia upstream auditada | `origin/chore/power-editor-isolated-copy = be1c43a2be401ee59f22e0762d2bdf159c7a2717` |
| Diferencia HEAD vs upstream | `0` commits adelante; `0` commits atrás |
| Últimos commits de la rama | `be1c43a` y `45ac187` |

La igualdad de HEAD con `origin/chore/power-editor-isolated-copy` significa únicamente que los commits ya existentes en la rama están sincronizados. No incluye archivos modificados ni no rastreados: Git no incorpora esos cambios hasta un commit y push explícitos.

## 3. Repositorio, rama, remoto y estado Git

Los dos commits que sí están en GitHub son los siguientes:

| Commit | Estado remoto | Contenido relevante |
|---|---|---|
| `45ac187` | Presente en `origin/chore/power-editor-isolated-copy` | Traslado aislado del Power Editor, previews y acceso del editor heredado. |
| `be1c43a` | Presente en `origin/chore/power-editor-isolated-copy` | Corrección del layout anidado que permite renderizar `/admin/template-studio`. |

El estado Git local del worktree contiene cambios pendientes en archivos ya versionados y un conjunto amplio de archivos no rastreados. Los cambios pendientes más relevantes son:

```text
M  package-lock.json
M  package.json
M  src/power-editor/client/src/pages/EditorCandidate.tsx
M  src/routeTree.gen.ts
M  src/types/database.ts
?? scripts/
?? artifacts/
?? src/power-editor/client/src/components/PowerEditorDraftSession.tsx
?? src/power-editor/client/src/hooks/usePowerEditorDraft.ts
?? src/routes/internal/power-editor-draft/$projectId.tsx
?? src/services/power-editor-project.service.ts
?? src/services/power-editor-project.service.test.ts
?? docs/power-editor/
?? supabase/migrations/20260826090000_... hasta 20260826100000_...
```

No hay commits locales sin push. La diferencia correcta es otra: hay **cambios locales no confirmados**, los cuales por definición no pueden estar en GitHub todavía.

## 4. Inventario de archivos recientes

| Cambio o funcionalidad | Archivo | Ruta absoluta | Proyecto al que pertenece | Rama | Estado Git | Commit más reciente | ¿Está en GitHub? | ¿Aparecerá después de fusionar hoy? |
|---|---|---|---|---|---|---|---|---|
| Power Editor trasplantado — modelo | `editorCandidateModel.ts` | `/home/ubuntu/codigos_qr-power-editor-isolated/src/power-editor/client/src/lib/editorCandidateModel.ts` | `codigos_qr` | `chore/power-editor-isolated-copy` | Versionado, limpio | `45ac187` | Sí | Sí |
| Power Editor trasplantado — componente | `EditorCandidate.tsx` | `/home/ubuntu/codigos_qr-power-editor-isolated/src/power-editor/client/src/pages/EditorCandidate.tsx` | `codigos_qr` | `chore/power-editor-isolated-copy` | Versionado y modificado localmente | `45ac187` como base | Base sí; cambio reciente no | Sólo la base confirmada |
| Power Editor trasplantado — estilos | `editor-candidate.css` | `/home/ubuntu/codigos_qr-power-editor-isolated/src/power-editor/client/src/pages/editor-candidate.css` | `codigos_qr` | `chore/power-editor-isolated-copy` | Versionado, limpio | `45ac187` | Sí | Sí |
| Persistencia temporal de borradores | `power-editor-project.service.ts` | `/home/ubuntu/codigos_qr-power-editor-isolated/src/services/power-editor-project.service.ts` | `codigos_qr` | `chore/power-editor-isolated-copy` | No rastreado | Sin commit | No | No |
| Sesión de borrador | `usePowerEditorDraft.ts` | `/home/ubuntu/codigos_qr-power-editor-isolated/src/power-editor/client/src/hooks/usePowerEditorDraft.ts` | `codigos_qr` | `chore/power-editor-isolated-copy` | No rastreado | Sin commit | No | No |
| Contenedor de borrador | `PowerEditorDraftSession.tsx` | `/home/ubuntu/codigos_qr-power-editor-isolated/src/power-editor/client/src/components/PowerEditorDraftSession.tsx` | `codigos_qr` | `chore/power-editor-isolated-copy` | No rastreado | Sin commit | No | No |
| Ruta temporal de borrador | `$projectId.tsx` | `/home/ubuntu/codigos_qr-power-editor-isolated/src/routes/internal/power-editor-draft/$projectId.tsx` | `codigos_qr` | `chore/power-editor-isolated-copy` | No rastreado | Sin commit | No | No |
| Tipos y árbol de rutas derivados | `database.ts`, `routeTree.gen.ts` | `/home/ubuntu/codigos_qr-power-editor-isolated/src/types/database.ts`; `/home/ubuntu/codigos_qr-power-editor-isolated/src/routeTree.gen.ts` | `codigos_qr` | `chore/power-editor-isolated-copy` | Versionados y modificados localmente | Base previa | No, para los cambios recientes | No |
| Generador y auditoría offline | `scripts/*.mjs` | `/home/ubuntu/codigos_qr-power-editor-isolated/scripts/` | `codigos_qr` | `chore/power-editor-isolated-copy` | No rastreados | Sin commit | No | No |
| Pack y resultados offline | `artifacts/*` | `/home/ubuntu/codigos_qr-power-editor-isolated/artifacts/` | `codigos_qr` | `chore/power-editor-isolated-copy` | No rastreados | Sin commit | No | No |
| SQL manual preparado | `supabase/migrations/20260826*.sql` | `/home/ubuntu/codigos_qr-power-editor-isolated/supabase/migrations/` | `codigos_qr` | `chore/power-editor-isolated-copy` | No rastreados | Sin commit | No | No |
| Diseño V6 de composición | `POWER_EDITOR_COMPOSITION_PHASE0.md` | `/home/ubuntu/codigos_qr-power-editor-isolated/docs/power-editor/POWER_EDITOR_COMPOSITION_PHASE0.md` | `codigos_qr` | `chore/power-editor-isolated-copy` | No rastreado | Sin commit | No | No |
| Renderer jerárquico V6 | `CompositionRenderer.tsx` | No existe | No implementado | No aplica | No existe | No aplica | No | No |
| Árbol o inspector V6 | `CompositionTree.tsx`, `CompositionInspector.tsx` | No existen | No implementados | No aplica | No existen | No aplica | No | No |
| Fixtures/pruebas V6 | `compositionFixtures.ts`, pruebas V6 | No existen | No implementados | No aplica | No existen | No aplica | No | No |

## 5. Comparación entre las dos copias

| Copia | Ruta raíz | Archivos Power Editor | Estado actual | Trabajo más reciente |
|---|---|---|---|---|
| Repositorio destino | `/home/ubuntu/codigos_qr-power-editor-isolated` | `src/power-editor/client/src/...` | Contiene el traslado confirmado y los cambios recientes locales. | Integración de borradores, scripts, artefactos, SQL manual, documentación V6 y auditorías. |
| Proyecto original Manus | `/home/ubuntu/cripqer-landing` | `client/src/lib/editorCandidateModel.ts`, `client/src/pages/EditorCandidate.tsx`, `client/src/pages/editor-candidate.css` | Conserva el candidato fuente histórico. | Sólo `todo.md` está modificado localmente en el estado actual; no hay archivos V6, ruta de borrador, servicio ni scripts nuevos equivalentes. |

La comparación directa entrega estos resultados:

| Archivo común | Comparación |
|---|---|
| `editorCandidateModel.ts` | Idéntico entre la fuente Manus y el paquete trasplantado de `codigos_qr`. |
| `editor-candidate.css` | Idéntico entre ambas copias. |
| `EditorCandidate.tsx` | Difiere entre ambas copias; el destino incluye las adaptaciones y cambios locales asociados a la integración aislada. |

No existe implementación de modelo V6, renderer jerárquico, árbol, inspector ni fixtures V6 en ninguna de las dos copias. Lo existente es diseño documental sin código.

## 6. Cambios presentes en GitHub

Al fusionar hoy `chore/power-editor-isolated-copy`, aparecerían los cambios de los commits remotos `45ac187` y `be1c43a`: el Power Editor trasplantado base, sus previews ya confirmados y la corrección del layout de `/admin` para el editor administrativo heredado.

No se incluiría ninguna modificación no confirmada del worktree. Los documentos, scripts, artefactos, persistencia temporal, ruta interna, tipos, SQL manual y cambios de `EditorCandidate.tsx` posteriores al HEAD no se trasladarían.

## 7. Cambios únicamente locales de codigos_qr

Los cambios recientes relacionados con Power Editor residen bajo la raíz Git de `codigos_qr`, pero siguen locales. Incluyen:

| Grupo | Contenido pendiente |
|---|---|
| Integración de borrador | Servicio, hook, contenedor, ruta interna, pruebas de servicio y cambios de tipo/ruta. |
| Generador | Fábrica de templates, auditoría, sincronizador protegido, pruebas y resultados offline. |
| Datos y seguridad | Migraciones V3–V6, migración de auditoría y documentos de revisión SQL. |
| Documentación | Auditorías, planes, reportes y Fase 0 de composición V6. |
| Dependencias/configuración | `package.json`, `package-lock.json`, `pnpm-lock.yaml` y `pnpm-workspace.yaml` locales. |

## 8. Cambios únicamente en Manus

La fuente histórica del Power Editor permanece en `/home/ubuntu/cripqer-landing`. En el estado Git actual de esa raíz, el único archivo modificado sin commit es:

```text
/home/ubuntu/cripqer-landing/todo.md
```

Ese archivo es trazabilidad de tareas; no contiene la integración de borradores, el generador, SQL manual ni el diseño V6 como código. Los cambios históricos del candidato que sí viven en Manus forman parte de sus propios checkpoints y no se incorporarían a `codigos_qr` mediante la fusión de la rama destino.

## 9. Origen real del preview visible en Manus

La aplicación visible en la ventana de preview de Manus procede del proyecto original, no del worktree de `codigos_qr`.

| Pregunta | Evidencia |
|---|---|
| Directorio que la alimenta | `/home/ubuntu/cripqer-landing` |
| Nombre de proyecto configurado | `cripqer-landing` |
| Comando configurado | `pnpm run dev` → `NODE_ENV=development tsx watch server/_core/index.ts` |
| Evidencia de proceso | Procesos Node/tsx activos bajo `/home/ubuntu/cripqer-landing/...` |
| Host local registrado | `http://localhost:3000/` |
| Script dev del worktree destino | `vite dev`; no hay evidencia de proceso persistente del destino alimentando el preview Manus actual. |

Ver ese preview **no demuestra** que el cambio esté en GitHub. La vista previa se actualiza con archivos no confirmados de `/home/ubuntu/cripqer-landing` porque ejecuta ese directorio local. Los cambios no confirmados de `/home/ubuntu/codigos_qr-power-editor-isolated` no alimentan ese preview y tampoco están en GitHub.

## 10. Respuestas directas obligatorias

| Pregunta | Respuesta y evidencia |
|---|---|
| ¿Estás modificando actualmente el Power Editor trasplantado dentro de `daniel1743/codigos_qr`? | **PARCIALMENTE.** Las modificaciones recientes están dentro de su worktree y aparecen como cambios locales/no rastreados. Esta auditoría no modificó nada. |
| ¿Has realizado algún cambio reciente únicamente en el proyecto original de Manus? | **SÍ.** El único cambio local actual detectado es `/home/ubuntu/cripqer-landing/todo.md`, destinado a trazabilidad. No se detectaron integración, scripts, SQL ni V6 implementado únicamente allí. |
| Si hoy se fusionara la rama, ¿aparecerían todos los cambios recientes? | **NO.** Aparecerían sólo `45ac187` y `be1c43a`; quedaría fuera toda la lista de cambios locales/no rastreados del worktree y cualquier archivo del proyecto Manus. |
| ¿Existen cambios locales que todavía no estén en GitHub? | **SÍ.** Los archivos enumerados en las secciones 4 y 7 están sin commit. No existen commits locales pendientes de push. |
| ¿La aplicación visible es preview o proyecto original Manus? | **Es un preview del proyecto original Manus**, iniciado desde `/home/ubuntu/cripqer-landing` con `pnpm run dev` y su servidor `tsx watch server/_core/index.ts`. |

## 11. Acción necesaria y plan mínimo de sincronización

No se hizo copia ni sincronización durante esta auditoría. Para que los cambios locales de `codigos_qr` aparezcan en una fusión futura, se requiere una fase posterior y explícitamente autorizada que:

1. Revise el diff y separe los cambios funcionales de documentos, artefactos y dependencias accidentales.
2. Ejecute las pruebas acordadas sobre el worktree destino.
3. Cree un commit local descriptivo sólo con archivos aprobados.
4. Suba ese commit a `chore/power-editor-isolated-copy`.
5. Realice una preview del repositorio destino y una revisión antes de cualquier merge.

El riesgo de copiar automáticamente ahora es mezclar cambios no relacionados, archivos generados o dependencias locales con componentes funcionales sin una revisión de diff. Esta auditoría no propone ejecutar ese plan sin una autorización nueva.

## 12. Declaración final obligatoria

**PARCIAL: una parte del trabajo está dentro de codigos_qr y otra parte está fuera o pendiente de subir.**
