import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOrCreateAnalyticsCampaignContext } from "./session";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("analytics campaign context", () => {
  let sessionStorage: ReturnType<typeof storage>;

  beforeEach(() => {
    sessionStorage = storage();
    vi.stubGlobal("window", {
      location: { search: "?utm_source=%20instagram%20&utm_campaign=october_campaign" },
      sessionStorage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("captures and normalizes UTM values from the public URL", () => {
    expect(getOrCreateAnalyticsCampaignContext()).toEqual({
      utmSource: "instagram",
      utmCampaign: "october_campaign",
    });
  });

  it("reuses the captured campaign context for later same-session events", () => {
    getOrCreateAnalyticsCampaignContext();
    window.location.search = "";

    expect(getOrCreateAnalyticsCampaignContext()).toEqual({
      utmSource: "instagram",
      utmCampaign: "october_campaign",
    });
  });

  it("treats empty URL parameters as absent", () => {
    window.location.search = "?utm_source=&utm_campaign=%20";

    expect(getOrCreateAnalyticsCampaignContext()).toEqual({});
  });
});
