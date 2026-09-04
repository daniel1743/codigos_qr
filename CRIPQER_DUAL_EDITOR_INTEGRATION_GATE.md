# Cripqer — Dual Editor Integration Gate

Date: 2026-09-03  
Status: **BLOCKED — AUTHENTICATED QA SUBJECT REQUIRED**

## Gate decision

`DUAL_EDITOR_PERSISTENCE` is **NOT READY**. The host RPCs are present, but the
same-profile Basic → Power → Basic Supabase round-trip could not be executed
without an authenticated session and an isolated QA profile.

## Entry requirements

1. Open an authenticated session for the test user.
2. Use a dedicated profile owned by that user; do not select a production user
   by guesswork.
3. Capture the initial `template_config` before any write.
4. Confirm the target RPCs and RLS behavior in that authenticated context.

## Required sequence

1. Generate or load an advanced Power `BioTemplateConfig` and save it with
   `set_profile_canonical_editor_config`.
2. Capture `SNAPSHOT_A_POWER`.
3. Apply a real Basic Editor patch for name, avatar, a stable link and one
   Basic-owned presentation value.
4. Capture `SNAPSHOT_B_AFTER_BASIC`; assert all Power-only fields survive.
5. Change a supported Power frame/texture, typography and button/card value;
   save through the canonical path.
6. Capture `SNAPSHOT_C_AFTER_POWER`; assert Basic identity and links survive.
7. Apply a second Basic patch for bio and an allowed destination.
8. Capture `SNAPSHOT_D_FINAL`; assert both ownership domains survive.
9. Repeat with one legacy profile lacking the canonical envelope.
10. Run the Engine V2 gardener fixture and verify generated config persistence
    followed by a Basic patch.

## Stop conditions

- Stop immediately on any loss of an unknown or premium `editorConfig` field.
- Stop immediately if a canonical Power save removes Basic-owned data.
- Do not bypass RLS with a service-role write.
- Do not modify `BioTemplateConfig`, Engine V2 business logic, frozen Power
  Editor files, Basic Editor implementation or public routes to make the gate
  pass.

## Current evidence

- Remote RPC existence: both required RPCs returned `OPTIONS 200`.
- Remote profile read: 4 profiles, no dedicated QA candidate detected.
- No canonical envelope was present in the read-only sample.
- No write was performed.
- Engine V2 41/41, Power Editor 63/63 and build remain passing.
