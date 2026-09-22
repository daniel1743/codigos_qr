# Cripqer — Contextual Editing Toolbar Canva/Word Model V1

**Modo:** `TARGETED_PREMIUM_INTERACTION_IMPLEMENTATION`  
**Fecha:** `2026-09-21`  
**Task:** `CRIPQER_CONTEXTUAL_EDITING_TOOLBAR_CANVA_WORD_MODEL_V1`

## Arquitectura

Se agregó `ContextualEditingToolbar` como capa visual compartida sobre el
RenderContext y el reducer existente. No crea un segundo documento, no escribe
en el DOM como fuente de verdad y todas las mutaciones siguen pasando por
`patchBlockField`/`templateReducer`.

El alcance está limitado al piloto `ProductGrid` de Catálogo. No se extendió a
Menú, Portfolio ni Services.

## Texto contextual

Al enfocar título, descripción, precio, badge o etiqueta CTA aparece una barra
contextual con fuente, tamaño, peso/negrita, color, alineación izquierda/centro/
derecha, cursiva, subrayado y opción “Más”. La URL del CTA también se puede
editar en ese mismo contexto.

La escritura continúa siendo inline mediante `InlineText`, y los estilos se
persisten en `TypographyOverride` usando el mismo estado canónico e historial.

## Imagen contextual

La selección de imagen expone `Cambiar`, `Quitar`, `Recortar` y `Posición`.
`Quitar` actualiza directamente `imageUrl`; `Cambiar` enfoca el flujo de asset
existente. Recorte y posición quedan como seams explícitos de `ImagePipeline`.
No se agregó búsqueda Unsplash/Pexels ni una biblioteca para el usuario.

## Tarjeta y mobile

La tarjeta mantiene acciones contextuales de duplicar, mover, eliminar, ver
detalle, fondo, borde y radio. La selección usa el ID estable del item, por lo
que las acciones de reordenamiento no dependen del índice.

En desktop la barra es compacta y flotante sobre la tarjeta. En viewports de
hasta 640px se convierte en una superficie inferior con controles táctiles de
44px, evitando comprimir la barra desktop dentro del canvas móvil.

## Contratos preservados

- Inspector derecho conservado como superficie avanzada/secundaria.
- ProductGrid continúa siendo una colección única.
- Undo/redo y save/reload usan el pipeline existente.
- Modal público y CTA externo permanecen separados.
- Publish, `public_id`, routing, Bio, QR, Menu, Portfolio, Services y pipelines
  de imagen no fueron modificados.

## Verificación

`4 test files passed; 30 tests passed`  
`eslint: 0 errors, 1 pre-existing Fast Refresh warning`  
`git diff --check: PASS`

Se cubren render del ProductGrid, targets inline, starter de Catálogo,
compatibilidad de estilos, modal público y regresiones del renderer.

## Runtime

La certificación runtime sigue pendiente: no se ejecutaron aún los escenarios
desktop/mobile, hard reload, save/reload ni public parity. La automatización del
editor continúa sin una superficie controlable.

## Resultado

`CONTEXTUAL_TOOLBAR_ARCHITECTURE_CODE_PASS`  
`DIRECT_TEXT_FORMATTING_CODE_PASS`  
`DIRECT_IMAGE_ACTIONS_CODE_PASS`  
`DIRECT_BUTTON_EDITING_CODE_PASS`  
`DIRECT_CTA_URL_CODE_PASS`  
`PRODUCT_CARD_CONTEXT_ACTIONS_CODE_PASS`

Estado global: `CRIPQER_CONTEXTUAL_EDITING_TOOLBAR_CODE_PASS_RUNTIME_PENDING`

No se emite todavía `CRIPQER_CONTEXTUAL_EDITING_TOOLBAR_V1_PASS_FROZEN`.

**STOP_AFTER:** `true`
