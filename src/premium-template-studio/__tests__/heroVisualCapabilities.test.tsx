import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import {
  blockBackgroundGradientStyle,
  imageFitValue,
  imagePositionValue,
} from "../engine/styleEngine";
import { createBlock } from "../constants/blockDefinitions";
import { createDemoConfig } from "../templates/definitions";
import { createInitialState, templateReducer } from "../state/templateReducer";
import type { BioTemplateConfig, TemplateBlock } from "../types";

function heroConfig(patch: Partial<TemplateBlock>): BioTemplateConfig {
  const base = createDemoConfig();
  const hero = createBlock("hero");
  return {
    ...base,
    blocks: [{ ...hero, ...patch, id: "hero-test" }],
  };
}

function renderHero(patch: Partial<TemplateBlock>): string {
  return renderToStaticMarkup(
    <TemplateRenderer config={heroConfig(patch)} breakpoint="desktop" mode="public" />,
  );
}

describe("Hero / Banner visual capabilities (Phase 5B1)", () => {
  it("preserves legacy rendering when new fields are absent", () => {
    const markup = renderHero({});
    // Defaults: cover + center on the top banner image.
    expect(markup).toContain("object-fit:cover");
    expect(markup).toContain("object-position:50% 50%");
    // No full-bleed escape is emitted by default.
    expect(markup).not.toContain("width:100vw");
  });

  describe("imageFitValue", () => {
    it("maps absent/cover to cover and contain to contain", () => {
      expect(imageFitValue(undefined)).toBe("cover");
      expect(imageFitValue("cover")).toBe("cover");
      expect(imageFitValue("contain")).toBe("contain");
    });
  });

  describe("imagePositionValue", () => {
    it("maps focal tokens to CSS positions with center as default", () => {
      expect(imagePositionValue(undefined)).toBe("50% 50%");
      expect(imagePositionValue("center")).toBe("50% 50%");
      expect(imagePositionValue("top")).toBe("50% 0%");
      expect(imagePositionValue("bottom")).toBe("50% 100%");
      expect(imagePositionValue("left")).toBe("0% 50%");
      expect(imagePositionValue("right")).toBe("100% 50%");
      expect(imagePositionValue("top-left")).toBe("0% 0%");
      expect(imagePositionValue("bottom-right")).toBe("100% 100%");
    });

    it("falls back to center for unknown tokens", () => {
      expect(imagePositionValue("bogus")).toBe("50% 50%");
    });
  });

  it("renders contain fit on the banner image", () => {
    const markup = renderHero({
      content: { bannerImage: { url: "https://example.com/banner.jpg", fit: "contain" } },
    });
    expect(markup).toContain("object-fit:contain");
  });

  it("renders a focal position on the banner image", () => {
    const markup = renderHero({
      content: { bannerImage: { url: "https://example.com/banner.jpg", position: "bottom" } },
    });
    expect(markup).toContain("object-position:50% 100%");
  });

  describe("blockBackgroundGradientStyle", () => {
    it("serializes a two-color angle gradient", () => {
      const style = blockBackgroundGradientStyle({ from: "#ff0000", to: "#0000ff", angle: 90 });
      expect(style.backgroundImage).toBe("linear-gradient(90deg, #ff0000 0%, #0000ff 100%)");
    });

    it("defaults the angle to 180deg when omitted", () => {
      const style = blockBackgroundGradientStyle({ from: "#ff0000", to: "#0000ff" });
      expect(style.backgroundImage).toBe("linear-gradient(180deg, #ff0000 0%, #0000ff 100%)");
    });

    it("returns an empty object when gradient is absent or incomplete", () => {
      expect(blockBackgroundGradientStyle(undefined)).toEqual({});
      expect(blockBackgroundGradientStyle({ from: "#ff0000" })).toEqual({});
    });

    it("renders a gradient background in the hero markup", () => {
      const markup = renderHero({
        style: { backgroundGradient: { from: "#ff0000", to: "#0000ff", angle: 90 } },
      });
      expect(markup).toContain("linear-gradient(90deg, #ff0000 0%, #0000ff 100%)");
    });
  });

  it("maps trueFullBleed to an edge-to-edge document layout", () => {
    const markup = renderHero({ layout: { trueFullBleed: true } });
    expect(markup).toContain("grid-column:1 / -1");
    expect(markup).toContain("width:100vw");
    expect(markup).toContain("calc(50% - 50vw)");
  });

  it("does not emit full-bleed styles when trueFullBleed is absent", () => {
    const markup = renderHero({});
    expect(markup).not.toContain("width:100vw");
  });

  it("keeps the existing overlay working above the background", () => {
    const markup = renderHero({
      content: { backgroundImage: { url: "https://example.com/bg.jpg" } },
      style: { overlay: { type: "gradient", opacity: 0.5, direction: "to-top" } },
    });
    expect(markup).toContain("linear-gradient(0deg");
  });

  it("selection does not mutate config, and a hero field patch preserves selection", () => {
    const config = heroConfig({});
    const heroId = config.blocks[0]!.id;
    const state = createInitialState(config);

    const selected = templateReducer(state, { type: "selectBlock", id: heroId });
    expect(selected.selectedBlockId).toBe(heroId);
    expect(selected.config).toBe(config);
    expect(selected.past.length).toBe(0);

    const patched = templateReducer(selected, {
      type: "patchBlockField",
      id: heroId,
      path: "content.bannerImage.fit",
      value: "contain",
    });
    expect(patched.selectedBlockId).toBe(heroId);
    expect(patched.config.blocks[0]!.content.bannerImage?.fit).toBe("contain");
  });
});
