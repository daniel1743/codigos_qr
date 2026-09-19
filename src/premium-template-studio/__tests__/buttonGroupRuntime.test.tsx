import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ButtonGroupBlock } from "../components/blocks/ActionBlocks";
import { createBlock } from "../constants/blockDefinitions";
import { RenderProvider } from "../engine/RenderContext";
import { createDemoConfig } from "../templates/definitions";
import type { BlockItem, TemplateBlock } from "../types";

function makeButtonGroup(items: BlockItem[], ctaStyle?: TemplateBlock["style"]["ctaStyle"]): TemplateBlock {
  const block = createBlock("buttonGroup");
  return {
    ...block,
    id: "button-group-runtime",
    content: { ...block.content, items },
    style: { ...block.style, ctaStyle },
  };
}

function renderButtonGroup(block: TemplateBlock) {
  const config = createDemoConfig();
  return renderToStaticMarkup(
    <RenderProvider value={{ theme: config.theme, breakpoint: "desktop", mode: "public" }}>
      <ButtonGroupBlock block={block} />
    </RenderProvider>,
  );
}

describe("Button Group CTA style runtime", () => {
  it("renders without crashing when no item CTA override is present", () => {
    const markup = renderButtonGroup(
      makeButtonGroup([
        { id: "first", label: "First button", url: "https://first.example" },
        { id: "second", label: "Second button", url: "https://second.example" },
      ]),
    );

    expect(markup).toContain("First button");
    expect(markup).toContain("Second button");
  });

  it("applies item overrides over the shared CTA style independently", () => {
    const markup = renderButtonGroup(
      makeButtonGroup(
        [
          {
            id: "first",
            label: "Red button",
            url: "https://first.example",
            ctaStyle: { backgroundColor: "#ff0000", textColor: "#ffffff" },
          },
          {
            id: "second",
            label: "Blue button",
            url: "https://second.example",
            ctaStyle: { backgroundColor: "#0000ff", textColor: "#ffffff" },
          },
        ],
        { backgroundColor: "#123456", textColor: "#eeeeee" },
      ),
    );

    expect(markup).toContain("Red button");
    expect(markup).toContain("Blue button");
    expect(markup).toContain("background-color:#ff0000");
    expect(markup).toContain("background-color:#0000ff");
    expect(markup).not.toContain("background-color:#123456");
  });

  it("falls back to the block CTA style when an item has no override", () => {
    const markup = renderButtonGroup(
      makeButtonGroup(
        [
          { id: "first", label: "Shared style", url: "https://first.example" },
          {
            id: "second",
            label: "Item style",
            url: "https://second.example",
            ctaStyle: { backgroundColor: "#abcdef" },
          },
        ],
        { backgroundColor: "#123456" },
      ),
    );

    expect(markup).toContain("background-color:#123456");
    expect(markup).toContain("background-color:#abcdef");
  });
});
