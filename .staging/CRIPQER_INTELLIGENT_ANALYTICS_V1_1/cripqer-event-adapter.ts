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
