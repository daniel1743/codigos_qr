# CRIPQER PAGES REAL PRODUCT FLOW AUDIT V1

**Task ID:** `CRIPQER_PAGES_REAL_PRODUCT_FLOW_AUDIT_V1`  
**Status:** `COMPLETE — READ-ONLY ARCHITECTURE AUDIT; HUMAN RUNTIME QA REMAINS`  
**Success gate:** `CRIPQER_PAGES_REAL_PRODUCT_FLOW_AUDIT_COMPLETE`

## Audit boundary

This audit inspected the route tree, Page/profile services, canonical
persistence, Power Editor target handling, public renderers, QR panel,
database migrations/RLS and the Page Generator. No product fix was applied.
The requested Playwright/browser attachment was not required for this audit;
capabilities that need a live account are explicitly marked `NOT_VERIFIED`.

## Product flow

```text
Authenticated profile
        ↓
      /pages  ──→ /pages/new
        ↓             ↓
  primary profile   simple or generated Page
                        ↓
                /pages/{pageId}/edit
                        ↓
          Power Editor → draft → Publish
                        ↓
        /pg/{public_id}  or  /pg/a/{slug}
                        ↓
              QR points to /pg/{public_id}
```

## Page model

| Question                      | Current answer                                                                                                                                                                                    | Classification       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Primary profile vs child Page | The primary page is the authenticated owner’s `profiles` row and its profile canonical fields. A child Page is a separate `public.pages` row linked by `profile_id` and owned by `owner_user_id`. | `WORKING_PRODUCT_UI` |
| Page count                    | No application quota or count limit was found. Each successful `createPage` inserts another child row; practical database/entitlement limits were not found in this code path.                    | `BACKEND_ONLY`       |
| Storage                       | Profile document: `profiles.template_config` / published snapshot. Child document: `pages.template_config` draft and `pages.published_template_config` published snapshot.                        | `WORKING_PRODUCT_UI` |
| Canonical document            | Every child owns one canonical `BioTemplateConfig` envelope. A newly simple-created child starts with `template_config = null`; the first editor save creates its draft document.                 | `WORKING_PRODUCT_UI` |
| Independent templates         | A child opens an independent Power Editor document and stores its own config.                                                                                                                     | `WORKING_PRODUCT_UI` |

## Creation and editing

`/pages` exposes **Crear página**, leading to `/pages/new`. The UI offers
Servicios, Catálogo, Portafolio, Menú, Promoción, Evento and a Página simple
path. Generated paths run the existing Page Generator/Engine V2 adapter,
create a child row, save and read back the canonical draft, then open
`/pages/{pageId}/edit`. Simple creation creates the row and opens the same
editor with a blank canonical config.

Child Pages load through `pageService.getOwnPageById` scoped to the authenticated
user and mount `PowerEditorHost target={{ kind: "page", id: pageId }}`. Page-mode
save writes only `pages.template_config`; publish writes the published snapshot
with optimistic `published_revision`. Reload therefore reads the saved draft
again. This is statically verified by the services and tests, but not live
verified against an authenticated account in this audit.

Template switching is available in the Power Editor and the library is the
repository’s `TEMPLATE_DEFINITIONS` set. The `keepContent` toggle preserves
profile identity, SEO and slug, but `applyTemplateDefinition` replaces the
template with the selected definition and does not carry over arbitrary
content blocks. Therefore “switch template while preserving all page content”
is `PARTIAL`, not a guaranteed product behavior.

## Catalog and services

| Capability           | Current implementation                                                                                                      |      User-facing? | Verified? | Problem / boundary                                       | Next action                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------: | --------: | -------------------------------------------------------- | --------------------------------------------------------------------- |
| Create catalog       | `/pages/new` → Catálogo; requires owner cover URL and product image URLs.                                                   |               Yes |    Static | Creation is form-based and Engine-backed.                | Human test with two real products.                                    |
| Product fields       | Product form supports name, price, image URL and destination URL. It does not expose a product description field.           |           Partial |    Static | No dedicated post-creation catalog CRUD screen found.    | Decide whether Power Editor block editing is the intended catalog UX. |
| Product reorder      | Generic editor block reorder exists; no product-row reorder control or catalog manager found.                               |           Partial |    Static | Product-level ordering UX is not explicit.               | Add only if required by product workflow.                             |
| Public catalog       | Published child canonical snapshot is rendered by `PublicTemplateRenderer`; Engine maps owner products into product blocks. | Yes after publish |  Not live | Requires successful publish and public RPC.              | Human publish/URL check.                                              |
| Create/edit services | `/pages/new` supports service name, description and price; a page-level CTA can be supplied.                                |           Partial |    Static | No dedicated service management screen after generation. | Human test and decide whether editor controls are sufficient.         |

Product images are owner-supplied URLs mapped through the existing owner-content
contract; the Page Generator does not upload or invent them.

## Multi-page navigation

`/pages` lists the primary profile separately and child Pages in a second list,
with status, title/type, update time and an **Abrir** link. A profile can have
multiple child rows; ownership queries are scoped by authenticated user and
optionally profile. A child Page can link to another page only by manually
entering a URL into an editable link/CTA; no page-picker or first-class
cross-page navigation UI was found.

## Publication and URLs

The Power Editor toolbar exposes **Publicar**. The publish service validates the
canonical config, saves the draft first, then writes
`published_template_config`, `published = true`, timestamp and increments
`published_revision`. No user-facing unpublish action or unpublish service was
found.

The stable child URL is:

