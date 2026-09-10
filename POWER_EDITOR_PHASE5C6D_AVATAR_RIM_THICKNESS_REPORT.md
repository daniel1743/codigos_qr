# POWER EDITOR PHASE 5C6D — PROFILE AVATAR RIM THICKNESS

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`
Task: `CRIPQER_POWER_EDITOR_PHASE_5C6D`

---

## FILES_READ

1. `src/premium-template-studio/components/canvas/ProfileHeader.tsx` (avatar render)
2. `src/premium-template-studio/components/inspector/Inspector.tsx` (Avatar section)
3. `src/premium-template-studio/types/index.ts` (TemplateProfile.avatar.rim)
4. `src/premium-template-studio/__tests__/profileCoverContextual.test.ts`

## FILES_MODIFIED

1. `src/premium-template-studio/types/index.ts` — added additive optional `rim.width`.
2. `src/premium-template-studio/components/canvas/ProfileHeader.tsx` — added a single
   `RIM_THICKNESS_PX` mapping constant and used it for the rim border width.
3. `src/premium-template-studio/components/inspector/Inspector.tsx` — added
   "Rim Thickness" (Thin / Medium / Thick) segmented control; existing Rim/Color
   patches now carry `width` so toggling/color never reset the thickness.
4. `src/premium-template-studio/__tests__/profileCoverContextual.test.ts` — added
   schema / preservation / state / render tests.

No new files. `TemplateRenderer.tsx`, camera, persistence, reducer, Engine V2 and
Basic Editor were NOT touched.

---

## RIM_WIDTH_DATA_MODEL

Additive optional field inside the existing `rim` object (no duplicate thickness
concept, no `avatar.rimWidth`, no required field, no migration):

```ts
rim?: {
  enabled: boolean;
  color: string;
  width?: "thin" | "medium" | "thick";  // absent ⇒ "medium"
};
```

Ownership: `profile.avatar.rim.width`.

## THIN_MAPPING

`thin` → **2px** (small/subtle ring).

## MEDIUM_MAPPING

`medium` → **4px** (balanced default ring). This matches the legacy `borderWidth`
default, so `absent_width = medium` renders identically to the approved 5C6C rim.

## THICK_MAPPING

`thick` → **8px** (clearly stronger ring).

All three are visibly distinguishable at normal editor zoom and never extreme enough
to shrink avatar content. The mapping lives in ONE module-scope constant
`RIM_THICKNESS_PX` in `ProfileHeader.tsx`, so Inspector (semantic labels) and Canvas
(pixels) cannot drift apart.

## LEGACY_BORDERWIDTH_PRESERVATION

`avatar.borderWidth` is **not** repurposed or deleted. It remains the width of the
legacy background-colored "knockout" border shown when Rim is OFF. When Rim is ON the
rim uses `RIM_THICKNESS_PX[width]` instead, leaving `borderWidth`'s original purpose
untouched.

## RIM_COLOR_PRESERVATION

Every rim patch (toggle / color / thickness) writes the whole `rim` object carrying
the current `color`, so changing thickness never resets the color.

## RIM_ENABLED_PRESERVATION

Same principle: every patch carries `enabled`, so changing thickness never toggles
the rim.

## AVATAR_SHADOW_COMPATIBILITY

`avatar.shadow` and its `boxShadow` style are untouched; shadow + rim coexist.

## SHAPE_COMPATIBILITY

The rim uses the existing `avatar.radius`, so it follows the current shape at any
thickness.

## COVER_REGRESSION

None. `banner.widthMode`, `banner.blendFade`, and all Cover data are untouched
(verified by the preservation test).

---

## CANONICAL_TYPE_CHANGE

Additive optional `avatar.rim.width` only. No `TemplateProfile` rewrite, no reducer change.

## PERSISTENCE_CHANGES

None. No DB field/migration; no save/history coordinator changes.

## ENGINE_V2_CHANGES

None.

## ENGINE_V2_CAPABILITY_REGISTERED

`Profile Avatar Rim` — parameters `enabled`, `color`, `width` (`thin` | `medium` |
`thick`). Future Engine V2 may choose rim presence/color/thickness per branding,
contrast, avatar shape and page style (e.g. editorial → thin/medium, bold creator →
medium/thick, minimal → off/thin). Rim remains an intentional design choice, never
added merely because the capability exists.

---

## TESTS

`npx vitest run src/premium-template-studio/__tests__/profileCoverContextual.test.ts` → **36 passed**.

New coverage (8 tests):

- schema: `rim.width` accepts thin / medium / thick.
- schema: missing width is absent (semantically medium).
- preservation: changing width preserves `rim.enabled`, `rim.color`, size, radius,
  borderWidth, shadow, overlap, align, avatarUrl, and Cover widthMode + blendFade.
- state: Thick → OFF → ON returns Thick.
- render: thin/medium/thick produce 2px/4px/8px rims in the same color.
- render: missing width renders medium (4px).
- render: Rim OFF ignores thickness visually.
- render: rim follows shape and avatar shadow remains visible.

Regression suites (unchanged, passing): `visualContract.test.tsx`,
`pageBackgroundContextual.test.tsx` → **49 passed**.

## RUNTIME

NOT_VERIFIED — manual runtime gate pending user confirmation.

## VISUAL

NOT_VERIFIED — manual runtime gate pending user confirmation.

## STOP_TRIGGERED

false

---

## MANUAL RUNTIME GATE (RIMWIDTH-01 … RIMWIDTH-10)

Pending user runtime confirmation. Key checks:

- RIMWIDTH-01 Rim ON → Rim Thickness control appears.
- RIMWIDTH-02/03/04 Thin < Medium < Thick visibly distinguishable.
- RIMWIDTH-05 Changing color keeps thickness.
- RIMWIDTH-06 Thick → OFF → ON returns Thick.
- RIMWIDTH-07 Shadow + Rim coexist.
- RIMWIDTH-08 Shape change → thickness follows new shape.
- RIMWIDTH-09 Image change → rim settings remain.
- RIMWIDTH-10 Preview/public render matches.

---

## FINAL_GATE

`POWER_EDITOR_PHASE5C6D_AVATAR_RIM_THICKNESS_GATE` → **NOT_VERIFIED**

Final PASS requires user runtime confirmation that Thin / Medium / Thick visibly
differ while Rim ON/OFF, Rim Color, Avatar Shadow, Avatar data and Cover data remain
intact.
