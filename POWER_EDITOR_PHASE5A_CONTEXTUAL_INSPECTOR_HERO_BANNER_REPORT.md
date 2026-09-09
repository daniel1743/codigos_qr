# POWER EDITOR PHASE 5A — CONTEXTUAL INSPECTOR + HERO/BANNER UX FOUNDATION V1

Date: 2026-08-09
Branch: `feat/basic-editor-editorial-canvas-ui`
Repository: `daniel1743/codigos_qr`

---

## FILES_READ

- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/components/ui/controls.tsx`
- `src/premium-template-studio/components/blocks/HeroBlock.tsx`
- `src/premium-template-studio/engine/TemplateRenderer.tsx`
- `src/premium-template-studio/engine/styleEngine.ts`
- `src/premium-template-studio/types/index.ts`
- `src/premium-template-studio/constants/blockDefinitions.ts`
- `src/premium-template-studio/state/templateReducer.ts`
- `src/premium-template-studio/state/StudioProvider.tsx`
- `src/premium-template-studio/entitlements.tsx`
- `src/premium-template-studio/__tests__/templateReducer.test.ts`
- `src/premium-template-studio/__tests__/visualContract.test.tsx`

## FILES_MODIFIED

- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/components/inspector/inspectorScroll.ts` (NEW)
- `src/premium-template-studio/components/inspector/__tests__/inspectorScroll.test.ts` (NEW)
- `src/premium-template-studio/__tests__/templateReducer.test.ts` (added selectBlock test)

---

## INSPECTOR_CONTEXTUAL_SELECTION

- Already wired by Phase 4: `Canvas click → editing.onSelect(block.id) → dispatch selectBlock → selectedBlockId`.
- `Inspector()` / `InspectorContent()` find the selected block via `state.selectedBlockId` and dispatch to `BlockInspector`, which routes `type === "hero"` to `HeroBlockInspector`. Unchanged; confirmed working.
- Added a `selectBlock` reducer unit test proving selection mutates neither config nor history/dirty flags (the Phase 4 → Phase 5A bridge).

## INSPECTOR_AUTOFOCUS

- `Inspector()` now holds a ref to its own scroll container (`data-inspector-scroll-root`) and, on selection change only, resets `scrollTop` to `0` so the selected block's relevant controls are in view.
- Scroll ownership is scoped to the Inspector `<div>` only — the Canvas camera / Stage / Tools scroll are untouched.

## REPEATED_INSPECTOR_SCROLL_PREVENTED

- The reset is gated by `shouldResetInspectorScroll(previousSelectionId, nextSelectionId)` (pure, unit-tested).
- Editing the same block (`patchBlockField`) keeps `selectedBlockId` stable → no scroll on every render/edit.
- When already at top, `scrollTop !== 0` guard avoids any move.

---

## HERO_CONTENT_GROUP

- Section renamed `Text Content` → `Content` (eyebrow, title, subtitle, description, verification badge). Schema: `content.*`.

## HERO_BACKGROUND_GROUP

- Section `Appearance` split into a dedicated `Background` section exposing `style.background` (Solid Color, with Reset) and `style.radius` (Corner Radius).
- Gradient block background is NOT exposed (not supported by canonical schema).

## HERO_LAYOUT_GROUP

- `Layout (breakpoint)` gained a `Width` control (`Contained` / `Full Width`) mapping to `layout.width` (`content`/`full`), consumed by the renderer for grid span.
- Alignment, min-height, CTA direction remain.

## HERO_OVERLAY_GROUP

- Overlay controls moved into a dedicated `Overlay` section: Overlay Type (solid/gradient), Intensity (`style.overlay.opacity`), Gradient Direction.
- Intensity hint documents "0 hides, 1 covers" (no fabricated on/off field).

## IMAGE GROUP

- `Banner & Background` section renamed `Image` (Top Banner Image + blur, Full Background Image + blur), reusing the existing `AssetField` upload/replace/remove flow.

---

