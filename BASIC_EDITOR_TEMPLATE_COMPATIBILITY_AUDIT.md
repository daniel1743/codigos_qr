# BASIC EDITOR + 4 TEMPLATE COMPATIBILITY AUDIT

Date: 2026-08-30 · Agent: Codex · Mode: STRICT READ-ONLY

---

## 1. EXECUTIVE SUMMARY

El nuevo Basic Editor (shell + canvas + bottom sheet + MobileBottomNavbar + Galería) es una
**integración incompleta** del sistema de templates (`basic-template`) con el editor legado
(`ProfileSection` / `DesignSection` / `LinksSection`).

**Resultado clave:** el editor muestra controles (tipografía, colores, degradados, difuminación)
que el renderer de templates **ignora por completo**, porque el renderer usa valores hardcodeados
(paleta y font-pair del catálogo), no los campos del perfil. Además, el contenido específico de
template (subtítulo, cards, contacto) está **hardcodeado a vacío** en el adaptador, por lo que
Beauty Catalog muestra 0 cards y Executive Straight muestra 0 contacto.

**Veredicto:** NO production-ready. Requiere conectar font/colores/gradientes al config, cablear
cards/contacto/subtítulo/socials desde el editor, implementar button→card + 75/25, y renderizar
footer en las templates.

---

## 2. WORKTREE / BRANCH / HEAD AUDITED

| Field | Value |
|---|---|
| AUDITED WORKTREE | `C:/Users/Lenovo/Desktop/proyectos desplegados importante/generador de QR` |
| AUDITED BRANCH | `feat/mobile-gallery-template-integration` |
| AUDITED HEAD | `f33f83be2ef95a9106258823543ed32af5228902` |
| WORKTREE STATUS | Sucio (12 modificados + 1 untracked dir `src/components/basic-editor-shell/`) |

Nota: este worktree contiene la integración más reciente (commit `313c784` trae el Template Lab;
`f33f83b` "se cambia a editor sencillo de momento"). Los otros worktrees (restore-basic =
`feat/profile-footer`, template-lab = `feat/basic-template-lab`) NO son el editor actual.

---

## 3. NEW BASIC EDITOR ARCHITECTURE

- `src/routes/editor.tsx` — estado (profile, links, activeSection, selectedTarget), adaptador `toBasicTemplateContent`, build de config, save/publish.
- `src/components/basic-editor-shell/BasicEditorShell.tsx` — canvas (zoom/pan/recenter), header (preview/save/publish), panel desktop + bottom sheet móvil.
- `src/components/editor/MobileBottomNavbar.tsx` — 4 pestañas: Perfil / Enlaces / Diseño / Galería.
- `src/components/editor/MobileTemplateGallery.tsx` — galería (Vista previa / Usar plantilla).
- `src/components/basic-template/` — renderer + primitives + renderers por familia.
- `src/lib/basic-templates/` — catalog (4 templates) + config + fixtures + validate.
- `src/types/basic-templates.ts` — tipos.
- `src/components/profile/PublicProfileView.tsx` — renderer público (template o legacy).
- `src/components/editor/{ProfileSection,DesignSection,LinksSection,ShareSection}.tsx` — secciones legadas.

Single source of truth:
- Profile: estado `profile` en `editor.tsx`. Links: estado `links`. Template: `profile.template_id`.
- Customization: campos del profile (`button_radius/button_style/button_border_thickness/button_border_color/theme_spacing/font_family/background_color/button_color/button_text_color`).
- Config: `buildConfig(template, content, { buttonCustomization: profile })`.

---

## 4. MOBILE UX/UI ASSESSMENT

- Canvas arriba, altura `h-[calc(100dvh-4rem)]` compacto / `h-[min(58dvh,680px)]` normal.
- Scroll interno: sí (viewport ref + scrollTo al enfocar target).
- Zoom (0.6–1.5), pan, recenter: implementados (`CanvasWorkspace`).
- Highlight selected element: sí (`EditTarget` + `highlightedTarget`).
- Focus selected element: sí (scroll centrado smooth, `editor.tsx` 119–135).
- Bottom sheet contextual: sí (`mobilePanelOpen`, max-h 58dvh).
- Bottom navbar: 4 items + safe-area.
- Taps to edit common element: 2 (tap canvas → panel correcto).

Hallazgo: sin controles de subtítulo/cards/contacto/socials.

---

## 5. DESKTOP UX/UI ASSESSMENT

