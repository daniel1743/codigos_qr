/** Isolated staging adapter. It does not call Supabase or production code. */

import { CHANNEL_EVENT, type AnalyticsEventV1, type AnalyticsEventType, type DeviceKind } from "./analytics.types";

export interface CripqerLegacyAnalyticsEvent {
  id: string;
  profile_id: string;
  page_id?: string | null;
  event_type: "view" | "link_click";
  link_id?: string | null;
  item_id?: string | null;
  item_label?: string | null;
  target_url?: string | null;
  user_agent?: string | null;
  device_type?: DeviceKind | null;
  browser?: string | null;
  os?: string | null;
  country?: string | null;
  city?: string | null;
  referrer?: string | null;
  session_id?: string | null;
  created_at: string;
  interaction_type?: "button" | "whatsapp" | "product" | "service" | null;
  source?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
}

export interface AdapterContext {
  scope: "profile" | "page" | "smart_page";
  smartPageId?: string;
  qrId?: string;
}

/**
 * Data-quality classification for every derived AnalyticsEventV1 field.
 * "EXACT" is copied verbatim from a persisted column; "NORMALIZED" is a
 * deterministic transform of a persisted value (e.g. URL -> channel); "APPROXIMATE"
 * is an imperfect signal (e.g. a city rounded from a coarse source); "UNAVAILABLE"
 * means the field has no defensible persisted source and MUST NOT be invented.
 */
export type ProvenanceClass = "EXACT" | "NORMALIZED" | "APPROXIMATE" | "UNAVAILABLE";

export interface FieldProvenance {
  field: keyof AnalyticsEventV1;
  provenance: ProvenanceClass;
  available: boolean;
  source: string;
  note?: string;
}

function channelEvent(url: string | null | undefined, interaction: CripqerLegacyAnalyticsEvent["interaction_type"]): AnalyticsEventType {
  if (interaction === "whatsapp" || url?.toLowerCase().includes("wa.me") || url?.toLowerCase().includes("whatsapp")) return CHANNEL_EVENT.whatsapp;
  const lower = url?.toLowerCase() ?? "";
  if (lower.includes("instagram")) return CHANNEL_EVENT.instagram;
  if (lower.includes("facebook")) return CHANNEL_EVENT.facebook;
  if (lower.includes("tiktok")) return CHANNEL_EVENT.tiktok;
  if (lower.includes("youtube")) return CHANNEL_EVENT.youtube;
  if (lower.includes("linkedin")) return CHANNEL_EVENT.linkedin;
  return interaction === "button" ? "cta_click" : CHANNEL_EVENT.other;
}

export function toAnalyticsEventV1(event: CripqerLegacyAnalyticsEvent, context: AdapterContext): AnalyticsEventV1 {
  const eventType: AnalyticsEventType = event.event_type === "view"
    ? context.scope === "smart_page" ? "smart_page_view" : "page_view"
    : channelEvent(event.target_url, event.interaction_type);
  return {
    id: event.id,
    eventType,
    timestamp: event.created_at,
    profileId: event.profile_id,
    ...(event.page_id ? { pageId: event.page_id } : {}),
    ...(context.smartPageId ? { smartPageId: context.smartPageId } : {}),
    ...(context.qrId ? { qrId: context.qrId } : {}),
    ...(event.link_id ? { linkId: event.link_id } : {}),
    ...(event.item_id ? { itemId: event.item_id } : {}),
    ...(event.item_label ? { linkLabel: event.item_label } : {}),
    ...(event.interaction_type ? { platform: event.interaction_type } : {}),
    ...(event.session_id ? { sessionId: event.session_id } : {}),
    ...(event.source ? { source: event.source } : {}),
    ...(event.referrer ? { referrer: event.referrer } : {}),
    ...(event.utm_source ? { utmSource: event.utm_source } : {}),
    ...(event.utm_campaign ? { utmCampaign: event.utm_campaign } : {}),
    ...(event.device_type ? { device: event.device_type } : {}),
    ...(event.browser ? { browser: event.browser } : {}),
    ...(event.os ? { os: event.os } : {}),
    ...(event.country ? { country: event.country } : {}),
    ...(event.city ? { cityApprox: event.city } : {}),
    metadata: { legacyEventType: event.event_type, scope: context.scope },
  };
}

export function toAnalyticsEventsV1(events: CripqerLegacyAnalyticsEvent[], context: AdapterContext): AnalyticsEventV1[] {
  return events.map((event) => toAnalyticsEventV1(event, context));
}

/**
 * Canonical read-only compatibility boundary name (Phase C1).
 *
 * Transforms a persisted Cripqer analytics record into the hardened
 * AnalyticsEventV1 contract WITHOUT modifying the stored record.
 * Alias of `toAnalyticsEventV1` for clarity at the persistence boundary.
 */
