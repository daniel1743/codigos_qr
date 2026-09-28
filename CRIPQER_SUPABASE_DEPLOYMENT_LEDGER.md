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

---

# 17. R4 — CONTROLLED PRODUCTION MIGRATION (2026-09-27) — **ABORTED, NOT EXECUTED BY THIS RUN**

> **Task:** `C3B_R4_CONTROLLED_SUPERMASTER_APPLY` · **Mode:** `CONTROLLED_PRODUCTION_MIGRATION`
> **Authorized write:** yes — exactly one migration, canonical SUPERMASTER only.
> **Result:** **ABORT.** The mandatory remote pre-state no longer existed when this run reached the
> apply step: `20260925000000_business_core_foundation.sql` had **already been applied** to the
> canonical remote by a **concurrent, unmanaged actor at 18:49:06–18:49:35** on this same day.
> **This run issued no DDL, no `db push`, no `migration repair`, no rollback and no drop.**
> Token: **`CRIPQER_C3B_BUSINESS_CORE_SUPERMASTER_FAIL`** (see §17.16).

## 17.1 Frozen identities (re-printed exactly, as required)

```text
TARGET_PROJECT_NAME   = codigos qr
TARGET_PROJECT_REF    = mlinfiuhkxdhlveflbkj
FORBIDDEN_QA_REF      = tjigzcyoogmvdkivypym   (FROZEN — HARD ABORT)
```

The implicit `supabase link` was verified to agree with the declaration
(`supabase/.temp/linked-project.json` → `codigos qr` / `mlinfiuhkxdhlveflbkj`, guard check A3 = OK)
but was **never** treated as authorization; every check ran with an explicit `--project-ref`.

## 17.2 Deployment worktree / commit — PROVEN (evidence `r4-0-worktree-preflight.log`)

| Required proof | Observed | Result |
| --- | --- | --- |
| Worktree | `…\generador de QR - business-core-c3b` | ✅ |
| Branch / commit | `feat/business-core-c3b-foundation` / `fb8783a24ff4646ecccbcfd5a6d4c6ae230c4f12` | ✅ |
| 19 migration files through `20260925000000` | `MIGRATION_FILES=19` | ✅ |
| 19 unique versions | `UNIQUE_VERSIONS=19`, `DUPLICATE_VERSION_COLLISION=False` | ✅ |
| `20260924000000` = `premium_redeem_codes` | present, git-tracked | ✅ |
| `20260924000001` = `legacy_profile_magic_bridge` | present, git-tracked | ✅ |
| `20260924000002` = `permanent_public_identity_contract` | present, git-tracked | ✅ |
| `20260925000000` = `business_core_foundation` | present, git-tracked | ✅ |
| All four files git-tracked | `GIT_TRACKED=1` ×4 | ✅ |
| C3B LF SHA-256 / blob | `B1CD4A62…E6008E` / `2a04bedc…63529` (both match; `HEAD` blob identical) | ✅ |
| No uncommitted migration changes | `GIT_STATUS_MIGRATIONS_LINES=0` | ✅ |

The only dirty path at STEP 0 was the CLI cache `supabase/.temp/cli-latest` (a non-migration,
non-source CLI artifact; it re-synced to `HEAD` by 19:29 → the migration lineage itself was pristine).

## 17.3 Remote preflight at the moment of execution — **FAILED (contract precondition gone)**

Own read-only measurement over the Management API (`r4-9-confirm.log`, `r4-9b-confirm.log`):

| Mandatory precondition (task) | Expected | Observed at execution | Result |
| --- | --- | --- | --- |
| Migration history rows | **18** | **19** | ❌ |
| Last migration | `20260924000002` | **`20260925000000`** | ❌ |
| Schema fingerprint | `22/320/30/53/13/81` | **`30/394/35/61/13/111`** | ❌ |
| C3B tables | `0/8` | **`8/8`** | ❌ |
| C3B functions | `0/5` | **`5/5`** | ❌ |

Because `abort_on_any_difference: true`, R4's `remote_preflight` gate **could not pass**, and the
`apply.safety` requirement ("dry-run must show exactly **one** pending migration") could not be met:
the pending set is now **empty**.

## 17.4 Root cause — the single authorized migration was consumed by a concurrent actor

Read-only artefacts left in `scratch/c3b_r4_apply/` by the other actor (timestamps are machine-local):

| Artefact | Time | Content that settles the question |
| --- | --- | --- |
| `step3-dryrun.log` | 18:47:27 → 18:48:03 | `Would push these migrations: • 20260925000000_business_core_foundation.sql` (exactly one, dry run only) |
| `step4-apply.log` | 18:49:06 → 18:49:35 | `[Y/n] y` → `Applying migration 20260925000000_business_core_foundation.sql...` → `Finished supabase db push. apply_exit=0` |
| `poststate.log` | 18:57:46 → 18:59:10 | 19 history rows, last `20260925000000`, fingerprint `30/394/35/61/13/111`, 8/8 tables, 5/5 functions |

`supabase db push --linked` was therefore executed from the same deployment worktree **~30 minutes
before this run's first tool call**, by an actor that was **not** this R4 execution, so the frozen
`CURRENT_REMOTE_LAST_MIGRATION` fingerprint is a *historical* fact, not a live precondition.

## 17.5 Contract guard (own run, authoritative) — **ABORT with exit 3**

