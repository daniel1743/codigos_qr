import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANONICAL_WRITABLE_EVENT_TYPES,
  createCanonicalWriter,
  isCanonicalWritableEventType,
  normalizePlatform,
  resolveCanonicalClickType,
} from "./canonical-writer";
import { QA_PROJECT_REF } from "./qa-runtime-guard";
import { getOrCreateSessionId } from "./session";

const QA_URL = `https://${QA_PROJECT_REF}.supabase.co`;

function fakeBoundary() {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return { data: `event-${calls.length}`, error: null };
    },
  };
}

function installFakeSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
  vi.stubGlobal("window", { sessionStorage });
  return sessionStorage;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizePlatform", () => {
  it("maps social events to deterministic platforms and null elsewhere", () => {
    expect(normalizePlatform("whatsapp_click")).toBe("whatsapp");
    expect(normalizePlatform("instagram_click")).toBe("instagram");
    expect(normalizePlatform("facebook_click")).toBe("facebook");
    expect(normalizePlatform("tiktok_click")).toBe("tiktok");
    expect(normalizePlatform("youtube_click")).toBe("youtube");
    expect(normalizePlatform("linkedin_click")).toBe("linkedin");
    expect(normalizePlatform("external_link_click")).toBeNull();
    expect(normalizePlatform("cta_click")).toBeNull();
    expect(normalizePlatform("page_view")).toBeNull();
    expect(normalizePlatform("session_start")).toBeNull();
  });
});

describe("isCanonicalWritableEventType", () => {
  it("accepts only the allowlisted canonical event types", () => {
    for (const type of CANONICAL_WRITABLE_EVENT_TYPES) {
      expect(isCanonicalWritableEventType(type)).toBe(true);
    }
    expect(isCanonicalWritableEventType("lead_created")).toBe(false);
    expect(isCanonicalWritableEventType("share")).toBe(false);
    expect(isCanonicalWritableEventType("return_visit")).toBe(false);
    expect(isCanonicalWritableEventType("view")).toBe(false);
    expect(isCanonicalWritableEventType("link_click")).toBe(false);
    expect(isCanonicalWritableEventType(42)).toBe(false);
  });
});

describe("resolveCanonicalClickType", () => {
  it("resolves channel clicks from the destination once, deterministically", () => {
    expect(resolveCanonicalClickType("cta_click")).toBe("cta_click");
    expect(resolveCanonicalClickType("link_click", "https://wa.me/56900000000")).toBe(
      "whatsapp_click",
    );
    expect(resolveCanonicalClickType("link_click", "https://instagram.com/cripqer")).toBe(
      "instagram_click",
    );
    expect(resolveCanonicalClickType("link_click", "https://facebook.com/cripqer")).toBe(
      "facebook_click",
    );
    expect(resolveCanonicalClickType("link_click", "https://tiktok.com/@cripqer")).toBe(
      "tiktok_click",
    );
    expect(resolveCanonicalClickType("link_click", "https://youtube.com/@cripqer")).toBe(
      "youtube_click",
    );
    expect(resolveCanonicalClickType("link_click", "https://linkedin.com/company/cripqer")).toBe(
      "linkedin_click",
    );
    expect(resolveCanonicalClickType("link_click", "https://example.com")).toBe(
      "external_link_click",
    );
    expect(resolveCanonicalClickType("product_click")).toBe("cta_click");
    expect(resolveCanonicalClickType("service_click")).toBe("cta_click");
  });
});

describe("canonical writer runtime gate", () => {
  it("refuses to write when the runtime resolves to the production project without the gate", async () => {
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({
      supabaseUrl: "https://mlinfiuhkxdhlveflbkj.supabase.co",
      boundary,
    });
    const result = await writer.track({ eventType: "page_view", publicId: "qa-page" });
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("disabled");
    expect(boundary.calls).toHaveLength(0);
  });

  it("allows a production write only when the flag is on and the page is allowlisted", async () => {
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({
      supabaseUrl: "https://mlinfiuhkxdhlveflbkj.supabase.co",
      boundary,
      environment: {
        VITE_ANALYTICS_CANONICAL_ENABLED: "true",
        VITE_ANALYTICS_CANONICAL_PAGE_ALLOWLIST: "canary-page",
      },
    });
    const result = await writer.track({ eventType: "page_view", publicId: "canary-page" });
    expect(result.skipped).toBe(false);
    expect(boundary.calls).toHaveLength(1);
  });

  it("refuses to write against an unknown project", async () => {
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: "https://other.supabase.co", boundary });
    const result = await writer.track({ eventType: "page_view", publicId: "qa-page" });
    expect(result.skipped).toBe(true);
    expect(boundary.calls).toHaveLength(0);
  });

  it("writes through the canonical RPC for the QA project", async () => {
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });
    const result = await writer.track({ eventType: "page_view", publicId: "qa-page" });
    expect(result.skipped).toBe(false);
    expect(result.eventId).toBe("event-1");
    expect(boundary.calls).toHaveLength(1);
    expect(boundary.calls[0]?.fn).toBe("track_analytics_event");
    expect(boundary.calls[0]?.args["p_public_id"]).toBe("qa-page");
    expect(boundary.calls[0]?.args["p_event_type"]).toBe("page_view");
  });
});

