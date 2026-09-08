# CRIPQER — POWER EDITOR PHASE 1 TRUE SCROLL OWNERSHIP REPAIR V1

## Direct User Runtime Failure

The supplied runtime failure was confirmed: scrolling over Tools moved the
whole editor document, so Tools and Canvas appeared coupled. Phase 1 scroll
isolation was failing before this repair.

## Actual Pre-Fix Scroll Owner

At the authenticated desktop Power Editor, the real vertical scroll owner was
`document.scrollingElement`, not the Tools panel or workspace.

```text
browser viewport: 1441 × 900
document: clientHeight 900, scrollHeight 3661, scrollTop 0
Tools scroller: clientHeight 3472, scrollHeight 3472, scrollTop 0

Wheel over Tools:
document: 0 → 1200
tools:    0 → 0
canvas:   0 → 0
inspector: 0 → 0
```

The requested 1440 CSS-pixel desktop target was reported as 1441 by the
connected Windows Chrome surface because its DPR was 0.75 and the emulated
device width was rounded by one CSS pixel.

## Height Chain Diagnosis

Before the repair, the editor height chain expanded to panel content:

```text
PowerEditorHost main: 3661px, min-height 900px, overflow visible
Studio root:          3596px, min-height 900px, overflow visible
Workspace row:        3540px, overflow visible
Tools outer:          3540px, min-height auto, overflow visible
Tools inner:          3472px client / 3472px scroll
Inspector outer:      3540px, min-height auto, overflow visible
Canvas viewport:       844px client / 2264px scroll
```

Although inner panel elements declared `overflow-y-auto`, their ancestors did
not provide a finite height and did not consistently allow flex descendants to
shrink.

## Exact Root Cause

`PowerEditorHost` used a growing `min-h-screen` root, while the Studio used
`min-height: 100dvh` inside an unresolved `h-full` chain. The workspace and
desktop panel wrappers retained `overflow: visible` and `min-height: auto`.
Consequently, panel content enlarged the shell and document; the intended
inner scroll areas had no overflow of their own and delegated scrolling to the
document.

## Exact Layout Repair

- Constrained the Power Editor host to `100dvh`, made it a non-scrolling flex
  column, and prevented its header from shrinking.
- Constrained the Studio root to the available viewport height.
- Added `min-h-0` and `overflow-hidden` through the workspace and desktop panel
  wrapper chain.
- Made Tools and Inspector inner regions the explicit vertical scroll owners
  with `flex-1`, `min-h-0`, `overflow-y-auto`, and overscroll containment.
- Made the Canvas shell fill its finite parent while preserving
  `.pts-power-viewport` as the Canvas scroll owner.
- Replaced only the viewport wrapper's copied viewport-height calculations
  with `h-full max-h-full`; camera formulas and geometry were untouched.

## Tools Scroll Ownership

Post-fix Tools geometry was `712px` client height and `3472px` scroll height.
A real wheel action over Tools changed only Tools from `0` to `1200`.

Result: `PASS`.

## Canvas Scroll Ownership

Post-fix Canvas geometry was `779px` client height and `2264px` scroll height.
A real wheel action over Canvas changed only Canvas from `0` to `1200`.

Result: `PASS`.

## Inspector Scroll Ownership

Post-fix Inspector geometry was `779px` client height and `1019px` scroll
height. A real wheel action over Inspector changed only Inspector from `0` to
`239.1919`.

Result: `PASS`.

## Body/Document Scroll Ownership

After the repair, `document.scrollingElement.clientHeight` and `scrollHeight`
were both `900px`, and `scrollTop` remained `0` through all three wheel tests.
The editor internals no longer enlarge the document or use it as a shared
workspace scroller.

Result: `PASS`.

## Numeric scrollTop Evidence

```text
ACTION: wheel over Tools
document:   0 → 0
tools:      0 → 1200
canvas:     0 → 0
inspector:  0 → 0

ACTION: wheel over Canvas
document:   0 → 0
tools:   1200 → 1200
canvas:     0 → 1200
inspector:  0 → 0

ACTION: wheel over Inspector
document:   0 → 0
tools:   1200 → 1200
canvas:  1200 → 1200
inspector:  0 → 239.1919
```

## Camera Regression

