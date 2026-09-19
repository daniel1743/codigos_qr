# CRIPQER MOVE CUSTOM LINK FROM EDITOR TO QR V1

**Task ID:** `CRIPQER_MOVE_CUSTOM_LINK_FROM_EDITOR_TO_QR_V1`
**Agent:** CODEX
**Type:** TARGETED_UI_RELOCATION
**Branch:** `feat/basic-editor-editorial-canvas-ui`
**Status:** `IMPLEMENTED`
**Success gate:** `CRIPQER_CUSTOM_LINK_QR_RELOCATION_CODE_VISUAL_PASS_FROZEN` — code pass frozen; visual acceptance pending authenticated browser QA.

---

## 1. Old Power Editor location removed

`src/components/power-editor/PowerEditorHost.tsx` no longer imports or renders
`CustomPublicLinkControl`. The `linkControl` JSX block, the
`{!guidedOnboarding && linkControl}` mount point, and the now-unused imports
(`pageAliasService`, `profileService`, `getAliasProfileUrl`,
`getPublicPageAliasUrl`) were all removed.

The `<main data-testid="power-editor">` surface now flows directly from the
screen-reader diagnostics block into `<div className="min-h-0 flex-1">` →
`<PremiumTemplateStudio />`. There is no white custom-link wrapper, no reserved
height, and no spacer left behind — the Creator Premium editor shell starts
immediately.

## 2. QR destination component

- New: `src/components/qr/CustomPublicLinkControl.tsx` (relocated from
  `src/components/power-editor/CustomPublicLinkControl.tsx`, which was deleted).
- The control now renders as a compact card (`rounded-2xl border bg-card p-4
  shadow-sm`) titled **"Personaliza tu enlace"** with helper *"Elige un enlace
  fácil de recordar y compartir."* and prefix `cripqer.dev/`.
- It exposes: editable slug, live availability state
  (available / in-use / invalid), friendly public URL, **Guardar enlace**,
  **Copiar**, and **Abrir** (new) actions.
- Mounted in `src/routes/qr.tsx` directly above the QR preview/share controls,
  scoped to the primary profile.

## 3. Slug authority reused

No slug architecture was rewritten. The relocation reuses:

- `profiles.slug` for the primary profile via the existing
  `profileService.updateProfile` authority.
- `src/lib/page-alias.ts` for normalization, validation and reserved-route
  protection (`normalizePageAlias`, `isValidPageAlias`, `isReservedPageAlias`).
- Live availability via an owner-scoped `profiles` query (`.eq("slug")` +
  `.neq("id", profileId)`).
- `src/lib/url.ts#getAliasProfileUrl` for the friendly URL (`cripqer.dev/{slug}`).

`public_id` is never written, regenerated or displayed as editable — unchanged.

## 4. Child Page handling

Per-page alias support is preserved and intentionally NOT forced into the
global `/qr` screen. Child Pages keep their own `pages.slug` authority through
the existing Pages Hub / Page settings UI:

- `src/routes/pages.$pageId.tsx` (`PageAliasSection`) still edits `pages.slug`
  via `pageAliasService.savePageAlias` with normalization/validation and
  collision handling.
- The child alias namespace (`/pg/a/{slug}`) and the stable `/pg/{public_id}`
  identity are untouched.

## 5. Files changed

- `src/components/qr/CustomPublicLinkControl.tsx` — relocated + compact card,
  added live "in-use" state and "Abrir" action.
- `src/components/power-editor/CustomPublicLinkControl.tsx` — deleted.
- `src/components/power-editor/PowerEditorHost.tsx` — removed control mount and
  unused imports.
- `src/routes/qr.tsx` — added "Personaliza tu enlace" section wired to the
  primary profile.
- `src/components/qr/__tests__/custom-link-relocation.test.ts` — relocation
  contract guard (new).

## 6. Tests

Relocation + slug authority suites pass:

- `src/lib/__tests__/page-alias.test.ts` — normalization, validation, reserved routes.
- `src/services/__tests__/page-alias.service.test.ts` — owner-scoped write,
  `public_id` immutability, collision, foreign-page rejection.
- `src/lib/__tests__/url.test.ts` — friendly alias URL resolution (unchanged).
- `src/components/qr/__tests__/custom-link-relocation.test.ts` — Power Editor
  no longer renders the control; QR area renders it; no duplicate source; child
  page authority retained.

## 7. Visual result

- Power Editor: the large white "Enlace de tu página" block above Creator
  Premium is gone; the canvas begins at the top of the workspace.
- QR area: a compact "Personaliza tu enlace" card sits near the QR preview and
  share controls, consistent with existing Cripqer dashboard cards.

## Acceptance

- `POWER_EDITOR_WHITE_LINK_BLOCK_REMOVED` — yes (code-level).
- `NO_DEAD_VERTICAL_SPACE_PASS` — yes (no reserved wrapper/spacer).
- `CUSTOM_LINK_QR_SECTION_PASS` — yes (code-level).
- `SLUG_FUNCTIONALITY_PRESERVED` — yes (reused authorities).
- `PUBLIC_ID_IMMUTABILITY_PRESERVED` — yes.
- `NO_DUPLICATE_CONTROL_PASS` — yes (single source: `qr/CustomPublicLinkControl.tsx`).
