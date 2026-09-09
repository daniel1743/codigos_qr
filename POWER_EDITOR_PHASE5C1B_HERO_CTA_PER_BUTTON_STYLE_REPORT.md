# POWER EDITOR PHASE 5C1B — HERO CTA PER-BUTTON STYLE CAPABILITIES V1

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`

Adds real per-CTA visual styling to Hero CTA buttons (primary and secondary
styled independently), with full backward compatibility when style fields are
absent.

## FILES_READ

- `src/premium-template-studio/types/index.ts` — `CTAContent`, `BlockStyle`, `ThemeButtons`, `ThemeTypography`
- `src/premium-template-studio/components/blocks/HeroBlock.tsx` — hardcoded CTA button styles
- `src/premium-template-studio/components/inspector/Inspector.tsx` — `HeroBlockInspector` + Phase 5C1 CTA section
- `src/premium-template-studio/engine/styleEngine.ts` — theme→CSS helpers, `themeToCssVars`
- `src/premium-template-studio/engine/RenderContext.tsx` — `useRender` surface (read-only, unchanged)
- `src/premium-template-studio/state/templateReducer.ts` — `patchBlockField` → `setPath` (nested dotted paths)
- `src/premium-template-studio/components/ui/controls.tsx` — `ColorInput`, `NumberSlider`, `Segmented`, `GhostButton`, `Field`
- `src/premium-template-studio/constants/themes.ts` — `FONT_OPTIONS` canonical font tokens
- `src/premium-template-studio/constants/blockDefinitions.ts` — hero CTA defaults
- `src/premium-template-studio/__tests__/heroVisualCapabilities.test.tsx`, `heroCtaContextual.test.ts` — test conventions

## FILES_MODIFIED

- `src/premium-template-studio/types/index.ts` — added `CTAStyle` + `CTAContent.style`
- `src/premium-template-studio/engine/styleEngine.ts` — added `heroCtaButtonStyle`
- `src/premium-template-studio/components/blocks/HeroBlock.tsx` — consume `heroCtaButtonStyle`
- `src/premium-template-studio/components/inspector/Inspector.tsx` — `CtaStyleControls` + STYLE groups
- `src/premium-template-studio/__tests__/heroCtaStyle.test.tsx` (new)

## CTA_STYLE_SCHEMA

One nested optional object on `CTAContent`:

```ts
export interface CTAStyle {
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;   // px
  fontWeight?: number;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;     // px
  paddingX?: number;   // px
  paddingY?: number;   // px
}

