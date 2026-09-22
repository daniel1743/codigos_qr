/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — Metrics Engine.
 *
 * Pure, deterministic aggregation over AnalyticsEventV1[].
 * No network, no storage, no clock access unless injected.
 */

import {
  CHANNEL_EVENT,
  CHANNEL_LABEL,
  type AnalyticsEventType,
  type AnalyticsEventV1,
  type AnalyticsMetricsV1,
  type ChannelId,
  type ChannelMetricV1,
  type ComparisonV1,
  type DateRangeV1,
  type DeviceKind,
  type FunnelStepV1,
  type HourCellV1,
  type MomentumStateV1,
  type PeriodId,
  type RankedItemV1,
  type SeriesPointV1,
} from "./analytics.types";
import {
  assertTimezone,
  formatLocalDate,
  startOfLocalDay,
  startOfLocalMonth,
  startOfLocalWeek,
  shiftLocalDays,
  zonedParts,
} from "./timezone";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const VIEW_EVENTS: AnalyticsEventType[] = ["page_view", "smart_page_view"];
const INTERACTION_EVENTS: AnalyticsEventType[] = [
  "link_click",
  "whatsapp_click",
  "instagram_click",
  "facebook_click",
  "tiktok_click",
  "youtube_click",
  "linkedin_click",
  "external_link_click",
  "cta_click",
  "share",
];

export function isViewEvent(t: AnalyticsEventType): boolean {
  return VIEW_EVENTS.includes(t);
}

export function isInteractionEvent(t: AnalyticsEventType): boolean {
  return INTERACTION_EVENTS.includes(t);
}

function ts(event: AnalyticsEventV1): number {
  const value = Date.parse(event.timestamp);
  return Number.isFinite(value) ? value : NaN;
}

function pct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

function compare(current: number, previous: number): ComparisonV1 {
  return { current, previous, deltaPct: pct(current, previous) };
}

/** Builds the current range for a period, anchored on an injected clock. */
export function resolveRange(period: PeriodId, now: Date, timezone: string, custom?: DateRangeV1): DateRangeV1 {
  assertTimezone(timezone);
  if (period === "custom" && custom) return custom;
  const end = now.getTime();
  const days = period === "today" ? 0 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const from = period === "today" ? startOfLocalDay(end, timezone) : shiftLocalDays(end, -(days - 1), timezone);
  return { from: new Date(from).toISOString(), to: new Date(end + 1).toISOString() };
}

export function previousRangeOf(range: DateRangeV1): DateRangeV1 {
  const from = Date.parse(range.from);
  const to = Date.parse(range.to);
  const span = Math.max(to - from, HOUR_MS);
  return { from: new Date(from - span).toISOString(), to: new Date(from).toISOString() };
}

function withinRange(event: AnalyticsEventV1, range: DateRangeV1): boolean {
  const t = ts(event);
  if (!Number.isFinite(t)) return false;
  return t >= Date.parse(range.from) && t < Date.parse(range.to);
}

function rank(map: Map<string, { label: string; value: number }>, previous: Map<string, number>) {
  const total = [...map.values()].reduce((sum, entry) => sum + entry.value, 0);
  const items: RankedItemV1[] = [...map.entries()].map(([id, entry]) => {
    const previousValue = previous.get(id) ?? 0;
    return {
      id,
      label: entry.label,
      value: entry.value,
      previousValue,
      deltaPct: pct(entry.value, previousValue),
      share: total > 0 ? entry.value / total : 0,
    };
  });
  return items.sort((a, b) => b.value - a.value);
}

function bucketSeries(
  events: AnalyticsEventV1[],
  range: DateRangeV1,
  granularity: "hour" | "day",
  predicate: (event: AnalyticsEventV1) => boolean,
  timezone: string,
): SeriesPointV1[] {
  const from = Date.parse(range.from);
  const to = Date.parse(range.to);
  const step = granularity === "hour" ? HOUR_MS : DAY_MS;
  const anchor = granularity === "hour" ? from - (from % HOUR_MS) : startOfLocalDay(from, timezone);
  const buckets: SeriesPointV1[] = [];
  const index = new Map<number, number>();

  for (let t = anchor; t < to; t += step) {
    const date = new Date(t);
    index.set(t, buckets.length);
    buckets.push({
      key: date.toISOString(),
      label:
        granularity === "hour"
          ? `${String(date.getHours()).padStart(2, "0")}:00`
          : formatLocalDate(t, timezone),
      value: 0,
    });
  }

  for (const event of events) {
    if (!predicate(event)) continue;
    const t = ts(event);
    if (!Number.isFinite(t)) continue;
    const bucketStart = granularity === "hour" ? t - (t % HOUR_MS) : startOfLocalDay(t, timezone);
    const position = index.get(bucketStart);
    if (position !== undefined) {
      const bucket = buckets[position];
      if (bucket) bucket.value += 1;
    }
  }

  return buckets;
}

