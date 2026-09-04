# Cripqer — Engine V2 Host Adapter Contract

Status: **PREPARED HOST BOUNDARY; ENGINE NOT CONNECTED**

## Existing host boundary

The host already provides:

- `acceptEngineGeneratedConfig` in
  `src/lib/canonical-page/contract.ts`.
- `set_profile_canonical_editor_config` in the prepared SQL migration.
- `profiles.template_config` as the canonical JSONB storage location.
- Basic Editor patch ownership through
  `src/lib/basic-editor-persistence/patch.ts`.

The adapter remains dormant because the Engine package cannot be installed
without the frozen Power Editor contract.

## Future interface

The next authorized phase may add an internal function equivalent to:

```ts
generateCripqerPageWithEngineV2(intent): {
  metadata: unknown;
  editorConfig: unknown;
  media: unknown;
  supervisor: unknown;
}
```

That function must import the frozen Engine V2 package, preserve its generated
Power-compatible config unchanged, and pass only the opaque config through
`acceptEngineGeneratedConfig` before atomic persistence. It must not convert
the output to the Basic schema or expose it through public onboarding.

## Security and ownership rules

- Provider secrets remain server-only and never use `VITE_` names.
- Basic Editor may update only its allowlisted profile fields and Basic JSON
  namespaces.
- Canonical `editorConfig` remains opaque to Basic Editor writes.
- Native calendar/forms remain disabled; external booking URLs use the host
  action contract only.
- No public route or production generation switch is part of this checkpoint.
