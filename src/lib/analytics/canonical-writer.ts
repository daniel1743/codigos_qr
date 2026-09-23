/**
 * CRIPQER Analytics V1.1 — the ONE canonical event write boundary.
 *
 * Every new Analytics V1.1 event must flow through `trackAnalyticsEvent`
 * (exposed here as `createCanonicalWriter().track`). There is no per-platform
 * persistence engine: whatsapp/instagram/tiktok/… clicks all share this single
 * boundary, which validates the event intent, normalizes the platform, preserves
 * the session id and bounds the metadata before delegating to the host RPC.
 */

import { assertQaRuntime } from "./qa-runtime-guard";
import { getOrCreateSessionId } from "./session";

export const CANONICAL_WRITABLE_EVENT_TYPES = [
  "session_start",
  "page_view",
  "cta_click",
  "whatsapp_click",
  "instagram_click",
  "facebook_click",
  "tiktok_click",
  "youtube_click",
  "linkedin_click",
  "external_link_click",
] as const;

export type CanonicalWritableEventType = (typeof CANONICAL_WRITABLE_EVENT_TYPES)[number];

export interface TrackAnalyticsEventInput {
  eventType: CanonicalWritableEventType;
  /** Canonical public identity; the host derives page/profile from it. */
  publicId: string;
  targetUrl?: string;
  itemId?: string;
  itemLabel?: string;
  source?: string;
  utmSource?: string;
  utmCampaign?: string;
}

export interface AnalyticsWriteResult {
  eventId: string | null;
  skipped: boolean;
  reason?: string;
}

/** Minimal host RPC boundary so the writer stays unit-testable without Supabase. */
export interface AnalyticsRpcBoundary {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
}

/** Deterministic platform normalization at the write boundary. */
const PLATFORM_BY_EVENT: Readonly<Record<CanonicalWritableEventType, string | null>> = {
  session_start: null,
  page_view: null,
  cta_click: null,
  whatsapp_click: "whatsapp",
  instagram_click: "instagram",
  facebook_click: "facebook",
  tiktok_click: "tiktok",
  youtube_click: "youtube",
  linkedin_click: "linkedin",
  external_link_click: null,
};

export function isCanonicalWritableEventType(value: unknown): value is CanonicalWritableEventType {
  return (
    typeof value === "string" &&
    (CANONICAL_WRITABLE_EVENT_TYPES as readonly string[]).includes(value)
  );
}

/** Map a canonical event type to its normalized destination platform (or null). */
export function normalizePlatform(eventType: CanonicalWritableEventType): string | null {
  return PLATFORM_BY_EVENT[eventType];
}

/**
 * Resolve the canonical click event type from a renderer intent + destination.
 * This happens once at the click source; the write boundary then validates the
 * resulting event type and normalizes the platform, so the analytics engine
 * never has to re-parse destination networks.
 */
export function resolveCanonicalClickType(
  type: string,
  url?: string | null,
): CanonicalWritableEventType {
  if (type === "cta_click") return "cta_click";
  const lower = (url ?? "").toLowerCase();
  if (lower.includes("wa.me") || lower.includes("whatsapp")) return "whatsapp_click";
  if (lower.includes("instagram")) return "instagram_click";
  if (lower.includes("facebook")) return "facebook_click";
  if (lower.includes("tiktok")) return "tiktok_click";
  if (lower.includes("youtube")) return "youtube_click";
  if (lower.includes("linkedin")) return "linkedin_click";
  if (type === "product_click" || type === "service_click") return "cta_click";
  return "external_link_click";
}

export interface CanonicalWriterConfig {
  supabaseUrl?: string | null;
  boundary: AnalyticsRpcBoundary;
}

export interface CanonicalAnalyticsWriter {
  track(input: TrackAnalyticsEventInput): Promise<AnalyticsWriteResult>;
  /** Expose the current pseudonymous session id for tests/inspection. */
  sessionId(): string;
  /** Read-only idempotency state snapshot (tests). */
  state(): { sessionStarts: string[]; pageViews: string[] };
}

export function createCanonicalWriter(config: CanonicalWriterConfig): CanonicalAnalyticsWriter {
  const emittedSessionStarts = new Set<string>();
  const emittedPageViews = new Set<string>();

  return {
    sessionId: () => getOrCreateSessionId(),
    state: () => ({
      sessionStarts: [...emittedSessionStarts],
      pageViews: [...emittedPageViews],
    }),
    async track(input: TrackAnalyticsEventInput): Promise<AnalyticsWriteResult> {
      // 1) Validate the event intent against the allowlist (never trust browser input).
      if (!isCanonicalWritableEventType(input.eventType)) {
        return {
          eventId: null,
          skipped: true,
          reason: `unsupported_event_type:${String(input.eventType)}`,
        };
      }

      // 2) QA runtime gate — refuse to write to production or any unknown project.
      try {
        assertQaRuntime(config.supabaseUrl);
      } catch (error) {
        return {
          eventId: null,
          skipped: true,
          reason: error instanceof Error ? error.message : "qa_runtime_gate_failed",
        };
      }

      // 3) Preserve the single browser session id.
      const sessionId = getOrCreateSessionId();

      // 4) Idempotency (synchronous, before any await) so React StrictMode /
      //    hydration / rerender double-invocations collapse into one write.
      if (input.eventType === "session_start") {
        if (emittedSessionStarts.has(sessionId)) {
          return { eventId: null, skipped: true, reason: "session_start_already_emitted" };
        }
        emittedSessionStarts.add(sessionId);
      }
      if (input.eventType === "page_view") {
        const key = `${input.publicId}|${sessionId}`;
        if (emittedPageViews.has(key)) {
          return { eventId: null, skipped: true, reason: "page_view_already_emitted" };
        }
        emittedPageViews.add(key);
      }

      // 5) Delegate to the single canonical RPC boundary (which normalizes
      //    platform server-side and bounds metadata).
      const { data, error } = await config.boundary.rpc("track_analytics_event", {
        p_public_id: input.publicId,
        p_event_type: input.eventType,
        p_session_id: sessionId,
        p_target_url: input.targetUrl ?? null,
        p_item_id: input.itemId ?? null,
        p_item_label: input.itemLabel ?? null,
        p_source: input.source ?? null,
        p_utm_source: input.utmSource ?? null,
        p_utm_campaign: input.utmCampaign ?? null,
        p_user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
        p_referrer: typeof document === "undefined" ? null : document.referrer || null,
      });

      if (error) {
        return { eventId: null, skipped: true, reason: `rpc_error:${error.message ?? "unknown"}` };
      }

      return { eventId: typeof data === "string" ? data : null, skipped: false };
    },
  };
}
