# Cripqer — Onboarding V2 Phase 6: Product Readiness QA

Date: 2026-09-05
Mode: `STRICT_LOCAL_AND_STAGING_READINESS_VALIDATION`
QA profile: `sy9whgm` / `qa-dual-editor-test`
QA user id: `8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165`
Local base URL: `http://localhost:8080`

## Executive result

Local functional behavior is validated for the dedicated QA profile, but the
release gate is **BLOCKED**. The product is not ready for a private beta gate
because private staging is not provisioned in this workspace, a second
dedicated QA actor is unavailable for cross-profile RLS validation, the
Onboarding V2 route has no feature flag/kill switch, and the authenticated
logout flow remained on `/editor` after the UI logout action.

No product source, schema, migration, RLS policy, service-role credential or
TLS verification setting was changed during this QA phase.

## Baseline and recovery

The original snapshot was unavailable and was not reconstructed. The dedicated
QA profile was reset through the normal authenticated owner path to the known
identity values:

```text
display_name = QA Dual Editor Test
profession   = Jardinero
bio          = Perfil temporal para pruebas del editor dual.
slug         = qa-dual-editor-test
```

`NEW_BASELINE_SNAPSHOT` was captured by the authenticated browser harness,
including the canonical `template_config` envelope and existing profile-link
set. The final Phase 5/Phase 6 cleanup restored that snapshot and verified one
owned profile, the identity fields, canonical JSON and link identity set.

The cleanup logs confirmed:

```text
QA_PROFILE=sy9whgm SLUG=qa-dual-editor-test
service-role=NO TLS-bypass=NO non-QA-profile=NO
```

## Environment gates

| Gate                              | Result  | Evidence / blocker                                                                                                                                                                 |
| --------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local app availability            | PASS    | `/onboarding-preview`, `/internal/power-editor?profile=qa-dual-editor-test` and `/editor` returned HTTP 200 on localhost.                                                          |
| Private staging / preview HTTPS   | BLOCKED | No `QA_BASE_URL`, `STAGING_URL` or `PREVIEW_URL` was configured; no private staging credentials or deployment target were available. No staging test was attempted.                |
| Dedicated owner path              | PASS    | Browser authentication resolved the dedicated QA user id and the owner flow persisted through the normal authenticated path.                                                       |
| Cross-profile RLS                 | BLOCKED | A second dedicated QA user/profile was not provisioned. No existing non-QA profile was used.                                                                                       |
| Onboarding V2 feature flag        | BLOCKED | No `VITE_ENABLE_ONBOARDING_V2` flag or equivalent guard exists; the internal preview route is directly addressable, though it remains noindex and unlinked from public navigation. |
| Internal Power Editor flag off    | PASS    | Separate Vite server with `VITE_ENABLE_INTERNAL_POWER_EDITOR=false` returned HTTP 404 for the internal Power Editor route.                                                         |
| Internal Power Editor flag on     | PASS    | Default local server and Phase 5 browser regression loaded the internal Power Editor successfully.                                                                                 |
| Onboarding rollback / kill switch | BLOCKED | No Onboarding V2 kill switch exists, so disabling the onboarding surface could not be proven. Existing `/editor` regression remained functional.                                   |

## Scenario matrix