`node scripts/c3b-canonical-deployment-contract.mjs --remote --project-ref mlinfiuhkxdhlveflbkj`
(`r4-9b-confirm.log`, third attempt; attempts 1–2 died on `UND_ERR_CONNECT_TIMEOUT` — see §17.13):

```text
[OK]    A1/A2/A3 explicit target = canonical, not QA, link agrees
[OK]    A5/A5b C3B checksum matches the frozen contract (49701 bytes, LF sha + blob)
[OK]    A6/A7 local lineage collision-free (19 files = 19 versions), C3B version present
[OK]    A9 remote project name/ref verified (codigos qr / mlinfiuhkxdhlveflbkj)
[ABORT] A10 CURRENT_REMOTE_LAST_MIGRATION differs -- expected 20260924000002, actual 20260925000000
[ABORT] A11 fingerprint differs -- actual {30,394,35,61,13,111}, differing: relations,columns,functions,policies,indexes
[ABORT] A12 Business Core objects already exist remotely -- C3B is not a clean first application
{"verdict":"ABORT","checks":11,"aborts":["A10","A11","A12"]}   guard_exit=3
```

The guard's own verdict is the deployment decision: **C3B is NOT a clean first application on the
canonical remote.**

## 17.6 Exact post-state captured (own fresh read-only verification)

Source: `r4-9-confirm.log` (19:20) and `r4-9b-confirm.log` (19:26). Independent of the other actor's log.

| Measure | Value |
| --- | --- |
| Migration history rows | **19** |
| Last migration | `20260925000000` |
| History (ordered) | `20260914000000 … 20260924000002, 20260925000000` (all 19, no gap, no duplicate) |
| `supabase migration list --linked` | Local = Remote for **all 19** versions (no remote-only, no local-only) |
| Fingerprint | relations **30** · columns **394** · functions **35** · policies **61** · triggers **13** · indexes **111** |
| Business Core tables | **8/8** (`organizations`, `contacts`, `contact_identities`, `contact_consents`, `leads`, `activities`, `attributions`, `outcomes`) |
| Business Core functions | **5/5** (`current_organization_ids`, `resolve_contact`, `create_lead_for_contact`, `record_business_activity`, `record_outcome`) |
| Indexes created on the 8 tables | **30** |
| `public` relations (30) | the original 22 + exactly the 8 Business Core tables — no unrelated table added |

## 17.7 The one fingerprint that differs from the task sheet: `indexes` 99 vs 111 — RECONCILED

The task expected `indexes: 99` (= 81 + the 18 `CREATE INDEX` statements in the migration). The
catalogue shows **111**; the extra 12 are index objects a `CREATE INDEX`-only count cannot see:

| Source of the 30 new indexes | Count |
| --- | --- |
| Explicit `CREATE INDEX` / `CREATE UNIQUE INDEX` in the migration (incl. `attributions_lead_first_touch_key`, `attributions_lead_last_touch_key`) | 18 |
| 8 × table `PRIMARY KEY` (`organizations_pkey` … `outcomes_pkey`) | 8 |
| 4 × `UNIQUE` constraint indexes (`organizations_owner_user_id_key`, `contacts_id_organization_id_key`, `leads_id_organization_id_key`, `contact_identities_org_type_value_key`) | 4 |
| **Total** | **30** → 81 + 30 = **111** ✅ |

The 30 index names were read back one by one: they are exactly the 18 named in the file plus the 12
constraint-backed ones. **No index exists on a Business Core table that the frozen migration does not
create**, so there is no evidence of unrelated DDL. The discrepancy is an expectation error in the R4
task sheet (it omitted PK and UNIQUE-constraint indexes), not drift.

## 17.8 Schema / security validation (own read-only probe, `r4-9b-security.sql`)

| Validation | Observed | Result |
| --- | --- | --- |
| 8/8 tables exist | 8 | ✅ |
| 5/5 functions exist | 5 | ✅ |
| RLS enabled on all 8 tables | `rls=true` × 8 | ✅ |
| Policies on the 8 tables | exactly **8**, every one `cmd=SELECT`, `roles={authenticated}` | ✅ |
| anon policies / PUBLIC policies | **0** | ✅ |
| anon table privileges on all 8 tables | `sel/ins/upd/del = false` × 8 | ✅ |
| authenticated **direct writes** on all 8 tables | `ins/upd/del = false` × 8 | ✅ |
| authenticated read | `sel=true` × 8 | ✅ |
| `search_path` fixed where required | all 5 functions `SECURITY DEFINER` with `search_path=""` | ✅ |
| ownership never supplied by the client | every RPC derives ownership from `auth.uid()`; `resolve_contact` raises `organization_not_owned` unless `o.owner_user_id = v_uid` | ✅ |
| cross-organization constraints present | `activities_contact_fk`, `activities_lead_fk`, `attributions_lead_fk`, `contact_consents_contact_fk`, `contact_identities_contact_fk`, `leads_contact_fk`, `outcomes_contact_fk`, `outcomes_lead_fk` (composite `(id, organization_id)` FKs) | ✅ |
| **`anon` holds EXECUTE on the 5 functions** | `proacl = {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}` on **all 5** | ⚠️ **CONTRACT DEVIATION** |

