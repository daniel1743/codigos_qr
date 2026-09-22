# Cripqer — Contextual Toolbar Runtime Stabilization V1

**Modo:** `TARGETED_RUNTIME_REPAIR`  
**Fecha:** `2026-09-21`  
**Task:** `CRIPQER_CONTEXTUAL_TOOLBAR_RUNTIME_STABILIZATION_V1`

## Correcciones

- Las acciones de tarjeta (`Ver detalle`, `Fondo`, `Borde`, `Radio`, mover,
  duplicar y eliminar) ahora se renderizan únicamente cuando el `itemId`
  correspondiente es el seleccionado.
- La selección contextual se transporta desde `Canvas` hasta `RenderContext`
  mediante `selectedCollectionItem`; el outline y el toolbar siguen al ID
  estable, no al índice.
- La selección se limpia al elegir otro bloque o la superficie vacía.
- Los toolbars de texto e imagen requieren la tarjeta seleccionada y continúan
  siendo chrome de editor, nunca contenido de ProductCard.
- ProductCard ya no produce `<p>` dentro de `<p>`; la estructura usa un wrapper
  `div` y conserva `InlineText as="p"` como único párrafo semántico.
- `InlineText` declara y ejecuta explícitamente `onFocus` y `onBlur`; el blur
  conserva el commit por el reducer canónico.
- `isSelected` está declarado, recibido y usado explícitamente en
  `ProductCardBlock`.
- El modo público no renderiza controles editoriales.

## Verificación

```text
5 test files passed
32 tests passed
```

La prueba de ProductGrid verifica:

- ausencia de chrome con ningún item seleccionado;
- chrome presente para el item seleccionado;
- ausencia de `Ver detalle`/`Fondo` en el public renderer;
- ausencia de `<p><p` en el render de edición;
- targets inline de título, descripción, precio y CTA.

ESLint: `0 errors`, con un warning preexistente de Fast Refresh en
`RenderContext.tsx`. `git diff --check` pasó.

## Provider hierarchy

No se reescribieron providers. `TemplateRenderer` continúa dentro de la
jerarquía normal de `RenderProvider` y `Canvas` continúa dentro de
`StudioProvider`; los errores de provider se trataron como secundarios a los
ReferenceError corregidos.

## Runtime

La verificación manual del navegador continúa pendiente: no se ejecutó aún la
fixture fresca ni hard reload. El código ya elimina las causas conocidas de
chrome repetido, `ReferenceError` y nesting inválido; no se afirma PASS runtime
ni gate congelado sin observar la sesión real.

## Resultado

`NO_CONTEXTUAL_CHROME_LEAK_CODE_PASS`  
`NO_NESTED_P_WARNING_CODE_PASS`  
`NO_ONFOCUS_REFERENCE_CODE_PASS`  
`NO_ONBLUR_REFERENCE_CODE_PASS`  
`NO_ISSELECTED_REFERENCE_CODE_PASS`  
`SELECTED_ITEM_TOOLBAR_ONLY_CODE_PASS`  
`PUBLIC_RENDERER_CHROME_FREE_CODE_PASS`

Estado global: `CRIPQER_CONTEXTUAL_TOOLBAR_RUNTIME_STABILIZED_CODE_PASS_RUNTIME_PENDING`

No se emite todavía `CRIPQER_CONTEXTUAL_TOOLBAR_RUNTIME_STABILIZED_FROZEN`.

**STOP_AFTER:** `true`
