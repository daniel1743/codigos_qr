# CRIPQER SMART PAGES — RETAIL SEMANTIC MAPPING V1

**Task ID:** `CRIPQER_SMART_PAGES_4_RETAIL_SEMANTIC_MAPPING_V1`  
**Agent:** CODEX  
**Branch:** `feat/basic-editor-editorial-canvas-ui`  
**Type:** `CONTROLLED_IMPLEMENTATION + CONTRACT_TESTS + RENDERER_SMOKE`

## Verdict

`SMART_PAGES_4_RETAIL_SEMANTIC_MAPPING_PASS_FROZEN`

The approved Smart Pages retail semantics now flow through the existing host
generation path:

`Retail semantics → host capability gate → Smart Pages host map → PAGES_7 adapter → Engine V2 → BioTemplateConfig → PublicTemplateRenderer`

The implementation maps owner products, prices, images, supplied product links,
featured products, supported banner media, CTA destinations, and the existing
responsive product presentation. Categories, secondary collections, benefits,
density semantics, rich item detail, and transaction capabilities remain
diagnostic/deferred exactly as required by the prompt.

No Retail Engine, Retail Runtime, second renderer, second catalog schema,
second persistence path, database change, or package runtime import was added.

## Phase 0 — Read-only confirmation

### AUTHORITATIVE_RETAIL_SOURCE

`proyecto de integraciones/integrar pages y catalogo cripqer/CRIPQER_SMART_PAGES_V1_1_1/CRIPQER_SMART_PAGES_V1_1_1/retail-presentation.ts`

The authoritative package tree was confirmed and remained read-only. The
authoritative retail module matches the audited presentation-only contract:
category tiles, featured item IDs, real-media banner selection, secondary
collection semantics, owner differentiators/badges as benefits, and standard or
dense grid intent.

### Existing capability confirmation

| Capability                          | Result                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Current `product` block             | Supported by Engine V2, canonical types, registry, and renderer.                                                     |
| Current `productGrid` block         | Supported by registry and renderer; Engine planner required a host-side field-name projection described below.       |
| `featuredMedia` / `featuredLink`    | Supported by current Engine V2 and renderer when supplied media and destination are valid.                           |
| Owner media                         | Supported through existing `coverImageUrl`, `userMedia`, and `ContentSourceV2` media fields.                         |
| Price representation                | Supported as owner-supplied display strings; amount/currency is formatted without inventing a value.                 |
| CTA destinations                    | Existing host vocabulary is reused; WhatsApp phone input is projected to the renderer's valid `https://wa.me/…` URL. |
| Responsive grid                     | Supported by existing Engine layout and canonical responsive rules.                                                  |
| Existing Retail mapper              | None found before this task.                                                                                         |
| New canonical fields required       | No.                                                                                                                  |
| Renderer changes required           | No.                                                                                                                  |
| Engine V2 internal changes required | No.                                                                                                                  |

## Implementation

### FILES_CREATED

- `src/lib/smart-pages/retail-presentation.ts`
- `src/lib/page-generator/smart-pages-retail-map.ts`
- `src/lib/page-generator/__tests__/smart-pages-retail-map.test.ts`
- `CRIPQER_SMART_PAGES_4_RETAIL_SEMANTIC_MAPPING_V1_REPORT.md`

### FILES_MODIFIED

- `src/lib/page-generator/smart-pages-host-map.ts` — additive retail gate and
  host projection composition.
- `src/lib/page-generator/index.ts` — exports the host retail seam.

`src/lib/smart-pages/index.ts` was kept compatible with the existing Smart
Pages 2 architecture contract; the retail module is imported directly by the
host seam and does not expand the older six-module public barrel.

### SOURCE_PACKAGE

`PACKAGE_CHANGED = NO`

The ZIP and authoritative package files were not modified, renamed, deleted,
or copied into production runtime paths.

## Retail semantic core

