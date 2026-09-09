# POWER_EDITOR_PHASE5C2C — CONTEXTUAL FOCUS RUNTIME REPAIR REPORT

## ROOT_CAUSE

Two concrete DOM-wiring disconnects (not helper/signal math) broke the runtime
`event → target → scroll-owner` path. The scroll math, the delta/absolute
contract, and the scroll owners were all correct; the *identity strings and the
click event* were not.

1. **Hero text `data-editor-target` prefix mismatch (Inspector → Canvas).**
   `HeroBlock.tsx` `heroTextClickProps(target)` set
   `data-editor-target={target}` — i.e. `"title"`, `"subtitle"`,
   `"description"`, `"eyebrow"` (no prefix). But `PowerCanvasViewport` resolves
   the reveal target with `contentLayer.querySelector('[data-editor-target="hero-title"]')`
   (the `hero-` prefix comes from the Inspector's `contextualFocusProps("hero-title")`
   → `requestCanvasFocus("hero-title")`). The query therefore returned `null`
   for every hero text sub-target, so the Canvas never scrolled — "targets remain
   below/above the visible area."

2. **Bio element has no click handler (Canvas → Inspector).**
   `ProfileHeader.tsx` rendered the bio `<div>` with
   `data-editor-target="profile-bio"` but **no `onClick`**, so nothing ever called
   `requestInspectorFocus("profile-bio")`. A `data-editor-target` attribute alone
   does not create Canvas→Inspector focus (confirmed SUSPECT_A).

## WHY_5C2B_TESTS_PASSED_BUT_RUNTIME_FAILED

The 5C2B tests validated only pure units:
- `computeInspectorFocusScroll` (pure positioning math),
- `requestInspectorFocus` / `requestCanvasFocus` (pub/sub delivery + source separation),
- `shouldScrollInspectorToFocus` (non-null predicate).

They never rendered a component and never asserted that the **DOM identity
values** the Canvas producer emits actually match the ones the Inspector/Canvas
consumer queries, nor that the Bio element emits a focus request on click. The
helpers were "correct in isolation" while the real DOM wiring was disconnected.
Runtime evidence overrides those passing unit tests — correctly.

## INSPECTOR_REAL_SCROLL_OWNER

`Inspector.tsx` — `scrollRef`, attached to
`<div ref={scrollRef} data-inspector-scroll-root className="pts-inspector-scroll pts-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">`.
This is the single real scroll container; the Phase 5A
`shouldResetInspectorScroll` effect writes `scrollTop` to the same element.
(`InspectorContent` in the mobile dock has no subscription — the desktop
`<Inspector />` at `PremiumTemplateStudio.tsx:373/583` does, and is the Power
Editor surface.)

## CANVAS_REAL_SCROLL_OWNER

`PowerCanvasViewport.tsx` — `viewportRef`, attached to
`<div className="pts-power-viewport ... overflow-auto ...">`. This is the same
element `usePowerCanvasCamera` writes `scrollLeft`/`scrollTop` to (the single
pan owner). `contentRef` is the scaled `.pts-power-camera-layer` inside the
stage; the reveal query is correctly scoped to it.

## PROFILE_BIO_CLICK_PATH

Before: `<div data-editor-target="profile-bio">` (no handler) → dead end.
After (`ProfileHeader.tsx`): the bio `<div>` now has
`onClick={(e) => { if (mode !== "edit") return; e.stopPropagation(); requestInspectorFocus("profile-bio"); }}`,
so an explicit edit-mode click emits `requestInspectorFocus("profile-bio")`
exactly once → the Inspector listener scrolls to
`[data-inspector-focus="profile-bio"]` (the "Bio" field).

NOTE (scope boundary): clicking Bio when a *block* is currently selected does
not clear `selectedBlockId`, so the Profile inspector will not switch panels in
that single edge case. Fully resolving it requires a new
`onSelectProfileBio` callback plumbed through `RenderContext`/`TemplateRenderer`/
`PremiumTemplateStudio` (all out of WRITE_SCOPE → STOP condition). The primary
path (profile panel showing, as in MANUAL_GATE REPAIR-01) is repaired. The
cover path already clears selection via `onSelectProfileCover`.

## DELTA_VS_ABSOLUTE_FINDING

