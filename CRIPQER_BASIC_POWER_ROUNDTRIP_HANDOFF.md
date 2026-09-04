# Cripqer — Basic ↔ Power Round-Trip Handoff

Date: 2026-09-03  
Status: **HOST BOUNDARY PREPARED / LIVE PROFILE QA PENDING**

## Intended round trip

1. Generate a Power Editor V2 config through the dormant Engine V2 entrypoint.
2. Pass the returned `canonicalEnvelope` through the canonical page service.
3. Load the same profile in the Power Editor and verify premium fields.
4. Edit only Basic-owned fields in the Basic Editor.
5. Save through the Basic patch contract.
6. Reload the same profile in Power and verify that unknown/premium fields are
   unchanged.

## Protected fields

The fixture should include textures, frames, gradients, motion, typography,
responsive overrides, media treatment and advanced card styling. Basic saves
must patch only their declared ownership and must not replace the full
canonical `editorConfig` object.

## Persistence boundary

Use the existing `canonicalPageService.save(...)`, which persists through
`set_profile_canonical_editor_config`. Do not call a legacy full-object Basic
save with a Power-generated config. The Engine V2 internal entrypoint returns
the canonical envelope but intentionally performs no database write.

## Current evidence

- Engine V2 integration tests pass 41/41, including premium-field fixtures for
  textures, frames, motion, media cards and renderer compatibility.
- Frozen Power Editor contract tests pass 63/63.
- Canonical acceptance and host adapter are type-checked within the V2 scope.
- No real same-profile Supabase round trip was executed in this checkpoint.

## Remaining QA gate

Run this handoff only with an authorized test profile in the target Supabase
environment and verify, before/after hashes or equivalent structural
assertions, that Basic edits preserve all opaque Power fields. Confirm RLS/RPC
behavior and rollback on failure. Do not expose the dormant entrypoint
publicly until that evidence exists.
