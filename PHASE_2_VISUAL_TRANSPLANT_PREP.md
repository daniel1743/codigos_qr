# PHASE 2 VISUAL TRANSPLANT PREP

Read-only audit · Agent: Cline · Date: 2026-08-30

Source: `mobile-editor-uiux.zip` (extraído a `C:\Users\Lenovo\Downloads\_mobile-editor-uiux-extracted`).
Mockup: `client/src/pages/Home.tsx` + `ideas.md` + `client/src/index.css`.

Dirección: **"Editorial Canvas"** — lienzo protagonista, panel "en papel", carbón `#1D1D1B`,
DM Sans (display) + Manrope (UI).

---

## 1. VISUAL MAPPING (mockup → current → change → keep)

| Mockup element | Current component | Visual change needed | Functional logic to keep |
|---|---|---|---|
| Header mínimo (wordmark) | `BasicEditorShell.tsx` header ("Editor QR" + Eye/Save/Publicar) | Header editorial DM Sans/carbón | `onPreview/onSaveDraft/onPublish/publishing/publishDisabled` |
| Canvas "stage" escala adaptativa | `CanvasWorkspace` (fixed `h-[min(58dvh,680px)]`) | Canvas flexible que se encoge al crecer sheet | zoom/pan/recenter, `viewportRef`, `targetRegistry` |
| Cinta de estado vertical | (inexistente; `EditTarget` outline only) | Cinta/línea fina lateral que marca selección | `selectedTarget` + `EDIT_TARGETS` |
| Element tags (Banner/Avatar/Nombre/Bio/Botón/Tarjeta/Footer) | (sin tags) | Tags editoriales discretos | registro `EditTarget` |
| Sheet 3 estados (18/34/48%) + drag handle | `mobilePanel` (open/close, `max-h-[58dvh]`) | 3 estados + handle + switcher Básico/Medio/Expandido | `mobilePanelOpen`, `onCloseMobilePanel` |
| Sheet header eyebrow+title | (solo handle + X) | Añadir eyebrow/título contextual | — |
| Chips horizontales (fonts/shape/border/alignment) | `DesignSection.tsx` (botones grid + selects) | Chips scrollables con check | `onChange` → `button_radius/button_style/button_border_thickness/font_family` |
| Color swatches (Negro/Blanco/Gris/Arena) | `ColorControl.tsx` (picker libre + degradado) | Swatches limitadas | `onChange` → `background_color/button_color/button_text_color` |
| Segmented "Botón / Tarjeta" | (inexistente) | Segmented de presentación de enlace | (nuevo) `linkPresentation` |
| Card 75/25 ("75% contenido / 25% foto") | (inexistente) | Preview 75/25 | (nuevo) |
| Separación (slider) | Separación (3 botones) | Slider delgado | `onChange` → `theme_spacing` |
| Footer "hecho con intención" + "f" | (templates NO renderizan footer) | Añadir footer + marca | `footer_enabled/footer_text` |
| Bottom nav ligera (4 tabs) | `MobileBottomNavbar.tsx` + CSS (ROSA `#c44b87`) | Rosa → carbón `#1D1D1B`, DM Sans/Manrope | `activeSection`, `onSectionChange` |
| Desktop rail derecho (status cards) | (inexistente; `aside` side panel) | Rail editorial con cards | panel desktop |
| Galería (mini-gallery imágenes) | `MobileTemplateGallery.tsx` (4 templates) | VER §8 (mismatch) | `onSelectTemplate`, `selectedTemplateId` |

---

## 2. CANVAS SIZING DIFFERENCES

- Mockup: canvas "stage" flexible entre header y sheet; reduce escala al crecer sheet.
- Current: `CanvasWorkspace` altura fija `h-[min(58dvh,680px)] min-h-[360px]` / preview `h-[calc(100dvh-4rem)]`. No reacciona al sheet.
- Sugerido: `canvasHeight = 100dvh - header - navbar - sheetHeight`, `transform: scale()` del template.

## 3. SHEET HEIGHT / STATE DIFFERENCES

- Mockup: `collapsed`(18%) / `medium`(34%) / `expanded`(48%) + drag handle + switcher.
- Current: booleano `mobilePanelOpen` + `max-h-[58dvh]`, sin estados ni drag.
- Sugerido: `SheetState = "collapsed" | "medium" | "expanded"` (18/34/48%) + drag.

## 4. HORIZONTAL CONTROL OPPORTUNITIES

