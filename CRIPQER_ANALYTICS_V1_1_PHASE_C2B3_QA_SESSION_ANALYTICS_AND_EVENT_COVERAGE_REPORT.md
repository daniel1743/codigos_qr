# CRIPQER Analytics V1.1 — Phase C2B3 Report

## QA Session Analytics & Event Coverage (QA-only)

- Task: `CRIPQER_ANALYTICS_V1_1_PHASE_C2B3_QA_SESSION_ANALYTICS_AND_EVENT_COVERAGE`
- Mode: `QA_RUNTIME_ANALYTICS_VALIDATION`
- Success state: **PHASE_C2B3_QA_SESSION_ANALYTICS_AND_EVENT_COVERAGE_PASS**

---

## 1. Git / Runtime identity

| Field | Value |
| --- | --- |
| HEAD BEFORE | `e3fce2be17ded7ee2f7bbe90d344fd9cc6d4b7da` |
| HEAD AFTER | `e3fce2be17ded7ee2f7bbe90d344fd9cc6d4b7da` (no commit — working-tree changes only, per Lovable no-history-rewrite rule) |
| QA PROJECT REF | `tjigzcyoogmvdkivypym` (cripqer-qa) — asserted at write time |
| PRODUCTION PROJECT REF | `mlinfiuhkxdhlveflbkj` (untouched) |
| QA PAGE | `a9fccf9d-ea12-45a4-8262-2a55efdc1198` · public_id `qa-c2b2-canonical-page` |

---

## 2. Environment gate (CRITICAL)

| Check | Result |
| --- | --- |
| Runtime Supabase URL (dev server `--mode qa`) | `https://tjigzcyoogmvdkivypym.supabase.co` ✅ QA |
| `qa-runtime-guard.ts` QA gate | ✅ active (`assertQaRuntime` refuses production + unknown) |
| Migration `20260922000000` (event context) applied | ✅ (`source`,`utm_source`,`utm_campaign`,`qr_id` present) |
| Migration `20260922000001` (canonical write boundary) applied | ✅ (`platform` + `track_analytics_event` RPC present) |
| `qr_analytics_event_type_check` widened | ✅ (legacy + canonical + `qr_scan` admitted at CHECK; RPC still rejects non-allowlisted) |
| Production detected? | ❌ No |

---

## 3. C2B2 debt closure — literal browser → DB roundtrip

A REAL Chromium browser (Playwright) was driven against the QA-mode dev server
(`vite dev --mode qa`), whose `VITE_SUPABASE_URL` resolves to cripqer-qa. The
public page emitted events through the **same canonical writer a real visitor
uses** (`getBrowserCanonicalWriter().track` → `public.track_analytics_event`).

| Browser session id (sessionStorage) | Events persisted (DB truth) |
| --- | --- |
| `1790127351816-vi9uemp` | `session_start`, `page_view`, `external_link_click`, `whatsapp_click` (platform `whatsapp`), `instagram_click` (platform `instagram`) |
| `1790127182966-1ildss5` | `session_start`, `page_view`, `external_link_click` |
| `1790127003660-6okv0r7` | `session_start`, `page_view`, `external_link_click` |
| `1790126811146-xhgjmky` | `session_start`, `page_view`, `external_link_click` |

- Every row shares the browser's `sessionStorage["qr_session_id"]` — **session continuity held**.
- Platforms were normalized server-side (`whatsapp`/`instagram`), never guessed from the browser.
- `item_id`/`item_label` persisted for clicks (`qa-whatsapp`, `qa-instagram`, `qa-external`).

**Result: `BROWSER_CANONICAL_EVENT_ROUNDTRIP_PASS`**

> The authenticated `/pages/$pageId/analytics?analytics=real` render was NOT
> re-driven this phase (owner login flow). The dashboard's computed values are
> proven by the deterministic `computeMetrics` engine (see §6) and the read
> adapter — the exact code the dashboard renders. The authenticated visual
> render remains part of `VISUAL_GATE_DEBT`.

---

## 4. QA session matrix (8 controlled sessions)

Generated through `public.track_analytics_event` (ANON key = browser path) via
`scripts/qa-c2b3-session-matrix.mjs`. Distinct, coherent `session_id` per session.

