# POWER EDITOR AUTOSAVE / SAVE COORDINATOR V1

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`
Task: `CRIPQER_POWER_EDITOR_AUTOSAVE_V1`

---

## FILES_READ

1. `src/components/power-editor/PowerEditorHost.tsx`
2. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
3. `src/premium-template-studio/state/StudioProvider.tsx`
4. `src/premium-template-studio/state/templateReducer.ts`
5. `src/services/canonical-page.service.ts`
6. `src/premium-template-studio/__tests__/savePublish.test.ts`

## FILES_MODIFIED

1. `src/premium-template-studio/state/templateReducer.ts` — added monotonic `revision`
   to `StudioState`; made `markSaved` revision-aware.
2. `src/premium-template-studio/state/StudioProvider.tsx` — save coordinator:
   immutable snapshot + document-identity + monotonic-revision acknowledgement;
   `documentId` / `onSaveStateChange` props.
3. `src/premium-template-studio/components/PremiumTemplateStudio.tsx` — threaded
   `documentId` and `onSaveStateChange` to the provider.
4. `src/components/power-editor/PowerEditorHost.tsx` — identity guard on the host
   save path (no cross-profile `setConfig`/`lastSavedAt` contamination) and a
   proper save-status indicator.
5. `src/premium-template-studio/__tests__/saveCoordinator.test.ts` — NEW test file
   (revision + dirty-state contract).

`canonical-page.service.ts` — NOT modified (the existing RPC authority was sufficient).

---

## CURRENT_SAVE_ARCHITECTURE

`PowerEditorHost` loads the profile + canonical config, builds `adapters.storage.save`
(a closure over `profile.id`) which calls `canonicalPageService.save(...)`.
`PremiumTemplateStudio` → `StudioProvider` owns `save()`, `saveState`, `error` and
`state.dirty`, and debounces autosave (900 ms) → `save()`.

## CANONICAL_PERSISTENCE_AUTHORITY

`canonicalPageService.save()` → Supabase RPC `set_profile_canonical_editor_config`
(`src/services/canonical-page.service.ts`). This is the single canonical authority and
was reused — no parallel persistence system was introduced.

## ACTIVE_DOCUMENT_IDENTITY

`profile.id`, owned by `PowerEditorHost`. It is now threaded into the editor as
`documentId` so the save coordinator can isolate saves per document.

## ROOT_CAUSE_OF_CURRENT_NON_PERSISTENCE

Three concrete defects (matching the known P0-001 audit):

1. `save()` read `state.config` without an immutable snapshot and, on completion,
   `dispatch({ type: "markSaved" })` which blindly cleared `dirty` — even if a newer
   edit (revision) had arrived while the request was in flight.
2. The host's `save` closure called `setConfig(persisted.editorConfig)` on every
   completion — a late save for profile A could overwrite B, and a same-profile save
   could visually rewind a newer revision.
3. No revision or document identity existed to reject out-of-order or cross-document
   acknowledgements.

## SAVE_COORDINATOR_OWNER

`StudioProvider` (state + revision watermark) together with `PowerEditorHost` (document
identity + host-state guard). One authoritative coordination path; manual save
(Cmd+S) and autosave both call the same `save()`.

---

## DEBOUNCE_IMPLEMENTATION

Preserved the existing single centralized `timer` ref in the autosave effect at
**900 ms** (within the required 600–1200 ms range). Rapid mutations coalesce into one
scheduled persistence of the latest snapshot.

## DIRTY_STATE_IMPLEMENTATION

`state.dirty` remains the reducer-owned dirty flag; `markSaved` now clears it only when
the acknowledged revision is not older than the current revision.

## LOCAL_REVISION_IMPLEMENTATION

`StudioState.revision` (monotonic integer), incremented on every document mutation
(`commit`, `undo`, `redo`) and reset to 0 on `replaceConfig` (resetHistory). Non-document
actions (`selectBlock`) do not touch it.

## SAVE_SNAPSHOT_IMPLEMENTATION

`save()` captures `{ snapshot = state.config, snapshotRevision = state.revision,
snapshotDocumentId = documentId }` before awaiting, and persists that exact snapshot —
never re-reads mutable state mid-flight.

## IN_FLIGHT_SAVE_BEHAVIOR

Editing is never disabled. If a newer revision exists when a save completes, the
coordinator leaves `dirty` true and `saveState` "dirty", and the autosave effect
schedules the next save.

## OUT_OF_ORDER_RESPONSE_PROTECTION

Monotonic watermark (`lastSavedRevisionRef`): a save is acknowledged only if
`snapshotRevision >= lastSavedRevisionRef.current`. A stale/older response is ignored.

## PROFILE_A_TO_B_ISOLATION

Two layers: (1) `StudioProvider` ignores acknowledgements whose `snapshotDocumentId`
differs from the current `documentIdRef`; (2) `PowerEditorHost` only sets
`lastSavedAt` when `currentProfileIdRef.current === profileIdAtSave`, and no longer
calls `setConfig` from the save response.

## STALE_RESPONSE_PROTECTION

Covered by identity + revision comparison, plus removal of the host's blind
`setConfig(persisted.editorConfig)` (which is what caused same-profile visual rewinds).

---

## SAVE_STATUS_UI

The in-editor Toolbar already renders `Saving` / `Saved` / `Unsaved` / `Error` from
`saveState`. `StudioProvider` now also reports `saveState` changes to the host via
`onSaveStateChange`, and `PowerEditorHost` renders "Guardando…" / "Error al guardar" /
"Cambios sin guardar" / "Guardado" / "Canonical cargado". "Saved" is only shown after
persistence confirmation, never from the debounce timer alone.

## SAVE_FAILURE_BEHAVIOR

On failure, local config is preserved, `dirty` stays true, `saveState` becomes "error",
`error` is surfaced, and subsequent edits/saves remain possible. No rollback to old
server state.

## INITIAL_HYDRATION_BEHAVIOR

`createInitialState` starts `dirty: false`, `revision: 0`. Hydration is not a mutation,
so it does not trigger autosave.

## NAVIGATION_BEHAVIOR

Primary protection is continuous autosave before leaving. No new blocking modal was
added; correctness does not depend on `beforeunload` async fetch.

## TAB_VISIBILITY_BEHAVIOR

Not added (a best-effort flush is permitted but not required, and correctness does not
depend on it).

## MANUAL_SAVE_COMPATIBILITY

Manual save (Cmd+S) calls the same `save()` coordinator — no second persistence
codepath.

---

## CAMERA_PERSISTENCE

Camera (zoom/pan/Fit/viewport) is not part of `StudioState` / `BioTemplateConfig` and
does not increment `revision`; it cannot trigger document autosave.

## CANONICAL_SCHEMA_CHANGES

None to the canonical document — `revision` is editor-local UI/coordination state, not
persisted into `BioTemplateConfig`.

## DATABASE_CHANGES

None. No migration; the existing `set_profile_canonical_editor_config` RPC is reused.

## ENGINE_V2_CHANGES

None.

---

## TESTS

New: `src/premium-template-studio/__tests__/saveCoordinator.test.ts` → **8 passed**
(hydration, first mutation, revision-aware markSaved, stale markSaved, legacy markSaved,
undo/redo revision, replaceConfig reset, selectBlock non-mutation).

Regression (passing, unchanged): `templateReducer.test.ts` (11), `savePublish.test.ts`
(10), `profileCoverContextual.test.ts` (36), `visualContract.test.tsx` (11),
`pageBackgroundContextual.test.tsx` (27).

## LINT

NOT_VERIFIED — full `tsc --noEmit` times out on the project (30s tool limit). The
touched code was manually type-reviewed; vitest transform + runtime tests pass.

## BUILD

NOT_VERIFIED — full build not run (per targeted-testing policy).

## RUNTIME

NOT_VERIFIED — manual runtime gate pending user confirmation.

## STOP_TRIGGERED

false

---

## VERIFICATION LEVELS

- **CODE_PASS**: implementation present and source review coherent.
- **LOGIC_PASS**: revision + document-identity + stale/out-of-order semantics covered
  by `saveCoordinator.test.ts`.
- **TEST_PASS**: targeted + regression suites pass (85 in the persistence/visual set).
- **RUNTIME_PASS**: NOT verified — requires manual confirmation (SAVE-01 … SAVE-12),
  especially cross-profile isolation (SAVE-07/08) which depends on live persistence.

---

## FINAL GATE

`POWER_EDITOR_AUTOSAVE_V1_GATE` → **NOT_VERIFIED**

Final PASS requires user runtime confirmation of Saved/Unsaved/Saving/Error status,
reload/leave-and-return persistence, no lost edits during in-flight saves, no
late-save rewinds, and no cross-profile contamination. Data preservation takes
priority: if any cross-profile uncertainty remains at runtime, STOP rather than
shipping unsafe autosave.
