# POWER EDITOR PHASE 5B2 — PROFILE COVER / BANNER CONTEXTUAL EDITING V1

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`

## Summary

Makes the top profile cover/banner directly clickable and editable. Clicking the
cover clears any block selection and scrolls ONLY the Inspector to a new
"Cover / Banner" section, which exposes the existing canonical `profile.banner`
fields. No new schema, no camera change, no entitlement change, no second global
selection architecture.

---

## FILES_READ

- `src/premium-template-studio/components/canvas/ProfileHeader.tsx`
- `src/premium-template-studio/engine/RenderContext.tsx`
- `src/premium-template-studio/engine/TemplateRenderer.tsx`
- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
- `src/premium-template-studio/state/StudioProvider.tsx`
- `src/premium-template-studio/state/templateReducer.ts`
- `src/premium-template-studio/types/index.ts`
- `src/lib/product-entitlements/capabilities.ts`
- `src/lib/product-entitlements/mutation-guard.ts`
- `src/premium-template-studio/entitlements.tsx`
- `src/premium-template-studio/components/inspector/inspectorScroll.ts`
- `src/premium-template-studio/components/ui/controls.tsx`
- `src/premium-template-studio/components/blocks/primitives.tsx`

## FILES_MODIFIED

- `src/premium-template-studio/engine/RenderContext.tsx` — added `onSelectProfileCover`
- `src/premium-template-studio/engine/TemplateRenderer.tsx` — plumbed `onSelectProfileCover`
- `src/premium-template-studio/components/canvas/ProfileHeader.tsx` — banner click + cursor
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx` — wired the handler
- `src/premium-template-studio/components/inspector/inspectorFocus.ts` (new) — one-shot focus signal
- `src/premium-template-studio/components/inspector/Inspector.tsx` — Cover section + focus scroll
- `src/premium-template-studio/__tests__/profileCoverContextual.test.ts` (new)

## PROFILE_COVER_RENDER_OWNER

`components/canvas/ProfileHeader.tsx` — the `<header>` banner div, rendered inside
`TemplateRenderer` above the block grid.

## PROFILE_COVER_DATA_OWNER

`TemplateProfile.banner` in `types/index.ts`.

## CURRENT_PROFILE_COVER_FIELDS

`enabled`, `imageUrl?`, `height`, `mobileHeight`, `overlay` (0..1), `blur`,
`gradient` (overlay scrim solid vs gradient), `focalX`, `focalY`, `radius`.

## COVER_CANVAS_CLICK_CONTEXT

Previously: none — the banner had no click handler (clicking bubbled to the page
deselect). Now, in edit mode, the banner `onClick` calls `onSelectProfileCover`,
which: (1) dispatches `selectBlock` → `null` (clears block selection so the
Profile inspector shows), and (2) `requestInspectorFocus("profile-cover")`.

## INSPECTOR_COVER_TARGET

A `data-inspector-focus="profile-cover"` wrapper around the new `Section
title="Cover / Banner"` at the top of `ProfileInspector`. The Inspector scrolls
its own container to that element on the focus request.

## REPEATED_SCROLL_PREVENTED

`requestInspectorFocus` fires only from the explicit click handler — never on
render, edit, image load, ResizeObserver, or canvas zoom. `shouldScrollInspectorToFocus`
is a pure, unit-tested predicate (non-null → scroll once; null → never). The
existing Phase 5A `shouldResetInspectorScroll` behavior is unchanged.

## IMAGE_CHANGE

`AssetField` (TextInput URL + "Replace"/"Upload") → `profile.banner.imageUrl`.

## IMAGE_UPLOAD

`adapters.assets.upload` via the existing `AssetField` — no second upload system.

## IMAGE_REMOVE

`AssetField` "Remove" → `adapters.assets.remove` + `onChange("")` → clears
`profile.banner.imageUrl` (falls back to the gradient placeholder).

## SOLID_BACKGROUND

NOT SUPPORTED. Requires a new field `profile.banner.backgroundColor?: string`
plus a `ProfileHeader` renderer branch (replace the hardcoded
`linear-gradient(120deg, primary, accent)` fallback).

## GRADIENT_BACKGROUND

NOT SUPPORTED. Requires `profile.banner.backgroundGradient?: { from; to; angle }`
plus a renderer change. Note: `banner.gradient` is the OVERLAY scrim toggle, not
a background gradient — the two are distinct.