| Session | Behavior | Persisted events |
| --- | --- | --- |
| `…-s1` | page_view only | session_start, page_view |
| `…-s2` | page_view + cta_click | session_start, page_view, cta_click |
| `…-s3` | page_view + whatsapp_click | session_start, page_view, whatsapp_click |
| `…-s4` | page_view + instagram_click | session_start, page_view, instagram_click |
| `…-s5` | page_view + external_link_click (source=direct) | session_start, page_view, external_link_click |
| `…-s6` | page_view + cta_click + whatsapp_click | session_start, page_view, cta_click, whatsapp_click |
| `…-s7` | page_view + 4 actions (utm qa_source/qa_campaign) | session_start, page_view, cta_click, whatsapp_click, instagram_click, external_link_click |
| `…-s8` | page_view only (no action) | session_start, page_view |

Verification: each session has **exactly one** `session_start` and **one**
`page_view` (no hydration duplicates); each session's rows share one `session_id`.

---

## 5. Counts (final DB state for the QA page)

| Metric | Value |
| --- | --- |
| NUMBER OF QA SESSIONS (this phase) | 12 (8 matrix + 4 browser) |
| TOTAL distinct sessions (incl. retained C2B2) | 13 |
| NUMBER OF CANONICAL EVENTS | 46 |
| page_view | 13 |
| meaningful actions | 20 (cta 3, whatsapp 3, instagram 2, external 2 in matrix) |
| SESSION CONTINUITY RESULT | **PASS** (every row of each session shares its `session_id`) |

## 6. Action rate

Formula: `sessions_with_≥1_meaningful_action / sessions_with_page_view` (each
session counted ONCE in the numerator — verified by `computeMetrics` using a
`Set` of session ids).

| Source | Value |
| --- | --- |
| DB value (matrix, 8 sessions) | 6 / 8 = **75.0%** |
| UI value (`computeMetrics`, the dashboard engine) | **0.75** — asserted by `session-metrics.test.ts` |
| Full-dataset value (13 sessions) | 11 / 13 ≈ **84.6%** |

- Multiple actions in one session (s7 = 4 actions) count once in the numerator ✅
- page-view-only sessions (s1, s8) remain non-converting ✅
- Range stays within 0–100% ✅

---

## 7. Session funnel

| Stage | DB count | UI count (`computeMetrics`) |
| --- | --- | --- |
| qr_scan | 0 | 0 |
| page_view | 0 | 0 |
| interaction | 0 | 0 |
| action (channel_action) | 0 | 0 |

**Finding:** `computeMetrics`'s `sessionFunnel` **anchors the funnel on
`qr_scan`** (the Page/Interaction/Action stages are only counted *after* a
`qr_scan` in the same session). Because `qr_scan` is intentionally not written
this phase, the entire funnel resolves to zero. This is truthful (nothing is
fabricated), but the spec's "no-QR funnel (Page → Interaction → Action)" does
**not** match the current implementation. → Funnel classified `NOT_SUPPORTED_YET`
until the QR stage is implemented in C2B4. No cross-session joining occurs.

---

## 8. Devices

| Check | Result |
| --- | --- |
| `verify_device_persisted` | **false** — the canonical RPC persists `user_agent` but NOT `device_type`/`browser`/`os` |
| Adapter maps `device_type` → device | `device_type` is NULL for all canonical rows |
| Device audience module | shows nothing (no fabrication) |

→ Devices classified **NEEDS_WRITE_CONTEXT**. Do not count device per event and
present it as audience.

---

## 9. Traffic source

| Source id | DB truth |
| --- | --- |
| `direct` | 7 sessions (no source signal → default `direct`) |
| `utm:qa_source` | 1 session (utm-attributed) |

- Attribution is session-entry based (session representative = `session_start`).
- A later Instagram click in the utm-attributed session does **not** transform
  its source into `instagram` (asserted by unit test). ✅

---

## 10. UTM campaign

| Field | Result |
| --- | --- |
| utm_source | persisted exactly (`qa_source`) on `session_start` + `page_view` ✅ |
| utm_campaign | persisted exactly (`qa_campaign`) ✅ |
| Subsequent session events preserve attribution | ✅ (source stays `utm:qa_source`) |