## IMAGE_CHANGE_SUPPORTED: YES
## IMAGE_UPLOAD_SUPPORTED: YES  (existing `AssetField` via `adapters.assets`; no new media library)

## SOLID_BACKGROUND_SUPPORTED: YES  (`style.background` → `cardStyle` backgroundColor)
## GRADIENT_SUPPORTED: NO  (no block-level gradient field; only overlay `type=gradient` scrim)
## BACKGROUND_IMAGE_SUPPORTED: YES  (`content.backgroundImage.url` + blur)
## FULL_BLEED_SUPPORTED: PARTIAL  (`layout.width=full` maps to renderer grid span, not true viewport bleed)
## INSET_SUPPORTED: PARTIAL  (`layout.width=content/wide`)
## IMAGE_FIT_SUPPORTED: NO  (hardcoded `cover`)
## IMAGE_POSITION_SUPPORTED: NO  (hardcoded `center`)
## FIXED_BACKGROUND_SUPPORTED: NO  (no `background-attachment`/behavior field)
## OVERLAY_SUPPORTED: YES  (`style.overlay{type,opacity,direction}`)
## OVERLAY_OPACITY_SUPPORTED: YES  (0..1)
## BLEND_WITH_PAGE_SUPPORTED: NO

---

## SCHEMA_CHANGES: NONE
## RENDERER_CHANGES: NONE
## CAMERA_CHANGES: NONE
## PHASE4_CHANGES: NONE
## PERSISTENCE_CHANGES: NONE
## ENTITLEMENT_CHANGES: NONE  (no locks added/removed; `<Locked>`/`<ProBadge>` untouched)

---

## TESTS

- `inspectorScroll.test.ts` — 4 passing tests for the scroll-reset decision.
- `templateReducer.test.ts` — added `selectBlock` test.
- `npx vitest run src/premium-template-studio` → 18 files passed, 159 tests passed.
  - 2 unrelated Playwright `.spec.ts` files (`h2-audit.spec.ts`) fail under vitest because they use `@playwright/test`'s `test()` — a pre-existing config mismatch, not introduced by Phase 5A.

## LINT

- `eslint` clean on all Phase 5A files (Inspector.tsx new code, inspectorScroll.ts, inspectorScroll.test.ts, templateReducer.test.ts).
- Pre-existing prettier indentation errors remain in the untouched `<Locked>`/Motion section of `BlockInspector` (entitlements area — out of scope, left as-is).

## HTTP_EDITOR_SMOKE: NOT_VERIFIED (no localhost dev server running at time of delivery)

## BUILD: NOT_EXECUTED (full `tsc`/`vite build` exceeds the interactive 30s tool budget; TS patterns mirror existing compiling code and eslint parses clean)

## RUNTIME: PENDING USER RUNTIME

## VISUAL: NOT_VERIFIED (requires user runtime)

---

## UNSUPPORTED_DESIRED_CAPABILITIES

- Gradient block background
- Image fit (cover/contain)
- Image position / focal alignment (hero block)
- Fixed / parallax background
- Blend-with-page / transparency

## SCOPE_EXPANSION_REQUIRED

- `DESIRED / REQUIRES SCHEMA + RENDERER EXPANSION` for: gradient background, image fit, image position, fixed/parallax, blend-with-page. Each requires a canonical property (and for parallax, a renderer/background-behavior field plus mobile/browser analysis).

## STOP_CONDITION_TRIGGERED

- STOP applied to: gradient background, image fit/position, fixed/parallax, blend-with-page. None were fabricated or force-added. Overlay on/off was expressed as opacity 0..1 (no new field).

---

## POWER_EDITOR_PHASE5A_CONTEXTUAL_INSPECTOR_HERO_BANNER_GATE

`NOT_VERIFIED`

(Code + tests + lint pass; final gate requires user runtime acceptance for HERO-01 … HERO-10 and the `/editor` HTTP smoke. No visual PASS is claimed without user runtime.)