export interface CTAContent {
  enabled?: boolean;
  label?: string;
  url?: string;
  icon?: string;
  style?: CTAStyle;
}
```

## CTA_STYLE_FIELDS_ADDED

`backgroundColor`, `textColor`, `fontFamily`, `fontSize`, `fontWeight`,
`borderColor`, `borderWidth`, `radius`, `paddingX`, `paddingY`.

## BACKWARD_COMPATIBILITY

Fully preserved. `style` is optional; each field overrides only its own
property. When absent, `heroCtaButtonStyle` reproduces the previous hardcoded
rendering exactly (verified by `heroCtaStyle.test.tsx` "backward compatibility"
block + legacy markup assertions). No migration required; old CTA content is
untouched.

## PRIMARY_DEFAULT_PRESERVED

theme primary background, white text, no border, `theme.buttons.radius`,
font-size 14px, font-weight 600, padding `10px 20px`.

## SECONDARY_DEFAULT_PRESERVED

transparent background, themed text (white on full-image), `1px solid` themed
border, `theme.buttons.radius`, font-size 14px, font-weight 600, padding
`10px 20px`.

## BACKGROUND_COLOR

Supported (per CTA). Present → overrides only `backgroundColor`.

## TEXT_COLOR

Supported (per CTA). Present → overrides only `color`.

## FONT_FAMILY

Supported. Reuses the canonical `FONT_OPTIONS` tokens (no arbitrary font
strings). Inspector renders a `<select>` with "Theme default" (clear) + the 6
bundled font stacks.

## FONT_SIZE

Supported (px number). Default 14.

## FONT_WEIGHT

Supported. Segmented control (Regular/Medium/Semibold/Bold/Extra). Default 600.

## BORDER_COLOR

Supported (per CTA). On a borderless primary, setting a border color switches it
to a solid border (width defaults to 1). On secondary it replaces the themed
border color.

## BORDER_WIDTH

Supported (per CTA). 0 = theme default (primary none / secondary 1px).

## BORDER_STYLE

Unsupported (see UNSUPPORTED_DESIRED_CAPABILITIES). The CTA keeps its existing
solid border; no `dashed`/`dotted` model was introduced.

## RADIUS

Supported. Default `theme.buttons.radius`.

## PADDING_X

Supported. Default 20px.

## PADDING_Y

Supported. Default 10px. (Granular px sizing; the project has no Small/Medium/
Large button preset pattern, so granular was chosen — only one sizing model.)

## PRIMARY_SECONDARY_INDEPENDENT

Yes. `style` lives on each `CTAContent`; no global theme mutation. Verified by
tests (primary/secondary patches do not touch the other; `theme.colors.primary`
and `theme.buttons.radius` remain unchanged).

## INSPECTOR_STYLE_GROUP

Existing Phase 5C1 "CTA / Button" section extended (no new Inspector). Each CTA
box now contains a `Style` subgroup: Background, Text color, Font family, Font
size, Font weight, Border color, Border width, Radius, Padding X, Padding Y, and
a "Reset style" button (sets `style` to `{}` → returns to theme defaults).

## CONTEXTUAL_FOCUS_PRESERVED

Yes. `data-inspector-focus="hero-cta"` wrapper and the one-shot focus signal are
untouched. Style edits dispatch `patchBlockField` which does not change
`selectedBlockId`, so no repeated Inspector scroll.

## PUBLIC_RENDER_PRESERVED

Yes. `heroCtaButtonStyle` is used by the shared `HeroBlock` renderer consumed by
edit Canvas, preview, and public renderer alike. Edit-mode click interception
(Phase 5C1) is unchanged.

## PUBLIC_NAVIGATION_PRESERVED

Yes. `handleCTA`/`window.open` and `safeUrl` behavior are untouched.

## CAMERA_CHANGES

None.

## PHASE4_CHANGES

None.

## PROFILE_COVER_CHANGES

None.

## PERSISTENCE_CHANGES

None.

## HISTORY_CHANGES

None (reuses existing `patchBlockField` → `setPath` → `commit`).

## ENTITLEMENT_CHANGES

None. No ProBadge, no Locked wrapper, no disabled styling controls. No existing
entitlement logic blocks these fields.

## ENGINE_V2_CHANGES

None. Engine V2 frozen.

New CTA style fields for future **ENGINE V2 — VISUAL CAPABILITY ADOPTION**
(recorded, not implemented):

- `content.primaryCTA.style.*` and `content.secondaryCTA.style.*`
  - `backgroundColor`, `textColor`, `fontFamily`, `fontSize`, `fontWeight`,
    `borderColor`, `borderWidth`, `radius`, `paddingX`, `paddingY`
  - Absent → theme/default fallback (per-field override semantics).

## TESTS

`src/premium-template-studio/__tests__/heroCtaStyle.test.tsx` — 22 tests:
style-absent legacy rendering, primary/secondary background override, text
color, font size/weight, font family, border color/width, radius, padding,
independence (no theme mutation), renderer override markup, label/url/icon
preservation + selection, primary/secondary isolation, reset-to-defaults.

Regression suites (all green): `heroCtaContextual` (6),
`heroVisualCapabilities` (14), `profileCoverContextual` (6), `visualContract`
(11), `publicRenderer` (7), `templateReducer` (11), plus `presets`,
`registryCounts`, `validation`, `savePublish`. Total 175 tests passing.

## LINT

`eslint` on all 5 touched files: 0 errors (after `prettier --write`).

## HTTP_EDITOR_SMOKE

NOT_VERIFIED (no runtime available in this environment).

## BUILD

NOT_VERIFIED (full `vite build` not run; tests + lint green).

## RUNTIME

NOT_VERIFIED — requires user runtime (see MANUAL RUNTIME GATE).

## VISUAL

NOT_VERIFIED — no visual PASS without user runtime.

## UNSUPPORTED_DESIRED_CAPABILITIES

- **Border style (solid/dashed/dotted)**: not introduced. The CTA keeps a solid
  border; `ThemeBorders.style` exists as a generic token but there is no
  established button border-style control/enum pattern to reuse, so it was left
  out rather than invented to complete a checklist.
- **Preset sizing (Small/Medium/Large)**: not introduced; granular `paddingX`/
  `paddingY` (the only sizing model chosen) is used instead.

## STOP_CONDITION_TRIGGERED

None.

## SCOPE_EXPANSION_REQUIRED

None.

## Final gate

POWER_EDITOR_PHASE5C1B_HERO_CTA_PER_BUTTON_STYLE_GATE: NOT_VERIFIED

(Code complete; automated tests + lint PASS. Final PASS requires user runtime
verification of the 13 CTA-STYLE manual gates.)
