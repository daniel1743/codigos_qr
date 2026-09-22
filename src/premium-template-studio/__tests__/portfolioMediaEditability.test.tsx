import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockInspector } from "../components/inspector/Inspector";
import { StudioProvider } from "../state/StudioProvider";
import { createBlock } from "../constants/blockDefinitions";
import { SECTION_PRESETS } from "../constants/sectionPresets";
import { createDemoConfig } from "../templates/definitions";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { createInitialState, templateReducer } from "../state/templateReducer";
import type { BlockItem, TemplateBlock } from "../types";

function portfolioBlock(items: BlockItem[]): TemplateBlock {
  const block = createBlock("portfolio");
  return {
    ...block,
    id: "portfolio-test",
    content: { ...block.content, title: "Projects", items },
  };
}

function renderInspector(block: TemplateBlock): string {
  return renderToStaticMarkup(
    <StudioProvider initialConfig={{ ...createDemoConfig(), blocks: [block] }} autoSave={false}>
      <BlockInspector block={block} />
    </StudioProvider>,
  );
}

describe("Portfolio item media editability", () => {
  it("exposes every existing item image with a preview and replacement authority", () => {
    const markup = renderInspector(
      portfolioBlock([
        {
          id: "one",
          label: "Nova Rebrand",
          description: "Identity",
          url: "/nova",
          imageUrl: "/nova.jpg",
        },
        {
          id: "two",
          label: "Atlas App",
          description: "Product",
          url: "/atlas",
          imageUrl: "/atlas.jpg",
        },
      ]),
    );

    expect(markup).toContain("Nova Rebrand");
    expect(markup).toContain("Atlas App");
    expect(markup).toContain("/nova.jpg");
    expect(markup).toContain("/atlas.jpg");
    expect(markup.match(/Cambiar imagen/g)?.length).toBe(2);
  });

  it("keeps replacement scoped to the selected item and public rendering uses it", () => {
    const current = portfolioBlock([
      { id: "one", label: "One", description: "A", url: "/one", imageUrl: "/one-old.jpg" },
      { id: "two", label: "Two", description: "B", url: "/two", imageUrl: "/two-old.jpg" },
    ]);
    const state = createInitialState({ ...createDemoConfig(), blocks: [current] });
    const next = templateReducer(state, {
      type: "patchBlockField",
      id: current.id,
      path: "content.items",
      value: current.content.items?.map((item) =>
        item.id === "one" ? { ...item, imageUrl: "/one-new.jpg" } : item,
      ),
    });

    const markup = renderToStaticMarkup(
      <TemplateRenderer config={next.config} breakpoint="desktop" mode="public" />,
    );
    expect(markup).toContain("/one-new.jpg");
    expect(markup).not.toContain("/one-old.jpg");
    expect(markup).toContain("/two-old.jpg");
  });

  it("deletes and undoes the complete item atomically", () => {
    const current = portfolioBlock([
      { id: "one", label: "One", description: "A", url: "/one", imageUrl: "/one.jpg" },
      { id: "two", label: "Two", description: "B", url: "/two", imageUrl: "/two.jpg" },
    ]);
    const state = createInitialState({ ...createDemoConfig(), blocks: [current] });
    const deleted = templateReducer(state, {
      type: "patchBlockField",
      id: current.id,
      path: "content.items",
      value: current.content.items?.filter((item) => item.id !== "one"),
    });
    expect(deleted.config.blocks[0]?.content.items).toEqual([
      { id: "two", label: "Two", description: "B", url: "/two", imageUrl: "/two.jpg" },
    ]);

    const undone = templateReducer(deleted, { type: "undo" });
    expect(undone.config.blocks[0]?.content.items).toEqual(current.content.items);
  });

  it("keeps portfolio-family preset media editable", () => {
    const presets = SECTION_PRESETS.filter(
      (preset) => preset.category === "Portfolio" || preset.category === "Hero",
    );
    expect(presets).toHaveLength(9);
    for (const preset of presets) {
      const mediaBlocks = preset
        .createBlocks()
        .filter((block) => block.type === "portfolio" || block.type === "gallery");
      if (preset.category === "Portfolio") expect(mediaBlocks.length).toBeGreaterThan(0);
      for (const block of mediaBlocks) {
        const mediaItems =
          block.type === "portfolio" ? (block.content.items ?? []) : (block.content.images ?? []);
        expect(mediaItems.length).toBeGreaterThan(0);
      }
    }
  });
});
