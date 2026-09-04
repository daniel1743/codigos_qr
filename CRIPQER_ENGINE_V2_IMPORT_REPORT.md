# Cripqer — Engine V2 Import Report

Date: 2026-09-03  
Status: **CONTROLLED IMPORT COMPLETE**

## Result

Engine V2 was copied from the authoritative companion source into the
isolated host namespace:

`src/lib/parametric-engine-v2/`

Engine V1 remains active and preserved at:

`src/lib/parametric-engine/`

No Engine V2 route, public onboarding flow, or automatic provider call was
connected. The only host-facing entrypoint is dormant and server-only.

## Imported capability matrix

| Capability                  | Installed | Host boundary                                        |
| --------------------------- | --------- | ---------------------------------------------------- |
| Engine V2 core              | YES       | Isolated namespace                                   |
| Power Editor mapping        | YES       | Frozen contract under `src/premium-template-studio/` |
| Pexels                      | YES       | Server secret/fetch seam                             |
| Unsplash                    | YES       | Server secret/fetch seam                             |
| Media Curator               | YES       | Injected server result / no fabricated assets        |
| DeepSeek Supervisor         | YES       | Server-only structured guardrail                     |
| Direct fixtures/self-checks | YES       | V2 test namespace                                    |

## Host integration

`src/lib/parametric-engine-v2/internal-entrypoint.ts` provides the dormant
`generateCripqerPageWithEngineV2` function. It:

1. Maps host onboarding intent to the frozen Engine V2 input contract.
2. Requires a real primary action or valid content link; it never invents a
   destination.
3. Accepts optional server-curated media and supervisor results as injected
   inputs.
4. Produces a validated Engine V2 config and passes it through
   `acceptEngineGeneratedConfig`.
5. Returns the canonical envelope for the existing canonical persistence
   service; it does not write to Supabase itself.

The host action policy remains authoritative. External URL, WhatsApp, phone,
email, social, booking and section actions are represented according to the
existing policy; forms and native calendar behavior remain blocked.

## Validation evidence

| Check                                         | Result                                |
| --------------------------------------------- | ------------------------------------- |
| Engine V2 tests: 4 files / 41 tests           | PASS                                  |
| Media + AI coverage                           | PASS within the 41-test Engine V2 run |
| Frozen Power Editor tests: 7 files / 63 tests | PASS                                  |
| Relative import closure                       | PASS                                  |
| Changed adapter files: ESLint                 | PASS                                  |
| Changed adapter files: Prettier               | PASS                                  |
| Changed adapter files: whitespace check       | PASS                                  |
| Production build (`npm run build`)            | PASS                                  |
| Engine V1 diff                                | NONE                                  |
| Public V2 route/import                        | NONE                                  |

The repository-wide TypeScript command still reports pre-existing diagnostics
outside Engine V2 (admin, Basic Editor/renderers, profile, editor route and
`vite.config.ts`). No diagnostic was reported under
`src/lib/parametric-engine-v2/` or `src/premium-template-studio/`; scoped V2
TypeScript result is PASS.

The full copied snapshot retains source formatting by design. Running ESLint
over all imported Engine V2 files reports 393 inherited Prettier diagnostics;
the frozen business logic was not reformatted. Only the three provider
adapters and the new host entrypoint were formatted and linted.

## Secrets and remaining blockers

- `.env` contains the supplied Pexels and Unsplash server keys; their values
  are intentionally omitted from this report.
- `DEEPSEEK_API_KEY` was not supplied/configured. DeepSeek injected/failure
  guardrail tests pass, but a live supervisor call remains unavailable until a
  server-side key is configured.
- A real same-profile Supabase Basic ↔ Power round-trip remains pending; see
  `CRIPQER_BASIC_POWER_ROUNDTRIP_HANDOFF.md`.
- The entrypoint is intentionally not exported into a route or onboarding
  flow, per the strict import scope.

## Safety result

Basic Editor, public routes, onboarding, renderer behavior, auth, billing and
database product behavior were not changed by this Engine V2 import. No files
were staged or committed.
