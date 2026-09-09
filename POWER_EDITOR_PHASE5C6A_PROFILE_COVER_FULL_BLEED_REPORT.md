# POWER EDITOR PHASE 5C6A — PROFILE COVER FULL-BLEED / EDGE-TO-EDGE

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`
Task: `CRIPQER_POWER_EDITOR_PHASE_5C6A`

---

## FILES_READ

1. `src/premium-template-studio/components/canvas/ProfileHeader.tsx`
2. `src/premium-template-studio/components/inspector/Inspector.tsx`
3. `src/premium-template-studio/types/index.ts`
4. `src/premium-template-studio/engine/TemplateRenderer.tsx`
5. `src/premium-template-studio/entitlements.tsx`
6. `src/premium-template-studio/__tests__/profileCoverContextual.test.ts`

(Additional narrow context read for geometry/stacking: `engine/RenderContext.tsx`,
`constants/layouts.ts`, `__tests__/visualContract.test.tsx`.)

## FILES_MODIFIED

1. `src/premium-template-studio/types/index.ts` — added optional `banner.widthMode`.
2. `src/premium-template-studio/components/canvas/ProfileHeader.tsx` — extracted
   `ProfileBanner`; full-bleed skips the in-header banner.
3. `src/premium-template-studio/engine/TemplateRenderer.tsx` — renders `ProfileBanner`
   at page level for full-bleed; adjusts content-wrapper top spacing for overlap.
4. `src/premium-template-studio/components/inspector/Inspector.tsx` — added
   "Width" (Contained / Full Bleed) segmented control.
5. `src/premium-template-studio/__tests__/profileCoverContextual.test.ts` — added
   schema + render tests.

`entitlements.tsx` — NOT modified (read-only per scope).

---

## PROFILE_BANNER_TYPE_OWNER

`TemplateProfile.banner` — declared in `types/index.ts` (interface `TemplateProfile`,
field `banner`). Existing fields verified verbatim: `enabled`, `imageUrl`, `height`,
`mobileHeight`, `overlay`, `blur`, `gradient`, `focalX`, `focalY`, `radius`.

## PAGE_ROOT_OWNER

The `.pts-page` `<div>` returned by `TemplateRendererImpl` in
`engine/TemplateRenderer.tsx`. It carries `data-editor-target="page-background"`,
`width: 100%`, `minHeight: 100%`, `position: relative`, `overflowX: clip`, and the
page background/texture layers (`zIndex: 0` and `zIndex: 1`).

## CONTENT_GUTTER_OWNER

The inner content wrapper `<div>` (a direct child of `.pts-page`) with:

- `maxWidth: contentWidth + (columns > 1 ? 180 : 0)`
- `margin: "0 auto"` (centering offset)
- `padding: ${rule.padding + 12}px ${rule.padding}px ${rule.padding + 48}px`
  (top + left/right gutters)

This single wrapper produces the left, right and top gutters around the current
contained cover.

## BANNER_DOM_OWNER

`ProfileBanner` (exported from `components/canvas/ProfileHeader.tsx`). Rendered:

- **contained**: inside `ProfileHeader` → inside the content wrapper.
- **full-bleed**: as a direct child of `.pts-page`, before the content wrapper.

---

## WIDTH_MODE_FIELD

`profile.banner.widthMode` — additive optional field, type `"contained" | "full-bleed"`.

## DEFAULT_BACKWARD_COMPATIBILITY

Absent field ⇒ semantically `"contained"`. Enforced at two points:

- Render: `fullBleed = banner.enabled && banner.widthMode === "full-bleed"` (false when absent).
- Inspector: `value={banner.widthMode ?? "contained"}`.

Existing saved profiles with no `widthMode` render EXACTLY as before (banner stays
inside the header / content wrapper).

---

## CONTAINED_RENDER_BEHAVIOR

Unchanged. `ProfileBanner` renders inside `ProfileHeader` (inside the content wrapper),
preserving the exact legacy banner geometry (padding gutters, `maxWidth` + `0 auto`
centering, `borderRadius: banner.radius`).

## FULL_BLEED_RENDER_BEHAVIOR

`ProfileBanner` renders as a direct child of `.pts-page`, before the content wrapper.
It is a block element filling 100% of `.pts-page` width, with `zIndex: 2` (above the
texture layer at `zIndex: 1` and background layer at `zIndex: 0`). No `100vw`, no
browser-viewport math, no negative-margin breakout, no second layout owner.

## TOP_EDGE_BEHAVIOR

The banner is the first child of `.pts-page`, so its top edge is flush with the page
top edge (no top gutter). For `overlap` header mode the content wrapper is pulled up
(`marginTop: -profile.avatar.overlap`, top padding `0`) so the avatar continues to
overlap the banner; otherwise the content wrapper keeps its normal top padding.

## LEFT_RIGHT_EDGE_BEHAVIOR

Flush with the page left/right edges because the banner is a full-width child of
`.pts-page` — no longer constrained by the content wrapper's `maxWidth`,
`margin: 0 auto`, or `padding`.

## RADIUS_BEHAVIOR

- contained: `borderRadius: banner.radius` (unchanged).
- full-bleed: `borderRadius: 0 0 ${banner.radius}px ${banner.radius}px` — top corners
  square (no visible page gutter), bottom corners keep the existing radius contract.
  No new per-corner schema was added.

---

## HEIGHT_PRESERVATION

`banner.height` (desktop/tablet) and `banner.mobileHeight` (mobile) are read unchanged
inside `ProfileBanner` via the active breakpoint. Contained ↔ full-bleed preserves the
chosen height. Tall covers are supported (no fixed aspect ratio; slider range untouched).

## MOBILE_HEIGHT_PRESERVATION

Preserved — `mobileHeight` drives the banner height on the mobile breakpoint in both modes.

## IMAGE_REGRESSION

None. Image upload/change/remove, `objectFit`, gradient fallback all unchanged (moved
verbatim into `ProfileBanner`).

## FOCAL_REGRESSION

None. `objectPosition: ${focalX}% ${focalY}%` preserved.

## BLUR_REGRESSION

None. `filter: blur(...)` + `transform: scale(1.06)` preserved.

## OVERLAY_REGRESSION

None. Solid / gradient overlay and `banner.overlay` preserved.

## PROFILE_CONTEXTUAL_REGRESSION

None. `ProfileBanner` retains `data-editor-target="profile-cover"` and cover selection
(`onSelectProfileTarget` → `onSelectProfileCover` → `requestInspectorFocus`). Avatar and
Bio contextual targets in `ProfileHeader` are untouched. Inspector "Cover / Banner"
section remains the `profile-cover` focus anchor; the new Width control lives inside it.

---

## ENTITLEMENT_RESULT

`profile.banner.*` → `EDIT_AVATAR_BANNER` (`entitlements.tsx` `intentForConfigPath`).
Under the early-access policy (`editing_capabilities: OPEN`) this path is ALLOW. The new
`profile.banner.widthMode` mutation reaches Studio state through the existing guarded
`patch` dispatch — no new local entitlement bypass was added, and `entitlements.tsx` was
not modified.

## CAMERA_CHANGES

None.

## CANONICAL_CHANGES

None. Additive optional field only; no reducer change, no `TemplateProfile` rewrite,
no `ProfileCoverV2`, no parallel state.

## PERSISTENCE_CHANGES

None. No new DB field/migration; no save/history coordinator changes.

## ENGINE_V2_CHANGES

None.

---

## TESTS

`npx vitest run src/premium-template-studio/__tests__/profileCoverContextual.test.ts` → **13 passed**.

New coverage:

- schema: missing `widthMode` defaults semantically to contained (absent).
- schema: `contained` accepted; `full-bleed` accepted via canonical `patch`.
- schema: `widthMode` patch preserves height / mobileHeight / imageUrl / focal / blur / overlay / radius.
- render: contained keeps `border-radius:18px` and never squares the top.
- render: full-bleed renders `border-radius:0 0 18px 18px`.
- render: full-bleed never emits `100vw`.
- render: full-bleed preserves `height`, `object-position` (focal) and `blur`.

Regression suites (unchanged, passing): `visualContract.test.tsx`,
`publicRenderer.test.ts`, `pageBackgroundContextual.test.tsx` → **63 passed**.

## LINT

NOT_VERIFIED — `tsc --noEmit` timed out on the full project (30s tool limit). The
touched code was manually reviewed for type consistency; vitest transform + runtime
tests all pass.

## RUNTIME

NOT_VERIFIED — manual runtime gate pending user confirmation.

## VISUAL

NOT_VERIFIED — manual runtime gate pending user confirmation.

## STOP_TRIGGERED

false

---

## MANUAL RUNTIME GATE (COVERWIDTH-01 … COVERWIDTH-15)

Pending user runtime confirmation. Key checks:

- COVERWIDTH-01 Contained matches current accepted cover.
- COVERWIDTH-02/03/04 Full Bleed touches page left/right/top edges using PAGE width only (not viewport).
- COVERWIDTH-05 Switching back to Contained restores the previous presentation.
- COVERWIDTH-06…10 Height / image / focal / blur / overlay keep working (tall cover OK).
- COVERWIDTH-11/12/13 Avatar / Bio / Cover contextual Inspector still centers.
- COVERWIDTH-14 Zoom keeps full-bleed geometry page-relative.
- COVERWIDTH-15 Public/preview renders full-bleed correctly.

---

## FINAL_GATE

`POWER_EDITOR_PHASE5C6A_PROFILE_COVER_FULL_BLEED_GATE` → **NOT_VERIFIED**

Final PASS requires user runtime confirmation that Full-Bleed Cover visibly reaches the
Cripqer PAGE left/right/top edges while normal page content remains contained and
existing Cover controls continue working.