Canvas visible (grid 1.55fr/0.85fr), panel derecho scroll independiente, preview (Eye), save/publish
(header + ShareSection), responsive `lg:` (bottom sheet → side panel).

---

## 6. EDITOR STATE + DATA FLOW

1. load → `getProfileByUserId` (`select("*")`) → `setProfile`.
2. `toBasicTemplateContent(profile, links)` adapta → BasicTemplateContent.
3. `buildConfig(template, content, { buttonCustomization: profile })`.
4. Canvas = `BasicTemplateRenderer`.
5. Public = `PublicProfileView` → mismo buildConfig.
6. Save = `create/updateProfile` (incluye template_id/version/config).

`template_config` es writable pero nunca se escribe (campo muerto).

---

## 7. COMPLETE EDITOR CONTROL INVENTORY

- Perfil: Avatar, Nombre, Biografía, Enlace personalizado (slug).
- Enlaces: Agregar/Eliminar/Reordenar/Texto/URL/Mostrar. (NO button/card, NO imagen).
- Diseño: Tipografía (10), Botones (Cuadrado/Redondeado/Píldora/Premium), Separación (3),
  Grosor de borde (4), Color del borde, Fondo (sólido/degradado), Color botón (sólido/degradado),
  Texto botón, Portada, Difuminación.
- Galería: 4 templates, Vista previa, Usar plantilla, Activa.

---

## 8. FOUR-TEMPLATE COMPATIBILITY MATRIX

Leyenda: PASS / PARTIAL / FAIL / NOT_SUPPORTED_BY_TEMPLATE / UI_NOT_CONNECTED / HARDCODED / NOT_IMPLEMENTED

| EDITOR CONTROL | Beauty Curve | Luxury Fusion | Beauty Catalog | Executive Straight |
|---|---|---|---|---|
| Avatar | PASS | PASS | PASS | PASS |
| Hero/banner | PASS | PASS | PASS | PASS |
| Nombre | PASS | PASS | PASS | PASS |
| Bio | PASS | PASS | PASS | PASS |
| Subtítulo | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| Fuente (10) | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED |
| Background color | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED |
| Background gradient | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED |
| Button color | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED |
| Button gradient | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED |
| Button text color | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED |
| Cuadrado | PASS | PASS | PASS | PASS |
| Redondeado | PASS | PASS | PASS | PASS |
| Píldora | PASS | PASS | PASS | PASS |
| Premium | PASS | PASS | PASS | PASS |
| Border width | PASS | PASS | PASS | PASS |
| Border color | PASS | PASS | PASS | PASS |
| Button spacing | PASS | PASS | PASS | PASS |
| Button→Card mode | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| 75/25 reference image | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| Links | PASS | PASS | FAIL (no se renderizan) | PASS |
| Cards (Catalog) | NOT_SUPPORTED | NOT_SUPPORTED | UI_NOT_CONNECTED | NOT_SUPPORTED |
| Contacto (Executive) | NOT_SUPPORTED | NOT_SUPPORTED | NOT_SUPPORTED | UI_NOT_CONNECTED |
| Socials | PARTIAL | PARTIAL | PARTIAL | NOT_SUPPORTED |
| Footer | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |
| Difuminación hero | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED | UI_NOT_CONNECTED |


---

## 9. BEAUTY CURVE FULL AUDIT

Family `hero_profile`, heroStyle `curved`. Renderer `HeroProfileRenderer.tsx`.
- Avatar ✅, Nombre ✅, Bio ✅, Hero (curva) ✅, Links ✅.
- Subtítulo ❌ (hardcode `""`), Socials ⚠️ (editor `[]`, público derivado).
- Fuente/colores/degradados ❌ (paleta/font hardcode). Difuminación ❌ (mask hardcode en `Hero.tsx`).
- Footer ❌ (renderer no renderiza footer).

## 10. LUXURY FUSION FULL AUDIT

Family `hero_profile`, heroStyle `fusion`. Renderer `HeroProfileRenderer.tsx`.
- Avatar ✅ opaco separado (`Identity.tsx` opacity:1), Hero fusion ✅ (mask hardcode).
- Subtítulo ❌, Socials ⚠️, Fuente/colores/degradados ❌, Difuminación ❌, Footer ❌.

## 11. BEAUTY CATALOG FULL AUDIT

