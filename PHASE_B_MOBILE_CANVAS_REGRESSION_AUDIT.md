# PHASE B MOBILE CANVAS REGRESSION AUDIT

Read-only audit · Agent: Cline · Date: 2026-08-30

---

## 1. EXECUTIVE VERDICT

Phase B (`aa35f52` "add mobile pinch zoom and bounded canvas pan") reemplazó el **scroll vertical nativo
que funcionaba** (`touch-action: pan-y`) por un sistema de gestos propio (`touch-action: none` +
pointer pan/pinch) que NO fue verificado en runtime y rompió 4 cosas a la vez:

1. Perdió el scroll/pan vertical (BLOCKER).
2. El pinch sigue sin funcionar (BLOCKER).
3. El template queda recortado/inalcanzable (BLOCKER).
4. Error de `preventDefault` en listener pasivo (CRITICAL, pre-existente pero relevante).

**Recomendación: REVERTIR COMPLETAMENTE `aa35f52` → `e6d5ea8`** (Option C). Phase B sustituyó
comportamiento táctil que funcionaba por un sistema de gestos no verificado con múltiples regresiones
interactuantes. El revert es de 1 solo archivo (BasicEditorShell.tsx), limpio y seguro.

---

## 2. BRANCH / HEAD / WORKTREE

- Branch: `feat/basic-editor-editorial-canvas-ui`
- HEAD: `aa35f52fc5d3b93bd84566c9877b916e0c9fdd57` (= Phase B)
- PRE-PHASE-B GOOD: `e6d5ea87c14a6076c6ee9bde9095c33aa1e47974` (Phase A commit)
- Worktree: limpio.

## 3. EXACT PHASE B DIFF

Phase B tocó UN solo archivo: `src/components/basic-editor-shell/BasicEditorShell.tsx` (+112/−8).

| Cambio | Clasificación |
|---|---|
| `activePointers` Map + `pinchStartRef` (multi-touch) | REQUIRED_FOR_PINCH |
| `getPanBounds` / `clampPan` (360*zoom / 620*zoom) | CONFIRMED_REGRESSION (altura mínima fija) |
| `getPointerDistance` | REQUIRED_FOR_PINCH |
| `onPointerDown` reescrito (track + pinch start) | REGRESSION_RISK |
| `onPointerMove` reescrito (pinch + pan clamp) | REGRESSION_RISK |
| `stopPan` reescrito (delete + reset) | REGRESSION_RISK |
| `touchAction: "pan-y"` → `"none"` | **CONFIRMED_REGRESSION** |
| `onWheel` con `preventDefault` (sin cambio) | UNRELATED (pre-existente) |

## 4. PASSIVE EVENT LISTENER ERROR

- FILE: `BasicEditorShell.tsx` · LINE: 117 (`event.preventDefault()`) · HANDLER: `onWheel` · EVENT: `wheel`.
- WHY PASSIVE: React 17+ registra `onWheel`/`onTouchStart`/`onTouchMove` como **passive** en el root.
- RESULT: `preventDefault()` sin efecto → "Unable to preventDefault inside passive event listener
  invocation". ctrl+wheel (desktop) hace scroll de página en vez de zoom.
- Nota: pre-existente (contexto sin cambios del diff), NO introducido por Phase B.

## 5. PINCH ZOOM ROOT CAUSE

PRIMARIA: **`touch-action: none` (línea 267) + `onPointerDown` early-return sobre `[data-edit-target]`
(líneas 122-123)**. Con `touch-action: none` el navegador no hace nada; el pinch propio sólo inicia si
`onPointerDown` NO retorna temprano. Pero el template está lleno de `data-edit-target` (hero/avatar/
nombre/bio/links), así que pellizcar SOBRE el template retorna temprano → no hay pinch.

SECUNDARIAS: `setPointerCapture` del primer dedo puede interferir con el segundo (iOS Safari);
`activePointers.current.values()` puede quedar desincronizado; `setZoomOffset(nextZoom - fitZoom)`
usa un `fitZoom` que pudo cambiar.

## 6. LOST VERTICAL TOUCH MOVEMENT

