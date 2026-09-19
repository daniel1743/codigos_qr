# CRIPQER CUSTOM PUBLIC LINK RUNTIME QA V1

**Task ID:** `CRIPQER_CUSTOM_PUBLIC_LINK_RUNTIME_QA_V1`  
**Status:** `RUNTIME_NOT_VERIFIED — AUTHENTICATED SESSION REQUIRED`  
**Target gate:** `CRIPQER_POWER_EDITOR_CUSTOM_PUBLIC_LINK_RUNTIME_PASS_FROZEN`

## Preconditions

The requested QA requires a real authenticated Cripqer session and real
owner-owned profile/Pages. No reusable `e2e/.auth/qa-storage-state.json` is
present, and no human-authenticated browser session was supplied. Credentials
were not requested, entered, printed or stored.

Per the task policy, the runtime flow was stopped before changing a slug or
creating fake events/pages. This is a verification block, not a product failure
classification.

## Read-only contract checks

The implementation remains wired to the existing authorities:

- primary profile: `profiles.slug` through `profileService.updateProfile`;
- child Page: `pages.slug` through `pageAliasService.savePageAlias`;
- normalization/reserved routes: `src/lib/page-alias.ts`;
- availability: existing owner query plus the database unique index;
- public child route: `/pg/a/{slug}` through `get_public_page_by_slug`;
- stable `public_id` route and value remain separate and non-editable.

The Power Editor control is present in source as
`CustomPublicLinkControl` and is mounted for profile and child-Page mode.

## Not run

The following remain `NOT_VERIFIED`, not passes:

- loading an existing real slug in `/editor`;
- saving `Bienestar Personal` and reloading;
- real friendly profile URL resolution;
- reserved alias rejection and collision against another owner;
- child Page save/reload and `/pg/a/perro-vivo` rendering;
- template-switch independence;
- public_id before/after comparison;
- mobile smoke and requested screenshots.

Previous code verification remains recorded by the implementation task:
34/34 alias/service tests and `npx vite build` passed. No code changes were
made during this runtime-only QA attempt.

## Required continuation

Run the prescribed primary-profile and child-Page scenarios in one real
authenticated session, capture only actual screenshots, and then freeze the
runtime gate if all persistence, collision, routing and identity checks pass.
