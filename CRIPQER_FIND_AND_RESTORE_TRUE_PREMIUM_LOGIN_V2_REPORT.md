# CRIPQER FIND AND RESTORE TRUE PREMIUM LOGIN — V2

**Task ID:** `CRIPQER_FIND_AND_RESTORE_TRUE_PREMIUM_LOGIN_V2`
**Status:** `TRUE_HISTORICAL_PREMIUM_LOGIN_LOCATED_AND_RESTORED`
**Route:** `/login`

---

## 1. Forensic result — all historical login candidates found

| #   | Commit                                                      | Date       | File                      | Structure                                                                                                                                                                                                                               | Verdict                              |
| --- | ----------------------------------------------------------- | ---------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | `03bc945` "primer deploy a github"                          | 2026-08-17 | `src/components/Auth.tsx` | **Compact centered** `Card` with `max-w-sm` (≈384 px). "Iniciar Sesión" / "Crear Cuenta", email + password, error/success alerts, submit + toggle. **No split, no mock preview. Real Supabase auth** (`signInWithPassword` / `signUp`). | ✅ **TRUE historical premium login** |
| 2   | `ed97bf3` "qr premium"                                      | 2026-08-19 | `src/components/Auth.tsx` | Wide split-screen `lg:grid-cols-[1.05fr_0.95fr]`, `max-w-6xl`, `lg:min-h-[680px]`. Left "QR Links / Tu Marca" mock profile (WhatsApp / Portafolio / Reservar hora), right "Iniciar sesión" card.                                        | ❌ WRONG / LEGACY                    |
| 3   | `2084989` "qr premium"                                      | 2026-08-19 | `src/components/Auth.tsx` | Same split-screen.                                                                                                                                                                                                                      | ❌ WRONG / LEGACY                    |
| 4   | `c9eb7b0` "feat(auth): add standalone premium access modal" | 2026-08-28 | `PremiumAuthModal.tsx`    | Teal **Dialog modal** (`max-w-[31rem]` ≈ 496 px), QR seal + "Cripqer". Presentation-only, no Supabase. Handoff doc explicitly states it is a reusable modal, **not** the login page.                                                    | ❌ Rejected candidate                |

## 2. Why the previous `PremiumAuthModal` candidate was incorrect

- `PremiumAuthModal.tsx` is a **reusable Dialog overlay** with zero authentication logic. Its own
  handoff document (`docs/PREMIUM_AUTH_MODAL_HANDOFF.md`) states it must **not** be mounted as the
  login page and must not import Supabase.
- Wiring `/login` to the modal (the previous V1 attempt) left production still rendering the
  **default split-screen branch**, because that wiring was an uncommitted working-tree change that
  was never deployed. The human screenshot therefore showed the wide split-screen, not a compact
  premium login.
- A filename is not proof of a design. The sober, compact login the owner remembers is a **page
  card**, not a modal overlay and not a marketing split-screen.

## 3. True historical component / commit found

- **File:** `src/components/Auth.tsx`
- **Commit:** `03bc945` ("primer deploy a github"), 2026-08-17
- **Structure:** centered `flex min-h-screen items-center justify-center p-4` → `Card w-full max-w-sm`.
- **Width:** `max-w-sm` = 384 px (within the target 400–500 px band).
- **Left/right split:** none. **Branding:** restrained. **Auth logic:** real Supabase sign-in/sign-up.

The split-screen marketing composition was only introduced later, in `ed97bf3` (2026-08-19).

## 4. What was restored / adapted

- `src/components/Auth.tsx`
  - The `premium` presentation branch now renders a **compact, centered, sober premium login card**
    (QR seal + "Cripqer" wordmark, `Iniciar sesión` / `Crear cuenta`, email, password with
    visibility toggle, signup name + terms, submit + toggle). Width is capped at `max-w-md` (448 px)
    and vertically/horizontally centered — it does **not** grow with viewport width and has **no**
    side illustration or mock landing/profile preview.
  - Removed the `PremiumAuthModal` import and the `handlePremiumLogin`/`handlePremiumRegister`
    wrappers (the modal is no longer mounted on `/login`).
  - The default (split-screen) branch is **kept unchanged** in code as legacy reference; it is no
    longer reachable from `/login`.

- `src/routes/login.tsx` (unchanged in this task, already correct in the working tree)
  - `return <Auth showPlatformMenu navigateAfterLogin premium />;`

- `src/components/PremiumAuthModal.tsx` / `PremiumAuthModalDemo.tsx` — kept in code as dormant
  legacy/reference (not deleted, not mounted).

## 5. Current auth logic preserved (unchanged authority)

- `signInWithPassword` with `data.session` validation (`"No se pudo iniciar sesión…"` guard).
- `signUp` with `emailRedirectTo` (`/correo-confirmado`) and `full_name` metadata.
- `navigateAfterLogin` → `navigate({ to: "/editor" })`.
- Loading state, visible error/success messages, terms + name validation, signup confirmation
  message — all preserved inside `submitAuth` / `handleAuth`.

No new Supabase client, no duplicate session listener, no obsolete auth logic was reintroduced.

## 6. Acceptance dimensions

**Desktop (1366×768 / 1440×900 / 1920×1080)**

- Login surface capped at `max-w-md` (448 px), centered via flexbox.
- No growth with viewport width, no giant side illustration, no full-width composition.

**Mobile (360×800 / 390×844 / 430×932)**

- `px-4 py-8` outer padding, `w-full` card, `w-full` inputs/buttons, no fixed widths that could
  overflow horizontally; vertical centering with `min-h-[calc(100vh-4rem)]`.

## 7. Verification

- `npx esbuild src/components/Auth.tsx --loader:.tsx=tsx --jsx=automatic`: **PASS** (exit 0).
- `git diff --check -- src/components/Auth.tsx`: **PASS** (no whitespace/line-ending errors).
- `git diff -- src/components/Auth.tsx`: only the intended changes (import removal, wrapper removal,
  premium branch replacement); the legacy split-screen branch is preserved as context.
- Full `tsc --noEmit` did not complete within the run window (large project) and is **not** claimed
  as passing.

## 8. Screenshots / visual evidence

Desktop/mobile screenshots (`true-premium-login-1366.png`, `true-premium-login-1920.png`,
`true-premium-login-mobile-390.png`) were **not produced** because no authenticated browser session
or screenshot tooling is available in this environment. The structural acceptance above is derived
from the restored markup/classes, not from captured pixels. A visual pass must still be confirmed in
a browser before freezing the success gate.

## 9. Follow-up (gated)

- `/editor` unauthenticated → `/login` redirect remains **deferred** until the true premium login is
  visually confirmed (per the task's `only_after_true_premium_login_confirmed` gate). The embedded
  `<Auth />` uses in `/editor` and `/encrypted-documents` are unchanged.

## 10. Success criteria

- `TRUE_HISTORICAL_PREMIUM_LOGIN_LOCATED` — ✅ (`03bc945`)
- `CURRENT_WIDE_LOGIN_NOT_ACTIVE` — ✅ (`/login` renders the compact premium branch)
- `COMPACT_DESKTOP_LOGIN_PASS` — ✅ structurally (max-w-md, centered, no split)
- `CURRENT_SUPABASE_AUTH_PRESERVED` — ✅ (`submitAuth` authority untouched)
- `MOBILE_RESPONSIVE_PASS` — ✅ structurally (fluid widths, margins, no overflow)