| Scenario                            | Status | Evidence                                                                                                                                                                                               |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Simple gardener / WhatsApp journey  | PASS   | Phase 5 browser QA generated and persisted the page, links and canonical envelope, then restored the snapshot.                                                                                         |
| Rich veterinarian / booking journey | PASS   | Phase 5 browser QA persisted booking as primary action, WhatsApp as secondary action, rich content needs and a valid Engine V2 result.                                                                 |
| Portfolio / gallery / video journey | PASS   | Local browser QA persisted `Fotógrafo` content; generation duration observed: `17,295 ms`; `schemaVersion: 1` and non-empty `editorConfig.blocks` verified.                                            |
| Future commerce semantic signal     | PASS   | Local browser QA selected `Mostrar y vender`, persisted only the semantic signal, verified no checkout/payment/inventory/SKU UI and no commerce runtime/catalog setup. Duration observed: `16,651 ms`. |
| Canonical persistence               | PASS   | Browser-authenticated canonical RPC path persisted and re-read `schemaVersion: 1`; generated `editorConfig` validated.                                                                                 |
| Basic-after-Engine preservation     | PASS   | Basic edits preserved the canonical generated configuration and the final reload read the same envelope.                                                                                               |
| Power-read verification             | PASS   | Internal Power Editor read the generated Basic/Engine data for the QA slug.                                                                                                                            |
| Basic → Power → Basic               | PASS   | Full dual-editor gate: `LOGIN`, `BASIC_SAVE`, `BASIC_TO_POWER`, `POWER_READS_BASIC_DATA`, `POWER_SAVE`, `POWER_TO_BASIC`, `DATA_PRESERVATION` and `ENGINE_V2_TO_BASIC` all passed.                     |
| Double submit                       | PASS   | Phase 5 harness dispatched two immediate clicks against the review submit control; one profile remained and the handoff completed once.                                                                |
| Failure and recovery                | PASS   | Forced canonical RPC HTTP 500 showed the failure state, did not redirect or report success, left the baseline unchanged, then the normal retry succeeded.                                              |
| Back / forward safety               | PASS   | Re-entry through browser back/forward did not auto-submit; forward/back transitions were exercised in the final desktop Phase 5 run.                                                                   |
| Logout / login persistence          | FAIL   | After clicking the authenticated mobile menu action `Cerrar sesión`, the browser remained on `/editor` with the authenticated editor shell after 30 seconds; the login form did not appear.            |
| Mobile 390×844                      | PASS   | Final Phase 5 browser run: `1 passed` in `1.8m`, including simple/rich/failure/preservation paths.                                                                                                     |
| Desktop                             | PASS   | Final Phase 5 browser run: `1 passed` in `1.5m`, including simple/rich/failure/preservation paths.                                                                                                     |

## RLS and data integrity

- Owner-path RLS: **PASS**. Reads and writes used the browser session JWT,
  Supabase anon key and the existing canonical RPC.
- Cross-profile RLS: **BLOCKED** because the required second dedicated QA
  identity was not available. No fallback profile was selected.
- Duplicate profiles created: **NO**. Each browser run asserted one owned QA
  profile with the expected id.
- Non-QA profiles modified: **NO**.
- Data loss detected: **NO** relative to `NEW_BASELINE_SNAPSHOT`.
- QA profile restored: **YES**.
- Public onboarding exposed: **NO**. The route is internal/noindex and is not
  linked from public navigation.
- Public Power Editor exposed: **NO**. The route remains internal and guarded.
- Commerce / Mini-Sites exposed: **NO**.

## Performance observations

These are local wall-clock observations from browser QA, not benchmark claims:

| Measurement                                   |    Observed |
| --------------------------------------------- | ----------: |
| Portfolio generation + handoff                | `17,295 ms` |
| Deferred commerce-signal generation + handoff | `16,651 ms` |
| Desktop Phase 5 full scenario                 |   `1.5 min` |
| Mobile Phase 5 full scenario                  |   `1.8 min` |
| Dual-editor persistence gate                  |   `1.4 min` |

No formal latency budget or staging performance threshold was provided, so no
performance readiness claim is made.

## Bugs and readiness gaps

### B1 — Authenticated logout does not leave the editor

Status: **FAIL**
Observed owner: editor authentication/session lifecycle.
Reproduction: authenticated QA session → mobile editor menu → `Cerrar sesión` →
wait 30 seconds. The browser remained at `/editor` with the QA editor shell and
the login form was not shown. This blocks the logout/login scenario.

