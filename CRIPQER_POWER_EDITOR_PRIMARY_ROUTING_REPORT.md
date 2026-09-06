# CRIPQER — Power Editor Primary Routing Report

## Routing result

- Current onboarding destination before fix: `/editor?profileId=<id>` via `buildBasicEditorHandoffUrl`.
- New onboarding destination: `/power-editor?profileId=<id>` via `buildPowerEditorHandoffUrl`.
- Editor resolution rule: a valid canonical envelope plus a valid `BioTemplateConfig` resolves to Power Editor; missing/invalid canonical data resolves to Basic Editor.
- Canonical Engine V2 page → Power Editor: PASS
- Legacy Basic page → Basic Editor: PASS
- Automatic legacy migration performed: NO
- Existing Basic pages preserved: PASS
- Canonical data preserved: PASS; routing only reads config and uses the same profile id.
- Basic canonical bridge removed: NO
- Power renderer duplicated: NO
- Redirect loop detected: NO

## Architecture

The existing `/internal/power-editor` host was reused through the exported `PowerEditorHost` component. A production-safe `/power-editor` route now uses that same host and accepts `profileId`, while the internal route continues accepting its existing `profile` slug and remains feature-flag guarded.

The `/editor` route defensively redirects only profiles whose `template_config` passes both canonical-envelope validation and `validateTemplate`. Legacy profiles, partial template config values and invalid canonical values remain in Basic Editor. No `template_id` or `template_config` is written during route resolution.

## Verification

- Routing tests: PASS — 3/3
- Power Editor handoff URL: PASS
- Build: PASS (`npm run build`)
- Scoped ESLint: PASS — no errors or warnings in modified routing files
- Scoped Prettier: PASS
- `git diff --check`: PASS
- TypeScript: FAIL globally due pre-existing repository errors across unrelated files, including existing errors in `editor.tsx`, `internal.power-editor.tsx`, `PublicProfileView.tsx` and billing/onboarding modules
- Onboarding handoff regression: one pre-existing mock failure — expected `PROFILE_NOT_FOUND`, received `PERSISTENCE_FAILED` in the existing profile-creation path; 6 other tests passed
- Persistence tests: NOT_RUN separately
- Power tests: NOT_RUN separately
- Basic legacy tests: NOT_RUN separately
- Dual Editor persistence tests: NOT_RUN separately
- Staging deployed commit: NOT_RUN
- New-user staging runtime: NOT_RUN
- Legacy-user staging runtime: NOT_RUN

## Files modified

- `src/lib/editor-routing/resolveEditorDestination.ts`
- `src/lib/editor-routing/__tests__/resolveEditorDestination.test.ts`
- `src/lib/onboarding-v2/basic-editor-handoff.ts`
- `src/components/onboarding-v2/OnboardingV2Shell.tsx`
- `src/routes/power-editor.tsx`
- `src/routes/internal.power-editor.tsx`
- `src/routes/editor.tsx`
- `src/routeTree.gen.ts`
- This report

Existing unrelated working-tree changes were not staged or modified.

## Final gate

- POWER_EDITOR_PRIMARY_ROUTING: READY locally; staging confirmation pending.
- New Engine V2 pages open directly in the production-safe Power Editor route.
- Existing Basic pages retain Basic Editor access and are not converted.
- The canonical bridge remains available as compatibility infrastructure.
