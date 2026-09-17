# CRIPQER PAGES SAFE DELETE LIFECYCLE V1

**Task ID:** `CRIPQER_PAGES_SAFE_DELETE_LIFECYCLE_V1`  
**Status:** `CODE PASS — RUNTIME NOT VERIFIED`  
**Code success gate:** `CRIPQER_PAGES_SAFE_DELETE_CODE_TEST_PASS_FROZEN`  
**Runtime gate:** `CRIPQER_PAGES_SAFE_DELETE_RUNTIME_PASS_FROZEN`

## Phase 0 audit

- No existing page-delete service or UI authority existed.
- `public.pages` is the child-page table; the primary profile is stored in
  `public.profiles` and is not represented as a `pages` row.
- Existing RLS policy `owner_delete_page` authorizes deletes only when
  `auth.uid() = owner_user_id`; this is the server-side authority.
- `slug` and `qr_config` are columns on the target page row. There are no
  separate page-alias or page-QR records to orphan.
- Public RPCs require a published page row with a published config, so a
  deleted page no longer resolves by `public_id` or alias.
- No database migration was necessary.

## Implemented

- Added `pageService.deleteOwnedChildPage`.
- The service requires an authenticated user and an owned page, verifies the
  referenced profile belongs to that user, and performs a narrowly scoped
  delete by page ID plus authenticated owner ID.
- Added an explicit malformed-row guard so a row whose ID matches its profile
  ID cannot be treated as deletable primary-profile content.
- Added Pages Hub `Eliminar` action with the required confirmation dialog:
  `Eliminar página` / `Esta acción eliminará esta página. No podrás
  recuperarla.`
- Delete is secondary/destructive, disabled while pending, and does not remove
  the item from the Hub until the authoritative delete succeeds.
- Successful deletion removes the page from the Hub and shows confirmation;
  failures remain visible through an error toast.
- Alias and page QR configuration disappear with the authoritative child-page
  row. The primary profile and its QR fields are never touched.

## Verification

- Targeted Vitest suite: **20/20 PASS** across the existing page service tests
  and the new safe-delete tests.
- New tests cover owned delete, foreign-page blocking, primary-profile guard,
  and non-owned-profile blocking.
- `npx tsc --noEmit`: no diagnostics matching the modified service, route or
  delete test files.
- `npx vite build`: **PASS**.
- `git diff --check`: no whitespace errors; existing line-ending warnings only.

## Runtime status

Authenticated browser QA was not run. Therefore the following remain
`RUNTIME_NOT_VERIFIED`, not PASS:

- cancel-then-confirm interaction;
- real owned child deletion and Hub refresh;
- public URL and alias disappearance;
- QR behavior after deletion;
- Page A/Page B isolation;
- primary profile continuity;
- double-click behavior in a real browser;
- current-page deletion redirect and mobile smoke.

