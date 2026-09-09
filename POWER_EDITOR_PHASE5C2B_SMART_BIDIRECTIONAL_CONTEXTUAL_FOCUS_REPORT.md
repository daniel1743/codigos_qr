# POWER EDITOR PHASE 5C2B — SMART BIDIRECTIONAL CONTEXTUAL FOCUS V1

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`

Adds a small typed contextual-target model with a strict source/anti-loop rule,
so Canvas→Inspector positions the exact section comfortably in view and
Inspector→Canvas reveals the exact element being edited — without resetting
zoom, rewriting the camera, or creating a second selection store.

## FILES_READ

- `components/inspector/Inspector.tsx`
- `components/inspector/inspectorFocus.ts`
- `components/blocks/HeroBlock.tsx`
- `components/canvas/ProfileHeader.tsx`
- `components/workspace/PowerCanvasViewport.tsx`

## FILES_MODIFIED

- `components/inspector/inspectorFocus.ts` — unified target model + canvas signal + positioning helper
- `components/inspector/Inspector.tsx` — comfortable positioning + Inspector→Canvas triggers + `profile-bio`
- `components/blocks/HeroBlock.tsx` — `data-editor-target` on text + CTA (edit mode)
- `components/canvas/ProfileHeader.tsx` — `data-editor-target` on cover + bio (edit mode)
- `components/workspace/PowerCanvasViewport.tsx` — subscribe to canvas reveal (minimal extension)
- `__tests__/contextualFocus.test.ts` (new)

## CONTEXT_FILES_COUNT

5 (within the 7-file limit).

## CONTEXT_TARGET_MODEL

Single union `ContextualTarget`:
`profile-bio | profile-cover | hero-eyebrow | hero-title | hero-subtitle |
hero-description | hero-cta`.

Ephemeral UI state only: not persisted, not canonical, no history entry, no
second selection store. `selectedBlockId` remains the canonical block selection
owner. `InspectorFocusTarget` kept as an alias for backward compatibility.

## SOURCE_MODEL

Two separate one-way signals; source is encoded by which function is called:

- `requestInspectorFocus(target)` — source = **canvas** (moves Inspector only).
- `requestCanvasFocus(target)` — source = **inspector** (moves Canvas only).

Each signal notifies a disjoint listener set, so source is unambiguous.

## CANVAS_TO_INSPECTOR

Canvas click → `onSelectHeroText` / `onSelectHeroCta` / `onSelectProfileCover`
(unchanged wiring) → `requestInspectorFocus(target)`. Inspector now uses
`computeInspectorFocusScroll` for comfortable positioning instead of raw-top.

## INSPECTOR_TO_CANVAS

Inspector `focus` / `pointer-down` entering a contextual group →
`requestCanvasFocus(target)` → `PowerCanvasViewport` reveals
`[data-editor-target="target"]` scoped to the content layer.

## ANTI_LOOP_MECHANISM

Structural: `requestInspectorFocus` only notifies Inspector listeners (never
Canvas); `requestCanvasFocus` only notifies Canvas listeners (never Inspector).
Unit-tested via "source separation" cases.

## INSPECTOR_POSITIONING

`computeInspectorFocusScroll(viewport, element)` returns a `scrollTop` delta:
0 when already comfortably visible; otherwise the delta that brings the target's
top edge into the comfortable upper band (~18%, min 24px), never the raw top.

## CANVAS_POSITIONING

Reuses frozen `computeAutofocusScrollDelta` (already imported) so reveal shares
Phase 4 visibility/margin semantics. Only `scrollTop`/`scrollLeft` are written —
zoom, Stage geometry, camera math, and the pan owner are untouched.

## PROFILE_BIO_TARGET

Canvas: `<div data-editor-target="profile-bio">` around the description
`InlineText`. Inspector: `data-inspector-focus="profile-bio"` around the Bio field.

## PROFILE_COVER_TARGET

Canvas: `data-editor-target="profile-cover"` on the banner. Inspector:
`data-inspector-focus="profile-cover"` (existing).

## HERO_TITLE_TARGET / HERO_SUBTITLE_TARGET / HERO_DESCRIPTION_TARGET / HERO_EYEBROW_TARGET

Canvas: `data-editor-target="hero-*"` added via `heroTextClickProps` (edit mode).
Inspector: existing `data-inspector-focus="hero-*"` wrappers (5C2).

## HERO_CTA_TARGET

Canvas: `data-editor-target="hero-cta"` on the CTA container. Inspector:
existing `data-inspector-focus="hero-cta"` (5C1).

## PEEK_RESTORE_IMPLEMENTED

NO.

## PEEK_RESTORE_DEFERRED_REASON

Not low-risk in V1. Safe restore requires tracking "was moved automatically"
plus cancelling on manual pan/zoom/selection, which would couple the reveal to
interaction/camera state beyond the frozen scope. Deferred to a follow-up
microphase; smart reveal is delivered.

## CAMERA_CHANGES

None. (PowerCanvasViewport got a minimal reveal extension only.)

## PHASE4_BEHAVIOR_CHANGES

None. Block autofocus is unchanged; the new reveal is a separate additive effect.

## PERSISTENCE_CHANGES / HISTORY_CHANGES / ENGINE_V2_CHANGES

None.

## TESTS

`contextualFocus.test.ts` (8 tests):
- comfortable positioning: already-visible → 0, below → +delta, above → −delta, upper-band
- source separation: canvas-origin moves Inspector only; inspector-origin moves Canvas only
- canvas focus signal delivers once and unsubscribes
- target set accepts all 7 targets and rejects null

Regression subset (all green): heroTextContextual (8), heroCtaContextual (6),
heroCtaStyle (22), profileCoverContextual (6), powerCanvasAutofocus (6).
56 tests passing across the batch.

## LINT

0 errors on all touched files (prettier --write normalized CRLF).

## HTTP_EDITOR_SMOKE / BUILD / RUNTIME / VISUAL

NOT_VERIFIED (no runtime in this environment; full `vite build` not run).

## STOP_CONDITION_TRIGGERED

None.

## SCOPE_EXPANSION_REQUIRED

None.

## Final gate

POWER_EDITOR_PHASE5C2B_SMART_BIDIRECTIONAL_CONTEXTUAL_FOCUS_GATE: NOT_VERIFIED

(Code complete; automated tests + lint PASS. Final PASS requires user runtime
verification of the 13 SMART-* manual gates.)
