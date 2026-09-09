# POWER EDITOR PHASE 5C1 — HERO CTA / BUTTON CONTEXTUAL EDITING FOUNDATION V1

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`

## Summary

Makes the CTA/button inside a Hero directly contextual. Clicking a Hero CTA in
edit mode selects the parent Hero (without redundant churn) and requests a
one-shot Inspector focus on the "CTA / Button" section — reusing the Phase 5B2
lightweight focus signal. No new global selection source, no new schema, no
camera/entitlement/persistence change.

---

## DISCOVERY

### CTA_RENDER_OWNER

`components/blocks/HeroBlock.tsx` — `ctasElem` renders native `<button>` elements
(primary + secondary), styled with hardcoded inline CSS. `handleCTA(url)` does
`window.open(url, "_blank", "noopener,noreferrer")` in non-edit mode and returns
early in edit mode.

### CTA_DATA_OWNER

`CTAContent` in `types/index.ts`.

### CTA_DATA_FIELDS

`enabled?`, `label?`, `url?`, `icon?` — there is NO `action` field (only `url`).

### CTA_STYLE_FIELDS

None. The CTA visual is hardcoded inline: `backgroundColor: theme.colors.primary`
(primary) / `transparent` (secondary), `color: #fff` / `theme.colors.text`,
`borderRadius: theme.buttons.radius`, `fontWeight: 600`, `fontSize: "14px"`,
`padding: "10px 20px"`, `border: none` / `1px solid`. The only style hooks are
theme-level (`theme.colors.primary`, `theme.buttons.radius`), not per-CTA.

### CTA_EXISTING_INSPECTOR_CONTROLS

The Hero inspector had an "Actions (CTAs)" section with Primary/Secondary CTA
sub-blocks: Label, URL, Icon (Segmented mail/arrow-right/globe/calendar).

### CTA_CLICK_CURRENT_BEHAVIOR

- Edit mode: `handleCTA` returns early (no navigation); the click bubbles to the
  `BlockFrame` `<section>` onClick → selects the parent Hero. No CTA focus.
- Public/preview: `BlockFrame` has no click handler; `handleCTA` → `window.open`.

### CONTENT_SUPPORTED

- LABEL: YES (`label`) · LINK: YES (`url`)
- ACTION: NO (no `action` field — only `url`) · ICON: YES (`icon`)

### STYLE_SUPPORTED

BACKGROUND/TEXT_COLOR/FONT/FONT_SIZE/WEIGHT/BORDER/BORDER_WIDTH/RADIUS/
SIZE_PADDING: all NO (hardcoded; radius is theme-level `theme.buttons.radius`).

### SCHEMA_EXPANSION_REQUIRED

For per-CTA style: add style fields to `CTAContent` (or a nested `style` object).
For a distinct "action" beyond `url`: add an `action` field.

### RENDERER_EXPANSION_REQUIRED

To consume any new per-CTA style fields in `HeroBlock.tsx`.

### SCOPE_EXPANSION_REQUIRED

None.

---

## FILES_READ

- `src/premium-template-studio/components/blocks/HeroBlock.tsx`
- `src/premium-template-studio/engine/RenderContext.tsx`
- `src/premium-template-studio/engine/TemplateRenderer.tsx`
- `src/premium-template-studio/components/inspector/Inspector.tsx`
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
- `src/premium-template-studio/types/index.ts`
- `src/premium-template-studio/engine/styleEngine.ts`
- `src/premium-template-studio/components/inspector/inspectorFocus.ts`
- `src/premium-template-studio/constants/blockDefinitions.ts`
- `src/premium-template-studio/state/templateReducer.ts`
- `src/premium-template-studio/state/StudioProvider.tsx`

## FILES_MODIFIED

- `src/premium-template-studio/components/inspector/inspectorFocus.ts` — added `hero-cta` target
- `src/premium-template-studio/engine/RenderContext.tsx` — added `onSelectHeroCta`
- `src/premium-template-studio/engine/TemplateRenderer.tsx` — plumbed `onSelectHeroCta`
- `src/premium-template-studio/components/blocks/HeroBlock.tsx` — CTA edit-mode click
- `src/premium-template-studio/components/PremiumTemplateStudio.tsx` — wired handler
- `src/premium-template-studio/components/inspector/Inspector.tsx` — CTA section + generalized focus
- `src/premium-template-studio/__tests__/heroCtaContextual.test.ts` (new)

## CTA_RENDER_OWNER

`components/blocks/HeroBlock.tsx` (`ctasElem`, native `<button>`).

## CTA_DATA_OWNER

`CTAContent` (`content.primaryCTA` / `content.secondaryCTA`).

## CTA_CANVAS_CLICK

Edit mode: `onClick` → `e.stopPropagation()` → `handleCTAClick(url)` → if
`mode === "edit" && onSelectHeroCta`, calls `onSelectHeroCta(block.id)` and stops
(no navigation). Public/preview: `handleCTA` → `window.open` (unchanged).

## PARENT_HERO_SELECTION

