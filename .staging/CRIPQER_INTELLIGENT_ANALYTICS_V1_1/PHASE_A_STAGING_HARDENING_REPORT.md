# Cripqer — Intelligent Analytics V1.1 Phase A Staging Hardening

**Task:** `CRIPQER_ANALYTICS_V1_1_PHASE_A_STAGING_HARDENING`  
**Modo:** isolated staging only  
**HEAD BEFORE / AFTER:** `7c3bfe98d59d553cef440683c8e4c3e51c6caba1`  
**Package SHA256:** `4B193B103A959262EC5DAE95073A710852C2B2763EBEFDD7BC85F4F18D35ADD9`

## Scope

The original ZIP was preserved. The package was extracted only to this staging directory. No production file, route, SQL migration, RPC, RLS policy, Billing persistence, QR identity, Engine V2, Power Editor, Direct Editor runtime or published-page runtime was modified.

## Files created or modified in staging

- `timezone.ts` — explicit IANA timezone calculations.
- `cripqer-event-adapter.ts` — isolated `toAnalyticsEventV1` boundary for current legacy events.
- `metrics-engine.ts` — timezone-aware ranges, calendar weeks, MTD metrics, session audience aggregation and session-continuous funnel.
- `goals-engine.ts` — goals use MTD values independently of the visible period selector.
- `rolling-window.ts` — explicit timezone for hour-of-day baselines.
- `intelligence-engine.ts`, `daily-brief.ts`, `components/widgets.tsx` — truth-safe interaction wording; clicks are not people and interactions/view is not labelled CTR.
- `widget-registry.ts` — low-data decisions happen before plan locks.
- `components/AnalyticsDashboard.tsx` — passes the host timezone to pure engines.
- `README_INTEGRATION.md` — staging API examples updated.
- `tsconfig.staging.json`, `staging-harness.ts`, `staging-harness.test.ts` — isolated compile and truth harness.

## Verification

| Check | Result |
|---|---|
| TypeScript staging compile | `PASS` |
| Isolated Vitest harness | `PASS` |
| Harness under `TZ=UTC` | `PASS` |
| Harness under `TZ=Pacific/Auckland` | `PASS` |
| America/Santiago business semantics | `PASS` |
| MTD independent of 7d/30d selector | `PASS` |
| Monday calendar week and completed-week baseline | `PASS` |
| Session-based device/geography aggregation | `PASS` |
| Session-continuous funnel | `PASS` |
| Interactions/view may exceed 100%; action rate bounded | `PASS` |
| Low-data before plan lock | `PASS` |
| Adapter page/session preservation | `PASS` |
| Production runtime integration | `NOT_VERIFIED / OUT OF SCOPE` |
| SQL created or executed | `NO / NO` |

## Event mapping contract

| Existing Cripqer event | Context | `AnalyticsEventV1` | Notes |
|---|---|---|---|
| `view` | child page | `page_view` | Carries `pageId` when present. |
| `view` | Smart Page | `smart_page_view` | Requires host context. |
| `view` | profile | `page_view` | Must retain scope metadata; not assumed to be QR scan. |
| `link_click` + WhatsApp URL/interation | any | `whatsapp_click` | Deterministic URL/channel normalization. |
| `link_click` + social URL | any | channel-specific click | No network-specific engine is created. |
| `link_click` + button interaction | any | `cta_click` | Preserves link and session identity. |
| `link_click` otherwise | any | `external_link_click` | No claim about destination-side visits. |
| future QR entry | QR context | `qr_scan` | Not instrumented in this phase. |

## Session contract result

The current `sessionStorage["qr_session_id"]` is reusable as the browser-side pseudonymous source, but current production child-page tracking does not consistently pass it to `track_child_page_event`. The adapter preserves a supplied `session_id`; production wiring remains a later phase. No competing session identifier was created.

## Remaining incompatibilities

- Current `qr_analytics` stores only a subset of `AnalyticsEventV1`.
- Existing page RPCs do not yet carry all session/device/source/UTM fields required by the portable contract.
- No canonical `qr_scan` event is currently persisted.
- Notification delivery and state persistence remain host responsibilities.
- The package is not connected to `/pages/$pageId/analytics`.

## Recommended persistence strategy

Do not create a second analytics platform. First add a production adapter at the existing analytics service boundary, preserving `public.pages.id`, `profile_id`, `public_id`, existing RPC ownership and page analytics route. Then choose the smallest persistence evolution—extension of the existing analytics contract or a compatibility projection—only after a staging round trip proves the missing fields and query volume. No SQL decision is implemented in Phase A.

## Frozen areas touched

`NO` — Catalog, Power Editor, Engine V2, QR public identity, public routes and published runtime were not touched.

**Status:** `PHASE_A_STAGING_HARDENING_PASS`  
**Production integration:** `NOT_AUTHORIZED`  
**SQL:** `NOT_CREATED / NOT_EXECUTED`
