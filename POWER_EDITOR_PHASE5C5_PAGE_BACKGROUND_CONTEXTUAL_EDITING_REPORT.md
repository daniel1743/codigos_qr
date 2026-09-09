# POWER_EDITOR_PHASE5C5 — PAGE BACKGROUND CONTEXTUAL EDITING

## SOURCE_FILES_READ
1. `src/premium-template-studio/engine/TemplateRenderer.tsx`
2. `src/premium-template-studio/components/inspector/Inspector.tsx`
3. `src/premium-template-studio/components/inspector/inspectorFocus.ts`
4. `src/premium-template-studio/engine/RenderContext.tsx`
5. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
6. `src/premium-template-studio/types/index.ts`

## TEST_FILES_READ
1. `src/premium-template-studio/__tests__/heroBackgroundContextual.test.tsx`
2. `src/premium-template-studio/__tests__/heroImageContextual.test.tsx`

## FILES_MODIFIED
1. `src/premium-template-studio/components/inspector/inspectorFocus.ts`
2. `src/premium-template-studio/engine/RenderContext.tsx`
3. `src/premium-template-studio/engine/TemplateRenderer.tsx`
4. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
5. `src/premium-template-studio/components/inspector/Inspector.tsx`
6. `src/premium-template-studio/__tests__/pageBackgroundContextual.test.tsx` (new)

## PAGE_BACKGROUND_RENDER_OWNER
The root element rendered by `TemplateRenderer` — `<div className="pts-page">`
(now `data-editor-target="page-background"` in edit mode). It already applied
`pageBackground(theme)` to its own `style`.

## PAGE_BACKGROUND_CANONICAL_OWNER
`theme.background` (`ThemeBackground` in `types/index.ts`):
`type` (solid/gradient/image/pattern), `color`, `gradient` ({kind,angle,from,to}),
`imageUrl`, `overlay` (0..1), `blur` (px), `pattern` (dots/grid/noise/rings).
Resolved by `pageBackground(theme)` in `styleEngine`.

## EXISTING_PAGE_BACKGROUND_CAPABILITIES
- **solid color** — `theme.background.color` (renderer + UI surfaced, in Sidebar).
- **gradient** — `theme.background.type === "gradient"` + `theme.background.gradient`
  (renderer-supported; NOT surfaced in Inspector).
- **image** — `theme.background.type === "image"` + `theme.background.imageUrl`
  (renderer-supported; NOT surfaced in Inspector).
- **pattern** — `theme.background.type === "pattern"` + `theme.background.pattern`
  (renderer-supported; NOT surfaced in Inspector).
- **blur** — `theme.background.blur` (renderer-supported; surfaced in Sidebar only).

## CONTEXTUAL_TARGET
Added `"page-background"` to the `ContextualTarget` union in `inspectorFocus.ts`
(ephemeral — not persisted, not canonical, no history entry).

## CANVAS_TO_INSPECTOR
Clicking the exposed page surface → `onSelectPageBackground()` →
`PremiumTemplateStudio` clears block selection (only if non-null, no redundant
churn) and calls `requestInspectorFocus("page-background")`. The Inspector scrolls
its own container to center `[data-inspector-focus="page-background"]` at ~45%.

## INSPECTOR_TO_CANVAS
`data-inspector-focus="page-background"` + `contextualFocusProps("page-background")`
→ on focus/pointer-down inside the "Page Background" group,
`requestCanvasFocus("page-background")` fires. The frozen `PowerCanvasViewport`
generic subscription resolves `[data-editor-target="page-background"]` (the page
root) and reveals it if necessary — no camera changes.

## PAGE_SURFACE_HIT_TEST
The page root is the actual page surface owner. Its `onClick` inspects
`closest("[data-editor-target], [data-block-id]")` and only fires
`onSelectPageBackground` when the resolved identity is the page surface itself
(`closest === currentTarget`). No global `document.querySelector`, no transparent
overlay, no coordinate hit-testing, no new pointer-event layer.

## BLOCK_PRIORITY
Rendered blocks carry `data-block-id` on their `<section>` and `stopPropagation`
on click, so a block click never resolves as `page-background`. Verified by test.

## HERO_PRIORITY
Hero sub-targets (`hero-title`, `hero-cta`, `hero-image`, `hero-background`,
`hero-overlay`) carry `data-editor-target` and `stopPropagation`, so they always
win over `page-background`. Verified by tests.

## PROFILE_PRIORITY
Profile cover/avatar/bio carry `data-editor-target` (and stop propagation),
so they win over `page-background` via the `closest` guard.

## EXISTING_SOLID_COLOR
`theme.background.color` — reused. A new "Page Background" section (wrapped in
`data-inspector-focus="page-background"`) is added to `ProfileInspector` with a
`ColorInput` bound to `theme.background.color`.

## EXISTING_GRADIENT
`theme.background.type === "gradient"` + `theme.background.gradient` — renderer
supported, NOT surfaced in the Inspector (no new field created in 5C5).

## EXISTING_BACKGROUND_IMAGE
`theme.background.type === "image"` + `theme.background.imageUrl` — renderer
supported, NOT surfaced in the Inspector (no new field created in 5C5).

## UNSUPPORTED_DESIRED_CAPABILITIES
- Page gradient control (type/from/to/angle)
- Page background image control (imageUrl)
- Page pattern control (dots/grid/noise/rings)
- Page background blur control (already in Sidebar, not re-surfaced in Inspector)

These remain renderer-supported but are intentionally NOT surfaced as new
Inspector fields in 5C5 (contextual editing only — no page-theme schema expansion).

## CAMERA_CHANGES
None.

## CANONICAL_CHANGES
None.

## PERSISTENCE_CHANGES
None.

## HISTORY_CHANGES
None.

## ENGINE_V2_CHANGES
None.

## TESTS
New `src/premium-template-studio/__tests__/pageBackgroundContextual.test.tsx`
(11 tests): target acceptance, focus signals (both directions), DOM wiring
(edit vs public), exposed-surface click → page-background, and priority protection
(Hero title/CTA/image/background and rendered block never hijacked).

Regression run: `pageBackgroundContextual`, `heroBackgroundContextual`,
`heroImageContextual` — **39 / 39 pass**.

## LINT
`eslint` reports only the pre-existing CRLF (`␍`) line-ending errors (Windows
`git autocrlf`) plus one pre-existing `react-refresh/only-export-components`
warning in `inspectorFocus.ts`. No code-level errors introduced.

## BUILD
Not run (full `vite build`/`tsc --noEmit` out of scope). Vitest (esbuild) compiled
and executed all changed source and test files successfully.

## RUNTIME
39 tests pass across the three contextual suites.

## VISUAL
Pending the manual gate (PAGEBG-01 … PAGEBG-16). Automated tests verify the DOM
identity and click priority; the visual confirmation that Inspector changes
visibly modify the page background still requires user runtime verification.

## STOP_TRIGGERED
`false`

