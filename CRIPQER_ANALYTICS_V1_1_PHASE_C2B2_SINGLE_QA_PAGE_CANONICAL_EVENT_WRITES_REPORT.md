# CRIPQER Analytics V1.1 — Phase C2B2 Report

## Single QA Page Canonical Event Writes (QA-only)

- Task: `CRIPQER_ANALYTICS_V1_1_PHASE_C2B2_SINGLE_QA_PAGE_CANONICAL_EVENT_WRITES`
- Mode: `QA_RUNTIME_EVENT_INSTRUMENTATION_ONLY`
- Success state: **PHASE_C2B2_SINGLE_QA_PAGE_CANONICAL_EVENT_WRITES_PASS**

---

## 1. Git / Runtime identity

| Field | Value |
| --- | --- |
| HEAD BEFORE | `e3fce2be17ded7ee2f7bbe90d344fd9cc6d4b7da` |
| HEAD AFTER | `e3fce2be17ded7ee2f7bbe90d344fd9cc6d4b7da` (no commit — working-tree changes only, per Lovable no-history-rewrite rule) |
| RUNTIME SUPABASE PROJECT REF | `tjigzcyoogmvdkivypym` (cripqer-qa) — asserted at write time |
| PRODUCTION PROJECT REF | `mlinfiuhkxdhlveflbkj` (untouched) |

## 2. Synthetic QA entities (cripqer-qa only)

| Entity | Id |
| --- | --- |
| QA PAGE ID | `a9fccf9d-ea12-45a4-8262-2a55efdc1198` |
| QA PUBLIC_ID | `qa-c2b2-canonical-page` |
| QA SLUG | `qa-c2b2-canonical-page` |
| QA PROFILE ID | `558cab85-76c3-4b06-9a3f-9031756a9850` |
| QA USER ID | `9f3646a5-d1b4-424e-917f-3b153e018a88` |
| QA EMAIL | `qa-c2b2-analytics@cripqer.test` |

The page is a published `direct-page` envelope containing text/content, one normal
external link, one hero CTA, a WhatsApp link and an Instagram link — exactly the
surface required for the single-page funnel.

## 3. Canonical writer location

- `src/lib/analytics/canonical-writer.ts` — `createCanonicalWriter().track()` (the ONE `trackAnalyticsEvent` boundary).
- `src/lib/analytics/qa-runtime-guard.ts` — production refusal gate.
- `src/lib/analytics/session.ts` — single `sessionStorage["qr_session_id"]` contract.
- `src/lib/analytics/browser.ts` — memoized browser-boundary singleton.
- `src/lib/analytics/index.ts` — barrel (excludes the browser-boundary so unit tests stay Supabase-free).

## 4. Write boundary architecture

```
browser interaction
  -> resolveCanonicalClickType (intent -> canonical event_type)
  -> createCanonicalWriter().track()
       validate allowlist · assertQaRuntime (STOP on production)
       getOrCreateSessionId · idempotency (session_start / page_view)
  -> RPC public.track_analytics_event (SECURITY DEFINER)
       derive page_id + profile_id from public_id (published only)
       validate event_type allowlist · normalize platform
       dedupe session_start per session_id · bound metadata
  -> qr_analytics (canonical store)
  -> read adapter (fromLegacyAnalyticsRecords)
  -> Intelligent Analytics real-data mode
```

## 5. Session contract

- Source: `sessionStorage["qr_session_id"]` (reused — no second session system).
- Id contains no email/name/PII (timestamp + random suffix).
- `session_start` deduplicated server-side per `session_id`; `page_view` deduplicated
  client-side per `pageId|sessionId` (synchronous, before any await, so StrictMode /
  hydration double-invocations collapse to one write).

## 6. Event results (persisted in qr_analytics)

| Event | Persisted | Platform |
| --- | --- | --- |
| session_start | ✅ | null |
| session_start (duplicate) | ✅ rejected (NULL) | — |
| page_view | ✅ | null |
| cta_click | ✅ | null |
| whatsapp_click | ✅ | `whatsapp` |
| instagram_click | ✅ | `instagram` |
| external_link_click | ✅ | null |
| qr_scan | ❌ rejected (not allowlisted) | — |

