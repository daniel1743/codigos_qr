# Cripqer — Direct Page Editor Independent Implementation Audit V1

**Proyecto:** `CRIPQER`  
**Task:** `CRIPQER_DIRECT_PAGE_EDITOR_INDEPENDENT_IMPLEMENTATION_AUDIT_V1`  
**Fecha:** `2026-09-22`  
**Modo:** `STRICT_READ_ONLY_INDEPENDENT_AUDIT`

> Auditoría del estado real del repositorio. No se modificó código, SQL, RLS,
> Power Editor ni Catálogo para producir este informe. El único artefacto nuevo
> de esta tarea es este documento.

## Executive Summary

El repositorio contiene un piloto de Direct Page Editor con una superficie de
edición propia, un `PageDocumentV1` vivo y un renderer directo. La ruta de
edición `?directEditor=magic` ya no monta `PremiumTemplateStudio` como canvas
visible. Esa separación existe en código.

El trabajo no constituye todavía un producto funcional completo. Hay cuatro
hechos decisivos:

1. La ruta pública `/pg/{public_id}` todavía usa únicamente
   `PublicTemplateRenderer` y `resolveCanonicalEditorConfig`; no detecta ni
   renderiza el envelope `direct-page`.
2. El supuesto `BlockRegistry` no existe. El renderer selecciona tipos mediante
   condicionales dentro de `DirectPageRenderer`.
3. El adapter durable de assets existe en `DirectPageEditorPilotHost`, pero el
   shell no recibe ni utiliza controles de upload, reemplazo, crop, posición o
   eliminación de imágenes.
4. La evidencia runtime disponible es parcial: confirma carga del shell propio,
   una edición de texto, inserción de un bloque, guardado, reload y publish;
   no confirma página pública, assets, acciones estructurales completas ni
   mobile 360/390/430.

**Veredicto independiente:** `PARTIALLY`.

La dirección es coherente como prototipo de edición directa de una página
Business/Services, pero está incompleta como sistema de edición y publicación
independiente. El mayor riesgo arquitectónico es que la edición ya escribe un
documento `direct-page`, mientras el runtime público todavía solo entiende el
contrato legacy.

## What Was Actually Built

### Archivos Direct Page Editor actuales

| Archivo | Estado | Qué hace realmente |
|---|---|---|
| `src/components/direct-page-editor/DirectPageEditorPilotHost.tsx` | Modificado | Comprueba sesión, carga una página propia, lee envelope directo o migra un documento legacy, crea el adapter de persistencia y monta el shell. También crea un adapter de Storage `avatars`. |
| `src/components/direct-page-editor/DirectPageEditorShell.tsx` | Modificado | Mantiene `PageDocumentV1` en estado React, selección única, historial local, inserción, duplicación, ocultación, eliminación y reordenamiento. Renderiza top bar, canvas y toolbar/sheet contextual. |
| `src/components/direct-page-editor/DirectPageRenderer.tsx` | Nuevo | Renderiza directamente `PageDocumentV1` en modos `edit`, `preview` y `public`. Implementa hero, profile, text, image, links, social y collection mediante condicionales. |
| `src/components/direct-page-editor/direct-page-editor.css` | Nuevo | Define composición visual, hero, cards, enlaces, CTA, página, grid y responsive básico. |
| `src/components/direct-page-editor/directPagePersistence.ts` | Nuevo | Encapsula `pageCanonicalService.saveDraft` y `pageCanonicalService.publish` para documentos directos. |
| `src/components/direct-page-editor/magicServicesConfig.ts` | Modificado | Crea un documento inicial hardcodeado Business/Services con hero, texto, links, collection, imagen y social. |
| `src/lib/direct-page-editor/page-document.ts` | Modificado | Define el contrato direct-only, migración inicial desde legacy, validación superficial, clone de items y reorder de bloques. |
| `src/lib/direct-page-editor/page-document.test.ts` | Modificado | Verifica creación del documento, IDs, clone, reorder, visibilidad y fallback de alineación durante migración. |
| `src/lib/canonical-page/contract.ts` | Modificado | Añade `DirectPageEnvelopeV1`, `createDirectPageEnvelope` y `readDirectPageEnvelope` junto al contrato legacy. |
| `src/lib/canonical-page/index.ts` | Modificado | Reexporta el envelope direct. |
| `src/services/page-canonical.service.ts` | Modificado | Persiste direct documents sin pasar por `validateTemplate`; mantiene el camino legacy para otros documentos. |
| `src/routes/pages.$pageId.edit.tsx` | Existente/modificado previamente | Selecciona `DirectPageEditorPilotHost` solo cuando la query es `directEditor=magic`; sin esa query monta `PowerEditorHost`. |