function momentumOf(views: ComparisonV1, spikeRatio: number): MomentumStateV1 {
  if (spikeRatio >= 2.5) return "unusual_activity";
  const delta = views.deltaPct;
  if (delta === null) return views.current > 0 ? "growing" : "stable";
  if (delta >= 40) return "strong_growth";
  if (delta >= 10) return "growing";
  if (delta <= -25) return "declining";
  return "stable";
}

export interface ComputeMetricsInput {
  events: AnalyticsEventV1[];
  range: DateRangeV1;
  now: Date;
  timezone: string;
  /** Optional channel filter applied to channel-scoped aggregates. */
  channelFilter?: ChannelId[];
}

export function computeMetrics(input: ComputeMetricsInput): AnalyticsMetricsV1 {
  const { events, range, now, timezone } = input;
  assertTimezone(timezone);
  const previousRange = previousRangeOf(range);
  const spanMs = Date.parse(range.to) - Date.parse(range.from);
  const granularity: "hour" | "day" = spanMs <= DAY_MS * 1.5 ? "hour" : "day";

  const clean = events.filter((event) => Number.isFinite(ts(event)));
  const current = clean.filter((event) => withinRange(event, range));
  const previous = clean.filter((event) => withinRange(event, previousRange));

  const count = (list: AnalyticsEventV1[], predicate: (e: AnalyticsEventV1) => boolean) =>
    list.reduce((sum, event) => sum + (predicate(event) ? 1 : 0), 0);

  const views = count(current, (e) => isViewEvent(e.eventType));
  const previousViews = count(previous, (e) => isViewEvent(e.eventType));
  const qrScans = count(current, (e) => e.eventType === "qr_scan");
  const previousQr = count(previous, (e) => e.eventType === "qr_scan");
  const interactions = count(current, (e) => isInteractionEvent(e.eventType));
  const previousInteractions = count(previous, (e) => isInteractionEvent(e.eventType));
  const linkClicks = count(current, (e) => e.eventType !== "cta_click" && isInteractionEvent(e.eventType));
  const leads = count(current, (e) => e.eventType === "lead_created");
  const previousLeads = count(previous, (e) => e.eventType === "lead_created");

  const sessionIds = new Set(current.map((e) => e.sessionId).filter(Boolean) as string[]);
  const previousSessionIds = new Set(
    previous.map((e) => e.sessionId).filter(Boolean) as string[],
  );
  const visitors = sessionIds.size || views;
  const previousVisitors = previousSessionIds.size || previousViews;

  const ctr = views > 0 ? interactions / views : 0;
  const interactionRate = ctr;
  const actionSessions = new Set(
    current
      .filter((e) => isInteractionEvent(e.eventType) || e.eventType === "lead_created")
      .map((e) => e.sessionId)
      .filter(Boolean),
  );
  const viewSessions = new Set(
    current.filter((e) => isViewEvent(e.eventType)).map((e) => e.sessionId).filter(Boolean),
  );
  const actionRate =
    viewSessions.size > 0
      ? [...actionSessions].filter((id) => viewSessions.has(id)).length / viewSessions.size
      : 0;
  const previousCtr = previousViews > 0 ? previousInteractions / previousViews : 0;
  const conversionRate = views > 0 ? leads / views : 0;
  const previousConversion = previousViews > 0 ? previousLeads / previousViews : 0;

  /* Channels ------------------------------------------------------- */
  const channelIds = Object.keys(CHANNEL_EVENT) as ChannelId[];
  const totalChannelClicks = channelIds.reduce(
    (sum, channel) => sum + count(current, (e) => e.eventType === CHANNEL_EVENT[channel]),
    0,
  );
  const channels: ChannelMetricV1[] = channelIds
    .map((channel) => {
      const clicks = count(current, (e) => e.eventType === CHANNEL_EVENT[channel]);
      const previousClicks = count(previous, (e) => e.eventType === CHANNEL_EVENT[channel]);
      return {
        channel,
        label: CHANNEL_LABEL[channel],
        clicks,
        previousClicks,
        share: totalChannelClicks > 0 ? clicks / totalChannelClicks : 0,
        deltaPct: pct(clicks, previousClicks),
        series: bucketSeries(current, range, granularity, (e) => e.eventType === CHANNEL_EVENT[channel], timezone),
      };
    })
    .filter((metric) => metric.clicks > 0 || metric.previousClicks > 0)
    .sort((a, b) => b.clicks - a.clicks);

  const activeChannels = channels.filter((c) => c.clicks > 0).map((c) => c.channel);

  /* Ranked breakdowns ---------------------------------------------- */
  const linkMap = new Map<string, { label: string; value: number }>();
  const previousLinkMap = new Map<string, number>();
  const entryEvents = current.filter(
    (event) => event.eventType === "session_start" || isViewEvent(event.eventType),
  );
  for (const event of entryEvents) {
    if (!isInteractionEvent(event.eventType)) continue;
    const id = event.linkId ?? event.eventType;
    const label = event.linkLabel ?? CHANNEL_LABEL[channelOf(event.eventType) ?? "other"];
    const entry = linkMap.get(id) ?? { label, value: 0 };
    entry.value += 1;
    linkMap.set(id, entry);
  }
  for (const event of previous) {
    if (!isInteractionEvent(event.eventType)) continue;
    const id = event.linkId ?? event.eventType;
    previousLinkMap.set(id, (previousLinkMap.get(id) ?? 0) + 1);
  }

  const sourceMap = new Map<string, { label: string; value: number }>();
  const previousSourceMap = new Map<string, number>();
  const addSource = (
    map: Map<string, { label: string; value: number }>,
    prev: Map<string, number> | null,
    event: AnalyticsEventV1,
  ) => {
    const id = sourceOf(event);
    if (prev) {
      prev.set(id, (prev.get(id) ?? 0) + 1);
      return;
    }
    const entry = map.get(id) ?? { label: sourceLabel(id), value: 0 };
    entry.value += 1;
    map.set(id, entry);
  };
  const representatives = sessionRepresentatives(current);
  for (const event of representatives) addSource(sourceMap, null, event);
  for (const event of previous) addSource(sourceMap, previousSourceMap, event);

  const deviceMap = new Map<string, { label: string; value: number }>();
  const previousDeviceMap = new Map<string, number>();
  for (const event of representatives) {
    if (!event.device || event.device === "unknown") continue;
    const entry = deviceMap.get(event.device) ?? { label: deviceLabel(event.device), value: 0 };
    entry.value += 1;
    deviceMap.set(event.device, entry);
  }
  for (const event of previous) {
    if (!event.device || event.device === "unknown") continue;
    previousDeviceMap.set(event.device, (previousDeviceMap.get(event.device) ?? 0) + 1);
  }

  const countryMap = new Map<string, { label: string; value: number }>();
  const cityMap = new Map<string, { label: string; value: number }>();
  for (const event of representatives) {
    if (event.country) {
      const entry = countryMap.get(event.country) ?? { label: event.country, value: 0 };
      entry.value += 1;
      countryMap.set(event.country, entry);
    }
    if (event.cityApprox) {
      const key = `${event.cityApprox}`;
      const entry = cityMap.get(key) ?? { label: event.cityApprox, value: 0 };
      entry.value += 1;
      cityMap.set(key, entry);
    }
  }

  /* Hourly heatmap -------------------------------------------------- */
  const hourly: HourCellV1[] = [];
  const hourIndex = new Map<string, number>();
  for (let weekday = 0; weekday < 7; weekday += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      hourIndex.set(`${weekday}-${hour}`, hourly.length);
      hourly.push({ weekday, hour, value: 0 });
    }
  }
  const hourTotals = new Array<number>(24).fill(0);
  for (const event of current) {
    const parts = zonedParts(ts(event), timezone);
    const weekday = (new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() + 6) % 7;
    const hour = parts.hour;
    const position = hourIndex.get(`${weekday}-${hour}`);
    if (position !== undefined) {
      const cell = hourly[position];
      if (cell) cell.value += 1;
    }
    hourTotals[hour] = (hourTotals[hour] ?? 0) + 1;
  }
  let bestHour: { hour: number; value: number } | null = null;
  hourTotals.forEach((value, hour) => {
    if (value > 0 && (!bestHour || value > bestHour.value)) bestHour = { hour, value };
  });

  /* Audience -------------------------------------------------------- */
  const returningSessions = new Set(
    current.filter((e) => e.eventType === "return_visit").map((e) => e.sessionId ?? e.id),
  );
  const returningVisitors = Math.min(returningSessions.size, visitors);
  const newVisitors = Math.max(visitors - returningVisitors, 0);

  /* Funnel ---------------------------------------------------------- */
  const funnelValues = sessionFunnel(current);
  const funnel: FunnelStepV1[] = funnelValues.map((step, i) => {
    const prev = i === 0 ? null : funnelValues[i - 1]?.value ?? 0;
    const stepRate = prev === null ? null : prev > 0 ? Math.min(step.value / prev, 1) : 0;
    return {
      id: step.id,
      label: step.label,
      value: step.value,
      stepRate,
      dropOff: prev === null ? 0 : Math.max(prev - step.value, 0),
    };
  });

  /* Records --------------------------------------------------------- */
  const dailyTotals = new Map<number, number>();
  for (const event of clean) {
    if (ts(event) > now.getTime()) continue;
    if (!isViewEvent(event.eventType)) continue;
    const day = startOfLocalDay(ts(event), timezone);
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + 1);
  }
  let bestDayValue = 0;
  let bestDayKey: number | null = null;
  for (const [day, value] of dailyTotals) {
    if (value > bestDayValue) {
      bestDayValue = value;
      bestDayKey = day;
    }
  }
  const todayKey = startOfLocalDay(now.getTime(), timezone);
  const todayValue = dailyTotals.get(todayKey) ?? 0;
  const weekTotals = new Map<number, number>();
  for (const [day, value] of dailyTotals) {
    const week = startOfLocalWeek(day, timezone);
    weekTotals.set(week, (weekTotals.get(week) ?? 0) + value);
  }
  const currentWeekKey = startOfLocalWeek(todayKey, timezone);
  const thisWeekValue = weekTotals.get(currentWeekKey) ?? 0;
  const bestWeekValue = [...weekTotals.entries()]
    .filter(([week]) => week < currentWeekKey)
    .reduce((max, [, value]) => Math.max(max, value), 0);
  const averageDailyValue =
    dailyTotals.size > 0
      ? [...dailyTotals.values()].reduce((sum, value) => sum + value, 0) / dailyTotals.size
      : 0;

  const spikeRatio = averageDailyValue > 0 ? todayValue / averageDailyValue : 0;

  const viewsComparison = compare(views, previousViews);

  return {
    version: "1",
    range,
    previousRange,
    granularity,
    sampleSize: current.length,
    totals: { views, qrScans, interactions, linkClicks, leads, sessions: sessionIds.size, visitors },
    comparisons: {
      views: viewsComparison,
      qrScans: compare(qrScans, previousQr),
      interactions: compare(interactions, previousInteractions),
      ctr: compare(ctr, previousCtr),
      conversion: compare(conversionRate, previousConversion),
      visitors: compare(visitors, previousVisitors),
    },
    ctr,
    interactionRate,
    actionRate,
    conversionRate,
    monthToDate: monthToDate(clean, now, timezone),
    series: {
      views: bucketSeries(current, range, granularity, (e) => isViewEvent(e.eventType), timezone),
      interactions: bucketSeries(current, range, granularity, (e) => isInteractionEvent(e.eventType), timezone),
      qrScans: bucketSeries(current, range, granularity, (e) => e.eventType === "qr_scan", timezone),
      previousViews: bucketSeries(previous, previousRange, granularity, (e) =>
        isViewEvent(e.eventType),
        timezone,
      ),
    },
    hourly,
    bestHour,
    channels,
    activeChannels,
    topLinks: rank(linkMap, previousLinkMap).slice(0, 8),
    sources: rank(sourceMap, previousSourceMap),
    devices: rank(deviceMap, previousDeviceMap),
    countries: rank(countryMap, new Map()),
    cities: rank(cityMap, new Map()),
    audience: { newVisitors, returningVisitors },
    funnel,
    records: {
      bestDayValue,
      bestDayLabel:
        bestDayKey === null
          ? null
          : formatLocalDate(bestDayKey, timezone),
      bestWeekValue,
      thisWeekValue,
      averageDailyValue,
      todayValue,
    },
    recentEvents: [...current].sort((a, b) => ts(b) - ts(a)).slice(0, 40),
    momentum: momentumOf(viewsComparison, spikeRatio),
  };
}

