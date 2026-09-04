# Cripqer — Engine V2 / Power Editor V2 Migration Plan

This plan is intentionally staged. The current task prepares the host only;
the Engine and Power Editor remain frozen outside the repository.

## Required sequence

1. **Host canonical page support** — prepared with JSONB envelope and RPCs.
2. **Basic Editor safe patch adapter** — prepared and integrated into current save flow.
3. **Host action contract** — defined; native forms/booking remain out of scope.
4. **Server secrets/API boundaries** — prepared with server-only provider-neutral seam.
5. **Copy Engine V2** — not started; requires explicit migration authorization.
6. **Validate Engine package** — run the supplied V2 self-check after import.
7. **Copy Power Editor V2** — not started; frozen contract must be copied unchanged.
8. **Internal Power Editor route** — add only after package validation and feature-flag decision.
9. **Engine → canonical page generation** — adapt through `acceptEngineGeneratedConfig`.
10. **Persistence** — use `set_profile_canonical_editor_config`, not Basic full-object saves.
11. **Basic ↔ Power round-trip QA** — verify premium fields survive Basic edits.
12. **Onboarding → Engine** — map `CripqerOnboardingIntentV1` to the frozen Engine input.
13. **Premium gating** — gate access/controls, never mutate canonical config.
14. **Internal user QA** — test legacy, canonical, downgrade and public rendering paths.
15. **Controlled production rollout** — feature flag, metrics, rollback and route parity.

## Entry gates before step 5

- Install the exact handoff Power Editor package, including its canonical type.
- Confirm the ownership matrix and exact canonical paths.
- Apply the supplied Engine/Power self-checks without modifying their contract.
- Add real same-profile round-trip tests with a canonical config containing
  textures, frames, gradients, motion, and advanced card styling.
- Confirm RLS/RPC behavior in the target Supabase environment.

## Explicit non-goals in this checkpoint

- No Engine V2 copy.
- No Power Editor copy.
- No public Power route or navigation.
- No new billing/provider/database product behavior.
- No replacement of the Basic renderer or editor UX.
