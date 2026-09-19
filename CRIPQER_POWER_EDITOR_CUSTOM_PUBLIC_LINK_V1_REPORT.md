# CRIPQER POWER EDITOR CUSTOM PUBLIC LINK V1

**Task ID:** `CRIPQER_POWER_EDITOR_CUSTOM_PUBLIC_LINK_V1`  
**Status:** `IMPLEMENTED — EXISTING SLUG/Alias AUTHORITY RESTORED IN POWER EDITOR`  
**Code success gate:** `CRIPQER_POWER_EDITOR_CUSTOM_PUBLIC_LINK_CODE_TEST_PASS_FROZEN`  
**Runtime gate:** `CRIPQER_POWER_EDITOR_CUSTOM_PUBLIC_LINK_RUNTIME_PASS_FROZEN` — pending

## Existing authority

The repository already contained the authoritative alias system:

- `public.pages.slug` for independent child Page aliases;
- `profiles.slug` for the primary profile alias;
- `normalizePageAlias`, validation and reserved-route protection in
  `src/lib/page-alias.ts`;
- `pageAliasService` and the existing unique partial index
  `idx_pages_slug_unique`;
- published public resolution through `/pg/a/{slug}` and
  `get_public_page_by_slug`.

The existing child-page alias UI was present on the Page detail route but was
not exposed inside Power Editor. The stable `public_id` route remains separate
and is never editable.

## Implemented

- Added `Enlace de tu página` to Power Editor for both primary profiles and
  child Pages.
- Reused the existing normalizer: lowercase, accents removed, spaces and
  unsupported characters converted to hyphens, repeated hyphens collapsed and
  edge hyphens removed.
- Added live availability checks before saving and truthful messages for
  available, invalid and conflicting aliases.
- Saves only valid aliases through the existing owner-scoped authorities:
  `profiles.slug` or `pages.slug`.
- Shows the authoritative resulting URL and supports `Copiar`.
- Preserves existing aliases on load/reload and never writes or regenerates
  `public_id`.
- Keeps the child friendly URL in the existing dedicated namespace:
  `https://www.cripqer.dev/pg/a/{slug}`. This avoids collision with the primary
  profile root alias and the stable `/pg/{public_id}` identity.

## Safety and scope

Ownership remains enforced by the authenticated owner query/RLS path. The
database unique index remains the final race-safe collision guard; a conflict
is reported instead of silently changing the requested alias. Reserved route
names such as `login`, `editor`, `pages`, `account`, `qr`, `api` and
`correo-confirmado` remain rejected by the existing validation authority.

No new URL table, public-ID generator, auth flow, Engine, Smart Pages,
renderer, analytics, QR architecture or catalog behavior was added.

## Files changed

- `src/components/power-editor/CustomPublicLinkControl.tsx`: reusable compact
  alias editor with validation, availability, save and copy states.
- `src/components/power-editor/PowerEditorHost.tsx`: mounts the control and
  connects it to primary-profile or child-Page persistence.

## Verification

- Alias and service suites: **34/34 tests passed** across 3 test files.
- `npx vite build`: **PASS**.
- `git diff --check`: **PASS**; only existing line-ending warnings.

## Runtime status

Authenticated manual QA, real save/reload, publish, friendly public URL,
template-switch preservation, cross-user collision and screenshots were not
run because no authenticated browser session was available. Production
deployment was not performed. The implementation and code contract are ready,
but the runtime gate remains unfrozen.
