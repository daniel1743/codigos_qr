# CRIPQER CATALOG + SERVICES REAL PRODUCT FLOW V1

**Task ID:** `CRIPQER_CATALOG_SERVICES_REAL_PRODUCT_FLOW_V1`  
**Status:** `IMPLEMENTED — POWER EDITOR PRODUCT WORKFLOW; RUNTIME QA PENDING`  
**Success gate:** `CRIPQER_CATALOG_SERVICES_REAL_PRODUCT_FLOW_RUNTIME_PASS_FROZEN`

## Phase 0 findings

The existing canonical block contracts already supported product and service
items, including names, descriptions, prices, links/CTAs and image URLs. The
existing `AssetField` uses the Power Editor asset adapter, so child-page mode
already has the durable owner-media upload boundary. `ProductGridBlock` and
`ServicesBlock` already render the item arrays publicly. No second catalog
model, backend or storage architecture was needed.

The missing product behavior was user-facing item description for product-grid
items and explicit item reordering. Template switching also replaced the
current block array even when “keep content” was enabled, which could silently
discard owner-authored catalog/services blocks.

## Implemented

- Product-grid inspector now supports product title, price, description,
  owner image upload, CTA label and destination.
- Services inspector retains name, description, price, image and CTA editing.
- Product and service items have explicit move-up, move-down and remove
  controls; add-item controls remain in the same inspector.
- Template switching now preserves the complete current block composition when
  `keepContent` is enabled, including products, services, images, links and
  CTAs, while still changing the selected template shell.
- Existing child-page Power Editor persistence remains the sole save/reload
  path. No catalog/service table, API or competing editor was added.
- Fixed the existing inspector reference typo so the shared CTA style control
  resolves as `CtaStyleControls`.

## User flow

```text
Open /pages/{pageId}/edit
        ↓
Blocks → add Product Grid or Services section
        ↓
Select the block on canvas
        ↓
Inspector → add/edit/remove/reorder items
        ↓
Upload owner images through existing durable asset adapter
        ↓
Save → reload → Publish
        ↓
Public child Page renders the same canonical item order/content
```

## Contract and safety

- Product descriptions use the existing `BlockItem.description` field; no new
  pricing, checkout, inventory or ecommerce semantics were introduced.
- Product/service images remain owner-supplied durable URLs/references. No
  Unsplash/Pexels fallback or new bucket was added.
- Child-page edits continue through `PowerEditorHost` with `pages.template_config`
  and `pages.published_template_config`; the primary profile is not written.
- Public rendering continues through the existing ProductGrid/Services blocks
  and `PublicTemplateRenderer`.

## Verification

- Targeted product/template/Pages suite: **60/60 PASS**.
- Added template-switch preservation coverage for block composition and owner
  product fields.
- Directed TypeScript check reports no errors in the modified inspector,
  template factory, Pages routes or canonical service. Global TypeScript status
  is not claimed as green because unrelated repository errors may remain.
- `git diff --check`: no whitespace errors; only existing line-ending warnings.

## Runtime QA status

Authenticated catalog and services flows were not run in this environment:

- no attachable authenticated browser session was available;
- no credentials were entered or requested;
- no screenshots are claimed as captured;
- publish, public rendering, media reload and Page-A/Page-B live isolation are
  therefore `RUNTIME_NOT_VERIFIED`, not PASS.

## Remaining limitations

- Catalog/services are now editable in Power Editor, but there is still no
  separate catalog manager, inventory, checkout or analytics workflow.
- Product-level destination is a normal CTA URL; no ecommerce behavior was
  added.
- The existing Page lifecycle task still owns Publish/Unpublish and QR UI.
