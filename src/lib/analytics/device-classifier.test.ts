import { describe, expect, it } from "vitest";
import { classifyDeviceType } from "./device-classifier";

describe("classifyDeviceType (coarse, deterministic)", () => {
  it("classifies a desktop Chrome user-agent as desktop", () => {
    expect(
      classifyDeviceType(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      ),
    ).toBe("desktop");
  });

  it("classifies an iPhone Safari user-agent as mobile", () => {
    expect(
      classifyDeviceType(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("mobile");
  });

  it("classifies an Android phone user-agent as mobile", () => {
    expect(
      classifyDeviceType(
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
      ),
    ).toBe("mobile");
  });

  it("classifies an iPad user-agent as tablet (tablet is checked before mobile)", () => {
    expect(
      classifyDeviceType(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("tablet");
  });

  it("classifies an Android tablet (no mobi) as tablet", () => {
    expect(
      classifyDeviceType(
        "Mozilla/5.0 (Linux; Android 12; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      ),
    ).toBe("tablet");
  });

  it("returns unknown for missing/empty user-agents (no fabrication)", () => {
    expect(classifyDeviceType(null)).toBe("unknown");
    expect(classifyDeviceType(undefined)).toBe("unknown");
    expect(classifyDeviceType("")).toBe("unknown");
  });

  it("is deterministic for identical input", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
    expect(classifyDeviceType(ua)).toBe(classifyDeviceType(ua));
  });
});
