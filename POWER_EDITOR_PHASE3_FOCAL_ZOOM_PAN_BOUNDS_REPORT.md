# CRIPQER - POWER EDITOR PHASE 3 FOCAL ZOOM + PAN + BOUNDS V1

## Phase 2 Baseline Verification

Phase 3 was implemented on top of the Phase 2 finite Stage camera. The normal
camera path still mounts `Viewport -> Stage -> Camera layer -> TemplateRenderer`.

Authenticated local runtime on `http://localhost:5173/power-editor?profileId=ff0cd302-07a4-4106-9a13-a14f9ded2f4b`:

```text
renderer (.pts-page): visible
first .pts-block: visible
effectiveScale: 0.35
translateX: 0
translateY: 0
body scrollY: 0
```

## Pan Ownership Model

Pan ownership remains `viewport.scrollLeft` / `viewport.scrollTop`.

No independent `translateX` / `translateY` pan system was added. Camera state
continues to report neutral translation.

## Coordinate System

The implementation separates:

- viewport space: visible Canvas viewport pixels;
- stage space: finite scaled Stage footprint;
- world space: unscaled canonical document coordinates.

The Stage is calculated from intrinsic document dimensions and effective scale:

```text
stageSize = intrinsicDocumentSize * effectiveScale + finite overscan/centering
```

Transformed bounding rectangles, `viewport.scrollWidth`, and Stage output are
not used as intrinsic source dimensions.

## Focal Zoom Math

`calculateFocalZoomScroll` preserves the world point under an anchor by using
the old Stage origin, new Stage origin, old scale, new scale, and current
viewport scroll.

The math clamps the resulting scroll to finite Stage bounds. If bounds prevent
exact preservation, bounds win.

Automated tests cover identity zoom, center zoom in/out, top-left and
bottom-right anchors, bounds, and invalid dimensions.

## Wheel Event Ownership

`onWheel` is attached only to `.pts-power-viewport`.

Plain wheel returns immediately and preserves native scroll. Ctrl/Cmd wheel
calls focal zoom and prevents default only for the Canvas event.

Runtime note: native Canvas wheel and Tools wheel isolation were verified.
Ctrl/Cmd-wheel could not be fully runtime-exercised because the browser-control
surface could not synthesize modifier wheel events or expose key-hold + wheel.

## Toolbar Zoom

Toolbar `+` and `-` zoom around the visible viewport center. Runtime evidence:

```text
before: userZoom 1.00, effectiveScale 0.35
after +: userZoom 1.10, effectiveScale 0.385, renderer visible
after -: userZoom 1.00, effectiveScale 0.35, renderer visible
```

## Space + Drag Pan

Space enters pan-ready mode unless the event target is an input, textarea,
select, button, or contenteditable element. Pointer down inside the Canvas while
pan-ready captures the pointer and pointer movement imperatively updates
viewport scroll.

Runtime note: the browser-control surface did not provide a reliable key-hold
plus drag action. A simultaneous `pressKey("space")` + drag attempt did not keep
Space active long enough to enter pan mode, so Space-drag is implemented and
math-tested but not claimed as runtime pass.

## Pointer Capture Lifecycle

Pointer capture is requested on pan pointerdown and released on pointerup,
pointercancel, Space keyup, window blur, and unmount cleanup through listener
teardown.

Dragged pan sessions set a click suppression flag after the movement threshold
is crossed, preventing the synthetic click from selecting or activating blocks.

## Camera Bounds

`calculateMaxScroll`, `clampScrollPosition`, and `calculatePanScroll` keep scroll
coordinates finite:

```text
scrollLeft >= 0
scrollTop >= 0
scrollLeft <= stageWidth - viewportWidth
scrollTop <= stageHeight - viewportHeight
```

No infinite workspace or arbitrary giant canvas was added.

## Fit / Reset

Fit and Reset preserve Phase 2 neutral zoom semantics by setting `userZoom` to
`1`. They also queue a finite centered scroll position for the next Stage layout
so the page remains recoverable.

Runtime evidence:

```text
Fit: userZoom 1.00, effectiveScale 0.35, renderer visible
Reset: userZoom 1.00, effectiveScale 0.35, renderer visible
```

## Panel Resize

Authenticated desktop runtime evidence:

| State               | Canvas viewport width | Stage width | Renderer |
| ------------------- | --------------------: | ----------: | -------- |
| Both panels open    |                  1267 |        1267 | visible  |
| Tools collapsed     |                  1543 |        1543 | visible  |
| Tools restored      |                  1267 |        1267 | visible  |
| Inspector collapsed |                  1543 |        1543 | visible  |
| Inspector restored  |                  1267 |        1267 | visible  |

Effective scale remained `0.35`, body scroll stayed `0`, and no blank Canvas
returned.

## Phase 1 Scroll Regression

Runtime evidence:

```text
Tools wheel: tools scrollTop 0 -> 1600.8079, canvas unchanged, bodyY 0
Canvas wheel: canvas scrollTop 1293.7373 -> 0, tools unchanged, bodyY 0
```

The Inspector did not have overflow in the measured viewport, so Inspector
scroll movement was not applicable in this runtime.

## Document Boundary

Camera interactions do not dispatch document actions and do not call persistence
or autosave paths. The changes are isolated to camera hook state and imperative
viewport scroll.

