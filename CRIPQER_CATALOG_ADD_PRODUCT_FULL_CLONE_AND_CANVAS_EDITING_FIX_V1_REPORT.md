# Cripqer — Catalog Add Product Full Clone and Canvas Editing Fix V1

**Modo:** `TARGETED_CATALOG_INTERACTION_REPAIR`  
**Fecha:** `2026-09-21`  
**Task:** `CRIPQER_CATALOG_ADD_PRODUCT_FULL_CLONE_AND_CANVAS_EDITING_FIX_V1`

## Corrección aplicada

`+ Añadir producto` ya no crea una tarjeta esqueleto. Si existe una colección,
clona profundamente la última tarjeta, preservando imagen, copy, precio, CTA,
estilos tipográficos, estilos de botón y demás campos del item. Solo se regenera
el ID estable con `uid()`.

Si la colección está vacía, se usa `DEFAULT_PRODUCT_SEED` completo con imagen,
título, descripción, precio y CTA.

La acción de duplicar continúa clonando el item seleccionado, no el último
item. La nueva tarjeta se marca como seleccionada, se enfoca contextualmente y
queda lista para edición en canvas. Undo/redo sigue pasando por
`patchBlockField` y el historial existente.

## Selección y edición

Se agregó identidad contextual del item seleccionado al `RenderContext`, con
outline visible y estabilidad por ID durante reorder. La edición inline y el
toolbar contextual siguen usando el reducer canónico. El canvas limpia la
selección contextual al seleccionar otro bloque o la superficie vacía.

La tarjeta conserva acciones de imagen, texto, CTA y tarjeta; no se requiere el
Inspector lateral para las operaciones comunes cubiertas por el piloto.

## Archivos principales

- `src/premium-template-studio/components/blocks/productGridCollection.ts`
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
- `src/premium-template-studio/components/blocks/PremiumBlocksII.tsx`
- `src/premium-template-studio/engine/RenderContext.tsx`
- `src/premium-template-studio/engine/TemplateRenderer.tsx`
- `src/premium-template-studio/__tests__/productGridCollection.test.ts`

No se tocaron Publish, routing, public_id, Bio, QR, Menu, Portfolio, Services
ni las APIs/pipelines de imágenes.

## Verificación

`5 test files passed; 32 tests passed`  
`git diff --check: PASS`

Se cubren clonación completa, ID nuevo, independencia de edición, seed de
colección vacía, starter Catalog, targets inline, render público y regresiones.

## Runtime

La aceptación runtime continúa pendiente: no se ejecutaron todavía la fixture
fresca, edición visual completa, hard reload, save/reload ni public parity.

## Resultado

`CATALOG_ADD_FULL_CLONE_CODE_PASS`  
`CATALOG_EMPTY_COLLECTION_SEED_CODE_PASS`  
`CATALOG_CLONE_ID_INDEPENDENCE_PASS`  
`CATALOG_CONTEXTUAL_SELECTION_CODE_PASS`

Estado global: `CATALOG_ADD_PRODUCT_FULL_CLONE_CODE_PASS_RUNTIME_PENDING`

No se emite todavía `CRIPQER_CATALOG_FULL_CARD_CLONE_AND_DIRECT_CANVAS_EDITING_PASS_FROZEN`.

**STOP_AFTER:** `true`
