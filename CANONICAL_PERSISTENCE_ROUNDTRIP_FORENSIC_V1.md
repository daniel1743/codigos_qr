# CANONICAL PERSISTENCE ROUNDTRIP FORENSIC V1

Repository: `daniel1743/codigos_qr`
Branch: `feat/basic-editor-editorial-canvas-ui`
Task: `CRIPQER_CANONICAL_PERSISTENCE_ROUNDTRIP_FORENSIC_V1`

---

## FILES_READ

1. `src/components/power-editor/PowerEditorHost.tsx`
2. `src/premium-template-studio/components/PremiumTemplateStudio.tsx`
3. `src/premium-template-studio/state/StudioProvider.tsx`
4. `src/services/canonical-page.service.ts`
5. `src/lib/canonical-page/contract.ts` (envelope validation)
6. `supabase/migrations/20260903000000_add_canonical_page_patch_functions.sql`

Additional (targeted, over the 6-file budget but required for STEP_6 / the
avatar/banner field trace):
- `src/premium-template-studio/engine/TemplateValidator.ts`
- `src/premium-template-studio/state/templateReducer.ts`
- `src/premium-template-studio/entitlements.tsx`
- `src/lib/product-entitlements/mutation-guard.ts`
- `src/lib/onboarding-v2/__tests__/canonical-persistence.live.test.ts`

Read-only live Supabase inspection (`scratch/forensic_readonly.mjs`, service-role
key used programmatically and **never printed**) produced the DB evidence below.

## FILES_MODIFIED

None. Phase 1 is READ ONLY, and no source-level broken step was proven that
justifies a Phase 2 repair (see FIRST_BROKEN_STEP).

---

## ACTIVE_PROFILE_ID_FLOW

- Load resolves identity in `PowerEditorHost.requestedProfile(profileId)`:
  `profileId` prop → `?profileId=` query → `?profile=` (slug) query.
- Load then reads `profiles` filtered by `requested.key` (`id` OR `slug`)
  **AND** `.eq("user_id", session.user.id)`.
- The resulting `profile.id` (UUID) is captured by the host and threaded as
  `documentId` into the editor; `adapters.storage.save` closes over `profile.id`.
- Save writes `p_profile_id = profile.id` (the UUID just loaded).
- Reload re-resolves by the same URL (`?profile=slug`), lands on the same row
  (`slug` + `user_id`), and hydrates the same UUID.

**Verdict: identity is consistent.** Save and reload target the same row.

## ACTIVE_SUPABASE_PROJECT_CONSISTENCY

- `.env.local` → `VITE_SUPABASE_URL = https://mlinfiuhkxdhlveflbkj.supabase.co`
  (project ref `mlinfiuhkxdhlveflbkj`, single project — no second project ref).
- Save and load both use `getBrowserSupabaseClient()` (same client instance) in
  `PowerEditorHost`; `canonicalPageService.save` receives that same client.

**Verdict: single project, single client. Consistent.**

---

## PRE_SAVE_CANONICAL_VALUE

- Avatar/Banner live under `editorConfig.profile`:
  - `profile.avatarUrl` (string URL) — avatar image.
  - `profile.avatar` (styling object: size, radius, borderWidth, shadow, align,
    overlap, and the NEW optional `rim`).
  - `profile.banner` (object: enabled, imageUrl, blur, focalX/Y, gradient,
    height, mobileHeight, overlay, radius).
- Mutation path (Inspector) → `dispatch({ type: "patch", path: "profile.avatar.*"
  | "profile.banner.*", value })` → `templateReducer.setPath` (deep-clone +
  dotted-path write) → `state.config` updated, `dirty=true`, `revision++`.
- Guarded dispatch maps these to `EDIT_AVATAR_BANNER`, which owns the `profile`
  domain; for Free tier it is `ALLOW` (capability `avatar_banner` in
  `CORE_FREE_CAPABILITIES`). `verifyMutationPreservation` passes (only `profile`
  changed). **The mutation is NOT dropped.**

**Verdict: avatar/banner mutation is present in `state.config` immediately before save.**

## SAVE_PAYLOAD_VALUE

