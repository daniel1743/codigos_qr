# POWER EDITOR — PHASE 4 — SELECTION REGISTRY + AUTOFOCUS FOUNDATION V1

## Outcome: BLOCKED (STOP CONDITION TRIGGERED — no code modified)

This phase was analysed and is reported as **BLOCKED** because two independent
STOP conditions fire before any registry/autofocus logic can be implemented
safely within the authorized WRITE SCOPE. No production source file was
modified. Only this report was produced, and the frozen camera-math test suite
was re-run to confirm a green baseline.

---

FILES_READ:
- src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx
- src/premium-template-studio/components/workspace/usePowerCanvasCamera.ts
- src/premium-template-studio/state/StudioProvider.tsx
- src/premium-template-studio/state/templateReducer.ts
- src/premium-template-studio/engine/TemplateRenderer.tsx (reference)
- src/premium-template-studio/components/PremiumTemplateStudio.tsx (reference — needed to trace selection ownership)

FILES_MODIFIED:
- (none)

CURRENT_SELECTION_OWNER:
- StudioState.selectedBlockId (single source of truth), produced/updated by
  templateReducer via the `selectBlock` action, and consumed by
  PremiumTemplateStudio → TemplateRenderer `editing.selectedBlockId`.
  Tools/Inspector/Canvas all dispatch `{ type: "selectBlock", id }` through the
  shared `dispatch`. This is correct and does NOT need a second source of truth.

REGISTRY_IMPLEMENTED: NO
REGISTRY_LOCATION: (none — blocked)
AUTOFOCUS_IMPLEMENTED: NO

VISIBLE_SELECTION_NO_MOVE: NOT_VERIFIED (blocked)
OFFSCREEN_SELECTION_RECOVERY: NOT_VERIFIED (blocked)
REPEATED_AUTOFOCUS_PREVENTED: NOT_VERIFIED (blocked)
CAMERA_OWNERSHIP_PRESERVED: NOT_APPLICABLE (no code changed)

STAGE_GEOMETRY_UNCHANGED: YES (no change)
CAMERA_MATH_UNCHANGED: YES (no change)
SCROLL_ISOLATION_UNCHANGED: YES (no change)
PERSISTENCE_UNCHANGED: YES (no change)
HISTORY_UNCHANGED: YES (no change)
MOBILE_UNCHANGED: YES (no change)

TESTS:
- `npx vitest run src/premium-template-studio/components/workspace/__tests__/powerCanvasCameraMath.test.ts`
  → PASS (1 file, 17 tests). Frozen camera math remains green.
- No new Phase 4 tests were added (blocked — no logic to test).

BUILD: NOT_VERIFIED
RUNTIME: NOT_VERIFIED
VISUAL: NOT_VERIFIED