No existe actualmente un archivo `BlockRegistry`, ni componentes separados
`DirectHeroBlock`, `DirectCollectionBlock`, `SelectionLayer`, `FloatingToolbar`,
`MobileSheet` o `BlockPicker`. Esas responsabilidades están concentradas en
`DirectPageRenderer` y `DirectPageEditorShell`.

### Sistemas reutilizados

El piloto reutiliza:

- Supabase Auth mediante `getBrowserSupabaseClient().auth.getSession()`.
- Ownership y carga mediante `pageService.getOwnPageById`.
- Persistencia y publicación de páginas mediante `pageCanonicalService`.
- Tabla `public.pages`, `template_config` y `published_template_config`.
- Supabase Storage bucket `avatars` para el upload adapter.
- El route switch existente de `pages.$pageId.edit.tsx`.

El camino directo no utiliza como renderer visible `PremiumTemplateStudio`,
`PowerEditorHost`, `StudioProvider` ni `TemplateRenderer`. El código general
del proyecto sí conserva esos sistemas para la ruta por defecto y para páginas
legacy.

## Actual Current Architecture

### Diagrama real

```text
/pages/$pageId/edit?directEditor=magic
  -> pages.$pageId.edit.tsx
  -> DirectPageEditorPilotHost
  -> Supabase session
  -> pageService.getOwnPageById
  -> readDirectPageEnvelope(template_config)
       | direct envelope -> PageDocumentV1
       | legacy/null      -> pageDocumentFromLegacy / createMagicServicesDocument
  -> DirectPageEditorShell
  -> React state: PageDocumentV1
  -> DirectPageRenderer(mode="edit")
  -> selection + ContextualActions dentro del Shell
```

### Edición a guardado

```text
click/input/action
  -> DirectPageEditorShell.patchPath / blockAction / itemAction
  -> setDocument(next PageDocumentV1)
  -> setSaveState("dirty")
  -> DirectPageStorageAdapter.save
  -> pageCanonicalService.saveDraft
  -> createDirectPageEnvelope
  -> public.pages.template_config
```

### Publicación y lectura pública actuales

```text
DirectPageEditorShell.save(true)
  -> DirectPageStorageAdapter.publish
  -> pageCanonicalService.publish
  -> pages.published_template_config = direct envelope
  -> pages.published = true

/pg/$publicId
  -> pageService.getPublicPageByPublicId
  -> resolveCanonicalEditorConfig(published_template_config)
  -> PublicTemplateRenderer
```

La segunda cadena no contiene `readDirectPageEnvelope` ni
`DirectPageRenderer`. Por tanto, el editor puede publicar un envelope que la
ruta pública actual no sabe consumir. El mismo problema existe en
`src/routes/pg.a.$slug.tsx`.

### Autoridades

| Área | Autoridad actual |
|---|---|
| Estado vivo de edición | `useState<PageDocumentV1>` en `DirectPageEditorShell` |
| Documento | `PageDocumentV1` en `src/lib/direct-page-editor/page-document.ts` |
| Renderer de edición | `DirectPageRenderer` |
| Persistencia draft/publish | `pageCanonicalService` |
| Identidad/ownership | `public.pages`, `pageService`, sesión Supabase |
| Selección | Estado local `Selection` dentro del Shell |
| Acciones | `blockAction`, `itemAction`, `patchPath` dentro del Shell |
| Público | `PublicTemplateRenderer` para la ruta actual, solo legacy |
| Assets | Adapter local de Storage en el Host; no existe consumo desde el Shell |

