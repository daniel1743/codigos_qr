# BASIC EDITOR FORENSIC RUNTIME AUDIT

Read-only audit · Agent: Cline · Date: 2026-08-30

---

## 1. EXECUTIVE SUMMARY

Tras Phase 1 (`54d7e89` "fix: recover basic editor template customization") y Phase 2
(`779983c` "editorial canvas visual transplant"), la mayoría de controles de personalización
(font, color, spacing, border, fusion, footer) están **conectados en el resolver** (`config.ts`),
pero varios **fallan en runtime** por bugs concretos, no por falta de conexión.

Hallazgos críticos:
1. **Spacing roto**: los renderers pasan `style={{ gap }}` a `EditableTarget`, pero `EditableTarget`
   no acepta prop `style` → el gap se descarta silenciosamente.
2. **Typography parcial**: `resolveFontPair` mapea la fuente, pero `loadGoogleFont` nunca se llama
   → fuentes no-Inter caen a system-ui.
3. **Border invisible**: el color del borde por defecto es `palette.accent` (igual al fondo del
   botón) → el grosor no se ve.
4. **Pinch zoom NO existe**: no hay handler multi-touch; `touch-action: pan-y` lo bloquea.
5. **Fusion solo en Luxury Fusion**: las demás templates no soportan fusion, pero el slider se muestra
   en todas (falsa promesa).
6. **Footer / avatar rim**: existen en DB + código histórico, pero sin control en el editor actual.

**Veredicto:** CLIENT BETA BLOCKED (bloqueadores de gesto, panel de links, y falsas promesas).

---

## 2. WORKTREE / BRANCH / HEAD

- Worktree: `C:/Users/Lenovo/Desktop/proyectos desplegados importante/generador de QR`
- Branch: `feat/basic-editor-editorial-canvas-ui`
- HEAD: `779983ce53165feebdd24ee4088ba0bc9cfe2e7c` (== expected Phase 2 commit ✅)
- Phase 1 commit: `54d7e89f` presente ✅
- Worktree status: limpio (sólo `PHASE_2_VISUAL_TRANSPLANT_PREP.md` untracked, no code).

---

## 3. USER-REPORTED ISSUES STATUS

| # | Issue | Status |
|---|---|---|
| 1 | Typography no responde | CONFIRMED (RUNTIME_FAIL — fuente mapeada pero no cargada) |
| 2 | Button spacing no responde | CONFIRMED (RUNTIME_FAIL — gap descartado por EditableTarget) |
| 3 | Pinch zoom no funciona | CONFIRMED (NOT_IMPLEMENTED) |
| 4 | Border thickness no responde | CONFIRMED (RUNTIME_FAIL — borde invisible, color = bg) |
| 5 | Auto-scroll al campo exacto | CONFIRMED PARTIAL (canvas sí, panel NO) |
| 6 | Banner fusion no responde | CONFIRMED (sólo Luxury Fusion; resto sin soporte) |
| 7 | Canvas free gesture (pan H/V) | CONFIRMED (pan limitado ±96px + touch-action pan-y) |
| 8 | Links panel muy largo | CONFIRMED UX (sin accordion) |
| 9 | Button → Card | REQUIRED (NOT_IMPLEMENTED, DB_CHANGE_REQUIRED) |
| 10 | Footer editing | REQUIRED (existe en DB/renderer, falta UI) |
| 11 | Preview Save Design | REQUIRED (NOT_IMPLEMENTED) |
| 12 | Avatar rim | PREVIOUS FEATURE (HISTORICAL_ONLY) |
| 13 | Sheet Close X cerca de Bajo/Medio/Amplio | CONFIRMED UX RISK |

---

## 4. TYPOGRAPHY — RUNTIME_FAIL

- USER SYMPTOM: cambiar tipografía no produce cambio visible en la template.
- ACTUAL: `DesignSection` escribe `font_family`; `resolveFontPair` (`config.ts` 105-114) lo mapea a
  `fontStack = "${selectedFont}, system-ui, sans-serif"`; el renderer aplica `fontFamily: fontPair.body/heading`.
