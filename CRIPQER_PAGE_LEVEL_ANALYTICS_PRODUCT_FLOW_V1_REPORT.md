# CRIPQER PAGE-LEVEL ANALYTICS PRODUCT FLOW V1

**Task ID:** `CRIPQER_PAGE_LEVEL_ANALYTICS_PRODUCT_FLOW_V1`  
**Status:** `IMPLEMENTED — PAGE-SCOPED ANALYTICS; RUNTIME QA PENDING`  
**Success gate:** `CRIPQER_PAGE_LEVEL_ANALYTICS_PRODUCT_FLOW_RUNTIME_PASS_FROZEN`

## Result

The existing `qr_analytics` system was extended additively for child Pages.
No second analytics platform was introduced. Public child pages now emit
non-blocking view and interaction events tagged with `page_id`; the server
derives the owning profile from the published Page instead of trusting client
identity.

## Implemented

- Added nullable `page_id`, interaction type, item ID/label and target URL to
  the existing analytics table, with indexes and constrained interaction values.
- Added `track_child_page_event`, a `SECURITY DEFINER` RPC that accepts events
  only for existing published child Pages and derives `profile_id` from the
  Page. No visitor identity, IP, location or message content is collected by
  this path.
- Extended the existing public-page lookup RPC projection with `page_id`.
- Instrumented both public child-page routes for one view event per loaded
  Page, plus button, WhatsApp, product and service interactions. Tracking
  failures never block rendering or navigation.
- Added `/pages/{pageId}/analytics` and a Pages Hub `Estadísticas` action.
  Authenticated reads first resolve the Page through the existing owner-scoped
  service and then apply an exact `page_id` filter.
- Added simple ranges: `Hoy`, `Últimos 7 días` and `Últimos 30 días`, with
  `Visitas`, `Clics en botones`, `Clics en WhatsApp`, product/service interest,
  daily visits and item-level product/service counts.
- Preserved the requested empty state: `Todavía no hay visitas`.

## Scope decisions

- Product and service item attribution is supported through the existing
  rendered CTA paths and is shown as a simple ranked list.
- QR scans remain explicitly deferred. The existing QR configuration does not
  identify a scan event separately from a page visit, so no misleading QR
  metric was added.
- Analytics history is retained when a Page row is deleted through the existing
  `ON DELETE SET NULL` relationship, while deleted pages remain inaccessible to
  the owner-facing Page query. Safe-delete behavior was not changed.
- Engine, Smart Pages, Power Editor, catalog editing, media, authentication
  and Page deletion logic were not redesigned.

## Verification

- Targeted Vitest: **17/17 tests passed** across analytics and page-service
  suites, including Page A/Page B isolation and item aggregation.
- `npx vite build`: **PASS**. The generated route tree includes
  `/pages/$pageId/analytics`.
- Directed TypeScript diagnostics for the modified analytics, public-page,
  renderer and Pages files produced no matching errors. Global TypeScript was
  not claimed as green.
- `git diff --check`: **PASS**; only existing line-ending warnings were
  reported.

## Runtime status

Authenticated browser QA was not available in this environment. Therefore
public view/click collection against a real deployed database, owner isolation
in a live session, empty-state screenshots, date-range screenshots and
production migration execution are **RUNTIME_NOT_VERIFIED**, not passes.

No credentials, screenshots, deployment or Git history changes were made.