## Codex Interpretation of the Current Product

El código representa un editor visual directo, de una sola página y orientado a
un piloto Business/Services. El usuario ve una composición formada por bloques,
selecciona bloques o items y puede modificar texto inline o ejecutar acciones
estructurales desde una superficie contextual.

La página está modelada como:

```text
PageDocumentV1
  -> theme
  -> ordered blocks[]
       -> block metadata/style/layout/visibility
       -> content
            -> optional items[]
  -> footer
```

`collection` es el único bloque repetible explícito. Sus `items` pueden tener
título, descripción, imagen, precio, badge y CTA. No existe una semántica de
sección independiente del bloque; una sección es, en la práctica, un bloque
renderizado por tipo.

El flujo implícito es: cargar una página propia, editar el documento en el
canvas, guardar un snapshot, publicar el mismo documento y esperar que una ruta
pública lo muestre. Esa última expectativa todavía no está cerrada por código.

## Completion Matrix

| Área | Qué existe ahora | Evidencia | Estado | Gap conocido | ¿Bloquea release usable? | Riesgo |
|---|---|---|---|---|---|---|
| Editor shell | Top bar, canvas, save/publish | `DirectPageEditorShell.tsx` | PARTIAL | Sin preview real ni control de estado de publish completo | Sí para producto | Medio |
| Document model | `PageDocumentV1` direct-only | `page-document.ts` | PARTIAL | Validación estructural superficial; footer y tema limitados | Sí | Alto |
| Renderer | `DirectPageRenderer` | `DirectPageRenderer.tsx` | PARTIAL | No registry; tipos no implementados caen a título | Sí | Alto |
| Block registry | No existe | `rg` sin `BlockRegistry` en Direct Editor | NOT_IMPLEMENTED | Condicionales crecerán con bloques | Sí para expansión | Medio |
| Hero | Hero directo con copy, imagen y CTA | `renderBlock`, `magicServicesConfig.ts` | PARTIAL | No controles específicos de hero o imagen | Sí para edición completa | Medio |
| Collection | Grid de items directos | `renderBlock` type `collection` | PARTIAL | Solo apariencia de cards/services; variantes no gobiernan render | Sí para catálogo/services real | Alto |
| Cards/items | Items con IDs y clone | `DirectItem`, `cloneCollectionItem` | PARTIAL | No edición de imagen, precio, badge o URL desde UI | Sí | Alto |
| Theme | Tokens en `PageDocumentThemeV1` | `page-document.ts`, CSS variables | PARTIAL | No controles para editar theme | Sí para personalización | Medio |
| Selection | Block/item/background state | `Selection` en Shell | PARTIAL | Click en texto se detiene y no necesariamente selecciona target textual | Sí para UX central | Alto |
| Contextual editing | Toolbar desktop y sheet mobile | `ContextualActions` | PARTIAL | Acciones genéricas, no toolbar por tipo | Sí | Alto |
| Block insertion | Botones Texto/Servicios/Imagen/Enlaces | `addBlock` | PARTIAL | No registry ni inserter para todos los tipos soportados | No para piloto mínimo; sí para producto | Medio |
| Structural actions | duplicate/hide/delete/up/down | `blockAction`, `itemAction` | PARTIAL | Sin confirmación delete; move solo un paso | Sí para seguridad/uso | Medio |
| Undo/redo | Arrays `past`/`future` en memoria | `undo`, `redo` | PARTIAL | No persistencia ni integración con reload | No para demo; sí para producto | Medio |
| Assets | Upload adapter `avatars` | `createAssetAdapter` | PROTOTYPE_ONLY | No `input`, replace, crop, position, remove ni list conectado al Shell | Sí | Alto |
| Persistence | Draft adapter a `pages.template_config` | `directPagePersistence.ts` | PARTIAL | Round-trip directo no tiene test Supabase real | Sí | Alto |
| Publication | Escribe `published_template_config` | `pageCanonicalService.publish` | PARTIAL | Public route no consume direct envelope | Sí | P0 |
| Public rendering | Legacy renderer | `pg.$publicId.tsx`, `pg.a.$slug.tsx` | NOT_IMPLEMENTED for direct | Falta branch direct | Sí | P0 |
| Mobile | CSS responsive y fixed sheet | CSS, `ContextualActions` | IMPLEMENTED_NOT_VERIFIED | Sin keyboard-aware scroll/drag/snap real | Sí para mobile | Alto |
| Visual system | Tokens CSS, hero/cards/buttons | `direct-page-editor.css` | PROTOTYPE_ONLY | Solo una composición fija; no matriz visual runtime completa | Sí para calidad | Medio |
| Legacy compatibility | Migración inicial desde legacy | `pageDocumentFromLegacy` | PARTIAL | Conversión potencialmente lossless no demostrada | Sí para páginas existentes | Alto |
| Tests | 3 tests del documento | `page-document.test.ts` | PARTIAL | Sin renderer, persistence, public, action o mobile tests | Sí | Alto |

