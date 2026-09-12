import { describe, expect, it } from "vitest";
import { createBlankPageConfig } from "../blankPageConfig";

describe("createBlankPageConfig", () => {
  it("seeds the page title and has no demo persona", () => {
    const config = createBlankPageConfig("Promo septiembre", "promotion");
    expect(config.metadata.name).toBe("Promo septiembre");
    expect(config.profile.name).toBe("Promo septiembre");
    expect(config.profile.role).toBe("");
    expect(config.profile.company).toBe("");
    expect(config.profile.location).toBe("");
    expect(config.profile.description).toBe("");
  });

  it("contains no demo content (Sofía Rivera / Estudio Nova / demo links)", () => {
    const raw = JSON.stringify(createBlankPageConfig("Promo septiembre", "promotion"));
    expect(raw).not.toContain("Sofía Rivera");
    expect(raw).not.toContain("Estudio Nova");
    expect(raw).not.toContain("Creative Director");
  });

  it("has no demo blocks (no links/portfolio/social/documents)", () => {
    const config = createBlankPageConfig("Promo septiembre", "promotion");
    expect(config.blocks).toEqual([]);
  });

  it("produces a structurally valid BioTemplateConfig", () => {
    const config = createBlankPageConfig("Promo septiembre", "promotion");
    expect(config.schemaVersion).toBe(1);
    expect(config.pageInstanceId).toBeTruthy();
    expect(config.templateDefinitionId).toBe("blank-page");
    expect(config.theme).toBeTruthy();
    expect(config.layout).toBeTruthy();
    expect(config.profile).toBeTruthy();
    expect(config.seo).toBeTruthy();
    expect(config.settings).toBeTruthy();
  });

  it("falls back to a safe title when empty", () => {
    const config = createBlankPageConfig("   ");
    expect(config.metadata.name).toBe("Página sin título");
  });
});
