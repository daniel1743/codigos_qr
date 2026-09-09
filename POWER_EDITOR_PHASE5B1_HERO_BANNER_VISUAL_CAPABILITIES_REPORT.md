# POWER EDITOR PHASE 5B1 — HERO / BANNER VISUAL CAPABILITY EXPANSION V1

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`

## Summary

Extends the Hero/Banner visual model with four additive, backward-compatible
capabilities: true full-bleed, image fit (cover/contain), image focal position,
and block-level background gradient. No camera, persistence, engine-v2,
entitlement, or Phase 1–4 files were touched.

---

## FILES_READ

- `src/premium-template-studio/types/index.ts`
- `src/premium-template-studio/components/blocks/HeroBlock.tsx`
- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/engine/styleEngine.ts`
- `src/premium-template-studio/engine/TemplateRenderer.tsx`
- `src/premium-template-studio/constants/blockDefinitions.ts`
- `src/premium-template-studio/state/templateReducer.ts`
- `src/premium-template-studio/entitlements.tsx`
- `src/premium-template-studio/components/ui/controls.tsx`
- `src/premium-template-studio/__tests__/visualContract.test.tsx`
- `src/premium-template-studio/__tests__/templateReducer.test.ts`
- `src/premium-template-studio/__tests__/publicRenderer.test.ts`

## FILES_MODIFIED

