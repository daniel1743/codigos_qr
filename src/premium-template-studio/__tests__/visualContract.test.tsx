import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDemoConfig } from "../templates/definitions";
import type { BioTemplateConfig, TemplateBlock } from "../types";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { backgroundLayerStyle, decorativeFrameStyle, textureStyle } from "../engine/styleEngine";

function makeConfig(block: Partial<TemplateBlock>): BioTemplateConfig {
  const base = createDemoConfig();
  const templateBlock = base.blocks[0]!;
  return {
    ...base,
    blocks: [
      {
        ...templateBlock,
        id: "visual-contract-block",
        ...block,
      },
    ],
  };
}

function makeButtons(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `button-${index}`,
    label: `Button ${index + 1}`,
    url: `https://example.com/${index + 1}`,
  }));
}

function renderConfig(config: BioTemplateConfig, mode: "edit" | "public" = "public") {
  return renderToStaticMarkup(<TemplateRenderer config={config} breakpoint="mobile" mode={mode} />);
}

function renderBlockOnly(config: BioTemplateConfig) {
  config.profile.avatarUrl = "";
  config.profile.banner.enabled = false;
  return renderConfig(config);
}

describe("Power Editor visual contract", () => {
  it.each([
    [6, 2, 3],
    [4, 2, 2],
    [3, 2, 2],
    [3, 1, 3],
  ])("renders %s buttons in %s explicit columns", (count, columns, rows) => {
    const markup = renderBlockOnly(
      makeConfig({
        type: "buttonGroup",
        variant: "row",
        content: { items: makeButtons(count) },
        layout: { columns },
      }),
    );

    expect(markup).toContain(`data-button-columns="${columns}"`);
    expect(markup).toContain(`repeat(${columns}, minmax(0, 1fr))`);
    expect(markup.match(/>Button [0-9]+</g)).toHaveLength(count);
    expect(Math.ceil(count / columns)).toBe(rows);
  });

  it.each([390, 320])("keeps the mobile canvas bounded at %spx", (width) => {
    const markup = renderBlockOnly(
      makeConfig({
        type: "links",
        content: { items: makeButtons(6) },
      }),
    );

    expect(width).toBeGreaterThan(0);
    expect(markup).toContain("width:100%");
    expect(markup).toContain("min-width:0");
    expect(markup).toContain("overflow-x:clip");
  });

  it("renders 75/25 media cards on either side and keeps normal links", () => {
    const items = [
      {
        id: "left",
        label: "Left media",
        url: "https://example.com/left",
        presentation: "media-card" as const,
        mediaPosition: "left" as const,
        imageUrl: "https://example.com/left.jpg",
      },
      {
        id: "right",
        label: "Right media",
        url: "https://example.com/right",
        presentation: "media-card" as const,
        mediaPosition: "right" as const,
        imageUrl: "https://example.com/right.jpg",
      },
      {
        id: "plain",
        label: "Plain link",
        url: "https://example.com/plain",
      },
    ];
    const markup = renderBlockOnly(
      makeConfig({
        type: "links",
        variant: "stacked",
        content: { items },
      }),
    );

    expect(markup).toContain('data-media-position="left"');
    expect(markup).toContain('data-media-position="right"');
    expect(markup).toContain("grid-template-columns:3fr 1fr");
    expect(markup).toContain("grid-template-columns:1fr 3fr");
    expect(markup).not.toContain('data-media-position="plain"');
  });

  it("uses a full-width content fallback when a media card has no image", () => {
    const markup = renderBlockOnly(
      makeConfig({
        type: "links",
        variant: "stacked",
        content: {
          items: [
            {
              id: "no-image",
              label: "No image",
              url: "https://example.com/no-image",
              presentation: "media-card",
            },
          ],
        },
      }),
    );

    expect(markup).toContain('data-media-position="none"');
    expect(markup).toContain("grid-template-columns:1fr");
    expect(markup).not.toContain("<img");
  });

  it("serializes texture and frame presets without external assets", () => {
    const grain = textureStyle({ preset: "grain", opacity: 0.2, scale: 16 });
    const luxury = decorativeFrameStyle("luxury", "#c99b42");
    const none = decorativeFrameStyle("none", "#c99b42");

    expect(grain?.opacity).toBe(0.2);
    expect(grain?.backgroundImage).toContain("data:image/svg+xml");
    expect(luxury.border).toContain("rgba(201, 155, 66, 0.42)");
    expect(none).toEqual({});
  });

  it("keeps background blur in a separate layer and preserves sticky/floating styles", () => {
    const stickyConfig = makeConfig({
      layout: {
        sticky: { enabled: true, top: 12 },
      },
    });
    const floatingConfig = makeConfig({
      layout: {
        floating: { enabled: true, anchor: "bottom-right", offset: 12 },
      },
    });
    stickyConfig.theme.background = {
      ...stickyConfig.theme.background,
      type: "image",
      imageUrl: "https://example.com/background.jpg",
      blur: 8,
    };

    const layer = backgroundLayerStyle(stickyConfig.theme);

    expect(layer?.filter).toBe("blur(8px)");
    expect(renderConfig(stickyConfig)).toContain("position:sticky");
    expect(renderConfig(floatingConfig)).toContain("position:fixed");
    expect(renderConfig(stickyConfig)).toContain("overflow-x:clip");
  });

  it("renders local block animation and avatar alignment from the public contract", () => {
    const config = makeConfig({
      interaction: { animation: "fade", newTab: true },
    });
    config.profile.avatar.align = "right";
    const markup = renderConfig(config, "edit");

    expect(markup).toContain("pts-anim-fade");
    expect(markup).toContain("justify-content:flex-end");
  });
});