- ROOT CAUSE: la fuente se **mapea** pero **nunca se carga**. `loadGoogleFont` (`src/lib/fonts.ts:1`)
  NO se invoca en el editor básico ni en los renderers (sólo `loadPreviewFont` en `TextSection`/
  `TipografiaSection` del editor viejo). Las fuentes no-Inter (Poppins, Playfair Display, etc.)
  no tienen `@font-face`, así que el navegador cae a `system-ui`.
- FILE: `src/lib/basic-templates/config.ts` (105-114), `src/lib/fonts.ts` (1-17).
- TEMPLATE-SPECIFIC: NO (global).
- PUBLIC PAGE IMPACT: mismo fallo (PublicProfileView usa el mismo `buildConfig`).
- MINIMAL FIX: invocar `loadGoogleFont(font_family)` en un `useEffect` del editor (o al cambiar
  fuente), o precargar las 10 fuentes en `styles.css`.
- DB CHANGE: NO.

---

## 5. BUTTON SPACING — RUNTIME_FAIL

- USER SYMPTOM: Separación (Compacto/Normal/Amplio) no cambia la distancia visible.
- ACTUAL: `DesignSection` escribe `theme_spacing` ("compact"/"standard"/"generous"); `config.ts`
  `resolveButtonCustomization` (229-234) lo mapea a `spacing` (0.5/0.75/1.25rem).
- ROOT CAUSE: los renderers pasan el gap a `EditableTarget` vía `style={{ gap: spacing }}`
  (`HeroProfileRenderer.tsx:95`, `CorporateRenderer.tsx:82`), pero `EditableTarget`
  (`src/components/basic-template/EditTarget.tsx:6-12`) **no declara prop `style`** y lo descarta
  (sólo aplica su propio `style` de outline en `active`). El gap nunca llega al DOM.
  Además esto es un error TypeScript latente (prop inexistente) que `vite build` no detecta
  porque no ejecuta `tsc`.
- FILE: `renderers/HeroProfileRenderer.tsx:95`, `renderers/CorporateRenderer.tsx:82`,
  `basic-template/EditTarget.tsx:6-12`.
- TEMPLATE-SPECIFIC: NO (afecta hero_profile y professional_corporate; Beauty Catalog no usa gap de links).
- PUBLIC PAGE IMPACT: mismo fallo.
- MINIMAL FIX: añadir `style?: CSSProperties` a `EditableTargetProps` y aplicarlo (merge con el outline),
  o mover el `gap` a un wrapper `<div>` fuera de `EditableTarget`.
- DB CHANGE: NO.

---

## 6. PINCH ZOOM — NOT_IMPLEMENTED

- USER SYMPTOM: pellizcar con dos dedos no hace zoom.
- ACTUAL: `CanvasWorkspace` (`BasicEditorShell.tsx`) sólo tiene `onWheel` (ctrl+wheel, línea 84-88)
  y `onPointerDown/Move/Up` de **un solo puntero** (pan). NO hay `onPointerDown` multi-puntero,
  `touchstart/touchmove/touchend`, ni cálculo de distancia entre dos punteros.
- ROOT CAUSE: no existe implementación multi-touch. Además `touchAction: "pan-y"` (línea 163) sólo
  permite pan vertical del navegador; NO habilita `pinch-zoom`.
- FILE: `BasicEditorShell.tsx` (84-107, 163).
- TEMPLATE-SPECIFIC: NO (global).
- MINIMAL FIX: trackear 2 `pointerId`s, calcular distancia, mapear a `updateZoom`; cambiar
  `touch-action` a `none` (con `preventDefault` explícito) o `manipulation`.
- DB CHANGE: NO.

## 7. CANVAS PAN — PARTIAL

