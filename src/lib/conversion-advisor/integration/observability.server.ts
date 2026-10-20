/**
 * CRIPQER Conversion Advisor — CONV-02 · observability.
 *
 * SERVER-ONLY. One place that decides what an advisor event may say, so no
 * caller can leak a message, a transcript, a provider body, a header, a key, a
 * session id or a denial reason into a log by accident.
 *
 * THE RULE IS ALLOWLIST, NOT REDACTION. Every event names its fields; anything
 * else the caller passes is dropped before the record is built. Redaction has to
 * anticipate every secret shape and will eventually miss one; an allowlist can
 * only ever emit what it was told to.
 *
 * A FAILING LOGGER NEVER FAILS A TURN. Observability is a side channel: if the
 * sink throws, the turn has already been paid for and answered, and losing a log
 * line must not turn a good reply into an error.
 */

/** The closed set of events this build emits. A test pins the exact list. */
export const ADVISOR_EVENTS = [
  "advisor.turn.received",
  "advisor.turn.refused",
  "advisor.turn.unconfigured",
  "advisor.understanding.completed",
  "advisor.advice.completed",
  "advisor.guard.denied",
  "advisor.turn.degraded",
  "advisor.turn.completed",
] as const;

export type AdvisorEvent = (typeof ADVISOR_EVENTS)[number];

/**
 * The fields an event may carry.
 *
 * Deliberately absent, and therefore impossible to log through this module:
 * `message`, `reply`, `transcript`, `prompt`, `response`, `body`, `headers`,
 * `authorization`, `apiKey`, `sessionId`, `session_id`, `name`, `description`,
 * `email`, `phone`, denial details and any stack trace.
 */
const ALLOWED_FIELDS = [
  "model",
  "reason",
  "reservation",
  "usage_status",
  "attempts_reserved",
  "latency_ms",
  "degraded",
  "persisted",
  "turns_used",
  "turns_remaining",
  "fast_path",
  "landing_slot",
  "landing_ready",
  "intents",
  "status",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export type AdvisorEventFields = Partial<
  Record<AllowedField, string | number | boolean | readonly string[] | null>
>;

export type AdvisorObservabilityRecord = Readonly<{
  event: AdvisorEvent;
  at: string;
}> &
  AdvisorEventFields;

export type AdvisorLogger = (record: AdvisorObservabilityRecord) => void;

/** Values are bounded and shape-checked; a free-form string is not logged. */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_:.,\- ]{0,159}$/;
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._\-]{0,63}$/;
/**
 * A conversation handle is a uuid. A model id is not, and a value shaped like a
 * uuid must never be logged in the `model` field — that is the exact shape a
 * caller would use to smuggle a session id past the allowlist.
 */
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLOT_PATTERN = /^(type|goal|template|channel)$/;
const MAX_INTENTS = 8;

function cleanValue(field: AllowedField, value: unknown): AdvisorEventFields[AllowedField] | undefined {
  if (value === null || value === undefined) return undefined;
  if (field === "reason") {
    // Failure reasons are CODES. A model-authored limitation or a provider
    // sentence is not one, so it is replaced instead of truncated and logged.
    return typeof value === "string" && CODE_PATTERN.test(value) ? value : "REDACTED";
  }
  if (field === "model") {
    if (typeof value !== "string" || SESSION_ID_PATTERN.test(value)) return "REDACTED";
    return MODEL_PATTERN.test(value) ? value : "REDACTED";
  }
  if (field === "landing_slot") {
    if (value === null) return null;
    return typeof value === "string" && SLOT_PATTERN.test(value) ? value : "REDACTED";
  }
  if (field === "intents") {
    if (!Array.isArray(value)) return undefined;
    const intents = value
      .filter((item): item is string => typeof item === "string" && CODE_PATTERN.test(item))
      .slice(0, MAX_INTENTS);
    return intents;
  }
  if (field === "latency_ms") {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
      ? Math.min(Math.round(value), 3_600_000)
      : undefined;
  }
  if (field === "turns_used" || field === "turns_remaining" || field === "attempts_reserved") {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
      ? Math.min(Math.floor(value), 10_000)
      : undefined;
  }
  if (
    field === "degraded" ||
    field === "persisted" ||
    field === "fast_path" ||
    field === "landing_ready"
  ) {
    return typeof value === "boolean" ? value : undefined;
  }
  // reservation / usage_status / status: short enums only.
  return typeof value === "string" && CODE_PATTERN.test(value) ? value : "REDACTED";
}

/** Builds the record. Pure, so a test can assert exactly what would be logged. */
export function buildAdvisorEvent(
  event: AdvisorEvent,
  fields: AdvisorEventFields,
  now: () => number = Date.now,
): AdvisorObservabilityRecord {
  const record: Record<string, unknown> = { event, at: new Date(now()).toISOString() };
  for (const field of ALLOWED_FIELDS) {
    const cleaned = cleanValue(field, fields[field]);
    if (cleaned !== undefined) record[field] = cleaned;
  }
  return record as AdvisorObservabilityRecord;
}

const defaultLogger: AdvisorLogger = (record) => {
  // One line, JSON: a structured sink can parse it, a human can read it.
  console.info(`[conversion-advisor] ${JSON.stringify(record)}`);
};

/**
 * Emits one event. Never throws, never returns a value the turn could branch
 * on: a broken sink must be invisible to the conversation.
 */
export function emitAdvisorEvent(
  event: AdvisorEvent,
  fields: AdvisorEventFields,
  logger: AdvisorLogger | undefined = defaultLogger,
  now: () => number = Date.now,
): void {
  try {
    const sink = logger ?? defaultLogger;
    sink(buildAdvisorEvent(event, fields, now));
  } catch {
    // Intentionally empty: see the module header.
  }
}
