// HeadingBlock system placeholder (CRIPQER_POWER_PUBLIC_SYSTEM_PLACEHOLDERS_V1).
//
// The heading block ships a default title of "Section title" so the editor has
// something discoverable to edit. That value is a *system placeholder*, not user
// content, so it must never leak onto a published page. This test proves:
//   1. untouched "Section title"  -> hidden in public mode
//   2. custom heading             -> preserved in public mode
//   3. edit mode                  -> placeholder still available for editing
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { createBlock } from "../constants/blockDefinitions";
import { createDemoConfig } from "../templates/definitions";
import type { BioTemplateConfig } from "../types";

function renderHeading(title: string, mode: "edit" | "public"): string {
  const base = createDemoConfig();
  const heading = createBlock("heading");
  const config: BioTemplateConfig = {
    ...base,
    blocks: [{ ...heading, id: "heading-placeholder", content: { ...heading.content, title } }],
  };
  return renderToStaticMarkup(
    <TemplateRenderer config={config} breakpoint="desktop" mode={mode} />,
  );
}

describe('HeadingBlock system placeholder ("Section title")', () => {
  it('hides the untouched "Section title" default on public pages', () => {
    const markup = renderHeading("Section title", "public");
    expect(markup).not.toContain("Section title");
  });

  it("preserves a genuine user-authored heading on public pages", () => {
    const markup = renderHeading("Mis servicios", "public");
    expect(markup).toContain("Mis servicios");
  });

  it("preserves headings that resemble other system labels but are not the placeholder", () => {
    // "Portfolio" and "Selected Works" are preset headings, not the "Section title"
    // placeholder, so they must remain visible on public pages.
    expect(renderHeading("Portfolio", "public")).toContain("Portfolio");
    expect(renderHeading("Selected Works", "public")).toContain("Selected Works");
  });

  it("keeps the default placeholder visible in edit mode", () => {
    const markup = renderHeading("Section title", "edit");
    expect(markup).toContain("Section title");
  });
});
