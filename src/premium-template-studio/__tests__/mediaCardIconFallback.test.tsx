import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDemoConfig } from "../templates/definitions";
import type { BioTemplateConfig, BlockItem } from "../types";
import { TemplateRenderer } from "../engine/TemplateRenderer";

/**
 * Media Card social-provider icon fallback.
 *
 * When a recognized social provider returns no usable image, the card must still
 * be visually recognizable: the provider brand icon fills the 25% media area
 * instead of leaving an empty slot or a broken image.
 */

function renderLinks(items: BlockItem[]): string {
  const base = createDemoConfig();
  const templateBlock = base.blocks[0]!;
  const config: BioTemplateConfig = {
    ...base,
    blocks: [
      {
        ...templateBlock,
        id: "icon-fallback-block",
        type: "links",
        variant: "stacked",
        content: { items },
      },
    ],
  };
  config.profile.avatarUrl = "";
  config.profile.banner.enabled = false;
  return renderToStaticMarkup(<TemplateRenderer config={config} breakpoint="mobile" mode="public" />);
}

function mediaItem(url: string, extra: Partial<BlockItem> = {}): BlockItem {
  return { id: url, label: "Enlace", url, presentation: "media-card", ...extra };
}

describe("Media Card social icon fallback", () => {
  it.each([
    ["instagram", "https://instagram.com/usuario"],
    ["facebook", "https://facebook.com/usuario"],
    ["x", "https://x.com/usuario"],
    ["tiktok", "https://tiktok.com/@usuario"],
    ["youtube", "https://youtube.com/@usuario"],
    ["linkedin", "https://linkedin.com/company/acme"],
    ["threads", "https://threads.net/@usuario"],
    ["pinterest", "https://pinterest.com/usuario"],
  ])("renders the %s provider icon when no image is returned", (provider, url) => {
    const markup = renderLinks([mediaItem(url)]);
    expect(markup).toContain(`data-media-fallback="${provider}"`);
    expect(markup).not.toContain("<img");
  });

  it("prefers the real thumbnail over the YouTube icon when an image exists", () => {
    const markup = renderLinks([
      mediaItem("https://youtube.com/watch?v=abc", {
        imageUrl: "https://i.ytimg.com/vi/abc/hqdefault.jpg",
      }),
    ]);
    expect(markup).toContain("<img");
    expect(markup).toContain("https://i.ytimg.com/vi/abc/hqdefault.jpg");
    expect(markup).not.toContain("data-media-fallback");
  });

  it("keeps a custom user image authoritative over the provider icon", () => {
    const markup = renderLinks([
      mediaItem("https://instagram.com/usuario", {
        imageUrl: "https://my-cdn.example/custom.jpg",
      }),
    ]);
    expect(markup).toContain("https://my-cdn.example/custom.jpg");
    expect(markup).not.toContain("data-media-fallback");
  });

  it("renders the generic Globe icon for an unrecognized website", () => {
    const markup = renderLinks([mediaItem("https://example.com/about")]);
    expect(markup).toContain('data-media-fallback="generic-web"');
    expect(markup).toContain("lucide-globe");
    expect(markup).not.toContain("<img");
  });
});
