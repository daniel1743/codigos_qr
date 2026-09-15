import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDemoConfig } from "../templates/definitions";
import type { BioTemplateConfig, BlockInteraction, TemplateBlock } from "../types";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { BlockInspector } from "../components/inspector/Inspector";
import { StudioProvider } from "../state/StudioProvider";

/**
 * The canonical `TemplateBlock` type declares `interaction` as required, but
 * legacy/minimal canonical blocks may omit it at runtime. This helper builds a
 * block that is missing the `interaction` object entirely.
 */
type InteractionOptional = Omit<TemplateBlock, "interaction"> & {
  interaction?: BlockInteraction | undefined;
};

function blockWithoutInteraction(patch: Partial<TemplateBlock> = {}): TemplateBlock {
  const base = createDemoConfig();
  const block = { ...base.blocks[0]! } as InteractionOptional;
  delete block.interaction;
  return { ...block, ...patch } as TemplateBlock;
}

function imageConfigWithoutInteraction(): BioTemplateConfig {
  const base = createDemoConfig();
  const block = blockWithoutInteraction();
  block.type = "image";
  block.variant = "full";
  block.content = { imageUrl: "https://example.com/test.jpg", alt: "test" };
  return { ...base, blocks: [block as TemplateBlock] };
}

function linkConfigWithoutInteraction(): BioTemplateConfig {
  const base = createDemoConfig();
  const block = blockWithoutInteraction({
    id: "legacy-link-block",
    type: "links",
    variant: "cards",
    content: {
      title: "Links",
      items: [{ id: "item-1", label: "Example", url: "https://example.com" }],
    },
  });
  return { ...base, blocks: [block] };
}

describe("TemplateRenderer interaction null guard", () => {
  it("renders a block without an interaction object in public mode without crashing", () => {
    expect(() =>
      renderToStaticMarkup(
        <TemplateRenderer
          config={imageConfigWithoutInteraction()}
          breakpoint="mobile"
          mode="public"
        />,
      ),
    ).not.toThrow();
  });

  it("renders a block without an interaction object in edit mode without crashing", () => {
    expect(() =>
      renderToStaticMarkup(
        <TemplateRenderer
          config={imageConfigWithoutInteraction()}
          breakpoint="desktop"
          mode="edit"
        />,
      ),
    ).not.toThrow();
  });

  it("renders a link-bearing block without interaction using same-tab behavior", () => {
    const markup = renderToStaticMarkup(
      <TemplateRenderer config={linkConfigWithoutInteraction()} breakpoint="mobile" mode="public" />,
    );

    expect(markup).toContain('href="https://example.com/"');
    expect(markup).not.toContain('target="_blank"');
    expect(markup).not.toContain('rel="noopener noreferrer"');
  });

  it("preserves newTab=true link behavior when interaction exists", () => {
    const config = linkConfigWithoutInteraction();
    config.blocks[0] = {
      ...config.blocks[0]!,
      interaction: { animation: "soft-rise", newTab: true },
    };
    const markup = renderToStaticMarkup(
      <TemplateRenderer config={config} breakpoint="mobile" mode="public" />,
    );

    expect(markup).toContain('href="https://example.com/"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it("renders the Inspector for a selected legacy block and keeps the soft-rise fallback", () => {
    const config = linkConfigWithoutInteraction();
    const block = config.blocks[0]!;

    const markup = renderToStaticMarkup(
      <StudioProvider initialConfig={config} autoSave={false}>
        <BlockInspector block={block} />
      </StudioProvider>,
    );

    expect(markup).toContain("Elevar");
    expect(markup).toMatch(
      /class="[^"]*bg-background text-foreground shadow-sm[^"]*"[^>]*>Elevar</,
    );
  });

  it("preserves the existing local block animation when interaction exists", () => {
    const base = createDemoConfig();
    const block: TemplateBlock = {
      ...base.blocks[0]!,
      interaction: { animation: "fade", newTab: true },
    };
    const markup = renderToStaticMarkup(
      <TemplateRenderer config={{ ...base, blocks: [block] }} breakpoint="mobile" mode="edit" />,
    );
    expect(markup).toContain("pts-anim-fade");
  });

  it("does not mutate the canonical config during render", () => {
    const config = imageConfigWithoutInteraction();
    const before = JSON.stringify(config);
    renderToStaticMarkup(
      <TemplateRenderer config={config} breakpoint="mobile" mode="public" />,
    );
    expect(JSON.stringify(config)).toBe(before);
  });
});