- USER SYMPTOM: falta desplazamiento libre horizontal/vertical tras zoom.
- ACTUAL: pan de un puntero con límites `Math.max(-96, Math.min(96, ...))` en X e Y
  (`BasicEditorShell.tsx:100-102`). `touchAction: pan-y` (163) delega el scroll vertical al navegador.
- ROOT CAUSE: límite duro ±96px impide pan libre; `touch-action: pan-y` bloquea pan horizontal por gesto.
- FILE: `BasicEditorShell.tsx:100-102, 163`.
- MINIMAL FIX: ampliar/eliminar límites (o límites proporcionales al zoom), `touch-action: none`
  con pan gestionado por pointer capture.

## 8. BUTTON BORDER THICKNESS — RUNTIME_FAIL (invisible)

- USER SYMPTOM: el grosor del borde no responde.
- ACTUAL: `button_border_thickness` → `borderWidth` (0/1/2/3) en `config.ts` (217-228); `button.tsx`
  aplica `border: "Npx solid color"` (27-30).
- ROOT CAUSE: `borderColor` por defecto = `palette.accent` (`config.ts:238-240`), que es el MISMO
  color del fondo del botón (`background: palette.accent`). Con `box-sizing: border-box` (Tailwind
  preflight), el borde queda dentro y es indistinguible del fondo → invisible.
- FILE: `config.ts:238-240`, `primitives/button.tsx:27-30`.
- TEMPLATE-SPECIFIC: NO.
- PUBLIC PAGE IMPACT: mismo fallo.
- MINIMAL FIX: default de `borderColor` a un color de contraste (no `palette.accent`) cuando el
  usuario fija grosor sin fijar color.

## 9. TARGET → EXACT TOOL FIELD AUTO-SCROLL — PARTIAL

- USER SYMPTOM: al tocar Nombre/Bio/Link se abre la sección correcta, pero el panel queda arriba.
- ACTUAL: `handleTargetSelect` (`editor.tsx:78-82`) fija `selectedTarget` + `activeSection` + abre panel.
  El `useEffect` (95-111) hace `viewport.scrollTo` en el **CANVAS** (`canvasViewportRef`) para centrar
  el target.
- ROOT CAUSE: existen **DOS scrolls separados** y sólo el del canvas está implementado. NO hay refs
  a los inputs individuales del panel (`ProfileSection`/`LinksSection`/`DesignSection`) ni scroll
  del contenedor del panel (`overflow-y-auto` en el sheet) hasta el campo exacto.
- FILE: `editor.tsx:95-111` (canvas focus), sin equivalente para el panel.
- MINIMAL FIX: mapear `targetId → ref` del input y `scrollIntoView({block:"center"})` dentro del
  contenedor del panel, tras montar la sección (requestAnimationFrame).
- DB CHANGE: NO.

## 10. BANNER FUSION — PARTIAL / TEMPLATE-SPECIFIC

- USER SYMPTOM: la difuminación/fusión no produce el efecto esperado.
- ACTUAL: `resolveFusionStrength` (`config.ts:116-122`) → `heroFusionStrength`; `Hero.getFusionMask`
  (`Hero.tsx:12-20`) aplica `maskImage` **sólo cuando `heroStyle === "fusion"`** (32-44).
- ROOT CAUSE: `heroStyle` está lockeado por template en `catalog.ts`:
  - Luxury Fusion = `fusion` → SUPPORTED.
  - Beauty Curve = `curved` → NOT_SUPPORTED (usa curva SVG).
  - Beauty Catalog = `straight` → NOT_SUPPORTED.
  - Executive Straight = `straight` → NOT_SUPPORTED.
  El slider "Difuminación" (`DesignSection.tsx:286-301`) se muestra en TODAS las templates → falsa
  promesa para 3 de 4. No hay declaración de capability de fusion en `TemplateDefinition`.
- FILE: `primitives/Hero.tsx:32-44`, `catalog.ts` (structure.heroStyle), `DesignSection.tsx:286-301`.
- MINIMAL FIX: declarar `supportsFusion` en `TemplateDefinition` y ocultar/deshabilitar el slider +
  toast "Esta plantilla no admite esta opción".

