# Inventario local y plan de respaldo / integración

**Fecha:** 2026-08-28
**Repositorio:** `daniel1743/codigos_qr`
**Worktree autorizado:** `/home/ubuntu/codigos_qr-power-editor-isolated`
**Rama local:** `chore/power-editor-isolated-copy`
**HEAD remoto actual:** `be1c43a` (`origin/chore/power-editor-isolated-copy`)

## Estado verificado

La rama aislada conserva cambios locales que todavía no están respaldados como commits en GitHub. Esta auditoría no ejecutó `git add`, commit, push, merge, rebase, reset ni despliegue.

| Medida | Resultado |
|---|---:|
| Archivos rastreados modificados | 7 |
| Archivos sin rastrear | 82 |
| Cambios preparados para commit | 0 |
| Rama con upstream | `origin/chore/power-editor-isolated-copy` |
| Operaciones Git realizadas en esta auditoría | 0 |

Los siete cambios rastreados son `package-lock.json`, `package.json`, `src/power-editor/client/src/lib/editorCandidateModel.ts`, `src/power-editor/client/src/pages/EditorCandidate.tsx`, `src/routeTree.gen.ts`, `src/types/database.ts` y `vite.config.ts`. El resto de los cambios relevantes está sin rastrear y se concentra en componentes, modelos, pruebas, scripts, rutas internas, migraciones ya aplicadas manualmente, artefactos y documentación del Power Editor.

La auditoría no detectó una modificación rastreada de la landing, del editor heredado, de QR ni de rutas públicas. `src/routes/internal/` corresponde a la ruta aislada de borrador; debe revisarse expresamente antes de cualquier futuro Pull Request.

## Agrupación propuesta de futuros commits

Los grupos siguientes son una propuesta de revisión y respaldo; **no se han creado commits**. Deben revisarse en orden y con las pruebas indicadas antes de aprobarlos.

| Grupo | Propósito | Archivos principales | Prueba mínima |
|---|---|---|---|
| 1. Modelo y composición V6 | PageConfig compatible, árbol de composición, renderer y controles de layouts. | `compositionModel*`, `CompositionPanel*`, `CompositionRenderer*`, modelos y pruebas V6. | Vitest completo y preview de canvas. |
| 2. Experiencia e inspector | Paletas, tarjetas, tipografía, efectos, zoom y correcciones de scroll/layout. | `Premium*`, `PowerEditorEffectPanels`, `EditorCandidate`, CSS y pruebas asociadas. | Vitest y revisión visual móvil/escritorio. |
| 3. Borrador autenticado | Servicio, hook, ruta privada y panel de autenticación reutilizado. | `power-editor-project.service*`, `usePowerEditorDraft`, `PowerEditorDraftSession`, `routes/internal/power-editor-draft/*`, tipos/ruta generada. | Prueba autenticada de carga, Guardar y recarga, ya realizada sobre un único borrador. |
| 4. Generador local de recetas | Factory V6, catálogo cliente generado, selector Recetas y auditoría de diversidad. | `scripts/*template*`, `generatedRecipeCatalog*`, `GeneratedRecipeCatalogPanel`, CSS, `package.json`. | Vitest: 63 pruebas, y aplicación local de receta. |
| 5. SQL y documentación | Migraciones entregadas/aplicadas manualmente, evidencias, handoff y checklist. | `supabase/migrations/*power_editor*`, `docs/power-editor/*`, informes raíz, `todo.md`. | Revisión humana de alcance y confirmación de no reejecución SQL. |

## Lista de verificación antes de respaldar

1. Cerrar el preview temporal antes de intentar un empaquetado completo, pues el build anterior puede verse afectado por presión de memoria.
2. Ejecutar `./node_modules/.bin/vitest run`; el último resultado fue **9 archivos y 63 pruebas correctas**.
3. Revisar manualmente la inclusión de `src/routeTree.gen.ts`: es generado y no debe editarse a mano; sólo debe quedar si refleja la ruta interna creada.
4. Mantener el sincronizador de templates en modo `dry-run`; no incluir credenciales administrativas ni ejecutar `--apply`.
5. Confirmar que el único borrador de QA puede permanecer en estado `draft` o eliminarse manualmente antes de una revisión de producción.
6. Revisar que ningún archivo `.env` ni secreto entre en el stage.
7. Autorizar explícitamente cada operación posterior: respaldo en commit, push a la rama aislada, Pull Request y fusión final son decisiones separadas.

## Recomendación de secuencia

El primer respaldo futuro debería ser hacia la misma rama aislada. Esto conserva la capacidad de revisión y no cambia la rama principal. Tras ello, una Pull Request permitirá comparar el conjunto por grupos. La fusión con la rama principal debe efectuarse sólo después de revisar las rutas internas, cerrar el build pendiente y recibir una autorización explícita distinta.
