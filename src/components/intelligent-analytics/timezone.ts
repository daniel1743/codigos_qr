/** Explicit IANA-timezone helpers for business analytics semantics. */

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timezone: string): Intl.DateTimeFormat {
  let value = formatterCache.get(timezone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timezone, value);
  }
  return value;
}

export function assertTimezone(timezone: string): string {
  if (!timezone || typeof timezone !== "string") throw new Error("IANA timezone is required");
  formatter(timezone).format(0);
  return timezone;
}

export function zonedParts(timestamp: number, timezone: string): ZonedParts {
  const parts = formatter(assertTimezone(timezone)).formatToParts(new Date(timestamp));
  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Converts a local wall-clock tuple in an IANA zone into a UTC timestamp. */
export function zonedDateTimeToUtc(
  parts: Pick<ZonedParts, "year" | "month" | "day" | "hour" | "minute" | "second">,
  timezone: string,
): number {
  assertTimezone(timezone);
  let guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  for (let i = 0; i < 4; i += 1) {
    const actual = zonedParts(guess, timezone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const wantedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const correction = wantedAsUtc - actualAsUtc;
    guess += correction;
    if (correction === 0) break;
  }
  return guess;
}

export function localDateKey(timestamp: number, timezone: string): string {
  const p = zonedParts(timestamp, timezone);
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function startOfLocalDay(timestamp: number, timezone: string): number {
  const p = zonedParts(timestamp, timezone);
  return zonedDateTimeToUtc({ year: p.year, month: p.month, day: p.day, hour: 0, minute: 0, second: 0 }, timezone);
}

export function startOfLocalMonth(timestamp: number, timezone: string): number {
  const p = zonedParts(timestamp, timezone);
  return zonedDateTimeToUtc({ year: p.year, month: p.month, day: 1, hour: 0, minute: 0, second: 0 }, timezone);
}

export function shiftLocalDays(timestamp: number, days: number, timezone: string): number {
  const p = zonedParts(timestamp, timezone);
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return zonedDateTimeToUtc({ year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate(), hour: 0, minute: 0, second: 0 }, timezone);
}

export function startOfLocalWeek(timestamp: number, timezone: string): number {
  const p = zonedParts(timestamp, timezone);
  const noon = zonedDateTimeToUtc({ year: p.year, month: p.month, day: p.day, hour: 12, minute: 0, second: 0 }, timezone);
  const weekday = new Date(noon).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const localDate = new Date(Date.UTC(p.year, p.month - 1, p.day - mondayOffset));
  return zonedDateTimeToUtc({ year: localDate.getUTCFullYear(), month: localDate.getUTCMonth() + 1, day: localDate.getUTCDate(), hour: 0, minute: 0, second: 0 }, timezone);
}

export function formatLocalDate(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: assertTimezone(timezone), month: "short", day: "numeric" }).format(new Date(timestamp));
}