## 11. LINKS ACCORDION — NOT_IMPLEMENTED

- USER SYMPTOM: muchos enlaces abiertos a la vez → panel vertical interminable.
- ACTUAL: `LinksSection.tsx` renderiza todos los links con todos sus campos siempre (sin estado de
  "abierto"). No existe `activeLinkId` ni accordion.
- REQUIRED: cards colapsadas por defecto; máximo 1 abierto; al abrir uno se cierra el resto.
- FILE: `editor/LinksSection.tsx` (77-151).
- MINIMAL FIX: `useState<string|null> activeLinkId`, render colapsado (título+URL+chevron) vs expandido
  (label/URL/visible/...); `onClick` setea `activeLinkId`.
- DB CHANGE: NO.


---

## 12. BUTTON → CARD — NOT_IMPLEMENTED (DB_CHANGE_REQUIRED)

- REQUIRED: cada link debe poder convertirse en Card.
- ACTUAL: no existe `presentation_mode` en `ProfileLink` (database.ts) ni en `LinkItem`
  (basic-templates.ts). No hay toggle/UI/renderer. `CardItem` existe pero no conecta a `ProfileLink`.
- DB CHANGE REQUIRED: YES (columna `presentation_mode` o tabla de cards).

## 13. 75/25 CARD — NOT_IMPLEMENTED (DB_CHANGE_REQUIRED)

- REQUIRED: ~75% contenido (título/descripción/CTA) + ~25% imagen (izq/der), con subida/icono.
- ACTUAL: `Card` (`card.tsx`) es VERTICAL (imagen arriba h-40, contenido abajo), no 75/25. Imagen
  derivada de `link.social_cover_image_url` (legacy) en `buildBasicTemplateContent` (`config.ts:166-167`),
  sin UI de subida ni placement left/right.
- DB CHANGE REQUIRED: YES (imagen referencia + placement por enlace).

## 14. FOOTER — CONFIG/DB/RENDERER EXISTEN, UI FALTA

- ACTUAL: `footer_enabled`/`footer_text` en DB + `PROFILE_WRITABLE_COLUMNS` + `config.ts` (161-162) +
  `TemplateFooter` (`Identity.tsx:111-121`, render si enabled+text). Los 3 renderers llaman `TemplateFooter`.
- ROOT CAUSE: `ProfileSection.tsx` (rama actual) NO tiene toggle/texto de footer → `footer_enabled` false
  → `TemplateFooter` retorna null.
- HISTORICAL: control en `feat/profile-footer` (`79d6cda`), NO fusionado.
- MINIMAL FIX: añadir toggle+texto a `ProfileSection` (ya diseñado en feat/profile-footer). DB: NO.

## 15. PREVIEW SAVE DESIGN FLOW — NOT_IMPLEMENTED

- REQUIRED: Preview: "Volver a editar" + "Guardar diseño" con modal confirmación.
- ACTUAL: `isPreviewMode` + `onPreview/onExitPreview` existen. En preview NO hay "Guardar diseño"
  (sólo header fuera de preview + ShareSection). No hay modal.
- FILE: `BasicEditorShell.tsx` (header/preview), `editor.tsx` (handleSave).
- MINIMAL FIX: CTA "Guardar diseño" → modal → `handleSave(true)`. DB: NO.

## 16. AVATAR RIM — HISTORICAL_ONLY

- ACTUAL: `ring_enabled/ring_color/ring_thickness/avatar_shape` en DB type + PROFILE_WRITABLE_COLUMNS.
  `Avatar` (`Identity.tsx:16-27`) usa `border: 3px solid ringColor` (default `rgba(255,255,255,0.9)`)
  HARDCODED, no conectado a `profile.ring_*`.
- HISTORICAL: `appearance/PortadaAvatarSection.tsx` (avatar_shape + ring_enabled + ring_color +
  ring_thickness) + `ContextualToolbar.tsx` — editor avanzado viejo, no usado por básico.
