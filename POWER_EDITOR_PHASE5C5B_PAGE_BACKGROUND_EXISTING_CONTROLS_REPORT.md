# POWER_EDITOR_PHASE5C5B — PAGE BACKGROUND TYPE + EXISTING CONTROLS BINDING

## SOURCE_FILES_READ
1. `src/premium-template-studio/components/inspector/Inspector.tsx`
2. `src/premium-template-studio/types/index.ts`
3. `src/premium-template-studio/engine/styleEngine.ts`
4. `src/premium-template-studio/engine/TemplateRenderer.tsx` (read-only)
5. `src/premium-template-studio/components/PremiumTemplateStudio.tsx` (read-only)

## TEST_FILES_READ
1. `src/premium-template-studio/__tests__/pageBackgroundContextual.test.tsx`

## FILES_MODIFIED
1. `src/premium-template-studio/components/inspector/Inspector.tsx`
2. `src/premium-template-studio/__tests__/pageBackgroundContextual.test.tsx`

## ROOT_CAUSE_OF_COLOR_NOT_RENDERING
`pageBackground(theme)` in `styleEngine.ts` always sets
`backgroundColor = bg.color ?? theme.colors.background`, but when
`bg.type === "gradient"` (with `bg.gradient`) / `"image"` (with `bg.imageUrl`) /
`"pattern"`, it ALSO sets `backgroundImage`, which visually covers the solid
color. Phase 5C5 exposed ONLY `theme.background.color`, so editing the color
was silently overridden by the active gradient/image/pattern — the page did not
change.

## CURRENT_BACKGROUND_TYPE_IN_RUNTIME_FIXTURE_IF_DETERMINED
`"gradient"` (radial). Determined via targeted search of `constants/themes.ts`
(the dark theme) which defines
`background: { type: "gradient", gradient: { kind: "radial", angle: 160, from: "#241f5c", to: "#08071a" } }`
— the "dark purple" the user reported. The render mechanism is fully verified
from authorized `styleEngine.ts`.

## BACKGROUND_TYPE_CONTROL
Added a 4-way `Segmented` "Type" control (Solid / Gradient / Image / Pattern)
bound to `theme.background.type` via `selectBackgroundType`.

## SOLID_BINDING
`theme.background.type = "solid"` makes `theme.background.color` visually
authoritative. `ColorInput` bound to `theme.background.color`.

## GRADIENT_BINDING
Kind (Linear/Radial) → `gradient.kind`; From → `gradient.from`; To →
`gradient.to`; Angle → `gradient.angle` (0–360°). All via `patchGradient`,
which merges into the existing gradient object (preserves siblings).

## IMAGE_BINDING
`theme.background.imageUrl` via the existing `AssetField` (upload/change/remove
through the already-available `adapters.assets`). Remove sets `imageUrl` to `""`
without touching other modes.

## PATTERN_BINDING
`Segmented` (Dots/Grid/Noise/Rings) → `theme.background.pattern`.

## BLUR_BINDING
`NumberSlider` (0–24 px) → `theme.background.blur`, shown under Image mode
(already renderer-supported via `backgroundLayerStyle`).

## MODE_SWITCH_PRESERVATION
`selectBackgroundType` patches ONLY `theme.background.type`. It never replaces
the whole `theme.background` object, so `color`, `gradient`, `imageUrl`,
`pattern`, and `blur` are preserved across mode switches. Verified by tests.

## DEFAULT_INITIALIZATION
When first entering Gradient mode with no `gradient` object, a minimal safe
gradient is initialized from existing theme colors:
`{ kind: "linear", angle: 135, from: theme.colors.primary, to: theme.colors.secondary }`.
No arbitrary branding colors are invented.

## ASSET_FIELD_REUSE
Reused the existing `AssetField` (Inspector) which already drives
`adapters.assets.upload` / `remove`. No backend/storage changes.

## UNSUPPORTED_EXISTING_CAPABILITIES
- `theme.background.overlay` (image overlay alpha) — renderer-supported, no
  control surfaced (not required by 5C5B).
- Gradient `kind` is surfaced (Linear/Radial); no other missing gradient fields.

## PAGE_CONTEXTUAL_REGRESSION
`page-background` target, hit-testing, focus, and centering are unchanged
(inspectorFocus.ts / RenderContext / TemplateRenderer not modified in 5C5B).

## HERO_CONTEXTUAL_REGRESSION
None (HeroBlock not touched).

## PROFILE_CONTEXTUAL_REGRESSION
None (Cover/Avatar/Bio binding not touched; only the Page Background section of
`ProfileInspector` was expanded).

## STYLE_ENGINE_CHANGES
None (renderer already supported all four modes).

## CANONICAL_CHANGES
None.

## PERSISTENCE_CHANGES
None.

## HISTORY_CHANGES
None.

## ENGINE_V2_CHANGES
None.

## HYDRATION_MISMATCH_STATUS
Not fixed. No evidence the 5C5B Inspector binding causes it; left untouched
per scope. Reported separately if it persists.

## TESTS
Extended `pageBackgroundContextual.test.tsx` with 10 reducer-level binding
tests (type switching + preservation, gradient from/to/angle, imageUrl
bind/remove, blur, pattern options). Total **21 / 21 pass**.

## LINT
Only pre-existing CRLF (`␍`) line-ending errors. No code-level errors/warnings.

## BUILD
Not run (full `vite build`/`tsc --noEmit` out of scope). Vitest (esbuild)
compiled/executed the changed test; Inspector parses cleanly under eslint.

## RUNTIME
21 tests pass.

## VISUAL
Pending manual gate (PAGEBG2-01 … PAGEBG2-16). Automated tests verify binding +
preservation; visible whole-page updates require user runtime confirmation.

## STOP_TRIGGERED
`false`