### B2 — Onboarding V2 has no feature flag or rollback guard

Status: **BLOCKED**
Observed owner: onboarding route / product feature-gating.
The internal route is protected by no Onboarding V2-specific flag. The existing
Power Editor flag is independently present and was validated off/on.

### B3 — Private staging validation cannot run

Status: **BLOCKED**
Observed owner: deployment / QA environment provisioning.
No private staging URL, preview URL or staging credentials were configured.

### B4 — Cross-profile RLS cannot run without a second dedicated QA actor

Status: **BLOCKED**
Observed owner: QA environment provisioning.
The test did not use a non-QA account or profile to compensate.

### B5 — Mobile QA selector gap in the test harness

Status: **RESOLVED IN QA HARNESS**
The mobile editor has duplicate desktop/mobile field ids by design. The Phase 5
browser harness now opens the mobile profile panel and scopes assertions to
`:visible` fields. No application code was changed.

## Regression and quality checks

| Check                                            | Result                                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `npx vitest run src/lib/onboarding-v2/__tests__` | PASS — 41 passed, 1 skipped                                                                                    |
| Phase 5 desktop browser QA                       | PASS — 1 passed                                                                                                |
| Phase 5 mobile browser QA                        | PASS — 1 passed                                                                                                |
| Basic ↔ Power ↔ Engine browser gate              | PASS — 1 passed                                                                                                |
| Local portfolio + deferred commerce browser QA   | PASS — 1 passed                                                                                                |
| `npm run build`                                  | PASS                                                                                                           |
| Changed-scope ESLint                             | PASS — `e2e/onboarding-v2-phase5.spec.ts`                                                                      |
| Changed-scope Prettier                           | PASS                                                                                                           |
| `git diff --check`                               | PASS                                                                                                           |
| `npx tsc --noEmit`                               | FAIL at repository baseline scope; diagnostics are pre-existing and outside the Phase 6 harness/report change. |

Known repository-wide diagnostics remain documented from prior phases: existing
editor/basic-template implicit-any and exact-optional-property diagnostics,
older onboarding live-test typing diagnostics, and the existing unscoped
Vitest/Pexels mismatch. The scoped onboarding suite and browser gates pass.

## Scope and commit policy

Only these Phase 6 files are intended for the commit:

- `e2e/onboarding-v2-phase5.spec.ts` — minimal mobile QA harness correction,
  visible-field scoping and double-submit/back-forward coverage.
- `CRIPQER_ONBOARDING_V2_PHASE6_PRODUCT_READINESS_REPORT.md` — this report.

No source product file, route, schema, migration, RLS policy, Commerce code or
Mini-Site code was modified. The pre-existing dirty nested path
`PROYECTO PARA INTEGRA A QR` was not staged or touched.

## Final gate

| Required result                   | Result                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| QA baseline reset                 | YES                                                                                                 |
| `NEW_BASELINE_SNAPSHOT` captured  | YES                                                                                                 |
| Final Phase 6 QA                  | BLOCKED                                                                                             |
| QA profile restored               | YES                                                                                                 |
| Non-QA profiles modified          | NO                                                                                                  |
| Data loss detected                | NO                                                                                                  |
| Commit hash                       | `3b13709` — Phase 6 QA harness/report commit; metadata finalizado en `62b2bcf`.                     |
| Push result                       | PASS — pushed to `origin/feat/basic-editor-editorial-canvas-ui`.                                    |
| `PHASE_6A_LOCAL`                  | BLOCKED — functional local journeys pass, mandatory logout/flag/cross-profile gates are incomplete. |
| `PHASE_6B_STAGING`                | BLOCKED — private staging environment unavailable.                                                  |
| `ONBOARDING_V2_PRODUCT_READINESS` | BLOCKED — not ready for private beta.                                                               |

The push result was recorded in this report after the Phase 6 commit was
successfully pushed. The follow-up metadata-only commit contains no product
source changes.