## Known Missing Work

### 1. Branch público para direct-page — bloqueador de release

`src/lib/canonical-page/contract.ts` ya define `readDirectPageEnvelope`, y el
servicio puede guardar ese envelope. Sin embargo, `src/routes/pg.$publicId.tsx`
y `src/routes/pg.a.$slug.tsx` llaman directamente a
`resolveCanonicalEditorConfig` y siempre retornan `PublicTemplateRenderer`.

**Impacto:** una página publicada por el Direct Editor no tiene una ruta pública
verificada que sepa interpretar su documento. Es un bloqueo P0.

### 2. Edición de imagen incompleta — bloqueador funcional

`DirectPageEditorPilotHost.tsx` crea `createAssetAdapter`, pero el Shell no
recibe el adapter desde la última versión y el renderer solo muestra `<img>` o
`Añadir imagen`. No hay controles visibles para upload, replace, crop, position
ni remove.

**Impacto:** la funcionalidad de assets existe solo como infraestructura aislada,
no como interacción del producto.

### 3. Contextual editing no está realmente desglosado por objeto

`ContextualActions` solo muestra acciones genéricas de bloque/item. El renderer
usa `contentEditable` y dobles clics para algunos CTAs/links, pero no presenta
una herramienta contextual específica para hero, CTA, imagen, social o theme.

**Impacto:** el modelo es un editor de bloques con acciones genéricas, no aún la
gramática completa de edición directa descrita por sus tipos.

### 4. No hay BlockRegistry

El tipo `DirectPageBlockType` declara hero, profile, text, links, social, image,
gallery, video, collection y location, pero `DirectPageRenderer.renderBlock`
solo implementa algunos y termina con un fallback de título.

**Impacto:** declarar un tipo no equivale a soportarlo; añadir bloques exigirá
modificar un condicional central y puede degradar silenciosamente tipos nuevos.

### 5. Pruebas de integración insuficientes

`page-document.test.ts` tiene tres tests unitarios. Los informes runtime previos
(`CRIPQER_DIRECT_PAGE_EDITOR_MAGIC_RUNTIME_GATE_V1_REPORT.md`) dejan sin probar
CTA, image replace, move, duplicate, hide, public page, 360/390/430 y teclado.

**Impacto:** no existe evidencia suficiente para declarar una release funcional.

### 6. Selección textual y focus son ambiguos

En `DirectPageRenderer`, `editable()` asigna `onClick={event.stopPropagation}`.
El `BlockFrame` recibe la selección desde el contenedor, pero el click textual
no selecciona un target textual diferenciado. Esto hace que editar texto y
mostrar una toolbar específica no estén garantizados por la implementación
actual.

**Impacto:** afecta el principio central de selección directa.

### 7. Documento directivo con validación superficial

`isPageDocumentV1` solo comprueba `documentType`, `version`, `blocks` y que
`theme` sea un objeto. No valida IDs únicos, bloques, visibilidad, theme tokens,
footer ni tipos de items.

