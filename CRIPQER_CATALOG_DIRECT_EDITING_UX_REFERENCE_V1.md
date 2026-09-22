# Cripqer — Catalog Direct Editing UX Reference V1

**Proyecto:** `CRIPQER`  
**Task:** `CRIPQER_CATALOG_FROZEN_UX_EXTRACTION_V1`  
**Fecha:** `2026-09-22`  
**Modo:** `READ_ONLY_UX_EXTRACTION`  
**Estado del Catálogo:** `FROZEN / OFFICIAL_DIRECT_EDITING_UX_PROTOTYPE`

> Este documento extrae reglas de interacción del prototipo congelado. No propone cambios al Catálogo, no modifica componentes, no añade funcionalidades y no constituye una implementación del editor final.

## EXECUTIVE SUMMARY

El Catálogo funciona porque la página se mantiene visible mientras el usuario edita directamente el objeto que está mirando. La interacción principal no comienza en un panel: comienza tocando el texto, la imagen, el botón, la etiqueta, la tarjeta o el fondo.

El patrón observado es:

```text
ver página
  -> seleccionar objeto visible
  -> mostrar una única herramienta contextual
  -> aplicar acciones frecuentes cerca del objeto
  -> abrir "Más" o Inspector solo para acciones avanzadas
  -> actualizar inmediatamente la página
```

Las reglas más reutilizables son:

- Un solo objeto queda activo por vez.
- La selección se expresa visualmente mediante outline, ring, etiqueta y toolbar contextual.
- El contenido editable conserva su posición y se convierte en `contentEditable`; no se sustituye por una pantalla de formulario.
- Las acciones frecuentes son directas y visibles: fuente, tamaño, color, estilo, alineación, cambiar imagen y quitar.
- Los controles secundarios viven en popovers pequeños; los ajustes de precisión viven en `Más` o `Ajustes avanzados`.
- El cambio se refleja inmediatamente sobre la página.
- En móvil, la toolbar flotante se transforma en un bottom sheet con tres alturas y arrastre vertical.
- El Catálogo demuestra el patrón, pero no debe trasladarse literalmente como arquitectura de datos, editor de publicación o modelo visual universal.

## CATALOG UX MAP

| Objeto visible | Entrada | Herramienta contextual | Resultado inmediato | Nivel avanzado |
|---|---|---|---|---|
| Título de página | Click/tap sobre el texto | Toolbar de texto | El texto entra en edición y conserva su lugar | Inspector |
| Descripción de página | Click/tap sobre el texto | Toolbar de texto | Edición inline | Inspector |
| Título de producto | Click/tap sobre el texto | Toolbar de texto | Edición inline | Reset, badge, duplicar, detalle y otros en Más |
| Descripción de producto | Click/tap sobre el texto | Toolbar de texto | Edición inline | Inspector y acciones compartidas |
| Precio | Click/tap sobre el precio | Toolbar de texto | Edición inline de una línea | Inspector |
| Imagen | Click/tap sobre la imagen | Toolbar de imagen | Cambiar o quitar | Recorte, posición, reintento, Más |
| CTA | Click/tap sobre el botón | Toolbar de CTA | Editar texto, enlace, color, estilo o alineación | Inspector y acciones compartidas |
| Badge | Click/tap sobre la etiqueta | Toolbar de badge | Texto y estilo de etiqueta | Fondo, eliminar, Inspector |
| Tarjeta | Click/tap sobre espacio de la tarjeta | Toolbar de tarjeta | Selección de la tarjeta | Duplicar, mover, detalle, fondo, borde, radio, eliminar |
| Fondo de página | Click/tap sobre espacio vacío | Toolbar de página | Cambiar color de fondo | Tema e Inspector |

La página permanece siendo el contexto principal. Las herramientas son una capa temporal que aparece solo cuando existe una selección.

## INTERACTION MAP

### Página y texto

```yaml
object: "Product title"

user_action:
  "Click/tap title"

editor_response:
  "Select the title, focus the inline editable node and show the contextual text toolbar"

direct_controls:
  - "font"
  - "size"
  - "color"
  - "weight"
  - "italic for title"
  - "underline for title"
  - "alignment"

advanced_controls:
  - "reset format"
  - "advanced inspector"
  - "shared card actions"

expected_result:
  "Immediate visual update without leaving the page"
```