`onSelectHeroCta(blockId)` in the Canvas dispatches `selectBlock` only when
`state.selectedBlockId !== blockId` (no redundant churn), then requests focus.

## INSPECTOR_CTA_FOCUS

`requestInspectorFocus("hero-cta")` → the Inspector scrolls its container to the
`data-inspector-focus="hero-cta"` wrapper around the "CTA / Button" section.

## REPEATED_SCROLL_PREVENTED

`requestInspectorFocus` fires only from the explicit CTA click. The
`shouldScrollInspectorToFocus` predicate (non-null → scroll once) is unchanged and
unit-tested. Editing CTA fields (`patchBlockField`) keeps `selectedBlockId`
stable → no scroll.

## CTA_LABEL_EDIT

YES — `content.primaryCTA.label` / `content.secondaryCTA.label` (TextInput).

## CTA_LINK_EDIT

YES — `content.primaryCTA.url` / `content.secondaryCTA.url` (TextInput).

## CTA_ACTION_EDIT

NO — no `action` field exists; only `url` (reported).

## CTA_ICON_EDIT

YES — `content.primaryCTA.icon` / `content.secondaryCTA.icon` (Segmented).

## CTA_BACKGROUND_STYLE

NOT SUPPORTED (hardcoded) — reported.

## CTA_TEXT_STYLE

NOT SUPPORTED (hardcoded) — reported.

## CTA_TYPOGRAPHY

NOT SUPPORTED (hardcoded) — reported.

## CTA_BORDER

NOT SUPPORTED (hardcoded) — reported.

## CTA_RADIUS

NOT SUPPORTED (only theme-level `theme.buttons.radius`) — reported.

## CTA_SIZE

NOT SUPPORTED (hardcoded padding) — reported.

## EDIT_MODE_NAVIGATION_BLOCKED

YES — `handleCTAClick` returns before navigation in edit mode.

## PUBLIC_PREVIEW_NAVIGATION_PRESERVED

YES — non-edit mode still calls `handleCTA` → `window.open`. `BlockFrame` has no
click handler in public mode, so navigation is unaffected.

## CAMERA_CHANGES

None.

## PHASE4_CHANGES

None.

## HERO_5B1_CHANGES

Only the CTA button `onClick`/`type` and a new `handleCTAClick` helper; no Hero
5B1 visual-capability fields were changed.

## PROFILE_COVER_5B2_CHANGES

None (the 5B2 focus path remains; the focus effect was generalized to resolve the
target dynamically but behavior is unchanged for `profile-cover`).

## PERSISTENCE_CHANGES

None.

## HISTORY_CHANGES

None (selection is not a mutation; CTA edits use the existing `patchBlockField`).

## ENTITLEMENT_CHANGES

None. `content.primaryCTA.*` / `content.secondaryCTA.*` map through
`intentForBlockPath` → `null` (block content editing is not gated). No
`Locked`/`ProBadge` wrapper blocks these controls.

## ENGINE_V2_CHANGES

None.

## TESTS

`heroCtaContextual.test.ts` (6 tests, passing):
- `shouldScrollInspectorToFocus` accepts `hero-cta` and `profile-cover`, rejects null
- `hero-cta` focus signal delivers once and unsubscribes
- redundant `selectBlock` of the same hero does not mutate config/history/dirty
- editing `primaryCTA.label` only changes the label (url/icon/secondary intact)
- editing `primaryCTA.url` preserves label and icon
- editing `primaryCTA.icon` preserves label and url

Regression: `heroVisualCapabilities` (5B1), `profileCoverContextual` (5B2),
`visualContract`, `templateReducer`, `publicRenderer` all pass (77 tests).

## LINT

Only pre-existing `prettier` (CRLF/LF) nits and a pre-existing
`react-refresh/only-export-components` warning on `RenderContext.tsx`. No new
semantic/type errors.

## HTTP_EDITOR_SMOKE

NOT_VERIFIED — no dev server was started in this session.

## BUILD

NOT_VERIFIED — `vite build` was not executed.

## RUNTIME

Not executed here (requires the browser editor). The click→focus flow and CTA
content controls are wired and covered by pure/reducer tests.

## VISUAL

NOT_VERIFIED — requires user runtime.

## UNSUPPORTED_DESIRED_CAPABILITIES

- CTA background/text/font/size/weight/border/radius/padding — all hardcoded;
  need per-CTA style fields on `CTAContent` + `HeroBlock` renderer consumption.
- Distinct "action" beyond `url` — needs an `action` field on `CTAContent`.

## STOP_CONDITION_TRIGGERED

None. No entitlement blocker; no StudioProvider/reducer/camera/persistence change
was required.

## SCOPE_EXPANSION_REQUIRED

None.

---

## Final gate

**POWER_EDITOR_PHASE5C1_HERO_CTA_CONTEXTUAL_EDITING_GATE: NOT_VERIFIED**

(Implementation + targeted tests + regression tests are complete and passing;
final PASS is withheld pending user runtime visual verification and a
build/smoke execution.)
