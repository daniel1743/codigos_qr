import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDemoConfig } from "../templates/definitions";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { resolveVerificationVariant } from "../components/canvas/ProfileHeader";

describe("resolveVerificationVariant (trusted model resolution)", () => {
  it("official-gold wins regardless of the legacy verified boolean", () => {
    expect(resolveVerificationVariant(true, "official-gold")).toBe("official-gold");
    expect(resolveVerificationVariant(false, "official-gold")).toBe("official-gold");
  });

  it("standard and none are preserved exactly", () => {
    expect(resolveVerificationVariant(true, "standard")).toBe("standard");
    expect(resolveVerificationVariant(false, "none")).toBe("none");
  });

  it("legacy verified boolean maps to standard for backward compatibility", () => {
    expect(resolveVerificationVariant(true, undefined)).toBe("standard");
    expect(resolveVerificationVariant(false, undefined)).toBe("none");
    expect(resolveVerificationVariant(undefined, undefined)).toBe("none");
  });
});

describe("official gold badge rendering (Canvas/Public parity)", () => {
  it("official-gold renders the official Cripqer accessibility label + gold class", () => {
    const config = createDemoConfig();
    config.profile.verified = false;
    config.profile.verificationVariant = "official-gold";
    const html = renderToStaticMarkup(
      <TemplateRenderer config={config} breakpoint="mobile" mode="public" />,
    );
    expect(html).toContain("Perfil oficial de Cripqer");
    expect(html).toContain("pts-official-gold");
    expect(html).toContain("pts-gold-shimmer");
  });

  it("standard renders the normal verified badge (not gold)", () => {
    const config = createDemoConfig();
    config.profile.verified = true;
    config.profile.verificationVariant = "standard";
    const html = renderToStaticMarkup(
      <TemplateRenderer config={config} breakpoint="mobile" mode="public" />,
    );
    expect(html).toContain("Verificado");
    expect(html).not.toContain("Perfil oficial de Cripqer");
  });

  it("none renders no badge at all", () => {
    const config = createDemoConfig();
    config.profile.verified = false;
    config.profile.verificationVariant = "none";
    const html = renderToStaticMarkup(
      <TemplateRenderer config={config} breakpoint="mobile" mode="public" />,
    );
    expect(html).not.toContain("Verificado");
    expect(html).not.toContain("Perfil oficial de Cripqer");
  });

  it("gold is not derived from email/name/slug at render time", () => {
    // resolveVerificationVariant only accepts (verified, variant) — there is
    // no email/name/slug parameter, so gold cannot be faked from identity text.
    expect(resolveVerificationVariant.length).toBe(2);
    expect(resolveVerificationVariant(true, undefined)).toBe("standard");
  });
});