- `src/premium-template-studio/types/index.ts`
- `src/premium-template-studio/engine/styleEngine.ts`
- `src/premium-template-studio/components/blocks/HeroBlock.tsx`
- `src/premium-template-studio/engine/TemplateRenderer.tsx`
- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/__tests__/heroVisualCapabilities.test.tsx` (new)

## SCHEMA_FIELDS_ADDED

1. `HeroMediaContent.fit?: "cover" | "contain"` (`ImageFit`)
2. `HeroMediaContent.position?: ImagePosition` (9 focal tokens)
3. `BlockStyle.backgroundGradient?: { from?: string; to?: string; angle?: number }`
4. `BlockLayout.trueFullBleed?: boolean`

All fields are optional and additive. No existing canonical property was
renamed or removed.

## BACKWARD_COMPATIBILITY

Full. When the new fields are absent the renderer resolves to the current
behavior:

- `imageFit` absent → `cover` (previous hardcoded behavior)
- `imagePosition` absent → `center` (previous hardcoded behavior)
- `backgroundGradient` absent → existing solid background
- `trueFullBleed` absent → existing contained/inset layout

No document migration is performed. Existing documents render identically.

## TRUE_FULL_BLEED

`layout.trueFullBleed: true` makes `BlockFrame` escape the renderer grid and
span the document edge-to-edge via:

```
gridColumn: "1 / -1"
width: "100vw"
marginLeft: "calc(50% - 50vw)"
```

This is document/block layout behavior, distinct from `layout.width: "full"`
(which only spans grid columns). No Stage geometry, camera, fitZoom, userZoom,
or scroll ownership was modified. The existing `overflow-x: clip` on the page
root is respected because the escaped element stays within the viewport.

## IMAGE_FIT

`imageFitValue(fit)` maps `cover`/`contain` → CSS `background-size` /
`object-fit`. Absent → `cover`.

Rendered separately per media path:

- **Top banner image** (`content.bannerImage`): applied as `object-fit` on the
  `<img>` (centered, editorial, split variants).
- **Full background image** (`content.backgroundImage`): applied as
  `background-size` on the block root (centered, editorial, split, full-image
  variants).

They share the same token semantics but are NOT silently coupled — each has its
own `fit`/`position` field.

## IMAGE_POSITION

`imagePositionValue(position)` maps a stable focal token model to CSS:

```
center→50% 50%, top→50% 0%, bottom→50% 100%, left→0% 50%, right→100% 50%,
top-left→0% 0%, top-right→100% 0%, bottom-left→0% 100%, bottom-right→100% 100%
```

Absent/unknown → `center`. Applied as `object-position` on banner `<img>` and
`background-position` on the background image. No interactive crop/focal
dragging (out of scope).

## BACKGROUND_GRADIENT

`blockBackgroundGradientStyle({ from, to, angle })` →
`linear-gradient(<angle>deg, <from> 0%, <to> 100%)`. Default angle 180deg.
Returns `{}` when absent/incomplete, preserving the solid behavior.

This is a **block-level background gradient**, distinct from the existing
OVERLAY gradient (`style.overlay`). Render order preserved:

```
background (solid / gradient / image) → overlay → content
```

## OVERLAY_PRESERVED

Unchanged. The existing solid/gradient overlay with opacity and direction
continues to render above the background and below the content. Covered by a
dedicated test.

## IMAGE_UPLOAD_PRESERVED

Unchanged. Upload/change/remove still goes through the existing `AssetField`
(`adapters.assets`). No backend was hardcoded.

## CAMERA_CHANGES

None. `PowerCanvasViewport`, `usePowerCanvasCamera`, `powerCanvasCameraMath`,
Stage geometry, `fitZoom`, `userZoom`, and Canvas scroll ownership were not
touched.

## PHASE4_CHANGES

None.

## PERSISTENCE_CHANGES

None. New fields flow through the existing `patchBlockField`/`setPath` reducer
path and the existing save coordinator. No new services or reducers.

## ENGINE_V2_CHANGES

None. `parametric-engine-v2/**` untouched.

## ENTITLEMENT_CHANGES

None. `intentForBlockPath` returns `null` for the new `content.*` and `style.*`
paths (the hero block is a standard block). No `Locked`/`ProBadge` wrapper
blocks these controls, so no STOP was required.

## TESTS

`src/premium-template-studio/__tests__/heroVisualCapabilities.test.tsx` (14
tests, all passing):

- absent new fields preserve legacy rendering
- `imageFitValue` cover/contain mapping
- `imagePositionValue` focal-token mapping (and unknown-token fallback)
- gradient serialization (`blockBackgroundGradientStyle`) and render markup
- `trueFullBleed` → `grid-column:1 / -1`, `width:100vw`, `calc(50% - 50vw)`
- absent `trueFullBleed` → no full-bleed styles
- existing overlay continues working
- selection does not mutate config; hero field patch preserves selection

Regression: `visualContract`, `publicRenderer`, `registryCounts`,
`templateReducer`, `presets`, `savePublish`, `validation` all pass.

Note: `h2-audit.spec.ts` (a `@playwright/test` spec) fails under `vitest` with
"calling test() from an async test.describe() block". This is a pre-existing
test-runner incompatibility (Playwright spec picked up by vitest) present in
both the working tree and the duplicate `PROYECTO PARA INTEGRA A QR` directory.
Unrelated to this change.

## LINT

`eslint` on the changed files reports only `prettier/prettier` issues: repo-wide
CRLF (`\r\n`) vs LF line-ending mismatches and a few pre-existing formatting
nits. No semantic/type lint errors were introduced. The new test file was
normalized to LF to match sibling test files.

## HTTP_EDITOR_SMOKE

NOT_VERIFIED — no dev server was started in this session.

## BUILD

NOT_VERIFIED — `vite build` was not executed.

## RUNTIME

The new capabilities are exercised at render level via `renderToStaticMarkup`
in the test suite (cover/contain/position/gradient/full-bleed/overlay/legacy all
verified against emitted markup). Interactive runtime gate (BANNER-01…10) is
pending user runtime.

## VISUAL

NOT_VERIFIED — requires user runtime.

## STOP_CONDITION_TRIGGERED

None. No entitlement wrapper blocks these Hero controls; no forbidden
architecture change was required.

## SCOPE_EXPANSION_REQUIRED

None.

---

## Final gate

**POWER_EDITOR_PHASE5B1_HERO_BANNER_VISUAL_CAPABILITIES_GATE: NOT_VERIFIED**

(Implementation + targeted tests + regression tests are complete and passing;
final PASS is withheld pending user runtime visual verification and a
build/smoke execution.)