### Imagen

```yaml
object: "Product image"

user_action:
  "Click/tap image"

editor_response:
  "Show image selection ring and image toolbar"

direct_controls:
  - "Cambiar imagen"
  - "Quitar"

secondary_controls:
  - "Recortar"
  - "Posición"

advanced_controls:
  - "Reintentar subida when image state is error"
  - "shared card actions"

expected_result:
  "Image state, crop or focus updates in place"
```

### CTA

```yaml
object: "Product CTA"

user_action:
  "Click/tap button while editing"

editor_response:
  "Prevent navigation, select the CTA and show CTA toolbar"

direct_controls:
  - "button text"
  - "link"
  - "color"
  - "style"
  - "alignment"

advanced_controls:
  - "advanced inspector"
  - "shared card actions"

expected_result:
  "Button changes immediately while the CTA remains in its card position"
```

### Tarjeta

```yaml
object: "Product card"

user_action:
  "Click/tap card chrome or non-editable card space"

editor_response:
  "Show card outline and card toolbar"

direct_controls:
  - "Duplicar"
  - "Mover"
  - "Ver detalle"
  - "Fondo"
  - "Borde"
  - "Radio"
  - "Eliminar"

advanced_controls:
  - "Añadir Etiqueta / Badge"
  - "Ajustes avanzados"
  - "detail content"

expected_result:
  "Card order, chrome or lifecycle action changes without opening a separate editor"
```

### Fondo

```yaml
object: "Page background"

user_action:
  "Click/tap blank page area"

editor_response:
  "Select page background and show page toolbar"

direct_controls:
  - "background color palette"
  - "Tema"

advanced_controls:
  - "Ajustes avanzados"

expected_result:
  "The canvas background changes immediately and remains visible behind the catalog"
```

## TEXT EDITING

Text editing is inline rather than panel-first.

Observed behavior:

- `InlineText` renders the original heading, paragraph, price or badge in its normal page position.
- In edit mode the node is `contentEditable`, focusable and marked as an editable target.
- Mouse down activates selection and stops propagation so the parent card does not become the active object.
- Focus also activates the same target, which supports keyboard navigation.
- On selection, the current text is focused and the caret is placed at the end.
- Input events write directly to the corresponding state field.
- Single-line fields finish on Enter by blurring; Escape blurs the field.
- Text remains visible in its real layout while editing; titles and descriptions stop being clamped while selected.
- Selected text receives a soft selection background, outline and a small object label.
- The toolbar separates high-frequency text controls from advanced actions.

Text toolbar hierarchy:

1. Fuente.
2. Tamaño.
3. Color.
4. Negrita.
5. Cursiva and subrayado for titles.
6. Alineación.
7. Más / Inspector.

The price follows the same direct-editing model as title and description, while its style is kept as a distinct text style in the prototype.

## IMAGE EDITING

Image selection is spatial and explicit:

- Clicking the image selects the image rather than the card.
- The image receives a blue selection shadow and a small `Imagen` label.
- Keyboard Enter or Space can activate the image target.
- `Cambiar imagen` opens a modal with `Mis imágenes` and `Subir foto` tabs.
- Selecting a library image applies it immediately and closes the modal.
- Uploading a file enters a `Preparando tu foto…` state before becoming ready.
- A failed image displays a visible error strip with `Reintentar`.
- `Quitar` changes the image to the empty state.
- Empty image state exposes an in-place `Añadir foto` action.
- Reference images carry a visible `Imagen de referencia` badge in edit mode.
- `Recortar` exposes fixed ratios `4/3`, `1/1` and `3/4`.
- `Posición` exposes `Arriba`, `Centro` and `Abajo`.

Feedback is layered onto the image itself: selection ring, preparation state, error state, retry, empty placeholder and reference provenance.

## CTA EDITING

The CTA has two modes:

### Edit mode

- Mouse down stops card selection and selects the CTA.
- The CTA remains a button visually, but navigation is suppressed.
- Text and link use popover fields.
- Link editing has an explicit `Aplicar` action.
- Color uses a quick palette with ten colors and a `Más` path to the Inspector.
- Style exposes `Sólido`, `Contorno` and `Texto`.
- Alignment uses left, center and right icon controls.
- The selected CTA receives a ring and the `Botón` label.

### Preview mode

