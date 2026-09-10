# POWER EDITOR CONTEXTUAL FOCUS REGRESSION V1

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`
Task: `CRIPQER_POWER_EDITOR_CONTEXTUAL_FOCUS_REGRESSION_V1`

---

## FILES_READ

1. `src/premium-template-studio/components/inspector/inspectorFocus.ts` — owns
   `computeInspectorFocusScroll` and the 5C2D positioning constants.
2. `src/premium-template-studio/__tests__/contextualFocus.test.ts` — the failing test.

(No third file was required; the helper is pure and self-documenting.)

## FILES_MODIFIED

- `src/premium-template-studio/__tests__/contextualFocus.test.ts` (test expectation only)

## FAILING_TEST

`computeInspectorFocusScroll (comfortable positioning) > returns 0 when the target is already comfortably visible`

```
AssertionError: expected -130 to be +0 // Object.is equality
  at contextualFocus.test.ts:28
```

Fixture: `computeInspectorFocusScroll({ top: 0, bottom: 600 }, { top: 100, bottom: 180 })`

## WHY_ACTUAL_IS_MINUS_130

`computeInspectorFocusScroll` (5C2D contract):

```ts
height       = 600 − 0                    = 600
anchor       = 0 + 600 × 0.45             = 270   // 45% anchor
targetCenter = 100 + (180 − 100)/2        = 140   // 23.3% of viewport
bandLow      = 0 + 600 × 0.35             = 210   // 35%
bandHigh     = 0 + 600 × 0.55             = 330   // 55%
```

`140 < 210`, so the target center is **above** the 35% band and the helper
returns `targetCenter − anchor = 140 − 270 = −130` — a scroll delta that
re-centers the near-top-edge target toward the 45% anchor.

## WHY_OLD_EXPECTATION_WAS_ZERO

The fixture `{ top: 100, bottom: 180 }` is fully *visible* (all within 0–600).
The old expectation encoded the pre-5C2D rule "target is visible ⇒ do not scroll
(return 0)". Phase 5C2D tightened this to a **comfortable band**: a target that
is merely "visible" but sits near the top/bottom edge is now re-centered, while
only a target already inside the 35%–55% band is left untouched. The stale
`toBe(0)` predates that change.

## AUTHORITATIVE_EXPECTED_BEHAVIOR

From `inspectorFocus.ts` (5C2D), explicitly documented:

> The Inspector places the CENTER of the exact target at ~45% of the visible
> Inspector viewport height (comfortable band: 35%–55%). A target already
> centered in that band is never moved.

> …a target that is merely "visible" near the top or bottom edge still gets
> re-centered, while an already-centered target is left untouched (no repeated
> jumping).

The 5C2D behavior was previously user-approved. A center at 23.3% is **not** in
the band, so re-centering (non-zero delta) is the correct, approved behavior.

## STALE_TEST_OR_REAL_REGRESSION

**STALE TEST** (not a real regression). `−130` is the correct post-5C2D result;
`0` was the superseded pre-5C2D expectation. The three sibling assertions
(positive delta below, negative delta above, upper-band placement) already pass
unchanged against the current implementation, confirming the helper matches the
approved 5C2D contract.

## FIX_APPLIED

Updated only the stale test expectation — no runtime code changed:

1. Renamed the stale case to `"re-centers a visible-but-edge target into the
   35%–55% band (5C2D)"` and changed its expectation to `toBe(-130)`, with a
   comment documenting why 5C2D superseded the old "visible ⇒ no scroll" rule.
2. Added a complementary `"returns 0 when the target center is already within
   the 35%–55% band"` case with an in-band fixture (`{ top: 240, bottom: 300 }`,
   center 270 = 45%) so the "no unnecessary scroll" contract remains covered.

## RUNTIME_CODE_CHANGED

false

## TEST_RESULT

`npx vitest run src/premium-template-studio/__tests__/contextualFocus.test.ts`
→ **11 passed (11)** (previously 10, 1 failed). No regressions in bidirectional
focus / anti-loop / target-set / DOM-wiring cases.

## STOP_TRIGGERED

false — intent was determinable from the explicit 5C2D documentation and the
passing sibling assertions; no fourth file, runtime change, or user verification
was required.

## FINAL_GATE

**PASS** — the discrepancy is explained and resolved without regressing the
user-approved 5C2D contextual-focus behavior.
