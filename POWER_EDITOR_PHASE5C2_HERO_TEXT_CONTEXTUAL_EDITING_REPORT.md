# POWER EDITOR PHASE 5C2 — HERO TEXT CONTEXTUAL EDITING + TYPOGRAPHY FOUNDATION V1

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`

Makes Hero text (eyebrow / title / subtitle / description) directly contextual:
click a Hero text element in edit mode → parent Hero selected once → Inspector
focuses the exact field. No new global selection source, no schema expansion,
no field-specific typography (not yet supported by the canonical model).

## DISCOVERY REPORT

HERO_TEXT_RENDER_OWNER: `src/premium-template-studio/components/blocks/HeroBlock.tsx`

TEXT_FIELDS:
  EYEBROW:     `<span>` — `content.eyebrow` (hardcoded 12px / 700 / 0.05em / uppercase)
  TITLE:       `<h1>`  — `content.title` (headingStyle(theme, scale))
  SUBTITLE:    `<p>`   — `content.subtitle` (hardcoded 16px / 500)
  DESCRIPTION: `<p>`   — `content.description` (hardcoded 14px / lineHeight 1.5)

CURRENT_CONTENT_PATHS:
  content.eyebrow, content.title, content.subtitle, content.description

CURRENT_STYLE_SUPPORT (all NON-field-specific):
  COLOR:           title = theme.colors.text (headingStyle) / #fff on full-image;
                   subtitle = theme.colors.text; description/eyebrow = theme.colors.mutedText.
  FONT_FAMILY:     title = theme.typography.headingFont; others inherit body font.
  FONT_SIZE:       title = headingSize*scale; subtitle 16, description 14, eyebrow 12.
  FONT_WEIGHT:     title = headingWeight; subtitle 500, eyebrow 700 (hardcoded).
  ALIGNMENT:       block-level (block.layout.align / responsive). Not per-field.
  LINE_HEIGHT:     title = 1.1 (headingStyle); description = 1.5 (hardcoded).
  LETTER_SPACING:  title = theme.typography.letterSpacing; eyebrow = 0.05em.

FIELD_SPECIFIC_STYLE_SUPPORTED:
  TITLE: NO, SUBTITLE: NO, DESCRIPTION: NO.

CONTEXT_CALLBACK_STRATEGY:
  Single generalized `onSelectHeroText(blockId, target)` (target ∈
  title|subtitle|description|eyebrow) — avoids 4× callback proliferation, reuses
  the existing one-shot `requestInspectorFocus` signal + `InspectorFocusTarget`.

SCHEMA_EXPANSION_REQUIRED: None (content editing already canonical).
RENDERER_EXPANSION_REQUIRED: Yes (edit-mode onClick on Hero text elements).
SCOPE_EXPANSION_REQUIRED: None.

## FILES_READ

- `components/blocks/HeroBlock.tsx`
- `components/inspector/Inspector.tsx` (HeroBlockInspector Content section + focus effect)
- `components/inspector/inspectorFocus.ts`
- `engine/RenderContext.tsx`
- `engine/TemplateRenderer.tsx`
- `components/PremiumTemplateStudio.tsx` (contextual handler wiring)

## FILES_MODIFIED

- `components/inspector/inspectorFocus.ts` — added hero-title/subtitle/description/eyebrow targets
- `engine/RenderContext.tsx` — added `HeroTextTarget` + `onSelectHeroText`
- `engine/TemplateRenderer.tsx` — plumbed `onSelectHeroText`
- `components/blocks/HeroBlock.tsx` — edit-mode click on text (all 4 variants)
- `components/PremiumTemplateStudio.tsx` — wired `onSelectHeroText` handler
- `components/inspector/Inspector.tsx` — `data-inspector-focus` wrappers per text field
- `__tests__/heroTextContextual.test.tsx` (new)

## HERO_TEXT_RENDER_OWNER

`HeroBlock.tsx` — renders eyebrow/title/subtitle/description in centered, split,
editorial, and full-image variants.

## TEXT_DATA_OWNER

`BlockContent` (`content.eyebrow` / `content.title` / `content.subtitle` /
`content.description`) in `types/index.ts`.

## TITLE_CANVAS_CLICK / SUBTITLE_CANVAS_CLICK / DESCRIPTION_CANVAS_CLICK / EYEBROW_CANVAS_CLICK

Edit mode: `{...heroTextClickProps(target)}` on each element → `onSelectHeroText(block.id, target)`.
Public/preview: no onClick (helper returns `{}`).

## PARENT_HERO_SELECTION

Handler dispatches `selectBlock` only when `state.selectedBlockId !== blockId`
(no redundant churn), then requests focus.

## INSPECTOR_TITLE_FOCUS / INSPECTOR_SUBTITLE_FOCUS / INSPECTOR_DESCRIPTION_FOCUS

`data-inspector-focus="hero-title|hero-subtitle|hero-description|hero-eyebrow"`
wrappers around the corresponding Inspector fields.

## TITLE_CONTENT_EDIT / SUBTITLE_CONTENT_EDIT / DESCRIPTION_CONTENT_EDIT

Existing canonical `content.title` / `content.subtitle` (TextInput) /
`content.description` (TextArea) — unchanged paths.

## TITLE_STYLE / SUBTITLE_STYLE / DESCRIPTION_STYLE

NOT field-specific. Title = `headingStyle(theme)`; subtitle/description = hardcoded.

## COLOR / FONT_FAMILY / FONT_SIZE / FONT_WEIGHT / ALIGNMENT / LINE_HEIGHT / LETTER_SPACING

None field-specific today. All derive from theme typography, block-level
alignment, or hardcoded values. No fake Inspector style controls were added.

## REPEATED_SCROLL_PREVENTED

Yes. Focus fires only from the explicit click; `shouldScrollInspectorToFocus`
(non-null → scroll once) unchanged. Text edits keep `selectedBlockId` stable.

## PUBLIC_RENDER_PRESERVED

Yes. Helper returns `{}` outside edit mode; no onClick / editing semantics leak.

## CAMERA_CHANGES / PHASE4_CHANGES / CTA_5C1_CHANGES / CTA_5C1B_CHANGES / PROFILE_COVER_CHANGES

None.

## PERSISTENCE_CHANGES / HISTORY_CHANGES / ENTITLEMENT_CHANGES / ENGINE_V2_CHANGES

None. No locks, no ProBadge, no Engine V2 changes.

## TESTS

`heroTextContextual.test.tsx` (8 tests):
- `shouldScrollInspectorToFocus` accepts all Hero text targets, rejects null
- CTA + Profile Cover targets still work
- hero-title focus signal delivers once and unsubscribes
- editing title preserves subtitle/description/eyebrow + keeps parent selection
- editing subtitle / description preserves siblings
- public render contains hero text and no Inspector focus marker
- edit-mode render with onSelectHeroText does not crash

Regression suites (all green): heroCtaContextual (6), heroCtaStyle (22),
heroVisualCapabilities (14), profileCoverContextual (6), visualContract (11),
publicRenderer (7), templateReducer (11). 113 total tests passing.

## LINT

0 errors across all 7 touched files (prettier --write normalized CRLF).

## HTTP_EDITOR_SMOKE / BUILD / RUNTIME / VISUAL

NOT_VERIFIED (no runtime in this environment; full `vite build` not run).

## UNSUPPORTED_DESIRED_CAPABILITIES

- **Field-specific typography** (color / font family / font size / font weight /
  alignment / line height / letter spacing per text element): not implemented —
  the canonical schema has no per-field Hero text style. Minimal future expansion
  would be a nested optional `style` object per text field (mirroring
  `CTAContent.style` from 5C1B) with per-property theme fallback.
- **Direct inline (contentEditable) editing**: out of scope per spec.

## STOP_CONDITION_TRIGGERED

None.

## SCOPE_EXPANSION_REQUIRED

None.

## Final gate

POWER_EDITOR_PHASE5C2_HERO_TEXT_CONTEXTUAL_EDITING_GATE: NOT_VERIFIED

(Code complete; automated tests + lint PASS. Final PASS requires user runtime
verification of the 13 TEXT-* manual gates.)