No changes were made to canonical document data, persistence, reducer, or
TemplateRenderer.

## Performance

Pointer pan updates use imperative viewport scroll writes during pointermove.
React state is limited to `userZoom`, `isPanReady`, and `isPanning`.

No document cloning, autosave dispatch, or canonical config writes were added to
camera interactions.

## Automated Tests

Command:

```text
npx vitest run src/premium-template-studio/components/workspace/__tests__/powerCanvasCameraMath.test.ts
```

Result:

```text
PASS - 1 file, 16 tests
```

Targeted ESLint and Prettier also passed for the Phase 3 files.

Targeted TypeScript filter:

```text
npx tsc --noEmit --pretty false 2>&1 | Select-String -Pattern 'premium-template-studio\\components\\workspace|powerCanvasCamera'
```

Result: no camera-file errors. The full repository `tsc` process still exits
nonzero on existing unrelated errors outside the Phase 3 write scope.

## Build

Command:

```text
npm run build
```

Result: PASS for client, SSR, and Nitro/Vercel output. The existing large chunk
warning remained non-blocking.

## Desktop Runtime

Authenticated local runtime with browser viewport override requested at
`1440 x 900`. The connected Chrome surface reported DPR `0.75` and browser
viewport `1921 x 1201`.

Desktop breakpoint selected explicitly:

```text
viewport client: 1267 x 1066
viewport scroll: 1331 x 2360
content intrinsic: 1180 x 6287
effectiveScale: 0.35
Stage: 1267 x 2296
origin: 427 x 48
renderer visible: YES
first block visible: YES
body scrollY: 0
```

Toolbar zoom, Fit, panel resize, native scroll isolation, and 10-second
ResizeObserver idle stability passed.

Ctrl/Cmd wheel and Space-drag runtime proof: NOT_VERIFIED due browser-control
input limitations.

## Tablet Runtime

Tablet breakpoint selected explicitly with viewport override requested at
`768 x 900`. The connected Chrome surface reported DPR `0.75` and browser
viewport `1025 x 1201`.

```text
viewport client: 371 x 1066
viewport scroll: 452 x 2344
effectiveScale: 0.35
Stage: 388 x 2280
origin: 48 x 48
renderer visible: YES
first block visible: YES
after +: userZoom 1.10, effectiveScale 0.385, renderer visible
after Reset: userZoom 1.00, effectiveScale 0.35, renderer visible
body scrollY: 0
```

Ctrl/Cmd wheel and Space-drag runtime proof: NOT_VERIFIED due browser-control
input limitations.

## Mobile Status

No touch/pinch support was added or claimed.

Minimum authenticated mount checks:

```text
430 px requested: renderer visible YES, first block visible YES, mobile breakpoint YES
390 px requested: renderer visible YES, first block visible YES, mobile breakpoint YES
```

The connected Chrome DPR produced reported browser widths of `574` and `520`
CSS px for those requested overrides.

## Visual Evidence

`getAXStateAndScreenshot` captured a visual screenshot showing the Power Editor
shell, Tools, Canvas, Inspector, visible canonical page, and zoom controls.

Direct CDP screenshot capture timed out, so only the fallback accessibility
screenshot is claimed.

## Files Modified

- `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
- `src/premium-template-studio/components/workspace/usePowerCanvasCamera.ts`
- `src/premium-template-studio/components/workspace/powerCanvasCameraMath.ts`
- `src/premium-template-studio/components/workspace/__tests__/powerCanvasCameraMath.test.ts`
- `src/premium-template-studio/styles/studio.css`
- `POWER_EDITOR_PHASE3_FOCAL_ZOOM_PAN_BOUNDS_REPORT.md`

## Frozen Scope Evidence

No changes were made to `TemplateRenderer`, `StudioProvider`,
`templateReducer`, `PowerEditorHost`, BioTemplateConfig, Engine V2, canonical
persistence, onboarding, Basic Editor, routes, billing, entitlements, analytics,
database files, dependencies, or lockfiles.

No commit or push was performed.

## Final Matrix

```text
PHASE2_BASELINE: PASS
PAN_OWNER: PASS
FOCAL_ZOOM: TEST_PASS_RUNTIME_NOT_VERIFIED
TOOLBAR_ZOOM: PASS
PLAIN_WHEEL_SCROLL: PASS
SPACE_DRAG_PAN: TEST_PASS_RUNTIME_NOT_VERIFIED
POINTER_CAPTURE: CODE_PASS_RUNTIME_NOT_VERIFIED
BOUNDS: PASS
FIT: PASS
RESET: PASS
PANEL_RESIZE: PASS
SCROLL_ISOLATION: PARTIAL_PASS_INSPECTOR_NO_OVERFLOW
DOCUMENT_BOUNDARY: CODE_PASS
DESKTOP: PARTIAL_PASS
TABLET: PARTIAL_PASS
MOBILE_430: PASS_MOUNT_ONLY
MOBILE_390: PASS_MOUNT_ONLY
TESTS: PASS
BUILD: PASS
RUNTIME: NOT_VERIFIED
VISUAL: PARTIAL_PASS
PHASE3_READY: NOT_VERIFIED
```

POWER_EDITOR_PHASE3_FOCAL_ZOOM_PAN_BOUNDS_GATE: NOT_VERIFIED