- Selecting preview clears the edit selection.
- Clicking a CTA with an HTTP link opens it in a new tab.
- A CTA without an HTTP link opens the product detail view.

The same visible button therefore behaves as an editable object in edit mode and as a real action in preview mode.

## CARD EDITING

Card selection occurs when the user clicks card chrome or a non-editable part of the card. Editable children stop propagation so the card does not steal their selection.

Card-level actions:

- `Duplicar` clones the selected card after the source card and selects the clone.
- `Mover` exposes `Antes` and `Después`.
- `Ver detalle` opens the product detail view.
- `Fondo` exposes a quick color palette.
- `Borde` exposes quick border colors and `Sin borde`.
- `Radio` exposes a stepper with a bounded range.
- `Eliminar` opens a confirmation modal.
- `Más` contains badge creation, duplicate, advanced settings, detail and delete.

Content actions:

- Title, description, price, image, CTA and badge are independent targets inside the same card.
- Selecting a child replaces the card selection rather than adding a second toolbar.
- The card outline disappears when a child target becomes active, while the child gets its own visual affordance.

Badges and categories:

- A card can display multiple category IDs, but the add-category action stops adding after two categories.
- Badge text is editable inline.
- Badge selection includes both `cardId` and `subId`, preventing ambiguity between badges on the same card.
- Badge toolbar supports font, size, text color, background and removal.
- Removing a badge returns selection to the card.

Scale actions:

- `+ Añadir producto` clones the last product and scrolls toward the bottom.
- `Añadir varios…` offers 10, 20, 30 and 50 products, with a maximum of 50.
- `Duplicar tarjeta` inserts the clone immediately after the source.
- The catalog grid flows through one, two or three columns depending on viewport.

## BACKGROUND EDITING

The page background is selected by clicking blank workspace space, provided the click did not land on an anchor or editor chrome.

Observed behavior:

- The selection target is `page` with no product ID.
- The page background gets a contextual toolbar instead of a floating persistent panel.
- Quick colors are shown in a palette.
- `Tema` and `Ajustes avanzados` route to deeper controls.
- Page title and page description are separate targets and use the same text editing contract as product text.
- The background change is immediately visible across the full canvas.

This is a strong candidate for a universal page-level target, provided future page types preserve the distinction between page background and section/container background.

## SELECTION MODEL

### Active object

The selection model is a single discriminated target:

```text
selection = {
  cardId,
  kind,
  subId?
}
```

`kind` identifies `card`, `title`, `description`, `price`, `image`, `cta`, `page`, `page-title`, `page-description` or `badge`. `subId` disambiguates a badge within a card.

### Outline and focus

- Card: outline with offset and `Tarjeta` label.
- Text: selection background, thin blue shadow and object label.
- Image: blue selection shadow and `Imagen` label.
- CTA: blue ring and `Botón` label.
- Badge: ring around the specific badge.
- Page: toolbar context without a product card outline.

The visual language makes the active target readable without requiring the toolbar label alone.

### Deselection and change

- Escape clears the selection.
- The toolbar close button dispatches the same Escape behavior.
- Selecting another target replaces the previous selection.
- Clicking blank page area selects the page background.
- Clicking a child target stops parent propagation.
- Preview mode clears the editing selection.
- Popovers close on outside click or Escape while preserving the selected object.

### Avoiding duplicate toolbars

- Only `DesktopToolbar` or `MobileSheet` is rendered according to the mobile breakpoint.
- Both consume the same selection and `ToolbarContent` model.
- Popovers are nested inside the active toolbar and do not create a second contextual toolbar.
- `data-anchor` gives each target one stable anchor key.
- The toolbar is positioned from the selected target's DOM rectangle.

## DESKTOP MODEL

Desktop behavior begins at viewport widths of 1024px and above.

Layout:

- Sticky top bar with brand, catalog count, Editar/Vista previa switch, advanced settings and Publicar.
- Scrollable page canvas below the top bar.
- Canvas maximum width is 1240px with a three-column catalog grid at large widths.
- The contextual toolbar is fixed and positioned from the selected target rectangle.
- The toolbar flips above or below depending on available vertical space.
- Horizontal position is clamped inside viewport edge margins.
- A side Inspector can occupy 320px on the right at large widths.

Toolbar hierarchy:

