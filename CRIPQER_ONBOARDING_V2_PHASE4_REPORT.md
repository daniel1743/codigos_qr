# Cripqer — Onboarding V2 Phase 4: Canonical Persistence Integration

Date: 2026-09-04  
Status: **READY — FINAL QA PASSED AND QA BASELINE RESTORED**

## Scope

Phase 4 connects the validated Onboarding V2 generation result to the existing
canonical page persistence boundary. The implementation is internal/QA only.
No public onboarding route, database migration, RLS policy, Engine V2 scoring,
Basic Editor or Power Editor contract was changed.

## Implemented

- Added `persistOnboardingGeneratedPageV2` in
  `src/lib/onboarding-v2/canonical-persistence.ts`.
- Validates the completed `OnboardingIntentV2` and a generated, valid
  `BioTemplateConfig` before any write.
- Requires an authenticated Supabase user and verifies profile ownership using
  the normal `profiles` query.
- Reads the existing canonical envelope before persistence.
- Persists only through `canonicalPageService.save`, which uses the existing
  `public.set_profile_canonical_editor_config` RPC.
- Re-reads and validates the canonical envelope after persistence.
- Structurally verifies the generated `editorConfig` and existing top-level
  namespaces; it never reports success when preservation verification fails.
- Added deterministic tests for authentication, ownership, generation failure,
  invalid engine output, RPC failure and namespace preservation.
- Added an explicit opt-in live QA test restricted to profile slug `sy9whgm`.

## Safety invariants

| Requirement                              | Result                                                   |
| ---------------------------------------- | -------------------------------------------------------- |
| Direct `profiles.template_config` update | NO                                                       |
| Service-role key                         | NO                                                       |
| TLS verification bypass                  | NO                                                       |
| New migration or RLS change              | NO                                                       |
| Non-QA profile targeted by live test     | NO — slug is fixed to `sy9whgm` and ownership is checked |
| Canonical schema envelope                | Existing `schemaVersion: 1`                              |
| Public product behavior                  | Unchanged                                                |

## Verification

| Check                                                          | Result                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Onboarding V2 + persistence tests                              | PASS — 43 passed, 1 opt-in live test skipped                                   |
| Changed-scope ESLint                                           | PASS                                                                           |
| Changed-scope Prettier                                         | PASS                                                                           |
| TypeScript diagnostics in changed onboarding/engine-host scope | PASS — none reported                                                           |
| Production build                                               | PASS                                                                           |
| Power Editor unit suite                                        | PASS — 126 tests                                                               |
| Engine V2 suite                                                | 40 passed, 1 pre-existing Pexels mismatch                                      |
| Live Node Supabase QA                                          | BLOCKED in Node runtime — `fetch failed`; browser-originated equivalent passed |
| Browser Basic ↔ Power ↔ Engine QA rerun                        | PASS — 1 test passed; canonical cleanup restored                               |
| Browser simple/rich generation persistence gate                | PASS                                                                           |

## Live QA state

The profile was reset through the normal authenticated owner path to the
deterministic baseline, with slug `qa-dual-editor-test`. A NEW_BASELINE_SNAPSHOT
was captured in memory after seeding a known canonical Engine V2 config. The
browser-only Phase 4 run then persisted simple and rich generated configs,
verified Basic-after-Engine preservation and Power reads, and restored the
snapshot in `finally` through the normal owner path plus canonical RPC.

The Node live test remains opt-in and cannot use the local Node fetch path in
this environment (`fetch failed`). The browser-originated path is the accepted
live evidence because it uses the normal authenticated session, anon key and
RLS-protected RPC without TLS bypass or service-role access.

## Final gate

| Required result                              | Result                     |
| -------------------------------------------- | -------------------------- |
| QA baseline reset                            | YES                        |
| NEW_BASELINE_SNAPSHOT captured               | YES                        |
| Final Phase 4 QA                             | PASS                       |
| QA profile restored to NEW_BASELINE_SNAPSHOT | YES                        |
| Non-QA profiles modified                     | NO                         |
| Data loss detected in final run              | NO                         |
| Commit hash                                  | `ac850b0` — implementation |
| Push result                                  | PASS — pushed to `origin/feat/basic-editor-editorial-canvas-ui` |
| `PHASE_4_STATUS`                             | `READY`                    |