Contract is consistent — no bug (SUSPECT_B cleared). Both helpers return a
**delta** and both consumers apply it as `+=`:
- Inspector: `if (delta !== 0) container.scrollTop = container.scrollTop + delta;`
- Canvas: `if (delta.top !== 0) viewport.scrollTop += delta.top;`

## EVENT_WIRING_FINDING

- Hero text Canvas→Inspector: present and correct
  (`onSelectHeroText(blockId, target)` → `requestInspectorFocus("hero-${target}")`,
  matching `data-inspector-focus="hero-*"`).
- Hero text Inspector→Canvas: **broken** — canvas identity `"title"` vs query
  `"hero-title"` (fixed).
- CTA: correct both directions (`data-editor-target="hero-cta"` ↔ `hero-cta`).
- Cover: correct both directions (`profile-cover` ↔ `profile-cover`).
- Bio Canvas→Inspector: **missing** (fixed).

## TARGET_GEOMETRY_FINDING

No coordinate-system bug (SUSPECT_D cleared). Both directions compare
`getBoundingClientRect()` against `getBoundingClientRect()` in the same screen
space. The Canvas content layer is `transform: scale()`d, but
`getBoundingClientRect()` already reflects the transform, and the owning scroll
container maps `scrollTop`/`scrollLeft` 1:1 to screen pixels, so there is no
Stage/world mixing. The real failures were identity/wiring, not geometry.

## FILES_READ

- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/components/inspector/inspectorFocus.ts`
- `src/premium-template-studio/components/workspace/PowerCanvasViewport.tsx`
- `src/premium-template-studio/components/canvas/ProfileHeader.tsx`
- `src/premium-template-studio/components/blocks/HeroBlock.tsx`
- `src/premium-template-studio/__tests__/contextualFocus.test.ts`

(Narrow reference reads only, to confirm the delta math and type shapes:
`powerCanvasAutofocus.ts`, `engine/RenderContext.tsx`, `blocks/primitives.tsx`,
`types/index.ts`, `templates/definitions.ts`, `engine/TemplateRenderer.tsx`,
`components/PremiumTemplateStudio.tsx`.)

## FILES_MODIFIED

- `src/premium-template-studio/components/blocks/HeroBlock.tsx` — hero text
  `data-editor-target` now `hero-${target}` (prefixed identity).
- `src/premium-template-studio/components/canvas/ProfileHeader.tsx` — Bio
  `<div>` gains an edit-mode `onClick` → `requestInspectorFocus("profile-bio")`
  (+ `requestInspectorFocus` import).
- `src/premium-template-studio/__tests__/contextualFocus.test.ts` — added two
  DOM-wiring integration tests (happy-dom environment).

## TESTS

`npx vitest run contextualFocus heroTextContextual heroCtaContextual profileCoverContextual powerCanvasAutofocus`

- `contextualFocus` — 10 passed (incl. 2 new integration tests)
- `heroTextContextual` — 8 passed
- `heroCtaContextual` — 6 passed
- `profileCoverContextual` — 6 passed
- `powerCanvasAutofocus` — 6 passed
- **Total: 36 passed / 0 failed**

New integration coverage:
- Hero text elements render `data-editor-target="hero-title|hero-subtitle|hero-description|hero-eyebrow"`
  and never the bare `title`/`subtitle`.
- Clicking the Bio element emits a `profile-bio` Inspector focus request.

## LINT

`eslint` on the three changed files — clean (0 errors / 0 warnings).

## CAMERA_CHANGES

None. Zoom, Stage geometry, `fitZoom`, `userZoom`, wheel/Space+drag untouched.

## PERSISTENCE_CHANGES

None.

## HISTORY_CHANGES

None.

## ENGINE_V2_CHANGES

None.

## RUNTIME

Automated tests now prove the actual DOM wiring (identity match + Bio click
emission), but visible *automatic movement* still requires the manual gate below.
Per the task rule, automated tests alone cannot produce a PASS.

## FINAL_GATE

**NOT_VERIFIED**

Awaiting user runtime confirmation of visible automatic movement:
- REPAIR-01 Bio, REPAIR-02 Hero Title, REPAIR-03 CTA (Canvas→Inspector)
- REPAIR-04 Bio, REPAIR-05 Hero Title, REPAIR-06 CTA (Inspector→Canvas)
- REPAIR-07 no-move, REPAIR-08 repeat-edit stability, REPAIR-09 zoom preserved,
  REPAIR-10 no oscillation
