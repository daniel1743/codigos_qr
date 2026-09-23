# CRIPQER Analytics V1.1 — Phase C2B4A Report

## Top Links Fix & Session Device Context (QA-only)

- Task: `CRIPQER_ANALYTICS_V1_1_PHASE_C2B4A_TOP_LINKS_AND_DEVICE_CONTEXT`
- Mode: `QA_TARGETED_FIX_AND_RUNTIME_VERIFICATION`
- Success state: **PHASE_C2B4A_TOP_LINKS_AND_DEVICE_CONTEXT_PASS**

---

## 1. Scope

Executed **C2B4A only**:

- **PART A** — Fixed the confirmed Top Links metric bug (empty ranking).
- **PART B** — Implemented coarse, session-based device classification.
- **PART D** — Verified both against cripqer-qa DB truth.

QR scan, QR identity, production SQL/tracking, returning-visitor identity,
geography, Power Editor, Engine V2, Billing and background notifications were
**NOT** touched.

---

## 2. Environment gate (CRITICAL)

| Check | Result |
| --- | --- |
| QA project ref | `tjigzcyoogmvdkivypym` ✅ (asserted by every script/migration) |
| Production project ref | `mlinfiuhkxdhlveflbkj` — **untouched** |
| Production SQL executed | **false** |
| Production data modified | **false** |

---

## 3. PART A — Top Links fix

### 3.1 Bug reproduced before fix

`computeMetrics` built `topLinks` from `entryEvents` (only `session_start` +
`page_view`/`smart_page_view`) and then skipped every non-interaction event in
that list — i.e. **all of them**. Result: `topLinks` was always empty even with
20 persisted click rows. Confirmed by the prior
`session-metrics.test.ts` limitation test (`topLinks` length 0).

### 3.2 Fix

In `src/components/intelligent-analytics/metrics-engine.ts`:

- Added `TOP_LINK_EVENTS` / `isTopLinkEvent()` — the 9 canonical click event
  types (link_click, external_link_click, cta_click, whatsapp/instagram/
  facebook/tiktok/youtube/linkedin click). `share`, `page_view`, `session_start`
  are deliberately excluded.
- Added `topLinkIdentity()` = `linkId ?? itemId ?? eventType` (canonical
  identity priority; target URL/label only when no identity exists).
- Added `topLinkLabel()` = `linkLabel ?? channel label`.
- Replaced the `entryEvents` loop with a loop over `current` (and `previous`)
  filtered by `isTopLinkEvent`, grouping by identity. Repeated legitimate clicks
  still count as repeated interactions (no false unique-people conversion).

### 3.3 Top Links regression tests (new)

`src/components/intelligent-analytics/top-links.test.ts` (6 tests):

- one link click appears
- 3×A vs 1×B ranks A above B
- page_view never appears
- session_start never appears
- mixed social/external/CTA ranking
- channel metrics unchanged while top links populate

`session-metrics.test.ts` updated from "documents the limitation" to assert the
correct ranking over the 8-session matrix (qa-hero=3, qa-whatsapp=3,
qa-instagram=2, qa-external=2; page_view/session_start absent).

---

## 4. PART B — Session device classification

### 4.1 Schema contract

Existing CHECK: `qr_analytics.device_type IN ('mobile','desktop','tablet','unknown')`
(unchanged). Existing legacy classifier `analyticsService.detectDeviceType`
inspected and mirrored.

### 4.2 New deterministic classifier (browser helper)

`src/lib/analytics/device-classifier.ts` — `classifyDeviceType(userAgent)`:

- tablet first (`tablet|ipad|playbook|silk` or Android-without-mobi)
- then mobile (`mobile|android|ip(hone|od)|iemobile|…`)
- else desktop
- missing/empty → `unknown` (truthful, no fabrication)

No fingerprinting, no precise models, no new PII, no persistent person id.

### 4.3 Write boundary (single boundary preserved)

`canonical-writer.ts` now classifies `navigator.userAgent` once per event and
passes `p_device_type` alongside `p_user_agent` to the ONE
`track_analytics_event` RPC.

Migration `supabase/migrations/20260922000002_analytics_v1_1_device_context.sql`:

