# Cripqer — Magic Card Faithful Port Phase 2 Toolbar V1

**Modo:** `FAITHFUL_CONTEXTUAL_TOOLBAR_PORT`  
**Fecha:** `2026-09-22`  
**Task:** `CRIPQER_MAGIC_CARD_FAITHFUL_PORT_PHASE_2_TOOLBAR_V1`

## Alcance

- Se integró una toolbar contextual desktop sobre `PremiumProductCardMagicV1`.
- La selección usa la autoridad existente `blockId`, `itemId` y `field`; no se creó estado paralelo.
- Se agregaron anclajes estables `itemId:card`, `itemId:image`, `itemId:title`, `itemId:description`, `itemId:price` y `itemId:cta`.
- La toolbar se monta como overlay fijo en `document.body`, con posición arriba, fallback abajo y clamp al viewport. No entra en el flujo del documento ni altera el zoom lógico.

## Acciones canónicas

- Título, descripción y precio: edición directa y controles de tipografía mediante `onInlineEdit`.
- Imagen: `Cambiar imagen` usa el adaptador de assets existente; `Quitar` persiste la eliminación de la URL y su provenance.
- CTA: etiqueta, URL, color y alineación escriben en los campos canónicos existentes.
- Tarjeta: fondo, borde y radio escriben en `block.style` existente.
- Recorte/posición, duplicar/mover/detalle y búsquedas externas permanecen deshabilitados cuando no existe autoridad persistente en esta fase.

## Aislamiento

- La apariencia, proporciones, imagen 4:3 y contenido de la tarjeta de Fase 1 se conservaron.
- `ProductCardBlock`, Bio, QR, Menu, Portfolio, Services, save, publish y detalle público no fueron rediseñados.
- El Inspector continúa disponible como superficie avanzada/secundaria.

## Runtime evidence

- Fixture: Premium Page fresca `promos · GPyZRjg`.
- La selección de título mostró `Acciones de Título` con fuente, tamaño, color, peso, estilo y alineación.
- La selección de imagen mostró `Acciones de Imagen` con `Cambiar imagen`, `Quitar`, y `Recortar`/`Posición` deshabilitados.
- El overlay quedó fijo sobre el canvas a zoom `37%` sin alterar el layout; la posición se mantiene basada en `getBoundingClientRect` y eventos de scroll/resize.
- El control `Negrita` cambió el estilo canónico del título a `fontWeight: 700`.

## Verificación

```text
Existing Premium Page/catalog/media tests: PASS (14 tests)
Focused direct-edit regression: PASS
ESLint touched files: PASS (existing Fast Refresh warning only)
Production build: PASS
Runtime title/image toolbar: PASS
Runtime typography patch/history path: PASS
```

**Estado:** `CRIPQER_MAGIC_CARD_FAITHFUL_PORT_PHASE_2_TOOLBAR_PASS_FROZEN`  
**STOP_AFTER:** `true`
