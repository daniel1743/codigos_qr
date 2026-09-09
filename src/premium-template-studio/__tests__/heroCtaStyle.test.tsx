import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { heroCtaButtonStyle } from "../engine/styleEngine";
import { getTheme } from "../constants/themes";
import { createBlock } from "../constants/blockDefinitions";
import { createDemoConfig } from "../templates/definitions";
import { createInitialState, templateReducer } from "../state/templateReducer";
import type { BioTemplateConfig, CTAContent, TemplateBlock } from "../types";

const theme = getTheme("aurora");

function heroConfig(patch: Partial<TemplateBlock>): BioTemplateConfig {
  const base = createDemoConfig();
  const hero = createBlock("hero");
  return { ...base, blocks: [{ ...hero, ...patch, id: "hero-style-test" }] };
}

function renderHero(patch: Partial<TemplateBlock>): string {
  return renderToStaticMarkup(
    <TemplateRenderer config={heroConfig(patch)} breakpoint="desktop" mode="public" />,
  );
}

function primaryStyle(cta: CTAContent = {}) {
  return heroCtaButtonStyle(theme, { cta, kind: "primary", fullImage: false });
}

function secondaryStyle(cta: CTAContent = {}) {
  return heroCtaButtonStyle(theme, { cta, kind: "secondary", fullImage: false });
}

