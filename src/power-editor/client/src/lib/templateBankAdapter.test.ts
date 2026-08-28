import { describe, expect, it } from "vitest";
import type { TemplateConfig } from "../../../../lib/template-factory/config";
import { getBlock, getLinks, getSocials, type PageConfig } from "./editorCandidateModel";
import { templateBankConfigToPowerEditorConfig } from "./templateBankAdapter";

const templateConfig: TemplateConfig = {
  schemaVersion: 1,
  paletteId: "gold-luxury",
  identity: {
    logoText: "Navaja",
    subtitleText: "Barber shop",
    titleText: "Estilo clásico",
    profileImg: "https://example.com/avatar.jpg",
    bannerImg: "https://example.com/banner.jpg",
  },
  socials: {
    enabled: true,
    displayMode: "icons",
    items: [
      { id: "instagram", platform: "instagram", label: "Instagram", url: "https://instagram.com/test", iconId: "instagram", enabled: true },
    ],
  },
  content: { footerText: "cripqer.me/navaja" },
  links: [
    { id: "reserve", text: "Reservar cita", icon: "calendar", url: "https://example.com/reserva", fullWidth: true },
  ],
  appearance: {
    bgImage: "",
    bgOverlay: 20,
    bgStart: "#181420",
    bgMid: "#473016",
    bgEnd: "#d6a04f",
    bgAngle: 145,
    btnBgStart: "#d6a04f",
    btnBgEnd: "#f4d49a",
    btnBorderColor: "#d6a04f",
    accentBgStart: "#f4d49a",
    accentBgEnd: "#d6a04f",
    accentIconColor: "#181420",
    btnTextColor: "#ffffff",
    fontLogo: "Cinzel",
    fontHeading: "Cinzel",
    fontSubtitle: "Inter",
    fontBody: "Inter",
    themeId: "custom",
    btnPresetId: "premium",
    textPrimary: "#ffffff",
    textSubtitle: "#f4d49a",
    profileBorderColor: "#d6a04f",
    profileRadius: "50%",
    btnRadius: "9999px",
    banner: {
      enabled: true,
      heightPreset: "medium",
      positionY: 50,
      imageOpacity: 100,
      fusionPreset: "soft",
      fusionStrength: 70,
    },
  },
  layout: {
    gridCols: 1,
    profileBorder: 3,
    profileSize: 160,
    logoSize: 2.8,
    titleSize: 2.2,
    devicePreview: "mobile",
  },
};

describe("templateBankConfigToPowerEditorConfig", () => {
  it("convierte una plantilla pública vieja en PageConfig editable para Power Editor", () => {
    const page = templateBankConfigToPowerEditorConfig(templateConfig);

    expect(page.profile).toBe("premium");
    expect(page.blocks.map((block) => block.id)).toEqual([
      "banner",
      "profile",
      "heading",
      "subtitle",
      "links",
      "socials",
      "footer",
    ]);
    expect(getBlock(page, "heading")?.props.text).toBe("Estilo clásico");
    expect(getLinks(getBlock(page, "links"))[0]).toMatchObject({
      label: "Reservar cita",
      url: "https://example.com/reserva",
      style: { variant: "premium" },
    });
    expect(getSocials(getBlock(page, "socials"))[0]).toMatchObject({
      network: "instagram",
      url: "https://instagram.com/test",
    });
  });

  it("hidrata directamente una config que ya viene del Power Editor", () => {
    const existing = {
      version: 5,
      profile: "premium",
      capabilities: {},
      branding: {},
      theme: {},
      background: {},
      presets: [],
      blocks: [{ id: "heading", type: "heading", order: 0, enabled: true, props: { text: "Power" } }],
    } as PageConfig;

    const page = templateBankConfigToPowerEditorConfig(existing);

    expect(getBlock(page, "heading")?.props.text).toBe("Power");
    expect(page.capabilities.allowGallery).toBe(true);
  });
});