**Impacto:** un snapshot JSONB estructuralmente incompleto puede cruzar la
frontera de persistencia.

## Pilot/Temporary Code

Los siguientes elementos son explícitamente provisionales o están hardcodeados:

- `createMagicServicesDocument` contiene títulos, textos, URLs e imágenes
  Unsplash fijas.
- IDs iniciales `magic-hero`, `magic-services`, `magic-service-1`, etc.
- IDs de duplicación basados en `Date.now()` en `DirectPageEditorShell`.
- `PAGE_DOCUMENT_ADAPTER_SCOPE.collectionToServices = "PILOT_ONLY"`.
- `unsupportedFooterContent = "PILOT_ONLY_UNSUPPORTED_GENERIC_FOOTER"`.
- La migración legacy convierte algunos tipos a `collection` y productos a
  `items`, potencialmente perdiendo semántica original.
- `direct-page-editor.css` fija una composición de hero de dos columnas y un
  grid de tres columnas para links/cards.
- La toolbar mobile es un `div` fijo; no es un bottom sheet con snap, drag o
  keyboard awareness verificable.
- `pageDocumentFromLegacy` fabrica un bloque profile y usa `profile.banner` al
  migrar, aunque el nuevo documento declara otra semántica.
- El adapter de assets devuelve URLs públicas de `avatars`, pero no mantiene un
  catálogo/listado de assets ni metadatos persistidos en el documento.

Estos elementos son válidos para demostrar un piloto, no para considerarlos un
contrato de producción estable.

## Legacy Dependency Audit

| Dependencia | Clasificación | Evidencia |
|---|---|---|
| `PowerEditorHost` | COMPATIBILITY_ONLY en la ruta | `pages.$pageId.edit.tsx` lo monta cuando no existe `directEditor=magic`; el Host directo no lo importa. |
| `PremiumTemplateStudio` | COMPATIBILITY_ONLY | Permanece en la ruta por defecto/build global; no está importado por los archivos directos inspeccionados. |
| `StudioProvider` | NO_DEPENDENCY en el camino direct | No aparece en `src/components/direct-page-editor` ni `src/lib/direct-page-editor`. |
| `BioTemplateConfig` | INDIRECT_DEPENDENCY | `canonical-page/contract.ts` sigue importándolo y `page-canonical.service.ts` usa `validateTemplate` para el camino legacy. |
| `TemplateRenderer` | NO_DEPENDENCY en renderer direct | `DirectPageRenderer.tsx` es propio; el public runtime actual sí usa el renderer legacy indirectamente. |
| `PublicTemplateRenderer` | INDIRECT_DEPENDENCY para páginas públicas | Las rutas `/pg/$publicId` y `/pg/a/$slug` lo usan siempre. |
| `parametric-engine-v2` | COMPATIBILITY_ONLY | Permanece en contratos/generación del repositorio; no lo usa el Host direct para editar. |
| Engine V2 generation | COMPATIBILITY_ONLY | El documento direct se crea por `createMagicServicesDocument` o migración; no se regenera durante `patchPath`. |
| legacy block components | INDIRECT_DEPENDENCY en el public path | PublicTemplateRenderer/renderer legacy siguen siendo la salida pública actual. |
| legacy profile/banner model | COMPATIBILITY_ONLY but lossy risk | `pageDocumentFromLegacy` lee `profile` y `profile.banner` para crear el bloque `profile`. |

Conclusión factual: la superficie de edición directa está desacoplada de los
componentes visuales legacy, pero el sistema completo no está desacoplado porque
la persistencia conserva un contrato dual y la ruta pública continúa siendo
legacy.

## Visual Structure Audit

- **Hero:** grid de dos columnas, copy a la izquierda, imagen a la derecha,
  CTA redondeado y fondo de superficie.
- **Cards:** `collection` produce cards con borde, radio, sombra, imagen opcional,
  título, descripción y CTA.
- **Container:** cada bloque se envuelve en `BlockFrame`; collection añade un
  `direct-card-grid` visible.
