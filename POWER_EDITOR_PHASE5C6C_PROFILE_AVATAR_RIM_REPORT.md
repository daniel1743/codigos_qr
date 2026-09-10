# POWER EDITOR PHASE 5C6C — PROFILE AVATAR RIM

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`
Task: `CRIPQER_POWER_EDITOR_PHASE_5C6C`

---

## FILES_READ

1. `src/premium-template-studio/components/canvas/ProfileHeader.tsx` (avatar render)
2. `src/premium-template-studio/components/inspector/Inspector.tsx` (Avatar section)
3. `src/premium-template-studio/types/index.ts` (TemplateProfile.avatar)
4. `src/premium-template-studio/__tests__/profileCoverContextual.test.ts`

## FILES_MODIFIED

1. `src/premium-template-studio/types/index.ts` — added additive optional `avatar.rim`.
2. `src/premium-template-studio/components/canvas/ProfileHeader.tsx` — recolors the
   existing avatar border when rim is on; adds a rim border to the letter fallback.
3. `src/premium-template-studio/components/inspector/Inspector.tsx` — added "Rim"
   toggle + "Rim Color" color input in the Avatar contextual section.
4. `src/premium-template-studio/__tests__/profileCoverContextual.test.ts` — added
   schema / preservation / state / render tests.

No new files. `TemplateRenderer.tsx`, camera, persistence, reducer, Engine V2 and
Basic Editor were NOT touched.

---

## AVATAR_MODEL_OWNER

`TemplateProfile.avatar` in `types/index.ts`. Existing fields (verified verbatim):
`size`, `radius`, `borderWidth`, `shadow`, `overlap`, `align`; plus the sibling
top-level `profile.avatarUrl`.

## EXISTING_RIM_FIELD_FOUND

Yes — partially. `avatar.borderWidth` already exists and is the existing
border/thickness field. The avatar `<img>` already renders
`border: {borderWidth}px solid theme.colors.background` (a background-colored
"knockout" ring). There was NO existing enabled/color rim field, so the rim adds
`enabled` + `color` while **reusing `borderWidth` as the thickness** (no new width
field/control added per the "optional_width" rule).

## RIM_DATA_MODEL

Additive optional field on the existing `avatar` object (no rewrite, no parallel
avatar config, no required field):

```ts
rim?: {
  enabled: boolean;
  color: string;
};
```

Ownership: `profile.avatar.rim`. No duplicate `border`/`stroke` concept was created.

## BACKWARD_COMPATIBILITY

Absent `rim` ⇒ `rimEnabled = false` ⇒ the image avatar keeps its existing
`theme.colors.background` border and the letter fallback stays borderless — i.e. the
current approved avatar renders exactly as before. `rimColor` defaults to
`theme.colors.background` when absent (never used while disabled).

---

## RIM_RENDER_IMPLEMENTATION

Non-destructive render styling (no pixel editing, no new image, no extra wrapper):

- Image avatar: the existing border is recolored —
  `border: {borderWidth}px solid {rimEnabled ? rimColor : theme.colors.background}`.
- Letter fallback avatar: a rim border is added only when enabled —
  `border: rimEnabled ? "{borderWidth}px solid {rimColor}" : undefined`.

`box-sizing` is left as-is, so toggling the rim never changes the image avatar's
layout (its border already exists); the letter fallback gains a border only while the
rim is on (mirroring the image avatar's existing size+border geometry).

## SHAPE_COMPATIBILITY

The rim uses the existing `borderRadius` of the avatar, so it follows the current
shape: circular → circular rim, rounded-square → same rounded-square, square →
square. No circular ring is forced on non-circular avatars.

---

## IMAGE_PRESERVATION

`avatarUrl` is never modified; rim is render-only.

## SHAPE_PRESERVATION

`avatar.radius` untouched; rim reuses it.

## SIZE_PRESERVATION

`avatar.size` untouched.

## POSITION_PRESERVATION

`avatar.align` untouched.

## OVERLAP_PRESERVATION

`avatar.overlap` untouched.

## RIM_COLOR_PRESERVATION

Turning Rim off writes `enabled: false` while carrying the existing color, and the
Inspector's `Rim Color` control reads the stored color — so ON → color A → OFF → ON
restores color A. (Verified by a dedicated state test.)

## COVER_REGRESSION

None. `banner.widthMode`, `banner.blendFade`, and all Cover data are untouched
(verified by the preservation test).

## CONTEXTUAL_REGRESSION

None. The Avatar remains `data-editor-target="profile-avatar"`; Cover and Bio targets
are untouched. The Rim controls live inside the existing `profile-avatar`
contextual section, so Canvas ↔ Inspector focus is unchanged.

---

## CANONICAL_TYPE_CHANGE

Additive optional `avatar.rim` only. No `TemplateProfile` rewrite, no reducer change.

## PERSISTENCE_CHANGES

None. No DB field/migration; no save/history coordinator changes.

## CAMERA_CHANGES

None.

## ENGINE_V2_CHANGES

None.

## ENGINE_V2_CAPABILITY_REGISTERED_FOR_FUTURE_HANDOFF

`Profile Avatar Rim` — parameters `enabled`, `color`. Future Engine V2 may choose a
rim as an intentional design decision (e.g. premium/editorial coordinated rim,
high-contrast accent rim, or no rim for minimal pages). Engine must never add a rim
merely because the capability exists.

---

## TESTS

`npx vitest run src/premium-template-studio/__tests__/profileCoverContextual.test.ts` → **28 passed**.

New coverage (8 tests):

- schema: rim absent is backward compatible.
- schema: rim accepted via canonical `patch` (enabled + color).
- preservation: rim patch preserves size / radius / borderWidth / shadow / overlap /
  align / avatarUrl, and leaves banner `widthMode` + `blendFade` untouched.
- state: ON → color A → OFF → ON preserves color A.
- render: rim OFF renders no colored rim.
- render: rim ON renders the selected color.
- render: rim follows the avatar shape (radius preserved).
- render: changing color changes the render styling.

Regression suites (unchanged, passing): `visualContract.test.tsx`,
`pageBackgroundContextual.test.tsx` → **49 passed**.

## LINT

NOT_VERIFIED — `tsc --noEmit` times out on the full project (30s tool limit). Code was
manually reviewed for type consistency; `rim` is optional with a `??` default at the
read sites, and the `patch` helper writes the whole `rim` object. vitest transform +
runtime tests all pass.

## RUNTIME

NOT_VERIFIED — manual runtime gate pending user confirmation.

## VISUAL

NOT_VERIFIED — manual runtime gate pending user confirmation.

## STOP_TRIGGERED

false

---

## MANUAL RUNTIME GATE (RIM-01 … RIM-12)

Pending user runtime confirmation. Key checks:

- RIM-01 Click Avatar → exact Avatar Inspector centers.
- RIM-02/03/04 Rim ON appears; red then another color updates immediately.
- RIM-05/06 Rim OFF disappears (avatar otherwise identical); ON restores previous color.
- RIM-07 Shape change → rim follows geometry.
- RIM-08 Image change does not reset the rim.
- RIM-09 Size / position / overlap still work with rim intact.
- RIM-10 Full-Bleed + Blend/Fade cover unchanged by the avatar rim.
- RIM-11 Zoom → no camera changes.
- RIM-12 Preview/public render identical.

---

## FINAL_GATE

`POWER_EDITOR_PHASE5C6C_PROFILE_AVATAR_RIM_GATE` → **NOT_VERIFIED**

PASS requires user runtime confirmation that Rim ON/OFF and Rim Color visibly work
while every existing avatar and Cover setting remains intact.