The canonical 15-block page remained visible. Initial fit state was
`fitZoom=0.35`, `userZoom=1`, `effectiveScale=0.35`; Stage geometry remained
finite at approximately `413 × 2200`. `+`, `−`, repeated `+`, `Fit`, and
`Reset` all retained a visible page. User zoom reached `1.10`/scale `0.385`
and returned to `1.00`/scale `0.35`. Canvas horizontal overflow remained zero.

No camera math, Stage formula, transform, overscan, or observer logic changed.

Result: `PASS`.

## Panel Collapse Regression

```text
both panels open:     Canvas width 787, page visible
Tools collapsed:      Canvas width 1063, page visible
Tools restored:       Canvas width 787, Tools still independently scrollable
Inspector collapsed:  Canvas width 1063, page visible
Inspector restored:   Canvas width 787, Inspector independently scrollable
```

Document scroll height remained equal to client height and document scrollTop
remained zero throughout.

Result: `PASS`.

## Desktop Runtime

Authenticated desktop runtime passed. Post-fix geometry:

```text
document: 900 client / 900 scroll / scrollTop 0
Studio: 835px, overflow hidden
workspace: 779px, overflow hidden
Tools: 712 client / 3472 scroll
Canvas: 779 client / 2264 scroll, 787 client / 787 scroll width
Inspector: 779 client / 1019 scroll
canonical page visible: YES
first block visible: YES
```

Result: `PASS`.

## Tablet Runtime

At exact `768 × 900`, the editor mounted with a stationary document
(`900/900`, scrollTop `0`), a visible Canvas (`755 × 779` client), finite Stage,
visible canonical page, and reachable mobile dock.

Result: `PASS`.

## Mobile Status

At exact `430 × 900`, the editor, Canvas, canonical page, and bottom dock were
visible while the document remained `900/900` with scrollTop `0`.

The connected DPR 0.75 browser could not expose exactly 390 CSS pixels: the
adjacent available widths were 389 and 391. Both bracketing widths passed the
same non-regression checks, but exact 390 is not claimed.

```text
430 px: PASS
390 px: NOT_VERIFIED (389 px and 391 px both passed)
```

## Automated Tests

```text
npx vitest run src/premium-template-studio/components/workspace/__tests__/powerCanvasCameraMath.test.ts
PASS — 1 file, 11 tests

git diff --check
PASS
```

Targeted ESLint found no behavioral lint findings in the repaired shell files,
but its integrated Prettier rule reports 344 pre-existing formatting findings
inside the legacy `Sidebar.tsx` and `Inspector.tsx` bodies. Those files were
not bulk-reformatted because doing so would create thousands of unrelated
changes; this task changes only two class strings in each file.

## Build

`npm run build` completed successfully for client, SSR, and Nitro/Vercel
output. The existing large-chunk warning was non-blocking.

Result: `PASS`.

## Files Modified

- `src/components/power-editor/PowerEditorHost.tsx`
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
- `src/premium-template-studio/components/editor/Sidebar.tsx`
- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
- `src/premium-template-studio/styles/studio.css`
- `POWER_EDITOR_PHASE1_TRUE_SCROLL_OWNERSHIP_REPAIR_REPORT.md`

The `PowerEditorHost` conditional write was required because runtime evidence
proved its growing `min-h-screen` root was part of the actual document-scroll
height chain.

## Frozen Scope Evidence

No changes were made to `TemplateRenderer`, `StudioProvider`,
`templateReducer`, `BioTemplateConfig`, Engine V2, canonical persistence,
onboarding, Basic Editor, routes, Billing, Entitlements, Analytics, database,
dependencies, or lockfiles. Existing Phase 2 camera-source changes in the dirty
worktree were preserved. No Phase 3 behavior was introduced. No commit,
staging, or push was performed.

## Final Matrix

```text
ACTUAL_PRE_FIX_SCROLL_OWNER: PASS — document.scrollingElement identified
ROOT_CAUSE: PASS
TOOLS_INDEPENDENT: PASS
CANVAS_INDEPENDENT: PASS
INSPECTOR_INDEPENDENT: PASS
BODY_STATIONARY: PASS
CAMERA_REGRESSION: PASS
PANEL_COLLAPSE: PASS
DESKTOP: PASS
TABLET: PASS
MOBILE_430: PASS
MOBILE_390: NOT_VERIFIED
TESTS: PASS
BUILD: PASS
RUNTIME: PASS
VISUAL: PASS
PHASE1_SCROLL_READY: PASS
```

POWER_EDITOR_PHASE1_TRUE_SCROLL_OWNERSHIP_GATE: PASS
