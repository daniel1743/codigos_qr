# CRIPQER Magic Production Connection V1

Fecha: 2026-09-23  
Estado: **PARTIAL**

## Resultado

Se implementó la conexión productiva controlada del editor Magic sin cambiar el editor por defecto ni los sistemas congelados. El flujo queda disponible únicamente mediante:

`/pages/{pageId}/edit?magicProduction=1`

El estado final es **PARTIAL** porque el entorno de esta sesión no dispone de una página real autenticada de Supabase para certificar el recorrido completo de carga, edición, upload, guardado, reload, publicación y render público.

## Implementación

- Boundary canónico preservado: `src/isolated/magic-page-editor/`.
- Host productivo: `src/features/magic-page-editor-production/MagicProductionEditorHost.tsx`.
- Ruta piloto: `src/routes/pages.$pageId.edit.tsx`.
- El editor antiguo continúa siendo el comportamiento por defecto.
- Auth se obtiene con el cliente browser de Supabase.
- La página se carga con filtro de ownership (`id` + `user_id`); no se permite editar páginas ajenas.
- Se rechaza una configuración existente que no sea un documento Magic V1; no se realiza conversión silenciosa de documentos legacy.

## Contrato persistente

Archivo: `src/features/magic-page-editor-production/magic-document.ts`

El documento V1 contiene:

- `documentType: "magic-page"`;
- `version: 1`;
- template aprobado (`bio`, `business`, `portfolio`);
- `theme`, `content`, `texts`, `textStyles`, `props`, `blocks`, `removed`;
- `meta` con origen y versión de schema.

`serializeMagicEditorState`, `hydrateMagicEditorState` y `validateMagicPageDocumentV1` forman el adapter de persistencia. El round-trip está cubierto por `magic-document.test.ts` y pasó 2/2 tests.

## Persistencia y publicación

`src/services/magic-page.service.ts` implementa:

- lectura owner-scoped desde `public.pages`;
- autosave con debounce hacia `pages.template_config`;
- lectura posterior y validación del documento guardado;
- publicación hacia `pages.published_template_config`;
- incremento optimista de `published_revision` y actualización de `published_at`.

El host conserva el documento local para que un reload vuelva a hidratar el mismo estado cuando existe `template_config` válido.

## Imágenes

El control `ImagePicker` acepta un uploader durable. El host productivo sube a Storage bucket `avatars`, bajo una ruta namespaced por usuario y página, y persiste la URL pública en el documento. El flujo demo del laboratorio se mantiene cuando no se entrega uploader.

## Render público

Las rutas existentes mantienen sus ramas legacy y añaden dispatch Magic cuando `published_template_config` valida como documento Magic:

- `/pg/{public_id}`
- `/pg/a/{slug}`

`MagicPublicRenderer` utiliza los mismos `EditorProvider` y `TemplateRenderer` canónicos, en modo `preview`, sin chrome del editor ni `SelectionLayer`. Esto conserva la paridad visual con el editor Magic aprobado.

Analytics y resolución legacy se conservan para páginas que no son Magic.

## Regresión y límites

- Sistemas congelados sin cambios: Direct Page Editor, Power Editor, Premium Template Studio y Engine V2.
- No se conectaron Auth, Supabase, persistencia ni publicación en la ruta lab `/labs/magic-editor`.
- No se eliminó ningún route legacy.
- No se ejecutó E2E contra una cuenta/página real autenticada; por eso no se declara PASS.
- La deuda global histórica de TypeScript/lint queda fuera de alcance y no se corrigió masivamente.

## Verificaciones

| Check | Resultado |
|---|---|
| `npm run build` | PASS; Vite/Nitro producción completado |
| Test adapter Magic | PASS; 2 tests |
| `git diff --check` | PASS; solo avisos LF/CRLF |
| TypeScript global | baseline existente; chequeo enfocado sin errores Magic observables hasta el cierre de esta sesión |
| E2E Supabase real | ENVIRONMENT_BLOCKED; falta sesión/página de QA autenticada |

## Cierre

La conexión queda preparada para piloto con feature flag explícito. Antes de autorizar `CRIPQER_MAGIC_PRODUCTION_CONNECTION_PASS`, debe ejecutarse con una página real: cargar, editar texto, subir imagen, guardar, hacer hard reload, publicar y verificar ambos URLs públicos con el mismo documento Magic.
