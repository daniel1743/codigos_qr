# Cripqer — P1 Child Page Create/Edit Routing Runtime Forensic V1

**Status:** `CRIPQER_P1_CHILD_PAGE_ROUTING_FORENSIC_BLOCKED_RUNTIME_REPRO`

**Mode:** Read-only forensic trace. No authentication, Pages architecture,
published profile, child page, or product code was changed.

## Reported runtime observation

The supplied runtime report says that creating child page `luz maria` from
`/pages/new` displayed a success message but then showed the previously
configured main Bio Landing editor. The report does not include the final URL,
returned page ID, page-list row, or a captured child-page document marker.

This observation is recorded as reported evidence, not independently confirmed
in this run.

## Static contract trace

The inspected source currently implements the intended child-page path:

| Stage | Authority | Observed contract |
|---|---|---|
| Create form | `src/routes/pages.new.tsx` | Calls `pageService.createPage` with authenticated user/profile, title and page type. |
| Starter persistence | `src/routes/pages.new.tsx` | Builds `createDemoConfig()`, sets the title, then calls `pageCanonicalService.saveDraft(page.id, ...)`. |
| Create navigation | `src/routes/pages.new.tsx` | `onDone(page.id)` navigates to `/pages/$pageId/edit`. |
| Nested route | `src/routes/pages.$pageId.edit.tsx` | Reads `Route.useParams().pageId` and mounts `PowerEditorHost target={{ kind: "page", id: pageId }}`. |
| Parent route | `src/routes/pages.$pageId.tsx` | Detects nested child matches and returns `<Outlet />`; otherwise it renders page detail. |
| Page loader | `PowerEditorHost.tsx` | In page mode calls `pageService.getOwnPageById(...)` and resolves `ownedPage.template_config`. |
| Page document identity | `PowerEditorHost.tsx` | Uses child `page.id` as `documentId`; page storage adapter writes `public.pages`. |
| Profile isolation | `PowerEditorHost.tsx` | Profile query and profile adapter are in the `else` branch and are not selected when `target.kind === "page"`. |

The generated route tree also contains distinct `/pages/new`,
`/pages/$pageId`, and `/pages/$pageId/edit` entries.

## Current classification

No A–E failure classification is frozen. Static inspection does not prove a
redirect defect, wrong document load, missing page-mode propagation, failed
creation, or stale state. The runtime report must first establish:

1. whether `luz maria` exists in the authenticated Pages Hub;
2. its child page ID and public ID/slug;
3. the URL after pressing `Crear página`;
4. the editor's accessible marker (`Página: <title> · <public_id>` versus
   `Perfil: ...`); and
5. whether the child `template_config` was read from `public.pages`.

## Runtime blocker

The authenticated browser automation session became unavailable while attempting
to open `/pages/new`; reconnection timed out twice. No new page was created by
this forensic run, no existing page was deleted, and no profile or QA document
was modified.

## Required next evidence

Reconnect to the existing authenticated browser and perform read-only checks in
this order:

1. Open `/pages` and verify whether `luz maria` exists.
2. Open its detail/edit link without deleting or publishing anything.
3. Record the exact URL and the `PowerEditorHost` accessible document marker.
4. Compare the child title/block starter with the main profile editor.
5. Only if a P1 defect is proven, apply the smallest correction and add a
   regression test.

`CRIPQER_PHASE_8_CONTROLLED_QA_FIXTURE_READY` remains unclaimable until a new
disposable child page is independently observed in page mode. The contaminated
`/qa-dual-editor-test` document must not be reset or bulk-edited.