- **Sections:** no hay objeto section independiente; `direct-section` es una
  clase visual de links/social/collection.
- **Page width:** `DirectPageEditorShell` limita el canvas a `max-w-[1240px]`;
  el CSS usa `--direct-content-width` con valor 1040px.
- **Block width:** `layout.width` se almacena, pero el renderer no aplica de
  forma completa `content`, `wide` y `full` a reglas distintas.
- **Spacing:** CSS usa `clamp` y gap fijo/semifijo; `layout.spacing` no dirige
  de forma completa la separación visual.
- **Radius:** `document.theme.radius` alimenta `--direct-radius`; algunos
  componentes derivan radios con `calc`.
- **Buttons:** `.direct-cta` define min-height 48px, pill radius, padding y
  color accent.
- **Profile/avatar:** el bloque `profile` renderiza nombre, role y descripción;
  no renderiza el campo `image` como avatar visible.
- **Composiciones múltiples:** se pueden expresar variaciones simples mediante
  tipos, contenido y tokens, pero no existen variantes visuales registradas ni
  un sistema de composición de secciones independiente.

## PageDocumentV1 Audit

El documento sí es el estado vivo del Shell: `useState<PageDocumentV1>` se
modifica por `commit`, `patchPath`, acciones de bloque e items, y se entrega
directamente a `DirectPageRenderer`.

Contrato actual:

```text
PageDocumentV1
  documentType: "direct-page"
  version: 1
  theme: PageDocumentThemeV1
  blocks: PageDocumentBlockV1[]
  footer: { visible, content }
```

Cada bloque tiene ID, tipo, variante, visibilidad por dispositivo, layout,
content y style. `DirectItem` tiene ID y campos abiertos.

### Hallazgos

- Los IDs se conservan al reorderar y `cloneCollectionItem` crea un nuevo ID.
- Los duplicados de bloques usan IDs nuevos basados en timestamp.
- El documento puede recrear la composición inicial de Magic si contiene el
  snapshot completo, pero la ruta pública aún no sabe interpretarlo.
- La migración desde legacy es one-way y puede ser lossless solo para un
  subconjunto; convierte tipos, fabrica profile y reduce theme a tokens propios.
- El template identity no es un campo explícito de `PageDocumentV1`; el starter
  se identifica de facto por los IDs y contenido de `magicServicesConfig`.
- El footer solo conserva visibilidad y branding genérico.
- Hay datos importantes fuera del documento durante runtime: ownership,
  `public_id`, publicación, revisión y assets viven en `pages`/Storage.

Por tanto, `PageDocumentV1` es autoridad de edición, pero todavía no es una
autoridad pública completa del producto.

## Persistence and Publication Audit

### Con evidencia de código

- Carga autenticada y ownership: `DirectPageEditorPilotHost` +
  `pageService.getOwnPageById`.
- Draft save: `DirectPageStorageAdapter.save` + `pageCanonicalService.saveDraft`.
- Publish: `DirectPageStorageAdapter.publish` + optimistic
  `published_revision` en `pageCanonicalService.publish`.
- Envelope direct: `createDirectPageEnvelope`/`readDirectPageEnvelope`.
- Save state local: `idle`, `dirty`, `saving`, `saved`, `error`.

### Con evidencia runtime previa

`CRIPQER_DIRECT_PAGE_EDITOR_MAGIC_RUNTIME_GATE_V1_REPORT.md` documenta carga
sin Studio chrome, edición de un título a `Servicio QA`, inserción de un bloque,
guardado, hard reload con cambios conservados y publish. Esa evidencia es
válida para esas acciones concretas, no para el flujo completo.

### Sin evidencia suficiente

- Round-trip real de un envelope `direct-page` en una página pública.
- Apertura verificable de `/pg/{public_id}` después de publicar direct.
- Persistencia de un asset subido y su render público.
- Edición de CTA, hero, imagen y item con reload.
- Duplicado independiente después de guardar.
- Publicación bajo conflicto de revisión en runtime.

