import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  QRAnalyticsEvent,
  AnalyticsContext,
  AnalyticsFilters,
  AggregatedAnalytics,
  GeolocationData,
  DeviceType,
} from "../types/analytics";

/**
 * Generate a simple session ID based on timestamp and random
 */
function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}

/**
 * Get or create session ID from sessionStorage
 */
function getSessionId(): string {
  if (typeof window === "undefined") return generateSessionId();

  let sessionId = sessionStorage.getItem("qr_session_id");
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem("qr_session_id", sessionId);
  }
  return sessionId;
}

/**
 * Hash IP address for privacy (simple hash, not cryptographic)
 */
async function hashIP(ip: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    // Fallback simple hash
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .substring(0, 16);
}

/**
 * Detect device type from user agent
 */
function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua,
    )
  ) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Detect browser from user agent
 */
function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("edg")) return "Edge";
  if (ua.includes("chrome")) return "Chrome";
  if (ua.includes("safari")) return "Safari";
  if (ua.includes("opera") || ua.includes("opr")) return "Opera";
  return "Other";
}

/**
 * Detect OS from user agent
 */
function detectOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  if (ua.includes("android")) return "Android";
  if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  return "Other";
}

/**
 * Get approximate geolocation from IP using ip-api.com (free, 45 req/min)
 * Note: This should ideally be called from server-side to get real IP
 */
async function getGeolocation(): Promise<GeolocationData> {
  try {
    const response = await fetch("http://ip-api.com/json/");
    const data = await response.json();

    if (data.status === "success") {
      return {
        country: data.country,
        city: data.city,
        lat: data.lat,
        lon: data.lon,
      };
    }
  } catch (error) {
    console.error("Error getting geolocation:", error);
  }

  return {};
}

export const analyticsService = {
  /**
   * Track page view
   */
  async trackPageView(
    supabase: SupabaseClient,
    profileId: string,
    context: AnalyticsContext = {},
  ): Promise<string | null> {
    try {
      const userAgent = context.userAgent || navigator.userAgent;
      const sessionId = getSessionId();
      const geo = await getGeolocation();

      // Note: IP hash would need server-side implementation for real IP
      // For now we use session ID as proxy for unique visitors
      const ipHash = await hashIP(sessionId);

      const { data, error } = await supabase.rpc("track_page_view", {
        p_profile_id: profileId,
        p_country: geo.country || null,
        p_city: geo.city || null,
        p_latitude: geo.lat || null,
        p_longitude: geo.lon || null,
        p_user_agent: userAgent,
        p_device_type: detectDeviceType(userAgent),
        p_browser: detectBrowser(userAgent),
        p_os: detectOS(userAgent),
        p_referrer: context.referrer || document.referrer || null,
        p_session_id: sessionId,
        p_ip_hash: ipHash,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error tracking page view:", error);
      return null;
    }
  },

  /**
   * Track link click
   */
  async trackLinkClick(
    supabase: SupabaseClient,
    profileId: string,
    linkId: string,
    context: AnalyticsContext = {},
  ): Promise<string | null> {
    try {
      const userAgent = context.userAgent || navigator.userAgent;
      const sessionId = getSessionId();
      const geo = await getGeolocation();
      const ipHash = await hashIP(sessionId);

      const { data, error } = await supabase.rpc("track_link_click", {
        p_profile_id: profileId,
        p_link_id: linkId,
        p_country: geo.country || null,
        p_city: geo.city || null,
        p_latitude: geo.lat || null,
        p_longitude: geo.lon || null,
        p_user_agent: userAgent,
        p_device_type: detectDeviceType(userAgent),
        p_browser: detectBrowser(userAgent),
        p_os: detectOS(userAgent),
        p_referrer: context.referrer || document.referrer || null,
        p_session_id: sessionId,
        p_ip_hash: ipHash,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error tracking link click:", error);
      return null;
    }
  },

  /**
   * Get analytics for a profile
   */
  async getProfileAnalytics(
    supabase: SupabaseClient,
    profileId: string,
    filters: AnalyticsFilters = {},
  ): Promise<QRAnalyticsEvent[]> {
    let query = supabase
      .from("qr_analytics")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate);
    }

    if (filters.eventType) {
      query = query.eq("event_type", filters.eventType);
    }

    if (filters.linkId) {
      query = query.eq("link_id", filters.linkId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get aggregated analytics
   */
  async getAggregatedAnalytics(
    supabase: SupabaseClient,
    profileId: string,
    days: number = 30,
  ): Promise<AggregatedAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = await this.getProfileAnalytics(supabase, profileId, {
      startDate: startDate.toISOString(),
    });

    const totalViews = events.filter((e) => e.event_type === "view").length;
    const totalClicks = events.filter((e) => e.event_type === "link_click").length;
    const uniqueSessions = new Set(events.map((e) => e.session_id).filter(Boolean)).size;
    const uniqueVisitors = new Set(events.map((e) => e.ip_hash).filter(Boolean)).size;

    // Device breakdown
    const deviceBreakdown: Record<DeviceType, number> = {
      mobile: 0,
      desktop: 0,
      tablet: 0,
      unknown: 0,
    };
    events.forEach((e) => {
      if (e.device_type) {
        deviceBreakdown[e.device_type]++;
      }
    });

    // Browser breakdown
    const browserBreakdown: Record<string, number> = {};
    events.forEach((e) => {
      if (e.browser) {
        browserBreakdown[e.browser] = (browserBreakdown[e.browser] || 0) + 1;
      }
    });

    // Country breakdown
    const countryBreakdown: Record<string, number> = {};
    events.forEach((e) => {
      if (e.country) {
        countryBreakdown[e.country] = (countryBreakdown[e.country] || 0) + 1;
      }
    });

    // Daily stats
    const dailyMap = new Map<string, { views: number; clicks: number }>();
    events.forEach((e) => {
      const date = e.created_at.split("T")[0] ?? e.created_at;
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { views: 0, clicks: 0 });
      }
      const stats = dailyMap.get(date)!;
      if (e.event_type === "view") {
        stats.views++;
      } else {
        stats.clicks++;
      }
    });

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top links (need to query top_links view)
    const { data: topLinksData } = await supabase
      .from("qr_top_links")
      .select("*")
      .eq("profile_id", profileId)
      .limit(10);

    const topLinks = (topLinksData || []).map((link) => ({
      link_id: link.link_id,
      link_label: link.link_label,
      link_url: link.link_url,
      click_count: link.click_count,
      unique_clicks: link.unique_clicks,
    }));

    return {
      totalViews,
      totalClicks,
      uniqueVisitors,
      uniqueSessions,
      topLinks,
      deviceBreakdown,
      browserBreakdown,
      countryBreakdown,
      dailyStats,
    };
  },
};
