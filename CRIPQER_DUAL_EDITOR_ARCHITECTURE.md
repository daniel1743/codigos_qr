# Cripqer — Dual Editor Architecture

## Canonical ownership

One page is one `profiles` row. Its child actions are `profile_links` rows. The
existing `profiles.template_config` JSONB column is the host storage slot for
future canonical editor configuration.

The host envelope is:

```ts
{
  schemaVersion: 1,
  editorConfig: <Power Editor BioTemplateConfig, unchanged>
}
```

The host does not recreate or reinterpret the Power Editor fields. Until the
Power Editor package is installed, `editorConfig` is intentionally opaque.
Legacy Basic-only JSON remains valid and is detected as a legacy value.

Basic-only presentation metadata remains in its existing top-level keys:
`basic_link_presentations` and `professional_badge`. Basic patches may change
only those keys. The canonical `editorConfig` value is never rewritten by a
Basic save.

## Future flow

```text
Engine V2 generation
        ↓
host envelope validation
        ↓
profiles.template_config.editorConfig
        ↓
same profile row
   ┌────┴────┐
Basic Editor  Power Editor
simple patch  canonical config editor
```

The Basic Editor remains the public editor. A future Power Editor may be added
behind an internal route/feature flag and must resolve the same profile row.
No route was added in this preparation phase.

## Current route map

- `/editor`: current Basic Editor and existing QR/share controls.
- `/profile`: account/user hub.
- `/encrypted-documents`: secure documents.
- `/$alias`, `/p/$publicId`, `/d/$shortUrl`: public or receiving flows.
- No public Power Editor route exists.

## Compatibility rules

- Legacy page: read existing profile columns and legacy `template_config`.
- Canonical page: read the host envelope and hand `editorConfig` to the future
  Power renderer without changing its internal fields.
- Basic edit: update only its explicit profile-column allowlist and its two
  existing JSON namespaces.
- Access downgrade: must change editor access only; it must never delete or
  downgrade `editorConfig`.
