# CRIPQER — POWER EDITOR CAMERA DIAGNOSTIC UPDATE LOOP FIX V1

## Runtime error evidence

The reported failure was React's `Maximum update depth exceeded` in the
development camera diagnostic, around `PowerCanvasViewport.tsx:129`, where a
`requestAnimationFrame` callback collected a sample and updated diagnostic
state.

## Root cause

`CameraDiagnostic` scheduled a new animation frame and called
`setSamples(previous => [...previous, nextSample])` on every sample. The
diagnostic effect also depended on camera/stage values whose object identities
could change when the parent re-rendered. The state update therefore re-ran
the effect, which scheduled another frame and another state update. Cleanup
only marked the effect cancelled and did not cancel the queued animation
frame. This formed a self-triggering diagnostic loop; it did not originate in
Stage geometry, `fitZoom`, responsive rendering, or document state.

## Exact fix

`CameraDiagnostic` in
`src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
now:

- collects samples in a local `collected` array;
- schedules at most five samples, with no frame scheduled after sample five;
- performs at most one React state update, when the fifth sample is complete;
- depends only on the stable ref objects
  `[contentRef, stageRef, viewportRef]`;
- stores the pending RAF handle and calls `cancelAnimationFrame` in cleanup;
- checks the cancellation flag before reading DOM state or updating React
  state.

The diagnostic remains development-only and passive. It does not dispatch
camera, document, persistence, or renderer changes.

## Lifecycle proof

The repaired sequence is:

```text
effect once → RAF sample 1 → RAF sample 2 → RAF sample 3 → RAF sample 4
→ RAF sample 5 → one setSamples → stop
```

Unmount or dependency cleanup sets `cancelled` and cancels the currently
queued frame. A callback that was already entering the event loop is stopped
by the cancellation guard before it can update state.

## Validation

- Targeted ESLint for `PowerCanvasViewport.tsx`: PASS.
- Targeted Prettier check: PASS.
- Camera math tests: PASS, 1 file, 5 tests.
- Static inspection: PASS — one `setSamples`, five-sample bound, RAF handle,
  and `cancelAnimationFrame` cleanup are present.

`npx tsc --noEmit --pretty false`: BLOCKED by existing project-wide type
errors. The diagnostics include unrelated admin, basic-editor, Power Editor
host, onboarding, entitlement-import, route, and Vite configuration errors;
`PowerCanvasViewport.tsx` itself was not reported by this check.

## Build

`npm run build`: BLOCKED by pre-existing unresolved relative imports in
`src/premium-template-studio/entitlements.ts`:

```text
../../lib/product-entitlements/asset-manifest
../../lib/product-entitlements/capabilities
../../lib/product-entitlements/mutation-guard
```

The corresponding files exist under `src/lib/product-entitlements`; the
relative imports from `src/premium-template-studio/entitlements.ts` resolve
outside `src`. Those imports are outside this diagnostic-only task and were
not changed.

## Runtime console and post-fix visual evidence

Runtime console observation is **NOT_VERIFIED**. The available browser
automation session timed out while reading the editor tab and previously
reported an unattached debugger; it did not expose a controllable console.
Consequently this report does not claim runtime proof that the error is gone.

Canvas visibility, huge-geometry behavior, and desktop/tablet/mobile
responsive visibility after this exact fix are also **NOT_VERIFIED**. They are
follow-up observations only; no geometry, responsive, Stage, or
`TemplateRenderer` repair was added here.

## Files modified

- `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
- `POWER_EDITOR_CAMERA_DIAGNOSTIC_UPDATE_LOOP_FIX_REPORT.md`

## Frozen scope evidence

No changes were made to Stage formulas, `fitZoom`, camera math,
`usePowerCanvasCamera`, responsive CSS, `TemplateRenderer`, Studio state,
reducers, persistence, routes, Billing, Entitlements, database, dependencies,
or Phase 3 behavior.

## Final matrix

```text
ROOT_CAUSE: PASS
CODE: PASS
LOGIC: PASS
TESTS: PASS
BUILD: BLOCKED (pre-existing unresolved imports)
MAX_UPDATE_DEPTH: NOT_VERIFIED
RAF_TERMINATION: CODE_VERIFIED
RUNTIME: NOT_VERIFIED
CANVAS_VISIBILITY_AFTER_FIX: NOT_VERIFIED
HUGE_GEOMETRY_AFTER_FIX: NOT_VERIFIED
RESPONSIVE_AFTER_FIX: NOT_VERIFIED
FROZEN_SCOPE: PASS
```

CAMERA_DIAGNOSTIC_LOOP_GATE: NOT_VERIFIED
