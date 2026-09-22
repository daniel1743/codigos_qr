# CRIPQER PAGES PRODUCT HUB + COMPLETE PAGE LIFECYCLE V1

**Task ID:** `CRIPQER_PAGES_PRODUCT_HUB_LIFECYCLE_V1`  
**Status:** `IMPLEMENTED — TARGETED PAGES PRODUCT UI; RUNTIME QA PENDING`  
**Success gate:** `CRIPQER_PAGES_PRODUCT_HUB_LIFECYCLE_RUNTIME_PASS_FROZEN`

## Implemented

- Expanded `/pages` into a usable Pages Hub with status, type, published URL,
  Edit, Open, QR and Publish/Unpublish actions for every child Page.
- Added visible public URL links for published child Pages.
- Added `pageCanonicalService.unpublish()` using the existing child-page
  optimistic revision authority; no second publication service was created.
- Added Publish/Open/Unpublish controls to `/pages/{pageId}` as well as the
  existing QR / Compartir entry point.
- Changed `/pages/new` to create an owned child row, persist the existing
  canonical `createDemoConfig()` starter through `pageCanonicalService`, and
  redirect to `/pages/{pageId}/edit`.
- The normal Create Page UI no longer invokes Engine V2, Smart Pages or the
  questionnaire. The primary profile remains untouched.
- Preserved the existing Page Generator module for its existing tests/API, but
  it is no longer the normal Pages Hub creation path.

## Authorities reused

| Concern                 | Authority                                                    |
| ----------------------- | ------------------------------------------------------------ |
| Ownership and child row | `pageService.createPage`, owner-scoped Supabase/RLS          |
| Draft canonical         | `pageCanonicalService.saveDraft` → `pages.template_config`   |
| Publish/unpublish       | `pageCanonicalService` with `published_revision` concurrency |
| Child editor            | `/pages/$pageId/edit` → `PowerEditorHost` page target        |
| Stable public URL       | `getPublicPageUrl(public_id)` → `/pg/{public_id}`            |
| QR                      | Existing `PageQrPanel` and `pageQrService`                   |

## Lifecycle behavior

```text
/pages
  → Crear página
  → owned public.pages row + canonical starter draft
  → /pages/{pageId}/edit
  → Save draft / change template
  → Publish
  → /pg/{public_id}
  → QR / Compartir
  → return later to edit
```

Published child Pages resolve only through the existing public RPC and
`published_template_config`. Unpublish sets `published = false`, clears
`published_at`, advances the same revision and retains the published snapshot
for a later publish. The public RPC therefore stops returning the Page while
unpublished.

## Scope boundaries

- Catalog/services remain as the existing partial workflow; no catalog CRUD,
  product reordering, analytics or product editor was added.
- Page deletion remains hidden; no deletion authority was invented.
- No Engine V2, Smart Pages, onboarding, Black Box, renderer, provider or
  database migration changes were made.
- Template switching remains the existing behavior: the selected child Page is
  isolated, while the existing `keepContent` behavior preserves profile/SEO
  fields but does not guarantee preservation of all content blocks.

## Verification

- Targeted Page service, canonical persistence/validation, QR, alias, URL and
  routing tests: **48/48 PASS**.
- `git diff --check`: no whitespace errors; repository emitted only existing
  LF/CRLF warnings.
- Directed TypeScript filtering found no errors in the modified Pages routes
  or `page-canonical.service.ts`. The repository still has four pre-existing
  helper-type errors in `src/services/__tests__/page-canonical.validation.test.ts`.
- Authenticated manual Flow A–D, desktop/mobile screenshots and cross-page
  live isolation were not run in this environment. The browser bridge could
  not attach to the available Chrome session and no credentials/storage state
  was available. The runtime success gate remains pending.

## Files changed for this task

- `src/routes/pages.tsx`
- `src/routes/pages.new.tsx`
- `src/routes/pages.$pageId.tsx`
- `src/services/page-canonical.service.ts`
- `src/services/__tests__/page-canonical.validation.test.ts`
