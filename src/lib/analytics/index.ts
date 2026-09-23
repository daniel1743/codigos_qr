/**
 * CRIPQER Analytics V1.1 — canonical write boundary public surface.
 *
 * Exports only dependency-free modules so unit tests can import this barrel
 * without pulling in the Supabase browser client (`./browser` is intentionally
 * excluded and imported directly by route modules).
 */

export {
  CANONICAL_WRITABLE_EVENT_TYPES,
  createCanonicalWriter,
  isCanonicalWritableEventType,
  normalizePlatform,
  resolveCanonicalClickType,
} from "./canonical-writer";
export type {
  AnalyticsRpcBoundary,
  AnalyticsWriteResult,
  CanonicalAnalyticsWriter,
  CanonicalWritableEventType,
  CanonicalWriterConfig,
  TrackAnalyticsEventInput,
} from "./canonical-writer";

export {
  PRODUCTION_PROJECT_REF,
  QA_PROJECT_REF,
  assertQaRuntime,
  classifyRuntime,
  extractSupabaseProjectRef,
  isQaAnalyticsRuntime,
} from "./qa-runtime-guard";
export type { QaRuntimeVerdict } from "./qa-runtime-guard";

export { QR_SESSION_STORAGE_KEY, getOrCreateSessionId } from "./session";

export { classifyDeviceType } from "./device-classifier";
export type { DeviceClassification } from "./device-classifier";
