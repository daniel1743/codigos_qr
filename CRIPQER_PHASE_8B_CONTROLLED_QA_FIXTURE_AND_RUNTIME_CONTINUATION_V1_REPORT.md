# Cripqer — Phase 8B Controlled QA Fixture and Runtime Continuation V1

**Status:** `CRIPQER_PHASE_8C_BASELINE_CAPTURED_FRESH_POST_FIX_FIXTURE_REQUIRED`

## Safe fixture discovery

The existing product already exposes a disposable child-page flow at
`/pages/new`; no fixture-management feature or product-code change is needed.

The canonical path is:

1. `pageService.createPage(...)` creates an owner-scoped child page.
2. `createPageStarterConfig(title, pageType)` selects an existing canonical
   template definition for the selected page type.
3. `pageCanonicalService.saveDraft(...)` persists that starter through the
   normal draft authority.
4. The route navigates to `/pages/$pageId/edit`, which mounts
   `PowerEditorHost` in page mode.

This path does not reset, delete, overwrite or bulk-edit
`/qa-dual-editor-test`.

## Controlled fixture result

The read-only canonical `public.pages` row for the supplied page ID is now
captured. It does not match the supplied handoff title, so the controlled
fixture content gate is not re-affirmed:

- title: `prueba`;
- selected type: `menu`;
- page ID: `7ee36173-67df-45cc-9695-743113a18122`;
- public ID: `nP4gSJr`;
- slug: `null`;
- persisted block count: `5`;
- state: draft (`published=false`, `published_revision=0`);
- updated at: `2026-09-18T18:50:54.782084-03:00`;
- persisted template identity: `restaurant-visual`;
- persisted signature: `featuredMedia`, `hero`, `heading`, `gallery`, `contact`.

The persisted config still contains the pre-fix creator defaults `Latest Film`
and `Director & Cinematographer`. This row was created before the canonical
starter repair; it is evidence of a stale pre-fix document, not proof that the
new mapping failed after the repair.

The contaminated QA document remains untouched after the failed recovery
attempt. No database reset, SQL, bulk deletion, destructive UI action, upload,
publish or authentication change was performed.

## Runtime continuation status

The baseline metadata capture is complete, but the intended controlled fixture
is not content-valid for continuation. The remaining Phase 8 runtime scenarios
are pending a fresh post-fix child page:

- eight family save/reload flows;
- three full-template flows;
- collection lifecycle;
- owner-media adapter flow;
- desktop and 360/390/430 mobile selection;
- CTA/public parity;
- header-mode persistence;
- hover, reduced motion and keyboard focus;
- public parity.

The prior 29/29 browser preset no-error smoke and Hero text save/reload PASS
remain valid evidence. The supplied Menu runtime PASS is contradicted by the
persisted row above and is not used as canonical evidence.

The later supplied route `/pages/a4114cc7-fd1a-44fd-b01b-a8846728ea87/edit`
was also read-only verified and hard-reloaded. It remained on the same page ID
and loaded a `productGrid` restaurant composition, but its canonical row is
`sofia` and its persisted/rendered content still includes `Shop`, `Creative
Director` and `Diseño productos y experiencias digitales.`. It is not accepted
as the fresh post-fix fixture.

## Next safe action

Create or identify a fresh post-fix disposable child page through the existing
canonical `/pages/new` flow, then capture its row before mutation. The current
route must not be edited to manufacture evidence. Do not reset or bulk-delete
`/qa-dual-editor-test`, `luz maria`, `prueba` or `elisa`.

No P0/P1 product defect was proven and no product-code repair was applied.