export const fromLegacyAnalyticsRecord = toAnalyticsEventV1;
export const fromLegacyAnalyticsRecords = toAnalyticsEventsV1;

/**
 * Data-quality / provenance matrix for one legacy record.
 *
 * Every field is classified so a host can show exactly which fields are
 * trustworthy, normalized, approximate or unavailable — without inventing any.
 */
export function provenanceOf(event: CripqerLegacyAnalyticsEvent, context: AdapterContext): FieldProvenance[] {
  const isClick = event.event_type === "link_click";
  const eventType = event.event_type === "view"
    ? context.scope === "smart_page" ? "smart_page_view" : "page_view"
    : channelEvent(event.target_url, event.interaction_type);
  const channelNormalized = isClick && eventType !== "external_link_click" && eventType !== "cta_click";

  return [
    { field: "id", provenance: "EXACT", available: true, source: "qr_analytics.id" },
    {
      field: "eventType",
      provenance: channelNormalized ? "NORMALIZED" : "EXACT",
      available: true,
      source: "qr_analytics.event_type (+ interaction_type/target_url when link_click)",
    },
    { field: "timestamp", provenance: "EXACT", available: true, source: "qr_analytics.created_at" },
    { field: "profileId", provenance: "EXACT", available: true, source: "qr_analytics.profile_id" },
    {
      field: "pageId",
      provenance: event.page_id ? "EXACT" : "UNAVAILABLE",
      available: Boolean(event.page_id),
      source: "qr_analytics.page_id",
    },
    {
      field: "smartPageId",
      provenance: "UNAVAILABLE",
      available: false,
      source: "not persisted",
      note: "child pages are not smart pages; never inferred",
    },
    {
      field: "qrId",
      provenance: "UNAVAILABLE",
      available: false,
      source: "not persisted",
      note: "no QR origin is recorded for child-page events; page_view is never assumed to be a qr_scan",
    },
    {
      field: "linkId",
      provenance: event.link_id ? "EXACT" : "UNAVAILABLE",
      available: Boolean(event.link_id),
      source: "qr_analytics.link_id",
    },
    {
      field: "linkLabel",
      provenance: event.item_label ? "EXACT" : "UNAVAILABLE",
      available: Boolean(event.item_label),
      source: "qr_analytics.item_label",
    },
    {
      field: "itemId",
      provenance: event.item_id ? "EXACT" : "UNAVAILABLE",
      available: Boolean(event.item_id),
      source: "qr_analytics.item_id",
    },
    {
      field: "platform",
      provenance: event.interaction_type ? "NORMALIZED" : "UNAVAILABLE",
      available: Boolean(event.interaction_type),
      source: "qr_analytics.interaction_type",
    },
    {
      field: "sessionId",
      provenance: event.session_id ? "EXACT" : "UNAVAILABLE",
      available: Boolean(event.session_id),
      source: "qr_analytics.session_id",
      note: "track_child_page_event does not persist session_id, so this is normally UNAVAILABLE for child-page events",
    },
    {
      field: "source",
      provenance: event.source ? "EXACT" : "UNAVAILABLE",
      available: Boolean(event.source),
      source: "qr_analytics has no source column; only reflected if a future column supplies it",
    },
    {
      field: "referrer",
      provenance: event.referrer ? "EXACT" : "UNAVAILABLE",
      available: Boolean(event.referrer),
      source: "qr_analytics.referrer",
    },
    { field: "utmSource", provenance: "UNAVAILABLE", available: false, source: "column does not exist" },
    { field: "utmCampaign", provenance: "UNAVAILABLE", available: false, source: "column does not exist" },
    {
      field: "device",
      provenance: "UNAVAILABLE",
      available: false,
      source: "not persisted for child-page events",
      note: "user_agent is persisted but device_type is not written by track_child_page_event",
    },
    {
      field: "browser",
      provenance: "UNAVAILABLE",
      available: false,
      source: "not persisted for child-page events",
    },
    {
      field: "os",
      provenance: "UNAVAILABLE",
      available: false,
      source: "not persisted for child-page events",
    },
    {
      field: "country",
      provenance: event.country ? "EXACT" : "UNAVAILABLE",
      available: Boolean(event.country),
      source: "qr_analytics.country",
      note: "not written for child-page events",
    },
    {
      field: "cityApprox",
      provenance: event.city ? "APPROXIMATE" : "UNAVAILABLE",
      available: Boolean(event.city),
      source: "qr_analytics.city",
    },
    {
      field: "metadata",
      provenance: "NORMALIZED",
      available: true,
      source: "adapter metadata (legacyEventType, scope)",
    },
  ];
}
