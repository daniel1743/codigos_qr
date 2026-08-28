import { describe, expect, it } from "vitest";
import { clonePageConfig, hydratePageConfig, initialPageConfig, updateBlock, updateLink } from "./editorCandidateModel";

describe("branding y apariencia de enlaces", () => {
  it("no muestra un logo CRIPQER heredado cuando no existe un logo cargado", () => {
    const legacy = clonePageConfig(initialPageConfig);
    const profile = legacy.blocks.find(block => block.id === "profile");
    if (!profile) throw new Error("Perfil inicial no encontrado");
    profile.props.logo = "CRIPQER";

    const hydrated = hydratePageConfig(legacy);
    expect(hydrated.blocks.find(block => block.id === "profile")?.props.logo).toBe("");
    expect(initialPageConfig.blocks.find(block => block.id === "profile")?.props.logo).toBe("");
  });

  it("actualiza el estilo de un enlace de forma inmutable", () => {
    const next = updateLink(initialPageConfig, "links", "link-agenda", {
      style: { color: "#102030", textColor: "#ffffff", borderColor: "#f0c777", borderWidth: 2.5, radius: 21, shadow: 18, fontFamily: "Poppins", fontSize: 18, fontWeight: 800, fontStyle: "italic", letterSpacing: 1.5, textStrokeWidth: 1, textStrokeColor: "#111111", textShadow: 12, textShadowColor: "#3a1700" },
    });
    const original = initialPageConfig.blocks.find(block => block.id === "links");
    const updated = next.blocks.find(block => block.id === "links");

    expect((original?.props.items as Array<{ style?: { color?: string } }>)[0]?.style?.color).toBeUndefined();
    expect((updated?.props.items as Array<{ style?: { color?: string; textColor?: string; borderColor?: string; borderWidth?: number; radius?: number; shadow?: number; fontFamily?: string; fontSize?: number; fontWeight?: number; fontStyle?: string; letterSpacing?: number; textStrokeWidth?: number; textStrokeColor?: string; textShadow?: number; textShadowColor?: string } }>)[0]?.style).toMatchObject({ color: "#102030", textColor: "#ffffff", borderColor: "#f0c777", borderWidth: 2.5, radius: 21, shadow: 18, fontFamily: "Poppins", fontSize: 18, fontWeight: 800, fontStyle: "italic", letterSpacing: 1.5, textStrokeWidth: 1, textStrokeColor: "#111111", textShadow: 12, textShadowColor: "#3a1700" });
  });

  it("actualiza el acabado tipográfico de un título sin mutar el original", () => {
    const next = updateBlock(initialPageConfig, "heading", { props: { color: "#55c8ff", fontFamily: "Cinzel", fontWeight: 800, italic: true, letterSpacing: 2, lineHeight: 1.35, textStrokeWidth: 1.5, textStrokeColor: "#17120e", textShadow: 14, shadowColor: "#000000", shadowOpacity: 70 } });
    const original = initialPageConfig.blocks.find(block => block.id === "heading");
    const updated = next.blocks.find(block => block.id === "heading");

    expect(original?.props.color).toBeUndefined();
    expect(updated?.props).toMatchObject({ color: "#55c8ff", fontFamily: "Cinzel", fontWeight: 800, italic: true, letterSpacing: 2, lineHeight: 1.35, textStrokeWidth: 1.5, textStrokeColor: "#17120e", textShadow: 14, shadowColor: "#000000", shadowOpacity: 70 });
  });
});
