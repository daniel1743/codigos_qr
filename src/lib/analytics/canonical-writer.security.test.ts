import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANONICAL_WRITABLE_EVENT_TYPES,
  createCanonicalWriter,
} from "./canonical-writer";
import { QA_PROJECT_REF } from "./qa-runtime-guard";

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
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("canonical writer security invariants (C2B5)", () => {
  it("never forwards owner/profile/page identity to the RPC boundary", async () => {
    installFakeSessionStorage();
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    await writer.track({ eventType: "page_view", publicId: "qa-page" });
    await writer.track({
      eventType: "whatsapp_click",
      publicId: "qa-page",
      targetUrl: "https://wa.me/1",
      itemId: "qa-cta",
      itemLabel: "label",
    });

    const forbidden = [
      "p_owner_user_id",
      "p_profile_id",
      "p_page_id",
      "p_user_id",
      "owner_user_id",
      "profile_id",
      "page_id",
    ];
    for (const call of boundary.calls) {
      const keys = Object.keys(call.args);
      for (const key of forbidden) {
        expect(keys).not.toContain(key);
      }
      // The only identity accepted by the host is the public_id (and optional
      // bounded metadata / session / device fields).
      expect(call.args).toHaveProperty("p_public_id");
    }
  });

  it("only ever emits the canonical allowlisted event types", async () => {
    installFakeSessionStorage();
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    const rejected = [
      "lead_created",
      "share",
      "return_visit",
      "smart_page_view",
      "view",
      "link_click",
      "child_page_event",
      "garbage",
    ];
    for (const type of rejected) {
      const result = await writer.track({
        eventType: type as never,
        publicId: "qa-page",
      });
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain("unsupported_event_type");
    }
    expect(boundary.calls).toHaveLength(0);

    // Every allowlisted type is accepted by the writer (server re-validates).
    for (const type of CANONICAL_WRITABLE_EVENT_TYPES) {
      const result = await writer.track({
        eventType: type,
        publicId: "qa-page",
        ...(type === "qr_scan" ? { qrId: "qa-page" } : {}),
      });
      expect(result.skipped).toBe(false);
    }
    expect(boundary.calls).toHaveLength(CANONICAL_WRITABLE_EVENT_TYPES.length);
  });

  it("derives device/platform deterministically and never trusts a client platform string", async () => {
    installFakeSessionStorage();
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    const boundary = fakeBoundary();
    const writer = createCanonicalWriter({ supabaseUrl: QA_URL, boundary });

    await writer.track({
      eventType: "whatsapp_click",
      publicId: "qa-page",
      targetUrl: "https://wa.me/1",
    });

    // The client never sends a platform string; the server normalizes platform
    // from the event type. Device is classified coarsely from the user-agent.
    const args = boundary.calls[0]!.args;
    expect(args).not.toHaveProperty("p_platform");
    expect(args["p_device_type"]).toBe("mobile");
  });
});
