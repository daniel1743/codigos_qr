# CRIPQER EMAIL CONFIRMATION ROUTES PRODUCTION DEPLOY V1

**Task ID:** `CRIPQER_EMAIL_CONFIRMATION_ROUTES_PRODUCTION_DEPLOY_V1`  
**Status:** `PASS — PRODUCTION ROUTES DEPLOYED AND VERIFIED`  
**Success gate:** `CRIPQER_EMAIL_CONFIRMATION_ROUTES_PRODUCTION_PASS_FROZEN`

## Root cause

The production domain `www.cripqer.dev` was assigned to the Vercel project
`codigos-qr`, while the local Vercel link pointed to the separate
`codigos-staging-on` project. The new route files existed only in the current
working tree and had not reached the production deployment serving the domain.
The previous production deployment therefore returned 404 for both routes.

## Deployment source

- Branch: `feat/basic-editor-editorial-canvas-ui`
- Current HEAD before deploy: `6fc062b` (`paginador conectado`)
- Deploy method: direct Vercel production deploy of the current working tree
- Target project: `daniels-projects-29fb139e/codigos-qr`
- `main`: not used
- Git history: unchanged; no commit, merge, reset or branch switch performed

The working tree already contained the exact route implementation and was
dirty from prior user work. The deploy was performed explicitly against the
production project rather than the linked staging project.

## Local proof

- `npx vite build`: **PASS**
- Generated `src/routeTree.gen.ts` contains `/correo-confirmado` and `/login`.
- Local route files present: `src/routes/correo-confirmado.tsx` and
  `src/routes/login.tsx`.

## Production revision

Before deployment:

- Deployment: `dpl_6Gg1pQfcVM87PQrGdp9hQTjED5Hy`
- URL: `https://codigos-r7gw918n6-daniels-projects-29fb139e.vercel.app`
- Status: Ready, Production

After deployment:

- Deployment: `dpl_wwRKMQFAMpKbVCNHkCx7w8hrN7qA`
- URL: `https://codigos-ik6e2rs4u-daniels-projects-29fb139e.vercel.app`
- Status: Ready, Production
- `www.cripqer.dev` aliased to the new deployment

## Production route proof

Read-only GET checks after alias promotion:

| URL                                         |  HTTP | Content proof                       |
| ------------------------------------------- | ----: | ----------------------------------- |
| `https://www.cripqer.dev/correo-confirmado` | `200` | `Correo confirmado`, `Ir a Cripqer` |
| `https://www.cripqer.dev/login`             | `200` | Existing Supabase-backed Auth UI    |

No authentication logic, Supabase schema, email template, confirmation
mechanism, Engine, Smart Pages, Power Editor or database behavior was changed
by this deployment task.