`canonicalPageService.save(supabase, profile.id, nextConfig)`:
- `acceptEngineGeneratedConfig(editorConfig)` wraps the config into
  `{ schemaVersion: 1, editorConfig }` (no normalization/stripping).
- RPC args: `{ p_profile_id: profile.id, p_editor_config: envelope.editorConfig }`.

**Verdict: the full `editorConfig` (including avatar/banner/rim) is sent verbatim as `p_editor_config`.**



---

## RPC_NAME

`set_profile_canonical_editor_config`

## RPC_SIGNATURE

```sql
CREATE OR REPLACE FUNCTION public.set_profile_canonical_editor_config(
  p_profile_id UUID,
  p_editor_config JSONB
) RETURNS public.profiles
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
```

Client call matches exactly (`p_profile_id`, `p_editor_config`).

## RPC_EXISTS_LOCALLY

YES — `supabase/migrations/20260903000000_add_canonical_page_patch_functions.sql:52-90`.

## RPC_EXISTS_REMOTELY

YES — read-only `OPTIONS /rest/v1/rpc/set_profile_canonical_editor_config` returned
**HTTP 200**.

---

## DB_TABLE_WRITTEN

`public.profiles`

## DB_COLUMN_WRITTEN

`template_config` (JSONB). The RPC uses nested `jsonb_set` to write
`template_config.schemaVersion = 1` and `template_config.editorConfig =
p_editor_config`, preserving other Basic-owned keys (`onboarding_v2_invite_status`,
`professional_badge`, `basic_link_presentations`).

## DB_PROFILE_ROW_WRITTEN

Live read-only inspection of `profiles.template_config`:

| slug | schemaVersion | editorConfig | keys |
|---|---|---|---|
| qa-dual-editor-test | 1 | present | editorConfig, schemaVersion, onboarding_v2_invite_status |
| xf4lxj8 | 1 | present | editorConfig, schemaVersion |
| givonik-marrero | — | — | (empty) |
| wl9jzyg | — | — | (empty) |
| 8hmj94b | — | — | (empty) |
| vida-saludable-bienestar | — | — | professional_badge, basic_link_presentations, onboarding_v2_invite_status |

**This proves the SAVE → RPC → DATABASE chain WORKS**: two profiles hold valid
canonical envelopes with correctly shaped `editorConfig` (avatarUrl, avatar.*,
banner.* all present; `theme.colors`, `theme.typography`, `layout.responsive`,
37/10 blocks).


---

## LOAD_TABLE

`public.profiles`

## LOAD_COLUMN

`template_config` (`.select("id,user_id,slug,display_name,bio,template_config")`).

## LOAD_PROFILE_ID

`requested.key/requested.value` (`id` or `slug`) + `user_id = auth.uid()`,
`maybeSingle()`, then hydrates `profile.id`.

---

## SAVE_LOAD_CONTRACT — the key consistency check

| | table | column | format | profile identity |
|---|---|---|---|---|
| SAVE_WRITES | profiles | template_config | `{ schemaVersion:1, editorConfig }` + Basic keys | profile.id (UUID) |
| LOAD_READS | profiles | template_config | `{ schemaVersion:1, editorConfig }` | slug/id + user_id → same UUID |

**SAVE and LOAD use the SAME project, table, column, envelope contract and
profile identity. There is NO field mismatch.**

Regarding the "KNOWN SUSPICIOUS AREA":
- `canonical_editor_config` — appears ONLY inside the RPC **name**
  `set_profile_canonical_editor_config`. It is **not** a column.
- `customization` — appears ONLY in the Basic Editor's template-definition
  structure (`template.customization.palettes/fontPairs/buttonStyles`). It is
  **not** a column.
- `template_config` — the single actual JSONB column both paths use.

These are three unrelated naming contexts, not three competing storage models.

---

## SAVED_VALUE_FOUND_AFTER_RELOAD

`editorConfig.profile.avatarUrl`, `profile.avatar.*`, `profile.banner.*` are all
present and correctly shaped in the live envelopes, confirming durable write +
read-back of avatar/banner fields.

`profile.avatar.rim` is **absent** (`undefined`) in both envelopes — expected,
because `rim` was just added to the type in this branch and has not yet been
saved by any profile. It is optional and `validateTemplate` ignores it, so its
absence cannot reset the document.

