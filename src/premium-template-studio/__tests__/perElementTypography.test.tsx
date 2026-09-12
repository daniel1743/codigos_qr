// Per-element typography overrides (CRIPQER_POWER_PER_ELEMENT_TYPOGRAPHY_V1).
//
// The canonical schema already ships `TypographyOverride`, `BlockItem.typography`
// and `BlockStyle.{title,subtitle,description}Typography`. These tests assert the
// inheritance model, the renderer's consumption of optional overrides, canonical
// persistence, and backward compatibility (old configs render identically).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { applyTypographyOverride } from "../engine/styleEngine";
import { createBlock } from "../constants/blockDefinitions";
import { createDemoConfig } from "../templates/definitions";
import { createInitialState, templateReducer } from "../state/templateReducer";
import type { BioTemplateConfig, BlockItem, TemplateBlock } from "../types";

function render(config: BioTemplateConfig): string {
  return renderToStaticMarkup(
    <TemplateRenderer config={config} breakpoint="desktop" mode="public" />,
  );
}

function heroWithStyle(style: Partial<TemplateBlock["style"]>): BioTemplateConfig {
  const base = createDemoConfig();
  const hero = createBlock("hero");
  return { ...base, blocks: [{ ...hero, id: "hero-typo", style: { ...hero.style, ...style } }] };
}

function buttonGroupWithItems(items: BlockItem[]): BioTemplateConfig {
  const base = createDemoConfig();
  const bg = createBlock("buttonGroup");
  return {
    ...base,
    blocks: [{ ...bg, id: "bg-typo", content: { ...bg.content, items } }],
  };
}

function blockWithItems(
  type: "links" | "portfolio" | "services",
  items: BlockItem[],
): BioTemplateConfig {
  const base = createDemoConfig();
  const block = createBlock(type);
  return {
    ...base,
    blocks: [{ ...block, id: `${type}-description-typo`, content: { ...block.content, items } }],
  };
}

function descriptionItem(overrides: Partial<BlockItem> = {}): BlockItem {
  return {
    id: "description-item",
    label: "Item title",
    description: "Item description",
    url: "https://example.com",
    ...overrides,
  };
}