No se debe declarar PASS de publicación pública mientras las rutas públicas no
tengan branch direct y no exista una prueba de integración correspondiente.

## Mobile Audit

| Aspecto | Estado | Evidencia |
|---|---|---|
| Responsive base | IMPLEMENTED_NOT_VERIFIED | Media query en `direct-page-editor.css` para max 767px. |
| Sheet contextual | PARTIAL | `ContextualActions` cambia a `fixed inset-x-0 bottom-0`; no hay snap heights ni drag. |
| Selección móvil | IMPLEMENTED_NOT_VERIFIED | Comparte estado de selección desktop; no runtime 360/390/430 verificado. |
| Teclado | NOT_IMPLEMENTED | No hay `visualViewport`, scroll al anchor, focus management ni prevención de ocultamiento. |
| Touch targets | PARTIAL | Botones tienen padding variable; no existe contrato de 44px ni test visual. |
| Overflow | IMPLEMENTED_NOT_VERIFIED | El canvas usa `overflow-auto`, pero no existe matriz runtime. |
| Reorder táctil | PARTIAL | Hay botones up/down; no drag/reorder touch. |

Los informes previos marcan 360, 390, 430 y teclado como no probados. Por eso el
estado correcto es `IMPLEMENTED_NOT_VERIFIED` o `PARTIAL`, no PASS.

## Technical Debt

| Severidad | Deuda | Consecuencia real |
|---|---|---|
| P0 | Public branch no direct | Una página direct publicada puede quedar sin renderer público compatible. |
| P1 | Asset adapter desconectado | El sistema anuncia infraestructura de assets sin una acción de usuario que la use. |
| P1 | Renderer condicional sin registry | Cada nuevo bloque aumenta acoplamiento y puede caer silenciosamente al fallback. |
| P1 | Dual contract sin pruebas end-to-end | Legacy y direct pueden divergir entre editor, draft y publicación. |
| P1 | Shell monolítico | Estado, mutations, UI contextual, picker e historial viven en un archivo comprimido y difícil de extender. |
| P2 | `contentEditable` básico | No hay commit explícito uniforme, manejo de Escape/Enter, focus ni edición de URL. |
| P2 | IDs con `Date.now()` | Riesgo de colisión en operaciones rápidas o sesiones concurrentes. |
| P2 | Layout fields parcialmente decorativos | `layout.spacing` y `layout.width` no gobiernan toda la composición CSS. |
| P3 | Comentarios/documentación desactualizados | Algunos comentarios todavía llaman al snapshot “Power Studio” aunque el camino direct usa otro documento. |

## Risks

### Riesgo arquitectónico mayor

Contrato dual sin resolver en el runtime público: direct se puede guardar, pero
la ruta pública sigue interpretando legacy.

### Riesgo funcional mayor

Las acciones que definen edición directa —CTA, imagen, hero e items— no tienen
controles específicos completos; el usuario puede ver el objeto pero no tiene
la interacción correspondiente implementada.

### Riesgo visual mayor

El renderer actual expresa una composición Magic fija y premium básica, pero no
un sistema de variantes. La fidelidad para otras páginas o documentos no está
demostrada.

### Riesgo móvil mayor

El sheet es fijo y no keyboard-aware. Un campo editable puede quedar oculto por
el teclado y no existe evidencia en los tres viewports requeridos.

## What I Would Do Next

Sin recibir nueva dirección de producto, el orden técnico que elegiría sería:

1. Cerrar primero el contrato público direct/legacy con una prueba de resolver
   y renderizar ambos tipos sin modificar identidad, QR ni RLS.
2. Crear pruebas de documento y renderer para IDs, visibilidad, tipos soportados,
   ocultación, CTA y publicación; luego ejecutar round-trip real contra el
   adapter existente.
3. Conectar el asset adapter a una interacción mínima completa: seleccionar,
   subir/reemplazar, persistir URL durable y renderizar tras reload.
