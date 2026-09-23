# CRIPQER Analytics V1.1 — Phase C2B4B Report

## Real QR Scan Boundary (QA-only)

- Task: `CRIPQER_ANALYTICS_V1_1_PHASE_C2B4B_REAL_QR_SCAN_BOUNDARY`
- Mode: `FORENSIC_DESIGN_THEN_QA_IMPLEMENTATION`
- Success state: **PHASE_C2B4B_REAL_QR_SCAN_BOUNDARY_PASS**

---

## 1. Git identity

| Field | Value |
| --- | --- |
| HEAD BEFORE | `6e6be499e0b4c686c123e98918bf32a74de40d9e` |
| HEAD AFTER | `6e6be499e0b4c686c123e98918bf32a74de40d9e` (no commit — working-tree only, per Lovable no-history-rewrite rule) |
| QA project | `tjigzcyoogmvdkivypym` ✅ |
| Production | `mlinfiuhkxdhlveflbkj` — **untouched** |

---

## 2. Current QR payload forensics (read-only)

| Signal | Finding |
| --- | --- |
| Page QR destination | `getPublicPageUrl(public_id)` → `https://www.cripqer.dev/pg/{public_id}` (encodes public_id **directly**) |
| Profile QR destination | `getPublicProfileUrl` → `/p/{public_id}`, or alias `/ {slug}` |
| QR generation | `qrcode.react` (QRCodeCanvas/SVG) + `QRCodeAdvanced`; the encoded value is the plain page URL |
| `/pg/{public_id}` route | emits only `session_start` + `page_view` (canonical writer in QA) |
| `/pg/a/{slug}` route | emits only `session_start` + `page_view` |
| Redirect routes | `d.$shortUrl.tsx` = encrypted-doc delivery (NOT QR); no `/q/` or `/scan/` route exists |
| `scan_count` | `profiles.scan_count` + `increment_scan_count(p_id)` — a legacy **visit counter** incremented on every profile visit (`/p/{id}` and `/{slug}`), direct or QR |
| QR identifier table | **none** (only `pages.qr_config` styling; `qr_visual_versions` history) |
| `qr_analytics.qr_id` | column exists (C2A) but is **never written** by any writer |

### 2.1 Forensic answer

> **What technically distinguishes (A) "user scanned a Cripqer QR" from
> (B) "user opened the same public URL directly"? — NOTHING, today.**
>
> QR codes encode `/pg/{public_id}` verbatim; the route treats every visit the
> same (page_view only); `scan_count` counts direct visits too. There is no
> QR-specific path, token, query marker, or redirect boundary.

No truthful boundary existed before this phase. Per the truth rule, a direct
`/pg/{public_id}` visit must NOT become a `qr_scan`.

---

## 3. Selected QR architecture

**Option A — dedicated QR redirect namespace `/q/{public_id}`** (client-side
redirect for session continuity, server-validated):

```
QR payload
  → /q/{public_id}
  → (server) validate public_id resolves to a PUBLISHED page
  → (client) emit ONE canonical qr_scan (qr_id=public_id, source=qr, same browser session)
  → redirect to /pg/{public_id}
  → session_start + page_view + CTA/social action (same session)
```

### Why selected

- Truthful: `/q/` exists only for QR codes; it is never a shareable canonical URL.
- Preserves page route semantics (still lands on `/pg/{public_id}`).
- Reuses the only stable identity today (`public_id`) — **no new identifier invented**.
- Historical `/pg/{public_id}` QRs keep working as page views (not retroactively scans).

Rejected: Option B (forgeable/shared query marker — weak). Option C (no existing dynamic QR boundary).

---

## 4. Historical QR compatibility

- Existing printed QRs point at `/pg/{public_id}` → **unchanged**, continue as page views.
- No `public_id` changes, no payload rewrite, no reprint required.
- New QRs may encode `/q/{public_id}` going forward.

## 5. QR identity contract

- No separate QR identifier existed; **reused `page.public_id`** as the QR identity.
- Persisted into `qr_analytics.qr_id` for `qr_scan` rows.
- Future multi-QR / campaign / location attribution → a dedicated `qr_identifiers`
  table is the designed next step (documented, not invented prematurely).