describe("Per-element typography overrides (inheritance model)", () => {
  describe("applyTypographyOverride", () => {
    it("returns the base style unchanged when override is absent (backward compatible)", () => {
      const base = { fontSize: 16, color: "red" };
      expect(applyTypographyOverride(base, undefined)).toBe(base);
    });

    it("returns the base style unchanged when override is empty", () => {
      const base = { fontSize: 16, color: "red" };
      expect(applyTypographyOverride(base, {})).toEqual(base);
    });

    it("applies every supported override field", () => {
      const result = applyTypographyOverride(
        { fontSize: 16, color: "red" },
        {
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 700,
          fontSize: 24,
          textAlign: "center",
          textColor: "blue",
        },
      );
      expect(result).toEqual({
        fontSize: 24,
        color: "blue",
        fontFamily: '"DM Sans", sans-serif',
        fontWeight: 700,
        textAlign: "center",
      });
    });

    it("a partial override changes only the specified field", () => {
      const result = applyTypographyOverride({ fontSize: 16, color: "red" }, { fontWeight: 700 });
      expect(result.fontWeight).toBe(700);
      expect(result.fontSize).toBe(16);
      expect(result.color).toBe("red");
      expect(result.textAlign).toBeUndefined();
    });
  });

  describe("hero title / subtitle / description renderer", () => {
    it("title override applies to the rendered title", () => {
      const markup = render(heroWithStyle({ titleTypography: { fontSize: 88 } }));
      expect(markup).toContain("font-size:88px");
    });

    it("subtitle override applies to the rendered subtitle", () => {
      const markup = render(heroWithStyle({ subtitleTypography: { fontWeight: 900 } }));
      expect(markup).toContain("font-weight:900");
    });

    it("description override applies to the rendered description", () => {
      const markup = render(heroWithStyle({ descriptionTypography: { fontSize: 77 } }));
      expect(markup).toContain("font-size:77px");
    });

    it("absent overrides keep the inherited global typography (no override value leaked)", () => {
      const markup = render(heroWithStyle({}));
      expect(markup).not.toContain("font-size:88px");
      expect(markup).not.toContain("font-size:77px");
    });
  });

  describe("ButtonGroup item renderer", () => {
    const item = (typography?: BlockItem["typography"]): BlockItem => ({
      id: "b1",
      label: "Contactar",
      url: "https://example.com",
      typography,
    });

    it("inherits the global font by default (no override emitted)", () => {
      const markup = render(buttonGroupWithItems([item(undefined)]));
      expect(markup).not.toContain("font-weight:900");
    });

    it("overrides the item font family", () => {
      const markup = render(buttonGroupWithItems([item({ fontFamily: "Arial" })]));
      expect(markup).toContain("font-family:Arial");
    });

    it("overrides the item font weight", () => {
      const markup = render(buttonGroupWithItems([item({ fontWeight: 900 })]));
      expect(markup).toContain("font-weight:900");
    });
  });

  describe("item description typography", () => {
    it("keeps the existing card description defaults when the override is absent", () => {
      const markup = render(
        blockWithItems("links", [descriptionItem({ presentation: "card" })]),
      );
      expect(markup).toContain("font-size:12.5px;color:");
      expect(markup).not.toContain("font-family:Arial");
    });

    it("applies all five description typography properties to an ActionBlocks card", () => {
      const markup = render(
        blockWithItems("links", [
          descriptionItem({
            presentation: "card",
            typography: { fontWeight: 300 },
            descriptionTypography: {
              fontFamily: "Arial",
              fontWeight: 800,
              fontSize: 23,
              textColor: "rebeccapurple",
              textAlign: "right",
            },
          }),
        ]),
      );

      expect(markup).toContain("font-family:Arial");
      expect(markup).toContain("font-weight:800");
      expect(markup).toContain("font-size:23px");
      expect(markup).toContain("color:rebeccapurple");
      expect(markup).toContain("text-align:right");
      expect(markup).toContain("font-weight:600;font-size:15px");
      expect(markup).not.toContain("font-weight:300");
    });

    it.each(["left", "center", "right"] as const)(
      "applies %s alignment to the description",
      (textAlign) => {
        const markup = render(
          blockWithItems("links", [
            descriptionItem({
              presentation: "card",
              descriptionTypography: { textAlign },
            }),
          ]),
        );
        expect(markup).toContain(`text-align:${textAlign}`);
      },
    );

    it("applies the description override directly in MediaBlocks and PremiumBlocks", () => {
      const typography = { fontSize: 22, textColor: "tomato" };
      const portfolio = render(
        blockWithItems("portfolio", [descriptionItem({ descriptionTypography: typography })]),
      );
      const services = render(
        blockWithItems("services", [descriptionItem({ descriptionTypography: typography })]),
      );

      expect(portfolio).toContain("font-size:22px;color:tomato");
      expect(services).toContain("font-size:22px;color:tomato");
    });
  });

  describe("canonical persistence via patchBlockField", () => {
    it("persists a title typography override and marks the document dirty", () => {
      const state = createInitialState(createDemoConfig());
      const heroId = state.config.blocks[0]!.id;
      const next = templateReducer(state, {
        type: "patchBlockField",
        id: heroId,
        path: "style.titleTypography",
        value: { fontWeight: 900 },
      });
      expect(next.config.blocks.find((b) => b.id === heroId)!.style.titleTypography).toEqual({
        fontWeight: 900,
      });
      expect(next.dirty).toBe(true);
    });

    it("removing the override restores inheritance (undefined)", () => {
      const state = createInitialState(createDemoConfig());
      const heroId = state.config.blocks[0]!.id;
      const withOverride = templateReducer(state, {
        type: "patchBlockField",
        id: heroId,
        path: "style.titleTypography",
        value: { fontWeight: 900 },
      });
      const cleared = templateReducer(withOverride, {
        type: "patchBlockField",
        id: heroId,
        path: "style.titleTypography",
        value: undefined,
      });
      expect(cleared.config.blocks.find((b) => b.id === heroId)!.style.titleTypography).toBeUndefined();
    });

    it("persists an item description typography override independently", () => {
      const state = createInitialState(createDemoConfig());
      const links = createBlock("links");
      const withLinks = templateReducer(state, {
        type: "insertBlock",
        block: {
          ...links,
          id: "links-description-typo",
          content: {
            ...links.content,
            items: [descriptionItem()],
          },
        },
      });
      const next = templateReducer(withLinks, {
        type: "patchBlockField",
        id: "links-description-typo",
        path: "content.items.0.descriptionTypography",
        value: {
          fontFamily: "Arial",
          fontWeight: 700,
          fontSize: 21,
          textColor: "teal",
          textAlign: "center",
        },
      });

      const item = next.config.blocks.find((block) => block.id === "links-description-typo")
        ?.content.items?.[0];
      expect(item?.typography).toBeUndefined();
      expect(item?.descriptionTypography).toEqual({
        fontFamily: "Arial",
        fontWeight: 700,
        fontSize: 21,
        textColor: "teal",
        textAlign: "center",
      });
      expect(next.dirty).toBe(true);
    });
  });
});