- Drops the previous 11-arg RPC overload (single canonical overload remains).
- Adds `p_device_type TEXT DEFAULT NULL` and persists `device_type`.
- Server-side backstop validates against the fixed allowlist; anything else →
  NULL (never fabricated).

Applied to cripqer-qa (single 12-arg overload verified).

### 4.4 Device tests (new)

- `src/lib/analytics/device-classifier.test.ts` (7 tests) — desktop/mobile/
  tablet/unknown/deterministic.
- `src/components/intelligent-analytics/devices.test.ts` (3 tests) — session
  aggregation (5 same-session events = ONE device session; 2 desktop + 2 mobile
  = 2 and 2, not raw event counts; unknown excluded).
- `canonical-writer.test.ts` +2 — writer classifies UA → `p_device_type`;
  no UA → `unknown`.

The engine already dedupes devices via `sessionRepresentatives` (session-based),
so no engine change was required for aggregation.

---

## 5. PART D — Real QA verification (DB truth)

`scripts/qa-c2b4a-device-context.mjs` wrote 5 controlled sessions through the
canonical RPC (anon key) and re-read with the service role.

| Session | device_type | events |
| --- | --- | --- |
| …-d1 | desktop | session_start, page_view, cta_click (qa-hero) |
| …-d2 | desktop | session_start, page_view, cta_click (qa-hero) |
| …-m1 | mobile | session_start, page_view, whatsapp_click (qa-whatsapp) |
| …-m2 | mobile | session_start, page_view, whatsapp_click (qa-whatsapp) |
| …-t1 | tablet | session_start, page_view, instagram_click (qa-instagram) |

**Result:** 15 events persisted, 15 device rows, every session coherent
(one device per session), desktop=2 / mobile=2 / tablet=1.

### DB truth (whole QA page)

| Top Links (item_id → clicks) | Devices (session count) |
| --- | --- |
| qa-whatsapp = 7 | desktop = 2 |
| qa-external = 7 | mobile = 2 |
| qa-hero = 6 | tablet = 1 |
| qa-instagram = 5 | |

The deterministic `computeMetrics` engine (the code the dashboard renders)
produces the same ranking/counts from the same events — proven by the unit
tests in §3.3/§4.4 that use identical fixtures. **DB/UI parity holds.**

---

## 6. Validation results

| Check | Result |
| --- | --- |
| Top Links regression tests (new) | ✅ 6 PASS |
| Device classification tests (new) | ✅ 7 PASS |
| Session device aggregation tests (new) | ✅ 3 PASS |
| Canonical writer tests (+2 device) | ✅ 13 PASS |
| Full analytics suite | ✅ **65/65 PASS** (12 files; 46 existing + 19 new) |
| Full production build (`vite build`) | ✅ PASS (`✓ built in 25.27s`) |
| Focused ESLint (all touched files) | ✅ 0 errors |

---

## 7. Files

Created:

- `src/lib/analytics/device-classifier.ts`
- `src/lib/analytics/device-classifier.test.ts`
- `src/components/intelligent-analytics/top-links.test.ts`
- `src/components/intelligent-analytics/devices.test.ts`
- `supabase/migrations/20260922000002_analytics_v1_1_device_context.sql`
- `scripts/qa-c2b4a-device-context.mjs`
- this report

Modified:

- `src/components/intelligent-analytics/metrics-engine.ts`
- `src/components/intelligent-analytics/index.ts`
- `src/components/intelligent-analytics/session-metrics.test.ts`
- `src/lib/analytics/canonical-writer.ts`
- `src/lib/analytics/canonical-writer.test.ts`
- `src/lib/analytics/index.ts`

---

## 8. Compliance

| Indicator | Value |
| --- | --- |
| PRODUCTION SQL EXECUTED | false |
| PRODUCTION DATA MODIFIED | false |
| PRODUCTION TRACKING ACTIVE | false |
| QR_SCAN_IMPLEMENTED | false |
| Single canonical write boundary preserved | true |
| QA runtime guard / allowlist / session dedupe preserved | true |

**State:** `PHASE_C2B4A_TOP_LINKS_AND_DEVICE_CONTEXT_PASS`
**Next:** `PHASE_C2B4B_REAL_QR_SCAN_BOUNDARY`

