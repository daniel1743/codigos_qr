# Cripqer — Premium Page Content Width & ProductGrid Expansion V1

**Modo:** `TARGETED_PREMIUM_PAGE_LAYOUT_REPAIR`  
**Fecha:** `2026-09-22`  
**Task:** `CRIPQER_PREMIUM_PAGE_CONTENT_WIDTH_AND_PRODUCTGRID_EXPANSION_V1`

## Hallazgo forense

- El elemento que constriñe `ProductGrid` es el contenedor interno de `TemplateRenderer`, no `ProductGridBlock`.
- Antes del cambio, el contenedor aplicaba `maxWidth: contentWidth + (columns > 1 ? 180 : 0)`. Para `catalog-default-v1` (`warm` + `centered` + una columna), el ancho lógico era `560px`.
- `ProductGridBlock` ya tenía `width: 100%`, tres columnas desktop y `gap: 20px` para `catalog-premium-card-v1`; las tarjetas eran pequeñas porque heredaban esos `560px`.
- La restricción proviene del token legacy de contenido del renderer/theme, derivado de la superficie compacta; no de Bio directamente ni de una restricción de las tarjetas.
- El banner/hero visual puede escapar de ese contenedor porque `ProfileBanner` se renderiza fuera del contenedor interno y el modo `full-bleed` usa la superficie del documento.

## Cambio aplicado

- `TemplateRenderer` recibe el `documentKind` canónico del host.
- Solo en `page` y cuando existe un `productGrid`, el contenedor de sección usa `maxWidth: 100%` y `boxSizing: border-box`.
- Con marco desktop de `1180px` y padding de `24px`, la zona útil resultante es aproximadamente `1132px`, dentro del contrato `1000–1100px` en condiciones normales de canvas.
- Bio conserva su contenedor compacto y las páginas sin ProductGrid conservan la restricción legible; no se modificaron zoom, save/publish, ni visuales de Menu/Portfolio/Services.

## Verificación

```text
Premium Page content-width tests: PASS (3 tests)
Layout tests: PASS
Camera math tests: PASS
Total targeted tests: PASS (37 tests)
Production build: PASS
```

**Estado:** `CRIPQER_PREMIUM_PAGE_CONTENT_WIDTH_PASS_FROZEN`  
**STOP_AFTER:** `true`