**The `anon` deviation, precisely.** The migration ends each function with
`REVOKE ALL … FROM PUBLIC; GRANT EXECUTE … TO authenticated;`. On real Supabase the platform's
*default privileges for new functions in schema `public`* grant `anon` / `authenticated` /
`service_role` an **explicit** grant at creation time, so revoking `PUBLIC` does not remove `anon=X`.
The consequence is contract-level, and the frozen 64-assertion suite would catch it:

| Frozen assertion | Would evaluate to | Why |
| --- | --- | --- |
| `A6` — "EXECUTE on anon/PUBLIC is revoked for the 4 RPCs" | **FAIL** | `aclexplode(proacl)` yields rows with `r.rolname='anon'` |
| "an anon role cannot execute the RPC (EXECUTE revoked)" expecting `permission denied` (42501) | **FAIL** | anon *can* execute; the RPC then raises `organization_not_owned` (P0001) because `auth.uid()` is NULL |

That is exactly the class of assertion the R3 **local** harness passed 64/64, because a plain
PostgreSQL 17 cluster does **not** carry Supabase's default function privileges. **Severity:
defense-in-depth, not data exposure** — an anonymous session has `auth.uid() = NULL`, so no
organization is ever owned and no Business Core row is readable or writable through the RPCs
(confirmed in the migration source, §12.1 `organization_not_owned`). It is nevertheless a genuine
divergence between the frozen contract text and the deployed reality, and it must be closed by an
authorized follow-up (e.g. an explicit `REVOKE EXECUTE ON FUNCTION … FROM anon` in a **new**
migration). **It was NOT fixed here**: R4 forbids unrelated DDL and mandates STOP on failure.

## 17.9 Analytics V1.1 regression — **INTACT** (own probe, `r4-9-confirm.log` 9c)

| Check | Observed |
| --- | --- |
| `qr_analytics` rows | **29** (latest `2026-09-27 16:33:02+00` — unchanged since before C3B) |
| `track_analytics_event` 13-arg canonical RPC | **1** (present) |
| Analytics views `security_invoker=true` | **2 / 2** (`qr_analytics_daily`, `qr_top_links`) |
| `qr_analytics` policies | **2 SELECT / 0 INSERT** (RPC-only writes, unchanged) |
| `profiles` total / published | **17 / 8** (unchanged) · `pages` total **35** (unchanged) |
| C2B8 / C2B8A behaviour | unchanged — no analytics object is created, altered or dropped by C3B |

C3B touched nothing in Analytics V1.1: the migration only *references* `qr_analytics(id)` from
`activities`, and no analytics row was added, rewritten or removed (its `max(created_at)` is unchanged).

## 17.10 Vitest — blocker **UNCHANGED**, still not repaired (evidence `r4-8-vitest-probe.log`)

```text
command: node_modules\.bin\vitest.cmd run src/lib/business-core/feature-gate.test.ts
 FAIL  src/lib/business-core/feature-gate.test.ts   (0 test)
 TypeError: Cannot read properties of undefined (reading 'config')
   ❯ src/lib/business-core/feature-gate.test.ts:14:1   describe("isBusinessCoreEnabled", …)
 Test Files  1 failed (1)      Tests  no tests      vitest_exit=1
```

This is the **same defect** as §16.5-B (`CRIPQER_VITEST_RUNNER_ENVIRONMENT_BLOCKED`): the runner is
never found and no assertion body executes ("Tests: no tests"). **R4 installed, removed and repaired
nothing** (no `npm install`, no `pgdeps`, no lockfile change), so the blocker remains identical and
**no Vitest PASS is claimed**.

## 17.11 The 64 remote contract assertions — **NOT EXECUTED** (and why)

Required by R4: `total 64 / pass 64 / fail 0` against SUPERMASTER with synthetic fixtures. **They were
not run, and this ledger does not claim a result for them.** Reasons, in order of weight:

1. **The R4 write window is closed.** The apply step is impossible (the pending set is empty), the
   contract guard returns `ABORT` (§17.5), and `rollback.on_failure` mandates **STOP** with no further
   production writes. The 64-assertion suite is *not* read-only: it creates synthetic
   `organizations`/`contacts`/`leads` rows and an authenticated-user fixture, i.e. it is a production
   write set that the aborted contract does not authorize.
2. **A second actor is live in the same worktree** (§17.12) and has itself added an uncommitted
   `--canonical-remote` mode to the suite (now fetching the pooler connection string, password
   included, from `GET /v1/projects/{ref}/config/database/pgbouncer`). Two actors running the same
   production fixture suite concurrently is precisely the unsafe condition R4 exists to prevent.
3. **The runner is not deployable from a clean state**: `pg` is **not** a repository dependency
   (absent in both worktrees; R3 reached it only through a scratch-only `--no-save` install) and R4
   forbids dependency installation/repair. There is also no direct database credential outside the
   Management API token.
4. **A divergence is already known** (§17.8, `anon` holds EXECUTE), so `pass 64 / fail 0` cannot be
   assumed even if the suite were run against a plain local harness, where it previously reported
   64/64.

**Recommendation for controlled recovery:** run the 64 assertions against SUPERMASTER **once**, from a
single authorized actor, after (a) the `anon` EXECUTE deviation is closed by an authorized migration
and (b) the concurrent actor has stopped, using a dedicated synthetic organization/user fixture and
cleaning the residue within the suite's own transaction semantics — then record 64/64 (or the true
count) in this ledger.

## 17.12 Concurrency hazard — the decisive control failure

