# CRIPQER — POWER EDITOR PHASE 2 CAMERA DOM VISIBILITY + GEOMETRY FORENSIC FIX V2

## New User Runtime Evidence

The latest user evidence reports that the prior repair still produced a blank canonical Canvas in desktop and narrow views, while desktop scroll geometry remained abnormally large. The generic mobile fallback was gone, but the canonical page was invisible.

## Why Previous Repair Failed

The previous repair removed transformed `getBoundingClientRect()` input, but the Canvas remained a flex child without `min-width: 0`. Its Stage could therefore participate in the flex minimum-size calculation and expand the workspace around the fixed breakpoint frame. The viewport also relied on implicit overflow behavior. The earlier mobile override had been removed without adding an explicit containment boundary for this flex layout.

This is a source-level ownership finding. The browser adapter available in this run became debugger-unattached before it could expose live DOM evaluation, so exact pre-fix DOM numbers remain `NOT_VERIFIED`.

## Live DOM Ownership Map

The authorized render chain is:

```text
.pts-power-viewport-shell (Canvas flex item)
  .pts-power-viewport (scroll owner)
    .pts-power-camera-stage (position: relative; explicit Stage size)
      .pts-power-camera-layer (position: absolute; transform-only layer)
        .pts-page (unchanged TemplateRenderer root)
          .pts-block (first rendered block)
```

The diagnostic readout added to `PowerCanvasViewport` is DEV-only and reports tag/class, parent, client/offset/scroll dimensions, offset position, bounding rect, and computed styles for viewport, Stage, camera layer, renderer root, and first block. It also records five consecutive requestAnimationFrame samples and camera state without exposing canonical payload data.

## Renderer Presence Evidence

Static ownership evidence confirms `PremiumTemplateStudio.Canvas` mounts `TemplateRenderer` unconditionally through `PowerCanvasViewport`, passing the same `state.config` for all breakpoints. No conditional `return null`, alternate mobile renderer, or fallback config exists in the inspected path.

Runtime numeric renderer-presence evidence: `NOT_VERIFIED` because the browser debugger detached before the DEV readout could be captured.

## Computed Style Evidence

The DEV readout captures the required computed style fields: display, visibility, opacity, position/inset, dimensions, min/max dimensions, overflow, transform/origin, translate, scale, z-index, and contain. Live captured values: `NOT_VERIFIED`.

## Bounding Rect Evidence

The DEV diagnostic may use `getBoundingClientRect()` for diagnosis only; it is not used by camera measurement. It records rects for viewport, Stage, camera layer, renderer, and first block. Live captured values: `NOT_VERIFIED`.

## Actual Huge Scroll Owner

The exact DOM owner could not be numerically confirmed after the browser debugger detached. The code-level source of workspace expansion is the `.pts-power-viewport-shell` flex item lacking `min-width: 0`, combined with a Stage whose dimensions are intentionally based on the selected frame. The repair adds `min-w-0` to both the Canvas flex item and viewport and changes the viewport to explicit `overflow-auto`, preventing Stage width from expanding the surrounding flex row.

## Actual Renderer Invisibility Root Cause

A live bounding rect proving the renderer's invisible position was not obtainable. The inspected layout chain showed no renderer suppression. The repair preserves the renderer subtree and adds explicit flex/overflow containment so a finite Stage remains reachable inside the visible workspace rather than determining the workspace's minimum width.

## Desktop Root Cause

Two camera integration defects are now addressed:

1. Intrinsic measurement no longer uses transformed visual rects:

   ```ts
   contentWidth: Math.max(content.scrollWidth, content.offsetWidth),
   contentHeight: Math.max(content.scrollHeight, content.offsetHeight),
   ```

2. The Canvas flex boundary now explicitly allows shrinkage:

   ```tsx
   <div className="pts-power-viewport-shell relative min-h-0 min-w-0 flex-1">
   ```

   and the sole scroll owner is explicit:

   ```tsx
   className="pts-power-viewport h-full min-h-0 min-w-0 overflow-auto ..."
   ```

Stage remains finite and uses the existing bounded overscan formula; no giant safety bound or double scaling was introduced.

## Responsive Root Cause

`PremiumTemplateStudio.Canvas` passes the same `state.config` to the same `TemplateRenderer` for desktop, tablet, and mobile. The previous mobile CSS override was removed in the prior repair, and this V2 keeps it removed. The new flex/overflow containment applies at every width, so responsive preview remains one canonical document with breakpoint-specific presentation only.

## Exact Repair

