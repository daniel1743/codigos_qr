# CRIPQER — SUPABASE DEPLOYMENT LEDGER

> **Task:** `C3B_REMOTE_TARGET_FREEZE`
> **Mode:** `READ_ONLY` (no DDL, no writes, no `db push`, no `migration up`, no env change, no re-link, no password reset)
> **Date:** 2026-09-27
> **Scope:** identify and freeze the single canonical remote Supabase base (SUPERMASTER) for CRIPQER, and freeze the QA project.
> **Stop condition honoured:** inventory only. **C3B was NOT applied to any remote project.**

| Result token | Value | Scope of the claim |
| --- | --- | --- |
| `CRIPQER_SUPERMASTER_TARGET_CONFIRMED` | **RAISED** | The SUPERMASTER project is identified unambiguously (name + ref + URL + plan + linked ref + migration history + public inventory). |
| `CRIPQER_SUPABASE_ENVIRONMENT_DRIFT` | **RAISED (co-finding)** | The *schema state* of both projects is not fully reproducible from their recorded migration history, and QA contains objects from a foreign lineage. The target identity is unaffected; see §8-B, §9. |
| `CRIPQER_SUPERMASTER_TARGET_UNVERIFIABLE` | not raised | Every required field was collected with live, read-only evidence. |

---

## 0. Canonical rule (frozen by this ledger)

1. **SUPERMASTER = the only canonical remote base of CRIPQER.** All future remote migrations target SUPERMASTER, and only after the preflight guard of §11 passes.
2. **QA is FROZEN. DO NOT DEPLOY.** No DDL, no seeding, no migration, no `db push`, ever, until this ledger is superseded by an explicit, written decision.
3. **C3B is NOT APPLIED REMOTELY** — not in SUPERMASTER, not in QA. It exists only as a local file on a branch.
4. Any future remote operation must first print and verify every preflight field of §11 and must abort on any of the abort conditions listed there.

---

## 1. Environment registry (live evidence)

Organization: **`daniel.org`** — id/slug `gvrxqgvvrbafsxatlmev` — **plan: `pro`**
(verified read-only: `GET https://api.supabase.com/v1/organizations/gvrxqgvvrbafsxatlmev` → `{"name":"daniel.org","plan":"pro"}`; the Supabase CLI 2.62.10 does **not** expose the plan field, hence the Management API GET.)

| Role | Visible project name (exact) | project_ref | Supabase URL | Region | Status | Linked by a worktree |
| --- | --- | --- | --- | --- | --- | --- |
| **SUPERMASTER (canonical)** | `codigos qr` | `mlinfiuhkxdhlveflbkj` | `https://mlinfiuhkxdhlveflbkj.supabase.co` | `us-east-2` | `ACTIVE_HEALTHY` | **YES** (main worktree + C3B worktree) |
| **QA (FROZEN)** | `cripqer-qa` | `tjigzcyoogmvdkivypym` | `https://tjigzcyoogmvdkivypym.supabase.co` | `us-east-1` | `ACTIVE_HEALTHY` | no |
| not CRIPQER (excluded) | `chat de mascotas y` | `ybvhmbokwobvcrwffwyt` | — | `us-west-2` | `ACTIVE_HEALTHY` | no |
| not CRIPQER (excluded) | `chactivo` | `uvggszuvxdrdbaaedqyr` | — | `us-east-2` | `ACTIVE_HEALTHY` | no |
| other organization (excluded) | `tuvuni-qa` | `umceslhseueuqozemuel` | — | `us-west-2` | `ACTIVE_HEALTHY` | no (org `ulghgulxktbtoipdewyn`) |

Why the exclusions are safe: only two projects in the organization carry the CRIPQER lineage, and of those only one is declared as production and is linked by every CRIPQER worktree (`supabase projects list` → `linked: true` for `mlinfiuhkxdhlveflbkj` only).

---

## 2. SUPERMASTER identity — verified fields

| Field | Verified value | Evidence source |
| --- | --- | --- |
| Visible project name | **`codigos qr`** (exact string, lower-case, single space) | ① `supabase projects list` ② `supabase/.temp/linked-project.json` ③ `GET /v1/projects/mlinfiuhkxdhlveflbkj` |
| project_ref | **`mlinfiuhkxdhlveflbkj`** | same three sources |
| Supabase URL | **`https://mlinfiuhkxdhlveflbkj.supabase.co`** (REST: `…/rest/v1/`) | `.env.local`, `.env.qa` (`PRODUCTION_PROJECT_REF`), live REST probes |
| Database host / engine | `db.mlinfiuhkxdhlveflbkj.supabase.co` · Postgres **17.6.1.155** · channel `ga` | `supabase projects list` |
| Plan (current) | **`pro`** (organization-level plan of `daniel.org`) | `GET /v1/organizations/gvrxqgvvrbafsxatlmev` |
| Project origin | created `2026-08-17T20:47:35Z`; organization `gvrxqgvvrbafsxatlmev` | `supabase projects list` |
| Repo currently linked to | **`mlinfiuhkxdhlveflbkj`** (this is SUPERMASTER) | `supabase/.temp/linked-project.json` + `project-ref` + `pooler-url` |
| Declared production ref | `PRODUCTION_PROJECT_REF=mlinfiuhkxdhlveflbkj` | `.env.qa` |
| C3B target matrix | SUPERMASTER = production = **FORBIDDEN**; QA = `tjigzcyoogmvdkivypym` | `C3B_BASELINE_REPORT.md` §4 |

Cross-check: the working environment used by the app code (`.env.local`) resolves to `https://mlinfiuhkxdhlveflbkj.supabase.co`, i.e. the same project that is linked and declared as production. **No ambiguity: SUPERMASTER = `codigos qr` / `mlinfiuhkxdhlveflbkj`.**

## 3. Repository ↔ project linkage (all worktrees)

| Worktree | Branch @ SHA | `supabase/.temp/linked-project.json` ref | Linked project |
| --- | --- | --- | --- |
| `…\generador de QR` (main) | `feat/basic-editor-editorial-canvas-ui` @ `d5248da` | `mlinfiuhkxdhlveflbkj` | **SUPERMASTER** |
| `…\generador de QR - business-core-c3b` | `feat/business-core-c3b-foundation` @ `c819976` | `mlinfiuhkxdhlveflbkj` | **SUPERMASTER** |

> ⚠ **Hazard (must remain in force):** the C3B worktree — whose migration header says `CRIPQER — C3B · BUSINESS CORE FOUNDATION (QA ONLY)` — is linked to **SUPERMASTER**, i.e. to production, **not** to QA. Any `supabase db push` executed in that folder would push DDL **into production**. This is abort condition A2 of §11.

No worktree on this machine has QA (`tjigzcyoogmvdkivypym`) linked. QA was historically reached only through explicit `--db-url` scripts; its stored credential is now stale (see §9).

---

## 4. Migration history — actual (not assumed)

### 4.1 SUPERMASTER remote history (authoritative, read from `supabase_migrations.schema_migrations`)

**15 recorded rows. CURRENT_REMOTE_LAST_MIGRATION = `20260923000002`.**

```
20260914000000  20260915000000  20260916000000  20260917000000  20260918000000
20260919000000  20260920000000  20260921000000  20260922000000  20260922000001
20260922000002  20260922000003  20260923000000  20260923000001  20260923000002
```

Cross-verified twice: (a) `supabase migration list --linked` (Remote column filled for exactly these 15 versions), and (b) `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version` (15 rows).

