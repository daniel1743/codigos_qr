# Cripqer — Magic Contextual Editor Fix Batch V1

**Modo:** `TARGETED_CONTEXTUAL_EDITOR_FIX_BATCH`  
**Fecha:** `2026-09-22`  
**Task:** `CRIPQER_MAGIC_CONTEXTUAL_EDITOR_FIX_BATCH_V1`

## Alcance aplicado

- Se conservaron la tarjeta `PremiumProductCardMagicV1`, sus proporciones, el toolbar, su posicionamiento y el Premium Page Canvas.
- Los popovers mantienen el cierre por pulsación externa y Escape; la interacción interna queda dentro del mismo ref del popover.
- La palette rápida ahora tiene 10 colores y cada swatch escribe por `onInlineEdit` hacia la autoridad tipográfica o `CTAStyle` correspondiente.
- `Más…`/`Más` solicita foco al Inspector contextual mediante `requestInspectorFocus`; ya no restablece formato ni queda como control falso.
- El precio tiene ahora `priceTypography` opcional por item, compatible con documentos existentes y separado de `typography` del título.
- `Cambiar imagen` lista assets de usuario desde el `AssetAdapter`; el adapter local persiste metadata y data URL en `localStorage` para que `Mis imágenes` sobreviva al reload. `Subir foto` usa el adapter existente y `Quitar` conserva el path canónico con undo/redo.
- Se corrigió el error runtime `ReferenceError: onListCollectionItemImages is not defined`: `PremiumProductCardMagicV1` ahora obtiene el callback desde `useRender`, sin introducir una autoridad nueva.
- Se corrigió una regresión independiente del editor experimental: `patchSharedStyle` se declara antes de `patchProduct` y `patchTextStyle`, evitando `ReferenceError: Cannot access 'patchSharedStyle' before initialization` en `EditorProvider`.
- Label y URL de CTA tienen `Aplicar` y confirmación con Enter; color, preset de estilo y alineación siguen escribiendo `ctaStyle` canónico.
- Crop, posición, duplicar, mover y detalle permanecen intencionalmente deshabilitados.

## Autoridad

```text
toolbar / popover
  -> blockId + itemId + field
  -> onInlineEdit / patchBlockField
  -> templateReducer history
  -> storage.save
  -> load/reload
```

No se añadió estado paralelo para valores editados. `priceTypography` es un campo opcional backward-compatible de `BlockItem` y su edición avanzada usa el Inspector existente.

## Matriz de verificación

| Target                | Control                                                 | Código/canónico        | Undo/Redo               | Save/Reload                                   | Estado                      |
| --------------------- | ------------------------------------------------------- | ---------------------- | ----------------------- | --------------------------------------------- | --------------------------- |
| title                 | texto, fuente, tamaño, color, peso, cursiva, alineación | PASS                   | PASS por reducer        | PASS en contrato                              | `CODE_PASS_RUNTIME_PENDING` |
| description           | texto, fuente, tamaño, color, peso, alineación          | PASS                   | PASS por reducer        | PASS en contrato                              | `CODE_PASS_RUNTIME_PENDING` |
| price                 | valor + `priceTypography` independiente                 | PASS                   | PASS por reducer        | PASS en contrato                              | `CODE_PASS_RUNTIME_PENDING` |
| image                 | Mis imágenes, subir, quitar                             | PASS por adapter/patch | PASS por patch canónico | adapter local preparado; runtime no observado | `CODE_PASS_RUNTIME_PENDING` |
| cta                   | label, URL, color, preset, alineación                   | PASS                   | PASS por reducer        | PASS en contrato                              | `CODE_PASS_RUNTIME_PENDING` |
| card                  | fondo, borde, radio                                     | PASS                   | PASS por reducer        | PASS en contrato                              | `CODE_PASS_RUNTIME_PENDING` |
| crop/position         | disabled intencional                                    | PASS                   | N/A                     | N/A                                           | `INTENTIONALLY_DISABLED`    |
| duplicate/move/detail | disabled intencional                                    | PASS                   | N/A                     | N/A                                           | `INTENTIONALLY_DISABLED`    |

## Verificación ejecutada

```text
Focused ESLint: PASS (0 errores; 3 warnings Fast Refresh preexistentes)
Focused tests después del fix: PASS (3 archivos, 9 tests)
Price independence + reducer/history/save/reload contract: PASS
Production build después del fix: PASS
Experimental editor TDZ fix test: PASS (1 archivo, 1 test)
Runtime 100/65/50 + hard reload: pendiente por bloqueo de automatización local
```

La evidencia runtime no se marca como PASS: la sesión de Chrome no permitió crear o navegar una pestaña fresca hacia la instancia Vite de `127.0.0.1:8082`; las tabs existentes continuaron en la instancia anterior cargando el editor. No se declara una secuencia interactiva que no fue observada.

**Estado:** `CRIPQER_MAGIC_CONTEXTUAL_EDITOR_FIX_BATCH_CODE_PASS_RUNTIME_PENDING`  
**SUCCESS_GATE:** `CRIPQER_MAGIC_CONTEXTUAL_EDITOR_CORE_CONTROLS_PASS_FROZEN` — pendiente de runtime  
**STOP_AFTER:** `true`
