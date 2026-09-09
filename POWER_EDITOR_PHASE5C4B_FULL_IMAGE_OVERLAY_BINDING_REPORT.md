# POWER_EDITOR_PHASE5C4B — FULL-IMAGE HERO OVERLAY BINDING

## FILES_READ
1. `src/premium-template-studio/components/blocks/HeroBlock.tsx`
2. `src/premium-template-studio/components/inspector/Inspector.tsx`
3. `src/premium-template-studio/__tests__/heroBackgroundContextual.test.tsx`

## FILES_MODIFIED
1. `src/premium-template-studio/components/blocks/HeroBlock.tsx`
2. `src/premium-template-studio/__tests__/heroBackgroundContextual.test.tsx`

(Inspector.tsx was read-only for this phase — no modification.)

## OLD_FULL_IMAGE_OVERLAY_BEHAVIOR
The full-image variant rendered a **hardcoded** overlay `<div>` that ignored the
canonical `style.overlay` contract entirely:

```tsx
background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.15) 100%)
```

- No `opacity` (alpha was baked into the gradient stops).
- No `type` (always a 3-stop gradient, never solid).
- No `direction` (hardcoded `to top`).
- The Inspector's "Overlay Type / Intensity / Direction" controls had no effect
  on the full-image variant.

## NEW_FULL_IMAGE_OVERLAY_BEHAVIOR
The full-image variant now renders the **shared** `overlayElem` (the same element
already used by `centered`, `editorial`, and `split`), which consumes the existing
canonical contract:

- `style.overlay.opacity` → applied as the layer `opacity` (default `0.4`).
- `style.overlay.type` → `"gradient"` renders a `linear-gradient`; otherwise a
  solid `rgba(0,0,0,0.6)`.
- `style.overlay.direction` → `"to-top"` → `0deg`, otherwise `180deg`.

## EXISTING_OVERLAY_CONTRACT_REUSED
- `style.overlay.type`
- `style.overlay.opacity`
- `style.overlay.direction`

No new schema, no new overlay engine, no new Inspector controls. The change is a
single substitution: the hardcoded full-image `<div>` → `{overlayElem}`.

Note: `overlayElem` already had `backgroundImage.url || isFullImage` in its
render condition, confirming full-image was always *intended* to use it — the
full-image return block simply carried a stale hardcoded duplicate.

## BACKWARD_COMPATIBILITY
When `style.overlay` is absent/undefined, `overlayElem` falls back to the same
defaults used by the other Hero variants: `opacity: 0.4` and a solid
`rgba(0,0,0,0.6)` scrim. This is a visually reasonable, readable scrim that keeps
white foreground text legible — no sudden loss of readability.

## SCHEMA_CHANGES
None.

## CAMERA_CHANGES
None.

## TESTS
Added a new `describe("full-image overlay binding (Phase 5C4B)")` block with 6
tests covering:
1. consumes `style.overlay.opacity`
2. consumes `style.overlay.type` (solid)
3. consumes `style.overlay.type` (gradient)
4. consumes `style.overlay.direction` (to-top vs to-bottom)
5. undefined overlay preserves compatible fallback
6. overlay keeps `pointer-events:none`

Pre-existing tests continue to cover:
- full-image remains `hero-background`, not `hero-image`
- Title/CTA contextual clicks remain protected

Result: **20 / 20 tests pass** (`npx vitest run .../heroBackgroundContextual.test.tsx`).

## LINT
`eslint` on the two modified files reports only pre-existing CRLF (`Delete ␍`)
line-ending errors from Windows `git autocrlf` (LF→CRLF on checkout). No
code-level lint errors were introduced.

## RUNTIME
Vitest executes and passes all 20 tests. The changed `HeroBlock.tsx` compiles and
renders via the existing test harness (esbuild transform).

## VISUAL
Pending the manual gate (OVERLAY-01 … OVERLAY-07). Automated assertions verify the
correct inline `background`/`opacity`/`pointer-events` are emitted; the visual
confirmation that Inspector changes visibly modify the full-image Hero in the
browser still requires user runtime verification.

## STOP_TRIGGERED
`false`

## FINAL_GATE
`NOT_VERIFIED`

Final `PASS` requires user runtime confirmation that the existing Inspector
"Overlay Type / Intensity / Direction" controls visibly modify the full-image
Hero in the browser.