Family `hero_cards`. Renderer `HeroCardsRenderer.tsx`.
- Avatar ✅, Nombre ✅, Bio ✅, Hero ✅.
- **CRÍTICO:** renderiza CARDS, no links. `content.cards = []` (hardcode). Resultado: los links del
  usuario NO aparecen y NO hay cards. Perfil queda casi vacío.
- Card primitive (`card.tsx`) = tarjeta VERTICAL (imagen arriba h-40, contenido abajo), NO 75/25.
- Subtítulo ❌, Socials ⚠️, Fuente/colores ❌, Footer ❌.

## 12. EXECUTIVE STRAIGHT FULL AUDIT

Family `professional_corporate`. Renderer `CorporateRenderer.tsx`.
- Avatar ✅, Nombre ✅, Bio ✅, Hero ✅, Links ✅.
- Contacto ❌ (`content.contact = {phone:"",email:"",whatsapp:""}` hardcode → `ContactBlock` retorna null).
- Subtítulo ❌, Fuente/colores ❌, Footer ❌, Socials NOT_SUPPORTED.

---

## 13. FONTS COMPATIBILITY

- Selector de fuente existe (10 fuentes, `DesignSection.tsx` FONTS, línea 20–23).
- Fuentes disponibles: Inter, Poppins, Montserrat, DM Sans, Manrope, Raleway, Nunito, Lato,
  Playfair Display, Merriweather (10, cumple mínimo).
- **FAIL end-to-end:** `font_family` NO se mapea a `FontPairConfig`. `buildConfig` usa
  `fontPairs[0]` (default) porque `editor.tsx:314` no pasa `fontPair`. El renderer usa
  `fontPair.heading/body` (Georgia/Inter), no la fuente elegida.
- Consecuencia: elegir "Poppins" no cambia nada en la template (FALSE PROMISE).
- Raíz: falta adaptador `font_family → fontPair`.

## 14. COLORS + GRADIENTS COMPATIBILITY

- Controles: Fondo (sólido/degradado), Color botón (sólido/degradado), Texto botón, Color borde.
- **FAIL:** el renderer usa `palette.background/accent/text/textMuted/accentText` (catálogo
  hardcodeado), NO `background_color/button_color/button_text_color`.
- Degradados: se guardan como string en `background_color`/`button_color`, pero el renderer usa
  paleta sólida. FAIL.
- Color de borde: CONECTADO (`button_border_color` → `borderColor` en `config.ts`).

## 15. BUTTON SHAPE COMPATIBILITY

- Cuadrado/Redondeado/Píldora/Premium → `button_radius`+`button_style` → `resolveButtonStyle`
  (`config.ts` 43–70) → `buttonStyle.shape`.
- **PASS:** las 4 templates tienen square/rounded/pill/premium en sus `buttonStyles`.
- Radio: sharp=2px, rounded=12px, pill=9999px, premium-soft=20px (`button.tsx` shapeRadius).

## 16. BORDER + SPACING COMPATIBILITY

- Border width (0/1/2/3): CONECTADO (`button_border_thickness` → `borderWidth`).
- Border color: CONECTADO (`button_border_color` → `borderColor`), control visible sólo si hay grosor.
- Spacing: CONECTADO (`theme_spacing` → `spacing` = 0.5rem/0.75rem/1.25rem). El renderer usa
  `gap: buttonCustomization.spacing` (no hardcode gap-3). PASS.

## 17. BUTTON VS CARD MODE

- **NOT_IMPLEMENTED.** No existe field `presentation_mode` en `ProfileLink` ni en `LinkItem`.
- No hay toggle button→card, no UI, no renderer que lo entienda.

## 18. 75% CONTENT / 25% IMAGE CARD AUDIT

- **NOT_IMPLEMENTED.** `Card` (`card.tsx`) es vertical (imagen h-40 arriba, contenido abajo), no 75/25.
- No hay `image_url/reference_image` en `ProfileLink` (sólo `social_cover_image_*` legado).
- No hay layout 75/25 ni upload de imagen por enlace.
- Beauty Catalog NO cumple el contrato de link-card 75/25 (sólo tiene cards verticales de catálogo).

## 19. DIRECT CANVAS SELECTION

- Implementado: `targetRegistry` + `EditTarget` (register/select). Tap en avatar/nombre/bio/link/card/hero
  abre el panel correcto vía `getSectionForTarget` (`editor.tsx` 42–52).
- **PASS** para hero/avatar/nombre/bio/links/cards/socials (targets definidos en `EDIT_TARGETS`).
- Footer: NO tiene target (no renderizado).

