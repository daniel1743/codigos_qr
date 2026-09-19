# CRIPQER NEW USER LOGIN PRODUCTION SMOKE V1

**Task ID:** `CRIPQER_NEW_USER_LOGIN_PRODUCTION_SMOKE_V1`
**Source task:** `CRIPQER_NEW_USER_LOGIN_STUCK_AFTER_EMAIL_CONFIRMATION_V1`
**Status:** `DEPLOYED — HUMAN RUNTIME QA PENDING`
**Branch:** `feat/basic-editor-editorial-canvas-ui` (not `main`)

---

## 1. PHASE_0 — verification (all PASS)

| Check | Result |
|---|---|
| `Auth.tsx` contains `navigateAfterLogin` | PASS (lines 25/28, plus `useNavigate`, `navigate({ to: "/editor" })`, `data.session` guard) |
| `login.tsx` uses `<Auth showPlatformMenu navigateAfterLogin />` | PASS (line 7) |
| Embedded `Auth` uses unchanged | PASS — `editor.tsx:491` `<Auth showPlatformMenu />`, `encrypted-documents.tsx:99` `<Auth />` (no `navigateAfterLogin`) |
| Production did not yet omit the change | PASS — prior production deploy was 1h old and pre-fix |

## 2. Deployment

- **Target project (production):** `daniels-projects-29fb139e/codigos-qr`
  (`prj_q2gxKT0Mt2sikvcnNdzHZleDE416`) — the project serving `www.cripqer.dev`.
- **Method:** `vercel deploy --prod --yes` with `VERCEL_ORG_ID` +
  `VERCEL_PROJECT_ID` env overrides (no `vercel link`, so the local
  `.vercel/project.json` stayed linked to the separate `codigos-staging-on`
  staging project).
- **Forbidden actions avoided:** no commit, no merge, no reset, no branch
  switch, no auth redesign, no Supabase config change, no starter duplication.
- **New production deployment:** `https://codigos-ahuiogtmp-daniels-projects-29fb139e.vercel.app`
- **Status:** `● Ready` / `Production` (30s build).
- **Alias:** `▲ Aliased https://www.cripqer.dev`.

## 3. Production bundle proof (fix is live)

Fetched the deployed `Auth` chunk (`/assets/Auth-Bhu0200F.js`) from the new
production deployment:

| Check | Result |
|---|---|
| New error string `"No se pudo iniciar sesión…"` | PRESENT |
| `navigateAfterLogin` prop | PRESENT |
| `/editor` navigation target | PRESENT |

`https://www.cripqer.dev/login` returns HTTP 200 with the login UI markers.

## 4. Scope transparency

`vercel deploy` uploads the entire working directory, which also contained
unrelated, already-build-verified work from the concurrent page-analytics task
(`pages.$pageId.analytics`, `analyticsService`, `pg.*` route instrumentation,
premium template render changes). That task's Supabase migration was already
applied separately. No additional change was made to any of those files during
this deploy.

## 5. Human runtime QA (PENDING — requires human browser/email/Supabase access)

The following cannot be executed by this agent (no browser automation bridge, no
newly confirmed account, no email/Supabase dashboard access). They remain
`NOT_VERIFIED`, not passes.

**TEST_1 — Correct credentials (newly confirmed account)**
1. Open `https://www.cripqer.dev/login`.
2. Use the newly confirmed account; enter correct email/password; click
   **Ingresar** ("Entrar al editor").
3. Expected: `signInWithPassword` succeeds → browser leaves `/login` → reaches
   `/editor` → new-user starter authority runs if no profile exists → Power
   Editor opens.

**TEST_2 — Invalid password**
- Expected: visible error, no silent stall, button becomes usable again.

**TEST_3 — Reload**
- Expected: authenticated session remains usable; user does not return to a
  static/stuck login.

**TEST_4 — Existing account regression**
- Expected: existing user can still log in normally.

## 6. Success gate

- `NEW_CONFIRMED_USER_LOGIN_RUNTIME_PASS` — **PENDING** (human TEST_1).
- `POST_LOGIN_NAVIGATION_RUNTIME_PASS` — **PENDING** (human TEST_1).
- `NEW_USER_EDITOR_ENTRY_RUNTIME_PASS` — **PENDING** (human TEST_1).
- `INVALID_PASSWORD_FEEDBACK_PASS` — **PENDING** (human TEST_2).
- `EXISTING_USER_NO_REGRESSION` — **PENDING** (human TEST_4).

**Deployment:** PASS (verified live in production bundle).

**`CRIPQER_NEW_USER_LOGIN_POST_CONFIRMATION_RUNTIME_PASS_FROZEN`** remains
**UNFROZEN** until the human runtime checks above pass. The related
`CRIPQER_EMAIL_CONFIRMATION_SUCCESS_PAGE_RUNTIME_PASS_FROZEN` gate likewise
requires the same human email/Supabase flow and is not closed here.