## 9. Read adapter / dashboard result

- `analyticsRealDataService.getRealPageEvents()` reads the bounded `qr_analytics` window.
- Adapter resolves canonical `event_type` verbatim and prefers the normalized
  `qr_analytics.platform` (EXACT) over legacy `interaction_type`.
- Real-data mode consumes these rows; session-dependent widgets unlock where
  `session_id` is present (session tracking available).
- Devices / geography / traffic-sources remain truthfully unavailable because the
  current QA funnel persists no device/geo/source fields (no fabrication).
- Full dashboard UI count-vs-DB comparison remains the manual browser QA step.

## 10. Security boundary result

- Browser is trusted only for `public_id`, event intent and bounded metadata.
- Owner `user_id`, `profile_id` and `page_id` are derived server-side from a published page.
- Event types are allowlisted (qr_scan / lead_created / share / return_visit rejected).
- Metadata is length-bounded. No broad direct INSERT policy is used.

## 11. Validation results

| Check | Result |
| --- | --- |
| Full production build (`npm run build`) | ✅ PASS |
| Canonical writer tests (11) | ✅ PASS |
| Adapter / capability / persistence-evolution tests (20) | ✅ PASS |
| Focused ESLint on touched files | ✅ PASS (0 errors) |
| Focused TypeScript | ✅ no new errors (global pre-existing debt excluded) |

## 12. Files modified / created

Created:
- `src/lib/analytics/canonical-writer.ts`
- `src/lib/analytics/qa-runtime-guard.ts`
- `src/lib/analytics/session.ts`
- `src/lib/analytics/browser.ts`
- `src/lib/analytics/index.ts`
- `src/lib/analytics/canonical-writer.test.ts`
- `supabase/migrations/20260922000001_canonical_analytics_write_boundary.sql`
- `scripts/qa-db.mjs`, `scripts/qa-seed-analytics-page.mjs`, `scripts/qa-verify-analytics-write.mjs`

Modified:
- `src/components/intelligent-analytics/cripqer-event-adapter.ts` (read `platform` column)
- `src/routes/pg.$publicId.tsx` (QA-gated canonical instrumentation)
- `src/routes/pg.a.$slug.tsx` (QA-gated canonical instrumentation)

## 13. QA SQL / RPC created

- `ALTER TABLE public.qr_analytics ADD COLUMN IF NOT EXISTS platform TEXT` (QA only)
- `public.track_analytics_event(...)` RPC (QA only, `SECURITY DEFINER`, allowlisted)

## 14. Production protection

| Check | Value |
| --- | --- |
| PRODUCTION SQL EXECUTED | false |
| PRODUCTION DATA MODIFIED | false |
| PRODUCTION TRACKING ACTIVATED | false |
| QR_SCAN_IMPLEMENTED | false |
| FROZEN_AREAS_TOUCHED | false |
| VISUAL_GATE_DEBT | OPEN |
| READY_FOR_C2B3 | YES |

## 15. Notes

- `pg` was installed with `npm install --no-save pg` only to power the QA DB helper
  (`scripts/qa-db.mjs`); it is not added to `package.json`.
- The literal browser funnel (login as QA owner → open public page → click → compare
  dashboard UI vs DB) is the remaining manual QA step; the write boundary, read adapter
  and persistence were verified end-to-end via the anon RPC (mimicking the browser) and
  unit tests.
- QA event rows are intentionally retained for the next analytics QA phases.


All six rows share the same `session_id`, `page_id` and `profile_id`.

## 7. Idempotency result

- 1 legitimate page open → 1 `page_view` (no pair from one render cycle).
- `session_start` duplicate write → rejected by the RPC.
- Clicks are never deduplicated (1 click = 1 event; a double click = 2 legitimate events).

## 8. Session continuity result

- `session_start`, `page_view`, `cta_click`, `whatsapp_click`, `instagram_click`,
  `external_link_click` all share one `session_id` → funnel stage continuity holds.