`src/lib/smart-pages/retail-presentation.ts` is a pure, transient adaptation of
the authoritative package module. It provides:

- `RetailCategoryTileV1` with real category label, enabled item count, and
  optional owner media;
- `RetailCollectionV1` with deterministic category/item references;
- `RetailBannerV1` selected from real gallery/category/business media;
- `RetailBenefitV1` sourced only from owner differentiators or badges;
- `RetailPresentationV1` containing category, featured, banner, collection,
  benefit, and density semantics;
- `deriveRetailPresentation()` with stable ordering and no commercial claim
  fabrication.

The module does not define persistence, product transactions, a renderer,
`BioTemplateConfig`, or a replacement catalog model.

## Host capability gate

`src/lib/page-generator/smart-pages-retail-map.ts` exposes the pure host gate:

`mapRetailPresentationToHostInput(request, plan, baseInput, presentation?)`

It returns a transient presentation, supported `ContentSourceV2` blocks, an
augmented existing `GeneratedPageInput`, and diagnostics in four categories:

- `mapped`: safely represented in the current host/Engine contract;
- `deferred`: valid retail meaning with no approved canonical representation;
- `rejected`: unsupported or required owner data that cannot be emitted;
- `warnings`: human-readable no-silent-drop explanations.

The production path derives the presentation from normalized owner content. The
optional supplied presentation exists only to make semantic edge cases directly
contract-testable; it does not create a persistent alternate source.

### Host composition

`smart-pages-host-map.ts` now applies the retail gate only for the existing
`catalog` experience. It then:

1. maps supported retail content into `ContentSourceV2`;
2. calls the existing `mapGeneratedPageToEngineInput()` exactly once;
3. merges only the retail-supported `contentBlocks` into that adapter result;
4. calls the existing `generateCripqerPageWithEngineV2()` exactly once;
5. validates the resulting canonical document with the existing
   `validateTemplate()`.

There is no retail persistence, UUID creation, public ID creation, QR creation,
publish call, Supabase access, or second Engine call.

## Supported mapping

### PRODUCT_MAPPING

Enabled owner catalog items map to existing `ContentProductV2` values:

- `CatalogItemV1.name` → `title`;
- owner description → `description`;
- owner image media → required `imageUrl`;
- owner `PriceV1.label` → exact display `price`;
- otherwise supplied finite amount plus currency → display price string;
- owner URL/link attribute or supported owner action → `ctaUrl`.

The current product contract requires real image media. A product without an
owner image is rejected before Engine generation; it is not silently dropped or
given a placeholder.

### PRODUCT_GRID_MAPPING

- one owner product → existing `product` planning path;
- multiple owner products → existing `productGrid` planning path;
- no `products` canonical field was added;
- no catalog database or `listings` page type was added.

The real smoke exposed a pre-existing boundary mismatch: `blocks-v2.ts` plans
product-grid children under `content.items`, while the frozen
`ProductGridBlock` reads `content.products`. The host gate applies a pure
retail-only projection from `items` to `products` after Engine generation and
before the existing canonical envelope is returned. Engine V2 and the renderer
remain unchanged; the renderer receives the field it already consumes.

### FEATURED_MAPPING

The first real featured owner item with valid supplied media and a supported
destination maps to the existing Engine `featured` content shape. Engine V2 then
selects the already-supported `featuredLink` or `featuredMedia` canonical block
according to its existing media strategy.

- unknown featured IDs are diagnosed as deferred;
- a featured item missing supported media/link is diagnosed as deferred;
- no synthetic product, best-seller, popularity, trending, new-arrival, or
  scarcity claim is created.

### MEDIA_MAPPING

Real banner media from the retail presentation can fill the existing host
`coverImageUrl` only when the base input has no cover. Owner item media remains
on the product content path. Demo media from the Smart Pages package is never
used.

### PRICE_MAPPING

The owner label is preserved verbatim when supplied. Numeric amount/currency is
formatted only as a display string. No compare price, discount, or old price is
inferred from another field.

