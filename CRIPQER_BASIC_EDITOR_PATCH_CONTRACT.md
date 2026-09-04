# Cripqer — Basic Editor Patch Contract V1

## Purpose

The Basic Editor sends a patch, not a reconstructed page document. The adapter
is implemented in `src/lib/basic-editor-persistence/patch.ts`.

### Owned profile fields

The allowlist covers the fields the current Basic route actually edits:
identity/content, avatar/banner, typography, colors, button treatment, footer,
decorative settings, social-cover settings, template selection, QR visual
settings, slug, and published state.

It excludes host identity/system fields (`id`, `user_id`, `public_id`, scan and
timestamps) and excludes `template_config` from ordinary column updates.

### Owned JSON keys

Only these existing Basic namespaces are patchable:

- `basic_link_presentations`
- `professional_badge`

Unknown keys, including future `editorConfig` and premium fields, are not
copied from the client patch.

## Persistence behavior

`profileService.updateBasicEditorProfile` performs:

1. an allowlisted profile-column update; and
2. an authenticated RPC merge for the Basic JSON namespace, when needed.

`patch_profile_basic_template_config` runs as an invoker, requires
`auth.uid() = profiles.user_id`, validates the two allowed keys, and performs
an atomic JSONB merge. It does not replace the JSON document.

`set_profile_canonical_editor_config` is reserved for the future Engine/Power
flow. It writes `schemaVersion: 1` and `editorConfig` atomically while keeping
the existing Basic metadata keys in the same JSONB object.

## Required invariants

- Changing name, link URL, or avatar cannot remove unknown canonical keys.
- A Basic patch cannot address a Power-only path.
- Stable `profile_links.id` values remain the link targets.
- Temporary link IDs are remapped only inside the Basic presentation namespace.
- No UI redesign or Power control was added.
