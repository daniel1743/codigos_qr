# POWER_EDITOR PHASE 5C4 — HERO BACKGROUND / OVERLAY CONTEXTUAL EDITING

Phase: `5C4` — Hero Background / Overlay Contextual Editing
Status: EXECUTED (automated tests PASS; final PASS requires runtime confirmation)

---

## SOURCE_FILES_READ

1. `src/premium-template-studio/components/blocks/HeroBlock.tsx`
2. `src/premium-template-studio/components/inspector/Inspector.tsx`
3. `src/premium-template-studio/components/inspector/inspectorFocus.ts`
4. `src/premium-template-studio/engine/RenderContext.tsx`
5. `src/premium-template-studio/engine/TemplateRenderer.tsx`
6. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`

(No seventh source file was required — within budget.)

## TEST_FILES_READ

1. `src/premium-template-studio/__tests__/heroImageContextual.test.tsx`
2. `src/premium-template-studio/__tests__/heroTextContextual.test.tsx`

(`heroCtaContextual.test.ts` was NOT opened — a third existing test file would
have exceeded the 2-file budget.)

## FILES_MODIFIED

- `src/premium-template-studio/components/inspector/inspectorFocus.ts`
- `src/premium-template-studio/engine/RenderContext.tsx`
- `src/premium-template-studio/engine/TemplateRenderer.tsx`
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
- `src/premium-template-studio/components/blocks/HeroBlock.tsx`
- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/__tests__/heroBackgroundContextual.test.tsx` (new)

---

## HERO_BACKGROUND_RENDER_OWNER

`HeroBlock.tsx`. Every Hero variant returns a root `<div>` (the card surface)
that spreads:

- `cardStyle(theme, block.style)` — solid background color (`style.background`).
- `gradientBgStyle` = `blockBackgroundGradientStyle(block.style.backgroundGradient)`.
- `bgStyle` — CSS `backgroundImage` from `content.backgroundImage.url`.

The root `<div>` is therefore the single correct "background surface" owner,
and the element that now carries `data-editor-target="hero-background"`.

## OVERLAY_RENDER_OWNER

`HeroBlock.tsx`. The scrim is a **real DOM element** (not a pseudo-layer):

- `overlayElem` — rendered by `centered` / `editorial` / `split` variants when
  `backgroundImage.url || isFullImage`. Driven by `style.overlay`
  (`type`, `opacity`, `direction`). `<div aria-hidden>` absolute `inset:0` `zIndex:1`.
- Full-image variant renders its own hardcoded overlay `<div aria-hidden>`
  (fixed gradient) — **not** driven by `style.overlay` (pre-existing behavior).

## FULL_IMAGE_IMPLEMENTATION

The `full-image` variant renders the media as the root's CSS
`backgroundImage: url(backgroundImage.url || bannerImage.url || fallback)`,
NOT as a distinct foreground `<img>`. It therefore carries the background
identity (`hero-background`) and does **not** emit `hero-image` (5C3 contract
preserved).

---

## BACKGROUND_CONTEXT_TARGET

- Canvas identity: `data-editor-target="hero-background"` on every Hero root
  `<div>` (edit mode only).
- Inspector identity: `data-inspector-focus="hero-background"` wrapping the
  Background section (smallest practical group — solid color, gradient,
  full background image, corner radius). Does NOT wrap the whole Inspector.

## OVERLAY_CONTEXT_TARGET

- Inspector identity: `data-inspector-focus="hero-overlay"` wrapping the Overlay
  section (type / intensity / direction).
- Canvas identity: `data-editor-target="hero-overlay"` on the scrim element
  (reveal-only — see below).

---

## BACKGROUND_CANVAS_TO_INSPECTOR

`heroBackgroundClickProps()` on the root `<div>`:

1. `data-editor-target="hero-background"` (edit mode).
2. `onClick` → safety filter → `e.stopPropagation()` →
   `onSelectHeroBackground(block.id)`.
3. `PremiumTemplateStudio.onSelectHeroBackground` selects parent Hero if needed
   and calls `requestInspectorFocus("hero-background")`.
4. Inspector centers `[data-inspector-focus="hero-background"]` via frozen
   `computeInspectorFocusScroll` (~45% anchor).

## BACKGROUND_INSPECTOR_TO_CANVAS

`contextualFocusProps("hero-background")` → `requestCanvasFocus("hero-background")`
on focus/pointer-down inside the Background group → frozen generic
`PowerCanvasViewport` reveal of `[data-editor-target="hero-background"]`.

## OVERLAY_INSPECTOR_TO_CANVAS

`contextualFocusProps("hero-overlay")` → `requestCanvasFocus("hero-overlay")`
on focus/pointer-down inside the Overlay group → reveal of
`[data-editor-target="hero-overlay"]`. No fallback to `hero-background` was
needed — the overlay is a real, distinct DOM element.

## OVERLAY_DIRECT_CANVAS_CLICK_SUPPORTED

**No.** The overlay is a decorative, `aria-hidden` scrim. It is made
`pointer-events: none` and reveal-only. Making it a direct click surface would
either steal the "click background → Background controls" contract or require
intercepting child interactions. Overlay remains contextual through
Inspector → Canvas (safety-gated, per spec).

---

## CHILD_CLICK_PROTECTION

Two layers:

1. Existing child targets (title/subtitle/description/eyebrow/CTA button/image)
   already call `e.stopPropagation()`.
2. The background `onClick` additionally filters:
   `const closest = target.closest("[data-editor-target]"); if (closest && closest !== currentTarget) return;`
   This guards non-clickable child wrappers (e.g. the `hero-cta` container,
   which has `data-editor-target="hero-cta"` but no own handler).