describe("Hero CTA per-button style (Phase 5C1B)", () => {
  describe("backward compatibility (style absent → legacy rendering)", () => {
    it("primary keeps the theme primary background, white text and no border", () => {
      const s = primaryStyle();
      expect(s.backgroundColor).toBe("#6d5efc");
      expect(s.color).toBe("#ffffff");
      expect(s.border).toBe("none");
      expect(s.borderRadius).toBe(16);
      expect(s.fontWeight).toBe(600);
      expect(s.fontSize).toBe("14px");
      expect(s.padding).toBe("10px 20px");
    });

    it("secondary keeps transparent background and the themed text/border", () => {
      const s = secondaryStyle();
      expect(s.backgroundColor).toBe("transparent");
      expect(s.color).toBe("#f5f4ff");
      expect(s.border).toBe("1px solid #2a2850");
      expect(s.borderRadius).toBe(16);
    });

    it("full-image secondary keeps the white text + translucent border", () => {
      const s = heroCtaButtonStyle(theme, { cta: {}, kind: "secondary", fullImage: true });
      expect(s.color).toBe("#ffffff");
      expect(s.border).toBe("1px solid rgba(255,255,255,0.4)");
    });

    it("renders the legacy primary/secondary markup when no style is present", () => {
      const markup = renderHero({});
      expect(markup).toContain("background-color:#6d5efc");
      expect(markup).toContain("background-color:transparent");
      expect(markup).toContain("border-radius:16px");
      expect(markup).toContain("padding:10px 20px");
    });
  });

  describe("per-property overrides", () => {
    it("primary background override changes only background", () => {
      const s = primaryStyle({ style: { backgroundColor: "#000000" } });
      expect(s.backgroundColor).toBe("#000000");
      expect(s.color).toBe("#ffffff");
      expect(s.border).toBe("none");
      expect(s.borderRadius).toBe(16);
    });

    it("secondary background override changes only background", () => {
      const s = secondaryStyle({ style: { backgroundColor: "#222222" } });
      expect(s.backgroundColor).toBe("#222222");
      expect(s.color).toBe("#f5f4ff");
      expect(s.border).toBe("1px solid #2a2850");
    });

    it("text color override", () => {
      const s = primaryStyle({ style: { textColor: "#ffff00" } });
      expect(s.color).toBe("#ffff00");
      expect(s.backgroundColor).toBe("#6d5efc");
    });

    it("font size / weight override", () => {
      const s = primaryStyle({ style: { fontSize: 22, fontWeight: 700 } });
      expect(s.fontSize).toBe("22px");
      expect(s.fontWeight).toBe(700);
    });

    it("font family override", () => {
      const s = primaryStyle({ style: { fontFamily: "monospace" } });
      expect(s.fontFamily).toBe("monospace");
    });

    it("border color/width override on primary switches from none to solid", () => {
      const s = primaryStyle({ style: { borderColor: "#00ff00", borderWidth: 2 } });
      expect(s.border).toBe("2px solid #00ff00");
    });

    it("border color only override on primary defaults width to 1", () => {
      const s = primaryStyle({ style: { borderColor: "#00ff00" } });
      expect(s.border).toBe("1px solid #00ff00");
    });

    it("border color/width override on secondary replaces the themed border", () => {
      const s = secondaryStyle({ style: { borderColor: "#ff0000", borderWidth: 3 } });
      expect(s.border).toBe("3px solid #ff0000");
    });

    it("radius override", () => {
      const s = primaryStyle({ style: { radius: 8 } });
      expect(s.borderRadius).toBe(8);
    });

    it("padding/size override", () => {
      const s = primaryStyle({ style: { paddingX: 40, paddingY: 18 } });
      expect(s.padding).toBe("18px 40px");
    });

    it("independent padding axes keep the other default", () => {
      const s = primaryStyle({ style: { paddingX: 40 } });
      expect(s.padding).toBe("10px 40px");
    });
  });

  describe("primary vs secondary independence", () => {
    it("styles primary and secondary independently without touching theme", () => {
      const primary = primaryStyle({ style: { backgroundColor: "#000000", radius: 14 } });
      const secondary = secondaryStyle({ style: { backgroundColor: "#ffffff", radius: 4 } });

      expect(primary.backgroundColor).toBe("#000000");
      expect(primary.borderRadius).toBe(14);
      expect(secondary.backgroundColor).toBe("#ffffff");
      expect(secondary.borderRadius).toBe(4);
      // Theme is never mutated.
      expect(theme.colors.primary).toBe("#6d5efc");
      expect(theme.buttons.radius).toBe(16);
    });
  });

  describe("renderer consumes overrides", () => {
    it("renders an overridden primary background and radius", () => {
      const markup = renderHero({
        content: {
          primaryCTA: { label: "Go", style: { backgroundColor: "#ff0000", radius: 6 } },
        },
      });
      expect(markup).toContain("background-color:#ff0000");
      expect(markup).toContain("border-radius:6px");
    });

    it("renders an overridden secondary border", () => {
      const markup = renderHero({
        content: {
          secondaryCTA: { label: "More", style: { borderColor: "#00ff00", borderWidth: 2 } },
        },
      });
      expect(markup).toContain("border:2px solid #00ff00");
    });
  });

  describe("reducer integrity", () => {
    const config = createDemoConfig();
    const heroBlock = { ...createBlock("hero"), id: "hero-style-test" };
    const withHero = { ...config, blocks: [heroBlock, ...config.blocks] };
    const initialState = createInitialState(withHero);

    it("editing one style field preserves label/url/icon and keeps selection", () => {
      const selected = templateReducer(initialState, {
        type: "selectBlock",
        id: "hero-style-test",
      });
      const state = templateReducer(selected, {
        type: "patchBlockField",
        id: "hero-style-test",
        path: "content.primaryCTA.style.backgroundColor",
        value: "#000000",
      });

      const cta = state.config.blocks[0]!.content.primaryCTA!;
      expect(cta.style?.backgroundColor).toBe("#000000");
      expect(cta.label).toBe(heroBlock.content.primaryCTA?.label);
      expect(cta.url).toBe(heroBlock.content.primaryCTA?.url);
      expect(cta.icon).toBe(heroBlock.content.primaryCTA?.icon);
      // Contextual focus preserved: selection identity is unchanged.
      expect(state.selectedBlockId).toBe("hero-style-test");
    });

    it("primary style patch does not touch the secondary CTA", () => {
      const state = templateReducer(initialState, {
        type: "patchBlockField",
        id: "hero-style-test",
        path: "content.primaryCTA.style.radius",
        value: 9,
      });
      expect(state.config.blocks[0]!.content.primaryCTA?.style?.radius).toBe(9);
      expect(state.config.blocks[0]!.content.secondaryCTA?.style).toBeUndefined();
    });

    it("secondary style patch does not touch the primary CTA", () => {
      const state = templateReducer(initialState, {
        type: "patchBlockField",
        id: "hero-style-test",
        path: "content.secondaryCTA.style.textColor",
        value: "#123456",
      });
      expect(state.config.blocks[0]!.content.secondaryCTA?.style?.textColor).toBe("#123456");
      expect(state.config.blocks[0]!.content.primaryCTA?.style).toBeUndefined();
    });

    it("resetting style to an empty object returns CTA to theme defaults", () => {
      const styled = templateReducer(initialState, {
        type: "patchBlockField",
        id: "hero-style-test",
        path: "content.primaryCTA.style",
        value: { backgroundColor: "#000000", radius: 2 },
      });
      const reset = templateReducer(styled, {
        type: "patchBlockField",
        id: "hero-style-test",
        path: "content.primaryCTA.style",
        value: {},
      });
      expect(reset.config.blocks[0]!.content.primaryCTA?.style).toEqual({});
    });
  });
});