### 4.2 Local repository files vs remote

| Local file | Tracked in git | Recorded in SUPERMASTER | State |
| --- | --- | --- | --- |
| `20260914000000_cripqer_production_baseline.sql` … `20260923000002_c2b5_harden_analytics_read_views.sql` | yes | yes (15) | in sync |
| `20260924000000_permanent_public_identity_contract.sql` | **no (untracked)** | no | pending |
| `20260924000000_premium_redeem_codes.sql` | yes (`dd64c79`) | **no (unrecorded) — but its effects already exist in SUPERMASTER** | pending / drift, see §8-B |
| `20260924000001_legacy_profile_magic_bridge.sql` | **no (untracked)** | no | pending |
| `20260925000000_business_core_foundation.sql` (C3B) | **not in the main worktree** — lives on branch `feat/business-core-c3b-foundation`, commit `287734f` | **no** | **NOT APPLIED ANYWHERE — DO NOT APPLY YET** |

C3B migration integrity anchor:
`…\generador de QR - business-core-c3b\supabase\migrations\20260925000000_business_core_foundation.sql`
size `48095` bytes (1033 lines) · `SHA-256 = C1851A0AC6A8544CF27C9C8C8841CF890FD681E04DB62CEFAD9AC2E0495096C8`

> Because the C3B worktree was branched from `d267134` (`origin/feat/basic-editor-editorial-canvas-ui` at that time), it does **not** contain the three `20260924*` files that exist in the main worktree, and the main worktree does not contain the C3B file. Ordering of the next push must therefore be built from **one** worktree, with all four files present, never by mixing folders.

---

## 5. Public inventory — SUPERMASTER (live catalog, exact)

Read with a `SELECT`-only catalog query (no DDL): `information_schema.tables` + `pg_proc` + `pg_class`.

- **22 relations in `public`: 20 base tables + 2 views.**
- **28 functions in `public`.**

**Base tables (20):** `admin_users`, `billing_checkouts`, `billing_customers`, `billing_events`, `billing_subscriptions`, `demo_logos`, `document_access_logs`, `encrypted_documents`, `invitation_codes`, `pages`, `power_editor_projects`, `power_editor_template_blueprints`, `power_editor_template_generation_runs`, `power_editor_templates`, `premium_users`, `profile_links`, `profiles`, `qr_analytics`, `qr_visual_versions`, `template_bank`

**Views (2):** `qr_analytics_daily`, `qr_top_links` (both `security_invoker=true`)

**Functions (28):** `check_is_super_admin(p_user_id uuid)`, `claim_billing_event(p_provider text, p_event_id text)`, `claim_encrypted_document_download(p_short_url text)`, `decrement_document_downloads(p_document_id uuid)`, `generate_invitation_code()`, `generate_profile_public_id()`, `get_encrypted_document_delivery_secret(p_short_url text)`, `get_encrypted_document_metadata(p_short_url text)`, `get_public_page_by_public_id(p_public_id text)`, `get_public_page_by_slug(p_slug text)`, `increment_document_downloads(p_document_id uuid)`, `increment_scan_count(p_id uuid)`, `log_document_access(p_document_id uuid, p_success boolean, p_user_agent text)`, `patch_profile_basic_template_config(p_profile_id uuid, p_patch jsonb)`, `power_editor_set_updated_at()`, `prevent_profile_public_id_change()`, `publish_profile_canonical_snapshot(p_profile_id uuid, p_editor_config jsonb)`, `redeem_invitation_code(p_code text, p_user_id uuid, p_email text)`, `redeem_invitation_code_secure(p_code text)`, `set_profile_canonical_editor_config(p_profile_id uuid, p_editor_config jsonb)`, `set_updated_at()`, `track_analytics_event(…13 args…)`, `track_child_page_event(…8 args…)`, `track_link_click(…13 args…)`, `track_page_view(…13 args…)`, `update_demo_logos_updated_at()`, `update_template_bank_updated_at()`, `validate_template_state_transition()`

Live size/row anchors (`supabase inspect db table-stats --linked`, read-only): `power_editor_projects` 2968 kB (2 rows) · `template_bank` 1056 kB (249) · `pages` 576 kB (35) · `profiles` 392 kB (17) · `qr_analytics` 176 kB (29) · `demo_logos` (75) · `profile_links` (27) · `invitation_codes` (10) · `encrypted_documents` (4) · `premium_users` (1) · `admin_users` (1).

## 6. C3B objects do NOT exist in SUPERMASTER (nor in QA) — 5 independent probes

Target set — tables: `organizations`, `contacts`, `contact_identities`, `contact_consents`, `leads`, `activities`, `attributions`, `outcomes`; functions: `current_organization_ids`, `resolve_contact`, `create_lead_for_contact`, `record_business_activity`, `record_outcome`.

| Probe (read-only) | SUPERMASTER result | QA result |
| --- | --- | --- |
| 1. REST `GET /rest/v1/<table>?select=*&limit=0` (service_role) | **HTTP 404** for all 8 tables | **HTTP 404** for all 8 tables |
| 2. PostgREST OpenAPI root `GET /rest/v1/` → path list | no `/organizations … /outcomes`, no `/rpc/<c3b fn>` (45 paths total) | no C3B path (48 paths total) |
| 3. `supabase gen types typescript --linked` | **0** occurrences of any of the 8 tables / 5 functions | n/a (QA not linked; see 4) |
| 4. Catalog `SELECT … FROM information_schema.tables / pg_proc` | **0 rows / 0 rows** | **0 rows / 0 rows** |
| 5. `supabase_migrations.schema_migrations` | `20260925000000` absent | `20260925000000` absent |

Additional guard: `activities.analytics_event_id` will reference `public.qr_analytics(id)`, so C3B must not and does not alter that table (declared in the migration header, lines 18–26).

---

## 7. Analytics V1.1 exists and remains intact in SUPERMASTER

| Analytics V1.1 anchor | Expected | SUPERMASTER (live) |
| --- | --- | --- |
| `public.qr_analytics` columns added by V1.1 (`qr_id`, `device_type`, `platform`) | present | **present** (`qr_id`, `device_type`, `platform`) |
| Canonical write boundary `public.track_analytics_event(...13 args...)` (incl. `p_qr_id`, `p_device_type`) | present | **present** (13-arg signature) |
| Read views `qr_analytics_daily`, `qr_top_links` hardened with `security_invoker=true` (`20260923000002`) | present | **present** (`reloptions = security_invoker=true` on both) |
| Insert hardening (`20260923000000`) → RPC-only writes: only SELECT policies on `qr_analytics` | present | **present** — policies are exactly `Admin can read all analytics [SELECT]` and `Users can read their own analytics [SELECT]`; **no INSERT policy** |
| Existing analytics data preserved | non-zero | `qr_analytics` **29 rows**, `qr_analytics_daily` 14 rows, `qr_top_links` 0 rows (view) |

Conclusion: Analytics V1.1 is live, hardened and intact in SUPERMASTER, and C3B is documented as strictly additive (it does not touch `qr_analytics`, the analytics RPCs, the analytics feature gate or `src/lib/analytics/**`).

## 8. Exact current schema difference

### 8-A. SUPERMASTER *now* → SUPERMASTER *after C3B* (the intended, purely additive delta)

Nothing existing is altered; every object below is new and namespaced to the Business Core.

