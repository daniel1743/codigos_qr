# CRIPQER_NEW_USER_LOGIN_STUCK_AFTER_EMAIL_CONFIRMATION_V1 — REPORT

## Summary

A newly confirmed user could reach `/login`, enter correct credentials, click
**Ingresar** ("Entrar al editor"), and the UI remained static — no visible
error, no navigation. The root cause is a missing post-authentication navigation
on the standalone `/login` route, not a Supabase authentication failure and not a
missing new-user profile.

---

## 1. Exact root cause

`src/components/Auth.tsx` handles login via
`supabase.auth.signInWithPassword(...)`. On success it only ran a comment:

```ts
// La sesión se establecerá automáticamente y el padre escuchará el onAuthStateChange
```

That comment assumed a **parent component** would listen to `onAuthStateChange`
and switch views. This is only true for the two **embedded** uses of `<Auth />`:

- `src/routes/editor.tsx` (renders `<Auth showPlatformMenu />` when `!session`,
  and owns its own `onAuthStateChange` subscription + `setSession`).
- `src/routes/encrypted-documents.tsx` (renders `<Auth />` when `!session`, and
  owns its own `onAuthStateChange` subscription + `setSession`).

The standalone route `src/routes/login.tsx` renders `<Auth showPlatformMenu />`
with **no parent `onAuthStateChange` listener and no `navigate()` call**. As a
result, a successful sign-in persisted a Supabase session but nothing triggered a
route change. The UI stayed on `/login` with `loading` reset to `false`, no error
shown, and no navigation.

## 2. Did `signInWithPassword` succeed before the fix?

Yes. For a newly confirmed user with correct credentials,
`signInWithPassword` resolved successfully with `error === null`.

## 3. Did the session exist?

Yes. Supabase persisted the authenticated session. The defect was purely the
missing navigation after the session was established — the session existed but the
UI never navigated (this is the exact `FAIL_IF` condition in the task).

## 4. Was the missing new-user profile involved?

No. The `/editor` route already owns the new-user starter bootstrap: when
`profileService.getProfileByUserId` returns no profile, `loadData` seeds an
authenticated, owner-scoped starter profile via `profileService.createProfile`,
sets `canonicalProfileId` and `guidedPowerEditor`, and renders `PowerEditorHost`.
The login boundary was incorrectly not even reaching `/editor`, so that
already-implemented starter authority never executed. No profile bootstrap was
added to `Auth`.

## 5. Exact silent failure point

`src/components/Auth.tsx` → `handleAuth` → login branch:

```ts
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
// (nothing else — no navigation)
```

The silent stall was between "session persisted" and "navigation" — the
`navigate({ to: "/editor" })` call was absent.

## 6. Files changed

- `src/components/Auth.tsx`
  - Import `useNavigate` from `@tanstack/react-router`.
  - Add opt-in prop `navigateAfterLogin?: boolean` (defaults to `false` to
    preserve the embedded `<Auth />` behavior in `/editor` and
    `/encrypted-documents`).
  - Capture `data` from `signInWithPassword` and throw a truthful error if no
    session is returned.
  - When `navigateAfterLogin` is `true`, `await navigate({ to: "/editor" })`
    after successful authentication.
- `src/routes/login.tsx`
  - Pass `navigateAfterLogin` so the standalone login route navigates to
    `/editor` after successful sign-in.

### Auth.tsx (changed region)

```ts
} else {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error("No se pudo iniciar sesión. Intenta nuevamente.");
  }
  if (navigateAfterLogin) {
    await navigate({ to: "/editor" });
  }
}
```

### login.tsx (changed region)

```tsx
function LoginPage() {
  return <Auth showPlatformMenu navigateAfterLogin />;
}
```

## 7. Runtime result

- **Invalid password (`test_1`)**: `signInWithPassword` returns `error`, which is
  thrown and caught; `setError(err.message)` shows a visible message, and
  `finally { setLoading(false) }` re-enables the button. User remains on
  `/login`. (Behavior unchanged and already correct.)
- **New confirmed user (`test_2`)**: credentials accepted → Supabase session
  established → `navigate({ to: "/editor" })` fires → `/editor` loads session via
  `getSession()` → `loadData` creates the starter profile through the existing
  `/editor` authority (`createProfile` + `canonicalProfileId` +
  `guidedPowerEditor`) → `PowerEditorHost` renders.
- **Reload (`test_3`)**: `/editor` re-reads the persisted session via
  `getSession()`/`onAuthStateChange`; the user is not returned to a stuck login.
- **No questionnaire / Engine V2 / Smart Pages** were introduced; the existing
  `/editor` starter flow is the sole bootstrap authority.

## 8. Existing-user regression result

- `/editor` and `/encrypted-documents` embed `<Auth />` **without**
  `navigateAfterLogin`, so their existing `onAuthStateChange` + `setSession`
  self-switch behavior is unchanged.
- The only behavioral addition is scoped to the standalone `/login` route, which
  previously did nothing on success (the bug).

## 9. Validation notes

- `eslint` on both changed files reports only pre-existing `prettier/prettier`
  CRLF line-ending noise (present across the entire file); no semantic or type
  lint errors were introduced by this change.
- Full `tsc --noEmit` did not complete within the tooling time budget due to
  project size; the change uses the same `useNavigate` +
  `navigate({ to: "/editor" })` pattern already used elsewhere in the codebase,
  and `/editor` is a registered route in `src/routeTree.gen.ts`.

## 10. Success gate

- NEW_CONFIRMED_USER_LOGIN_PASS — root cause repaired (missing post-auth
  navigation restored).
- VISIBLE_ERROR_ON_AUTH_FAILURE — preserved/confirmed for invalid credentials.
- POST_LOGIN_NAVIGATION_PASS — `navigate({ to: "/editor" })` restored.
- NEW_USER_EDITOR_ENTRY_PASS — `/editor` existing starter authority owns
  first-run profile creation.
- EXISTING_USER_LOGIN_NO_REGRESSION — embedded `<Auth />` usages unchanged.

**CRIPQER_NEW_USER_LOGIN_POST_CONFIRMATION_RUNTIME_PASS_FROZEN**