STOP_CONDITION_TRIGGERED: YES (conditions #1 and #4)
SCOPE_EXPANSION_REQUIRED: YES

POWER_EDITOR_PHASE4_SELECTION_REGISTRY_AUTOFOCUS_FOUNDATION_GATE:
BLOCKED

---

## Why Phase 4 is blocked (exact, minimal dependencies)

### STOP CONDITION #1 — TemplateRenderer must be modified to expose `blockId`

File: `src/premium-template-studio/engine/TemplateRenderer.tsx`
Symbol: `BlockFrame` (the per-block `<section className="pts-block">` element, rendered at ~line 298–333)

The `blockId → HTMLElement` registry cannot be populated because the block
element in the DOM carries **no stable `blockId` identifier**. The
`<section>` exposes only:

- `className="pts-block"` / `pts-block--selected` (no id)
- `aria-label={`${block.type} block`}` (NOT unique — many blocks share a type)
- a transient `dataTransfer.setData("text/pts-block", block.id)` value that only
  exists during a drag, never as a persistent DOM attribute

Consequently there is no explicit, non-fragile way to associate a rendered
`HTMLElement` with its `blockId` from outside the renderer. The registry's
`register(blockId, element)` / `unregister(blockId)` API has no caller.

Minimal expansion required (single attribute, no behavior change):
```tsx
<section
  data-block-id={block.id}
  ...
```

This is the smallest possible surface to make the registry populate-able via
ref callbacks or an attribute-scoped lookup inside the viewport's content layer,
without any global `querySelector` fragility.

### STOP CONDITION #4 — `selectedBlockId` does not reach the Canvas viewport

File: `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
Symbol: `<PowerCanvasViewport>` invocation (~line 307)

`PowerCanvasViewport` currently receives only:
```tsx
interface PowerCanvasViewportProps {
  children: ReactNode;
  contentWidth: number;
  onBackgroundClick: () => void;
}
```

It does **not** receive `selectedBlockId`. That value is consumed by
`TemplateRenderer` (which is the viewport's `children`), not by the viewport
itself — the component that owns `viewport.scrollLeft/scrollTop` and would
perform the autofocus scroll. Selection→Canvas autofocus is therefore
impossible from within the authorized WRITE SCOPE.

Note: the reverse direction (Canvas→selection, SELECT-07) already works today —
`BlockFrame.onClick` calls `editing.onSelect(block.id)` → `dispatch selectBlock`,
and Tools/Inspector reflect it. Only the selection→Canvas direction is missing.

Minimal expansion required (one prop + one interface field):
```tsx
<PowerCanvasViewport
  contentWidth={frameWidth}
  selectedBlockId={state.selectedBlockId}
  onBackgroundClick={...}
>
```

---

## What the unblocked implementation would look like (for the next phase)

Once the two minimal expansions above are authorized, the foundation can be
implemented entirely inside `PowerCanvasViewport.tsx` (plus, optionally, a small
hook in `src/premium-template-studio/components/workspace/`) as:

1. **Registry** — `Map<BlockId, HTMLElement>`, populated by observing
   `[data-block-id]` elements in the camera layer (MutationObserver or ref
   callbacks), with `register/unregister/getBlockElement`.
2. **Autofocus** — a single effect keyed on `selectedBlockId` that resolves the
   element, compares `element.getBoundingClientRect()` against the viewport's
   `getBoundingClientRect()` (same spatial system — DOM geometry only, never fed
   back into Stage intrinsic dimensions), and only adjusts `scrollTop/scrollLeft`
   when the element is outside (or meaningfully clipped by) the scrollport.
   Guarded by "last autofocused blockId" to prevent re-trigger on re-render,
   ResizeObserver, or zoom — matching the UX rules (no recentering loop, no
   selection reinterpretation).
3. **Ownership preserved** — no `translateX/Y`, no second camera, no persisted
   pan state; `viewport.scrollLeft/scrollTop` remain the pan owner.

None of this touches camera math, Stage geometry, persistence, or history.

## Scope hygiene

- No repo-wide refactor, CSS change, or Phase 5 work performed.
- Frozen files (powerCanvasCameraMath.ts, TemplateRenderer.tsx,
  StudioProvider.tsx, templateReducer.ts, BasicEditorShell.tsx,
  PowerEditorHost.tsx, canonical-page.service.ts, parametric-engine-v2/**)
  were not modified.
- No History fix attempted; the known `selectedBlockId`-after-undo staleness
  (P0-002) remains out of scope and was not touched.

---

# POWER EDITOR — PHASE 4A — SELECTION → CANVAS AUTOFOCUS (COMPLETED)

## Summary

The two STOP conditions from Phase 4 were authorized and resolved. Phase 4A
implements the minimal selection→Canvas autofocus flow. No code beyond the
authorized WRITE SCOPE was touched.

FILES_READ:
- src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx
- src/premium-template-studio/components/workspace/usePowerCanvasCamera.ts (reference)
- src/premium-template-studio/state/StudioProvider.tsx (reference)
- src/premium-template-studio/state/templateReducer.ts (reference)
- src/premium-template-studio/engine/TemplateRenderer.tsx
- src/premium-template-studio/components/PremiumTemplateStudio.tsx
- src/premium-template-studio/utils/index.ts (uid format)
- src/premium-template-studio/components/workspace/__tests__/powerCanvasCameraMath.test.ts

FILES_MODIFIED:
- src/premium-template-studio/engine/TemplateRenderer.tsx (added `data-block-id={block.id}`)
- src/premium-template-studio/components/PremiumTemplateStudio.tsx (pass `selectedBlockId`)
- src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx (prop + scoped autofocus)
- src/premium-template-studio/components/workspace/powerCanvasAutofocus.ts (NEW — pure helper)
- src/premium-template-studio/components/workspace/__tests__/powerCanvasAutofocus.test.ts (NEW)

SELECTION_SINGLE_SOURCE_OF_TRUTH: StudioState.selectedBlockId (unchanged, no mirror)
BLOCK_DOM_IDENTITY_ADDED: YES — `data-block-id={block.id}` on BlockFrame `<section>`
SELECTED_BLOCK_PROP_PASSED: YES — `selectedBlockId={state.selectedBlockId}` → PowerCanvasViewport
SCOPED_DOM_LOOKUP_IMPLEMENTED: YES — `contentRef.current.querySelector([data-block-id=...])`

MUTATION_OBSERVER_USED: NO
GLOBAL_QUERY_USED: NO — lookup scoped to the Canvas camera/content layer

VISIBLE_SELECTION_NO_MOVE: YES (helper returns delta 0; unit-tested)
OFFSCREEN_SELECTION_RECOVERY: YES (above/below/left/right minimal deltas; unit-tested)
REPEATED_AUTOFOCUS_PREVENTED: YES (`lastAutofocusedBlockIdRef` guard, selection-only trigger)
CURRENT_ZOOM_PRESERVED: YES — only `scrollTop`/`scrollLeft` written; zoom never touched

CANVAS_TO_SELECTION_EXISTING_PATH_PRESERVED: YES (BlockFrame.onClick → onSelect → selectBlock, untouched)

CAMERA_OWNERSHIP_PRESERVED: YES (scrollLeft/scrollTop remain the only pan owner)
CAMERA_HOOK_UNCHANGED: YES
CAMERA_MATH_UNCHANGED: YES
STAGE_GEOMETRY_UNCHANGED: YES
SCROLL_ISOLATION_UNCHANGED: YES

PERSISTENCE_UNCHANGED: YES
HISTORY_UNCHANGED: YES (stale-id-after-undo → lookup null → no-op, no crash)
ENTITLEMENTS_UNCHANGED: YES
MOBILE_UNCHANGED: YES

TESTS: PASS — camera math 17/17 green; new autofocus helper 6/6 green (23 total).
BUILD: NOT_VERIFIED (full `tsc --noEmit` exceeded the 30s command budget; targeted eslint on all touched files: 0 errors)
RUNTIME: NOT_VERIFIED (no browser available)
VISUAL: NOT_VERIFIED (no browser available — SELECT-01..08 require manual verification)

STOP_CONDITION_TRIGGERED: NO
SCOPE_EXPANSION_REQUIRED: NO

POWER_EDITOR_PHASE4_SELECTION_REGISTRY_AUTOFOCUS_FOUNDATION_GATE:
NOT_VERIFIED