function sessionRepresentatives(events: AnalyticsEventV1[]): AnalyticsEventV1[] {
  const bySession = new Map<string, AnalyticsEventV1>();
  for (const event of events) {
    const key = event.sessionId ?? `event:${event.id}`;
    const existing = bySession.get(key);
    if (!existing || priority(event) < priority(existing) || (priority(event) === priority(existing) && ts(event) < ts(existing))) {
      bySession.set(key, event);
    }
  }
  return [...bySession.values()];
}

function priority(event: AnalyticsEventV1): number {
  if (event.eventType === "session_start") return 0;
  if (isViewEvent(event.eventType)) return 1;
  if (event.eventType === "qr_scan") return 2;
  return 3;
}

function sessionFunnel(events: AnalyticsEventV1[]): Array<{ id: string; label: string; value: number }> {
  const sessions = new Map<string, AnalyticsEventV1[]>();
  for (const event of events) {
    if (!event.sessionId) continue;
    const list = sessions.get(event.sessionId) ?? [];
    list.push(event);
    sessions.set(event.sessionId, list);
  }
  let qr = 0;
  let views = 0;
  let interactions = 0;
  let actions = 0;
  for (const list of sessions.values()) {
    list.sort((a, b) => ts(a) - ts(b));
    const qrIndex = list.findIndex((e) => e.eventType === "qr_scan");
    const viewIndex = qrIndex >= 0
      ? list.findIndex((e) => isViewEvent(e.eventType) && ts(e) >= ts(list[qrIndex]!))
      : -1;
    const interactionIndex = viewIndex >= 0
      ? list.findIndex((e) => isInteractionEvent(e.eventType) && ts(e) >= ts(list[viewIndex]!))
      : -1;
    const actionIndex = interactionIndex >= 0
      ? list.findIndex((e) => e.eventType === "lead_created" && ts(e) >= ts(list[interactionIndex]!))
      : -1;
    if (qrIndex >= 0) qr += 1;
    if (viewIndex >= 0) views += 1;
    if (interactionIndex >= 0) interactions += 1;
    if (actionIndex >= 0) actions += 1;
  }
  return [
    { id: "qr_scan", label: "QR scan", value: qr },
    { id: "page_view", label: "Page view", value: views },
    { id: "interaction", label: "Interaction", value: interactions },
    { id: "channel_action", label: "Action", value: actions },
  ];
}