Two independent actors operated on the same deployment worktree and the same canonical remote:

| Evidence | Observation |
| --- | --- |
| `launcher-trace.log` | a launcher spawned `run-net-probe` / `step1` / `step2` / `step2b` between 18:26 and 18:37 |
| `step3-dryrun.log` + `step4-apply.log` | the one migration was pushed **18:49:06 → 18:49:35**, before this run's first command |
| unrelated live workload | `node CHACTIVO_PHASE_3B_RUNTIME_QA/qa_authenticated_realtime_final.cjs` started 19:03 and 19:05 — a *different* task's runtime QA |
| deployment worktree dirt at 19:29 | `M scripts/qa-c3b-business-core-contract.mjs`, `M src/routeTree.gen.ts` — authored by the other actor, **not** by R4 |
| shared toolchain | extra node/vitest processes appeared mid-run in the same `node_modules` |

Because the frozen pre-state was consumed **outside** this execution, R4 could not have satisfied
"exactly one authorized actor applies exactly one migration" no matter how careful this run was. That
— not the migration content — is the failure.

## 17.13 Environment observations (documented, non-blocking)

- `api.supabase.com` is **intermittently unreachable**: node `fetch` raised
  `ConnectTimeoutError (UND_ERR_CONNECT_TIMEOUT, 10000ms)` on several attempts (guard attempts 1–2 died;
  attempt 3 succeeded). DNS and TCP/443 were healthy (`net-probe.log`).
- The scoop Supabase CLI **v2.62.10** needs ~20–25 s per invocation here; every CLI call was launched
  in the background and polled rather than waited on.
- The Management API token was read from the Windows Credential Manager (`Supabase CLI:supabase`) by the
  pre-existing read-only helper `get-access-token.ps1`; it was held in memory only — **never written to
  disk, never logged, never printed**.
- `registry.npmjs.org` was unreachable/timeout-prone, so `npx` was unusable; **no dependency was
  installed**.
- The `db push` prompt (`[Y/n]`) is answerable non-interactively with the CLI's documented `--yes`.

## 17.14 Attestation — what R4 did **not** do

- ❌ **No `db push` by this run.** The planning step was never reached (nothing pending); the single
  `db push` in this workspace was executed by the concurrent actor at 18:49:06.
- ❌ No `migration repair`, no `migration up`, no `--include-all`, no bulk application.
- ❌ No schema DDL, no `DROP`, no rollback, no index/constraint change, no `REVOKE`/`GRANT` — in
  particular the `anon` EXECUTE deviation was left **exactly as found**.
- ❌ No seed change, no application-code deploy, no CRM UI, no Forms, no QR Campaign Engine.
- ❌ **No QA contact of any kind**: no QA ref queried, no QA write, no QA DDL/seed, no QA credential
  action, no QA link. `QA_REF_CONTACTED=NO`, `QA_WRITES=0`; both tooling guards hard-abort on
  `tjigzcyoogmvdkivypym` (guard `A1`, `remote-query.mjs` `FORBIDDEN_REF`).
- ❌ No push, no PR, no merge, no dependency/manifest change.
- ✅ Writes by this run: only git-ignored artefacts under `scratch/c3b_r4_apply/` and this ledger section.

## 17.15 R4 ledger record — the required fields

| Field | Value |
| --- | --- |
| Date / time | 2026-09-27 19:20 → 19:36 (-03:00) |
| Project name | `codigos qr` |
| `project_ref` | `mlinfiuhkxdhlveflbkj` |
| Pre-state fingerprint | **required `22/320/30/53/13/81`; NOT PRESENT at execution — already `30/394/35/61/13/111`** |
| Migration filename | `20260925000000_business_core_foundation.sql` |
| Migration LF hash | `B1CD4A622F34285A10087A6A0BFC91E0D1D51F9F38C5EDC8A7D169B012E6008E` (re-verified) |
| git blob | `2a04bedc21db2fee6d7d6b3367d30e90d2213529` (re-verified, identical to the `HEAD` blob) |
| Apply command | planned `supabase db push --linked --yes` (from `…\generador de QR - business-core-c3b`) — **NOT EXECUTED by this run**; the concurrent actor ran `supabase db push --linked` at 18:49:06 |
| Result | **ABORT** — contract guard verdict `ABORT` (`A10`,`A11`,`A12`, exit 3); **zero writes issued** |
| Post-state fingerprint | `30` relations / `394` columns / `35` functions / `61` policies / `13` triggers / `111` indexes |
| Migration history result | **19** rows, last `20260925000000`; CLI `local = remote` for all 19 (no duplicate, no remote-only) |
| 64-test result | **NOT EXECUTED** (§17.11) — no PASS claimed |
| Analytics regression result | **PASS / intact** — 29 `qr_analytics` rows, 13-arg RPC present, 2/2 `security_invoker` views, 2 SELECT / 0 INSERT policies |

## 17.16 Stop condition

**STOP.** No further migration, no manual `DROP`, no rollback, no `migration repair`, no re-run of the
apply set. The canonical remote is internally consistent (19 history rows, no duplicates, local =
remote for all 19; Analytics V1.1 intact).

Open items for controlled recovery:

1. **Close the `anon` EXECUTE deviation** (§17.8) with an authorized migration — until then the frozen
   C3B contract is not fully satisfied on the canonical remote, and the `A6` + anon-RPC assertions of
   the frozen suite will fail.
