# Cripqer — Basic ↔ Power Real Ownership Matrix

Date: 2026-09-03  
Status: **CONTRACT CONFIRMED / REAL PROFILE VERIFICATION BLOCKED**

## Ownership boundary

| Surface                                                                                | Owner                    | Allowed persistence                                                 | Status                |
| -------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------- | --------------------- |
| Profile identity/content columns                                                       | Basic Editor             | Declared profile columns only, through the existing Basic save flow | Contract installed    |
| `basic_link_presentations`                                                             | Basic Editor             | Only this JSON namespace                                            | RPC prepared          |
| `professional_badge`                                                                   | Basic Editor             | Only this JSON key                                                  | RPC prepared          |
| `template_config.schemaVersion`                                                        | Host canonical boundary  | Version `1` envelope field                                          | RPC prepared          |
| `template_config.editorConfig`                                                         | Power Editor / Engine V2 | Opaque `BioTemplateConfig` accepted by host                         | RPC prepared          |
| Power texture, frame, gradient/background, motion, responsive and advanced card fields | Power Editor             | Inside opaque `editorConfig` only                                   | Must be verified live |
| Forms and native calendar behavior                                                     | Host policy              | Blocked/not implemented                                             | Preserved             |

## Persistence paths

### Basic path

`createBasicEditorPatch` filters the Basic-owned profile fields and only the
two Basic JSON keys. `patch_profile_basic_template_config` atomically merges
the allowed JSON patch and checks `user_id = auth.uid()`.

### Power/canonical path

`acceptEngineGeneratedConfig` wraps an opaque config as:

```json
{
  "schemaVersion": 1,
  "editorConfig": "BioTemplateConfig"
}
```

`canonicalPageService.save` calls
`set_profile_canonical_editor_config`, which updates only the canonical
envelope keys and checks `user_id = auth.uid()`.

## Required real assertions

- Basic patch changes identity/content while preserving every unknown key under
  `editorConfig`.
- Power save changes premium fields while preserving Basic-owned profile
  columns and JSON namespaces.
- A second Basic patch preserves the Power changes from snapshot C.
- `schemaVersion` remains `1` and `editorConfig` remains a JSON object.
- A legacy profile without the envelope remains a Basic page and does not gain
  a fabricated Power config.
- A cross-user update is rejected by RLS/RPC when a safe authenticated test
  setup is available.

## Current evidence and gap

The RPCs exist remotely and the local contracts are type-checked, but the
authenticated owner token and dedicated QA profile were unavailable. No real
write was attempted. This matrix is therefore a handoff for the live QA gate,
not a claim that persistence has passed.
