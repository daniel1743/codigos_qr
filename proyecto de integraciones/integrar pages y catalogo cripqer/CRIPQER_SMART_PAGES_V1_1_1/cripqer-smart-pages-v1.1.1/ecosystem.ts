/**
 * CRIPQER SMART PAGES V1.1 — ecosystem boundary contracts.
 *
 * Host boundary ONLY. This file contains no persistence, no routing, no QR
 * generation and no analytics backend. Cripqer (host) supplies real URLs,
 * identity and storage; Smart Pages only speaks these contracts.
 */

/** Where a button / card / nav entry points to. */
export type SmartDestinationV1 =
  | { mode: "external"; url: string }
  | { mode: "internal_page"; pageId: string }
  | { mode: "section"; sectionId: string };

export interface NavItemV1 {
  id: string;
  label: string;
  destination: SmartDestinationV1;
}

/**
 * Shared identity/context injected by the Cripqer host so a Smart Page does not
 * duplicate profile data. Every field is optional.
 */
export interface EcosystemContextV1 {
  ownerId?: string;
  profileId?: string;
  businessName?: string;
  brand?: { accent?: string; logoUrl?: string };
  avatarUrl?: string;
  logoUrl?: string;
  contact?: { phone?: string; whatsapp?: string; email?: string };
  socials?: Array<{ label: string; url: string }>;
  sourcePageId?: string;
  analyticsContext?: Record<string, string>;
  qrContext?: { qrId?: string; campaign?: string };
  /**
   * Stable host-provided public base URL for this Smart Page. Cripqer owns the
   * route; Smart Pages never invents one (QR codes can point here later).
   */
  publicBaseUrl?: string;
}

export type AnalyticsEventType =
  | "page_view"
  | "section_view"
  | "cta_click"
  | "item_click"
  | "whatsapp_click"
  | "contact_click"
  | "quote_click"
  | "booking_click"
  | "external_link_click"
  | "internal_page_click";

export interface AnalyticsEventV1 {
  type: AnalyticsEventType;
  pageId: string;
  itemId?: string;
  sectionId?: string;
  action?: string;
  metadata?: Record<string, string>;
}

export type AnalyticsHandler = (event: AnalyticsEventV1) => void;

/** Resolves a destination to an href when the host can express it as a URL. */
export function destinationHref(
  destination: SmartDestinationV1,
  ctx?: { publicBaseUrl?: string },
): string | undefined {
  switch (destination.mode) {
    case "external":
      return /^https?:/i.test(destination.url.trim()) ? destination.url : undefined;
    case "section":
      return `#${destination.sectionId}`;
    case "internal_page": {
      const base = ctx?.publicBaseUrl?.replace(/\/+$/, "");
      return base ? `${base}/${destination.pageId}` : undefined;
    }
    default:
      return undefined;
  }
}