ANTES (`e6d5ea8`): `touch-action: pan-y` → scroll vertical NATIVO (`overflow-auto`). Funcionaba.
DESPUÉS (`aa35f52`): `touch-action: none` → sin scroll nativo; el pan propio no arranca por el
early-return sobre `data-edit-target`. → scroll vertical perdido.

Respuesta: SÍ, Phase B quitó un scroll nativo que FUNCIONABA antes de que su reemplazo estuviera probado.

## 7. HORIZONTAL PAN FAILURE

`clampPan` usa `getPanBounds` con `contentWidth = 360*zoom`, `contentHeight = 620*zoom` (85-95).
La altura real puede superar 620px → `maxY` mal calculado. El pan horizontal también sufre el
early-return.

## 8. TEMPLATE CLIPPING / HIDDEN CONTENT

- Caja interna (282): `w-[360px] min-h-[620px] overflow-hidden` + `transform: scale(zoom)` con
  `transformOrigin: top left` (284-285).
- Wrapper externo (274-279): `width: 360*zoom`, `minHeight: 620*zoom` (ESCALADO), mientras la caja
  interna usa layout SIN escalar. `transform` no cambia layout → área scrollable ≠ tamaño visual.
- Pan bounds usan `TEMPLATE_MIN_HEIGHT = 620` (no la altura real) → con template largo el usuario
  no llega al fondo → porción inferior oculta/inalcanzable.
- `overflow-hidden` + `min-h-[620px]` + `scale` recortan cuando `zoom > 1`.

---

## 9. PAN BOUNDS MATH

`maxX = max(0, (360*zoom - vw)/2 + 24)` · `maxY = max(0, (620*zoom - vh)/2 + 24)`.

Defectos:
1. Usa `TEMPLATE_MIN_HEIGHT = 620` en vez de la altura real → bounds incorrectos para templates largos.
2. Calcula contra `viewport.clientWidth/Height` antes de que `ResizeObserver`/`fitZoom` asienten.
3. Contenido mayor que viewport → `maxY` puede ser 0/negativo → sin pan vertical.
4. Centrado (`mx-auto`) + `transformOrigin top left` consumen espacio de pan no contabilizado.

## 10. FITZOOM / RESIZEOBSERVER

`fitZoom` se recalcula en `ResizeObserver` (61-76); `zoom = fitZoom + zoomOffset`. El pinch hace
`setZoomOffset(nextZoom - fitZoom)`. Si el panel/viewport cambia durante el gesto, `fitZoom` se
actualiza y **pelea** con `zoomOffset` del usuario (stale closure posible). El zoom del gesto se
revierte o sobregraba.

## 11. POINTER CAPTURE

`setPointerCapture(event.pointerId)` (125) captura CADA dedo; capturar el primero puede bloquear el
segundo `pointerdown` en iOS Safari. `stopPan` (193-211) elimina el pointer, pero no hay
`releasePointerCapture` explícito; un `pointercancel` sin `pointerup` puede dejar estado sucio
(`onPointerCancel={stopPan}` mitiga parcialmente).

## 12. TOUCH-ACTION

`touchAction: "none"` (267) elimina TODO el scroll nativo. El pan/pinch propios deben cubrirlo todo
pero fallan (early-return + bounds). Es el cambio más regresivo.
Recomendación conceptual (no implementar): `touch-action: pan-x` (conservar scroll vertical nativo)
o `none` SÓLO cuando el gesto propio esté verificado.

## 13. BEFORE vs AFTER PHASE B

| Aspecto | ANTES (e6d5ea8) | DESPUÉS (aa35f52) |
|---|---|---|
| Vertical | nativo pan-y (funciona) | custom (roto) |
| Horizontal | pan ±96px | custom clamp (bounds mal) |
| Pinch | no disponible | implementado (roto) |
| touch-action | pan-y | none |
| Template visible | sí (scroll nativo) | NO (recortado) |
| Passive error | sí (pre-existente) | sí (sin cambio) |

Líneas que cambiaron "limited but usable" → "broken": línea 267 (`pan-y`→`none`) + bloque
`getPanBounds`/`clampPan` (85-104).

## 14. BLOCKER MATRIX