```text
target label
  -> primary controls
  -> divider
  -> secondary controls
  -> divider
  -> Más
  -> close selection
```

The canvas remains the dominant visual surface. The toolbar is compact, temporary and anchored to the active content rather than to a permanent editor rail.

## MOBILE MODEL

The mobile model is active below 1024px and is designed to be evaluated at 360px, 390px and 430px.

### Bottom sheet

The contextual toolbar becomes a fixed bottom sheet with these snap heights:

```text
collapsed: 96px
medium:    180px
expanded:  320px
```

Behavior:

- The sheet is full width, rounded at the top and fixed to the bottom.
- A visible handle allows height adjustment.
- Up/down controls expand or reduce the sheet.
- Vertical dragging changes snap state.
- The header identifies the active target and product.
- A close button clears selection.
- The same `ToolbarContent` is reused at different levels.
- Collapsed mode exposes only the first three primary controls.
- Medium mode exposes all primary controls and the first two secondary controls.
- Expanded mode exposes primary, secondary and `Más` rows.
- The scrollable sheet body preserves access to controls without taking over the page permanently.

### Canvas and scroll

- When a target is selected, the selected anchor is scrolled into view if it would be hidden by the sheet or top boundary.
- Extra bottom padding is added to the canvas while a selection exists.
- Content remains readable above the sheet instead of being replaced by a full-screen editor.

### Touch targets

- Sheet controls use approximately 44px touch targets for expansion and close.
- Toolbar buttons use compact controls in desktop density, but the mobile sheet provides more vertical room and wrapping.
- Popovers and modal dialogs remain available; on mobile modals become bottom-aligned rounded sheets.

### Text and keyboard

- Inline text remains the editing surface on mobile.
- Single-line Enter commits by blur.
- Escape blurs the text field and the global Escape listener can clear the selection.
- The sheet can reduce the available visible canvas while the keyboard is open; the anchor-scroll behavior is the main protection observed in the prototype.

## WHAT WORKS

### Directness

The user edits an object where it lives. The page remains the mental model; the toolbar explains the available change without replacing the page.

### Contextual hierarchy

The prototype separates frequent actions from precision actions. A user can change a color with one or two interactions, while advanced settings remain discoverable through `Más` and the Inspector.

### Selection clarity

The combination of outline, object label, active ring and contextual toolbar makes the current target legible. Child targets stop propagation, which prevents the common failure where clicking text accidentally selects the whole card.

### Immediate feedback

Text, style, image crop, image focus, CTA appearance, card chrome and page background update in place. The effect is visible before the user leaves the page.

### Shared interaction grammar

Text, image, CTA, card, badge and background all follow the same contract:

```text
click target
  -> target becomes active
  -> contextual controls appear
  -> direct action mutates visible value
  -> Escape or another click changes context
```

### Desktop/mobile parity

Desktop toolbar and mobile sheet reuse the same control model. The difference is presentation and density, not a second interaction language.

### Catalog scale affordances

The add tile, duplicate action, move action and bulk clone action make the catalog feel like a page that grows, rather than a fixed form with a product limit.

## WHAT DOES NOT SCALE

These are observations for future work, not instructions to modify the frozen prototype.

- A single floating toolbar can become visually dense when many controls are available for a complex object.
- Popovers anchored to narrow text triggers can overlap nearby content near viewport edges.
- A fixed 320px advanced Inspector is expensive on smaller desktop widths and competes with a three-column canvas.
- Rendering 20–50 cards with every image and every editable node can become expensive without virtualization, lazy media or windowed rendering.
- A long list of product cards makes repeated card-level actions harder to discover, especially when the active card is far from the toolbar.
- Bulk cloning is useful for volume but does not solve bulk editing, bulk selection or bulk style application.
- Badge management capped at two categories is clear for the prototype but does not define a scalable taxonomy or category-management experience.
- Moving cards one step at a time becomes slow for large catalogs.
- A global page selection based on blank space can be difficult when a future page contains large empty-looking sections or full-bleed media.
- Inline editing of long descriptions or rich content will need stronger text boundaries than the current plain `contentEditable` model.
- A mobile sheet with three fixed heights may not fit every control set, font scale or keyboard configuration.
- Several actions write immediately, but the prototype does not present a universal undo/redo history for every edit.
- The prototype's local image adapter is suitable for a demo but is not a durable asset contract for hosted pages.