### CTA_MAPPING

Existing host action vocabulary remains authoritative:

- WhatsApp action → existing WhatsApp host action;
- external URL → existing website action;
- external booking → existing booking action;
- email → existing email action.

The smoke showed that the existing Engine recipe carries a WhatsApp phone
number while the public CTA URL renderer expects a URL. The host projection
normalizes an owner-supplied valid phone only to
`https://wa.me/<digits>`. It does not invent the number or change the canonical
schema. Unsupported checkout actions remain rejected diagnostics and are not
emitted as product CTAs.

### RESPONSIVE_MAPPING

Retail does not add a `gridDensity` field. Existing Engine V2 columns and
canonical responsive layout rules continue to control mobile/tablet/desktop
presentation. Standard density is diagnosed as equivalent to the existing
default; dense intent remains deferred because no first-class canonical Retail
density contract exists.

## Deferred capability statuses

| Semantic                              | Status                 | Implementation behavior                                                                                           |
| ------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `categoryTiles` / category navigation | `DEFERRED`             | Category metadata and counts are retained in transient diagnostics; no category block or schema field is emitted. |
| `secondaryCollection`                 | `DEFERRED`             | Diagnosed and not emitted as a second rail; it is not silently relabeled as a new canonical collection.           |
| `benefits`                            | `DEFERRED`             | Real owner differentiators/badges are retained semantically; no unsupported benefit strip is generated.           |
| `gridDensity=dense`                   | `DEFERRED_AS_SEMANTIC` | Existing layout behavior remains; no `gridDensity` canonical field is invented.                                   |
| rich item detail/modal/detail page    | `DEFERRED`             | No modal runtime, detail router, or second product renderer.                                                      |
| stock/inventory                       | `UNSUPPORTED`          | Diagnosed when supplied as an attribute; never emitted.                                                           |
| SKU                                   | `UNSUPPORTED`          | Diagnosed when supplied as an attribute; never emitted.                                                           |
| discount/old price                    | `UNSUPPORTED`          | Never inferred or emitted.                                                                                        |
| checkout/cart/orders/payment          | `UNSUPPORTED`          | No transaction model, persistence, or checkout URL is created.                                                    |

## Owner data truth policy

- `FABRICATED_PRODUCT_DATA = NO`
- `FABRICATED_COMMERCIAL_CLAIMS = NO`
- `DROPPED_REQUIRED_OWNER_DATA = NO`

Required product owner data is rejected when the current canonical contract
cannot represent it, especially missing product media. Optional unsupported
retail semantics are surfaced in diagnostics rather than fabricated or hidden.

The host mapper preserves owner product name, description, price/display price,
image/media URL, supplied link, supported CTA target, category metadata for
diagnostics, and featured selection when representable.

## Canonical / renderer result

- `REAL_ENGINE_V2_USED = YES`
- `REAL_VALIDATE_TEMPLATE_RESULT = PASS`
- `REAL_PUBLIC_RENDERER_RESULT = PASS`
- `PRODUCT_GRID_RENDERED = YES`
- `OWNER_PRICES_PRESERVED = YES`
- `OWNER_MEDIA_PRESERVED = YES`
- `FEATURED_OWNER_ITEM_RENDERED = YES`
- `DEFERRED_SEMANTICS_CRASH_RENDERER = NO`
- `MASTER_PAGE_RUNTIME_USED = NO`

The renderer smoke uses the actual `PublicTemplateRenderer` with the actual
Engine-generated canonical config and server-side static rendering. It confirms
product names, owner price text, owner images, and featured output are present
in rendered HTML.

## Regeneration safety

- `EDITED_DOCUMENT_REGENERATION_ALLOWED = NO`
- `FRESH_DOCUMENT_GENERATION = PASS`

