# Cripqer — Direct Page Editor V1 Core Closure Report

**Task:** `CRIPQER_DIRECT_PAGE_EDITOR_V1_CORE_CLOSURE`  
**Proyecto:** `CRIPQER`  
**Fecha:** `2026-09-22`  
**Scope:** `BUSINESS_SERVICES_DIRECT_PAGE_V1_CORE`  
**Estado:** `PARTIAL`

## HEAD BEFORE / HEAD AFTER

```text
HEAD BEFORE: e3fce2be17ded7ee2f7bbe90d344fd9cc6d4b7da
HEAD AFTER:  e3fce2be17ded7ee2f7bbe90d344fd9cc6d4b7da
```

No se creó commit. Los cambios de Analytics y otros documentos visibles en el
worktree son preexistentes o pertenecen a tareas paralelas; no forman parte de
este cierre.

## Implementación realizada

### Archivos nuevos o modificados para Direct Page V1

- `src/components/direct-page-editor/DirectBlockRegistry.tsx` — registry de
  `hero`, `profile`, `text`, `links`, `social`, `image` y `collection`, con
  metadata de variantes/capacidades y tipos unsupported explícitos.
- `src/components/direct-page-editor/DirectPageRenderer.tsx` — renderer directo
  que orquesta el registry en `edit`, `preview` y `public`.
- `src/components/direct-page-editor/DirectPageEditorShell.tsx` — estado vivo,
  selección, edición contextual, save/publish, historial, acciones estructurales
  y upload de imagen.
- `src/components/direct-page-editor/DirectPageEditorPilotHost.tsx` — auth,
  ownership, carga del documento y adapter durable de Storage.
- `src/components/direct-page-editor/directPageAssets.ts` — contrato de assets e
  IDs robustos con `crypto.randomUUID` cuando está disponible.
- `src/components/direct-page-editor/directPagePersistence.ts` — frontera de
  draft/publish hacia `pageCanonicalService`.
- `src/components/direct-page-editor/direct-page-editor.css` — composición
  visual directa y responsive base.
- `src/components/direct-page-editor/magicServicesConfig.ts` — starter
  Business/Services del piloto.
- `src/lib/direct-page-editor/page-document.ts` — contrato, migración legacy,
  validación de estructura, clone y reorder.
- `src/lib/direct-page-editor/page-document.test.ts` — 4 tests de documento,
  IDs, reorder, migración y validación de duplicados.
- `src/lib/canonical-page/contract.ts` / `index.ts` — envelope y lectura
  `direct-page`.
- `src/services/page-canonical.service.ts` — persistencia dual direct/legacy.
- `src/routes/pg.$publicId.tsx` — resolución pública dual.
- `src/routes/pg.a.$slug.tsx` — resolución pública dual conservando alias.

No se modificaron SQL, RLS, Power Editor, PremiumTemplateStudio, Engine V2,
Catálogo AntiGravity, QR identity ni Analytics.

## Architecture after implementation

```text
/pages/$pageId/edit?directEditor=magic
  -> DirectPageEditorPilotHost
  -> session + pageService.getOwnPageById
  -> readDirectPageEnvelope / pageDocumentFromLegacy / starter
  -> PageDocumentV1 vivo en DirectPageEditorShell
  -> DirectPageRenderer
  -> DirectBlockRegistry
  -> selección + contextual actions

save
  -> DirectPagePersistence
  -> pageCanonicalService.saveDraft
  -> pages.template_config

publish
  -> pageCanonicalService.publish
  -> pages.published_template_config

/pg/$publicId o /pg/a/$slug
  -> published_template_config solamente
  -> readDirectPageEnvelope
       direct-page -> DirectPageRenderer(mode="public")
       legacy      -> resolveCanonicalEditorConfig -> PublicTemplateRenderer
```

El draft nunca es leído por las rutas públicas. `public_id`, slug, ownership,
QR y Analytics permanecen fuera del documento y conservan sus autoridades
existentes.

## Public direct/legacy resolution

Implementado en ambas rutas públicas:

```text
published_template_config
  -> readDirectPageEnvelope()
  -> si es direct-page: DirectPageRenderer public
  -> si no: resolveCanonicalEditorConfig() + PublicTemplateRenderer
```

La ruta legacy no fue reemplazada globalmente. La ruta direct no monta editor,
selección, toolbar, sheet ni Studio chrome.

La rama fue verificada por compilación, pero no se completó una navegación
runtime con una página publicada direct real y su `public_id`. Por ello el gate
público queda `RUNTIME_PENDING`, no `PASS`.

## BlockRegistry

`DirectBlockRegistry.tsx` resuelve actualmente:

