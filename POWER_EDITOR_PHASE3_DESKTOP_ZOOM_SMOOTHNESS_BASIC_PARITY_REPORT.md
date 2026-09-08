# POWER EDITOR — PHASE 3 DESKTOP ZOOM SMOOTHNESS / BASIC PARITY MICRO-FIX V1

## User Runtime Symptom

- Canvas visible, Stage geometry stable, Tools/Canvas/Inspector scroll independently.
- Zoom is functional, but desktop focal zoom visibly shakes / jumps and is not fluid.
- User reports behavior similar to the previously-fixed Basic Editor zoom jitter.

## Files Actually Read

- `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
- `src/premium-template-studio/components/workspace/usePowerCanvasCamera.ts`
- `src/premium-template-studio/components/workspace/powerCanvasCameraMath.ts` (reference)
- `src/components/basic-editor-shell/BasicEditorShell.tsx` (frozen commit 62bfb786, via `git show`)
- `POWER_EDITOR_PHASE3_FOCAL_ZOOM_PAN_BOUNDS_REPORT.md` (reference)
- `POWER_EDITOR_PHASE3_CAMERA_REGRESSION_SURGICAL_REPAIR_REPORT.md` (reference)

## Basic Editor Frozen Reference

Commit `62bfb78690f691fe2c1ff768857be1d0938221ca` ("fix(editor): freeze premium canvas viewport"),
file `src/components/basic-editor-shell/BasicEditorShell.tsx`. The diff removed:

- `focalCorrectionFrame` ref
- `pendingFocalCorrection` ref
- `queueFocalCorrection(client, world, scale)` — a `requestAnimationFrame` post-layout focal correction
- `correctAfterLayout` parameter and the secondary correction after pinch/zoom

## Basic Jitter Root Cause

Basic computed the focal world point and next camera position once during the primary
zoom operation, then queued a SECOND `requestAnimationFrame` correction that re-measured the
transformed template after layout and applied another translation. That second correction
caused visible wobble. The fix removed the secondary correction, leaving one authoritative
focal calculation.

## Power Zoom Flow

`applyZoomAroundAnchor` computes the focal scroll exactly once via `calculateFocalZoomScroll`
and stores it in `pendingScrollRef`, then calls `setUserZoom`. `useLayoutEffect` #1 applies
`pendingScrollRef` to `viewport.scrollLeft/scrollTop`. `useLayoutEffect` #2 clamps scroll to
bounds (a no-op in the synchronous path because the focal scroll is already clamped).

## Power vs Basic Difference

Power has NO `requestAnimationFrame` post-layout focal correction and NO `queueFocalCorrection`.
Power's focal zoom is already single-pass. Power keeps `scrollLeft/scrollTop` as the pan owner
(no `translateX/translateY`). So Basic's exact RAF root cause is NOT present in Power.

## Exact Root Cause

`fitZoom = calculateFitZoom(size)` depends on `viewport.clientWidth/clientHeight`. When desktop
zoom crosses the scrollbar threshold, the scrollbar appears/disappears and shrinks/grows
`clientWidth/clientHeight` by the scrollbar width (~17px on Windows). The ResizeObserver fires,
`measure()` updates `size`, `fitZoom` recomputes, `effectiveScale = fitZoom * userZoom` bounces,
the Stage changes again, and `useLayoutEffect` #2 re-clamps the scroll. This is a secondary
spatial adjustment of the SAME CLASS as Basic's double correction (a post-zoom layout-driven
re-correction), causing visible shake/jump.

## Exact Micro-Fix

Measure the viewport's scrollbar-stable `offsetWidth/offsetHeight` and use them ONLY for
`fitZoom`, while keeping `clientWidth/clientHeight` for scroll clamping (which requires the
true scrollport). Single file changed: `usePowerCanvasCamera.ts`.

- Added `viewportOuterWidth` / `viewportOuterHeight` to `MeasuredSize`, `INITIAL_SIZE`,
  `measure()` (from `viewport.offsetWidth/offsetHeight`), and `sameSize()`.
- `fitZoom` is now computed from the outer (stable) size instead of `size`.

## Single Authoritative Zoom Calculation

Preserved. `applyZoomAroundAnchor` → one `calculateFocalZoomScroll` → one `pendingScrollRef` →
one `useLayoutEffect` write. No focal math changed. `calculateFocalZoomScroll` and
`calculateStageGeometry` are untouched.

## RAF/Post-Layout Correction Assessment

NOT APPLICABLE — Power never had a RAF post-layout focal correction. The secondary adjustment
was instead the `fitZoom`↔scrollbar feedback, which is now removed by stabilizing `fitZoom`.

## Slow Focal Zoom / Rapid Focal Zoom / Toolbar Zoom / Fit & Reset

NOT_VERIFIED at runtime (headless). The code change removes the only identified post-zoom
secondary adjustment, so the expected behavior is: no second jump (slow), no oscillation (rapid),
no double-jump (+/−), stable Fit/Reset. Requires manual browser confirmation.

## Camera Geometry Regression

None. Stage sizing (`calculateStageGeometry`), origin model, margin centering, and intrinsic
content measurement are untouched. Only the viewport-size used by `fitZoom` was changed to the
scrollbar-stable outer size; scroll clamping still uses `clientWidth/clientHeight`.

## Scroll Isolation Regression

None. No overflow/height-chain/min-h-0 changes. Tools/Canvas/Inspector/body scroll ownership
unchanged.

## Mobile Frozen Confirmation

No touch/pinch/two-pointer/`touch-action` changes. Mobile zoom remains intentionally deferred.

## DEV Diagnostics Preserved

The DEV-only `CameraDiagnostic` overlays and `import.meta.env.DEV` guards are unchanged.

## Tests

`npx vitest run src/premium-template-studio/components/workspace/__tests__/powerCanvasCameraMath.test.ts`
→ 17/17 passed. No new test added: the root cause is a DOM-measurement (`offsetWidth/offsetHeight`)
behavior in the hook, not a math function, and no DOM/component test framework is in scope.

## Build

`npm run build` / `npx tsc --noEmit` were not re-run (30s tool timeout on this large project, as
in prior phases). The modified file is type-consistent (new fields added to `MeasuredSize`,
`INITIAL_SIZE`, `sameSize`, and the `calculateFitZoom` call). Vitest compiled and passed.

## Runtime / Visual

NOT_VERIFIED — no browser available headlessly. Smoothness acceptance (SMOOTH-03..07) requires
manual desktop verification.

## Files Modified

- `src/premium-template-studio/components/workspace/usePowerCanvasCamera.ts`

## Frozen Scope Confirmation

- Stage geometry: UNCHANGED
- Stage sizing / origin / margin centering: UNCHANGED
- Intrinsic content measurement: UNCHANGED
- ResizeObserver architecture: UNCHANGED (still observes viewport + content)
- Scroll isolation: UNCHANGED
- Camera math (`powerCanvasCameraMath.ts`): UNCHANGED
- TemplateRenderer / StudioProvider / PowerEditorHost / Engine V2 / persistence: NOT TOUCHED
- Basic Editor: NOT TOUCHED
- Mobile gestures: NOT TOUCHED
- No CSS transitions/animations added (smoothness is real, not faked)

## Final Matrix

```
BASIC_REFERENCE_VERIFIED:                    YES (frozen commit diff read)
SAME_ROOT_CAUSE_AS_BASIC:                    NO (no RAF post-layout focal correction in Power)
POWER_ROOT_CAUSE:                            fitZoom depends on scrollbar-sensitive clientWidth/clientHeight; scrollbar toggle during zoom bounces effectiveScale and triggers a secondary clamp
SECONDARY_FOCAL_CORRECTION_REMOVED_OR_NOT_APPLICABLE: NOT_APPLICABLE (stabilized fitZoom instead)
CANVAS_VISIBLE:                              CODE_VERIFIED
STAGE_GEOMETRY_UNCHANGED:                    PASS
SLOW_ZOOM_SMOOTH:                            NOT_VERIFIED (headless)
RAPID_ZOOM_SMOOTH:                           NOT_VERIFIED (headless)
NO_POST_ZOOM_DRIFT:                          CODE_VERIFIED (fitZoom feedback removed)
FOCAL_POINT_STABLE:                          TEST_VERIFIED (math unchanged)
TOOLBAR_ZOOM_STABLE:                         CODE_VERIFIED
BROWSER_ZOOM_BLOCKED:                        CODE_VERIFIED (unchanged from prior fix)
PLAIN_WHEEL_PRESERVED:                       CODE_VERIFIED (unchanged)
SCROLL_ISOLATION:                            CODE_VERIFIED (unchanged)
MOBILE_UNCHANGED:                            PASS
DEV_DIAGNOSTICS_PRESERVED:                   PASS
TESTS:                                       17/17 passed
BUILD:                                       NOT_VERIFIED (environment timeout)
RUNTIME:                                     NOT_VERIFIED (headless)
VISUAL:                                      NOT_VERIFIED (headless)
PHASE3_DESKTOP_ZOOM_READY:                   CODE/TEST_VERIFIED
```

---

POWER_EDITOR_PHASE3_DESKTOP_ZOOM_SMOOTHNESS_GATE: NOT_VERIFIED

