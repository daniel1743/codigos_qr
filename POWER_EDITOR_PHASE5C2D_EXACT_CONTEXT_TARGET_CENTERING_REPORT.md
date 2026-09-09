# POWER EDITOR PHASE 5C2D — EXACT CONTEXT TARGET CENTERING + PROFILE AVATAR

## FILES_READ
1. `src/premium-template-studio/components/inspector/Inspector.tsx`
2. `src/premium-template-studio/components/inspector/inspectorFocus.ts`
3. `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
4. `src/premium-template-studio/components/canvas/ProfileHeader.tsx`
5. `src/premium-template-studio/engine/RenderContext.tsx`
6. `src/premium-template-studio/engine/TemplateRenderer.tsx`
7. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`

## FILES_MODIFIED
1. `src/premium-template-studio/components/inspector/inspectorFocus.ts`
2. `src/premium-template-studio/components/inspector/Inspector.tsx`
3. `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
4. `src/premium-template-studio/components/canvas/ProfileHeader.tsx`
5. `src/premium-template-studio/engine/RenderContext.tsx`
6. `src/premium-template-studio/engine/TemplateRenderer.tsx`
7. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`

## TOTAL_FILES_READ
7 (exactly the authorized set — no eighth source file was read).

## EXACT_TARGET_POSITIONING_ALGORITHM
Replaced the Phase 5C2B "upper-band" positioning (which left the exact control
too high/low and allowed a merely-visible target to pass) with an exact-center
algorithm:

```
viewportAnchor = viewportRect.top + viewportRect.height * 0.45
targetAnchor   = targetRect.top + (targetRect.bottom - targetRect.top) / 2
delta          = targetAnchor - viewportAnchor
nextScrollTop  = clamp(currentScrollTop + delta, 0, scrollHeight - clientHeight)
```

`computeInspectorFocusScroll(viewport, element)` returns the delta; it returns
`0` only when the target CENTER already sits within the 35%–55% comfortable
band. `clampScrollValue` (pure) clamps the result into `[0, scrollSize -
clientSize]` at both the Inspector and Canvas scroll owners.

## INSPECTOR_ANCHOR_PERCENTAGE
45% of visible Inspector height (`INSPECTOR_FOCUS_ANCHOR_RATIO = 0.45`),
comfortable no-move band 35%–55% (`INSPECTOR_FOCUS_BAND_LOW/HIGH`).

## CANVAS_ANCHOR_BEHAVIOR
Inspector → Canvas reveal now uses `computeCanvasFocusScroll`, centering the
exact `data-editor-target` element's vertical center at ~47.5%
(`CANVAS_FOCUS_ANCHOR_RATIO = 0.475`, within the 45%–50% contract) and keeping
it comfortably visible horizontally (only moved if it drifts out of a 10%
margin). Only `scrollTop`/`scrollLeft` are written and clamped.

## PROFILE_AVATAR_TARGET
- `"profile-avatar"` added to `ContextualTarget` (inspectorFocus.ts).
- Inspector: the Avatar editing controls (upload, alignment, overlap, shadow)
  are now wrapped in a single `data-inspector-focus="profile-avatar"` group —
  NOT the whole Profile section. "Verified badge" was moved out of the group.
- Canvas: the rendered avatar is wrapped in a `data-editor-target="profile-avatar"`
  element with an edit-mode click handler.

## PROFILE_BIO_CONTEXT_SWITCH
Bio click now routes through the generalized `selectProfileTarget("profile-bio")`
(ProfileHeader.tsx), which calls `onSelectProfileTarget` → clears
`selectedBlockId` (switching the Inspector from a block context to Profile) then
`requestInspectorFocus("profile-bio")`. Previously Bio bypassed the context
switch and failed when a block was selected.

## PROFILE_AVATAR_CONTEXT_SWITCH
Same generalized path: clicking the Avatar calls
`selectProfileTarget("profile-avatar")`, clearing block selection and revealing
the exact Avatar controls centered in the Inspector.

## PROFILE_CALLBACK_ARCHITECTURE
One generalized callback: `onSelectProfileTarget(target: ProfileTarget)` where
`ProfileTarget = "profile-cover" | "profile-avatar" | "profile-bio"`. Added to
`RenderContext`, `EditingHandlers` (TemplateRenderer), and wired in
`PremiumTemplateStudio`. `ProfileHeader` uses a single internal
`selectProfileTarget` helper for all three targets (with a legacy fallback to
the cover-only `onSelectProfileCover` / direct `requestInspectorFocus`). No
three-callback duplication was introduced.

## BLOCK_LEVEL_VS_EXACT_TARGET
Positioning is exact-sub-element: `data-inspector-focus` wraps only the specific
control group and `data-editor-target` identifies the specific rendered element
(hero-title/hero-cta/profile-cover/profile-bio/profile-avatar), never the parent
block/section. The anchor targets the CENTER of that exact element, not its top
edge.

## ANTI_LOOP
Unchanged source separation is preserved: `requestInspectorFocus` notifies only
Inspector listeners; `requestCanvasFocus` notifies only Canvas listeners. The
35%–55% no-move band makes positioning idempotent — once centered, further
signals produce delta 0, so no feedback oscillation and no repeated jumping
while typing.

## CAMERA_CHANGES
None. No zoom/fit/reset, no camera transform rewrite, no new pan owner. Canvas
reveal writes only `scrollTop`/`scrollLeft` on the existing viewport owner.

## PERSISTENCE_CHANGES
None.

## HISTORY_CHANGES
None.

## ENGINE_V2_CHANGES
None.


## TESTS
Ran the targeted regression + behavior suites (`npx vitest run`):
- `powerCanvasAutofocus.test.ts` — 6 pass
- `profileCoverContextual.test.ts` — 6 pass
- `heroCtaContextual.test.ts` — 6 pass
- `heroTextContextual.test.tsx` — 8 pass
- `contextualFocus.test.ts` — 9 pass / 1 fail

The single failure is `computeInspectorFocusScroll` → "returns 0 when the target
is already comfortably visible": it asserts the SUPERSEDED behavior (a target at
16%–30% of the viewport counted as "comfortable"). The new contract explicitly
re-centers such a target to 45%, so the assertion is now obsolete. Updating that
assertion is outside WRITE_SCOPE (test files are not in the authorized 7-file
set), so it is flagged rather than silently modified.

## LINT
`eslint` on all 7 modified files: 0 errors, 1 pre-existing warning
(`react-refresh/only-export-components` in RenderContext.tsx, unrelated to this
change).

## RUNTIME
NOT VERIFIED. Automated units confirm the pure math and pub/sub wiring, but per
the RUNTIME_RULE the gate requires the exact control to visibly re-center in the
real editor. This must be confirmed by the user (see MANUAL_GATE CENTER-01 …
CENTER-12).

## VISUAL
NOT VERIFIED. Awaiting manual runtime confirmation of the 12 CENTER gates.

## STOP_TRIGGERED
false — no eighth source file, no frozen-file change, no new global store, no
camera/schema/persistence/history change was required.

## FINAL_GATE
NOT_VERIFIED