| Kind | Count | Exact objects |
| --- | --- | --- |
| Tables | **+8** | `organizations`, `contacts`, `contact_identities`, `contact_consents`, `leads`, `activities`, `attributions`, `outcomes` |
| Helper function | **+1** | `public.current_organization_ids()` |
| RPCs | **+4** | `resolve_contact(uuid,text,text,text,text)`, `create_lead_for_contact(uuid,uuid,text,text,uuid,text,text)`, `record_business_activity(uuid,uuid,uuid,text,text,uuid,timestamptz,jsonb)`, `record_outcome(uuid,uuid,text,timestamptz,numeric,text,jsonb)` |
| Indexes | **+18** (16 `CREATE INDEX` + 2 `CREATE UNIQUE INDEX`) | `contacts_organization_id_idx`, `contacts_organization_last_seen_idx`, `contact_identities_contact_idx`, `contact_consents_contact_idx`, `leads_organization_status_idx`, `leads_contact_idx`, `leads_page_idx`, `activities_organization_occurred_idx`, `activities_contact_idx`, `activities_lead_idx`, `activities_analytics_event_idx`, `attributions_lead_first_touch_key` (unique), `attributions_lead_last_touch_key` (unique), `attributions_organization_idx`, `attributions_contact_idx`, `outcomes_organization_occurred_idx`, `outcomes_lead_idx`, `outcomes_type_idx` |
| RLS | **8 ×** `ENABLE ROW LEVEL SECURITY` | on the 8 new tables |
| Policies | **+8** | `business_core_<table>_select_own` (SELECT only). **0 anon policies.** |
| Grants | **+21** | `SELECT` on the 8 tables → `authenticated` (8); `ALL` on the 8 tables → `service_role` (8); `EXECUTE` on the 5 functions → `authenticated` (5) |
| Triggers | **+0** | none declared |
| Foreign keys into existing objects | **+3 (read-only references)** | `organizations.owner_user_id → auth.users(id)`; `leads.page_id → public.pages(id)`; `activities.analytics_event_id → public.qr_analytics(id)` |

New relation totals after C3B (expected): **30 relations** (28 base tables + 2 views) and **33 functions** in `public`.

### 8-B. SUPERMASTER vs QA — measured drift (co-finding `CRIPQER_SUPABASE_ENVIRONMENT_DRIFT`)

| Aspect | SUPERMASTER `mlinfiuhkxdhlveflbkj` | QA `tjigzcyoogmvdkivypym` |
| --- | --- | --- |
| `public` relations | 22 (20 tables + 2 views) | 25 (23 tables + 2 views) |
| `public` functions | 28 | 31 |
| Recorded migrations | **15** (last `20260923000002`) | **9** (last `20260922000000`) |
| Objects only in QA (foreign lineage — defined by **no** CRIPQER migration in any of the 10 worktrees on this machine, and by no commit in `--all` history) | — | tables `user_profiles`, `auth_identity_links`; view `visible_profiles` (**without** `security_invoker`); functions `handle_new_user()`, `username_is_taken(p_username text)`, `set_profiles_updated_at()`, `prevent_profile_privilege_escalation()` |
| Objects only in SUPERMASTER | `redeem_invitation_code_secure(p_code text)` | — |
| Unrecorded DDL (schema ⊃ migration history) | **yes** — `redeem_invitation_code_secure` exists and `invitation_codes` already holds the 10 `CQ-LT-*` / `CQ-1Y-*` seed rows, while `20260924000000` has **no** row in `schema_migrations`; the function was never part of the baseline in any commit (`git log --all -S` → empty) | **yes** — QA carries the effects of `20260922000001…20260923000002` (13-arg `track_analytics_event`, `security_invoker=true` views) although its history stops at `20260922000000` |
| Analytics V1.1 anchors | present + hardened | present + hardened |
| Business Core (C3B) | absent | absent |

**Interpretation.** The *identity* of SUPERMASTER is unambiguous and verified (§2), but neither environment can currently be rebuilt "migrations-only". Consequence for planning, not for the freeze: the first future push to SUPERMASTER must first reconcile the `20260924*` block (idempotent by construction: `CREATE OR REPLACE FUNCTION`, `ADD COLUMN IF NOT EXISTS`, count-guarded seed `DO` block) and must be executed as an explicit, reviewed step — never as a blind `db push`.

---

## 9. QA — FROZEN / DO NOT DEPLOY

| Item | State |
| --- | --- |
| project_ref / name | `tjigzcyoogmvdkivypym` / `cripqer-qa` (region `us-east-1`, created `2026-09-22T22:42:53Z`) |
| Status | **FROZEN** |
| `business_core_applied` | **false** (5 probes, §6) |
| `future_remote_migrations` | **FORBIDDEN** |
| Linked by any worktree | **no** — and must never be linked |
| DB credential `.env.qa` → `SUPABASE_DB_PASSWORD` | **STALE** — direct connection returns `FATAL: password authentication failed for user "postgres"` (SQLSTATE `28P01`); this task **did not** reset it and must not |
| Read access used in this audit | Management API `SELECT`-only catalog queries + REST/anon & service_role reads. No DDL, no writes. |
| Do-not list | `supabase link --project-ref tjigzcyoogmvdkivypym` · `db push` · `migration up` · password reset · any seeding |

## 10. Next migration intended for SUPERMASTER (plan of record — NOT executed)

Ordering must respect the version filenames, and all files must come from a single worktree.

| Order | Version | File | Remote state | Note |
| --- | --- | --- | --- | --- |
| 1 | `20260924000000` | `permanent_public_identity_contract.sql` | not applied | untracked — must be committed before any push review |
| 2 | `20260924000000` | `premium_redeem_codes.sql` | **partially applied out-of-band** | function + seed already present; re-apply is idempotent (`CREATE OR REPLACE` + count-guarded seed `DO` block) |
| 3 | `20260924000001` | `legacy_profile_magic_bridge.sql` | not applied | untracked — must be committed before any push review |
| 4 | `20260925000000` | `business_core_foundation.sql` (**C3B**) | **not applied anywhere** | **DO NOT APPLY YET.** Authorized only after the §11 preflight passes **and** after the `20260924*` block is reconciled |

> The C3B migration is entitled "(QA ONLY)" and its header declares `Production -> mlinfiuhkxdhlveflbkj (FORBIDDEN)`. That line is now **superseded for targeting purposes only by this ledger** (SUPERMASTER is the single canonical base), yet it must be **rewritten in the file** (header + any internal guard) **before** the file is ever executed against SUPERMASTER. Until that rewrite is reviewed, the file remains untouchable for remote execution.

---

## 11. Future guard — mandatory preflight before ANY remote migration

Print and verify, in this order, and keep the output in the report of that future task:

```text
TARGET_PROJECT_NAME           # must be exactly: codigos qr
TARGET_PROJECT_REF            # must be exactly: mlinfiuhkxdhlveflbkj
MIGRATION_FILE                # absolute path + SHA-256 (C3B: 48095 bytes / C1851A0A…096C8)
CURRENT_REMOTE_LAST_MIGRATION # must be exactly: 20260923000002 (re-verify; must match this ledger)
EXPECTED_OBJECTS_BEFORE       # 22 relations (20 tables + 2 views) / 28 functions / 0 Business Core objects
EXPECTED_OBJECTS_AFTER        # 30 relations (28 tables + 2 views) / 33 functions / +8 tables, +5 functions
```

