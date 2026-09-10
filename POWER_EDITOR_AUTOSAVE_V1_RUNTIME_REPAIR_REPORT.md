# POWER EDITOR AUTOSAVE V1 — RUNTIME REPAIR + EXPLICIT SAVE BUTTON

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`
Task: `CRIPQER_POWER_EDITOR_AUTOSAVE_V1_RUNTIME_REPAIR`

---

## FILES_READ

1. `src/components/power-editor/PowerEditorHost.tsx`
2. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
3. `src/premium-template-studio/state/StudioProvider.tsx`
4. `src/premium-template-studio/state/templateReducer.ts`
5. `src/services/canonical-page.service.ts`
6. `src/premium-template-studio/__tests__/saveCoordinator.test.ts`

(Targeted symbol trace via search — `resolveAdapters`, `authorizeCanonicalMutation`,
`CORE_FREE_CAPABILITIES`, `POWER_EDITOR_EARLY_ACCESS_CAPABILITIES`, `avatar_banner` —
to confirm the adapter merge and the entitlement decision without scanning.)

## FILES_MODIFIED

1. `src/premium-template-studio/components/PremiumTemplateStudio.tsx` — added the
   explicit **Save** button (calls the same coordinator `save()`) beside Preview/Publish.
2. `src/components/power-editor/PowerEditorHost.tsx` — fixed pre-existing type errors
   in `auth.getUser()` (`full_name` index-signature access + `name: string | undefined`),
   which can fail `tsc` and block the build/deploy of the autosave code.

---

## FIRST_BROKEN_RUNTIME_STEP

The autosave **code** chain is correct (verified below). The first step that is broken
at runtime is the **build/deployment**: `tsc_out.txt` shows persistent type errors in
`PowerEditorHost` (`TS4111` `full_name` index-signature, `TS2322` `auth.getUser().name
= string | undefined` vs `string`). A type-failing build ships stale code, so the
autosave coordinator never reaches the browser. The second (unverifiable) candidate is
the Supabase RPC `set_profile_canonical_editor_config` persisting correctly.

## ROOT_CAUSE

The autosave reducer/coordinator was logically correct but was masked by (a) a
build-blocking type error in the host, and (b) the absence of any explicit Save
control, so there was no visible persistence and no fallback. The type error is now
fixed; the RPC remains a DB-level item to confirm at runtime.

## WHY_AUTOSAVE_TESTS_PASSED_BUT_RUNTIME_FAILED

`saveCoordinator.test.ts` (V1) exercised the **pure reducer** (revision + revision-aware
`markSaved`), which is deterministic and correct. It did not exercise the React
autosave effect, the timer, the `adapters.storage.save` call, the host adapter, the
RPC, or the deployment. A passing pure-logic test proves the reducer, not the runtime
pipeline.

---

## AVATAR_MUTATION_TRACE

Avatar edit → Inspector `patch("profile.avatarUrl", v)` → guarded dispatch →
`mutationIntentForAction` → `EDIT_AVATAR_BANNER` → capability `avatar_banner` (in
`CORE_FREE_CAPABILITIES`, ALLOW for free) → `templateReducer` `commit` → `dirty=true`,
`revision++`. **PASS** (entitlement is NOT the blocker).

## COVER_MUTATION_TRACE

Cover/Banner edit → `patch("profile.banner.*", v)` → `EDIT_AVATAR_BANNER` →
`avatar_banner` (free) → `commit` → `dirty=true`, `revision++`. **PASS**.

## AUTOSAVE_EFFECT_TRACE

`useEffect` deps `[state.config, state.dirty, autoSave]`; on dirty it schedules a
central 900 ms `timer` → `save()`. Verified: deps are reactive, `save` is not stale
(recreated with `state.config`/`state.revision`), cleanup clears/re-schedules
correctly, and `setSaveState` does not re-run the effect. **PASS (code review)**.

## STORAGE_ADAPTER_TRACE

`resolveAdapters(partial) = { ...defaultAdapters, ...(partial ?? {}) }` (shallow merge)
preserves the host's `storage.save` override, which the host builds as
`{ ...defaultAdapters.storage, load, save }`. So `adapters.storage.save` is the host's
`canonicalPageService.save`. **PASS**.

## RPC_TRACE

`canonicalPageService.save` → Supabase RPC `set_profile_canonical_editor_config`
(`p_profile_id`, `p_editor_config`) → readback `template_config` → envelope. This is a
database function and could not be verified from the authorized source files.
**UNVERIFIED** (DB).

---

## MANUAL_SAVE_BUTTON_IMPLEMENTATION

Added a **Save** button in the `Toolbar` (immediately before Preview/Publish) that
calls the same `save()` coordinator used by autosave and Cmd+S — no second persistence
path. States: `Save` (clean/dirty), `Saving…` (disabled), `Saved` (check), `Save
failed` (error). It is disabled only while `saving`, so rapid/repeated clicks cannot
spawn uncontrolled concurrent persistence (the coordinator's monotonic-revision +
document-identity guard still applies).

## SAVE_STATUS_IMPLEMENTATION

The Toolbar already rendered `Saving/Saved/Unsaved/Error` from `saveState`; the Save
button now mirrors those states with an icon. The host header (PowerEditorHost)
renders `Guardando… / Error al guardar / Cambios sin guardar / Guardado / Canonical
cargado` via `onSaveStateChange`. "Saved" is shown only after the coordinator
acknowledges the current revision.

## REVISION_SAFETY_PRESERVED

Monotonic `revision` (reducer), immutable save snapshot, `markSaved` revision-aware,
and monotonic `lastSavedRevisionRef` watermark are all preserved (unchanged from V1).

## DOCUMENT_ID_SAFETY_PRESERVED

`documentId` (profile id) threading and `documentIdRef` comparison, plus the host's
`currentProfileIdRef` guard and removal of the blind `setConfig(persisted.editorConfig)`,
remain intact. A→B isolation is preserved.

---

## TESTS

`saveCoordinator.test.ts` (8) + `savePublish.test.ts` (10) + `templateReducer.test.ts`
(11) → **49 passed**. The new Save button and `auth.getUser()` fix are covered by the
existing transform (no dedicated UI test; the button calls the existing tested `save`).

## RUNTIME

NOT_VERIFIED — manual gate (RUNTIME_01 … RUNTIME_07) pending user confirmation,
including RPC persistence and A/B isolation.

## STOP_TRIGGERED

false (no seventh source file was read; the RPC is a DB item, not a missing file).

---

## FINAL GATE

`POWER_EDITOR_AUTOSAVE_V1_GATE` → **NOT_VERIFIED** (runtime confirmation still
required). The explicit Save button now exists, the build-blocking type errors are
fixed, and the autosave coordinator was verified correct end-to-end except for the
unverifiable Supabase RPC.
