# Cripqer — P0 Portfolio Full Media Editability V1

**Status:** CRIPQER_P0_PORTFOLIO_MEDIA_EDITABILITY_IMPLEMENTED

## Result

Portfolio items are now complete editable objects for the existing Portfolio schema. The repair reuses item id, imageUrl, label, description and url; no new Portfolio schema or global collection architecture was introduced.

Each Portfolio item now exposes:

- Current image preview when imageUrl is present.
- Cambiar imagen through the existing owner-media AssetField.
- Agregar imagen for image-less items.
- Clearable image state without silently restoring stock photography.
- Editable project title, description/category and destination URL.
- Atomic item deletion through the existing array-object filter.

The parent-block selection model remains unchanged. Selecting Portfolio opens the specialized item editor; direct canvas item selection and global collection reorder remain out of scope as required.

## Root cause repaired

PortfolioBlock rendered content.items[].imageUrl, but BlockInspector routed Portfolio through the generic ItemsEditor. The generic editor only exposed label, URL, description and optional media controls for Links/ButtonGroup presentation items. Portfolio imageUrl therefore had a renderer authority but no user-facing Inspector authority.

## Media and undo handling

Portfolio item media uses the existing AssetField and owner-media adapter. For this P0 path:

- replacement and clear operations set the canonical item imageUrl;
- previous physical assets are not deleted during Portfolio replacement/clear;
- reducer history can restore the previous complete item/configuration without making that URL less likely to resolve;
- no temporary blob URL is introduced by the Portfolio editor;
- the public renderer consumes the same item imageUrl, so replacement is reflected publicly;
- image-less state remains valid because PortfolioBlock already renders its SafeImage fallback.

This is intentionally scoped asset safety. It does not redesign global asset garbage collection. Unreferenced prior Portfolio assets may require later deferred cleanup, but this task does not make Undo destructive.

## Item lifecycle

Deleting a Portfolio item filters the complete object from content.items, including imageUrl, label, description, URL and any future item fields. No detached caption or image reference remains in the block array. Existing reducer undo restores the complete prior item collection.

Adding a project creates an item with the existing fields and an empty imageUrl. The owner can immediately assign an image, then edit title, description and URL without rebuilding the Portfolio block.

## Presets and template impact

The repair is type-based in BlockInspector and therefore applies automatically to:

- Portfolio Bento
- Portfolio Gallery (its gallery images already had dedicated media authority)
- Portfolio Editorial

It also applies to any full template or recipe that contains a Portfolio block, including future configurations, without changing template definitions.

The Portfolio Gallery preset is represented by GalleryBlock rather than PortfolioBlock; its existing gallery editor already supports per-image replace/upload/remove/reorder. The three Portfolio presets were verified as containing replaceable media surfaces after the fix.

## Files changed

- src/premium-template-studio/components/inspector/Inspector.tsx
- src/premium-template-studio/**tests**/portfolioMediaEditability.test.tsx
- CRIPQER_P0_PORTFOLIO_FULL_MEDIA_EDITABILITY_V1_REPORT.md

## Tests added

The targeted test contract covers:

- existing demo item image authority and current preview;
- replacement scoped to one item;
- public renderer using the replacement image and retaining sibling media;
- complete item deletion and reducer undo restoration;
- Portfolio-family preset media presence and editability path.

## Verification status

- git diff --check completed without content whitespace errors; the repository continues to report existing CRLF normalization warnings.
- The targeted Vitest command reached Vite route discovery and test startup but did not finish within the available command window. No false passing runtime gate is claimed.
- Browser smoke remains required for upload through the configured owner-media adapter, save/reload persistence and public rendering.

The code path is implemented, but the requested CRIPQER_P0_PORTFOLIO_MEDIA_EDITABILITY_CODE_TEST_PASS_FROZEN gate remains pending until the test runner completes and browser smoke confirms owner-media persistence.
