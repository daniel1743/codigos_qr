import { describe, expect, it } from "vitest";
import {
  fromLegacyAnalyticsRecord,
  provenanceOf,
  type CripqerLegacyAnalyticsEvent,
} from "./cripqer-event-adapter";

function legacy(overrides: Partial<CripqerLegacyAnalyticsEvent> = {}): CripqerLegacyAnalyticsEvent {
  return {
    id: "legacy-1",
    profile_id: "profile-1",
    page_id: "page-1",
    event_type: "view",
    created_at: "2026-09-22T15:00:00.000Z",
    ...overrides,
  };
}

describe("fromLegacyAnalyticsRecord (legacy -> AnalyticsEventV1)", () => {
  it("maps a persisted view to page_view and never fabricates a qr_scan", () => {
    const mapped = fromLegacyAnalyticsRecord(legacy(), { scope: "page" });
    expect(mapped.eventType).toBe("page_view");
    expect(mapped.eventType).not.toBe("qr_scan");
    expect(mapped.qrId).toBeUndefined();
  });

  it("maps a view to smart_page_view only when the host context proves smart-page scope", () => {
    const pageView = fromLegacyAnalyticsRecord(legacy(), { scope: "page" });
    const smartView = fromLegacyAnalyticsRecord(legacy(), {
      scope: "smart_page",
      smartPageId: "smart-1",
    });
    expect(pageView.eventType).toBe("page_view");
    expect(smartView.eventType).toBe("smart_page_view");
    expect(smartView.smartPageId).toBe("smart-1");
  });

  it("normalizes WhatsApp/social/button links deterministically", () => {
    const whatsapp = fromLegacyAnalyticsRecord(
      legacy({ event_type: "link_click", target_url: "https://wa.me/56900000000" }),
      { scope: "page" },
    );
    const instagram = fromLegacyAnalyticsRecord(
      legacy({ event_type: "link_click", target_url: "https://instagram.com/cripqer" }),
      { scope: "page" },
    );
    const button = fromLegacyAnalyticsRecord(
      legacy({ event_type: "link_click", interaction_type: "button", target_url: "https://example.com" }),
      { scope: "page" },
    );
    const other = fromLegacyAnalyticsRecord(
      legacy({ event_type: "link_click", target_url: "https://example.com" }),
      { scope: "page" },
    );

    expect(whatsapp.eventType).toBe("whatsapp_click");
    expect(instagram.eventType).toBe("instagram_click");
    expect(button.eventType).toBe("cta_click");
    expect(other.eventType).toBe("external_link_click");
  });

  it("preserves page and session identity only when they are persisted", () => {
    const mapped = fromLegacyAnalyticsRecord(
      legacy({ event_type: "view", page_id: "page-1", session_id: "s-1" }),
      { scope: "page" },
    );
    expect(mapped.pageId).toBe("page-1");
    expect(mapped.sessionId).toBe("s-1");

    const noSession = fromLegacyAnalyticsRecord(legacy({ event_type: "view", session_id: null }), {
      scope: "page",
    });
    expect(noSession.sessionId).toBeUndefined();
  });

  it("classifies provenance truthfully for a child-page record without session_id", () => {
    const record = legacy({ event_type: "view", session_id: null, country: null, city: null });
    const provenance = provenanceOf(record, { scope: "page" });
    const byField = Object.fromEntries(provenance.map((entry) => [entry.field, entry]));
    const p = (field: string) => byField[field]!;

    expect(p("timestamp").provenance).toBe("EXACT");
    expect(p("pageId").provenance).toBe("EXACT");
    expect(p("sessionId").provenance).toBe("UNAVAILABLE");
    expect(p("qrId").provenance).toBe("UNAVAILABLE");
    expect(p("country").provenance).toBe("UNAVAILABLE");
    expect(p("utmSource").provenance).toBe("UNAVAILABLE");
  });
});
