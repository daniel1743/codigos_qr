/**
 * Phase C2A — Persistence evolution verification (read-side, isolated).
 *
 * Exercises the compatibility adapter against a MIXED dataset:
 *   * legacy rows ("view" / "link_click") that must keep their current mapping;
 *   * future enriched rows carrying the new nullable columns
 *     (source, utm_source, utm_campaign, qr_id) and canonical event types.
 *
 * These tests never call Supabase or production code.
 */
import { describe, expect, it } from "vitest";
import {
  fromLegacyAnalyticsRecord,
  provenanceOf,
  type CripqerLegacyAnalyticsEvent,
} from "./cripqer-event-adapter";
import { inferAvailability } from "./real-data-capability";

function legacy(overrides: Partial<CripqerLegacyAnalyticsEvent> = {}): CripqerLegacyAnalyticsEvent {
  return {
    id: "evt-legacy",
    profile_id: "profile-1",
    page_id: "page-1",
    event_type: "view",
    created_at: "2026-09-22T15:00:00.000Z",
    ...overrides,
  };
}

describe("Phase C2A — legacy rows remain valid (adapter regression)", () => {
  it("normalizes a persisted view to page_view and never fabricates a qr_scan", () => {
    const mapped = fromLegacyAnalyticsRecord(legacy({ event_type: "view", qr_id: null }), {
      scope: "page",
    });
    expect(mapped.eventType).toBe("page_view");
    expect(mapped.qrId).toBeUndefined();
  });

  it("normalizes a persisted link_click to its channel without inventing source/utm", () => {
    const mapped = fromLegacyAnalyticsRecord(
      legacy({ event_type: "link_click", target_url: "https://wa.me/56900000000" }),
      { scope: "page" },
    );
    expect(mapped.eventType).toBe("whatsapp_click");
    expect(mapped.source).toBeUndefined();
    expect(mapped.utmSource).toBeUndefined();
    expect(mapped.utmCampaign).toBeUndefined();
  });
});

describe("Phase C2A — new enriched rows map into AnalyticsEventV1", () => {
  it("passes a canonical page_view through and preserves session_id exactly", () => {
    const mapped = fromLegacyAnalyticsRecord(
      legacy({ event_type: "page_view", session_id: "sess-1" }),
      { scope: "page" },
    );
    expect(mapped.eventType).toBe("page_view");
    expect(mapped.sessionId).toBe("sess-1");
  });

  it("passes a whatsapp_click with platform through", () => {
    const mapped = fromLegacyAnalyticsRecord(
      legacy({ event_type: "whatsapp_click", interaction_type: "whatsapp" }),
      { scope: "page" },
    );
    expect(mapped.eventType).toBe("whatsapp_click");
    expect(mapped.platform).toBe("whatsapp");
  });

  it("passes canonical event types through verbatim", () => {
    const canonical = [
      "external_link_click",
      "share",
      "lead_created",
      "session_start",
      "return_visit",
      "cta_click",
      "qr_scan",
      "smart_page_view",
    ] as const;
    for (const eventType of canonical) {
      const mapped = fromLegacyAnalyticsRecord(legacy({ event_type: eventType }), {
        scope: "page",
      });
      expect(mapped.eventType).toBe(eventType);
    }
  });

  it("maps UTM/source columns exactly", () => {
    const mapped = fromLegacyAnalyticsRecord(
      legacy({
        event_type: "page_view",
        source: "qr",
        utm_source: "instagram",
        utm_campaign: "spring-2026",
      }),
      { scope: "page" },
    );
    expect(mapped.source).toBe("qr");
    expect(mapped.utmSource).toBe("instagram");
    expect(mapped.utmCampaign).toBe("spring-2026");
  });

  it("maps a persisted qr_id to qrId for a qr_scan", () => {
    const mapped = fromLegacyAnalyticsRecord(
      legacy({ event_type: "qr_scan", qr_id: "qr-public-123" }),
      { scope: "page" },
    );
    expect(mapped.eventType).toBe("qr_scan");
    expect(mapped.qrId).toBe("qr-public-123");
  });

  it("leaves every optional field absent when a row carries no optional context", () => {
    const mapped = fromLegacyAnalyticsRecord(
      legacy({
        event_type: "page_view",
        session_id: null,
        qr_id: null,
        source: null,
        utm_source: null,
        utm_campaign: null,
      }),
      { scope: "page" },
    );
    expect(mapped.sessionId).toBeUndefined();
    expect(mapped.qrId).toBeUndefined();
    expect(mapped.source).toBeUndefined();
    expect(mapped.utmSource).toBeUndefined();
    expect(mapped.utmCampaign).toBeUndefined();
    expect(mapped.device).toBeUndefined();
    expect(mapped.browser).toBeUndefined();
    expect(mapped.os).toBeUndefined();
    expect(mapped.country).toBeUndefined();
    expect(mapped.cityApprox).toBeUndefined();
  });
});

describe("Phase C2A — NULL session stays unavailable", () => {
  it("does not turn a NULL session_id into a synthetic session", () => {
    const mapped = fromLegacyAnalyticsRecord(legacy({ event_type: "view", session_id: null }), {
      scope: "page",
    });
    expect(mapped.sessionId).toBeUndefined();
  });
});

describe("Phase C2A — provenance is truthful for the new columns", () => {
  it("reports qr_id and utm as EXACT only when persisted", () => {
    const empty = provenanceOf(legacy({ event_type: "view" }), { scope: "page" });
    const byField = Object.fromEntries(empty.map((entry) => [entry.field, entry]));
    expect(byField["qrId"]!.provenance).toBe("UNAVAILABLE");
    expect(byField["utmSource"]!.provenance).toBe("UNAVAILABLE");
    expect(byField["utmCampaign"]!.provenance).toBe("UNAVAILABLE");

    const enriched = provenanceOf(
      legacy({
        event_type: "qr_scan",
        qr_id: "qr-1",
        source: "qr",
        utm_source: "ig",
        utm_campaign: "c1",
      }),
      { scope: "page" },
    );
    const byField2 = Object.fromEntries(enriched.map((entry) => [entry.field, entry]));
    expect(byField2["qrId"]!.provenance).toBe("EXACT");
    expect(byField2["utmSource"]!.provenance).toBe("EXACT");
    expect(byField2["utmCampaign"]!.provenance).toBe("EXACT");
    expect(byField2["source"]!.provenance).toBe("EXACT");
  });
});

describe("Phase C2A — capability gating for the new signals", () => {
  it("keeps session/traffic/QR gates closed for legacy-only rows", () => {
    const availability = inferAvailability([
      fromLegacyAnalyticsRecord(legacy({ event_type: "view", session_id: null }), {
        scope: "page",
      }),
    ]);
    expect(availability.sessionTracking).toBe(false);
    expect(availability.qrProvenance).toBe(false);
    expect(availability.hasTrafficSource).toBe(false);
  });

  it("opens gates only when enriched rows actually persist the signals", () => {
    const availability = inferAvailability([
      fromLegacyAnalyticsRecord(
        legacy({ event_type: "page_view", session_id: "s-1", source: "qr", utm_source: "ig" }),
        { scope: "page" },
      ),
    ]);
    expect(availability.sessionTracking).toBe(true);
    expect(availability.hasTrafficSource).toBe(true);
    expect(availability.qrProvenance).toBe(false);
  });
});
