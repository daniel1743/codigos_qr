import { describe, expect, it } from "vitest";
import { cardMediaStyle, resolveCardLayout, resolveCardPreset } from "../engine/cardEngine";
import type { BlockItem, TemplateBlock } from "../types";

const block = (variant = "card"): TemplateBlock => ({
  id: "cards",
  type: "productGrid",
  variant,
  content: {},
  style: {},
  layout: {},
  visibility: { desktop: true, tablet: true, mobile: true },
  interaction: {},
});

describe("canonical card engine", () => {
  it("keeps legacy variants stable and accepts opt-in layouts", () => {
    expect(resolveCardLayout({ id: "legacy" }, block("minimal"))).toBe("compact");
    expect(resolveCardLayout({ id: "new", cardLayout: "image-right" }, block())).toBe(
      "image-right",
    );
  });

  it("resolves emphasis without introducing a second theme", () => {
    expect(resolveCardPreset({ id: "card", cardEmphasis: true }, block())).toBe("highlight");
    expect(resolveCardPreset({ id: "card", cardVisualPreset: "flat" }, block())).toBe("flat");
  });

  it("reuses the canonical media treatment contract", () => {
    expect(
      cardMediaStyle({ id: "media", media: { cropX: 18, cropY: 72, zoom: 1.4 } }),
    ).toMatchObject({
      objectPosition: "18% 72%",
      transform: "scale(1.4)",
    });
  });
});