| Tipo | Renderer | Estado |
|---|---|---|
| `hero` | hero directo con copy, imagen y CTA | Implementado |
| `profile` | texto + avatar si existe | Implementado |
| `text` | título + body inline | Implementado |
| `links` | grid de links | Implementado |
| `social` | grid reutilizando links | Implementado |
| `image` | imagen o placeholder | Implementado |
| `collection` | items/cards + CTA | Implementado |
| `gallery` | — | Declarado, unsupported |
| `video` | — | Declarado, unsupported |
| `location` | — | Declarado, unsupported |

`DirectPageRenderer` quedó como orquestador; no contiene un switch monolítico de
tipos. Las capacidades del registry aún son metadata de UI, no un sistema de
formularios automático.

## Contextual action matrix

| Objeto | Selección | Acción disponible | Persistencia |
|---|---|---|---|
| Bloque | click sobre frame | subir, bajar, duplicar, ocultar, eliminar, alineación | `PageDocumentV1` |
| Texto | contentEditable inline dentro del bloque | edición de texto; controles de bloque compartidos | `content.*` |
| Hero | frame/CTA | selección de bloque, reemplazo de imagen, CTA | `content.image` / CTA |
| Imagen | frame | input local + upload durable + escritura de URL | `content.image` |
| CTA | click en CTA | label y URL mediante controles contextuales | `content.*.cta` |
| Collection item | click en card | subir, bajar, duplicar, eliminar, reemplazar imagen | `content.items[]` |
| Fondo | click en canvas | selección de fondo; no hay palette de theme completa | parcial |
| Mobile | selección existente | bottom sheet fijo con acciones | mismo documento |

La selección sigue siendo única mediante `Selection { kind, blockId, itemId,
path }`. No existe inspector permanente.

## Asset flow

```text
input type=file
  -> DirectAssetAdapter.upload
  -> Supabase Storage avatars/{userId}/direct-page-editor/...
  -> public URL durable
  -> PageDocumentV1 content.image
  -> save/publish
```

No se persisten blob URLs, data URLs ni localStorage como autoridad. El flujo
está conectado a imágenes de bloque e items. Crop avanzado, posición y listado
de assets no forman parte de este cierre.

## PageDocument validation

`validatePageDocumentV1` ahora verifica:

- `documentType` exacto y `version` 1.
- theme tokens principales, radius y content width.
- bloques como array con IDs únicos.
- tipos declarados soportados.
- `variant`, `visible`, visibilidad por dispositivo y valores de layout.
- IDs únicos de items.
- forma básica del footer.

Los IDs nuevos de bloques/items usan `crypto.randomUUID` con fallback no
canónico solo para entornos sin Web Crypto. La prueba de documentos cubre
duplicados y devuelve errores en vez de aceptar el snapshot silenciosamente.

## Mandatory status table

| Área | Antes | Después | Runtime verified | Estado |
|---|---|---|---|---|
| Public direct rendering | Solo legacy | Branch direct + legacy | No | PARTIAL |
| BlockRegistry | Ausente | Registry real para 7 tipos | No | CODE PASS / RUNTIME PENDING |
| Hero | Condicional en renderer | Componente del registry | No | PARTIAL |
| Text | Inline básico | Inline + documento direct | Sí, informe previo | PARTIAL |
| CTA | Doble click parcial | Selección + label/URL contextuales | No | PARTIAL |
| Image | Placeholder/imagen | Upload durable conectado | No | PARTIAL |
| Collection | Grid de cards | Registry + item actions | Parcial, informe previo | PARTIAL |
| Selection | Bloque/item básico | kind + blockId/itemId/path | Parcial | PARTIAL |
| Contextual toolbar | Genérica | Acciones por selección | No completo | PARTIAL |
| Assets | Adapter aislado | Input -> Storage -> URL | No | PARTIAL |
| Save | PASS previo | Adapter direct conservado | Sí, informe previo | PARTIAL |
| Hard reload | PASS previo para edición simple | Direct envelope validado | No con asset | PARTIAL |
| Publish | PASS previo sin público | Public snapshot dual | No público | PARTIAL |
| Public page | No verificada | Branch direct implementado | No | RUNTIME_PENDING |
| Mobile 360 | No probado | CSS/sheet implementados | No | RUNTIME_PENDING |
| Mobile 390 | No probado | CSS/sheet implementados | No | RUNTIME_PENDING |
| Mobile 430 | No probado | CSS/sheet implementados | No | RUNTIME_PENDING |
| Keyboard | No implementado | Sin viewport-aware focus completo | No | NOT READY |
| Visual parity | Prototype-only | Registry + avatar + base visual | No | PARTIAL |

## Code verification

| Verificación | Resultado |
|---|---|
| Focused Vitest | PASS — 4 tests |
| Focused ESLint | PASS — 0 errores; 1 warning Fast Refresh |
| `git diff --check` | PASS |
| Production build | PASS — client, SSR y Nitro |
| SQL/RLS changes | NONE |
| Runtime editor | No completado en esta sesión |
| Runtime public | No completado en esta sesión |
| Runtime mobile | No completado en esta sesión |