| Finding | Severity |
|---|---|
| Pinch sin funcionar | BLOCKER |
| Vertical pan perdido | BLOCKER |
| Template recortado | BLOCKER |
| preventDefault pasivo | CRITICAL |
| Pan bounds incorrectos | BLOCKER (causa del recorte) |
| fitZoom pelea con zoom | HIGH |

## 15. HOTFIX vs REVERT DECISION

- **OPTION C — FULL REVERT `aa35f52`** (a `e6d5ea8`). MÁS SEGURO:
  - Revert de 1 archivo, limpio y reversible.
  - Restaura scroll vertical nativo (que YA funcionaba).
  - Phase A (e6d5ea8) queda intacto (es el padre).
  - El pinch puede reimplementarse después con sistema verificado.
- No se recomienda hotfix: los 4 regresiones están entrelazadas (touch-action + early-return +
  bounds + fitZoom); un hotfix pequeño no las resuelve todas sin riesgo.

## 16. EXACT RECOVERY PLAN (audit only — no ejecutar)

- COMMIT A REVERTIR: `aa35f52fc5d3b93bd84566c9877b916e0c9fdd57`.
- QUÉ VUELVE: scroll vertical nativo (`touch-action: pan-y`), pan ±96px, zoom ctrl+wheel + botones,
  template visible vía scroll nativo.
- QUÉ SE CONSERVA: Phase A (font/spacing/border) intacto.
- QUÉ SE PIERDE: pinch multi-touch (que de todos modos no funcionaba) + pan con bounds.
- REIMPLEMENTACIÓN DE PINCH (después): (a) touch-action adecuado; (b) no early-return sobre
  data-edit-target para gestos de 2 dedos; (c) bounds con altura REAL (`scrollHeight`/`getBoundingClientRect`
  post-escala); (d) separar `fitZoom` del zoom de usuario; (e) `preventDefault` vía listener nativo
  `passive:false` para wheel.

## 17. FINAL VERDICT

- **WHY PINCH DOES NOT WORK**: `touch-action: none` + `onPointerDown` early-return sobre `data-edit-target`.
- **WHY preventDefault IS FAILING**: `onWheel` registrado pasivo por React; `preventDefault()` (117) sin efecto.
- **WHY VERTICAL TOUCH MOVEMENT WAS LOST**: `pan-y`→`none` eliminó scroll nativo; pan propio no arranca.
- **WHY HORIZONTAL PAN DOES NOT WORK**: bounds incorrectos + early-return.
- **WHY TEMPLATE IS HALF HIDDEN**: pan bounds con min-height fija (620) vs altura real + `transform: scale`
  desalinea layout/visual.
- **WHETHER FITZOOM IS FIGHTING USER ZOOM**: SÍ.
- **WHETHER PAN BOUNDS ARE WRONG**: SÍ.
- **WHETHER POINTER CAPTURE IS CORRECT**: NO del todo.
- **WHETHER PHASE B SHOULD BE KEPT OR REVERTED**: **REVERTIR COMPLETO**.

---

## FINAL FIELDS

- PRE-PHASE-B GOOD SHA: `e6d5ea87c14a6076c6ee9bde9095c33aa1e47974`
- PHASE-B SHA: `aa35f52fc5d3b93bd84566c9877b916e0c9fdd57`
- PINCH: RUNTIME_FAIL
- VERTICAL PAN: REGRESSION
- TEMPLATE CLIPPING: REGRESSION
- PASSIVE EVENT ERROR: YES (pre-existente, línea 117)
- PRIMARY ROOT CAUSE: `touch-action: none` + `onPointerDown` early-return sobre `data-edit-target`
- SECONDARY ROOT CAUSES: pan bounds fijos (620), fitZoom vs user zoom, setPointerCapture multi-touch, preventDefault pasivo
- SAFE RECOVERY: FULL_REVERT (aa35f52 → e6d5ea8)
- FILES MODIFIED: NONE
- DATABASE MODIFIED: NO
- PHASE A MODIFIED: NO
- POWER EDITOR MODIFIED: NO
- REQUIRES_AUTHORIZATION: NO
- FROZEN CODE VIOLATIONS: NONE

Final status: **AUDIT COMPLETE — PHASE B FULL REVERT RECOMMENDED**