4. Separar el renderer en un registry real antes de ampliar tipos o variantes.
5. Completar la selección contextual por objeto y el manejo de focus/keyboard.
6. Verificar la matriz desktop y mobile con evidencia persistida, especialmente
   360/390/430.

Postergaría nuevas plantillas, nuevas categorías, analítica adicional, SQL y
variantes visuales hasta cerrar esos contratos. Rechazaría ampliar el número de
bloques mientras `gallery`, `video` y `location` estén declarados pero no
renderizados de forma específica.

## Directional Coherence Assessment

**Respuesta:** `PARTIALLY`.

Hay coherencia en la intención técnica local: documento direct vivo, renderer
directo, shell propio y persistencia diferenciada. También se preserva el
camino legacy para la ruta sin flag.

La dirección deja de ser coherente a nivel de producto completo en tres puntos:

- edición direct produce `documentType: "direct-page"`, pero publicación pública
  no lo consume;
- se declara un conjunto de tipos/infraestructura mayor que lo que realmente
  renderiza o edita;
- la UX promete selección contextual por objeto, mientras la implementación
  actual ofrece principalmente selección de bloque y acciones genéricas.

La base es recuperable y no requiere concluir que el modelo de documento sea
incorrecto, pero no está cerrada como sistema end-to-end.

## Final Independent Verdict

### Implemented and solid

- Ruta de edición con shell propio bajo `directEditor=magic`.
- Estado vivo `PageDocumentV1` durante la edición.
- Persistencia directa separada del envelope legacy en código.
- IDs estables para bloques/items existentes durante reorder y clone explícito.
- Ownership y page identity reutilizados desde los servicios existentes.
- Pruebas unitarias básicas de documento: 3 tests PASS según la ejecución
  disponible.

### Implemented but partial

- Renderer directo.
- selección y acciones estructurales.
- hero y collection visual.
- undo/redo.
- responsive CSS y sheet móvil.
- migración legacy.
- publicación en la tabla.

### Prototype only

- Magic starter hardcodeado.
- asset upload adapter sin UI.
- variantes de bloque declaradas pero no implementadas.
- toolbar por tipo y theme editing.
- visual fidelity fuera del starter.

### Missing but required

- Branch público para `direct-page` en `/pg/$publicId` y `/pg/a/$slug`.
- Prueba end-to-end de save/reload/publish/public render.
- Flujo real de assets.
- Edición completa de CTA, hero, imagen e items.
- Registry o equivalente explícito antes de ampliar bloques.
- Focus/keyboard y mobile QA.

### Unknown / needs runtime

- Public render real después de publish.
- Asset durable en reload y página pública.
- comportamiento en 360/390/430.
- interacción con teclado.
- conflicto de publicación concurrente.
- fidelidad visual fuera del documento inicial Magic.

### Legacy dependencies remaining

- `PowerEditorHost` y `PremiumTemplateStudio`: compatibility-only para la ruta
  sin flag.
- `BioTemplateConfig`/`TemplateValidator`: indirectos en canonical service y
  contrato legacy.
- `PublicTemplateRenderer`: dependencia efectiva de todo el public path actual.
- profile/banner: compatibility-only dentro de `pageDocumentFromLegacy`.

### Biggest risks

```yaml
biggest_architectural_risk: "El documento direct puede publicarse, pero el public runtime todavía solo resuelve legacy."
biggest_functional_risk: "Las acciones de edición directa por objeto están incompletas, especialmente imagen, CTA y hero."
biggest_visual_risk: "El renderer expresa una única composición fija y no demuestra variantes ni fidelidad fuera del starter."
biggest_mobile_risk: "El sheet no tiene comportamiento keyboard-aware ni validación real en 360/390/430."
```

### Current direction

```yaml
answer: "PARTIALLY"
next_step_codex_would_choose_without_guidance: "Cerrar y probar el branch público direct/legacy antes de ampliar la UX o los bloques."
```

**SUCCESS_GATE:** `CRIPQER_DIRECT_PAGE_EDITOR_INDEPENDENT_IMPLEMENTATION_AUDIT_COMPLETE`  
**STOP_AFTER:** `true`