The refinement `closest !== currentTarget` is necessary because the root itself
now carries `data-editor-target="hero-background"` (the naive
`target.closest("[data-editor-target]")` would otherwise always match the root
and permanently swallow background clicks).

## HERO_PARENT_SELECTION

`onSelectHeroBackground(blockId)` dispatches `selectBlock` **only** when
`state.selectedBlockId !== blockId` (no redundant churn), then requests focus —
identical to the frozen `onSelectHeroCta` / `onSelectHeroText` /
`onSelectHeroImage` handlers.

---

## EXISTING_BACKGROUND_COLOR

`style.background` (solid color), exposed via the Background section
"Solid Color" `ColorInput`. Already canonical. Reused unchanged.

## EXISTING_BACKGROUND_GRADIENT

`style.backgroundGradient.{from,to,angle}` (`backgroundGradientStyle`).
Exposed via "From Color" / "To Color" / "Angle". Already canonical. Reused.

## EXISTING_BACKGROUND_IMAGE

`content.backgroundImage.{url,blur,fit,position}` ("Full Background Image").
Already canonical. Reorganized from the Image section into the Background
section so the `hero-background` group surfaces it (allowed "reorganize").

## EXISTING_OVERLAY_TYPE

`style.overlay.type` (`"solid" | "gradient"`). Already canonical. Reused.

## EXISTING_OVERLAY_OPACITY

`style.overlay.opacity` (0–1 "Intensity"). Already canonical. Reused.

## EXISTING_OVERLAY_DIRECTION

`style.overlay.direction` (`"to-top" | "to-bottom"`). Already canonical. Reused.

---

## UNSUPPORTED_DESIRED_CAPABILITIES

- Full-image overlay is hardcoded and does **not** respond to `style.overlay`
  controls (pre-existing). Wiring it would be a behavior change outside 5C4's
  contextual-focus scope; left frozen and reported.
- No new schema, blend/fade, masks, fixed/parallax, or background effects were
  introduced (all out of scope).

---

## HERO_IMAGE_REGRESSION

NONE. `hero-image` foreground identity (5C3) untouched. `full-image` still does
not emit `hero-image`. Verified by `heroImageContextual.test.tsx` (8 tests PASS).

## HERO_TEXT_REGRESSION

NONE. Verified by `heroTextContextual.test.tsx` (8 tests PASS).

## HERO_CTA_REGRESSION

NONE. CTA click still wins over background (verified by the new CTA protection
tests). CTA handler itself unchanged.

---

## CAMERA_CHANGES

NONE. No camera/zoom/pan/viewport files touched.

## CANONICAL_CHANGES

NONE. No `types/index.ts`, schema, or canonical field changes.

## PERSISTENCE_CHANGES

NONE.

## HISTORY_CHANGES

NONE.

## ENGINE_V2_CHANGES

NONE.

## PROFILE_COVER_CHANGES

NONE. Profile cover remains untouched (explicitly out of scope).

---

## TESTS

New: `src/premium-template-studio/__tests__/heroBackgroundContextual.test.tsx`
(14 tests, PASS):

- hero-background accepted as ContextualTarget
- hero-overlay accepted as ContextualTarget
- pre-existing targets preserved
- canvas→inspector hero-background signal
- inspector→canvas hero-background / hero-overlay signals
- every variant exposes `hero-background`
- full-image exposes `hero-background` + `hero-overlay`, not `hero-image`
- public mode leaks no editor identity
- clicking exposed background emits `hero-background` selection
- title click resolves as title, never background
- CTA button click resolves as CTA, never background
- CTA wrapper click filtered, never background
- foreground image click resolves as hero-image, never background

Regression (run, PASS):
- `heroBackgroundContextual` (14)
- `heroImageContextual` (8)
- `heroTextContextual` (8)

Total: 30 tests PASS.

## LINT

`eslint` on modified source + new test: **0 errors**, 1 pre-existing warning
(`react-refresh/only-export-components` on `RenderContext.tsx`, unchanged).
The `prettier/prettier: Delete ␍` reports are a pre-existing project-wide CRLF
artifact (`core.autocrlf=true` on Windows) affecting already-committed files
equally (e.g. `heroImageContextual.test.tsx`); not introduced by 5C4.

## BUILD

Full `tsc --noEmit` did not complete within the tool timeout (large project);
no project-wide typecheck script exists in `package.json`. All changed files
transformed and executed successfully under Vitest (30 passing tests),
exercising the complete `TemplateRenderer → RenderContext → HeroBlock` and
`PremiumTemplateStudio` wiring end-to-end.

## RUNTIME

Automated DOM interaction (happy-dom) verified the click → selection and
child-protection flows. Manual runtime gates (BG-01 … BG-15) remain pending
user confirmation.

## VISUAL

NOT_VERIFIED (requires runtime confirmation).

## STOP_TRIGGERED

NO. No seventh source file, third existing test file, camera/schema/engine/
persistence/history/profile-cover modification, or 5C3 rewrite was required.

---

## FINAL_GATE

POWER_EDITOR_PHASE5C4_HERO_BACKGROUND_OVERLAY_CONTEXTUAL_GATE = **NOT_VERIFIED**

Automated tests cannot produce PASS. Final PASS requires user runtime
confirmation that: (1) clicking exposed Hero background centers exact
Background controls, (2) full-image is treated as background not foreground,
(3) Title/CTA/Image child clicks are not hijacked, (4) Background/Overlay
Inspector interaction reveals the correct Hero region, (5) zoom/camera
behavior is unchanged.
