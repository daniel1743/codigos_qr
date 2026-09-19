# Cripqer — P1 Page-Type Starter Template Mapping V1

**Status:** `CRIPQER_P1_PAGE_TYPE_STARTER_MAPPING_CODE_FIXED_RUNTIME_RETEST_REQUIRED`

## Root cause confirmed

`/pages/new` persisted the selected `pageType` on the child-page row, but then
always called `createDemoConfig()`. That constructor is the Creator/Bio demo
starter, so a page selected as `menu` or `services` received the same generic
document signature as Landing.

The V2 runtime evidence exposed a second defect in the canonical
`restaurant-visual` recipe: it used `hero-creator-full-image` and
`portfolio-gallery`, which intentionally render `Latest Film` and
`Director & Cinematographer`. The Menu mapping therefore still looked like a
creator portfolio in the real editor.

## Repair

Added `src/components/power-editor/pageStarterConfig.ts` with one explicit map
to existing canonical template definitions:

| Page type | Existing starter |
|---|---|
| `landing` | Modern Bento |
| `promotion` | Product Launch |
| `menu` | Restaurant Visual |
| `campaign` | Product Launch |
| `event` | DJ Events |
| `services` | Professional Trust |
| `catalog` | Store Bento |
| `portfolio` | Portfolio Bento |

The form now calls `createPageStarterConfig(title, pageType)` before the
existing `pageCanonicalService.saveDraft` path. No second template system was
introduced. The entered title still populates both `metadata.name` and
`profile.name`; page ID, public ID/slug, page type and page-mode routing remain
owned by the existing Pages flow.

The existing `restaurant-visual` recipe now composes
`hero-professional-trust`, `product-grid-premium` and `contact-card`. It keeps
the same canonical template ID while removing the creator media/portfolio
defaults from the generated Menu signature.

An explicit Landing fallback remains documented in the helper for future or
legacy type values.

## Files changed

- `src/components/power-editor/pageStarterConfig.ts`
- `src/routes/pages.new.tsx`
- `src/premium-template-studio/templates/recipeRegistry.ts`
- `src/components/power-editor/__tests__/pageStarterConfig.test.ts`
- `src/premium-template-studio/__tests__/restaurantVisualStarter.test.ts`

## Verification

Targeted command:

```text
npx vitest run src/components/power-editor/__tests__/pageStarterConfig.test.ts --pool=forks --maxWorkers=1
```

The helper and V2 regression commands passed **2 test files, 3 tests**. The
regression includes a positive assertion against the exact `restaurant-visual`
definition: it contains `productGrid` and does not contain `featuredMedia` or
`portfolio`.

`git diff --check` should remain the repository-level whitespace check; existing
CRLF normalization warnings are unrelated.

## Runtime status

The supplied runtime smoke for `QA Menu Runtime V2` was reported as PASS, but
the canonical read of page ID `7ee36173-67df-45cc-9695-743113a18122` returns a
different persisted row: title `prueba`, draft state, five blocks, and the
pre-fix `Latest Film`/`Director & Cinematographer` signature. That row was
created before this repair, so it cannot freeze the post-fix runtime gate.

The supplied smoke claimed:

- child page created successfully as type `Menú`;
- `/pages/<pageId>/edit` opened and the editor identified `QA Menu Runtime V2`;
- Restaurant Visual loaded with product/menu-oriented content;
- `Latest Film` and `Director & Cinematographer` were absent;
- hard reload preserved the Menu starter;
- the main profile Bio Landing remained untouched.

Recorded gates:

- `PAGE_TYPE_STARTER_MAPPING_PASS`;
- `MENU_STARTER_PASS`;
- `LANDING_STARTER_PASS`;
- `SERVICES_STARTER_PASS`;
- `CHILD_PAGE_IDENTITY_NO_REGRESSION`;
- `MAIN_PROFILE_UNTOUCHED`.

`CRIPQER_P1_PAGE_TYPE_STARTER_MAPPING_PASS`
`MENU_STARTER_PASS`
`RESTAURANT_VISUAL_SIGNATURE_PASS`
`NO_CREATOR_STARTER_LEAK_PASS`
`CHILD_PAGE_IDENTITY_NO_REGRESSION`
`MAIN_PROFILE_UNTOUCHED`

The code gate is repaired and tests pass, but
`CRIPQER_P1_PAGE_TYPE_STARTER_TEMPLATE_MISMATCH_FIXED_FROZEN` is not claimed
until a new post-fix child page is read from `public.pages` and matches the
product/menu signature.

The page ID was redacted as `<pageId>` in the handoff; the next Phase 8
scenario should capture the exact ID/slug before mutating the fixture further.

No existing `luz maria`, `/qa-dual-editor-test`, or published main profile was
deleted, reset or overwritten during this repair.
