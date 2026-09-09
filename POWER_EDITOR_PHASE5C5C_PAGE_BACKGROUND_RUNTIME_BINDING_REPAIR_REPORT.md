# POWER_EDITOR_PHASE5C5C — PAGE BACKGROUND RUNTIME BINDING REPAIR

## SOURCE_FILES_READ
1. `src/premium-template-studio/components/inspector/Inspector.tsx`
2. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
3. `src/premium-template-studio/state/StudioProvider.tsx`
4. `src/premium-template-studio/state/templateReducer.ts`
5. `src/premium-template-studio/engine/TemplateRenderer.tsx`
6. `src/premium-template-studio/engine/styleEngine.ts`
7. `src/premium-template-studio/entitlements.tsx` (read to confirm root cause — see STOP)

## TEST_FILES_READ
1. `src/premium-template-studio/__tests__/pageBackgroundContextual.test.tsx`

## FILES_MODIFIED
None (STOP before edit).

## ROOT_CAUSE
The guarded dispatch in `StudioProvider.tsx` classifies every
`patch("theme.background.*")` as `EDIT_PREMIUM_BACKGROUND`
(`entitlements.tsx` `intentForConfigPath`, lines 53–54), which resolves to the
premium capability `premium_background_effects`. For the free tier,
`authorizeCanonicalMutation` returns `DENY`, and the guarded dispatch returns
early WITHOUT calling `rawDispatch` — so the state never updates, the renderer
never receives the new theme, and the page never changes.

## WHY_CONTROLS_RENDERED_BUT_DID_NOT_ACT
The Inspector controls render and emit correct `patch` actions, but the mutation
guard silently drops those actions. The 5C5B tests passed because they drove
`templateReducer` directly, bypassing the guarded dispatch boundary — so they
never exercised the real Studio → renderer path.

## INSPECTOR_EVENT_TRACE
PASS — clicking Solid/Gradient/Image/Pattern or editing color/from/to/angle
emits `dispatch({ type: "patch", path: "theme.background.*", value })`.

## UPDATE_PAYLOAD_TRACE
PASS — payload is `{ type: "patch", path, value }`, matching the reducer contract
(`setPath` deep-clones and sets the nested path immutably).

## STUDIO_STATE_TRACE
FAIL (FIRST BROKEN STEP) — `mutationIntentForAction` → `EDIT_PREMIUM_BACKGROUND`
→ `authorizeCanonicalMutation("free", …)` → `DENY` → guarded dispatch returns
before `rawDispatch`. `state.config.theme.background` never changes.

## TEMPLATE_RENDERER_TRACE
FAIL (downstream of STUDIO_STATE) — `TemplateRenderer` never receives the updated
theme because Studio state never changed.

## PAGE_STYLE_TRACE
FAIL (downstream) — `pageBackground(theme)` is correct and WOULD produce the
right style, but it is never given an updated theme.

## FIRST_BROKEN_STEP
Step 4 ("Studio state after update"). The Inspector event and payload are correct;
the guarded dispatch drops the mutation before the reducer runs.

## FIX_APPLIED
None (STOP). The minimal fix is to reclassify `theme.background` (at minimum
`theme.background.color` and `theme.background.type`, i.e. the solid-color page
background) as a non-premium intent (e.g. `EDIT_BASIC_STYLE`) in
`entitlements.tsx` `intentForConfigPath`, while keeping gradient/image/pattern/
overlay/blur under `EDIT_PREMIUM_BACKGROUND`. This is outside the authorized
write scope.

## SOLID_RUNTIME_BINDING
Blocked by the same common break (path `theme.background.type` /
`theme.background.color`).

## GRADIENT_RUNTIME_BINDING
Blocked (path `theme.background.type` / `theme.background.gradient.*`).

## IMAGE_RUNTIME_BINDING
Blocked (path `theme.background.type` / `theme.background.imageUrl` /
`theme.background.blur`).

## PATTERN_RUNTIME_BINDING
Blocked (path `theme.background.type` / `theme.background.pattern`).

## MODE_PRESERVATION
Unaffected by this fix — the reducer's `setPath` already preserves sibling fields.
(Verified by 5C5B reducer tests.)

## CONTEXTUAL_FOCUS_CHANGES
None.

## CAMERA_CHANGES
None.

## CANONICAL_CHANGES
None.

## PERSISTENCE_CHANGES
None.

## ENGINE_V2_CHANGES
None.

## HYDRATION_MISMATCH_STATUS
Not related. Hydration was not the cause; the guarded dispatch is.

## TESTS
Existing 5C5B tests (reducer-level) still pass but do NOT cover the guarded
dispatch boundary — that is the gap. No new tests added (STOP).

## LINT
Not re-run for a no-op phase; no files modified.

## BUILD
Not run (no files modified).

## RUNTIME
FAIL — controls still do not change the page (root cause unchanged).

## VISUAL
FAIL — no visible page change.

## STOP_TRIGGERED
`true`

---

## ON_STOP_REPORT_ONLY
STOP_REASON: Fix requires modifying `entitlements.tsx` (`intentForConfigPath`)
and/or the capability policy — a 7th source file outside the authorized write
scope.
TRACE_LAST_CONFIRMED_STEP: Inspector emits correct `patch("theme.background.*")`.
FIRST_BROKEN_STEP: Studio state update (guarded dispatch `DENY` before reducer).
EXACT_FILE_NEEDED: `src/premium-template-studio/entitlements.tsx`
EXACT_SYMBOL: `intentForConfigPath` (lines 53–54, `theme.background` →
`EDIT_PREMIUM_BACKGROUND`)
WHY_REQUIRED: `theme.background` solid color/type must map to a non-premium
intent so the guarded dispatch ALLOWs the mutation for the free tier.
SOURCE_FILES_READ: 7 (see above)
TEST_FILES_READ: 1
FILES_ALREADY_MODIFIED: 0
