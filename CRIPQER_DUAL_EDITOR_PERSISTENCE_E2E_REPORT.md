# Cripqer — Dual Editor Persistence E2E Harness Report

Date: 2026-09-04  
Status: **READY — COMPLETE DUAL EDITOR ROUND-TRIP PASSED**

## Required result

| Check                            | Result                                             |
| -------------------------------- | -------------------------------------------------- |
| `localhost:8080` reachable       | YES — HTTP 200                                     |
| Playwright executed              | YES — 1 test passed; complete round-trip           |
| QA profile target                | `sy9whgm`                                          |
| Normal QA authentication used    | YES — browser UI login passed                      |
| Service-role used                | NO                                                 |
| LOGIN                            | PASS                                               |
| BASIC_SAVE                       | PASS                                               |
| BASIC_TO_POWER                   | PASS                                               |
| POWER_READS_BASIC_DATA           | PASS                                               |
| POWER_SAVE                       | PASS — real Power UI change persisted              |
| POWER_TO_BASIC                   | PASS                                               |
| DATA_PRESERVATION                | PASS — both ownership domains survived             |
| ENGINE_V2_TO_BASIC               | PASS                                               |
| Basic → Power preservation       | PASS                                               |
| Power → Basic preservation       | PASS                                               |
| Engine → Basic preservation      | PASS                                               |
| `schemaVersion` preserved        | PASS                                               |
| `editorConfig` preserved         | PASS for Basic/Power/Engine browser path           |
| RLS test result                  | NOT_TESTED                                         |
| Data loss detected               | NO — QA snapshot restored                          |
| Writes performed                 | 7 — 2 canonical, 3 Basic UI, 1 Power UI, 1 cleanup |
| Public product behavior modified | NO                                                 |
| `DUAL_EDITOR_PERSISTENCE`        | READY                                              |

## Archivos del alcance autorizado

- `e2e/playwright.config.ts`
- `e2e/dual-editor-persistence.spec.ts`
- `e2e/run-engine-v2-entrypoint.mjs`
- `src/routes/internal.power-editor.tsx` — ruta interna de desarrollo
- `src/routeTree.gen.ts` — generado por TanStack Router

The harness uses browser-originated requests with the normal Supabase anon key
and requires local `QA_EMAIL` and `QA_PASSWORD` environment variables. It never prints or stores
the password, does not use service-role, restricts profile lookup and writes to
`sy9whgm` for the confirmed QA user, and restores the original profile snapshot during
cleanup after a successful authenticated run.

The Engine runner invokes the documented dormant
`generateCripqerPageWithEngineV2` entrypoint through Vite SSR; it does not add a
production route or modify Engine V2/Power Editor code.

## Execution result

The canonical SQL migration was applied in the correct Supabase project and
the browser RPC call succeeded. The authenticated QA account and exact profile
`sy9whgm` were verified. The new development-only internal route
`/internal/power-editor?profile=sy9whgm` loaded the existing
`src/premium-template-studio/` package without modifying its internals.

The complete browser round-trip passed: Basic saved, Power read the same
canonical envelope, Power changed the texture through its real UI and saved,
Basic read the change back, and the Engine V2 generated config survived a later
Basic save. `schemaVersion = 1` and opaque `editorConfig` remained intact.

The browser Supabase request path was used, service-role access was not used,
and TLS verification was not disabled.

## Integration evidence

| Requirement                                 | Result                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Internal Power Editor route created         | YES                                                                                            |
| Internal route path                         | `/internal/power-editor`                                                                       |
| Feature flag/gate                           | YES — development-only `DEV` gate; optional `VITE_ENABLE_INTERNAL_POWER_EDITOR` disable switch |
| Authenticated ownership check               | PASS — requested slug filtered by authenticated `user_id`                                      |
| Power Editor source                         | `src/premium-template-studio/`                                                                 |
| Frozen Power Editor internals modified      | NO                                                                                             |
| Engine V2 internals modified                | NO                                                                                             |
| Basic Editor internals modified             | NO                                                                                             |
| Canonical RPC used                          | YES — `public.set_profile_canonical_editor_config`                                             |
| Non-QA profiles modified                    | NO                                                                                             |
| Public navigation/production route modified | NO — ruta dev-only y sin enlace público                                                        |
| Build                                       | PASS                                                                                           |
| ESLint/Prettier changed scope               | PASS                                                                                           |
| Final Playwright E2E                        | PASS — 1 test passed (1.3m)                                                                    |

The browser Supabase request path was used, service-role access was not used,
and TLS verification was not disabled.