- MINIMAL FIX: conectar Avatar a ring_* y exponer control. DB: NO.

## 17. SHEET CLOSE-X UX — RISK

- USER SYMPTOM: X muy cerca de Bajo/Medio/Amplio → cierres accidentales.
- ACTUAL: X en `absolute right-2 top-6` (`BasicEditorShell.tsx:311`), cerca del switcher (fila "Herramientas").
- RECOMMENDATION: separar X (fila propia / corner con hitbox ≥44px). NO cambiar (audit only).

---

## 18. FOUR-TEMPLATE MATRIX

| Row | Beauty Curve | Luxury Fusion | Beauty Catalog | Executive Straight |
|---|---|---|---|---|
| Typography | RUNTIME_FAIL (no carga fuente) | = | = | = |
| Button spacing | RUNTIME_FAIL (gap descartado) | = | N/A (no links) | = |
| Border thickness | RUNTIME_FAIL (invisible) | = | = | = |
| Border color | RUNTIME_PASS (si fija color) | = | = | = |
| Banner fusion | NOT_SUPPORTED (curved) | RUNTIME_PASS | NOT_SUPPORTED (straight) | NOT_SUPPORTED (straight) |
| Pinch zoom | NOT_IMPLEMENTED | = | = | = |
| Horizontal pan | PARTIAL (±96px) | = | = | = |
| Target→exact field | PARTIAL (sólo canvas) | = | = | = |
| Links accordion | NOT_IMPLEMENTED | = | = | = |
| Button→Card | NOT_IMPLEMENTED | = | = | = |
| 75/25 card | NOT_IMPLEMENTED | = | NOT_IMPLEMENTED (vertical) | NOT_IMPLEMENTED |
| Card media left/right | NOT_IMPLEMENTED | = | = | = |
| Footer | UI_MISSING (render listo) | = | = | = |
| Avatar rim | HARDCODED | = | = | = |
| Preview Save Design | NOT_IMPLEMENTED | = | = | = |

---

## 19. MOBILE GESTURE CONFLICT MATRIX

| Surface | Gesture | Prioridad actual | Conflicto |
|---|---|---|---|
| Canvas viewport | pinch | bloqueado (`touch-action: pan-y`) | no zoom iOS/Android |
| Canvas viewport | pan 1 dedo | pointer capture ±96px | vertical lo toma navegador |
| Tools sheet | scroll vertical | `overflow-y-auto` | OK |
| Chips (fonts/shape) | scroll horizontal | `overflow-x-auto` | compite con scroll vertical sheet |
| Bottom sheet | drag handle | botón (no drag real) | limitado |

Recomendación: `touch-action: none` en canvas + capture multi-touch; `overscroll-behavior: contain`
en sheet; `touch-action: pan-x` en filas de chips.


---

## 20. HISTORICAL FEATURES FOUND

- `footer_enabled`/`footer_text`: EXISTEN en DB/config/renderer; control en `feat/profile-footer`
  (`79d6cda`), NO fusionado. → EXISTS_DISCONNECTED (falta UI).
- `ring_enabled`/`ring_color`/`ring_thickness`/`avatar_shape`: EXISTEN en DB type; control histórico en
  `PortadaAvatarSection.tsx`; template hardcode. → HISTORICAL_ONLY.
- `button_radius`/`theme_spacing`/`banner_fusion_strength`: EXISTEN y conectados (con bugs §4-§10).

## 21. CLIENT-BETA BLOCKERS

- BLOCKER: pinch zoom inexistente.
- BLOCKER: links panel sin accordion (ilimitadamente largo).
- BLOCKER: spacing/border/font controles visibles que no responden visualmente.
- BLOCKER: fusion slider mostrado en templates que no lo soportan.
- CRITICAL: footer/avatar rim sin control.
- CRITICAL: Preview sin "Guardar diseño".

## 22. RECOMMENDED REPAIR PHASES (audit only — no implementar)