- Mockup: chips horizontales scrollables (fonts, shape, border, alignment).
- Current: botones grid + selects.
- Oportunidades: fonts (5), forma (4), bordes (4), alineación (3, NUEVA).

## 5. TYPOGRAPHY SIZING ISSUES

- Mockup: DM Sans 700–800 display (tracking negativo), Manrope 400–700 UI; labels small-caps.
- Current: Inter + 10 fuentes; navbar `0.65rem` sin jerarquía; header no display.

## 6. TOUCH TARGET ISSUES

- Mockup: chips/swatches táctiles consistentes; icon 16–18px.
- Current: botones `h-9/h-11` (OK); sheet-handle delgado → handle arrastrable mayor.

## 7. SCROLL OWNERSHIP

- Mockup: sheet scroll propio (`sheet-scroll`) + canvas independiente.
- Current: sheet `overflow-y-auto overscroll-contain` + canvas scroll. OK; ajustar a 3 estados.

## 8. MOBILE / DESKTOP DIFFERENCES + GALERÍA MEANING MISMATCH

- Mobile: mockup sheet 3 estados + nav ligera; current open/close + nav rosa.
- Desktop: mockup right rail status cards; current `aside` side panel.
- **GALERÍA MISMATCH:** mockup "Galería" = galería de imágenes/contenido ("Estudio 01"/"Portada"/"Añadir");
  current "Galería" = galería de 4 templates. Significados distintos → requiere decisión de producto.

---

## 9. DYNAMIC CANVAS PLAN

1. **Altura disponible:** `canvasHeight = 100dvh - header(4rem) - sheetHeight - navbar(safe-area)`.
2. **Escala del template:** envolver `BasicTemplateRenderer` en un "stage" de ancho fijo (390px, ~9:16) y aplicar `transform: scale(s)` con `transform-origin: top center`; `s = min(1, canvasHeight / templateNaturalHeight)`.
3. **Aspect ratio:** el stage fija ancho; la escala vertical no deforma (`object-fit` + width fijo).
4. **Selected target visible:** al cambiar `selectedTarget`, `scrollIntoView({block:'center'})` dentro del viewport escalado y reajustar `s` si el target queda fuera.
5. **Transición:** 160–260ms ease-out, respetando `prefers-reduced-motion`.

## 10. REGRESSION RISKS (no romper al trasplantar)

- **Font:** `font_family` NO conectado a `fontPair` (audit anterior). Chips de fuente deben respetar `onChange({font_family})` sin asumir que ya funciona end-to-end.
- **Colors/gradients:** `background_color/button_color/button_text_color` NO conectados a `palette`. Al sustituir `ColorControl` por swatches, mantener `onChange`; no reintroducir mini Power Editor.
- **Button shape:** CONECTADO (`button_radius/button_style`). No romper `resolveButtonStyle`.
- **Border:** CONECTADO (`button_border_thickness/color`). No romper `resolveButtonCustomization`.
- **Spacing:** CONECTADO (`theme_spacing`). Slider nuevo debe seguir escribiendo `theme_spacing`.
- **Fusion:** `Hero.tsx` mask hardcode; no tocar.
- **Gallery:** `onSelectTemplate(template_id, template_version)`; no cambiar contrato.
- **Save/Publish:** `handleSave(false/true)`, `isValid`, `savedPublicId`; no tocar.
- **Preview:** `onPreview/onExitPreview`, `previewMode`; no tocar.
- **Direct selection:** `targetRegistry`/`selectedTarget`; preservar (el mockup amplía, no elimina).

---

## FINAL FIELDS

- FILES MODIFIED: NONE
- CODE CHANGES: NONE
- VISUAL MAPPING COMPLETE: YES
- REGRESSION RISKS IDENTIFIED: font, colors/gradients, button shape, border, spacing, fusion, gallery, save, publish, preview
- RECOMMENDED IMPLEMENTATION ORDER:
  1. Navbar rosa → carbón editorial (DM Sans/Manrope) — impacto inmediato, bajo riesgo.
  2. Sheet 3 estados (18/34/48%) + drag handle + switcher.
  3. Canvas dinámico (scale al crecer sheet) + aspect ratio.
  4. Chips horizontales (fonts/shape/border) + alineación (nueva).
  5. Swatches limitadas (sustituir ColorControl).
  6. Selection ribbon + element tags.
  7. Desktop rail editorial.
  8. (Requiere decisión) Button→Card + 75/25 + footer + resolver Galería meaning.
- FROZEN CODE VIOLATIONS: NONE

