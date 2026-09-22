# Cripqer — Premium Page Canvas Architecture V1

**Modo:** `TARGETED_EDITOR_SURFACE_ARCHITECTURE`  
**Fecha:** `2026-09-22`  
**Task:** `CRIPQER_PREMIUM_PAGE_CANVAS_ARCHITECTURE_V1`

## Arquitectura

- `PowerEditorHost` comunica el target canónico: `profile` o `page`.
- `profile` usa `compact-bio`; `page` usa `premium-web-page` para Catálogo, Menú, Portafolio y Servicios.
- Ambas superficies continúan dentro de `StudioProvider`, `templateReducer`, `RenderContext`, `TemplateRenderer`, history, save y publish.
- No se creó estado, reducer, schema ni pipeline paralelo.

## Geometría

- Premium Page desktop: ancho lógico `1180px`, con 3 tarjetas cómodas.
- Premium Page tablet: `834px`.
- Premium Page mobile: `390px`.
- Bio desktop/tablet conserva ancho compacto `520px`; mobile `390px`.
- El ancho lógico se decide por documento + breakpoint. El zoom de cámara solo aplica `transform: scale(...)` sobre la superficie y no cambia el breakpoint ni el ancho lógico.

## Cambio aplicado

El canvas ya no infiere su superficie desde el viewport. `PremiumTemplateStudio` recibe `documentKind` desde el host canónico y expone `data-editor-document-kind` / `data-editor-canvas-mode` para QA runtime.

## Verificación

```text
Canvas authority tests: PASS
Existing camera math tests: preserved
No publish/routing/Bio/QR architecture changes
Runtime fixture fresca: pendiente
```

**Estado:** `CRIPQER_PREMIUM_PAGE_CANVAS_ARCHITECTURE_CODE_PASS_RUNTIME_PENDING`  
**STOP_AFTER:** `true`
