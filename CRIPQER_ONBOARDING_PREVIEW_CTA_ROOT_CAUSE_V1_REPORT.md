# CRIPQER ONBOARDING PREVIEW CTA ROOT CAUSE V1

**Status:** `PASS — CTA PRESENT; QA ENTER FALLBACK ADDED`

## Diagnosis

Both routes mount the same `PremiumOnboardingFlow`. In the current runtime,
`/onboarding-preview` contains one `Continuar` button and its fixed footer is
inside the viewport on desktop and mobile. The earlier Inspector overlap fix is
scoped to `/onboarding-test` and is not the cause on `/onboarding-preview`.

The remaining reachability issue is addressed with a temporary QA keyboard
fallback. Enter calls the existing `goNext` handler, so the existing
`validateStep` rules remain authoritative.

## Safety

Enter does nothing while generating, persisting, uploading, or while the
Inspector drawer is open. Textarea Enter keeps normal newline behavior. Buttons,
selects and file inputs retain their native behavior. No onboarding fields,
Engine, authentication or persistence logic changed.

## Verification

- Desktop CTA: visible, enabled and inside viewport.
- Mobile CTA: visible, enabled and inside viewport.
- TypeScript: PASS.
- `git diff --check`: PASS.
- Full authenticated runtime remains dependent on the local QA session.