```text
https://www.cripqer.dev/pg/{public_id}
```

It resolves through the narrow public RPC and renders only the published
snapshot. The optional convenience alias is:

```text
https://www.cripqer.dev/pg/a/{slug}
```

An absent slug has no fallback alias; the stable `public_id` route remains the
canonical identity. The alias route also resolves only published content and
canonicalizes back to the stable public-id URL.

## QR and analytics

The child detail route (`/pages/{pageId}`) has **QR / Compartir** and mounts
`PageQrPanel`. It generates, downloads and persists per-page QR styling in
`pages.qr_config`. The QR destination is always the stable
`/pg/{public_id}` URL, so each Page can have its own QR configuration.

There is no UI or service to retarget an existing QR to another Page: changing
the destination is not part of `PageQrConfig`. The inspected child Page model
also has no page-level `scan_count`; existing analytics policies and counters
are profile-oriented. Page-specific QR analytics are therefore not established.

## Persistence and deletion

| Capability            | Current implementation                                                                                                                         | Classification                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Draft save            | Page-mode Power Editor writes `pages.template_config` after canonical validation; autosave and manual Save are available.                      | `WORKING_PRODUCT_UI`                    |
| Published snapshot    | Publish writes `pages.published_template_config`, flag, timestamp and revision. Public routes never fall back to draft.                        | `WORKING_PRODUCT_UI`                    |
| Reload                | Child editor reload reads the owned page and its draft config.                                                                                 | `NOT_VERIFIED` live; statically covered |
| Delete Page           | Database has `owner_delete_page` RLS policy, but no page-service delete method or visible delete action was found.                             | `BACKEND_ONLY`                          |
| Deleted-page URL / QR | No application cleanup workflow exists. A QR image still encodes its old stable URL; after deletion the public lookup should return not found. | `NOT_VERIFIED`                          |

## Capability summary

| Capability           | Current implementation                                 | User-facing? |    Verified? | Problem                                               | Next action                                  |
| -------------------- | ------------------------------------------------------ | -----------: | -----------: | ----------------------------------------------------- | -------------------------------------------- |
| Multiple child Pages | `/pages` list + `/pages/new` + owner-scoped service    |          Yes | Static/tests | No quota surfaced                                     | Human create-second-Page test                |
| Child Power Editor   | `/pages/{pageId}/edit` → `PowerEditorHost` page target |          Yes | Static/tests | Live session not run                                  | Human edit/save/reload test                  |
| Template library     | Power Editor Templates panel and definitions           |          Yes |       Static | Keep-content does not preserve blocks                 | Product decision/follow-up task              |
| Draft/publish        | Canonical child service + toolbar                      |          Yes | Static/tests | Unpublish missing                                     | Add explicit unpublish requirement if needed |
| Stable public URL    | `/pg/{public_id}` via safe published RPC               |          Yes | Static/tests | Live publish not run                                  | Human public URL test                        |
| Custom alias         | `/pg/a/{slug}` with unique alias save UI               |          Yes | Static/tests | Convenience-only, no slug fallback                    | Human alias collision/public test            |
| Per-page QR          | Detail page QR panel, style persistence/download       |          Yes | Static/tests | Destination cannot be switched; page analytics absent | Define QR routing/analytics product scope    |
| Catalog management   | Initial generated form and canonical renderer mapping  |      Partial | Static/tests | No post-create CRUD, description/reorder gaps         | Product workflow decision                    |
| Page deletion        | Owner RLS only                                         |           No |       Static | No safe UI/service lifecycle                          | Define deletion semantics and audit trail    |

## Simple human QA path

1. Sign in and open `/pages`.
2. Choose **Crear página**, select **Página simple** or an objective, and
   create it. Confirm the destination is `/pages/{pageId}/edit`; record the
   page ID from the page detail screen.
3. In Power Editor, change template, edit visible text/link/color, click
   **Guardar**, reload, and confirm the draft remains.
4. For a catalog, create a second Page with **Catálogo**, enter two products
   with real names, prices, image URLs and destination URLs, save, and inspect
   the rendered product section.
5. Click **Publicar**, copy `/pg/{public_id}` from the Page detail QR panel,
   open it in a private/anonymous window, and confirm only the published
   snapshot is visible.
6. Save a custom alias and test `/pg/a/{slug}`. Remove the alias and confirm
   there is no alias fallback.
7. In **QR / Compartir**, scan or open the generated QR and confirm it lands on
   that exact child Page. Change QR styling, **Guardar diseño**, reload the
   detail page and confirm the styling persists.
8. Return to `/pages` and confirm the primary profile and child Page are listed
   separately.

## Findings and next product task

What users can do today: create multiple child Pages through a visible UI,
open each in Power Editor, save drafts, publish immutable snapshots, assign a
custom alias, render public pages and generate a per-page QR.

What exists technically without a complete product workflow: deletion policy,
page generator mappings, owner-content/catalog contracts and profile-scoped
analytics infrastructure.

The clearest next product task is a **Pages lifecycle and content-management
UX audit/fix**: decide whether Power Editor is the authoritative post-create
catalog/services editor, then add the missing unpublish/delete lifecycle and
explicit product editing/reorder/description behavior only where required.

## Verification

Read-only targeted tests completed: **51/51 passed** across Page service,
canonical persistence/validation, QR service, alias service, URL helpers and
routing tests. A route-tree warning notes the existing test file under
`src/routes/__tests__` is not a route module; it did not fail the test run.

No Git history or remote state was changed. This report intentionally does not
claim authenticated human runtime PASS.
