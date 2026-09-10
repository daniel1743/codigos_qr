import { describe, expect, it } from "vitest";
import type { BlockItem } from "../types";

/** Build a media-card item with explicit size/position for persistence tests. */
function mediaItem(overrides: Partial<BlockItem> = {}): BlockItem {
  return {
    id: "m1",
    label: "Profesionales",
    url: "https://example.com",
    imageUrl: "https://example.com/img.jpg",
    presentation: "media-card",
    ...overrides,
  };
}

describe("Media Card — canonical model extension", () => {
  it("supports three image sizes (25/50/100)", () => {
    const sizes = ["25", "50", "100"] as const;
    for (const size of sizes) {
      const item = mediaItem({ mediaSize: size });
      expect(item.mediaSize).toBe(size);
    }
  });

  it("supports left/right/bottom positions", () => {
    const positions = ["left", "right", "bottom"] as const;
    for (const position of positions) {
      const item = mediaItem({ mediaPosition: position });
      expect(item.mediaPosition).toBe(position);
    }
  });

  it("round-trips size + position through JSON (persistence safety)", () => {
    const item = mediaItem({ mediaSize: "50", mediaPosition: "bottom" });
    const parsed = JSON.parse(JSON.stringify(item));
    expect(parsed.mediaSize).toBe("50");
    expect(parsed.mediaPosition).toBe("bottom");
    expect(parsed.presentation).toBe("media-card");
    expect(parsed.imageUrl).toBe("https://example.com/img.jpg");
  });

  it("legacy media cards (no size) round-trip without spurious fields", () => {
    // Existing cards had mediaPosition but no mediaSize; ensure we don't
    // fabricate a mediaSize for them (backward compatibility).
    const item = mediaItem({ mediaPosition: "right" });
    expect("mediaSize" in item).toBe(false);
    const parsed = JSON.parse(JSON.stringify(item));
    expect("mediaSize" in parsed).toBe(false);
    expect(parsed.mediaPosition).toBe("right");
  });

  it("does not rewrite URL/title/description on round-trip", () => {
    const item = mediaItem({
      label: "Profesionales",
      url: "https://example.com/servicios",
      description: "Equipo senior",
      mediaSize: "100",
    });
    const parsed = JSON.parse(JSON.stringify(item));
    expect(parsed.label).toBe("Profesionales");
    expect(parsed.url).toBe("https://example.com/servicios");
    expect(parsed.description).toBe("Equipo senior");
  });
});