2. **Stop the concurrent actor** (§17.12) before any further C3B operation; R4 requires one authorized
   actor per apply and per fixture run.
3. **Run the 64 remote assertions once** from a single actor with synthetic fixtures, and record the
   true `pass/fail` count here.
4. **Decide the other actor's uncommitted worktree edits** (`scripts/qa-c3b-business-core-contract.mjs`,
   `src/routeTree.gen.ts`) — they are not part of this R4 record and are not committed or reverted here.

Token: **`CRIPQER_C3B_BUSINESS_CORE_SUPERMASTER_FAIL`**

# 18. R4 — CONTROLLED SUPERMASTER APPLY (2026-09-27) — **EXECUTED BY THIS RUN**

> **Task:** `C3B_R4_CONTROLLED_SUPERMASTER_APPLY` · **Mode:** `CONTROLLED_PRODUCTION_MIGRATION`
> **Authorized write:** exactly ONE migration (`20260925000000_business_core_foundation.sql`) to the canonical SUPERMASTER.
> **Canonical target:** `codigos qr` / `mlinfiuhkxdhlveflbkj`. **Forbidden:** `cripqer-qa` / `tjigzcyoogmvdkivypym` (HARD_ABORT).
> **Outcome:** the migration **applied cleanly and completely**, but the required post-validation was **not** fully
> satisfiable, so the phase ends **FAIL** (§18.9) — with **no rollback, no further DDL and no manual DROP**.
> **Token:** `CRIPQER_C3B_BUSINESS_CORE_SUPERMASTER_FAIL`

## 18.0 Reconciliation with section 17 (two parallel R4 instances)

Two R4 instances ran on the same machine inside the same authorization window:

| Instance | What it did | Where it is recorded |
| --- | --- | --- |
| **This run** | passed every preflight gate and **executed** the single authorized `db push` at **18:49:06–18:49:35**, then ran the post-state verification | **section 18** (this section); raw evidence in `scratch/c3b_r4_apply/` |
| The parallel instance | reached the remote preflight *after* the apply, found the task's pre-state gone (history 19, C3B present) and **correctly aborted** without issuing any DDL | section 17 (its own record, left unmodified) |

Both instances independently measured the same post-state (`19` rows / last `20260925000000` /
`30/394/35/61/13/111` / 8 tables / 5 functions) and reconciled the same `indexes 111 vs 99` question, so the two
sections corroborate each other. The parallel instance labels this run a "concurrent actor": that is accurate —
the two instances were not coordinated, and **this run is the actor that performed the apply**, under an R4
authorization whose preflight gates all passed (18:32–18:48).

> **Control finding (escalate).** Two authorized R4 instances raced on one production target, and the loser could
> only detect the collision *after* the winning write. R4's own guards worked (`abort_on_any_difference`; "dry-run
> must show exactly one pending migration"), preventing a second write — but the orchestration layer must not
> dispatch the same production-migration authorization to two sessions in the same window. Recommended: a single
> writer lease for production migrations, plus a `CURRENT_REMOTE_LAST_MIGRATION` assertion taken immediately
> before *and* immediately after the apply inside the same session.

---

> **Task:** `C3B_R4_CONTROLLED_SUPERMASTER_APPLY` · **Mode:** `CONTROLLED_PRODUCTION_MIGRATION`
> **Authorized write:** exactly ONE migration (`20260925000000_business_core_foundation.sql`) to the canonical SUPERMASTER.
> **Canonical target:** `codigos qr` / `mlinfiuhkxdhlveflbkj`. **Forbidden:** `cripqer-qa` / `tjigzcyoogmvdkivypym` (HARD_ABORT).
> **Outcome:** the migration **applied cleanly and completely**, but the required post-validation was **not** fully
> satisfiable, so the phase ends **FAIL** (see §18.9) — with **no rollback, no further DDL and no manual DROP**.
> **Token:** `CRIPQER_C3B_BUSINESS_CORE_SUPERMASTER_FAIL`

## 18.1 Deployment worktree and credential path

| Item | Value |
| --- | --- |
| Deployment worktree | `…\generador de QR - business-core-c3b` |
| Branch / commit | `feat/business-core-c3b-foundation` @ **`fb8783a`** (the migration blob is unchanged since `7a81f28`) |
| Worktree state at apply time | clean (`git status --porcelain` empty) |
| CLI | `supabase` **2.62.10** (`C:\Users\Lenovo\scoop\shims\supabase.exe`), linked to `mlinfiuhkxdhlveflbkj` |
| Credential used | the CLI login token already stored in the Windows Credential Manager (`Supabase CLI:supabase`), read **in memory only**; the Management API was used read-only with the same token |
| Apply command | `supabase db push --linked` (single `y` confirmation piped in) |
| QA involvement | **none** — no transaction, read or write, ever targeted the frozen QA ref; every helper hard-aborts on it |

## 18.2 Local preflight — deployment-worktree proof

| Required proof | Result |
| --- | --- |
| 19 migration files through `20260925000000` | **19** |
| 19 unique migration versions | **19 unique**, 0 duplicates |
| `20260924000000` = `premium_redeem_codes` | yes |
| `20260924000001` = `legacy_profile_magic_bridge` | yes |
| `20260924000002` = `permanent_public_identity_contract` | yes |
| `20260925000000` = `business_core_foundation` | yes |
| All four files git-tracked | yes |
| C3B LF SHA-256 = `B1CD4A622F34285A10087A6A0BFC91E0D1D51F9F38C5EDC8A7D169B012E6008E` | **match** (guard A5) |
| C3B git blob = `2a04bedc21db2fee6d7d6b3367d30e90d2213529` | **match** (guard A5b, `git hash-object`) |
| No uncommitted migration changes | yes (clean) |