function monthToDate(events: AnalyticsEventV1[], now: Date, timezone: string) {
  const from = startOfLocalMonth(now.getTime(), timezone);
  const current = events.filter((event) => ts(event) >= from && ts(event) <= now.getTime());
  const ids = new Set(current.map((event) => event.sessionId).filter(Boolean));
  return {
    views: current.filter((event) => isViewEvent(event.eventType)).length,
    interactions: current.filter((event) => isInteractionEvent(event.eventType)).length,
    leads: current.filter((event) => event.eventType === "lead_created").length,
    sessions: ids.size,
  };
}

export function channelOf(eventType: AnalyticsEventType): ChannelId | null {
  const entry = (Object.entries(CHANNEL_EVENT) as Array<[ChannelId, AnalyticsEventType]>).find(
    ([, value]) => value === eventType,
  );
  return entry ? entry[0] : null;
}

function sourceOf(event: AnalyticsEventV1): string {
  if (event.qrId || event.eventType === "qr_scan") return "qr";
  if (event.utmSource) return `utm:${event.utmSource}`;
  if (event.source) return event.source;
  if (event.referrer) return "referrer";
  return "direct";
}

function sourceLabel(id: string): string {
  if (id === "qr") return "QR code";
  if (id === "direct") return "Direct";
  if (id === "referrer") return "Referrer";
  if (id.startsWith("utm:")) return `Campaign · ${id.slice(4)}`;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function deviceLabel(device: DeviceKind): string {
  return device === "mobile" ? "Mobile" : device === "desktop" ? "Desktop" : "Tablet";
}
