export type AnalyticsEventType = "view" | "link_click";
export type DeviceType = "mobile" | "desktop" | "tablet" | "unknown";

export interface QRAnalyticsEvent {
  id: string;
  profile_id: string;
  event_type: AnalyticsEventType;
  link_id?: string | null;
  country?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  user_agent?: string | null;
  device_type?: DeviceType;
  browser?: string | null;
  os?: string | null;
  referrer?: string | null;
  session_id?: string | null;
  ip_hash?: string | null;
  created_at: string;
}

export interface AnalyticsContext {
  userAgent?: string;
  referrer?: string;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  eventType?: AnalyticsEventType;
  linkId?: string;
}

export interface AggregatedAnalytics {
  totalViews: number;
  totalClicks: number;
  uniqueVisitors: number;
  uniqueSessions: number;
  topLinks: Array<{
    link_id: string;
    link_label: string;
    link_url: string;
    click_count: number;
    unique_clicks: number;
  }>;
  deviceBreakdown: Record<DeviceType, number>;
  browserBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  dailyStats: Array<{
    date: string;
    views: number;
    clicks: number;
  }>;
}

export interface GeolocationData {
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
}
