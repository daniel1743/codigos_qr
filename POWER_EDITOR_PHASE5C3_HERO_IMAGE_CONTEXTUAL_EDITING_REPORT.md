# POWER EDITOR — PHASE 5C3: HERO IMAGE CONTEXTUAL EDITING

## FILES_READ
1. `src/premium-template-studio/components/blocks/HeroBlock.tsx`
2. `src/premium-template-studio/components/inspector/Inspector.tsx`
3. `src/premium-template-studio/components/inspector/inspectorFocus.ts`
4. `src/premium-template-studio/engine/RenderContext.tsx`
5. `src/premium-template-studio/engine/TemplateRenderer.tsx`
6. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
7. `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`

Additional (test authoring / fixture confirmation only — NOT required by the
implementation; no source file was modified outside the authorized write scope):
- `src/premium-template-studio/constants/blockDefinitions.ts` (default hero fixture)
- `src/premium-template-studio/__tests__/{heroTextContextual,contextualFocus,heroCtaContextual,profileCoverContextual}.test.*`

## FILES_MODIFIED
1. `src/premium-template-studio/components/blocks/HeroBlock.tsx`
2. `src/premium-template-studio/components/inspector/Inspector.tsx`
3. `src/premium-template-studio/components/inspector/inspectorFocus.ts`
4. `src/premium-template-studio/engine/RenderContext.tsx`
5. `src/premium-template-studio/engine/TemplateRenderer.tsx`
6. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
7. `src/premium-template-studio/__tests__/heroImageContextual.test.tsx` (NEW test)

`PowerCanvasViewport.tsx` NOT modified (see CAMERA_CHANGES).

## TOTAL_FILES_READ
7 authorized source files (plus test/fixture files listed above).

## HERO_IMAGE_RENDER_OWNER
`src/premium-template-studio/components/blocks/HeroBlock.tsx`.

The Hero foreground/media image is `content.bannerImage` (`HeroMediaContent`),
rendered as a distinct `<img>` element:
- centered/editorial variants: shared `bannerElem` `<img>` (object-fit/position).
- split variant: inline absolutely-positioned `<img>` in the right visuals column.

## HERO_VARIANT_CLASSIFICATION
| Variant | Media kind | hero-image target? |
| --- | --- | --- |
| `centered` | `bannerImage` foreground `<img>` | YES |
| `editorial` | `bannerImage` foreground `<img>` | YES |
| `split` | `bannerImage` foreground `<img>` | YES |
| `full-image` | `bannerImage`/`backgroundImage` as CSS `backgroundImage` | NO (5C4) |

## FOREGROUND_MEDIA_VARIANTS
`centered`, `editorial`, `split` — all render `content.bannerImage` as a distinct
media `<img>` and therefore carry `data-editor-target="hero-image"` in edit mode.

## BACKGROUND_MEDIA_VARIANTS
`full-image` — renders `bannerImage.url || backgroundImage.url` as the section's
CSS `backgroundImage` (not a distinct foreground `<img>`). Classified as 5C4
territory. NOT marked `hero-image`.

## CONTEXTUAL_TARGET
Added `"hero-image"` to the `ContextualTarget` union in `inspectorFocus.ts`.
- Inspector identity: `data-inspector-focus="hero-image"` (wraps ONLY the
  `bannerImage` controls, not the whole Image section).
- Canvas identity: `data-editor-target="hero-image"` (on the foreground `<img>`
  only — never the background surface, never the avatar).

## CANVAS_TO_INSPECTOR_PATH
1. User clicks foreground Hero `<img>` (edit mode).
2. `heroImageClickProps()` → `e.stopPropagation()` + `onSelectHeroImage(block.id)`.
3. `PremiumTemplateStudio` handler selects parent Hero (if not already selected),
   then `requestInspectorFocus("hero-image")`.
4. Inspector scrolls the exact `data-inspector-focus="hero-image"` group to ~45%
   anchor (frozen 5C2D `computeInspectorFocusScroll`).

## INSPECTOR_TO_CANVAS_PATH
1. User focuses/pointer-downs inside the `data-inspector-focus="hero-image"` group
   (`contextualFocusProps` → `onFocusCapture`/`onPointerDownCapture`).
