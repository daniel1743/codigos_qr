# Cripqer Power Editor — ejecución autónoma aislada

**Estado:** implementación local preparada; ninguna sentencia SQL fue ejecutada por esta fase; no hubo commit, push, merge ni despliegue.

## Alcance realizado

Se trabajó exclusivamente en dos frentes aislados: el catálogo generativo de templates Power Editor y la persistencia real de borradores a través de una ruta temporal no enlazada. No se modificaron `/editor`, `/admin/template-studio`, paneles administrativos, QR, `public_id`, slug, rutas públicas, navegación, PageConfig canónico ni la lógica de publicación.

| Frente | Resultado |
|---|---|
| Generador | Pack offline reproducible de 12 recetas con diversidad estructural, medios únicos en banners/avatares y auditoría determinista. |
| Conexión de borradores | Ruta temporal `/internal/power-editor-draft/$projectId` que carga un proyecto propio, hidrata la configuración, conserva Undo/Redo y guarda sólo `page_config`. |
| SQL pendiente | V6 endurece edición de archivados; dos tablas de auditoría habilitan la sincronización de templates maestros. Ambos documentos quedan para aplicación manual. |

## Catálogo diverso de templates

El generador vive en `scripts/power-editor-template-factory.mjs`. Sus doce recetas combinan materiales oro, platino, obsidiana, esmeralda, cobalto, rosa, terracota e ivory; banners activos y desactivados; avatares de foto y monograma; alineaciones distintas; tipografías diferentes; CTAs de una y dos columnas; vídeos; tarjetas; galerías; servicios; productos; reservas; FAQ; contacto; mapa; figuras, aros, ornamentos, marcos y partículas.

El pack se escribe en `artifacts/power-editor-template-pack.json`. Cada receta tiene una huella de composición independiente del nombre interno, y la auditoría calcula también distancia estructural mínima por pares. Las reseñas permanecen sin ítems: no se crean testimonios ni calificaciones ficticias.

| Métrica de auditoría | Resultado verificado |
|---|---:|
| Templates generados | 12 |
| Huellas distintas | 12 |
| Duplicados | 0 |
| Distancia estructural mínima | 8 |
| Tipos de bloque cubiertos | 25 de 25 |
| Medios existentes comprobados | 7 de 7 referencias |

Los comandos son reproducibles y no llaman a Supabase:

```bash
npm run templates:power:generate
npm run templates:power:audit
npm run templates:power:verify
```

## Sincronizador protegido de templates maestros

El script `scripts/sync-power-editor-template-pack.mjs` transforma el pack offline en templates maestros sólo después de que las tablas manuales de auditoría estén aplicadas. Por defecto corre en **dry-run**, sin red ni escrituras:

```bash
npm run templates:power:sync:dry-run
npm run templates:power:sync:verify
```

La escritura requiere explícitamente `--apply`, tres variables de servidor y la confirmación `POWER_EDITOR_TEMPLATE_SYNC_CONFIRM=I_UNDERSTAND`. El secreto `SUPABASE_SERVICE_ROLE_KEY` nunca se usa desde el navegador. Las recetas nuevas se insertan en `draft`; nunca se publican automáticamente. Cuando una receta ya corresponde a un master `published`, el sincronizador la omite y no la sobrescribe.

## Guardar borrador conectado de forma temporal

La ruta aislada recibe `projectId` como parámetro y no está enlazada desde navegación. Su flujo es:

```text
sesión Supabase → projectId explícito → getOwnedEditableProject
→ comprobación profiles.id / profiles.user_id → hydratePageConfig
→ edición con historial local → saveDraft(page_config) → estado de guardado
```

`usePowerEditorDraft` maneja carga, guardado, conexión perdida, reintento, sesión terminada, proyecto inexistente o ajeno y proyecto archivado. Antes de cada escritura vuelve a consultar la sesión. La operación concurrente se deduplica mediante una promesa en vuelo. La respuesta de guardado no rehidrata el editor: Undo/Redo no se borra al guardar.

`powerEditorProjectService.saveDraft` actualiza únicamente `page_config`, filtra por el `id` y el `owner_user_id` activos, y limita estado a `draft` o `published`. No recibe ni escribe `template_id`, `profile_id`, `owner_user_id`, `status`, `published_page_config` ni `published_at`.

## Calidad verificada

| Comprobación | Estado |
|---|---|
| Vitest: fábrica, sincronizador y servicio | 9 pruebas aprobadas en 3 archivos. |
| Auditoría de diversidad | Aprobada: 12/12 huellas distintas, cobertura 25/25, distancia mínima 8. |
| Dry-run del sincronizador | Aprobado: 12 blueprints únicos, sin contacto con Supabase. |
| Lint focalizado de archivos nuevos | Aprobado. |
| Build del worktree aislado | Aprobado con `npm run build`. |
| Ruta temporal en árbol TanStack | Generada automáticamente en `src/routeTree.gen.ts`; no fue editada manualmente. |

No se hizo prueba E2E real contra Supabase desde el worktree porque no contiene las variables del proyecto y no existe aún un `projectId` de borrador permanente para esa ruta. La validación de ownership/RLS manual de V4/V5 ya se ejecutó anteriormente en Supabase; V6 queda pendiente para endurecer la edición de archivados antes de exponer la ruta a usuarios.

## SQL manual pendiente

El documento `POWER_EDITOR_FINAL_MANUAL_SQL.md` reúne el orden, preflights, rollback, verificación y pruebas reversibles. Los archivos listos para revisión son:

| Archivo | Aplicación manual requerida |
|---|---|
| `supabase/migrations/20260826095500_fix_power_editor_archived_update_v6.sql` | Añade el filtro RLS que impide actualizar proyectos `archived`. |
| `supabase/migrations/20260826100000_create_power_editor_generator_audit_v1.sql` | Crea `power_editor_template_blueprints` y `power_editor_template_generation_runs`; no inserta datos. |

No aplicar V6 ni las tablas sin completar sus preflights. Después de la verificación manual, configurar las variables de servidor y ejecutar primero el dry-run. Sólo una autorización posterior puede permitir sincronización de masters o promoción/publicación de templates.

## Archivos añadidos o modificados en este alcance

| Tipo | Archivos |
|---|---|
| Generador y QA | `scripts/power-editor-template-factory.mjs`, `scripts/audit-power-editor-template-pack.mjs`, `scripts/sync-power-editor-template-pack.mjs`, `scripts/verify-power-editor-template-sync-dry-run.mjs` y sus pruebas. |
| Borradores | `src/services/power-editor-project.service.ts`, `src/services/power-editor-project.service.test.ts`, `src/power-editor/client/src/hooks/usePowerEditorDraft.ts`, `src/power-editor/client/src/components/PowerEditorDraftSession.tsx`, `src/routes/internal/power-editor-draft/$projectId.tsx`. |
| Adaptador mínimo | `src/power-editor/client/src/pages/EditorCandidate.tsx`, sólo para inyectar el bridge de borrador, mantener Undo/Redo y redirigir los dos controles existentes de Guardar a escritura remota en la ruta temporal. |
| Configuración | `package.json`, `package-lock.json`, `src/types/database.ts`, `src/routeTree.gen.ts` regenerado automáticamente. |
| SQL/documentación | Los dos SQL pendientes y la documentación de revisión asociada. |

## Límites que siguen vigentes

La ruta temporal no está publicada ni enlazada. El botón Finalizar/Publicar no se conectó. No existe creación automática de proyectos, selector de templates maestro para usuarios ni exposición pública del catálogo. Esas fases permanecen separadas para no romper los editores y rutas congeladas.
