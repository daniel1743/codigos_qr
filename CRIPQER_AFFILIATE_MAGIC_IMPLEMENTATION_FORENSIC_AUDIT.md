# CRIPQER — Affiliate / Product Swipe Magic Integration Forensic Audit

**Mode:** \`STRICT_READ_ONLY_IMPLEMENTATION_AUDIT\`  
**Date:** 2026-10-01  
**Scope:** Real Magic-facing editor at \`/pages/$pageId/edit\`; Power Editor intentionally excluded.

## Executive verdict

**Final verdict: \`AFFILIATE_PARTIALLY_IMPLEMENTED\`**

The Magic Patterns Affiliate Product Swipe exists as a standalone reference prototype, not as a directly integrated Affiliate editor. The real Cripqer Magic editor does contain a meaningful, persisted catalog/card adaptation: a user can select the \`Catálogo\` page family, add a catalog block, edit card content and presentation, duplicate/delete cards, and persist the Magic document. The production adaptation is not equivalent to the reference Affiliate Product Swipe and is missing several defining capabilities.

Runtime interaction was **not verified** in this audit because the authenticated production route was not launched. Conclusions below are based on source, persisted-document contracts, route wiring, and read-only Git/ZIP inspection.

## Reference ZIP architecture

Reference: \`COMPRIMIDOS/marqueting afiliados.zip\`.

The ZIP is a self-contained Vite application:

- \`src/App.tsx:1-12\` mounts \`AffiliateEditor\` directly.
- \`src/pages/AffiliateEditor.tsx:17-56\` owns the standalone editor shell, responsive desktop/mobile stages, toolbar, and \`EditorProvider\`.
- \`src/contexts/EditorContext.tsx:1-19\` is a reference-local context.
- \`src/hooks/useTemplateEditor.ts:22-26,49-90\` defines an in-memory \`EditorDoc\` containing \`products\`, \`globals\`, and \`settings\`; mutations are React state/history operations.
- \`src/types/template.ts:36-77\` defines the reference product, CTA, price, rating, global, spacing, typography, background, and CTA settings model.

The reference renders one product per viewport with horizontal scrolling and CSS snap:

- \`src/components/template/AffiliateTemplate.tsx:11-40,67-85\` uses \`overflow-x-auto\`, \`snap-x\`, \`snap-mandatory\`, \`snap-center\`, one full-width slide per product, and active-index tracking.
- \`src/components/template/Pagination.tsx:12-71\` provides dots/progress pagination.
- \`src/components/template/AffiliateTemplate.tsx:88-113\` provides the swipe hint.
- \`src/components/template/ProductStory.tsx:89-238\` renders image, title/subtitle, rating, price/compare-at price, recommendation, and external CTA.

Reference CRUD/editing capabilities:

- Product fields are updated through \`updateProduct\` / \`updateProductElement\` in \`src/hooks/useTemplateEditor.ts:110-138\`.
- Element removal/hide/restore and presets are implemented in \`src/hooks/useTemplateEditor.ts:200-341\`.
- The exported editor API contains no persistence or reload adapter (\`src/hooks/useTemplateEditor.ts:344-376\`); \`initialProducts\` are local static data in \`src/data/products.ts:12-77\`.
- Therefore the reference persistence model is **in-memory only**.

## Production search results

The requested Affiliate-specific names and fields were searched across production source (\`src\`, \`supabase\`, \`scripts\`, and \`public\`), including:

\`AffiliateTemplate\`, \`AffiliateEditor\`, \`ProductStory\`, \`affiliate\`, \`afiliad\`, \`productSwipe\`, \`product-swipe\`, \`productStory\`, \`product-story\`, \`affiliateUrl\`, \`affiliateLink\`, \`compareAt\`, \`compareAtPrice\`, \`reviewCount\`, \`swipeHint\`, \`horizontalSnap\`, and \`paginationDots\`.

Findings:

- No production \`AffiliateTemplate\`, \`AffiliateEditor\`, \`ProductStory\`, \`affiliateUrl\`, \`affiliateLink\`, \`swipeHint\`, or horizontal-snap implementation was found.
- \`reviewCount\` exists only in premium trust-signal types/inspector code, not in the Magic \`PageDoc\` catalog model; this is not Affiliate Product Swipe integration.
- The real Magic code has a generic product/catalog route through \`catalog\`, \`CardFamily\`, and \`CardItem\`, but this is a separate model and renderer.

## Real route reachability

The canonical route is wired as follows:

- \`src/routes/pages.$pageId.edit.tsx:13-31\` routes normal \`/pages/$pageId/edit\` traffic to \`MagicProductionEditorHost\`; only the undocumented \`legacyEditor=1\` path selects the old Power Editor, and \`directEditor=magic\` selects a separate pilot host.
- \`src/features/magic-page-editor-production/MagicProductionEditorHost.tsx:27-72\` authenticates, loads the owned page, and creates a \`PageEditorSession\` from persisted \`template_config\`.
- \`src/features/magic-page-editor-production/MagicProductionEditorHost.tsx:93-177,365-383\` saves Magic documents, publishes them, and mounts \`MagicEditorApp\`.
- \`src/isolated/magic-page-editor/MagicEditorApp.tsx:12-29,31-69\` accepts only \`bio\`, \`business\`, and \`portfolio\` template IDs and mounts the production \`EditorContext\`/ \`EditorPage\`.

The production page-family selector is real and reachable, but it contains no Affiliate family:

- \`src/isolated/magic-page-editor/components/editor/TopBar.tsx:22-34,81-90\` exposes \`Bio\`, \`Negocio / Servicios\`, \`Catálogo\`, \`Portafolio\`, and \`Mini Galería\`.
- \`src/isolated/magic-page-editor/types/editor.ts:3,27-44,79-138\` defines the three template IDs and generic block/card families, with no Affiliate/Product Swipe type.
- \`src/isolated/magic-page-editor/data/blockKit.ts:61-100\` exposes \`Catálogo\` and other generic blocks; no Product Swipe/Product Story block exists.

**Reachability classification:** \`PARTIAL_REACHABILITY\` for product/catalog behavior; \`NOT_REACHABLE\` for the reference Affiliate editor itself.

## PageDoc / data model

Production Magic persistence uses \`PageDoc\` and a serialized Magic document, not the reference \`Product[]\` model:

- \`src/isolated/magic-page-editor/types/editor.ts:160-166\` defines \`PageDoc\` as \`blocks\`, \`texts\`, \`textStyles\`, \`props\`, and \`removed\`.
- \`src/features/magic-page-editor-production/magic-document.ts:7-22\` defines \`MagicPageDocumentV1\`; \`props\` are string-keyed records and \`blocks\` are \`BlockRef[]\`.
- \`src/features/magic-page-editor-production/magic-document.ts:73-95,104-131\` restricts Magic documents to template IDs \`bio\`, \`business\`, and \`portfolio\`, then serializes/hydrates the PageDoc.
- \`src/features/magic-page-editor-production/document-session.ts:24-66\` recognizes and reloads \`MAGIC_V1\`; canonical/direct/unknown documents are separate paths.
- \`src/features/magic-page-editor-production/MagicProductionEditorHost.tsx:93-177\` proves the Magic V1 document is saved and published through the production service.

Catalog card data is partly static family data plus persisted per-card overrides:

- \`src/isolated/magic-page-editor/data/cardFamilies.ts:8-34\` defines the visible catalog family and its three static example \`CardItem\`s.
- \`src/isolated/magic-page-editor/components/cards/CardFamilyBlock.tsx:25-49\` derives card order from \`doc.props\` and renders cards by stable card IDs.
- \`src/isolated/magic-page-editor/utils/cardOps.ts:15-23,40-78\` stores order in \`props[blockKey].order\`, creates duplicate IDs, and clones text/style/prop/removed records.

The production \`CardItem\` model supports image, title, description, eyebrow, meta, price, previous price, badge, and CTA label (\`src/isolated/magic-page-editor/types/editor.ts:104-115\`). It does **not** support Affiliate URL, rating, review count, recommendation copy, product-level image fit, or per-product CTA URL as a CardItem field.

## Editor controls

The real catalog cards are editable in the Magic canvas:

- \`src/isolated/magic-page-editor/components/cards/FamilyCard.tsx:89-97,205-237\` renders editable image, body, card surface, layout, and styling surfaces.
- \`src/isolated/magic-page-editor/components/cards/CardBody.tsx:57-125\` exposes editable title, description, price, previous price, badge, and CTA label/presentation.
- \`src/isolated/magic-page-editor/components/cards/cardActions.tsx:57-166\` exposes preset, layout, image position/proportion/shape, style, colors, duplicate, and delete actions.
- \`src/isolated/magic-page-editor/components/cards/cardActions.tsx:170-205,209-273,277-298\` exposes price, badge, and CTA alignment actions.

Control classification for the Affiliate requirements:

| Control | Production status | Evidence |
|---|---|---|
| Product image | \`EDITABLE\` | \`FamilyCard.tsx:89-93\`; editable image path |
| Image fit | \`PARTIAL\` | Image shape/layout controls exist; no Affiliate \`contain/cover\` product model |
| Title | \`EDITABLE\` | \`CardBody.tsx:93-95\` |
| Subtitle | \`MISSING\` | No dedicated subtitle field in \`CardItem\` |
| Description | \`EDITABLE\` | \`CardBody.tsx:98-103\` |
| Price | \`EDITABLE\` | \`CardBody.tsx:57-65\` |
| Compare-at price | \`ADAPTED\` | \`previousPrice\`, \`CardBody.tsx:68-70\` |
| Rating / review count | \`MISSING\` | No fields in \`CardItem\` |
| Affiliate URL | \`MISSING\` | CTA href is hardcoded to \`https://\` in \`CardBody.tsx:114-125\` |
| CTA label | \`EDITABLE\` | \`CardBody.tsx:114-125\` |
| Background / spacing | \`EDITABLE\` | \`Block.tsx:26-47\`; card surface controls |
| Typography | \`EDITABLE\` | \`EditableText\` and text-style editor paths |
| CTA style | \`EDITABLE\` | \`CardBody.tsx:39-42,116-124\`; card actions |
| Branding | \`PARTIAL\` | Existing Magic shell/branding; no Affiliate-specific branding model |

## Product CRUD

For the production catalog adaptation:

- Add catalog block: \`BlockPicker.tsx:14-45,61-100\` and \`EditorContext.tsx:671-687\`.
- Duplicate card: \`cardActions.tsx:148-155\` → \`duplicateCard\`; \`cardOps.ts:56-78\` clones all persisted card edits.
- Delete card: \`cardActions.tsx:157-166\` → \`deleteCard\`; \`cardOps.ts:40-46\` removes the ID from stored order.
- Reorder card: \`cardOps.ts:25-38\` implements move-by-direction; \`CardAdvanced.tsx\` exposes the card structure controls.
- Add a new arbitrary product story/card with independent product fields: **not implemented**. The catalog uses static family items and duplicates their persisted overrides.

Therefore: catalog card CRUD is meaningful and persisted, but Affiliate product-story CRUD is incomplete. There is no Affiliate-specific add/remove/reorder product collection with independent \`Product\` records.

## Swipe / snap

**Classification: \`MISSING\` for production Affiliate behavior.**

The reference has explicit horizontal snap in \`COMPRIMIDOS/marqueting afiliados.zip\`, \`src/components/template/AffiliateTemplate.tsx:67-85\`. The real Magic catalog uses a responsive grid:

- \`src/isolated/magic-page-editor/components/cards/CardFamilyBlock.tsx:42-49\` renders \`grid grid-cols-12\`.
- \`src/isolated/magic-page-editor/components/cards/FamilyCard.tsx:100-203\` renders card layouts inside that grid.

No production \`overflow-x-auto\`, \`snap-x\`, one-product-per-viewport track, swipe hint, pagination indicator, or public swipe implementation was found in the Magic catalog path.

## Persistence

**Classification: \`PARTIALLY_PERSISTED\` for the catalog adaptation; \`IN_MEMORY_ONLY\` for the reference.**

Production proof from source:

- Magic V1 serialization stores \`blocks\`, \`texts\`, \`textStyles\`, \`props\`, and \`removed\` (\`magic-document.ts:104-117\`).
- The host loads \`ownedPage.template_config\` and rehydrates it (\`MagicProductionEditorHost.tsx:52-72\`).
- Changes are debounced and saved through \`magicPageService.saveDraft\` (\`MagicProductionEditorHost.tsx:130-157\`).
- Publish writes the serialized state through \`magicPageService.publish\` (\`MagicProductionEditorHost.tsx:162-177\`).
- Reload uses \`hydrateMagicEditorState\` (\`magic-document.ts:120-131\`).

A real save/reload interaction was not run in this audit; the persistence contract is statically confirmed but runtime-confirmed proof is \`NOT_RUNTIME_VERIFIED\`.

## Public renderer

The production public Magic path exists and reuses the Magic renderer:

- \`src/routes/pg.$publicId.tsx:63-82\` reads only the published RPC projection and accepts a valid Magic document.
- \`src/routes/pg.$publicId.tsx:147-158\` selects \`MagicPublicRenderer\` for Magic documents.
- \`src/features/magic-page-editor-production/MagicPublicRenderer.tsx:21-55\` hydrates the published Magic document in preview mode and renders the shared \`TemplateRenderer\`.
- \`src/isolated/magic-page-editor/components/templates/TemplateRenderer.tsx:9-16\` dispatches catalog documents to \`CatalogTemplate\`.
- \`src/isolated/magic-page-editor/components/templates/CatalogTemplate.tsx:9-13\` renders \`CardFamilyBlock\`.

Public catalog rendering is therefore **\`PASS\` for the existing card/catalog model**, but **\`MISSING\` for Affiliate Product Swipe**: no affiliate URL field, rating/review model, one-product viewport, or snap behavior is present. \`MagicPublicRenderer.tsx:22-41\` tracks generic anchor clicks as \`link_click\`; it does not define \`affiliate_click\`, \`product_view\`, or \`swipe\` events.

## Desktop and mobile

The real Magic editor has desktop/mobile device state and responsive catalog layout:

- \`src/isolated/magic-page-editor/types/editor.ts:3-7\` defines desktop/mobile device modes.
- \`src/isolated/magic-page-editor/components/cards/CardFamilyBlock.tsx:21-49\` switches padding/gap for mobile.
- \`src/isolated/magic-page-editor/components/cards/FamilyCard.tsx:35-38,100-203\` switches layout and sizing for mobile.

This is responsive card rendering, not the reference mobile swipe experience. Public route mobile behavior for Affiliate swipe was not verified and is not implemented in the production catalog renderer.

## Analytics readiness

**Audit-only result:** generic link analytics exists, but Affiliate-specific event compatibility is not wired.

- \`MagicPublicRenderer.tsx:22-41\` emits a generic \`link_click\` event shape for anchors.
- \`pg.$publicId.tsx:113-144\` maps generic events to existing analytics, including generic \`product\`/\`button\` interaction categories, but there is no explicit Affiliate \`affiliate_click\` or \`swipe\` source event.
- No production Magic source for \`product_view\`, \`affiliate_click\`, or \`swipe\` was found.

## Git history

Read-only Git inspection found:

- Current branch: \`codex/ui-migration-phase-1a-shell-home\`, tracking \`origin/codex/ui-migration-phase-1a-shell-home\`.
- Worktree is dirty before this report, with pre-existing modified files and many untracked files; these were not changed by the audit.
- Existing branches include \`origin/magic-patterns/magic-frame-prototype\`, but the reference Affiliate files are not present in the tracked production path inspected here.
- The ZIP has checkpoint-style historical entries, but no commit history proving that \`AffiliateEditor.tsx\`, \`AffiliateTemplate.tsx\`, or the reference \`Product\` model was ported into the real Magic route.
- Git history contains many generic \`product\` matches due unrelated product/catalog work, but no authoritative Affiliate integration commit was found.
- No checkout, reset, clean, commit, or branch mutation was performed.

## Reference vs Production matrix

| Capability | Reference ZIP | Production code | Reachable in real editor | Persisted | Public renderer | Status | Evidence |
|---|---|---|---|---|---|---|---|
| Affiliate page/editor entry | Standalone \`App\` → \`AffiliateEditor\` | No Affiliate entry; Magic route mounts \`MagicEditorApp\` | No | N/A | N/A | \`REFERENCE_ONLY\` | ZIP \`App.tsx:1-12\`; \`pages.$pageId.edit.tsx:22-31\` |
| One product per viewport | Yes | Catalog grid | No | No | No | \`MISSING\` | ZIP \`AffiliateTemplate.tsx:67-85\`; production \`CardFamilyBlock.tsx:42-49\` |
| Horizontal swipe/snap | Yes | Not found | No | No | No | \`REFERENCE_ONLY\` | ZIP \`AffiliateTemplate.tsx:67-85\` |
| Pagination / swipe hint | Yes | Not found | No | No | No | \`REFERENCE_ONLY\` | ZIP \`Pagination.tsx:12-71\`; \`AffiliateTemplate.tsx:88-113\` |
| Product image/title/description/price | Yes | Catalog card adaptation | Yes, catalog only | Yes via PageDoc props/texts | Yes via MagicPublicRenderer | \`ADAPTED\` | ZIP \`template.ts:36-51\`; production \`CardItem:104-115\`, \`CardBody.tsx:57-103\` |
| Compare-at price | Yes | \`previousPrice\` | Yes, catalog only | Yes | Yes | \`ADAPTED\` | ZIP \`template.ts:24-27\`; production \`CardBody.tsx:68-70\` |
| Rating/review count | Yes | No CardItem fields | No | No | No | \`MISSING\` | ZIP \`template.ts:19-22\`; production \`editor.ts:104-115\` |
| Affiliate URL per product | Yes | CTA href hardcoded \`https://\` | No | No | No | \`MISSING\` | ZIP \`products.ts:28-32\`; production \`CardBody.tsx:114-125\` |
| Product add/remove/reorder | Reference fixed initial products; element editing only | Catalog duplicate/delete/reorder of static card IDs | Partial | Yes | Yes | \`PARTIAL\` | ZIP \`useTemplateEditor.ts:49-90\`; production \`cardOps.ts:15-78\`, \`cardActions.tsx:148-166\` |
| Product field edit controls | Extensive reference fields | Generic card fields | Partial | Yes | Yes | \`PARTIAL\` | ZIP \`ProductStory.tsx:127-238\`; production \`CardBody.tsx:72-125\` |
| Persistence save/reload | No | Magic V1 save/hydrate/publish | Contract yes; runtime not run | Yes | Yes | \`ADAPTED\` | production \`magic-document.ts:104-131\`; host \`130-177\` |
| Public published rendering | Reference viewer state | Shared Magic public renderer | Yes for catalog | Yes | Yes | \`ADAPTED\` | \`pg.$publicId.tsx:63-82,147-158\`; \`MagicPublicRenderer.tsx:43-53\` |
| Affiliate analytics events | Not wired as production analytics | Generic link click only | No | N/A | Partial generic tracking | \`MISSING\` | \`MagicPublicRenderer.tsx:22-41\`; \`pg.$publicId.tsx:113-144\` |

## Missing pieces

Already present:

1. A real Magic production route and host.
2. A persisted \`PageDoc\` / \`MagicPageDocumentV1\` contract.
3. A reachable \`Catálogo\` family and generic card block.
4. Editable image, title, description, price, previous price, badge, CTA label, layout, style, spacing, and card CRUD operations.
5. A published Magic public renderer that rehydrates the same serialized document.

Missing for the Affiliate Product Swipe capability:

1. An Affiliate/Product Swipe page family or template in the real Magic editor.
2. A production \`ProductStory\`-equivalent data model with stable product records and independent order.
3. Product subtitle, recommendation, rating, review count, image-fit, and per-product affiliate URL fields.
4. A real editable affiliate CTA URL; the catalog CTA currently renders with a placeholder \`https://\` href.
5. One-product-per-viewport horizontal track, touch swipe, desktop overflow behavior, CSS snap/equivalent, pagination, and swipe hint.
6. Public Affiliate/Product Swipe rendering using the same persisted fields and unique affiliate links.
7. Explicit \`product_view\`, \`affiliate_click\`, \`cta_click\`, and \`swipe\` event sources.
8. Runtime save/reload, multi-product, desktop, mobile, and published smoke evidence.

## Smallest safe next phase

The smallest safe next phase is a design/contract phase, not implementation:

1. Decide whether Affiliate is a new Magic page family or a first-class catalog/card collection variant.
2. Extend the existing \`PageDoc\`/Magic V1 contract once, reusing \`EditorContext\`, existing persistence, and \`TemplateRenderer\`/\`MagicPublicRenderer\` boundaries.
3. Define stable product item IDs, ordered product storage, field ownership, CTA URL validation, and public analytics event names.
4. Add a single shared editor/public renderer path with desktop and mobile tests before exposing it in the page-family selector.
5. Prove save → reload → publish → \`/pg/{public_id}\` with a non-QA fixture.

Do **not** create a second \`AffiliateEditor\`, second \`EditorContext\`, parallel persistence service, or third serialized document format. The ZIP's standalone editor should remain reference material only.

## Recommended next action

Treat the Magic Patterns Affiliate Product Swipe as a reference prototype and the current production catalog as a partial adaptation. Do not claim Affiliate integration is complete. The next implementation should be deliberately scoped as a first-class extension of the existing Magic/PageDoc/public-renderer architecture, with the production route and persistence contract established before adding the swipe UI.

## Audit status

\`AUDIT_COMPLETE\` — read-only inspection completed; one report created; no production code, tests, database, deployment, Vercel configuration, branch state, or Power Editor was modified.