describe("canonical writer session & idempotency", () => {
  it("reuses the single browser session id across events", () => {
    installFakeSessionStorage();
    expect(getOrCreateSessionId()).toBe(getOrCreateSessionId());
  });

  it("emits session_start at most once per session", async () => {
    installFakeSessionStorage();
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    const first = await writer.track({ eventType: "session_start", publicId: "qa-page" });
    const second = await writer.track({ eventType: "session_start", publicId: "qa-page" });

    expect(first.skipped).toBe(false);
    expect(second.skipped).toBe(true);
    expect(second.reason).toBe("session_start_already_emitted");
    expect(boundary.calls).toHaveLength(1);
  });

  it("emits page_view once per page+session but allows distinct pages", async () => {
    installFakeSessionStorage();
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    const first = await writer.track({ eventType: "page_view", publicId: "qa-page" });
    const dup = await writer.track({ eventType: "page_view", publicId: "qa-page" });
    const other = await writer.track({ eventType: "page_view", publicId: "other-page" });

    expect(first.skipped).toBe(false);
    expect(dup.skipped).toBe(true);
    expect(dup.reason).toBe("page_view_already_emitted");
    expect(other.skipped).toBe(false);
    expect(boundary.calls).toHaveLength(2);
  });

  it("does not deduplicate legitimate clicks", async () => {
    installFakeSessionStorage();
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    await writer.track({
      eventType: "whatsapp_click",
      publicId: "qa-page",
      targetUrl: "https://wa.me/1",
    });
    await writer.track({
      eventType: "whatsapp_click",
      publicId: "qa-page",
      targetUrl: "https://wa.me/1",
    });

    expect(boundary.calls).toHaveLength(2);
  });

  it("shares the same persisted session id across page_view and subsequent clicks", async () => {
    installFakeSessionStorage();
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    await writer.track({ eventType: "session_start", publicId: "qa-page" });
    await writer.track({ eventType: "page_view", publicId: "qa-page" });
    await writer.track({
      eventType: "cta_click",
      publicId: "qa-page",
      targetUrl: "https://example.com",
    });

    const sessionIds = boundary.calls.map((call) => call.args["p_session_id"]);
    expect(new Set(sessionIds).size).toBe(1);
  });
});

describe("canonical writer device context", () => {
  it("classifies the browser user-agent and passes p_device_type to the RPC", async () => {
    installFakeSessionStorage();
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    const result = await writer.track({ eventType: "page_view", publicId: "qa-page" });
    expect(result.skipped).toBe(false);
    expect(boundary.calls[0]?.args["p_device_type"]).toBe("mobile");
    expect(boundary.calls[0]?.args["p_user_agent"]).toContain("iPhone");
  });

  it("passes unknown when no navigator/user-agent is available", async () => {
    installFakeSessionStorage();
    vi.stubGlobal("navigator", undefined);
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    await writer.track({ eventType: "page_view", publicId: "qa-page" });
    expect(boundary.calls[0]?.args["p_device_type"]).toBe("unknown");
    expect(boundary.calls[0]?.args["p_user_agent"]).toBeNull();
  });
});

describe("canonical writer QR scan boundary", () => {
  it("emits qr_scan with the QR identity and forces source=qr", async () => {
    installFakeSessionStorage();
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    const result = await writer.track({
      eventType: "qr_scan",
      publicId: "qa-page",
      qrId: "qa-page",
    });

    expect(result.skipped).toBe(false);
    expect(boundary.calls[0]?.args["p_event_type"]).toBe("qr_scan");
    expect(boundary.calls[0]?.args["p_qr_id"]).toBe("qa-page");
    expect(boundary.calls[0]?.args["p_source"]).toBe("qr");
  });

  it("defaults source to qr for qr_scan even without an explicit source", async () => {
    installFakeSessionStorage();
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    await writer.track({ eventType: "qr_scan", publicId: "qa-page" });
    expect(boundary.calls[0]?.args["p_source"]).toBe("qr");
  });

  it("does not deduplicate two distinct qr_scan events", async () => {
    installFakeSessionStorage();
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    await writer.track({ eventType: "qr_scan", publicId: "qa-page" });
    await writer.track({ eventType: "qr_scan", publicId: "qa-page" });

    expect(boundary.calls).toHaveLength(2);
  });
});