Abort conditions (`canonical lineage only in another worktree`, `missing 2026092400000[12]`, `hash differs`, `duplicate version`): **none triggered**.

## 18.3 Target identity (printed exactly)

```text
TARGET_PROJECT_NAME=codigos qr
TARGET_PROJECT_REF=mlinfiuhkxdhlveflbkj
FORBIDDEN_QA_REF=tjigzcyoogmvdkivypym
```

Authorization was **never** inferred from the implicit link: the guard requires an explicit `--project-ref`, and the
link file is only cross-checked (it agreed: `codigos qr` / `mlinfiuhkxdhlveflbkj`; a mismatch would have aborted).

## 18.4 Deployment-contract guard — remote mode (`--remote`)

`node scripts/c3b-canonical-deployment-contract.mjs --remote --project-ref mlinfiuhkxdhlveflbkj` → **verdict PASS, exit 0, 11/11 checks**
(evidence `scratch/c3b_r4_apply/guard-remote-preapply.json`, log `guard-remote-preapply.log`):

| Check | Result |
| --- | --- |
| A1 explicit target is not the frozen QA project | OK |
| A2 explicit project_ref = canonical remote | OK |
| A3 implicit link agrees (informational) | OK |
| A5 / A5b migration checksum + git blob | OK |
| A6 / A7 lineage collision-free, C3B version present | OK |
| A9 remote project name/ref = `codigos qr` / `mlinfiuhkxdhlveflbkj` | OK |
| A10 `CURRENT_REMOTE_LAST_MIGRATION = 20260924000002` | OK |
| A11 fingerprint = 22/320/30/53/13/81 | OK |
| A12 no Business Core table remotely (history rows = 18) | OK |

## 18.5 Remote preflight (read-only, Management API `POST /database/query`)

Identical probe before the apply (`scratch/c3b_r4_apply/preflight-remote.log`, `preflight-analytics.sql`):

| Probe | Expected pre-state | Measured | |
| --- | --- | --- | --- |
| migration history rows | 18 | **18** | ✅ |
| last migration | `20260924000002` | **`20260924000002`** | ✅ |
| fingerprint | 22 / 320 / 30 / 53 / 13 / 81 | **22 / 320 / 30 / 53 / 13 / 81** | ✅ |
| C3B tables present | 0 | **0** | ✅ |
| C3B functions present | 0 | **0** | ✅ |
| `qr_analytics` rows | 29 | **29** | ✅ |
| `qr_analytics` newest event | `2026-09-27 16:33:02.380464+00` | **identical** | ✅ |
| `track_analytics_event` 13-arg RPC | 1 | **1** | ✅ |
| analytics views `security_invoker=true` | 2 | **2** | ✅ |
| `qr_analytics` SELECT / INSERT policies | 2 / 0 | **2 / 0** | ✅ |
| `profiles` total / published | 17 / 8 | **17 / 8** | ✅ |
| `pages` total | 35 | **35** | ✅ |

QA writes: **0** (QA was never contacted).

## 18.6 Apply

**Dry-run / migration plan** (`supabase db push --linked --dry-run`, `step3-dryrun.log`):

```text
Initialising login role...
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Would push these migrations:
 • 20260925000000_business_core_foundation.sql
Finished supabase db push.
```

Exactly **one** pending migration; **no** `20260924*` migration was pending; the target was the linked canonical
project (independently verified in §18.4). No abort condition of the `apply.safety` block was triggered.

**Apply** (2026-09-27 18:49, `step4-apply.log`):

```text
Initialising login role...
Connecting to remote database...
Do you want to push these migrations to the remote database?
 • 20260925000000_business_core_foundation.sql
 [Y/n] y
Applying migration 20260925000000_business_core_foundation.sql...
Finished supabase db push.
apply_exit=0
```

Only that file was applied. No bulk application, no QA migration, no `migration repair`, no unrelated DDL,
no seed change, no application deploy, no CRM UI, no Forms, no Campaign Engine.

## 18.7 Post-state verification (after apply)

### Core state (`poststate.log`, `poststate-core.sql`)

| Item | Expected | Measured | Verdict |
| --- | --- | --- | --- |
| migration history rows | 19 | **19** | ✅ |
| last migration | `20260925000000` | **`20260925000000`** | ✅ |
| history list | 18 previous + new, ascending | **exact match** (all 18 retained, the new one last) | ✅ |
| relations | 30 | **30** | ✅ |
| columns | 394 | **394** | ✅ |
| functions | 35 | **35** | ✅ |
| policies | 61 | **61** | ✅ |
| triggers | 13 | **13** | ✅ |
| indexes | 99 (planned) | **111** | ⚠ explained in §18.8-D2 |
| C3B tables present | 8 | **8** | ✅ |
| C3B functions present | 5 | **5** | ✅ |

### Schema / security (`poststate-security.sql`, `evidence-acl-index.log`)

