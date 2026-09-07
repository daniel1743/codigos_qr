# CRIPQER — ONBOARDING V2 LOCAL/QA ENABLEMENT FIX V1

## User-Observed Failure

At `/editor`, completing the onboarding form ended with:

> Onboarding V2 is disabled.

The failure happened at the server-function handoff, before Engine V2 or the Power Editor could be exercised.

## Exact Root Cause

`src/lib/onboarding-v2/generation-server.ts` calls `requireOnboardingV2Enabled()` before generation. The guard in `src/lib/env.ts` evaluates:

```ts
return environment["VITE_ENABLE_ONBOARDING_V2"] === "true";
```

The previous `.env.local` had no `VITE_ENABLE_ONBOARDING_V2` entry, so Vite exposed `undefined`; the comparison returned `false` and the guard threw `Onboarding V2 is disabled.`

## Feature Flag / Configuration Source

- Source of truth: `VITE_ENABLE_ONBOARDING_V2`.
- Namespace: Vite client/server environment (`VITE_*`).
- Enablement: exact string `"true"`.
- Default: absent, malformed, or any value other than `"true"` is disabled.
- Timing: build/dev-server environment evaluation; the dev server must restart after changing `.env.local`.
- The same flag is used by the onboarding generation server boundary. No second flag was created.

## Previous Local Value

`VITE_ENABLE_ONBOARDING_V2` was not set in `.env.local`.

## Production Value / Behavior

Production source behavior is unchanged and remains opt-in. `src/lib/env.ts` still defaults to disabled when the variable is absent or malformed. No production/Vercel configuration was modified or deployed.

## Exact Fix

Added one line to the existing ignored local configuration file `.env.local`:

```dotenv
VITE_ENABLE_ONBOARDING_V2=true
```

No application source, dependency, database, route, renderer, Basic Editor, Power Editor, billing, or entitlement file was modified.

## Why Production Is Unchanged

The change is local-only in `.env.local`. The production default and guard remain exactly as before: only an explicitly injected `VITE_ENABLE_ONBOARDING_V2=true` enables the feature.

## Code/Config Evidence

Before: `.env.local` had no matching variable.

After: `.env.local` contains `VITE_ENABLE_ONBOARDING_V2=true`.

The emitting branch remains:

```ts
export function requireOnboardingV2Enabled(): void {
  if (!isOnboardingV2Enabled()) {
    throw new Error("Onboarding V2 is disabled.");
  }
}
```

## Logic Evidence

The normal route was preserved: `/editor` routed to `/onboarding-preview`, submission showed `Generando…` and `Guardando…`, then redirected to the editor with the same profile ID. No direct Power Editor route or canonical-config shortcut was used.

## Automated Test Evidence

- `VITE_ENABLE_ONBOARDING_V2=false npx vitest run src/lib/__tests__/env.test.ts`: PASS — 1 file, 2 tests.
- `npx vitest run src/lib/onboarding-v2/__tests__/basic-editor-handoff.test.ts src/lib/onboarding-v2/__tests__/canonical-persistence.test.ts`: PASS — 2 files, 11 tests.
- An initial combined run against the enabled local environment exposed that the existing default-off test loads `.env.local`; it was rerun with an isolated `false` process value and passed. No test was changed.

## Runtime Environment

- Local Vite dev server restarted with the local flag enabled on `http://localhost:8081` because the pre-existing process on port 8080 could not be restarted from this session.
- The browser was authenticated with the existing QA profile context.

## Runtime Onboarding Test

Observed in the browser:

1. `/editor` reached `Onboarding V2 Preview` at step 1; the disabled error was absent.
2. Completed the eight-step onboarding flow with identity `daniel`, category `beauty`, goal `presence`, `let_cripqer_decide`, five content needs, `minimal_media`, and no primary CTA.
3. Submission entered `Generando…`, then `Guardando…`.
4. The result redirected to `/editor?profileId=ff0cd302-07a4-4106-9a13-a14f9ded2f4b`.

## Canonical Handoff Evidence

- Canonical envelope/config exists: YES, evidenced by the resulting editor loading `editorial · editorial_stack`.
- Profile identity retained: YES — the same `profileId` was preserved.
- Schema/version: the resulting route loaded the Power Editor V2 canonical configuration through the existing handoff.
- `Sin CTA` selected: YES.
- Effective primary action: `null`/no primary action, displayed as `Sin CTA`; no independent contract failure appeared.

## Final Editor Reached

The resulting page visibly showed `POWER EDITOR V2`, with the generated profile content and canonical configuration loaded. This is runtime and visual evidence on port 8081.

## Visual Evidence

VISUAL_VERIFIED: PASS on the restarted local QA server (`localhost:8081`): browser state showed Onboarding V2, the handoff progress states, and the resulting Power Editor V2.

## Files Inspected

- `src/lib/env.ts`
- `src/lib/onboarding-v2/generation-server.ts`
- `src/routes/editor.tsx`
- `src/routes/onboarding-preview.tsx`
- `.env.local` (feature flag only)
- `.env.example` (feature flag documentation)
- `src/lib/__tests__/env.test.ts`
- `src/lib/onboarding-v2/__tests__/basic-editor-handoff.test.ts`
- `src/lib/onboarding-v2/__tests__/canonical-persistence.test.ts`

## Files Modified

- `.env.local` — added the local-only flag.
- `ONBOARDING_V2_LOCAL_QA_ENABLEMENT_FIX_REPORT.md` — this report.

## Out-of-Scope Findings

None. The `Sin CTA` path completed without a second payload-contract failure.

## Frozen Scope Evidence

No files under the frozen Power Editor/Basic Editor/Engine V2 areas were modified. No package, lockfile, route, database, production configuration, or dependency changes were made.

## Final Matrix

```text
ROOT_CAUSE: PASS
LOCAL_ENABLEMENT: PASS
PRODUCTION_UNCHANGED: PASS (source/config scope; production deployment not exercised)
CODE_CONFIG: PASS
LOGIC: PASS
TESTS: PASS
BUILD: NOT_APPLICABLE (local env-only change)
RUNTIME: NOT_VERIFIED (exact port 8080; verified on restarted localhost:8081)
VISUAL: PASS (localhost:8081)
CANONICAL_HANDOFF: PASS (localhost:8081)
POWER_EDITOR_REACHED: PASS (localhost:8081)
```

ONBOARDING_V2_LOCAL_QA_GATE: NOT_VERIFIED