## 20. FOCUS SELECTED ELEMENT IN CANVAS

- Implementado (`editor.tsx` 119–135): scroll centrado smooth al target seleccionado.
- **PASS** (funciona para top/medio/bottom, links y cards individuales). No repite por tecla
  (sólo al cambiar `selectedTarget`).

## 21. GALLERY + TEMPLATE SWITCHING

- 4 templates visibles (TEMPLATES en catalog). Thumbnails reales (`TemplateThumbnail`).
- Vista previa / Usar plantilla / marcador Activa: implementados.
- Content preservation: al cambiar template se mantiene `profile`/`links` (estado no se resetea).
  PERO como cards/contacto/subtítulo no existen, el contenido "compatible" es sólo profile+links.
- No duplica destino de apariencia (Galería es sección propia).

## 22. PREVIEW

- Eye → fullscreen `Vista previa` (sin chrome, `BasicEditorShell` previewMode).
- Usa borrador no guardado (estado en memoria), no guarda ni publica. Vuelve preservando estado.
- **PASS.**

## 23. SAVE / RELOAD / PUBLISH

- Save draft: persiste profile (incl. template_id/version, button/color/font/spacing/border) +
  links. `template_config` NO se escribe (siempre `{}`).
- Reload: `loadData` rehidrata profile+links. template_id persiste → template se mantiene.
- Publish: mismo draft, misma URL (`public_id`), mismo QR.
- **Caveat:** los valores "falsos" (font/colores) sí persisten, pero no se reflejan en la template.

## 24. PUBLIC PAGE + QR PARITY

- Public = `PublicProfileView` → mismo `buildConfig` (paridad de renderer de template).
- **BUG de paridad:** `editor.tsx` adaptador socials=`[]`, `PublicProfileView.tsx` adaptador socials
  derivados de links por platform. Editor preview ≠ página pública en socials.
- QR: la ruta pública usa el mismo `PublicProfileView`, por lo que QR == página pública.


---

## 25. FALSE-PROMISE CONTROLS

Controles visibles que el usuario cambia pero NO alteran la template:

1. **Tipografía (10 fuentes)** — `DesignSection.tsx` → `font_family`; renderer usa `fontPair` default.
2. **Fondo (sólido/degradado)** — `background_color`; renderer usa `palette.background`.
3. **Color botón (sólido/degradado)** — `button_color`; renderer usa `palette.accent`.
4. **Texto botón** — `button_text_color`; renderer usa `palette.accentText`.
5. **Difuminación (0–100)** — `banner_fusion_strength`; `Hero.tsx` usa mask hardcode.
6. **Subtítulo** — ni hay control; campo hardcodeado vacío.

## 26. HARDCODED VALUES THAT BLOCK CUSTOMIZATION

- `palette.*` por template en `catalog.ts` (12–83).
- `fontPair.heading/body` (Georgia/Inter) no derivado de `font_family`.
- Mask de fusión en `Hero.tsx` 22–23.
- Geometría de card vertical (`card.tsx`) — no 75/25.
- `subtitle:""`, `cards:[]`, `contact:{vacío}` en adaptadores (`editor.tsx` 62/72/74; `PublicProfileView.tsx` 32/42/55).
- `template_config` nunca se escribe.

## 27. MISSING ADAPTERS / CONTRACTS

- `font_family → FontPairConfig` (falta).
- `background_color/button_color/button_text_color → PaletteConfig` (falta).
- `ProfileLink → CardItem` (falta; cards siempre `[]`).
- `Profile → ContactContent` (falta; contacto siempre vacío).
- `ProfileLink → presentation button/card` (falta).
- `banner_fusion_strength → hero fusion` (falta).
- `ProfileLink.image → reference image 75/25` (falta).

## 28. BUGS AND RISKS BY SEVERITY

**CRITICAL**
1. Font/colores/gradientes = FALSE PROMISE (UI muestra, renderer ignora).
2. Beauty Catalog pierde links (renderiza cards, cards=[]).
3. Contenido específico (subtítulo/cards/contacto/socials) no cableado.

**HIGH**
4. Paridad editor vs público en socials (adaptador distinto: `editor.tsx:73` vs `PublicProfileView.tsx:43`).
5. Footer no renderizado en templates.
6. Difuminación no conectada (mask hardcode).