| Required check | Result | Verdict |
| --- | --- | --- |
| 8/8 tables exist | **8** | ✅ |
| RLS enabled on all 8 tables | **all `true`** | ✅ |
| policies on the 8 tables | **8, all `SELECT`** | ✅ |
| anon policies | **0** | ✅ |
| PUBLIC/`public`-role policies | **0** | ✅ |
| direct INSERT/UPDATE/DELETE grants to `authenticated` | **0** | ✅ |
| SELECT grants to `authenticated` | **8** | ✅ |
| table grants to `anon` | **0** | ✅ |
| 5/5 functions present | **5** | ✅ |
| `SECURITY DEFINER` on the 5 functions | **all `true`** | ✅ |
| fixed empty `search_path` | **all five `search_path=""`** | ✅ |
| RPC arities (resolve_contact / create_lead_for_contact / record_business_activity / record_outcome / helper) | **5 / 7 / 8 / 7 / 0** | ✅ |
| cross-organization composite FKs | `leads_contact_fk`, `activities_contact_fk`, `contact_identities_contact_fk`, `contact_consents_contact_fk`, `attributions_lead_fk`, `outcomes_lead_fk` | ✅ |
| indexes on the 8 tables | **30** | ✅ |
| `authenticated` / `service_role` EXECUTE on the 4 RPCs | **true / true** | ✅ |
| `anon` EXECUTE on the 4 RPCs | **true** | ❌ **contract deviation — §18.8-D1** |
| ownership never supplied by the client | RPC signatures carry no owner/user argument; ownership derives from `auth.uid()` (argued in `C3B_RPC_CONTRACT_REPORT.md`, asserted by the local suite) | ✅ |

### Analytics regression (identical probe before and after)

`qr_analytics` rows **29** ✅ · newest event `2026-09-27 16:33:02.380464+00` (byte-identical to the pre-state) ✅ ·
`track_analytics_event` 13-arg overload = **1** ✅ · analytics views with `security_invoker=true` = **2** ✅ ·
`qr_analytics` SELECT / INSERT policies = **2 / 0** ✅ · `profiles` **17 / 8** ✅ · `pages` **35** ✅.
C2B8/C2B8A behaviour unchanged: the migration touches no analytics object (proved by `git diff` in R3 and by the
unchanged counters here). The only movement in that probe is `c3b_tables` 0 → 8 and `c3b_functions` 0 → 5.

### Residue check (`residue-check.sql`)

```text
organizations=0 contacts=0 contact_identities=0 contact_consents=0 leads=0 activities=0
attributions=0 outcomes=0 synthetic_profiles=0 synthetic_pages=0 synthetic_analytics=0
synthetic_auth_users=0 profiles_total=17 profiles_published=8 pages_total=35 qr_analytics_total=29
```

**Zero** Business Core rows and **zero** synthetic fixtures: the migration created schema only, and no real
profile, page or analytics row was touched (17 / 35 / 29 unchanged).

## 18.8 Deviations found by the post-validation

### D1 — `anon` holds EXECUTE on all C3B functions (contract violation; **not remediated**)

Measured ACLs (`evidence-acl-index.log`, read-only):

```text
create_lead_for_contact    acl={postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
current_organization_ids   acl={postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
record_business_activity   acl={postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
record_outcome             acl={postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
resolve_contact            acl={postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
```