- Kept transformed `getBoundingClientRect()` out of intrinsic camera measurement.
- Added `min-w-0` to the Canvas flex item and viewport.
- Changed the viewport scroll owner from implicit vertical overflow to explicit `overflow-auto`.
- Added a DEV-only five-cycle diagnostic readout for DOM ownership, dimensions, rects, computed styles, and camera values.
- Did not modify `TemplateRenderer`, Engine V2, config schema, persistence, routes, Basic Editor, or document state.

## Before Numeric Geometry

```text
viewport client/scroll: NOT_VERIFIED
intrinsic content: NOT_VERIFIED
fitZoom/userZoom/scale: NOT_VERIFIED
stage/origin: NOT_VERIFIED
camera transform: NOT_VERIFIED
renderer rect: NOT_VERIFIED
```

## After Numeric Geometry

```text
viewport client/scroll: NOT_VERIFIED
intrinsic content: NOT_VERIFIED
fitZoom/userZoom/scale: NOT_VERIFIED
stage/origin: NOT_VERIFIED
camera transform: NOT_VERIFIED
renderer rect: NOT_VERIFIED
```

The diagnostic surface is available in local DEV for the user to capture these exact values; it is not rendered in production builds.

## Desktop Runtime Test

Exact 1440 desktop DOM/visual test: `NOT_VERIFIED` — the available browser debugger detached before controlled viewport and DOM inspection could be completed.

## Tablet Runtime Test

Exact 768 tablet DOM/visual test: `NOT_VERIFIED`.

## Mobile Runtime Test

Exact 430/390 mobile DOM/visual test: `NOT_VERIFIED`. The previous narrow visual run showed the Power Editor shell and canonical profile content, but it did not provide this task's required numeric DOM evidence.

## Zoom Runtime Test

`NOT_VERIFIED` in this run. Camera controls remain local state only; no document action is dispatched by zoom, Fit, or Reset.

## Panel Resize Runtime Test

`NOT_VERIFIED` in this run. `ResizeObserver` still observes the viewport and camera content, and `userZoom` remains independent from `fitZoom`.

## Document Boundary

`CODE_VERIFIED`: camera state is local to `usePowerCanvasCamera`; no reducer, config, history, autosave, or persistence path was modified.

## Automated Tests

- `npx vitest run src/premium-template-studio/components/workspace/__tests__/powerCanvasCameraMath.test.ts` — PASS, 1 file, 5 tests.
- Targeted ESLint on `PowerCanvasViewport.tsx` — PASS.
- Targeted Prettier check on camera files and stylesheet — PASS.

## Build

`npm run build` — PASS. Vite client, SSR, and Nitro/Vercel output completed successfully. Existing chunk-size warnings are non-blocking.

## Visual Evidence

Required 1440/768/430/390 screenshots: `NOT_VERIFIED`. No visual pass is claimed without those captures. The DEV diagnostic overlay is not a substitute for the required screenshots.

## Files Modified

- `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
- `src/premium-template-studio/components/workspace/usePowerCanvasCamera.ts`
- `src/premium-template-studio/styles/studio.css`
- `POWER_EDITOR_PHASE2_CAMERA_DOM_VISIBILITY_GEOMETRY_FIX_V2_REPORT.md`

## Frozen Scope

No changes to TemplateRenderer, PremiumTemplateStudio, PowerEditorHost, StudioProvider, templateReducer, routes, Onboarding, Basic Editor, Engine V2, BioTemplateConfig, canonical persistence, Billing, Entitlements, Analytics, Commerce, QR identity, DB, migrations, dependencies, or lockfiles.

## Phase 3 Readiness

Phase 3 remains blocked. No pan, wheel zoom, pinch, gesture, autofocus, or selection registry was added.

## Final Matrix

```text
ROOT_CAUSE: NOT_VERIFIED (code-level ownership cause identified; live DOM owner not captured)
RENDERER_MOUNTED: NOT_VERIFIED
DOM_GEOMETRY: NOT_VERIFIED
DESKTOP_VISIBLE: NOT_VERIFIED
TABLET_VISIBLE: NOT_VERIFIED
MOBILE_VISIBLE: NOT_VERIFIED
STAGE_FINITE: CODE_VERIFIED / RUNTIME NOT_VERIFIED
SCROLL_GEOMETRY_FINITE: NOT_VERIFIED
ZOOM: NOT_VERIFIED
PANEL_RESIZE: NOT_VERIFIED
DOCUMENT_BOUNDARY: PASS
CODE: PASS
LOGIC: PASS
TESTS: PASS
BUILD: PASS
RUNTIME: NOT_VERIFIED
VISUAL: NOT_VERIFIED
FROZEN_SCOPE: PASS
```

POWER_EDITOR_PHASE2_DOM_CAMERA_GATE: NOT_VERIFIED