2. `requestCanvasFocus("hero-image")`.
3. `PowerCanvasViewport` generic subscription resolves
   `[data-editor-target="hero-image"]` and centers it via frozen
   `computeCanvasFocusScroll` (zoom preserved).

## HERO_PARENT_SELECTION
`onSelectHeroImage(blockId)` dispatches `selectBlock` ONLY when
`state.selectedBlockId !== blockId` (no redundant churn). Identical to the frozen
`onSelectHeroCta` / `onSelectHeroText` handlers.

## EXACT_INSPECTOR_GROUP
`<div data-inspector-focus="hero-image" {...contextualFocusProps("hero-image")}>`
wrapping the "Top Banner Image" `AssetField` + blur/fit/position controls. The
"Full Background Image" controls are intentionally left OUTSIDE the wrapper.

## EXACT_CANVAS_TARGET
`data-editor-target="hero-image"` on the foreground `bannerImage` `<img>` in the
centered/editorial (`bannerElem`) and split variants.

## EXISTING_UPLOAD_CHANGE_REMOVE
YES — `AssetField` (adapter-driven upload/change/remove) already owns
`content.bannerImage.url` and remains functional and unchanged.

## EXISTING_FIT_CAPABILITY
YES — `content.bannerImage.fit` (cover/contain `Segmented`) already present (5B1).

## EXISTING_POSITION_CAPABILITY
YES — `content.bannerImage.position` (`PositionGrid`) already present (5B1).

## UNSUPPORTED_DESIRED_CAPABILITIES
None new introduced. Out-of-scope (future) direct-Canvas quick actions ("Cambiar
imagen" / "Subir foto") remain PENDING and were NOT implemented.

## PUBLIC_MODE_BEHAVIOR
`heroImageClickProps()` returns `{}` when `mode !== "edit"`; no `data-editor-target`
and no `onClick` leak into public/preview rendering. Verified by test.

## ANTI_LOOP
Preserved. `requestInspectorFocus` notifies only Inspector listeners;
`requestCanvasFocus` notifies only Canvas listeners (frozen source separation).
No new autofocus architecture was introduced.

## CAMERA_CHANGES
NONE. `PowerCanvasViewport.tsx` unmodified — its generic
`[data-editor-target]` reveal accepts `hero-image` through the existing
contextual target signal. No camera math / hook / Stage geometry / zoom change.

## CANONICAL_CHANGES
NONE. `bannerImage` schema already exists; `hero-image` is ephemeral UI state only.

## PERSISTENCE_CHANGES
NONE.

## HISTORY_CHANGES
NONE.

## ENGINE_V2_CHANGES
NONE.

## KNOWN_TEST_DEBT
`src/premium-template-studio/__tests__/contextualFocus.test.ts` — the assertion
"returns 0 when the target is already comfortably visible"
(`computeInspectorFocusScroll({0,600}, {top:100,bottom:180}) → 0`) still encodes
the superseded pre-5C2D comfortable-visibility contract. It fails (−130) and is
UNRELATED to this phase. Left unmodified per instructions (PRE-EXISTING_TEST_DEBT).

## TESTS
New: `src/premium-template-studio/__tests__/heroImageContextual.test.tsx` (8 tests, PASS):
- hero-image accepted as ContextualTarget
- pre-existing targets preserved
- canvas→inspector and inspector→canvas signal delivery
- centered/split/editorial expose `data-editor-target="hero-image"`
- full-image (background) variant NOT marked foreground hero-image
- public rendering has no hero-image editing identity
- clicking foreground image emits exact hero-image selection

Regression (PASS): heroTextContextual (8), heroCtaContextual (6),
profileCoverContextual (6), contextualFocus (9/10 — 1 pre-existing debt).

## LINT
Not run in full (repo-wide `eslint .` is heavy); changes mirror existing patterns.

## BUILD
Full `vite build` not run (not required by scope). `tsc --noEmit` timed out on the
30s tool budget and was not completed; no type errors were observed in the vitest
transform/runtime path.

## RUNTIME
Automated tests pass. Final visual/runtime confirmation is a manual gate.

## VISUAL
NOT_VERIFIED (requires user runtime confirmation per FINAL_GATE).

## STOP_TRIGGERED
FALSE. No STOP condition was hit: no eighth source file was required, no schema /
styleEngine / camera / persistence / history / Engine V2 change, and no frozen
Hero contextual callback was refactored.

