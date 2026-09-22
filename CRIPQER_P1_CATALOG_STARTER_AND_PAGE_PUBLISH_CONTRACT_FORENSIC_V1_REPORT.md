# Cripqer — Catalog Starter Semantics and Page Publish Contract Forensic V1

**Status:** `CRIPQER_P1_CATALOG_STARTER_CODE_FIXED_PUBLISH_CONTRACT_DOCUMENTED_RUNTIME_PENDING`

## Catalog forensic result

The page-type mapping was correct in source:

| Page type   | Canonical starter |
| ----------- | ----------------- |
| `catalog`   | `store-bento`     |
| `portfolio` | `portfolio-bento` |

The IDs are distinct. The defect was semantic: `store-bento` composed
`hero-creator-bento-intro`, which supplied creator identity, avatar/social
surfaces and creator-oriented demo copy, while its product grid used generic
store defaults such as `Wireless Mouse` and `Mechanical Keyboard`.

Before repair, the effective catalog signature was materially different from
Portfolio but still misleading for a catalog: `hero`, `image`, `social`,
`productGrid`, `heading`, `contact`. Portfolio remains project-oriented through
`portfolio-bento` and its portfolio block/signature.

## Repair applied

The existing `store-bento` recipe remains canonical. A type-local transform now:

- removes creator image and social blocks from the starter composition;
- changes the identity to `Nuestro catálogo` / `Productos y soluciones`;
- provides catalog heading, description and CTA copy;
- supplies generic editable products: `Producto destacado`, `Producto clásico`
  and `Nueva colección`, with descriptions, prices, images and actions;
- supplies a contact/order path with `Consultar` and `Ver catálogo completo`.

No second template engine, schema, Pages architecture, authentication path or
Menu recipe was changed. Portfolio mapping and project-oriented defaults remain
independent.

The repaired effective catalog signature is `hero`, `productGrid`, `heading`,
`contact`; Portfolio remains a separate project/work composition.

## Verification

Targeted command:

```text
npx vitest run src/components/power-editor/__tests__/pageStarterConfig.test.ts src/premium-template-studio/__tests__/restaurantVisualStarter.test.ts src/premium-template-studio/__tests__/presetRuntimeRenderSweep.test.tsx src/services/__tests__/page-canonical.service.test.ts --pool=forks --maxWorkers=1
```

Result: **4 test files passed, 9 tests passed.**

The mapping assertions cover distinct catalog/portfolio IDs, product-grid
presence, catalog copy, absence of creator/portfolio defaults and preservation
of Portfolio's `Selected Works` semantics.

## Publish contract

The current child-page Publish action is explicit and page-scoped:

1. It reads the current child `template_config` envelope.
2. `pageCanonicalService.publish` validates the editor config.
3. It writes `pages.published_template_config`, `published=true`,
   `published_revision + 1` and `published_at`, guarded by owner and the
   expected publication revision.
4. It does not write `profiles`, profile canonical fields, child draft
   `template_config`, `public_id`, `slug` or `qr_config`.

The public child route is `https://www.cripqer.dev/pg/{public_id}` and reads
only the published child snapshot. A custom alias, when manually configured,
is `https://www.cripqer.dev/pg/a/{slug}`; it is convenience routing and does
not replace the stable public ID.

Unpublishing sets `published=false`, clears `published_at` and advances the
same publication revision while retaining the child snapshot.

## Bio and QR connection behavior

No automatic “Add to Bio” connection was found. Publishing a child page does
not create or update a button in the main Bio Landing. A user can manually
add a normal Bio link/button using the published `/pg/{public_id}` URL because
the existing link editor accepts owner-entered destinations; this is classified
as `MANUAL_SUPPORTED`, not automatic association.

Each child page has independent `pages.qr_config` persistence. The page QR
panel is user-triggered; saving it writes only that child row's QR config.
Publish does not automatically create a QR and does not modify the main
profile QR fields. The stable child QR destination is the page URL derived from
the child `public_id`.

## Runtime status

No fresh Catalog and Portfolio child pages were created during this forensic
task. Existing evidence pages (`/qa-dual-editor-test`, `luz maria`, `prueba`,
`elisa`, `sofia`) were not reused, published, edited or deleted. Therefore:

- catalog runtime semantics: **BLOCKED / PENDING**;
- portfolio no-regression runtime: **BLOCKED / PENDING**;
- publish behavior: **CODE-CONTRACT PASS**, browser publication not exercised;
- main Bio isolation: **CODE-CONTRACT PASS**, no runtime mutation performed;
- Bio automatic connection: **NOT IMPLEMENTED**;
- manual Bio link path: **SUPPORTED by generic link destination editing**;
- child QR independence: **CODE-CONTRACT PASS**, no QR mutation performed.

The success gate `CRIPQER_CATALOG_AND_PAGE_PUBLISH_CONTRACT_VERIFIED` remains
unfrozen until fresh disposable Catalog and Portfolio pages are observed in an
authenticated browser and their persisted signatures are captured before any
mutation.