Warnings de build existentes sobre `@theme`, tamaño de chunks y un test de
rutas sin export `Route` no son errores introducidos por el cierre direct.

## Runtime E2E matrix

La evidencia runtime previa disponible confirma: shell propio, ausencia de
Studio chrome, edición de texto, inserción de bloque, save, hard reload y
publish. La sesión de Chrome actual quedó bloqueada durante la recarga y no
permitió completar la nueva matriz.

| Paso | Estado | Evidencia |
|---|---|---|
| Load owned Business/Services page | RUNTIME_PENDING | Auth/service implementados; nueva observación bloqueada |
| Edit Hero title | RUNTIME_PENDING | Renderer/capability implementados; no observado |
| Edit text | PASS previo | Runtime report anterior |
| Edit CTA label/URL | RUNTIME_PENDING | Controles implementados; no observado |
| Replace image | RUNTIME_PENDING | Adapter/UI implementados; no observado |
| Edit collection item | PARTIAL previo | Items seleccionables; no round-trip completo |
| Add block | PASS previo | Runtime report anterior |
| Move block | RUNTIME_PENDING | Código implementado; no observado |
| Duplicate block | RUNTIME_PENDING | Código implementado; no observado |
| Hide block | RUNTIME_PENDING | Código implementado; no observado |
| Save | PASS previo | Guardando -> Guardado |
| Hard reload | PASS previo | Texto y bloque persistieron |
| Publish | PASS previo | Estado Guardado observado |
| Resolve actual public_id | RUNTIME_PENDING | No completado |
| Open `/pg/{public_id}` | RUNTIME_PENDING | No completado |
| No editor chrome public | RUNTIME_PENDING | No completado |
| Hidden block absent public | RUNTIME_PENDING | No completado |
| CTA URL public | RUNTIME_PENDING | No completado |
| Durable asset public | RUNTIME_PENDING | No completado |

## Mobile matrix

| Viewport | Estado | Observación |
|---|---|---|
| 360px | RUNTIME_PENDING | CSS y sheet existen; sin prueba runtime |
| 390px | RUNTIME_PENDING | CSS y sheet existen; sin prueba runtime |
| 430px | RUNTIME_PENDING | CSS y sheet existen; sin prueba runtime |
| Keyboard | NOT_READY | Falta scroll-to-selection y ajuste de viewport |
| Touch targets | PARTIAL | Controles presentes; sin QA de densidad |
| Reorder | CODE PASS | up/down disponibles; sin QA táctil |

## Visual parity assessment

El cierre mejora la estructura y mantiene la composición directa: hero de dos
columnas, cards individuales, CTA pill/tall, tokens de theme y responsive base.
El avatar ya se renderiza si existe.

No se declara `CRIPQER_DIRECT_PAGE_MAGIC_VISUAL_PARITY_PASS` porque no hubo
observación runtime de desktop/móvil en esta sesión y el sistema todavía usa un
starter Magic limitado. La colección no agrega un contenedor gigante adicional;
el borde visible de selección pertenece al editor.

## Screenshots and evidence paths

- Evidencia runtime previa: `CRIPQER_DIRECT_PAGE_EDITOR_MAGIC_RUNTIME_GATE_V1_REPORT.md`.
- Evidencia de separación UI: `CRIPQER_DIRECT_PAGE_EDITOR_MAGIC_UI_SEPARATION_V1_REPORT.md`.
- No se generaron screenshots nuevos persistidos en archivos locales.
- La automatización Chrome fue intentada, pero la recarga excedió el tiempo de
  la sesión y no se usa como evidencia PASS.

## Remaining pilot-only code

- `magicServicesConfig.ts` mantiene textos, URLs e imágenes iniciales hardcodeadas.
- El starter es una sola composición Business/Services.
- `gallery`, `video` y `location` quedan unsupported.
- Crop avanzado, posición de imagen y asset library quedan fuera.
- Las capacidades del registry aún no generan automáticamente todos los
  controles de edición.
- El bottom sheet no tiene snap states, drag ni keyboard awareness completa.

## Remaining known limitations

1. Falta verificación E2E real de direct draft -> reload -> publish -> public.
2. Falta probar el flujo durable de imagen en navegador.
3. Falta QA de 360/390/430 y teclado.
4. Falta prueba específica de compatibilidad legacy después del branch público.
5. La edición de theme se limita a tokens almacenados; no hay palette contextual
   completa para background.
6. La ruta por defecto sigue usando Power Editor intencionalmente; solo la query
   `directEditor=magic` activa este editor.

## Final status

```yaml
status: "PARTIAL"
reason: "El núcleo de código direct/legacy, registry, validación y asset wiring está implementado y compila, pero falta evidencia runtime pública, asset, E2E completo y mobile."
success_gate: "CRIPQER_DIRECT_PAGE_EDITOR_V1_CORE_CLOSURE_PASS"
stop_after: true
```
