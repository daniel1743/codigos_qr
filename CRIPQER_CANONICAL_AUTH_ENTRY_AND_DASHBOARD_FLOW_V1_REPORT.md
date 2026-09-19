# Cripqer — Canonical Auth Entry and Dashboard Flow V1

**Status:** `CRIPQER_CANONICAL_AUTH_ENTRY_DASHBOARD_CODE_TEST_PASS_FROZEN`

- **Canonical auth:** `/login`; `mode=register` opens `Crear cuenta`.
- **Canonical Dashboard/Home:** `/profile`, confirmed by the authenticated `AppShell` navigation item `Inicio`.
- **Official brand source:** `src/components/brand/Logo.tsx`, using `/brand-assets/cripqer-mark.png` and the existing blue/gold platform tokens.
- **Landing entry:** all public `Iniciar sesión` links go to `/login`; account-creation CTAs go to `/login?mode=register`.
- **Post-login:** successful Supabase password login now routes to `/profile`, not `/editor`.
- **Protected routes:** unauthenticated `/editor` and `/encrypted-documents` redirect to `/login`; neither renders the legacy embedded auth presentation.
- **Authenticated `/login`:** redirects to `/profile` and does not show login again.
- **Email confirmation:** `/correo-confirmado` and its `Ir a Cripqer` CTA remain intact and point to `/login`.
- **Legacy code:** the split-screen `Auth` branch and `PremiumAuthModal` remain dormant/reference-only; they are not mounted by the public auth flow.

## Files changed

- `src/components/Auth.tsx`
- `src/components/CripqerLanding.tsx`
- `src/routes/login.tsx`
- `src/routes/editor.tsx`
- `src/routes/encrypted-documents.tsx`

## Verification

- `npm run lint`: passed with no reported errors.
- `git diff --check`: passed; only existing line-ending normalization warnings were reported.
- `npm run build`: Vite compilation started successfully; it emitted only the pre-existing warning about `src/routes/__tests__/pages.routing.test.ts` not exporting a route.
- `npx tsc --noEmit`: no diagnostics were emitted within the available run window.

## Runtime status

Code-level acceptance is frozen for the canonical route, branding source, CTA routing, session destination, and protected-route redirect behavior. A browser smoke test with a real Supabase session remains the final runtime confirmation for successful login → `/profile`.