## 6. QA QR URL example

`https://www.cripqer.dev/q/{public_id}` → `https://www.cripqer.dev/pg/{public_id}`

(QA ran against cripqer-qa via the canonical RPC; the route is QA-only.)

---

## 7. QA results (DB truth via `scripts/qa-c2b4b-qr-scan-boundary.mjs`)

5 journeys written through the canonical RPC (anon key), read back with service role.

| Result | Value |
| --- | --- |
| QR_SCAN DB RESULT | 3 `qr_scan` rows, each `qr_id = qa-c2b2-canonical-page`, `source = qr` ✅ |
| DIRECT VISIT NEGATIVE | 2 direct `/pg` visits → 0 `qr_scan` ✅ |
| SLUG VISIT NEGATIVE | 1 `/pg/a` (slug) visit → 0 `qr_scan` ✅ |
| SESSION/JOURNEY CONTINUITY | scan + session_start + page_view (+ CTA) share one `session_id` ✅ |
| FUNNEL DB RESULT | full journey (scan→view→interaction) persisted; drop-after-page persisted |
| DEDUP RESULT | one scan per journey; 3 distinct scans (repeat allowed, not over-deduped) |
| BOT/PREFETCH RESULT | not applicable to RPC-level QA; no fingerprinting added |

## 8. FUNNEL ENGINE RESULT

`src/components/intelligent-analytics/qr-funnel.test.ts` (6 tests) proves the
deterministic engine produces: scan→page→interaction→action = full funnel;
scan→page = drop after page; direct visit = qr_scan 0 / page_view 1; shared
link = qr_scan 0; two scans = two journeys; qr_scan does not inflate
interactions/channels/top-links/devices.

## 9. QR GENERATION RESULT / OLD QR RESULT

- New QR path `/q/{public_id}` resolves → redirects to `/pg/{public_id}` (route logic; QA-only).
- Old QR `/pg/{public_id}` behavior unchanged (page view, no scan).
- No production QR generation change in this phase.

## 10. TEST / BUILD / LINT

| Check | Result |
| --- | --- |
| QR boundary unit tests (writer qr_scan +3, funnel +6) | ✅ |
| Direct/slug negative + journey + dedup tests | ✅ |
| Existing 65 Analytics tests | ✅ unchanged |
| Full analytics suite | ✅ **74/74 PASS** (13 files) |
| Full production build (`vite build`) | ✅ PASS (`✓ built in 9.46s`) |
| Focused ESLint | ✅ 0 errors |

## 11. Files

Modified:

- `src/lib/analytics/canonical-writer.ts` (qr_scan allowlist + qrId + source default)
- `src/lib/analytics/canonical-writer.test.ts` (allowlist + qr_scan tests)
- `src/routes/$alias.tsx` (`q` reserved)

Created:

- `src/routes/q.$publicId.tsx` (QR scan redirect boundary)
- `src/components/intelligent-analytics/qr-funnel.test.ts`
- `supabase/migrations/20260922000003_qr_scan_boundary.sql`
- `scripts/qa-c2b4b-qr-scan-boundary.mjs`
- this report

## 12. QA SQL / RPC changes

- `track_analytics_event` gained `p_qr_id TEXT DEFAULT NULL` (13-arg overload; old overloads dropped).
- `qr_scan` admitted to the allowlist.
- `source` forced to `'qr'` for `qr_scan`; `qr_id` persisted.

## 13. Compliance

| Indicator | Value |
| --- | --- |
| PRODUCTION SQL EXECUTED | false |
| PRODUCTION QR CHANGED | false |
| PRODUCTION TRACKING CHANGED | false |
| FROZEN AREAS TOUCHED | false |
| READY_FOR_C2B5 | YES |

**State:** `PHASE_C2B4B_REAL_QR_SCAN_BOUNDARY_PASS`
**Next:** `PHASE_C2B5_SECURITY_AND_PRODUCTION_READINESS`

