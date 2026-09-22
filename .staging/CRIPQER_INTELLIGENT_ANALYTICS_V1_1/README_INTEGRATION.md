# CRIPQER INTELLIGENT ANALYTICS V1 — Integration Guide

Portable, dependency-closed analytics system: event contracts, deterministic
metrics, rule-based intelligence, smart goals, notification scoring and a
premium adaptive dashboard. React 18/19 only — no chart library, no state
library, no CSS framework, no network, no storage.

## Architecture

```text
Host events (AnalyticsEventV1[])
      ↓ metrics-engine.ts        pure aggregation, injected clock
AnalyticsMetricsV1
      ↓ intelligence-engine.ts   deterministic rules → AnalyticsInsightV1[]
      ↓ goals-engine.ts          targets derived from real history
      ↓ daily-brief.ts           template-driven natural language
      ↓ notification-engine.ts   scoring + cooldown + daily cap → candidates
      ↓ widget-registry.ts       plan + data reality → visible/hidden/locked
components/AnalyticsDashboard.tsx  premium adaptive UI
```

## Files

| File | Role |
| --- | --- |
| `analytics.types.ts` | Event model, plans, metrics, insights, goals, notifications, host boundary |
| `metrics-engine.ts` | Deterministic aggregation, ranges, series, funnel, records |
| `intelligence-engine.ts` | Rule-based insights, confidence, learning mode |
| `goals-engine.ts` | Smart goals derived from the account's own baseline |
| `daily-brief.ts` | Template-driven natural-language summary |
| `notification-engine.ts` | Scoring, per-type cooldown, daily cap, suppression reasons |
| `widget-registry.ts` | Adaptive visibility by plan and by data availability |
| `components/charts.tsx` | Dependency-free SVG area chart, sparkline, bars, heatmap, donut |
| `components/widgets.tsx` | All dashboard widgets |
| `components/NotificationToasts.tsx` | In-app notification surface |
| `components/AnalyticsDashboard.tsx` | Composed adaptive dashboard |
| `analytics.fixtures.ts` | Seeded demo datasets (6 scenarios) |
| `analytics.css` | Scoped styles under `.cq-analytics`, variable-driven |

## Minimal usage

```tsx
import { AnalyticsDashboard } from "./analytics";
import "./analytics/analytics.css";

<AnalyticsDashboard
  events={events}                       // AnalyticsEventV1[] from your store
  context={{
    profileId,
    displayName: "Bella Pizza",
    plan: "pro",
    availableChannels: ["whatsapp", "instagram"],
  }}
  callbacks={{
    onNotificationCandidate: (candidate) => queuePush(candidate),
    onOpenEditorRecommendation: (action) => openEditor(action),
    onUpgradeRequest: (plan) => openBilling(plan),
  }}
/>;
```

Engines can also be used headless (server, cron, email digests):

```ts
const timezone = "America/Santiago";
const now = new Date();
const range = resolveRange("30d", now, timezone);
const metrics = computeMetrics({ events, range, now, timezone });
const insights = generateInsights(metrics);
const { candidates, nextState } = scoreNotifications({ insights, metrics, state, now: new Date() });
```

## Determinism

Every engine is a pure function. The clock is injected (`context.now`, `now`)
and fixtures use a seeded generator, so the same input always yields the same
metrics, insights, goals, brief and notification scores.

## Honesty rules (enforced in code)

- Below 25 signals the system stays in **learning mode**: no trends, no goals,
  no notifications — only an explicit "still learning" message.
- Below 60 signals no traffic trend claim is made.
- Every insight carries a `confidence` value driven by sample size and effect size.
- A widget with no meaningful data is **hidden**, never rendered empty.
- A widget above the plan is **locked** with a real explanation — never filled
  with fake or sample numbers.
- Nothing is ever invented: all numbers come from the supplied events.

## Notification discipline

- Per-type cooldowns (12h–168h) in `notification-engine.ts`.
- Composite score: importance + anomaly + confidence + relevance + novelty.
- Minimum score threshold (default 45) and a hard cap of 3 per day.
- Suppressed candidates are returned with a reason (`cooldown`, `daily_cap`,
  `below_min_score`, `learning_mode`) for host observability.
- The engine emits **candidates**; the host owns delivery (push, email, storage).

## Plan gating

`free` → overview, trend, intelligence, channels, top links, live activity.
`pro` → hot hours, smart goals, period comparison, sources, devices.
`business` → funnel, new vs returning, geography, momentum & anomalies.
`enterprise` → everything.

## Host must supply

- Event collection, persistence and querying
- Authentication, profiles and plan resolution
- Notification delivery channels (push/email) and read state
- Real geolocation/device enrichment if desired
- Routes (this package defines none)

## Not implemented (by design)

Backend, database, tracking pixel, AI/LLM layer, payments, editor mutations.
Recommended actions are contracts (`RecommendedActionV1`); Analytics never
modifies a Cripqer page or editor.

---

## V1.1 — Realtime, notifications and premium visuals

Additive over the frozen V1 base. `generatePageRecipe`-style entry points are unchanged:
`computeMetrics`, `generateInsights`, `generateSmartGoals`, `buildDailyBrief`,
`scoreNotifications` and `resolveWidgets` keep their V1 signatures.

### New modules
- `rolling-window.ts` — `computeRollingWindow({ events, now, timezone })` returns
  `RollingWindowAnalyticsV1` for the 15 / 30 / 60 minute windows. Baselines are
  hour-of-day aware over the previous 7 days and Laplace-smoothed, so a handful of
  clicks can never produce an absurd multiplier. A channel spike requires
  `clicks >= 10`, `ratio >= 2` and a sufficient baseline sample.
- `components/NotificationCenter.tsx` — bell, unread badge, panel (drawer on mobile),
  read / dismiss / mark-all-read, empty state.

### New contracts
`RollingWindowAnalyticsV1`, `RollingWindowStatV1`, `RollingChannelSpikeV1`,
`NotificationItemV1`, insight categories `realtime` and `goal`, notification kind
`goal`, `NotificationCandidateV1.channel` and `.metric`, `RecordsV1.thisWeekValue`.

### Insight types now generated
`realtime_channel_spike`, `realtime_surge`, `new_weekly_record`, `hot_time_window`,
`goal_progress`, `goal_projected_success`, `goal_at_risk`.

### Host callback
`callbacks.onNotificationCandidate(candidate)` fires once per newly scored candidate
after cooldown and daily-cap filtering. The package never delivers push or email; the
host owns delivery and persistence of `NotificationStateV1`.

### Truth rules kept
- Realtime copy says "clicked your Instagram link from Cripqer", never "visited your
  Instagram profile".
- No websocket or backend is claimed; the Right now card states the numbers come from
  the events already loaded in the session.
- Widgets with no real data stay hidden; plan-gated widgets show a lock, never fake numbers.
- Under the learning threshold nothing trends, no goal is set and nothing notifies.

### QA-only files (safe to delete in production)
`analytics.fixtures.ts` and any host harness route.
