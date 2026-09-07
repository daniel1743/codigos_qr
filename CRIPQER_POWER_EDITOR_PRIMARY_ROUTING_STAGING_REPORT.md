# CRIPQER — Power Editor Primary Routing Staging Report

Date: 2026-09-06  
Target project: `codigos-staging-on`  
Alias: `https://codigos-staging-on.vercel.app`

## Deployment gate

- Local commit: `db3fc7d4bca115cdcd50ff5b1ae76a3878308f70`
- Remote commit: `db3fc7d4bca115cdcd50ff5b1ae76a3878308f70`
- Staging deployed commit: `db3fc7d4bca115cdcd50ff5b1ae76a3878308f70` (deployed from the exact matching local/remote HEAD)
- Vercel deployment: `dpl_DsQvbtYxtrELipi9F9m7ZFAQGFMp`
- Deployment URL: `https://codigos-staging-dhxeqdwnl-daniels-projects-29fb139e.vercel.app`
- Deployment status: `READY`, target `production`
- Alias target verified: YES — Vercel inspect lists `codigos-staging-on.vercel.app` on this deployment; the alias returned `HTTP 200 OK`.
- Required staging environment variables present: YES — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENABLE_ONBOARDING_V2` are configured for Production. Values were not exposed.

## Runtime verification

The authenticated runtime flows could not be executed. Opening the staging
`/editor` entry in the available browser session showed the staging login page
(`Iniciar sesión`); no authorized staging test account or repository test
harness credentials were available. No credentials were guessed, reused, or
entered.

- New Engine V2 user → Power Editor: FAIL — not executable without an authorized staging account; no runtime PASS asserted.
- Legacy Basic user → Basic Editor: FAIL — not executable without an authorized staging account; no runtime PASS asserted.
- Existing canonical user → Power Editor: FAIL — not executable without an authorized staging account; no runtime PASS asserted.
- Duplicate profile created: NO — no authenticated flow was executed and no mutation was attempted.
- Automatic legacy migration: NO — no authenticated flow was executed and no mutation was attempted.
- Canonical data preserved: FAIL — could not capture before/after authenticated records.
- Legacy data preserved: FAIL — could not capture before/after authenticated records.
- Redirect loop detected: NO — no loop appeared on the unauthenticated staging entry; authenticated route-loop verification remains incomplete.

## Runtime checks

| Check | Result |
|---|---|
| New Power Editor loaded | NOT RUN — authentication required |
| New profile id preserved | NOT RUN — authentication required |
| New canonical config visible | NOT RUN — authentication required |
| Legacy Basic Editor loaded | NOT RUN — authentication required |
| Legacy visual page unchanged | NOT RUN — authentication required |
| Existing canonical Power Editor loaded | NOT RUN — authentication required |
| Existing canonical profile id preserved | NOT RUN — authentication required |
| Authenticated redirect loop | NOT RUN — authentication required |

## Final gate

`POWER_EDITOR_PRIMARY_ROUTING_STAGING: FAIL`

Deployment and alias promotion are verified. The routing runtime gate remains
unpassed because the required authenticated new-user, legacy-user, and existing
canonical-user staging flows could not be run. No application code, editor UX,
schema, profile, or page data was modified by this validation.