## CATALOG-SPECIFIC BEHAVIOR

The following patterns are valuable but belong primarily to a product catalog:

- Product card as the main repeated editing unit.
- Price as a first-class editable field.
- CTA per product with product-specific label and link.
- Image provenance through `Imagen de referencia`.
- Product detail view opened from the card toolbar or preview CTA.
- Product duplication and bulk cloning.
- Card ordering through `Antes` and `Después`.
- Product-specific badges/categories with a small visible badge limit.
- Product metadata such as tags, footer note and long description in advanced settings.
- Add-product tile at the end of the grid.
- Catalog count in the top bar.
- Image states `ready`, `preparing`, `error` and `empty`.

These should be adapted for other page types rather than copied as-is.

## UNIVERSAL DIRECT-EDITOR PATTERNS

These patterns can become standard Cripqer contracts across Bio, Landing, Menu, Portfolio and Servicios:

```yaml
universal_contract_candidates:
  - "text -> text toolbar"
  - "image -> image toolbar"
  - "CTA -> CTA toolbar"
  - "card/container -> container toolbar"
  - "background -> page/background toolbar"
  - "one active selection -> one contextual toolbar"
  - "click target -> visible selection state"
  - "inline value -> immediate visual update"
  - "frequent controls -> popover or compact toolbar"
  - "advanced controls -> More / Inspector"
  - "Escape/outside click -> dismiss transient UI"
  - "desktop toolbar + mobile bottom sheet -> same control grammar"
  - "stable target anchor -> scroll selected content into view"
  - "edit mode and preview mode -> distinct navigation semantics"
```

Recommended universal target contract:

```text
Target
  id: stable canonical object id
  kind: text | image | cta | container | background | badge | ...
  subId?: nested object id

Selection
  -> one active target
  -> one visual affordance
  -> one contextual control surface

Mutation
  -> field-scoped update
  -> immediate renderer update
  -> future persistence adapter
```

Universal rules to preserve:

1. The page is always the primary surface.
2. The editor should be discovered by selecting content, not by opening a control room first.
3. Child targets must stop parent-selection propagation.
4. Selection needs both a data identity and a visible DOM anchor.
5. Quick controls should be few, obvious and reversible through a deeper path.
6. The same target should behave consistently across desktop and mobile.
7. Preview must remove editing affordances and restore real interaction semantics.
8. Persistence must remain behind an adapter; interaction rules should not depend on a specific database.

## DO NOT COPY

Do not copy these prototype details directly into the final Direct Page Editor:

- The hardcoded `INITIAL_PRODUCTS` and `INITIAL_CATEGORIES` data model.
- The demo product IDs and generated `-copy-` IDs as a canonical persistence strategy.
- The localStorage/data-URL image adapter as hosted media storage.
- The object URL fallback for assets that must survive reload or publication.
- The prototype-only `setTimeout` scrolling behavior as a general navigation contract.
- A product-specific toolbar copied verbatim into Bio, Landing, Menu, Portfolio or Servicios.
- The current fixed three-column assumption as a universal layout rule.
- The current `contentEditable` behavior as a complete rich-text editor.
- The current global Escape listener without a future focus/undo policy.
- The current lack of a universal history model for all direct edits.
- The `page` background target as a substitute for section, block or theme ownership.
- Product detail, price, badge and bulk clone controls in page types where those concepts do not exist.
- Fixed card-level labels such as `Tarjeta`, `Imagen` or `Botón` as the only accessibility strategy.
- A 1024px breakpoint as a universal truth for every future page and device.
- The fixed 96/180/320px mobile sheet heights without measuring real content and keyboard behavior.
- Popover placement assumptions tied to narrow triggers or a single viewport density.
- Prototype preview behavior as the final publication, routing or security contract.
- Any SQL, backend schema or RLS assumption from the prototype as part of the UX contract.

## FINAL EXTRACTION

The frozen Catalog establishes this reusable Cripqer principle:

```text
No editor screen first.
Show the page.
Let the user select what they see.
Expose the smallest useful contextual tool.
Keep advanced control one step away.
Reflect every change immediately on the page.
```

**SUCCESS_GATE:** `CRIPQER_CATALOG_FROZEN_UX_REFERENCE_PASS`  
**STOP_AFTER:** `true`
