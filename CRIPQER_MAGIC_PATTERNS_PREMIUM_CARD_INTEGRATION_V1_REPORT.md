# Cripqer — Magic Patterns Premium Card Integration V1

**Modo:** `APPROVED_UI_SHELL_INTEGRATION`  
**Fecha:** `2026-09-21`  
**Task:** `CRIPQER_MAGIC_PATTERNS_PREMIUM_CARD_INTEGRATION_V1`

## Implementado

- Se aisló el catálogo aprobado mediante la variante documental `catalog-premium-card-v1`; Menu, Portfolio y Services no fueron modificados.
- ProductGrid continúa usando `StudioProvider`, `templateReducer`, `patchBlockField`, historial, save/reload y `TemplateRenderer`.
- La selección se mantiene por `blockId + itemId` estable y por target de campo (`title`, `description`, `price`, `image`, `cta`).
- La edición inline de texto y sus estilos se enruta al estado canónico; `InlineText` ejecuta explícitamente `onFocus` y `onBlur`.
- La duplicación y `+ Añadir producto` clonan la última tarjeta completa, regeneran el ID y seleccionan el clon.
- El detalle usa el item real y muestra únicamente el botón CTA; no imprime la URL cruda.
- Las imágenes iniciales Unsplash se marcan como `reference_stock`; las imágenes cargadas desde el control canónico se marcan como `owner`.
- La publicación se bloquea si queda una imagen `reference_stock`, antes del pipeline canónico de publish.

## Componentes Magic no copiados como estado

No se portaron `EditorContext`, `INITIAL_PRODUCTS`, mock undo/upload timers, `Workspace`, `TopBar` ni `SideInspector`. El ZIP se usó como referencia de presentación e interacción; el documento real sigue siendo Cripqer.

## Verificación

```text
4 test files passed
13 tests passed
npm run build: PASS (client + SSR)
ESLint focal: 0 errors, 8 warnings preexistentes
git diff --check: PASS
```

## Pendiente / no certificado

- La evidencia runtime `QA Magic Catalog Final` mostró que `catalog-premium-card-v1` todavía entregaba hijos con `variant: "card"`; por eso el grid cargaba datos nuevos pero visualmente permanecía legacy. Se corrigió la propagación de la variante al `ProductCardBlock` y se aplicó el shell Premium aislado: tarjeta cálida, imagen 4:3, etiqueta de selección, espaciado editorial, CTA pill e indicador de imagen de referencia.
- Falta la verificación manual con fixture fresca, hard reload y viewports 360/390/430.
- El toolbar contextual todavía conserva acciones avanzadas en la implementación existente; crop/posición dependen del pipeline de imágenes y no se fingen como persistidos.
- No se emite `MAGIC_UI_VISUAL_FIDELITY_PASS`, `MOBILE_BOTTOM_SHEET_RUNTIME_PASS`, `PUBLIC_PARITY_PASS` ni `CRIPQER_MAGIC_PATTERNS_PREMIUM_CARD_INTEGRATION_PASS_FROZEN` sin observar runtime y obtener aprobación visual del Product Owner.

**Estado:** `CRIPQER_MAGIC_PATTERNS_PREMIUM_CARD_INTEGRATION_CODE_PASS_RUNTIME_PENDING`  
**STOP_AFTER:** `true`
