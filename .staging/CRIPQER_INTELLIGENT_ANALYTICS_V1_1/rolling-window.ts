/**
 * CRIPQER INTELLIGENT ANALYTICS V1.1 — RollingWindowAnalyticsV1.
 *
 * Rolling realtime intelligence over the events currently supplied to the
 * package. Pure and deterministic: no timers, no sockets, no network.
 * Real production streaming is a host responsibility (see README).
 */

import {
  CHANNEL_EVENT,
  CHANNEL_LABEL,
  type AnalyticsEventV1,
  type ChannelId,
  type RollingChannelSpikeV1,
  type RollingWindowAnalyticsV1,
  type RollingWindowStatV1,
  type SeriesPointV1,
} from "./analytics.types";
import { isInteractionEvent, isViewEvent } from "./metrics-engine";
import { assertTimezone, zonedParts } from "./timezone";

const MIN_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** Smoothing prior, in expected events per window. */
const BASELINE_PRIOR = 1;

export const ROLLING_WINDOWS: Array<15 | 30 | 60> = [15, 30, 60];
/** Never call a realtime spike below this many clicks inside the window. */
export const ROLLING_MIN_SAMPLE = 10;
/** Ratio versus the personal baseline required to call a spike. */
export const ROLLING_SPIKE_RATIO = 2;
/** Hours of personal history used to build the baseline. */
export const ROLLING_BASELINE_HOURS = 24 * 7;

function ts(event: AnalyticsEventV1): number {
  const value = Date.parse(event.timestamp);
  return Number.isFinite(value) ? value : NaN;
}

function activityEvent(event: AnalyticsEventV1): boolean {
  return isViewEvent(event.eventType) || isInteractionEvent(event.eventType) || event.eventType === "qr_scan";
}

function bucketMinutes(
  events: AnalyticsEventV1[],
  from: number,
  to: number,
  buckets: number,
): SeriesPointV1[] {
  const span = Math.max(to - from, MIN_MS);
  const step = span / buckets;
  const out: SeriesPointV1[] = Array.from({ length: buckets }, (_, i) => {
    const start = from + i * step;
    const date = new Date(start);
    return {
      key: date.toISOString(),
      label: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
      value: 0,
    };
  });
  for (const event of events) {
    const t = ts(event);
    if (!Number.isFinite(t) || t < from || t >= to) continue;
    const index = Math.min(Math.floor((t - from) / step), buckets - 1);
    const bucket = out[index];
    if (bucket) bucket.value += 1;
  }
  return out;
}

export interface ComputeRollingInput {
  events: AnalyticsEventV1[];
  now: Date;
  timezone: string;
  minSample?: number;
  spikeRatio?: number;
}

/**
 * Baseline = average activity per equivalent window over the recent personal
 * history that PRECEDES the current window. Returns null when history is too
 * thin to compare honestly.
 */
function baselineFor(
  events: AnalyticsEventV1[],
  windowStart: number,
  windowMs: number,
  predicate: (event: AnalyticsEventV1) => boolean,
  timezone: string,
): number | null {
  const historyStart = windowStart - ROLLING_BASELINE_HOURS * HOUR_MS;
  // Compare like with like: only history around the same hour of the day.
  const targetHour = zonedParts(windowStart, timezone).hour;
  const hours = new Set([(targetHour + 23) % 24, targetHour, (targetHour + 1) % 24]);
  let count = 0;
  let earliest = Number.POSITIVE_INFINITY;
  for (const event of events) {
    const t = ts(event);
    if (!Number.isFinite(t) || t >= windowStart || t < historyStart) continue;
    if (!hours.has(zonedParts(t, timezone).hour)) continue;
    if (!predicate(event)) continue;
    count += 1;
    if (t < earliest) earliest = t;
  }
  if (!Number.isFinite(earliest)) return null;
  const days = Math.max(Math.round((windowStart - earliest) / DAY_MS), 1);
  if (days < 2) return null;
  const comparableMs = days * hours.size * HOUR_MS;
  // Laplace-style smoothing: never divide by an almost-empty baseline, which
  // would turn a handful of clicks into an absurd multiplier.
  return (count / comparableMs) * windowMs + BASELINE_PRIOR;
}

export function computeRollingWindow(input: ComputeRollingInput): RollingWindowAnalyticsV1 {
  const { events, now, timezone } = input;
  assertTimezone(timezone);
  const minSample = input.minSample ?? ROLLING_MIN_SAMPLE;
  const spikeRatio = input.spikeRatio ?? ROLLING_SPIKE_RATIO;
  const end = now.getTime();

  const windows: RollingWindowStatV1[] = ROLLING_WINDOWS.map((minutes) => {
    const windowMs = minutes * MIN_MS;
    const start = end - windowMs;
    let total = 0;
    for (const event of events) {
      const t = ts(event);
      if (!Number.isFinite(t) || t < start || t > end) continue;
      if (activityEvent(event)) total += 1;
    }
    const baseline = baselineFor(events, start, windowMs, activityEvent, timezone);
    return {
      windowMinutes: minutes,
      total,
      baselinePerWindow: baseline === null ? null : Math.round(baseline * 100) / 100,
      ratio: baseline === null || baseline <= 0 ? null : Math.round((total / baseline) * 100) / 100,
      series: bucketMinutes(events.filter(activityEvent), start, end, minutes <= 15 ? 15 : 20),
    };
  });

  /* Channel level rolling spikes ------------------------------------- */
  const spikes: RollingChannelSpikeV1[] = [];
  const channelIds = Object.keys(CHANNEL_EVENT) as ChannelId[];
  for (const channel of channelIds) {
    const predicate = (event: AnalyticsEventV1) => event.eventType === CHANNEL_EVENT[channel];
    for (const minutes of ROLLING_WINDOWS) {
      const windowMs = minutes * MIN_MS;
      const start = end - windowMs;
      let clicks = 0;
      for (const event of events) {
        const t = ts(event);
        if (!Number.isFinite(t) || t < start || t > end) continue;
        if (predicate(event)) clicks += 1;
      }
      if (clicks < minSample) continue;
      const baseline = baselineFor(events, start, windowMs, predicate, timezone);
      if (baseline === null || baseline <= 0) continue;
      const ratio = clicks / baseline;
      if (ratio < spikeRatio) continue;
      const confidence = Math.min(0.55 + Math.min(clicks / 60, 0.25) + Math.min((ratio - spikeRatio) / 10, 0.18), 0.96);
      spikes.push({
        channel,
        label: CHANNEL_LABEL[channel],
        windowMinutes: minutes,
        clicks,
        baseline: Math.round(baseline * 100) / 100,
        ratio: Math.round(ratio * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
      });
      break; // one spike per channel: the tightest window that qualifies
    }
  }
  spikes.sort((a, b) => b.ratio - a.ratio || b.clicks - a.clicks);

  const sixty = windows.find((w) => w.windowMinutes === 60) ?? null;
  const ratio60 = sixty?.ratio ?? null;
  const state: RollingWindowAnalyticsV1["state"] =
    spikes.length > 0 || (ratio60 !== null && ratio60 >= 2)
      ? "spike"
      : ratio60 !== null && ratio60 >= 1.3
        ? "rising"
        : (sixty?.total ?? 0) === 0
          ? "quiet"
          : "normal";

  return {
    version: "1",
    now: now.toISOString(),
    windows,
    spikes,
    state,
    activePerMinute: sixty ? Math.round((sixty.total / 60) * 100) / 100 : 0,
    sampleSufficient: windows.some((w) => w.baselinePerWindow !== null),
  };
}