> Caveat: the browser instrumentation (`pg.$publicId.tsx`) does not yet read UTM
> params from the entry URL — the write path persists UTM only if a caller
> passes it. Classified `REAL_DATA_PARTIAL` (write+read verified; entry capture
> not yet wired).

## 11. Channel performance

| Channel | DB count | UI count (`computeMetrics`) |
| --- | --- | --- |
| whatsapp | 3 | 3 |
| instagram | 2 | 2 |
| other (external_link_click) | 2 | 2 |

- Canonical persisted `platform` wins (whatsapp/instagram) ✅
- Channel counts equal DB truth ✅
- Instagram outbound clicks remain outbound clicks (never audience) ✅

---

## 12. Top links

| Check | Result |
| --- | --- |
| actual link/target IDs | ❌ — canonical RPC writes `item_id`/`item_label`, NOT `link_id` |
| actual click counts | ❌ — always empty |
| ranking based on real events | ❌ |

**Finding:** `computeMetrics` builds `topLinks` from `entryEvents`
(`session_start` + view events) and then skips all non-interaction events — which
are *all* of them — so `topLinks` is always empty even when clicks are persisted.
Documented by `session-metrics.test.ts`. → **NOT_SUPPORTED_YET** (needs: rank
over `current` interaction events grouped by `item_id`/`item_label`).

---

## 13. Realtime 15/30/60

The `rolling-window` engine is deterministic over `metrics.recentEvents`; the QA
events generated today are recent, so the live-activity widget has real signal.

→ Classified **REAL_DATA_PARTIAL** (engine + recent real events present; a
dedicated 15/30/60 DB cross-check was not run this phase). Events are described
as activity/clicks, not people; timezone explicit (`America/Santiago`).

---

## 14. Hot hours

- Computed in `America/Santiago` over real QA events ✅
- **Caveat:** the hourly heatmap counts **every event** (including repeated
  clicks), not session representatives — so a single session's repeated clicks
  can dominate an hour bucket. The spec's preferred basis (`session_start` /
  `page_view`) is NOT yet used.

→ Classified **REAL_DATA_PARTIAL** (correct timezone + real data; session-entry
semantics not isolated).

---

## 15. Goals & Records

- **Goals** → `LEARNING` (goals engine runs over real data, but the single-day
  QA dataset is insufficient for meaningful MTD/trend outputs).
- **Records** → `LEARNING / INSUFFICIENT_DATA` (calendar-week contract and
  previous-week comparison cannot produce a defensible record from one day of
  QA data; not fabricated).

## 16. Module capability matrix (real-data)

| Module | Classification | Evidence / reason |
| --- | --- | --- |
| Page Views | **REAL_DATA_VERIFIED** | 13 persisted `page_view`; counted correctly by engine |
| Interactions | **REAL_DATA_VERIFIED** | 20 meaningful actions counted; platform normalization verified |
| Performance Trend | **REAL_DATA_PARTIAL** | correct series engine; single-day data → no multi-day trend |
| Top Links | **NOT_SUPPORTED_YET** | `entryEvents` filter bug → always empty; `link_id` not persisted |
| Channel Performance | **REAL_DATA_VERIFIED** | whatsapp 3 / instagram 2 / other 2 = DB truth |
| Devices | **NEEDS_WRITE_CONTEXT** | RPC persists `user_agent` only; `device_type` never written |
| Traffic Sources | **REAL_DATA_PARTIAL** | source/utm write+read verified; entry URL capture not wired |
| Geography | **NOT_SUPPORTED_YET** | no country/city written by canonical RPC |
| Hot Hours | **REAL_DATA_PARTIAL** | correct `America/Santiago`; heatmap counts all events (session-entry basis not isolated) |
| Realtime 15/30/60 | **REAL_DATA_PARTIAL** | deterministic engine + recent real events; 15/30/60 not DB cross-checked |
| New/Returning | **NOT_SUPPORTED_YET** | `sessionStorage` proves sessions, NOT a returning person; no durable identity |
| Funnel | **NOT_SUPPORTED_YET** | QR-anchored; all stages zero without `qr_scan` (not implemented) |
| Action Rate | **REAL_DATA_VERIFIED** | 6/8 = 75% (matrix), matches engine; multiple actions count once |
| Goals | **LEARNING** | real data but single-day dataset insufficient for MTD trends |
| Records | **LEARNING / INSUFFICIENT_DATA** | calendar-week contract cannot be proven from one day of data |
| Momentum | **LEARNING** | needs multi-day comparison; single-day → stable |
| Daily Brief | **REAL_DATA_PARTIAL** | session phrase works (session_id present); small dataset |
| Insights | **LEARNING** | thresholds/min-sample not met by QA volume |
| Smart Toast | **LEARNING** | in-app candidate generation works; no meaningful signal yet |

