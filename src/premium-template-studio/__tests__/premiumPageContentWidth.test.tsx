import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { getTemplateDefinition } from "../templates/definitions";

describe("Premium Page section width authority", () => {
  it("lets Catalog ProductGrid use the Premium Page content surface", () => {
    const config = getTemplateDefinition("catalog-default-v1").build();
    const markup = renderToStaticMarkup(
      <TemplateRenderer config={config} documentKind="page" breakpoint="desktop" mode="edit" />,
    );

    expect(markup).toContain("max-width:100%;");
    expect(markup).toContain("grid-template-columns:repeat(3, minmax(0, 1fr))");
  });

  it("keeps the legacy readable container when no Premium Page surface is supplied", () => {
    const config = getTemplateDefinition("catalog-default-v1").build();
    const markup = renderToStaticMarkup(
      <TemplateRenderer config={config} breakpoint="desktop" mode="edit" />,
    );

    expect(markup).toContain("max-width:560px;");
    expect(markup).not.toContain("max-width:100%;");
  });

  it("reflows ProductGrid only at the mobile breakpoint", () => {
    const config = getTemplateDefinition("catalog-default-v1").build();
    const markup = renderToStaticMarkup(
      <TemplateRenderer config={config} documentKind="page" breakpoint="mobile" mode="edit" />,
    );

    expect(markup).toContain("grid-template-columns:repeat(1, minmax(0, 1fr))");
    expect(markup).toContain("max-width:100%;");
  });
});
