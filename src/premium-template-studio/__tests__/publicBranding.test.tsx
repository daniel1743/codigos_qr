import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { createDemoConfig } from "../templates/definitions";

function renderPublicBranding(showBranding: boolean, brandingTier?: "free" | "pro") {
  const config = createDemoConfig();
  return renderToStaticMarkup(
    <TemplateRenderer
      config={{ ...config, settings: { ...config.settings, showBranding } }}
      breakpoint="desktop"
      mode="public"
      brandingTier={brandingTier}
    />,
  );
}

describe("public Cripqer branding", () => {
  it("is visible by default and links visitors to Cripqer", () => {
    const markup = renderPublicBranding(true);

    expect(markup).toContain('data-testid="cripqer-public-branding"');
    expect(markup).toContain('href="/"');
    expect(markup).toContain('aria-label="Visitar Cripqer"');
    expect(markup).toContain("/brand-assets/cripqer-mark.png");
    expect(markup).toContain("Crip");
  });

  it("keeps the official footer visible when an unauthorized config disables it", () => {
    expect(renderPublicBranding(false, "free")).toContain('data-testid="cripqer-public-branding"');
  });

  it("hides the footer only for an authorized remove-branding entitlement", () => {
    expect(renderPublicBranding(false, "pro")).not.toContain(
      'data-testid="cripqer-public-branding"',
    );
  });

  it("does not restore the removed internal Premium Template Studio branding", () => {
    expect(renderPublicBranding(true)).not.toContain("Made with Premium Template Studio");
  });
});