Read-only preflight (PowerShell — no DDL, no writes):

```powershell
$EXPECTED_NAME  = 'codigos qr'
$EXPECTED_REF   = 'mlinfiuhkxdhlveflbkj'
$QA_REF         = 'tjigzcyoogmvdkivypym'
$EXPECTED_LAST  = '20260923000002'
$MIGRATION_FILE = '<absolute path of the migration to be applied>'

$linked = Get-Content '.\supabase\.temp\linked-project.json' -Raw | ConvertFrom-Json
"TARGET_PROJECT_NAME   = $($linked.name)"
"TARGET_PROJECT_REF    = $($linked.ref)"
"MIGRATION_FILE        = $MIGRATION_FILE"
"MIGRATION_SHA256      = $((Get-FileHash $MIGRATION_FILE -Algorithm SHA256).Hash)"
supabase migration list --linked   # CURRENT_REMOTE_LAST_MIGRATION — assert the last Remote row reads 20260923000002

# EXPECTED_OBJECTS_BEFORE (read-only REST): all 8 Business Core tables must answer HTTP 404
$svc = (Get-Content '.\.env.local' | Where-Object { $_ -match '^SUPABASE_SERVICE_ROLE_KEY=' }) -replace '^SUPABASE_SERVICE_ROLE_KEY=',''
foreach ($t in 'organizations','contacts','contact_identities','contact_consents','leads','activities','attributions','outcomes') {
  $code = try { (Invoke-WebRequest "https://$EXPECTED_REF.supabase.co/rest/v1/$t?select=*`&limit=0" -Headers @{ apikey=$svc; Authorization="Bearer $svc" } -ErrorAction Stop).StatusCode } catch { [int]$_.Exception.Response.StatusCode }
  "BEFORE $t -> HTTP $code (expect 404)"
}

