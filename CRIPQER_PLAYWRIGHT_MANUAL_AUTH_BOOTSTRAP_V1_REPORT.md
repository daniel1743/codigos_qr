# CRIPQER PLAYWRIGHT MANUAL AUTH BOOTSTRAP V1

**Status:** `HARNESS READY — MANUAL LOGIN NOT EXECUTED`

## Added

- `e2e/auth-bootstrap.setup.ts`: headed Playwright setup that opens `/editor`,
  waits for an authenticated editor control, then saves local storage state.
- `e2e/playwright.auth-bootstrap.config.ts`: headed bootstrap configuration.
- `e2e/playwright.contextual-qa.config.ts`: reuses
  `e2e/.auth/qa-storage-state.json` for authenticated contextual QA.
- `.gitignore` protection for `e2e/.auth/`.

## Security

No credentials are hardcoded, requested, printed or written to reports.
Storage state is treated as credential-bearing and is ignored by Git.
Application auth, Supabase auth and production code were not changed.

## Verification

- `git check-ignore -v e2e/.auth/qa-storage-state.json`: PASS.
- TypeScript/config checks were run without reported errors.
- Automatic headed launch was attempted but the environment rejected process
  creation with `Acceso denegado`; no session state was generated.

## Manual command

Run locally from the repository root:

```text
npx playwright test e2e/auth-bootstrap.setup.ts --config=e2e/playwright.auth-bootstrap.config.ts
```

Complete login in the visible browser window. The setup saves state only after
the authenticated editor surface is visible. Then the contextual QA can reuse:

```text
npx playwright test e2e/contextual-media-authenticated.spec.ts --config=e2e/playwright.contextual-qa.config.ts
```
