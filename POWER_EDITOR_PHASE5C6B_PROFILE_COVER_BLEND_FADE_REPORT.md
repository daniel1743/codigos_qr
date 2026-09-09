# POWER EDITOR PHASE 5C6B — PROFILE COVER BLEND / FADE WITH PAGE BACKGROUND

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`
Task: `CRIPQER_POWER_EDITOR_PHASE_5C6B`

---

## FILES_READ

1. `src/premium-template-studio/components/canvas/ProfileHeader.tsx` (ProfileBanner render)
2. `src/premium-template-studio/components/inspector/Inspector.tsx` (Cover / Banner section)
3. `src/premium-template-studio/types/index.ts` (TemplateProfile.banner)
4. `src/premium-template-studio/__tests__/profileCoverContextual.test.ts`

## FILES_MODIFIED

1. `src/premium-template-studio/types/index.ts` — added additive optional `banner.blendFade`.
2. `src/premium-template-studio/components/canvas/ProfileHeader.tsx` — applied a
   non-destructive CSS mask to the `ProfileBanner` clipping container when fade is on.
3. `src/premium-template-studio/components/inspector/Inspector.tsx` — added
   "Blend with Page" toggle + "Fade Distance" / "Fade Strength" sliders.
4. `src/premium-template-studio/__tests__/profileCoverContextual.test.ts` — added
   schema / preservation / render tests.

No new files. `entitlements.tsx`, `TemplateRenderer.tsx`, `RenderContext.tsx`,
camera, page-background schema, persistence and Engine V2 were NOT touched.

---

## BLEND_FADE_DATA_MODEL

Additive optional field on the existing `profile.banner` object (no
`TemplateProfile` rewrite, no `ProfileBannerV2`, no parallel config):

```ts
blendFade?: {
  enabled: boolean;   // off by default
  distance: number;   // vertical px of the cover that participates in the fade
  strength: number;   // 0..1 — how strongly the bottom edge disappears
};
```

Ownership: `profile.banner.blendFade`. No existing equivalent field was found, so no
duplicate concept was introduced.

## BACKWARD_COMPATIBILITY

Absent `blendFade` ⇒ no mask is emitted ⇒ the Cover renders exactly as approved in
5C6A. Render default: `fadeEnabled = banner.blendFade?.enabled === true`. Inspector
reads `banner.blendFade?.enabled ?? false` and default distance 80 / strength 1 only
when writing the object.

---

## RENDER_OWNER

`ProfileBanner` in `components/canvas/ProfileHeader.tsx`. The image and the overlay
share the single outer clipping `<div>` (the element with `overflow: hidden`,
`borderRadius`, `height`). The mask is applied to that one container, so both the
image and its overlay fade together — no second layer, no fake footer strip.

## FADE_IMPLEMENTATION

Non-destructive CSS mask on the clipping container (image asset is never modified):

```
WebkitMaskImage / maskImage:
  linear-gradient(180deg, #000 0%, #000 calc(100% - {distance}px), rgba(0,0,0,{1-strength}) 100%)
```

- Opaque through the top portion, fading to `1 - strength` alpha at the bottom.
- `distance` controls the vertical span of the transition; `strength` controls how
  far the bottom disappears.
- `-webkit-mask-image` + `mask-image` both emitted for Safari + standards support.
- Only emitted when `enabled` is true; otherwise no mask key at all.

## PAGE_BACKGROUND_INTERACTION

The mask fades the cover to transparency, so whatever the page background actually is
(Solid / Gradient / Image / Pattern — 5C5, frozen) remains the authority and shows
through. No page-background values are read, copied, or duplicated into banner state.
No hardcoded black/white gradient; no guessed page color; no color sampling.

---

## CONTAINED_PRESERVATION

Contained geometry is untouched — the mask only fades the bottom alpha. `widthMode:
"contained"` (and its radius/padding/centering) is unchanged.

## FULL_BLEED_PRESERVATION

Full-Bleed geometry (flush left/right/top via page-level `ProfileBanner`) is
untouched. `zIndex: 2`, `borderRadius: 0 0 {r}px {r}px`, and top/left/right reach are
unchanged. Blend is a purely vertical alpha mask.

## IMAGE_PRESERVATION

Image asset and `imageUrl` are never modified. Fade is a render-only mask; no pixel
editing, no replacement image, no flattened asset.

## HEIGHT_PRESERVATION

`banner.height` unchanged; the mask is relative to the existing container height and
scales with any height (tall covers supported).

## MOBILE_HEIGHT_PRESERVATION

`banner.mobileHeight` unchanged; the mobile breakpoint reads the same fields.

## FOCAL_PRESERVATION

`objectPosition: ${focalX}% ${focalY}%` unchanged.

## BLUR_PRESERVATION

`filter: blur(...)` + `transform: scale(1.06)` unchanged. (Blur is unrelated to fade.)

## OVERLAY_PRESERVATION

Solid / gradient overlay and `banner.overlay` unchanged; the overlay fades with the
image because both share the masked container.

## RADIUS_PRESERVATION

`banner.radius` contract is preserved verbatim (contained keeps `radius`; full-bleed
keeps `0 0 {r}px {r}px`). No per-corner schema, no radius reset. The fade is a render
layer only, so bottom radius + fade coexist without erasing the stored radius.

## WIDTH_MODE_PRESERVATION

`widthMode` is never written by the blend controls. Each blend patch carries only the
`blendFade` object (with the other blend fields merged in), never touching widthMode.

---

## CONTEXTUAL_REGRESSION

None. `ProfileBanner` still emits `data-editor-target="profile-cover"` and the same
cover selection chain. Avatar / Bio contextual targets are untouched.

## CAMERA_CHANGES

None.

## CANONICAL_TYPE_CHANGE

Additive optional `banner.blendFade` only. No reducer / `TemplateProfile` rewrite.

## PERSISTENCE_CHANGES

None. No DB field/migration; no save/history coordinator changes.

## ENGINE_V2_CHANGES

None.

---

## TESTS

`npx vitest run src/premium-template-studio/__tests__/profileCoverContextual.test.ts` → **20 passed**.

New coverage (7 tests):

- schema: `blendFade` absent is backward compatible.
- schema: `blendFade` accepted via canonical `patch` (enabled/distance/strength).
- schema: `blendFade` patch preserves every other banner field (enabled, imageUrl,
  height, mobileHeight, overlay, blur, gradient, focalX/Y, radius, widthMode).
- render: blend disabled emits no `mask-image`.
- render: blend enabled emits `mask-image:linear-gradient` + `-webkit-mask-image`.
- render: full-bleed geometry unchanged when blend on (radius `0 0 18px 18px`, no `100vw`).
- render: contained geometry unchanged when blend on.

Regression suites (unchanged, passing): `visualContract.test.tsx`,
`pageBackgroundContextual.test.tsx` → **49 passed**.

## LINT

NOT_VERIFIED — `tsc --noEmit` times out on the full project (30s tool limit). Code was
manually reviewed for type consistency; `maskImage`/`WebkitMaskImage` accept template
strings (csstype `(string & {})`), matching the existing `backgroundImage` usage.
vitest transform + runtime tests all pass.

## RUNTIME

NOT_VERIFIED — manual runtime gate pending user confirmation.

## VISUAL

NOT_VERIFIED — manual runtime gate pending user confirmation.

## STOP_TRIGGERED

false

---

## MANUAL RUNTIME GATE (FADE-01 … FADE-14)

Pending user runtime confirmation. Key checks:

- FADE-01/02 Enable/disable Blend — lower cover edge merges into the page background; disabling restores exact 5C6A.
- FADE-03/04 Distance / Strength sliders visibly respond.
- FADE-05/06/07 Fade reveals the REAL Solid / Gradient / Pattern page background.
- FADE-08 Contained ↔ Full Bleed preserves blend values + widthMode, no resets.
- FADE-09/10 Image / focal / blur / overlay keep working; blend persists.
- FADE-11 Tall cover still fades correctly.
- FADE-12 Cover / Avatar / Bio contextual selection exact.
- FADE-13 Zoom — no camera/geometry regression.
- FADE-14 Public/preview renders the same fade.

---

## FINAL_GATE

`POWER_EDITOR_PHASE5C6B_PROFILE_COVER_BLEND_FADE_GATE` → **NOT_VERIFIED**

Final PASS requires user runtime confirmation that Blend/Fade visibly merges the Cover
lower edge into the REAL Page Background while preserving every previously approved
Cover setting and 5C6A geometry.