- **Phase A — Broken existing controls:** `EditTarget` style prop (spacing), `borderColor` default
  (border), `loadGoogleFont` (typography). Files: EditTarget.tsx, config.ts, button.tsx, renderers/editor.
  DB: NO. Risk: bajo. Runtime test: cambiar spacing/color/fuente y ver cambio en canvas.
- **Phase B — Mobile canvas gestures:** multi-touch pinch + pan libre + touch-action. File:
  BasicEditorShell.tsx. DB: NO. Risk: medio.
- **Phase C — Contextual panel focus + accordion:** refs de campos + scroll panel; accordion 1 abierto.
  Files: editor.tsx, ProfileSection/LinksSection/DesignSection. DB: NO. Risk: bajo.
- **Phase D — Footer + avatar rim recovery:** añadir controles. Files: ProfileSection.tsx, Identity.tsx.
  DB: NO.
- **Phase E — Button/Card + 75/25 data model:** campos en ProfileLink + UI + renderer. DB: YES. Risk: alto.
- **Phase F — Preview Save Design flow:** CTA + modal + handleSave(true). Files: BasicEditorShell.tsx,
  editor.tsx. DB: NO. Risk: bajo.

## 23. FINAL VERDICT (preguntas requeridas)

- **¿Por qué la tipografía no responde?** Se mapea `font_family→fontStack` pero `loadGoogleFont` nunca se llama → fuentes no cargadas caen a system-ui.
- **¿Por qué separación no responde?** El `gap` se pasa como `style` a `EditableTarget`, que no acepta prop `style` → se descarta.
- **¿Por qué border thickness no responde?** Color por defecto = `palette.accent` (igual al fondo) → borde invisible.
- **¿Pinch zoom existe?** NO. Sólo ctrl+wheel + pan de un puntero; `touch-action: pan-y` lo bloquea.
- **¿Por qué no hay movimiento horizontal libre?** Límite duro ±96px + `touch-action: pan-y`.
- **¿Dos sistemas de focus separados?** SÍ. Canvas focus (`editor.tsx:95-111`) existe; tools-panel field focus NO.
- **¿Por qué fusion no responde y qué templates la soportan?** Sólo Luxury Fusion (heroStyle fusion); las otras 3 no; slider se muestra igual.
- **¿Cómo implementar accordion?** `useState activeLinkId`, cards colapsadas, máximo 1 abierto.
- **¿Button→Card requiere DB?** SÍ (falta `presentation_mode`).
- **¿75/25 reference image requiere DB?** SÍ (falta imagen referencia + placement).
- **¿Footer ya existe?** SÍ (DB/config/renderer), falta UI del control.
- **¿Avatar rim existe?** Histórico (PortadaAvatarSection), no conectado; template hardcode 3px blanco.
- **¿Preview puede publicar?** No desde preview (falta "Guardar diseño"); publish existe fuera.
- **¿Qué bloquea clientes?** Pinch zoom, panel links largo, falsas promesas (spacing/border/font/fusion).

---

## FINAL FIELDS

- FILES MODIFIED: NONE
- DATABASE MODIFIED: NO
- POWER EDITOR MODIFIED: NO
- TEMPLATE BUILDER MODIFIED: NO

- USER ISSUES CONFIRMED COUNT: 13
- GLOBAL BUGS COUNT: 6
- TEMPLATE-SPECIFIC BUGS COUNT: 2
- NOT_IMPLEMENTED COUNT: 6

- DB CHANGES REQUIRED FOR CARD: YES
- DB CHANGES REQUIRED FOR FOOTER: NO
- DB CHANGES REQUIRED FOR AVATAR RIM: NO

- CLIENT BETA READY: NO

- RECOMMENDED FIRST REPAIR PHASE: Phase A (broken existing controls)

- REQUIRES_AUTHORIZATION: NO
- FROZEN CODE VIOLATIONS: NONE

Final status: **AUDIT COMPLETE — CLIENT BETA BLOCKED**