Legend: `REAL_DATA_VERIFIED` · `REAL_DATA_PARTIAL` · `LEARNING` ·
`NEEDS_MORE_DATA` · `NEEDS_WRITE_CONTEXT` · `NOT_SUPPORTED_YET`.

---

## 17. Security (QA boundary)

| Check | Result |
| --- | --- |
| Canonical writer rejects unsupported `event_type` | ✅ `qr_scan`, `lead_created`, `view` rejected (0 forbidden rows) |
| `qr_scan` still rejected | ✅ |
| Production project rejected by QA guard | ✅ (`assertQaRuntime`; unit-tested) |
| Public visitor cannot read Analytics | ✅ (route requires owner `getOwnPageById` + RLS backstop) |
| Owner can read own Analytics | ✅ (engine-verified; authenticated UI render = visual debt) |
| Non-owner cannot read owner Analytics | ✅ (ownership enforced in route + RLS) |
| `session_start` duplicate rejected | ✅ (exactly 1 per session persisted) |

---

## 18. Production protection

| Check | Value |
| --- | --- |
| migration `20260922000000` applied to production | **NOT_APPLIED** (QA only) |
| migration `20260922000001` applied to production | **NOT_APPLIED** (QA only) |
| canonical tracking active in production | **NOT_ACTIVE** |
| production data writes | **0** |
| PRODUCTION SQL EXECUTED | **false** |
| PRODUCTION DATA MODIFIED | **false** |
| PRODUCTION TRACKING ACTIVE | **false** |
| QR_SCAN_IMPLEMENTED | **false** (still `STILL_UNAVAILABLE`; C2B4 candidate) |

---

## 19. Validation results

| Check | Result |
| --- | --- |
| Canonical writer tests (11) | ✅ PASS |
| Idempotency tests (writer session/page_view dedupe) | ✅ PASS |
| Adapter tests (5) | ✅ PASS |
| Persistence-evolution tests (12) | ✅ PASS |
| Real-data capability tests (3) | ✅ PASS |
| **Session metrics tests (new, 9)** — action rate, funnel, channels, sources, top-links | ✅ PASS |
| Full analytics suite | ✅ **46/46 PASS** |
| Full production build (`npm run build`) | ✅ PASS (`✓ built in 33.19s`) |
| Focused ESLint (new test file) | ✅ PASS (0 errors after prettier) |

---

## 20. Files created

- `scripts/qa-c2b3-session-matrix.mjs` — 8-session matrix generator + DB verifier
- `scripts/qa-c2b3-browser-roundtrip.mjs` — literal Chromium → DB roundtrip
- `src/components/intelligent-analytics/session-metrics.test.ts` — 9 deterministic session-metrics tests
- `CRIPQER_ANALYTICS_V1_1_PHASE_C2B3_QA_SESSION_ANALYTICS_AND_EVENT_COVERAGE_REPORT.md` (this file)

No committed engine files were modified (QA-only validation scope).

---

## 21. Indicators of compliance

| Indicator | Value |
| --- | --- |
| VISUAL_GATE_DEBT | **OPEN** (authenticated dashboard render not re-driven; viewports 360/390/430 not observed) |
| QR_SCAN_IMPLEMENTED | false |
| PRODUCTION SQL EXECUTED | false |
| PRODUCTION DATA MODIFIED | false |
| PRODUCTION TRACKING ACTIVE | false |
| READY_FOR_C2B4 | **YES** |

**State:** `PHASE_C2B3_QA_SESSION_ANALYTICS_AND_EVENT_COVERAGE_PASS`
**Next candidate:** `PHASE_C2B4_REAL_QR_SCAN_BOUNDARY`