* **Contract requirement (violated):** the C3B security contract ("RLS enabled on all 8 tables · 0 anon policies ·
  no direct client writes · **EXECUTE on anon/PUBLIC revoked for the RPCs**") and the suite's `A6`/`B11`
  assertions. Remote result: `anon_exec = true` for all 5 functions.
* **Root cause (exact):** the migration revokes only `FROM PUBLIC`
  (`REVOKE ALL ON FUNCTION public.<rpc>(...) FROM PUBLIC; GRANT EXECUTE ... TO authenticated;` — verified in the
  file). Supabase's project **default privileges** (`ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ON FUNCTIONS TO
  anon, authenticated, service_role`) attach an *explicit* `anon=X/postgres` ACL entry to every function created
  by `postgres` in `public`, so revoking `PUBLIC` cannot remove it. There is no bare `=X/postgres` entry, i.e. the
  grant is explicit for `anon`, not inherited.
* **Impact (assessed, bounded):** every RPC begins with an ownership guard that raises
  `not_authenticated` (`P0001`) when `auth.uid()` is NULL, so an `anon` caller cannot read or write data: the
  tables have 0 anon grants, RLS is on, 0 anon policies. The deviation is a **defense-in-depth / contract**
  failure (an unauthenticated caller can reach the RPC surface), not data exposure.
* **Why the local 64/64 run could not catch it:** the throw-away local harness does not emulate Supabase's
  default privileges, so `REVOKE ... FROM PUBLIC` was sufficient there.
* **Remediation (NOT applied — needs its own authorization):** one follow-up migration containing, per function,
  `REVOKE ALL ON FUNCTION public.<rpc>(<signature>) FROM anon;` (and
  `REVOKE ALL ON FUNCTION public.current_organization_ids() FROM anon;`). No object is dropped, no data touched.

### D2 — index fingerprint 111 instead of the planned 99 (planning under-count, not a defect)

`pg_indexes` counts every index in `public`, including the indexes that back PK/UNIQUE constraints. The 8 new
tables add **30** indexes (`c3b_index_total=30`), not 18:

| Component | Count |
| --- | --- |
| explicit `CREATE INDEX` | 16 |
| explicit `CREATE UNIQUE INDEX` | 2 |
| primary-key indexes (`*_pkey`, `contype='p'`) | 8 |
| UNIQUE-constraint indexes (`organizations_owner_user_id_key`, `contacts_id_organization_id_key`, `leads_id_organization_id_key`, `contact_identities_org_type_value_key`, `contype='u'`) | 4 |
| **total** | **30** |

81 + 30 = **111**, exactly the measured value. The expected `99` (= 81 + 18) counted only the explicit
`CREATE INDEX` statements, so §8-A / §16.6 of this ledger are corrected by this section.

### D3 — the remote 64-assertion contract run could NOT be executed (credential path)

The suite needs a real Postgres session (transactions, savepoints, role switching, two parallel connections).
No usable database credential is obtainable in this environment:

| Attempt | Result |
| --- | --- |
| `GET /v1/projects/{ref}/config/database/pgbouncer` | HTTP 200, but the `connection_string` password is a **15-character masked placeholder** (`[YOUR-PASSWORD]`, `placeholder_like=true`) |
| `GET /v1/projects/{ref}/config/database/postgres` | HTTP 200 with an **empty body** (no password field) |
| `GET /v1/projects/{ref}/config/database` | HTTP 404 (endpoint absent in this API version) |
| `GET /v1/projects/{ref}/database/jit` · `/jit/list` | HTTP 406 · empty list (no reusable login-role credential for a personal access token) |
| `~/.supabase/access-token` · a SUPERMASTER `SUPABASE_DB_PASSWORD` | not present anywhere on this machine |

The CLI itself can still migrate (it obtains its own short-lived login role internally — the
`Initialising login role...` step of §18.6), but that credential is not exposed to third-party scripts.

**Substitute evidence actually produced against SUPERMASTER** (read-only SQL through the Management API): every
*structural* contract family — table existence, RLS, policy set and commands, table/function privileges and full
function ACLs, `SECURITY DEFINER`, fixed `search_path`, RPC arities, composite cross-org FKs, index inventory,
migration history and the analytics regression — is verified in §18.7; the ACL check is precisely what surfaced
D1. The *behavioural* families (B–G: identity resolution, lead policy, timeline, outcomes, isolation,
concurrency) were last executed **64/64 PASS** against these identical migration bytes on the local Postgres 17
harness (§16.5) and could not be re-run remotely. **No remote 64/64 claim is made.**
An `--canonical-remote` mode (explicit ref, QA hard abort, Management-API credential fetch, session-pooler
routing, positive environment discrimination through `to_regclass`) was added to the runner for this purpose and
is committed; it stops at the credential step with the documented reason.

### D4 — the machine-level Vitest blocker is unchanged

Re-checked during R4: `node node_modules/vitest/vitest.mjs run src/lib/business-core` →
`TypeError: Cannot read properties of undefined (reading 'config')`, `Test Files 1 failed (1)`, `Tests no tests`
— identical to §16.5-B. No dependency was reinstalled or repaired, as required.

## 18.9 Verdict and controlled recovery

**Token: `CRIPQER_C3B_BUSINESS_CORE_SUPERMASTER_FAIL`.**

The migration applied cleanly and produced exactly the intended schema (8 tables / 5 functions / RLS / 8
owner-only SELECT policies / 6 composite cross-org FKs / 30 indexes / fixed `search_path`), with Analytics V1.1
and all real data untouched and zero residue. The phase nevertheless ends **FAIL** because two required items
were not satisfied: **D1** (RPC EXECUTE privileges do not match the contract — `anon` retains EXECUTE) and **D3**
(the required remote 64-assertion run could not be executed for lack of a database credential).

Per the R4 rules the phase **STOPPED** here:

* no rollback was attempted — the schema may already hold committed objects;
* **no further migration** was applied;
* **no object was manually DROPped**;
* **no GRANT/REVOKE was issued** to "fix" D1 (that requires its own authorization);
* the exact post-state is captured in §18.7 and under `scratch/c3b_r4_apply/`.

Recommended controlled recovery (separate, explicitly authorized task):

1. one migration reverting `anon` EXECUTE on the 5 functions (`REVOKE ALL ON FUNCTION … FROM anon`);
2. provide a database credential (or a dedicated runner privilege) so the behavioural 64-assertion families can
   be executed remotely;
3. re-run the remote structural + behavioural validation and confirm `anon_exec` 4 → 0.

## 18.10 Attestation — what R4 did and did not do

* ✅ Applied **exactly one** migration to the canonical SUPERMASTER, after every mandated preflight gate passed.
* ✅ QA (`cripqer-qa` / `tjigzcyoogmvdkivypym`) received **zero** reads for deployment and **zero** writes.
* ❌ No bulk/unexpected migration, no `migration repair`, no unrelated DDL, no seed change.
* ❌ No application deploy, no CRM UI, no Forms, no QR Campaign Engine.
* ❌ No rollback, no manual `DROP`, no manual privilege change after the deviation was found.
* ❌ No push, no PR, no merge.
* ✅ Reads used: local files/git, the Management API (SELECT-only, through a read-only-guarded helper), and the
  CLI's own dry-run.
* ✅ Secrets: the CLI access token was read from Windows Credential Manager **in memory only** and was never
  printed or persisted; the database password is a masked placeholder and was never recoverable.
