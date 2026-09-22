# Cripqer — Catalog Premium Direct Editing Pilot V1

**Modo:** `CATALOG_ONLY_PREMIUM_PRODUCTIZATION`  
**Fecha:** `2026-09-21`  
**Task:** `CRIPQER_CATALOG_PREMIUM_DIRECT_EDITING_PILOT_V1`

## Reference capture

La referencia fue leída en modo solo lectura desde `public.pages`:

| Campo                      | Valor                                                                  |
| -------------------------- | ---------------------------------------------------------------------- |
| Page ID                    | `0d1ad73e-bedb-4250-a5ff-c33c2c55eaa7`                                 |
| Title                      | `Catalogo Fuxion`                                                      |
| Page type                  | `catalog`                                                              |
| Template source identifier | `beauty-studio` en metadata persistida; `store-bento-demo` en instance |
| Theme                      | `warm` / `Warm Editorial`                                              |
| Layout                     | `centered` / header `overlap`                                          |
| Block count                | `3`                                                                    |
| Block signature            | `productGrid -> heading -> contact`                                    |
| Product count              | `3`                                                                    |
| Avatar                     | `showAvatar=false`, asset conservado                                   |
| Cover                      | `full-bleed`, banner habilitado                                        |

La página aprobada no fue editada, guardada, publicada ni usada como fixture.

## Catalog default starter

Se agregó `catalog-default-v1` a `recipeRegistry.ts` como configuración propia
del repositorio y se asignó a `pageType=catalog` para páginas nuevas. Conserva
la huella persistida: IDs de bloques/productos, orden, copy, precios, imágenes,
CTAs, tema, layout, portada y configuración de avatar.

El título introducido por el usuario reemplaza `metadata.name` y `profile.name`;
`Productos destacados` permanece como copy de apoyo. Las páginas existentes no
se modifican y el panel de Templates continúa disponible.

## Direct editing architecture

- `InlineText` se reutiliza para título, descripción, precio, badge y etiqueta
  del CTA directamente sobre cada tarjeta.
- El estado canónico sigue pasando por `templateReducer` mediante
  `patchBlockField`, por lo que las ediciones quedan dentro de undo/redo y del
  pipeline de guardado existente.
- ProductGrid sigue siendo una única colección repetible; no se crean bloques
  independientes por producto.
- Se añadieron acciones de canvas para mover, duplicar y eliminar tarjetas, más
  `+ Añadir producto`; las copias reciben un ID nuevo y estable.
- El grid usa tres columnas en desktop cuando el ancho lo permite y una en
  mobile; no fuerza tres columnas microscópicas.
- La imagen conserva su referencia y expone selección contextual `image` para
  los controles de asset existentes.
- En modo público, el cuerpo de la tarjeta abre un modal de detalle; la
  navegación externa queda reservada al CTA explícito.

## Archivos principales

- `src/premium-template-studio/templates/recipeRegistry.ts`
- `src/components/power-editor/pageStarterConfig.ts`
- `src/premium-template-studio/components/blocks/PremiumBlocksII.tsx`
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
- `src/premium-template-studio/engine/RenderContext.tsx`
- `src/premium-template-studio/engine/TemplateRenderer.tsx`
- `src/premium-template-studio/__tests__/catalogDefaultV1.test.ts`
- `src/premium-template-studio/__tests__/productGridDirectEditing.test.tsx`

Publish, routing, QR, Bio, RPC, menú, portfolio y services no fueron alterados.

## Tests

```text
8 test files passed
40 tests passed
```

Se verifican el starter aprobado, propagación del título, tres productos,
targets inline de edición, render público, modal/detail path, avatar opcional y
regresiones de templates existentes. ESLint no reportó errores nuevos en los
archivos del piloto; queda una advertencia preexistente de Fast Refresh.

## Runtime

No se ejecutó aún la fixture fresca `QA Premium Catalog Direct Edit`, hard reload,
edición visual en navegador, smoke de diez productos, guardado/reload ni
public parity. La automatización del editor continúa sin una superficie
controlable en ejecuciones anteriores.

## V2 diferido

Quedan fuera de este piloto el pipeline compartido Unsplash/Pexels, compresión
de imágenes, multi-selección, bulk styling, inventario, pagos, checkout y
sincronización de stock. La URL del CTA y los controles avanzados de asset/style
siguen disponibles en el Inspector contextual existente.

## Resultado

`CATALOG_REFERENCE_CAPTURE_PASS`  
`CATALOG_DEFAULT_V1_PASS`  
`CATALOG_DIRECT_TEXT_EDIT_CODE_PASS`  
`CATALOG_COLLECTION_LIFECYCLE_CODE_PASS`  
`CATALOG_DETAIL_MODAL_CODE_PASS`

Estado global:

`CATALOG_PREMIUM_DIRECT_EDITING_CODE_PASS_RUNTIME_CERTIFICATION_PENDING`

No se emite todavía `CRIPQER_CATALOG_PREMIUM_DIRECT_EDITING_PILOT_PASS_FROZEN`.

**STOP_AFTER:** `true`
