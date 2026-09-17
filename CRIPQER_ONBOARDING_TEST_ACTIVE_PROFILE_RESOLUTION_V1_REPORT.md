# CRIPQER ONBOARDING TEST — ACTIVE PROFILE RESOLUTION V1

**Task ID:** `CRIPQER_ONBOARDING_TEST_ACTIVE_PROFILE_RESOLUTION_V1`  
**Status:** `IMPLEMENTED — AUTHENTICATED RUNTIME PENDING`  
**Success gate:** `CRIPQER_ONBOARDING_TEST_ACTIVE_PROFILE_RUNTIME_PASS_FROZEN`

## Fix

`/onboarding-test` now resolves the authenticated user's existing profile
through `profileService`, the same repository authority used by `/editor`.
The resolver supports an optional requested profile only as a hint and checks
ownership with the authenticated Supabase user before passing the resulting
`profileId` to `PremiumOnboardingFlow`.

No client-supplied `userId`, manual UUID, profile creation, service-role
credential, Engine, media, canonical, renderer or persistence-architecture
change was introduced.

## Verification status

- Static scope review: PASS.
- Profile ownership remains server-verified: PASS.
- `profileId` handoff to the existing persistence boundary: PASS by code path.
- Authenticated `/editor` → `/onboarding-test` → Steps 1–5 → one child page →
  editor reload: **NOT RUN in this environment**; the local browser session
  is not available to the automation bridge.
- Automated Vitest, TypeScript and ESLint commands did not complete in the
  current environment and are not reported as passing.

The existing manual auth bootstrap remains the required runtime entry point.
