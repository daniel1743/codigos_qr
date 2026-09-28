# CRIPQER — M2.2 — HERO FRAME SHAPE EXPANSION

Status: `PASS`

## Scope

The existing Magic-facing Hero frame control now supports nine persisted
values:

`curve`, `straight`, `inset`, `curve-deep`, `curve-up`, `curve-up-deep`,
`wave`, `wave-double`, and `arch`.

The implementation stays inside the existing `HeroFrame`, `useSelectionActions`
and Magic `PageDoc` prop path. No route, editor context, renderer, document
format, Power Editor surface, Affiliate feature, or unrelated visual behavior
was added.

## Implementation

- `HeroFrame.tsx` extends the existing `HeroShape` contract and adds a pure
  `heroFrameMediaShapeStyle()` mapper for the six new silhouettes.
- The three legacy values preserve their previous rendering path exactly;
  new shapes are additive visual styles on the existing Hero media boundary.
- `HeroFrameShapePicker.tsx` exposes all nine options from the existing
  `Portada > Forma` action. The picker uses buttons and has no overlay or
  pointer-intercepting decoration layer.
- `useSelectionActions.tsx` replaces the old three-value Hero segmented control
  with the shared shape picker. Other Hero controls are unchanged.
- Persisted values remain in the existing Hero props (`block:hero.shape`), so
  save/reload and public rendering use the same serialized value.

## Verification

- M2.2 focused test: **1 file, 6 tests PASS**.
  - nine-value contract and legacy preservation
  - distinct styles for all six new shapes
  - nine options reachable on desktop and mobile
  - all 9 shapes rendered across all 30 Hero variants (270 combinations)
  - save/reload preservation and public renderer parity
- Combined Hero/family/M1/M2/M2.1 regression set: **8 files, 44 tests PASS**.
- Client + SSR/Nitro production build: **PASS** (`npm run build`).
- `git diff --check`: **PASS**. Git emitted only existing line-ending warnings.

The build retains pre-existing warnings for Tailwind `@theme`, large chunks,
and the route test file without a Route export; none is caused by M2.2.

## Files changed for M2.2

- `src/isolated/magic-page-editor/components/blocks/HeroFrame.tsx`
- `src/isolated/magic-page-editor/components/editor/useSelectionActions.tsx`
- `src/isolated/magic-page-editor/components/editor/controls/HeroFrameShapePicker.tsx`
- `src/isolated/magic-page-editor/__tests__/m2_2HeroFrameShapes.test.tsx`
- `CRIPQER_M2_2_HERO_FRAME_SHAPE_EXPANSION_REPORT.md`

All other pre-existing working-tree changes were preserved and are outside
this M2.2 change set.

## Capability matrix

| Capability | Result |
|---|---|
| Legacy Hero shapes | PASS; preserved |
| Six new Hero frame shapes | PASS |
| All 30 Hero variants | PASS; 9 × 30 matrix |
| Desktop/mobile reachability | PASS |
| Magic PageDoc persistence | PASS |
| Public renderer parity | PASS |
| Hero content/media/CTA/avatar behavior | unchanged; regression PASS |
| Decorations, crop/zoom, overlay/fusion | unchanged; regression PASS |

Final gate: **PASS**.
