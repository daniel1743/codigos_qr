import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudioProvider } from "../state/StudioProvider";
import { ItemsEditor } from "../components/inspector/Inspector";
import { createDemoConfig } from "../templates/definitions";
import type { BioTemplateConfig, BlockItem, TemplateBlock } from "../types";

/**
 * Real render-path contract for the Power Editor media-card smart-link bridge.
 *
 * The pure-function test (`mediaCardSmartLinkBridge.test.ts`) only exercises
 * `computePowerMediaCardPatch`. This test mounts the ACTUAL `ItemsEditor` —
 * the component that renders the runtime URL / Presentation / image fields the
 * user sees — and asserts the "Obtener vista previa" button is present exactly
 * when `item.presentation === "media-card"`.
 */

function linksBlock(items: BlockItem[]): TemplateBlock {
  const base = createDemoConfig().blocks[0]!;
  return {
    ...base,
    id: "links-test-block",
    type: "links",
    variant: "cards",
    content: { items },
  };
}

function renderItemsEditor(block: TemplateBlock): string {
  const config: BioTemplateConfig = { ...createDemoConfig(), blocks: [block] };
  return renderToStaticMarkup(
    <StudioProvider initialConfig={config} autoSave={false}>
      <ItemsEditor block={block} />
    </StudioProvider>,
  );
}

describe("Power Media Card smart-link bridge — render path", () => {
  it("renders 'Obtener vista previa' directly below URL for a media-card item", () => {
    const markup = renderItemsEditor(
      linksBlock([
        {
          id: "item-1",
          label: "Instagram",
          url: "https://instagram.com/daniel",
          presentation: "media-card",
        },
      ]),
    );

    expect(markup).toContain("Obtener vista previa");

    // The button must sit below the URL input, before the presentation field.
    const urlIndex = markup.indexOf('placeholder="https://');
    const buttonIndex = markup.indexOf("Obtener vista previa");
    expect(urlIndex).toBeGreaterThanOrEqual(0);
    expect(buttonIndex).toBeGreaterThan(urlIndex);
  });

  it("does NOT render 'Obtener vista previa' for a non-media-card (button) item", () => {
    const markup = renderItemsEditor(
      linksBlock([
        {
          id: "item-1",
          label: "Link",
          url: "https://example.com",
          presentation: "button",
        },
      ]),
    );

    expect(markup).not.toContain("Obtener vista previa");
  });

  it("keeps the destination URL and custom label untouched in the rendered fields", () => {
    const markup = renderItemsEditor(
      linksBlock([
        {
          id: "item-1",
          label: "Mi enlace",
          url: "https://example.com/path",
          presentation: "media-card",
        },
      ]),
    );

    expect(markup).toContain("Mi enlace");
    expect(markup).toContain("https://example.com/path");
    expect(markup).toContain('value="media-card"');
  });
});
