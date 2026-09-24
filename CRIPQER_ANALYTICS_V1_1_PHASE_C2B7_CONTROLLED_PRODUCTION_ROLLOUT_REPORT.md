# CRIPQER Intelligent Analytics V1.1 — C2B7 Controlled Production Rollout Report

## Status: STOPPED (STOP_C2B7) — clean dev hydration still fails

Per the C2B7 hard gates, the rollout was halted at **Gate 2** before any
production SQL, tracking activation, or QR-generation change was made.

---

## 1. HEAD / Worktree Deploy Scope (Gate 1 — PASS/ISOLATABLE)
- HEAD: `ec2b68247e89a8b51579536710b74fe53f7c6dca`
- Branch: `feat/basic-editor-editorial-canvas-ui`
- Dirty worktree = **unrelated** "magic page editor / fuxion assistant" work:
  - `src/components/app-shell/AppShell.tsx`, `MobilePlatformNav.tsx`
  - `src/features/magic-page-editor-production/MagicProductionEditorHost.tsx`
  - `src/isolated/magic-page-editor/**`
  - `src/routes/account.tsx`, `page.tsx`, new `src/components/fuxion-assistant/`,
    `src/lib/editor-routing/resolveCanonicalMagicPage.ts`,
    `src/routes/pages.$pageId.fuxion-demo.tsx`, submodule `PROYECTO PARA INTEGRA A QR`
- Analytics V1.1 code (components, `src/lib/billing/analytics-entitlement-server.ts`)
  and its migrations are **committed / clean** (not in the dirty list).
- Conclusion: Analytics V1.1 migrations are applied via Supabase CLI directly to a
  target project and are **isolatable** from the dirty app-code worktree. No `git reset`,
  `git clean`, or discard of user work was performed.

## 2. Clean Dev Interactive Smoke (Gate 2 — FAIL → STOP)
Procedure followed: stopped stale Vite processes, cleared `node_modules/.vite`,
started a clean `vite dev` (no `--force`), warmed the route, then exercised the
required interactions in a real headless Chromium browser.

SSR renders correctly (the dashboard HTML is present), but **client hydration
attaches no event handlers**. Every required interaction failed with zero JS
errors and zero failed network requests:

| Interaction | Before | After | Result |
|---|---|---|---|
| Date/range ("7 days" period button) | aria-pressed=false | aria-pressed=false | FAIL |
| Plan-gated channel chip (Instagram) | aria-pressed=false | aria-pressed=false | FAIL |
| Notification Center bell | aria-expanded=false, panel=0 | aria-expanded=false, panel=0 | FAIL |
| Smart Toast dismiss | 2 toasts | 2 toasts | FAIL |

### Root-cause scope: GLOBAL, not Analytics-specific
A second probe on the **unrelated** `/login` page confirmed the failure is app-wide:
the "show password" toggle (`onClick={() => setShowPassword(!showPassword)}`)
did not flip `input[type=password]` → `input[type=text]` (`TOGGLE_WORKED=false`).

Diagnostics: `window.__vite_plugin_react_preamble_installed__ === true` (client
entry preamble runs), React refresh hooks present, `FAILED=[]` (no 4xx/5xx, no
console errors, no page errors). The TanStack Start client entry runs its
preamble but `hydrateRoot` never takes effect — consistent with a tooling defect
in the dev transform pipeline (the Vite log reports `@lovable.dev/vite-tanstack-config`
setting both esbuild and oxc options: "oxc options will be used and esbuild options
will be ignored").

## 3. Production Migration Inventory (Gate 3 — files verified; DB state NOT checked)
All 7 expected migration files exist physically and were reviewed:
- `20260922000000_analytics_v1_1_event_context.sql` — additive columns + event-type CHECK widening
- `20260922000001_canonical_analytics_write_boundary.sql` — `track_analytics_event` (11-arg) + `platform`
- `20260922000002_analytics_v1_1_device_context.sql` — 12-arg RPC + `device_type`
- `20260922000003_qr_scan_boundary.sql` — 13-arg RPC + `qr_scan`/`qr_id`
- `20260923000000_c2b5_harden_analytics_insert_policy.sql`
- `20260923000001_c2b5_harden_legacy_rpc_search_path.sql`
- `20260923000002_c2b5_harden_analytics_read_views.sql`

These are additive/evolutionary with documented rollback comments. QA-applied vs
production-not-applied DB state was **not** verified because the rollout stopped
at Gate 2 before any DB access.

## 4. Production — UNTOUCHED
- `PRODUCTION SQL EXECUTED: false`
- `PRODUCTION DATA MODIFIED: false`
- `tracking activation changed: false`
- Production project ref `mlinfiuhkxdhlveflbkj` was not read from or written to.

## 5. STOP Decision
`STOP_C2B7` — stop condition "clean dev hydration still fails" is satisfied.
No migrations were applied, no feature gate was enabled, no canary page was
activated, and no QR or dashboard canary was run.

## 6. Recommendation to unblock
Resolve the global client-hydration failure in the DEV transform pipeline before
retrying C2B7. Likely candidates (to be investigated in a tooling-only pass, not
this rollout):
1. The `@lovable.dev/vite-tanstack-config` dual esbuild/oxc option conflict.
2. TanStack Start client entry / `hydrateRoot` invocation under Vite 8 (Rolldown/oxc).
3. React 19.2 + `@tanstack/react-start` 1.168 hydration compatibility in dev.

## 7. ANALYTICS V1.1 RELEASE STATUS
`NOT_RELEASED` — blocked on Gate 2 (dev hydration), no production changes made.