The retail phase does not implement preservation-aware Engine regeneration. The
existing Engine V2 conversion creates a fresh `BioTemplateConfig`; it must not
silently replace a manually edited canonical document. The retail host
projection is pure and in-memory and does not change that policy.

## Tests

### New Retail contract tests

`src/lib/page-generator/__tests__/smart-pages-retail-map.test.ts`

`NEW_RETAIL_TEST_COUNT = 7`  
`NEW_RETAIL_TEST_RESULT = 7/7 PASS`

Covered cases:

1. products, price, image, and CTA mapping;
2. real featured item preservation;
3. unknown featured ID diagnostics;
4. category/secondary/benefit deferral without unsupported blocks;
5. dense density deferral without invented canonical fields;
6. stock/SKU/discount/checkout non-invention and missing required product media
   rejection;
7. real Engine V2 → `validateTemplate` → `PublicTemplateRenderer` smoke.

### Regression

- `SMART_PAGES_2_REGRESSION = 32/32 PASS`
- `SMART_PAGES_3_REGRESSION = 6/6 PASS`
- Smart Pages 2 + 3 + Retail combined selected suite = `45/45 PASS`
- `PAGES_7_REGRESSION = 37/37 PASS` across all current
  `src/lib/page-generator/__tests__`
- Existing Engine V2 targeted featured/product tests = `2/2 PASS`
- Full Engine integration file was not claimed as a full pass; the repository
  test environment leaves some browser tasks open when the entire file is run.

### Quality

- `TARGETED_ESLINT = PASS`
- `TARGETED_TYPESCRIPT = PASS_WITH_NO_NEW_ERRORS`
- Full repository TypeScript remains non-zero because of pre-existing unrelated
  errors outside the authorized scope; no new Retail mapper error remains.
- No dependency was installed or modified.

## Architecture gates

- `SECOND_ENGINE = NO`
- `SECOND_CANONICAL = NO`
- `SECOND_RENDERER = NO`
- `SECOND_RETAIL_DB = NO`
- `SECOND_PERSISTENCE_PATH = NO`
- `MASTER_PAGE_RUNTIME_USED = NO`
- `SMART_PAGES_RUNTIME_IMPORTED = NO`
- `PACKAGE_RUNTIME_IMPORTED = NO`
- `PRODUCT_CATALOG_SOURCE_COUNT = 1`
- `SUPABASE_TOUCHED = NO`
- `CHECKOUT_IMPLEMENTED = NO`
- `CART_IMPLEMENTED = NO`
- `ORDERS_IMPLEMENTED = NO`

## Repository safety

- `ENGINE_V2_INTERNALS_CHANGED = NO`
- `CANONICAL_SCHEMA_CHANGED = NO`
- `TEMPLATE_VALIDATOR_CHANGED = NO`
- `PUBLIC_RENDERER_CHANGED = NO`
- `BLOCK_REGISTRY_CHANGED = NO`
- `EDITOR_CHANGED = NO`
- `DB_CHANGED = NO`
- `MIGRATION_CREATED = NO`
- `DEPENDENCY_ADDED = NO`
- `GIT_MUTATION_PERFORMED = NO`

Existing unrelated working-tree changes were preserved.

## Open constraints / future work

The following remain intentionally outside this phase:

- canonical first-class category tiles/navigation;
- secondary collection rail;
- benefits strip;
- explicit retail density contract;
- rich item detail/modal/detail routing;
- stock, SKU, discounts, availability, checkout, cart, orders, inventory,
  payment, and transaction history;
- preservation-aware regeneration of an edited canonical document;
- reconciliation of stale V1.5 capability catalogs with current V2 metadata;
- full browser/SSR matrix for every public route and animation combination.

## Success gate

`SMART_PAGES_4_RETAIL_SEMANTIC_MAPPING_PASS_FROZEN`

## Next

Recommended next task: `SMART_PAGES_5_ONBOARDING_TO_PAGE_GENERATION_REQUEST`.
It was not started automatically.