if ($linked.ref -eq $QA_REF) { throw 'ABORT A1: target == QA (FROZEN / DO NOT DEPLOY)' }
if ([string]::IsNullOrWhiteSpace($linked.ref)) { throw 'ABORT A4: project_ref is ambiguous (absent)' }
if ($linked.ref -ne $EXPECTED_REF -or $linked.name -ne $EXPECTED_NAME) { throw 'ABORT A2: linked project differs from this ledger' }
```

**Abort conditions (any one ⇒ stop, do not execute, report):**

| # | Condition |
| --- | --- |
| A1 | target resolves to QA `tjigzcyoogmvdkivypym` |
| A2 | linked ref/name differs from this ledger (`mlinfiuhkxdhlveflbkj` / `codigos qr`) |
| A3 | `CURRENT_REMOTE_LAST_MIGRATION` ≠ `20260923000002` (history changed since this audit) |
| A4 | `project_ref` ambiguous, missing, or the folder has no `supabase/.temp/linked-project.json` |
| A5 | `EXPECTED_OBJECTS_BEFORE` mismatch (any of the 8 Business Core tables already exists, or a `public` relation/function count differs from §5) |
| A6 | any plan to link QA, to `db push`/`migration up`, to reset the QA password, or to touch `.env*` |

---

## 12. Read-only attestation (what this task did **not** do)

- ❌ No QA password reset. ❌ No QA DDL, no QA seeding, no QA migration.
- ❌ No C3B applied to QA. ❌ No C3B applied to production/SUPERMASTER. ❌ No C3B applied anywhere remote.
- ❌ No `supabase db push`. ❌ No `supabase migration up`. ❌ No `supabase link`.
- ❌ No write SQL of any kind (only `SELECT` catalog reads). ❌ No `.env*` file modified.
- ❌ No other project linked; `supabase/.temp/*` untouched.
- ✅ Reads used: CLI metadata (`projects list`, `orgs list`, `migration list --linked`, `inspect db table-stats --linked`, `gen types typescript --linked`), PostgREST OpenAPI + per-table probes, Management API **GET** (org plan) and **SELECT-only** catalog queries.
- ✅ Files created: this ledger + read-only evidence copies under `scratch/c3b_remote_inventory/`.

---

## 13. Evidence index

| Artifact | Path |
| --- | --- |
| This ledger | `CRIPQER_SUPABASE_DEPLOYMENT_LEDGER.md` |
| SUPERMASTER generated types (live) | `scratch/c3b_remote_inventory/SUPERMASTER_mlinfiuhkxdhlveflbkj_public_types.ts` |
| SUPERMASTER OpenAPI (live) | `scratch/c3b_remote_inventory/PRODUCTION_mlinfiuhkxdhlveflbkj_openapi.json` |
| QA OpenAPI (live) | `scratch/c3b_remote_inventory/QA_tjigzcyoogmvdkivypym_openapi.json` |
| Catalog results (tables / functions / migrations / policies / C3B probes) | `scratch/c3b_remote_inventory/{SUPERMASTER,QA}_*.json` |
| C3B migration (authoring branch) | `…\generador de QR - business-core-c3b\supabase\migrations\20260925000000_business_core_foundation.sql` |
| C3B authoring reports | `C3B_BASELINE_REPORT.md`, `C3B_QA_VALIDATION_REPORT.md`, `C3B_SCHEMA_CONTRACT_REPORT.md`, `C3B_RPC_CONTRACT_REPORT.md`, `C3B_SECURITY_RLS_REPORT.md` (C3B worktree) |

Reproduction (all read-only): `supabase projects list` · `supabase orgs list` · `supabase migration list --linked` · `supabase inspect db table-stats --linked` · `supabase gen types typescript --linked` · `GET /v1/organizations/gvrxqgvvrbafsxatlmev` · `POST /v1/projects/<ref>/database/query` with `SELECT` only.

---

## 14. Stop condition

**STOPPED AFTER INVENTORY.** C3B remains `NOT APPLIED REMOTELY`. QA remains `FROZEN`. SUPERMASTER is frozen as the single canonical remote base.

**Tokens:** `CRIPQER_SUPERMASTER_TARGET_CONFIRMED` · `CRIPQER_SUPABASE_ENVIRONMENT_DRIFT` (co-finding, §8-B/§9: unrecorded DDL in both environments + foreign-lineage objects in QA).

---

# 15. R2 — SUPERMASTER LINEAGE REPAIR LOG (2026-09-27)

> **Task:** `C3B_R2_SUPERMASTER_LINEAGE_REPAIR` · **Mode:** `CONTROLLED_PRODUCTION_RECONCILIATION`
> **Environment:** PRODUCTION / SUPERMASTER · **project_name:** `codigos qr` · **project_ref:** `mlinfiuhkxdhlveflbkj`
> **Forbidden target (aborted by guard):** `cripqer-qa` / `tjigzcyoogmvdkivypym`
> **Result:** `CRIPQER_SUPERMASTER_LINEAGE_REPAIRED` · **C3B NOT applied** (stop condition honoured)
> This section **amends §4 (migration history) and §8-B (drift)** of this ledger.

## 15.1 Local collision resolution (phase 1 — rename only, no SQL body edits)

| Item | Before | After |
| --- | --- | --- |
| Version `20260924000000` | **two** files (`premium_redeem_codes`, `permanent_public_identity_contract`) | **one** file: `premium_redeem_codes` (corresponds to the already-applied remote effects) |
| `permanent_public_identity_contract` | `20260924000000_…` | **renamed** → `20260924000002_permanent_public_identity_contract.sql` |
| `legacy_profile_magic_bridge` | `20260924000001_…` | **unchanged** (dependency analysis showed no ordering dependency, so no second rename was required) |
| Local duplicate versions | 1 collision | **0** (18 files = 18 unique versions) |

Dependency analysis (documented before any remote write): `permanent_public_identity_contract` creates `profiles.published_profile_config`, `publish_profile_snapshot(uuid)` and replaces `publish_profile_canonical_snapshot(uuid,jsonb)`; `legacy_profile_magic_bridge` creates `get_published_magic_page_by_legacy_public_id(text)` and references **only pre-existing** columns (`profiles.public_id`, `profiles.published`, `pages.published_template_config`) — **neither file references the other's objects**, so ascending order (`…01` then `…02`) is dependency-safe. Canonical-lineage justification: shipped app code references `published_profile_config` (7 refs in `src/`), `publish_profile_snapshot` (1) and `get_published_magic_page_by_legacy_public_id` (2), while the recorded lineage contained **0** of them.

Post-rename hashes (LF-normalized / git blob):
`20260924000000_premium_redeem_codes.sql` → `9F6CDCA76E0AA57A1D35C588C5AAD16D7ACF6F8B308B9E3621029BB56D465911` / `4f0737fd5926aac4c2830930f45975ab6127eea5`
`20260924000001_legacy_profile_magic_bridge.sql` → `0D42D4C9E416B9E9CB76C5AEB56FEBD700CBD288420187D0A1BFF5E7056D8472` / *untracked*
`20260924000002_permanent_public_identity_contract.sql` → `66A2D45C116CF32A7EB71372E809F5920B96DE5550E3DC8D362C9A91E997CA0E` / *untracked*

## 15.2 Preflight record (phase 2 — ALL CHECKS PASS, evidence `scratch/c3b_r2_repair/phase2_preflight.txt`)

```
TARGET_PROJECT_NAME      = codigos qr
TARGET_PROJECT_REF       = mlinfiuhkxdhlveflbkj
FORBIDDEN_QA_REF         = tjigzcyoogmvdkivypym
REMOTE_LAST_MIGRATION    = 20260923000002
REMOTE_HISTORY_COUNT     = 15
REMOTE_RELATIONS         = 22
REMOTE_COLUMNS           = 319
REMOTE_FUNCTIONS         = 28
C3B_TABLES_PRESENT       = 0
C3B_FUNCTIONS_PRESENT    = 0
PREMIUM_FUNCTION_BODY_MATCH = True
PREMIUM_SEED_SET_MATCH      = True   (10/10 codes)
PREMIUM_SEED_ATTRIBUTES_OK  = True   (max_uses=1, current_uses=0, tier=premium, is_active=true, expires_at=NULL, created_by=NULL, single created_at)
A1..A5 abort checks        = PASS (ref, not-QA, last migration, no C3B table, premium effects, no unexpected drift)
PREFLIGHT_RESULT           = ALL_CHECKS_PASS
```

## 15.3 Remote change log (one row per remote change, as required)

| # | date | environment | project_name | project_ref | migration_version | migration_filename | migration_hash | action | result | resulting_remote_last_migration |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-09-27 | PRODUCTION (SUPERMASTER) | `codigos qr` | `mlinfiuhkxdflveflbkj` | `20260924000000` | `20260924000000_premium_redeem_codes.sql` | LF `9F6CDCA76E0AA57A1D35C588C5AAD16D7ACF6F8B308B9E3621029BB56D465911` · blob `4f0737fd5926aac4c2830930f45975ab6127eea5` | `supabase migration repair --status applied 20260924000000 --linked` — **history only, SQL body NOT re-run** | **APPLIED (recorded)**; row inserted exactly once with name `premium_redeem_codes`; function body byte-identical to before; 10 seed rows unchanged; no duplicate rows; fingerprint unchanged (22/319/28) | `20260924000000` |
| 2 | 2026-09-27 | PRODUCTION (SUPERMASTER) | `codigos qr` | `mlinfiuhkxdhlveflbkj` | `20260924000001` | `20260924000001_legacy_profile_magic_bridge.sql` | LF `0D42D4C9E416B9E9CB76C5AEB56FEBD700CBD288420187D0A1BFF5E7056D8472` · *untracked* | `supabase db push --linked` (single migration; the `…02` file was held out so only one migration could apply; dry-run confirmed the set first) | **APPLIED**; `get_published_magic_page_by_legacy_public_id(text)` created, body ≡ file; functions 28 → 29; relations/columns/policies/triggers/indexes unchanged; Analytics intact | `20260924000001` |
| 3 | 2026-09-27 | PRODUCTION (SUPERMASTER) | `codigos qr` | `mlinfiuhkxdhlveflbkj` | `20260924000002` | `20260924000002_permanent_public_identity_contract.sql` | LF `66A2D45C116CF32A7EB71372E809F5920B96DE5550E3DC8D362C9A91E997CA0E` · *untracked* | `supabase db push --linked` (single migration; dry-run confirmed the set first) | **APPLIED**; `profiles.published_profile_config` added (columns 319 → 320); `publish_profile_snapshot` created and `publish_profile_canonical_snapshot` replaced in place (functions 29 → 30, both bodies ≡ file); backfill: 8/8 published profiles now have a config, **0** missing; Analytics intact | `20260924000002` |

Not performed in this phase: no `--include-all`, no bulk push, no QA call of any kind, **no C3B application** (`20260925000000` still absent).

## 15.4 Post-change verification (phase 3 + phase 4)

| Check | Result |
| --- | --- |
| History rows | **18** — `20260914000000 … 20260923000002`, `20260924000000`, `20260924000001`, `20260924000002` (no duplicates, no remote-only rows) |
| `20260924000000` row count | **exactly 1** (name `premium_redeem_codes`) |
| Premium function body | **unchanged** before/after repair (byte-identical `pg_get_functiondef`) |
| `invitation_codes` | **10** rows, **10** distinct codes → **no duplicate seed rows** |
| Relations / columns / functions | `22 / 319 / 28` → after step 2 `22 / 319 / 29` → after step 3 `22 / 320 / 30` |
| Policies / triggers / indexes | `53 / 13 / 81` — **unchanged** throughout |
| Business Core | tables **0**, functions **0** (organizations, contacts, leads, activities, attributions, outcomes, etc.) |
| Analytics V1.1 | `qr_analytics` **29 rows preserved** (latest event `2026-09-27 16:33:02+00`); `track_analytics_event` (13 args) **intact**; both views `security_invoker=true`; RLS **2 SELECT / 0 INSERT** (RPC-only writes) |
| QA | **untouched**: history still **9 rows**, last `20260922000000`; no QA write/DDL/credential action |
| Local repo | 18 migration files = **18 unique versions** (collision gone); C3B file in its worktree unchanged (`LF 30C7A30A…DBF06`); `.env*` and `supabase/.temp/linked-project.json` unchanged |

## 15.5 Resulting canonical state

- **Canonical remote:** `codigos qr` / `mlinfiuhkxdhlveflbkj` — migration history has **no duplicate-version ambiguity**; last recorded migration = **`20260924000002`**.
- **SUPERMASTER is now code-aligned:** the app-required public-identity contract and the legacy QR bridge exist in production.
- **C3B remains NOT APPLIED.** `20260925000000_business_core_foundation.sql` (LF `30C7A30A…DBF06`, blob `1f5459a7…adc17`) is untouched and still lives only on branch `feat/business-core-c3b-foundation`.
- **QA remains `FROZEN_DO_NOT_DEPLOY`.**

## 15.6 Open governance items (non-blocking for the freeze)

1. The two applied migrations (`…01`, `…02`) are still **untracked in git** — they should be committed on one canonical branch so the recorded history has a versioned file (recommended before any C3B work).
2. The C3B migration file **still declares "(QA ONLY) / Production FORBIDDEN"** and lives in a worktree **linked to SUPERMASTER**: it must be retargeted and committed before C3B is ever authorized.
3. Future preflight for C3B must expect `CURRENT_REMOTE_LAST_MIGRATION = 20260924000002` and the fingerprint **22 relations / 320 columns / 30 functions / 53 policies / 13 triggers / 81 indexes** before applying it (supersedes §11.1–§11.2 of the R1 reconciliation report).








---

# 16. R3 — CANONICAL SOURCE FREEZE (2026-09-27)

> **Task:** `C3B_R3_CANONICAL_SOURCE_FREEZE` · **Mode:** `LOCAL_ONLY` · **Remote writes:** none
> **Objective:** make the repository itself match the already-reconciled canonical SUPERMASTER lineage
> *before* Business Core is authorized remotely.
> **Result:** lineage tracked, C3B retargeted (comment-only), checksums frozen, contract enforced.
> **`C3B` remains `NOT APPLIED`.** No DDL, no `db push`, no `migration up`, no `migration repair`,
> no QA write, no SUPERMASTER write, no push, no PR, no merge, no deploy.

## 16.1 Frozen identities and remote baseline (deployment precondition)

| Role | Project name (exact) | project_ref | Rule |
| --- | --- | --- | --- |
| **Canonical remote (SUPERMASTER)** | `codigos qr` | `mlinfiuhkxdhlveflbkj` | the **ONLY** future target |
| **QA (frozen)** | `cripqer-qa` | `tjigzcyoogmvdkivypym` | **FROZEN — DO NOT DEPLOY** (hard abort target) |

| Precondition (must be re-verified before any remote execution) | Frozen value |
| --- | --- |
| `CURRENT_REMOTE_LAST_MIGRATION` | `20260924000002` |
| schema fingerprint | **22** relations / **320** columns / **30** functions / **53** policies / **13** triggers / **81** indexes |
| Business Core objects remotely | **0** tables · **0** functions |
| R2 history repair (context) | `supabase migration repair --status applied 20260924000000` recorded an already-present function/seed; then `20260924000001` and `20260924000002` were applied with `db push`. See §15.3 |

## 16.2 Canonical migration lineage — now fully tracked in git

`supabase/migrations` in the canonical worktree: **18 files = 18 unique versions**,
**no duplicate `20260924000000`**, every file tracked. The two files that R2 applied while still
untracked (`…0001`, `…0002`) are now committed byte-identical to the applied versions
(commit `b893978`, `chore(supabase): canonicalize reconciled production lineage`).

Checksum convention (unchanged): the hash that authorizes a deployment is the
**LF-normalized SHA-256** of the file, paired with the **git blob SHA-1 of the same LF content**;
`git hash-object` of the worktree file must print the same blob hash.

| File | bytes | EOL | SHA-256 (LF-normalized) | git blob (LF) |
| --- | ---: | --- | --- | --- |
| `20260914000000_cripqer_production_baseline.sql` | 71305 | LF | `C2C7284896FECFEBCA150B000A3AC2AAEEDBC2A677FE22FC658A34AB5D3D78E5` | `f939de19c12163057e2862dea5237ecee15c87d6` |
| `20260915000000_restore_canonical_billing_persistence.sql` | 7523 | CRLF | `2778D2C30C83B3C085684A2239F2DC0377799036967D8641F49E4D6DD3C88955` | `46104da1727c560a2514d8dc6416d230140331c9` |
| `20260916000000_ensure_cripqer_storage_bootstrap.sql` | 13931 | CRLF | `4F03B5E5581799E0BA3DD905F29A457633BDC739E3B42A490DDF45F94895EA75` | `f3e973d3d86fa742ff5d0ef34047ffc26427fcf0` |
| `20260917000000_create_public_page_lookup_rpc.sql` | 3187 | MIXED | `627C2314BB820436868EF941C8BFB6FB33F6538BCC149F73D88E8E0F32C78725` | `bbbbc53562fb851a289498cd9b52a09f29e6d747` |
| `20260918000000_add_page_qr_config.sql` | 883 | CRLF | `EEC81A84694AA35FBC09ED8ED0155343D58AE6A1604D63478DD8EAA74EC36D4A` | `89553a547a45f300f8d0e279c721f9c2092a9ac4` |
| `20260919000000_add_page_alias_rpc.sql` | 1905 | MIXED | `DB94EBFE79EAB6D969BF481FF5D1A30C1C1AA6BFE6DC296F43BA23DA2829AD5F` | `600ba5ef7d51010712f6103a9350d79dab93fc2c` |
| `20260920000000_extend_page_type_services_catalog_portfolio.sql` | 1411 | LF | `AC12361C64243F94BDA3C2DBDF5C6AD9F53C62E736C1B809FEB8D4167B819C58` | `06bd1dd1b51e022752a1e07414d7c2dfaffae14a` |
| `20260921000000_add_page_analytics_events.sql` | 3986 | LF | `3662E4BF17DB43102CD51D12E4376B98A95B4CBD3C8737A2EE34E422A6AB9265` | `141143ce5d8208395a2f3183a8f5bda9f9815d1a` |
| `20260922000000_analytics_v1_1_event_context.sql` | 5337 | CRLF | `0D4333A12942ADF55CF8532CFF5CF10F41A5444E4152D5A377438E0A1E9FB2C9` | `ec772e55fff03d2905f4ecd71b87309850b14de3` |
| `20260922000001_canonical_analytics_write_boundary.sql` | 5580 | LF | `81AF751959B5B571837D03F60BD36C6F5AD1B32DBE1E2733CA51AAA055620AA5` | `383193f57e739095511a2225e7d6fd70a8ee4435` |
| `20260922000002_analytics_v1_1_device_context.sql` | 5753 | CRLF | `A2D223AA4A7984916D742B01642F80C53AB1FAA74AB1019D2244CCD09DF00E88` | `e4c0e5672cb7d7fb818bf332beb26876f39255cd` |
| `20260922000003_qr_scan_boundary.sql` | 6048 | CRLF | `97E67A6034B1803A85D674AC066B3CC6C1917673EA00A1EC5DE0FF204D3D8EDB` | `44a3820c1990e2574a6257e015067bb15b017952` |
| `20260923000000_c2b5_harden_analytics_insert_policy.sql` | 2887 | CRLF | `A466B4AA99B03F50D49C1F0CFC03B447C1AF6344CD670B9A5CD0FD23D17B750B` | `9270c560b05f824ca119bfffd205c864ea94a74a` |
| `20260923000001_c2b5_harden_legacy_rpc_search_path.sql` | 6390 | CRLF | `484CE9BA265335EBD54865741B18D4A88A947BCDC5AA4FB484D70768892960EC` | `0535961f47fabd87798da84ecbac252fa3c704a2` |
| `20260923000002_c2b5_harden_analytics_read_views.sql` | 2652 | CRLF | `91CBEA2C7C577B77C81AA6459BEBAFA7EE69C65613AF39C130FB137DCFBF0E67` | `1cebc58ef09b1bdfc74038536477c88271490cef` |
| `20260924000000_premium_redeem_codes.sql` **(R2/R3 reconciled)** | 3508 | LF | `9F6CDCA76E0AA57A1D35C588C5AAD16D7ACF6F8B308B9E3621029BB56D465911` | `4f0737fd5926aac4c2830930f45975ab6127eea5` |
| `20260924000001_legacy_profile_magic_bridge.sql` **(R2/R3 reconciled)** | 1301 | LF | `0D42D4C9E416B9E9CB76C5AEB56FEBD700CBD288420187D0A1BFF5E7056D8472` | `2a3e283a3dd1ef215858c260fbf8a9e238387e94` |
| `20260924000002_permanent_public_identity_contract.sql` **(R2/R3 reconciled)** | 4418 | LF | `66A2D45C116CF32A7EB71372E809F5920B96DE5550E3DC8D362C9A91E997CA0E` | `24bf30d28f709075df5bf1586f153ba8869d97b0` |

Every row above was verified content-identical to the version applied in R2; the three `20260924*`
files carry the exact hashes recorded in §15.2/§15.3.

Evidence: `scratch/c3b_r3_freeze/MAIN_migrations_inventory.json` (generated by
`scratch/c3b_r3_freeze/migration-hash-inventory.mjs`, read-only).

## 16.3 C3B migration — R3 retarget (comment-only, no SQL semantics change)

`supabase/migrations/20260925000000_business_core_foundation.sql`

The header still declared `CRIPQER — C3B · BUSINESS CORE FOUNDATION (QA ONLY)` with
`QA -> APPLY / Production -> FORBIDDEN` and a rollback comment "run ONLY in QA". That documentation
is stale: QA is frozen and SUPERMASTER is the canonical future target. R3 rewrote **comments only**:

| Element | Before | After |
| --- | --- | --- |
| Title line | `… BUSINESS CORE FOUNDATION  (QA ONLY)` | `… BUSINESS CORE FOUNDATION` |
| Lifecycle block | `QA -> APPLY`, `Production -> FORBIDDEN` | `Canonical remote -> codigos qr / mlinfiuhkxdhlveflbkj (SOLE TARGET)`; `cripqer-qa -> FROZEN — DO NOT DEPLOY`; status `NOT APPLIED`; mandatory deployment contract (5 verifications + abort target) |
| §14 rollback comment | `(run ONLY in QA if C3B must be reverted)` | `(run ONLY against the canonical remote …; NEVER against the frozen QA project)` |

**Proof that no SQL statement changed** (`git diff -U0` on the file, kept as
`scratch/c3b_r3_freeze/c3b-migration-diff.patch`):

```text
changed_lines = 32
non_comment_changed_lines = 0        # every changed line starts with "--"
git diff --stat -> 32 insertions(+), 6 deletions(-)
```

| Integrity | Before R3 | **After R3 (the only valid deployment hash)** |
| --- | --- | --- |
| bytes | 48095 | **49701** |
| SHA-256 (LF-normalized) | `30C7A30A806F00C8DEB8C31B6F0C2F6F25D3853E78F5078568CC0AF7320DBF06` | **`B1CD4A622F34285A10087A6A0BFC91E0D1D51F9F38C5EDC8A7D169B012E6008E`** |
| git blob (LF) | `1f5459a77c55e30ff8f86cd52f11c923602adc17` | **`2a04bedc21db2fee6d7d6b3367d30e90d2213529`** |

`git hash-object supabase/migrations/20260925000000_business_core_foundation.sql` →
`2a04bedc21db2fee6d7d6b3367d30e90d2213529` (matches, verified).

`C3B IS STILL NOT APPLIED — anywhere.` No remote project has ever seen this file.

## 16.4 Mandatory deployment contract — an implicit `supabase link` is NOT authorization

The C3B worktree **is** linked to the canonical remote, which is precisely why an implicit link must
never be the authority: a bare `db push` executed today would be "accidentally correct" and would
become catastrophic the moment the link changes (abort condition A2 of §11).

New enforcement artifact: `scripts/c3b-canonical-deployment-contract.mjs` (in the C3B worktree).
It is **read-only**: no DDL, no `db push`, no `migration up`, no `migration repair`, no write of any
kind, and in `--remote` mode only `SELECT`/`WITH` statements are allowed through a hard regex guard.

```powershell
# local checks: explicit target, checksum, lineage, linked-file sanity
node scripts/c3b-canonical-deployment-contract.mjs --check --project-ref mlinfiuhkxdhlveflbkj

# full contract: + live project name/ref, last migration and schema fingerprint (read-only)
$env:SUPABASE_ACCESS_TOKEN = 'sbp_…'
node scripts/c3b-canonical-deployment-contract.mjs --remote --project-ref mlinfiuhkxdhlveflbkj
```

| # | Verification (abort on any mismatch) | Frozen value |
| --- | --- | --- |
| 1 | `TARGET_PROJECT_NAME` | `codigos qr` |
| 2 | `TARGET_PROJECT_REF` | `mlinfiuhkxdhlveflbkj` |
| 3 | `CURRENT_REMOTE_LAST_MIGRATION` | `20260924000002` |
| 4 | schema fingerprint | `22/320/30/53/13/81` |
| 5 | exact checksum of the C3B file | LF `B1CD4A62…E6008E` · blob `2a04bedc…63529` |

Guarantees enforced by the script: **an explicit `--project-ref` (or `C3B_TARGET_PROJECT_REF`) is
mandatory (exit 2 otherwise)**; the frozen QA ref `tjigzcyoogmvdkivypym` is a hard abort (exit 3);
a mismatching `supabase/.temp/linked-project.json` is an abort (a *missing* link file is the desired
state, never a requirement); an already-present Business Core table is an abort; the fingerprint is
computed with the exact read-only SQL embedded in the script (documented, reproducible).

The same contract is restated inside the migration header, so a reviewer sees it where the DDL lives.

## 16.5 Local validation executed for R3

| # | Required check | Command | Result |
| --- | --- | --- | --- |
| 1 | 64/64 Business Core contract tests PASS | local PostgreSQL 17 harness (`scripts/c3b-local-supabase-harness.sql` + the retargeted migration) then `node scripts/qa-c3b-business-core-contract.mjs --local` | **PASS — `total 64 / pass 64 / fail 0 / verdict PASS`**; residue probe all zeros (`orgs=0 … qrevents=0`) |
| 2 | Analytics regression PASS | `vitest run src/lib/analytics src/components/intelligent-analytics` | **BLOCKED BY ENVIRONMENT — see §16.5-B** (not a test failure) |
| 3 | feature gate tests PASS | `vitest run src/lib/business-core` | **BLOCKED BY ENVIRONMENT — same defect** |
| 4 | build PASS | `npm run build` | **PASS** — `✓ built in 18.63s` (nitro/vercel output generated) |
| 5 | `git diff --check` PASS | `git diff --check` | **PASS** (exit 0; only a CRLF notice for `src/routeTree.gen.ts`) |
| 6 | worktree clean after commits | `git status --porcelain` in the C3B worktree | **PASS** (empty after `fb8783a`) |

Additional R3 verification (all local, read-only):

| Check | Evidence |
| --- | --- |
| Migration re-applies cleanly after the retarget | `psql -v ON_ERROR_STOP=1 -f …20260925000000_business_core_foundation.sql` → exit 0 (creates 8 tables, 1 helper, 4 RPCs) |
| Contract guard behaviour | exit **0** with `--project-ref mlinfiuhkxdhlveflbkj` (verdict PASS, 7 checks); exit **3** with `--project-ref tjigzcyoogmvdkivypym` (`ABORT A1: the explicit target is the FROZEN project`); exit **2** with no explicit ref |
| Comment-only proof | `git diff -U0` → 32 changed lines, **0** non-comment lines; `scratch/c3b_r3_freeze/c3b-migration-diff.patch` |
| Hash cross-check | `git hash-object supabase/migrations/20260925000000_business_core_foundation.sql` = `2a04bedc21db2fee6d7d6b3367d30e90d2213529` = the contract value |
| Lineage | canonical worktree 18/18 unique versions; C3B worktree 19/19 unique versions; `collisions=false` in both inventories |

### 16.5-B Co-finding: `CRIPQER_VITEST_RUNNER_ENVIRONMENT_BLOCKED` (pre-existing, machine-level)

The two vitest-based items could **not** be executed: every test file fails before any assertion runs.

```text
FAIL src/lib/business-core/feature-gate.test.ts
TypeError: Cannot read properties of undefined (reading 'config')
Error: Vitest failed to find the runner. …
     Test Files  16 failed (16)
          Tests  no tests
```

The failing `describe()` sits on the first line of a file whose only other import is `vitest`
itself, i.e. the `vitest` module the test file receives has no worker state
(`globalThis.__vitest_worker__` is undefined). This is a runner-discovery defect, **not** a failing
assertion: no test body ever ran ("Tests: no tests").

Proof that it is pre-existing and unrelated to R3:

| Probe | Result |
| --- | --- |
| Same command in the **main worktree** (`…\generador de QR`, real `node_modules`, contains **none** of the R3 changes): `vitest run src/lib/analytics/device-classifier.test.ts` | **identical failure** (`Cannot read properties of undefined (reading 'config')`, exit 1) |
| `--pool=forks` (default) / `--pool=threads` / `--pool=vmThreads` | identical failure |
| `--no-isolate`, `--no-cache`, `--clearCache` | identical failure |
| `NODE_OPTIONS=--preserve-symlinks --preserve-symlinks-main` | identical failure |
| minimal `vitest.r3.config.ts` (no app/Lovable plugins) | identical failure |
| probe file importing only `vitest` and `node:module` | identical failure |

Installed versions are mutually consistent (vitest `4.1.11`, `@vitest/*` `4.1.11`, vite `8.2.1`
which satisfies vitest's `^6 || ^7 || ^8` peer range, happy-dom `20.11.6`, node `v24.21.0`), and
vitest's own dependencies are all present (`obug@2.1.4`, `std-env@4.2.0`, `tinyrainbow@3.1.1`, …).
The `node_modules` tree is however a **hybrid**: a flat npm tree (`vite@8.2.1`) sitting next to
pnpm leftovers (`node_modules/.pnpm/vite@8.2.2`, `node_modules/.pnpm/vitest@4.1.11…`); the last
write to `node_modules/.package-lock.json` is **2026-09-26 23:53**, i.e. before R3.

**Why R3 cannot repair it:** the repair is a dependency reinstall of the user's shared
`node_modules`, which is outside `C3B_R3_CANONICAL_SOURCE_FREEZE`'s LOCAL_ONLY mandate and would
change the environment for every worktree. R3 changed only: one `.sql` comment header, three
markdown reports, two copied `.sql` files and one new read-only script — none of which is loaded by
vitest. **No test-result claim is made for items 2 and 3.**

Tooling note (no repository change): the 64-assertion contract suite needs `pg`, which is **not** a
repository dependency. It was installed with `npm install --prefix scratch/c3b_r3_freeze/pgdeps pg
--no-save` (scratch-only) and reached through a temporary junction, removed afterwards. The local
contract run also pins the throw-away cluster's messages to English
(`ALTER DATABASE c3b_validate SET lc_messages TO 'C'`), because six assertions compare server error
text against English strings; without it those six report a false FAIL
(`permiso denegado` instead of `permission denied`) — 58/64 — while the behaviour is correct.

## 16.6 Frozen deployment anchors (quick reference)

| Anchor | Value |
| --- | --- |
| Canonical target (name / ref) | `codigos qr` / `mlinfiuhkxdhlveflbkj` |
| Abort target (frozen) | `cripqer-qa` / `tjigzcyoogmvdkivypym` |
| C3B file | `supabase/migrations/20260925000000_business_core_foundation.sql` |
| C3B version | `20260925000000` |
| C3B bytes | **49701** |
| C3B SHA-256 (LF-normalized) | **`B1CD4A622F34285A10087A6A0BFC91E0D1D51F9F38C5EDC8A7D169B012E6008E`** |
| C3B git blob (LF) | **`2a04bedc21db2fee6d7d6b3367d30e90d2213529`** |
| C3B state | **NOT APPLIED** (never executed against any remote) |
| Expected `CURRENT_REMOTE_LAST_MIGRATION` | `20260924000002` |
| Expected fingerprint before C3B | `22` relations / `320` columns / `30` functions / `53` policies / `13` triggers / `81` indexes |
| Expected Business Core objects before C3B | `0` tables / `0` functions |
| Authorizing artifact | `scripts/c3b-canonical-deployment-contract.mjs` (must exit 0, `--remote`) |

## 16.7 Commits (local only — no push, no PR, no merge)

| Worktree | Branch | Commit | Message |
| --- | --- | --- | --- |
| `…\generador de QR` (canonical) | `codex/ui-migration-phase-1a-shell-home` | `b893978` | `chore(supabase): canonicalize reconciled production lineage` |
| `…\generador de QR` (canonical) | idem | *the commit that carries this section* — `git log -1 -- CRIPQER_SUPABASE_DEPLOYMENT_LEDGER.md` | `docs(c3b): freeze canonical deployment baseline` |
| `…\generador de QR - business-core-c3b` | `feat/business-core-c3b-foundation` | `7a81f28` | `chore(business-core): retarget C3B deployment contract to canonical remote` |
| `…\generador de QR - business-core-c3b` | idem | `fb8783a` | `docs(c3b): freeze canonical deployment baseline` |

Nothing was force-pushed, rebased, amended or squashed; no published history was rewritten.

## 16.8 Attestation — what R3 did **not** do

- ❌ No `supabase db push`, no `migration up`, no `migration repair`, no DDL of any kind.
- ❌ No QA write / DDL / seed / credential action; the QA password was not reset.
- ❌ No SUPERMASTER write; no remote SQL was executed in this phase at all (the contract script was
  run in `--check` mode only — its `--remote` branch performs read-only SELECTs and was not invoked).
- ❌ No `supabase link`, no `.env*` change, no `supabase/.temp/*` change, no dependency change to the
  repository manifests (`package.json` / `package-lock.json` are untouched by R3).
- ❌ No push to GitHub, no PR, no merge, no deploy.
- ✅ Reads used: repository files, `git` read commands, a **local** throw-away PostgreSQL 17 instance.

## 16.9 Stop condition

Git, migration lineage, C3B checksum and this ledger are internally consistent.
Token: **`CRIPQER_C3B_CANONICAL_SOURCE_FREEZE_PASS`**, with the co-finding
`CRIPQER_VITEST_RUNNER_ENVIRONMENT_BLOCKED` (§16.5-B) carried forward as an environment item, not a
C3B item.