## BACKGROUND_IMAGE

SUPPORTED via `profile.banner.imageUrl` (the cover image itself). The no-image
fallback gradient is not separately controllable.

## IMAGE_FIT

NOT SUPPORTED (renderer hardcodes `objectFit: "cover"`). Requires
`profile.banner.fit?: "cover" | "contain"` plus a renderer change.

## IMAGE_POSITION

SUPPORTED via `profile.banner.focalX` / `focalY` (canonical focal model), mapped
to a 3×3 `PositionGrid` (center/top/bottom/left/right/corners).

## FULL_WIDTH

NOT SUPPORTED (banner always spans the profile-header width). Requires
`profile.banner.fullWidth?: boolean` (or an `inset`/`width` field) plus a
`ProfileHeader` renderer change.

## INSET

NOT SUPPORTED (same as above).

## OVERLAY

SUPPORTED — `banner.overlay` (intensity 0..1).

## OVERLAY_OPACITY

SUPPORTED — `banner.overlay` (NumberSlider 0..1, step 0.05).

## FIXED_PARALLAX

Out of scope (later capability, not implemented).

## BLEND_WITH_PAGE

Out of scope (later capability, not implemented).

## SCHEMA_CHANGES

None. No new canonical fields; all controls write existing `profile.banner.*`.

## RENDERER_CHANGES

`ProfileHeader` banner gains an edit-mode `onClick` + `cursor: pointer`;
`TemplateRenderer`/`RenderContext` plumb the `onSelectProfileCover` callback.

## CAMERA_CHANGES

None. `PowerCanvasViewport`, camera math, Stage geometry, fitZoom/userZoom, and
Canvas scroll ownership are untouched.

## PHASE4_CHANGES

None.

## HERO_5B1_CHANGES

None. `HeroBlock` and its 5B1 fields were not modified.

## PERSISTENCE_CHANGES

None. Writes flow through the existing `patch` / guarded dispatch path.

## ENTITLEMENT_CHANGES

None. `profile.banner.*` maps to `EDIT_AVATAR_BANNER` → capability `avatar_banner`,
which is in `CORE_FREE_CAPABILITIES` (ALLOW at Free tier). No `Locked`/`ProBadge`
wrapper blocks these controls, so no STOP was required.

## TESTS

`profileCoverContextual.test.ts` (6 tests, passing):
- `shouldScrollInspectorToFocus` targeting decision is stable (non-null only)
- focus signal delivers once and unsubscribes
- clearing block selection (cover context) does not mutate config/history
- editing cover image does not reset profile identity or blocks
- editing cover overlay only changes the overlay
- normal block selection still works after a cover context

Regression: `visualContract`, `heroVisualCapabilities` (5B1), `templateReducer`,
`publicRenderer` all pass (71 tests across the batch).

## LINT

Only pre-existing `prettier` (CRLF/LF) nits and a pre-existing
`react-refresh/only-export-components` warning on `RenderContext.tsx`. No new
semantic/type errors.

## HTTP_EDITOR_SMOKE

NOT_VERIFIED — no dev server was started in this session.

## BUILD

NOT_VERIFIED — `vite build` was not executed.

## RUNTIME

Not executed here (requires the browser editor). The click→scroll flow and
Cover controls are wired and covered by pure/reducer tests.

## VISUAL

NOT_VERIFIED — requires user runtime.

## UNSUPPORTED_DESIRED_CAPABILITIES

- Solid background color — needs `profile.banner.backgroundColor` + renderer.
- Background gradient — needs `profile.banner.backgroundGradient` + renderer.
- Cover/Contain image fit — needs `profile.banner.fit` + renderer.
- Full-width vs inset — needs `profile.banner.fullWidth`/`inset` + renderer.
- Fixed/parallax, blend-with-page — later capability (out of scope).

## STOP_CONDITION_TRIGGERED

None. Entitlements allow (avatar_banner is CORE_FREE); no StudioProvider,
reducer, camera, or persistence change was required.

## SCOPE_EXPANSION_REQUIRED

None.

---

## Final gate

**POWER_EDITOR_PHASE5B2_PROFILE_COVER_CONTEXTUAL_EDITING_GATE: NOT_VERIFIED**

(Implementation + targeted tests + regression tests are complete and passing;
final PASS is withheld pending user runtime visual verification and a
build/smoke execution.)
