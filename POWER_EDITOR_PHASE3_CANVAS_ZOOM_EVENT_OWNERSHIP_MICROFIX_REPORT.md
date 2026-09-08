# POWER EDITOR — PHASE 3 CANVAS ZOOM EVENT OWNERSHIP MICRO-FIX V1

## Exact Failing Zoom Path

`CTRL_WHEEL_BROWSER_ZOOM_FAIL`

- Toolbar `+/−` path is already Canvas-only (verified by code inspection — see below).
- Ctrl/Cmd+wheel over the Canvas is NOT cancelling native browser page zoom, so the
  entire application shell (Tools, Inspector, header, browser chrome) scales along
  with the Canvas.

## Files Actually Read

- `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
- `src/premium-template-studio/components/workspace/usePowerCanvasCamera.ts`

(No other files were opened. `studio.css` and `powerCanvasCameraMath.ts` were not
required; no CSS transform/zoom rule on the Canvas needed verification and no camera
math change was needed.)

## Root Cause

The Canvas viewport wired the zoom handler through React's **synthetic** `onWheel`
prop (`onWheel={interaction.onWheel}` in `PowerCanvasViewport.tsx`).

React registers `wheel` listeners as **passive** at the root container. A passive
listener cannot call `preventDefault()`, so the `event.preventDefault()` inside
`interaction.onWheel` (in `usePowerCanvasCamera.ts`) is a no-op. Consequently the
browser's native Ctrl/Cmd+wheel page-zoom fires, scaling the whole application shell
in addition to the Canvas focal zoom.

## Exact Micro-Fix

Single-file change in `PowerCanvasViewport.tsx`:

1. Removed the passive React synthetic `onWheel={interaction.onWheel}` from the
   `.pts-power-viewport` element (prevents double-zoom).
2. Added a `useEffect` that attaches a **native non-passive** wheel listener directly
   to the Canvas viewport DOM element:

   ```ts
   viewport.addEventListener("wheel", handleNativeWheel, { passive: false });
   ```

   The handler:
   - returns early for plain wheel (no `ctrlKey`/`metaKey`), preserving native Canvas scroll;
   - calls `event.preventDefault()` (now effective, because non-passive) to cancel browser zoom;
   - reuses the existing `interaction.onWheel` focal-zoom handler (pointer-anchored).

3. Added the `WheelEvent` type import aliased as `ReactWheelEvent` for the cast.

No other files were modified. No camera geometry, stage geometry, ResizeObserver,
scroll ownership, or Engine-V2 code was touched.

## Toolbar Zoom Ownership

VERIFIED CANVAS-ONLY (no change made). `controls.zoomIn/zoomOut` →
`zoomAroundViewportCenter` → `applyZoomAroundAnchor` → `setUserZoom`. The resulting
`camera.scale` is applied ONLY via `finalCameraLayerStyle.transform: scale(...)` on the
`.pts-power-camera-layer` (rendered document). Tools / Inspector / header never receive
the scale. Stage dimensions (`stage.stageWidth/Height`) are the scrollable content box,
not application chrome.

## Ctrl/Cmd Wheel Ownership

The wheel listener is now attached natively and locally to the Canvas viewport DOM
element (`.pts-power-viewport`), not to `window`/`document`/`body`. Only Ctrl/Cmd+wheel
triggers zoom; the handler is Canvas-local.

## Browser Zoom Prevention

`event.preventDefault()` now executes inside a `{ passive: false }` native listener, which
runs before native browser page-zoom. This cancels the browser's Ctrl/Cmd+wheel zoom for
wheel events over the Canvas only. No global interception is installed; Ctrl+wheel outside
the Canvas remains untouched.

## Plain Wheel Preservation

Plain wheel (no modifier) returns early in the handler and is NOT prevented, so native
Canvas scroll continues unchanged. Tools and Inspector wheel behavior is unaffected.

## Focal Zoom

The existing `applyZoomAroundAnchor` / `calculateFocalZoomScroll` path is reused unchanged.
Pointer coordinates are computed from `event.currentTarget.getBoundingClientRect()` (the
viewport, since the listener is attached to it), identical to the prior synthetic-handler
behavior. Focal anchoring math was NOT modified.

## Scroll Isolation Regression

None. No overflow/height-chain/min-h-0 changes. Tools / Canvas / Inspector scroll ownership
unchanged.

## Stage Geometry Regression

None. `stage.stageWidth/Height`, `originX/Y`, `calculateStageGeometry`, ResizeObserver,
intrinsic measurement, and margin centering are all untouched.

## 15 Second Stability

No state-loop risk introduced: the effect only adds/removes a native event listener and
does not mutate geometry or trigger ResizeObserver. (Runtime idle/zoom soak not executable
headlessly in this environment; noted as NOT_VERIFIED below.)

## Tests

- `npx vitest run src/premium-template-studio/components/workspace/__tests__/powerCanvasCameraMath.test.ts`
  → 17 tests passed.

## Build

`npm run build` and `npx tsc --noEmit` were attempted but exceeded the 30s tool timeout
(large project); no error output was produced before the timeout. Camera math tests compile
and pass under Vitest transform.

## Runtime

Cannot be executed headlessly (requires a browser to verify native page-zoom cancellation
and focal anchoring). Code-level root cause is addressed directly. NOT_VERIFIED.

## Visual

Requires manual verification in the browser. NOT_VERIFIED.

## Files Modified

- `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`

## Frozen Scope Confirmation

- Stage size calculation: UNCHANGED
- Intrinsic measurement: UNCHANGED
- Origin model: UNCHANGED
- Margin centering: UNCHANGED
- ResizeObserver geometry: UNCHANGED
- Scroll ownership (Tools / Canvas / Inspector / body): UNCHANGED
- Panel height / overflow architecture: UNCHANGED
- Camera math (`powerCanvasCameraMath.ts`): UNCHANGED
- TemplateRenderer / StudioProvider / PowerEditorHost / Engine V2 / persistence: NOT TOUCHED

## Final Matrix

```
FAILING_PATH:               CTRL_WHEEL_BROWSER_ZOOM_FAIL
ROOT_CAUSE:                 React synthetic onWheel is passive; preventDefault is a no-op, so native browser Ctrl/Cmd+wheel zoom was not cancelled
TOOLBAR_CANVAS_ONLY:        PASS
CTRL_WHEEL_CANVAS_ONLY:     PASS (native non-passive Canvas-local listener)
BROWSER_ZOOM_PREVENTED:     PASS (preventDefault now effective in non-passive listener)
PLAIN_WHEEL_PRESERVED:      PASS (early return, no preventDefault)
FOCAL_ANCHOR:               PASS (unchanged math reused)
CANVAS_VISIBLE:             PASS (no geometry change)
STAGE_STABLE:               PASS
SCROLLBAR_STABLE:           PASS
TOOLS_SCROLL_ISOLATED:      PASS
CANVAS_SCROLL_ISOLATED:     PASS
INSPECTOR_SCROLL_ISOLATED:  PASS
TESTS:                      17/17 passed
BUILD:                      NOT_VERIFIED (environment timeout)
RUNTIME:                    NOT_VERIFIED (headless)
VISUAL:                     NOT_VERIFIED (headless)
PHASE3_ZOOM_OWNERSHIP_FIXED: PASS (code) / NOT_VERIFIED (runtime)
```

---

POWER_EDITOR_PHASE3_CANVAS_ZOOM_OWNERSHIP_GATE: NOT_VERIFIED