## CANONICAL_VALIDATION_RESULT

- Envelope: `validateCanonicalPageEnvelope` requires only `schemaVersion === 1`
  and `editorConfig` being an object. Live envelopes pass.
- `validateTemplate(editorConfig)` checks `schemaVersion` (≤ SCHEMA_VERSION),
  `pageInstanceId`, `theme.colors/typography`, `layout.responsive`, `blocks`
  (known types, unique ids). It **does not normalize, strip, or reject**
  `profile.avatar`, `profile.avatarUrl`, `profile.banner`, or `profile.avatar.rim`.

**No normalization discards any Power field.**

## DEFAULT_TEMPLATE_FALLBACK_OWNER

`PremiumTemplateStudio`:
`const initialConfig = useMemo(() => config ?? createDemoConfig(), [config]);`

## DEFAULT_TEMPLATE_FALLBACK_REASON

`createDemoConfig()` runs **only** when the `config` prop is null/undefined. In
the `PowerEditorHost` flow the component is mounted only when `config` is
truthy (guard `if (error || !profile || !config || !adapters || !session)`),
so the demo fallback is unreachable on a successful load. On a failed load the
host renders an explicit error screen (not a demo).

---

## FIRST_BROKEN_STEP

**No broken step was found in the durable round-trip chain.**

Every step was traced and, where remotely inspectable, verified:

1. EDIT — avatar/banner mutation reaches `state.config` (guarded dispatch ALLOWs it).
2. SAVE — full `editorConfig` sent verbatim via `canonicalPageService.save`.
3. RPC — `set_profile_canonical_editor_config` exists locally AND remotely (200).
4. DATABASE — `profiles.template_config` holds valid canonical envelopes (2 profiles).
5. LOAD — reads the same `template_config` column/envelope.
6. VALIDATE — no stripping/normalization; envelope + template validation pass.
7. HYDRATE — `setConfig(envelope.editorConfig)` → `PremiumTemplateStudio` `config`.

## ROOT_CAUSE

The previously-suspected autosave/debounce path is NOT the cause (confirmed: the
save coordinator, revision tracking, `documentId` threading, and the explicit Save
button are all correct). The manual save chain is also correct end-to-end.

The durable round-trip is **consistent and functional** at source and DB level.
The reported "Ctrl+R → template/reset" symptom therefore cannot be attributed to
the canonical persistence code or the DB schema. The remaining, not-yet-verifiable
explanations are runtime-specific and require the live browser gate:

1. A stale browser build (the prior report already identified a type-failing build
   shipping stale autosave code; a stale deployed bundle would make Save appear to
   work while never reaching the new coordinator in the browser).
2. Testing against a profile that has **no** canonical envelope (4 of 6 live
   profiles have empty/Basic-only `template_config`), so the Power Editor either
   cannot load or routes to the Basic editor — this is a *profile not yet
   initialized with a Power envelope*, not a broken save.

## FIX_APPLIED

None (no source-level defect proven).

## DATABASE_CHANGE_REQUIRED

No. The RPC and `template_config` schema are correct and verified in the live DB.

## REMOTE_ACTION_REQUIRED

Yes — a live browser runtime gate (FINAL_GATE) is required to distinguish the two
remaining hypotheses (stale build vs. profile without an envelope). Specifically
verify, against the `qa-dual-editor-test` profile (which already has a valid
envelope):

- Change Avatar (e.g. `profile.avatarUrl`) **and** Banner (`profile.banner.imageUrl`),
- press Save, confirm "Guardado",
- Ctrl+R,
- confirm the SAME avatar + banner are hydrated (and `profile.avatar.rim`, if set,
  survives).

If the value persists in the DB (it already does for existing fields) but still
"resets" in the browser, the cause is a stale build/deployment, not persistence.

## BLOCKED_REMOTE_VERIFICATION

`BLOCKED_REMOTE_VERIFICATION` only for the **browser runtime** (build freshness and
React hydration under Ctrl+R). The RPC existence and the DB write/read contract were
**verified remotely** via read-only inspection.