**MEDIUM**
7. `template_config` campo muerto.
8. Sin control de subtítulo/cargo.

**LOW**
9. Worktree sucio sin commit.

## 29. PER-TEMPLATE SCORE /100

| Template | Score | Clasificación |
|---|---|---|
| Beauty Curve | 60 | incomplete |
| Luxury Fusion | 60 | incomplete |
| Beauty Catalog | 45 | not_ready |
| Executive Straight | 55 | incomplete |

## 30. EDITOR OVERALL SCORE /100

**55 / 100 — incomplete (NO production-ready).**

## 31. WHAT IS ALREADY PRODUCTION-READY

Shell móvil/desktop, zoom/pan, bottom sheet, nav 4 pestañas, galería, direct selection + focus,
avatar/nombre/bio/hero/links end-to-end, button shape/border/spacing end-to-end, persistencia
profile+template_id.

## 32. WHAT MUST BE FIXED BEFORE PRODUCTION

1. Conectar font → fontPair.
2. Conectar background/button/text colors + gradients → palette.
3. Cablear subtítulo/cards/contacto/socials (UI + adaptador).
4. Unificar adaptador socials.
5. Renderizar footer en templates.
6. Conectar difuminación a hero.
7. Implementar button→card + 75/25 (o retirar esos controles).

## 33. WHAT CAN WAIT

template_config real; más templates; keyboard avanzado.

## 34. RECOMMENDED FIX ORDER

1. (CRIT) adaptadores font/colores en `config.ts`/`editor.tsx`.
2. (CRIT) modelo+UI+adaptador de cards/contacto/subtítulo/socials.
3. (HIGH) unificar socials, footer en renderers, difuminación en Hero.
4. (MED) button→card + 75/25 (o retirar de la UI).
5. (LOW) commit del worktree.


---

## 35. FINAL VERDICT

- **Q1 — ¿editor completo/usable?** NO. Shell y edición básica de perfil funcionan; templates a medio cablear.
- **Q2 — ¿las 4 templates responden a TODO control?** NO. Font/colores/gradientes/difuminación no responden.
- **Q3 — ¿qué controles NO responden?** Tipografía, fondo, color botón, texto botón, degradados, difuminación, subtítulo, footer.
- **Q4 — ¿templates incompatibles?** Beauty Catalog (cards vacías, links no renderizados); Executive Straight (contacto vacío).
- **Q5 — ¿funcionalidad engañosa?** SÍ: font, colores, degradados (false promise).
- **Q6 — font/color/gradient/button/border/spacing end-to-end?** border/spacing/button-shape SÍ; font/color/gradient NO.
- **Q7 — button→card?** NO.
- **Q8 — 75/25 card?** NO.
- **Q9 — ¿las 4 templates pueden usar esa card?** N/A (no existe).
- **Q10 — editor preview == página pública?** Mayormente sí (mismo renderer), EXCEPTO socials (adaptador distinto).
- **Q11 — ¿qué falta para compatibilidad total?** Adaptadores font/color, cablear cards/contacto/subtítulo/socials, unificar socials, footer en templates, difuminación, button→card/75/25.

---

## FINAL FIELDS

- AUDITED WORKTREE: `C:/Users/Lenovo/Desktop/proyectos desplegados importante/generador de QR`
- AUDITED BRANCH: `feat/mobile-gallery-template-integration`
- AUDITED HEAD: `f33f83be2ef95a9106258823543ed32af5228902`

- FILES MODIFIED: NONE (sólo se creó este reporte)
- DATABASE MODIFIED: NO
- POWER EDITOR MODIFIED: NO
- TEMPLATE BUILDER MODIFIED: NO

- EDITOR OVERALL SCORE: 55/100
- BEAUTY CURVE SCORE: 60/100
- LUXURY FUSION SCORE: 60/100
- BEAUTY CATALOG SCORE: 45/100
- EXECUTIVE STRAIGHT SCORE: 55/100

- CRITICAL GAPS COUNT: 3
- HIGH GAPS COUNT: 3
- MEDIUM GAPS COUNT: 2
- LOW GAPS COUNT: 1

- BUTTON/CARD MODE STATUS: NOT_IMPLEMENTED
- 75/25 CARD STATUS: NOT_IMPLEMENTED

- PRODUCTION READY: NO
- REQUIRES_AUTHORIZATION: NO
- FROZEN CODE VIOLATIONS: NONE

Final status: **AUDIT COMPLETE — FIXES REQUIRED**

