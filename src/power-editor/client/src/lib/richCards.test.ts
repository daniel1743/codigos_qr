import { describe, expect, it } from "vitest";
import { createRichCard, normalizeRichCard, normalizeRichCardSelection, patchRichCard } from "./richCards";

describe("tarjetas enriquecidas", () => {
  it("crea una tarjeta 75/25 sin imagen activa por defecto", () => {
    const card = createRichCard("card-1");
    expect(card.imageEnabled).toBe(false);
    expect(card.imageSide).toBe("right");
    expect(card.titleStyle?.fontWeight).toBe(800);
    expect(card.ctaEnabled).toBe(true);
    expect(card.cardLinkEnabled).toBe(false);
  });

  it("normaliza la posición de imagen al único conjunto permitido", () => {
    const card = normalizeRichCard({ ...createRichCard("card-1"), imageUrl: "https://example.test/card.jpg", imageEnabled: true, imageSide: "center" as never });
    expect(card.imageEnabled).toBe(true);
    expect(card.imageSide).toBe("right");
  });

  it("conserva visible una imagen de tarjeta de configuración anterior", () => {
    const card = normalizeRichCard({ id: "legacy-card", title: "Anterior", description: "Compatible", imageUrl: "https://example.test/legacy.jpg" });
    expect(card.imageEnabled).toBe(true);
    expect(card.imageSide).toBe("right");
  });

  it("permite abrir la configuración de imagen antes de escoger un archivo", () => {
    const card = normalizeRichCard({ ...createRichCard("card-1"), imageEnabled: true, imageUrl: "" });
    expect(card.imageEnabled).toBe(true);
  });

  it("actualiza estilo y borde sin mutar la tarjeta original", () => {
    const original = createRichCard("card-1");
    const next = patchRichCard([original], "card-1", { borderWidth: 3, titleStyle: { ...original.titleStyle, color: "#d9dde6", italic: true } });
    expect(original.borderWidth).toBe(0);
    expect(original.titleStyle?.color).toBe("#f1eee8");
    expect(next[0]).toMatchObject({ borderWidth: 3, titleStyle: { color: "#d9dde6", italic: true } });
  });

  it("normaliza enlace opcional y conserva alineaciones independientes", () => {
    const original = createRichCard("card-1");
    const next = patchRichCard([original], "card-1", { cardLinkEnabled: true, cardUrl: "https://example.test/card", ctaEnabled: false, titleStyle: { ...original.titleStyle, textAlign: "center" }, descriptionStyle: { ...original.descriptionStyle, textAlign: "right" }, ctaStyle: { ...original.ctaStyle, textAlign: "left" } });
    expect(original.cardLinkEnabled).toBe(false);
    expect(next[0]).toMatchObject({ cardLinkEnabled: true, cardUrl: "https://example.test/card", ctaEnabled: false, titleStyle: { textAlign: "center" }, descriptionStyle: { textAlign: "right" }, ctaStyle: { textAlign: "left" } });
  });

  it("mantiene una subselección estable y degrada media o CTA no visibles a tarjeta", () => {
    const first = createRichCard("card-1");
    const second = { ...createRichCard("card-2"), imageEnabled: true, imageUrl: "https://example.test/image.jpg" };
    expect(normalizeRichCardSelection([first, second], { cardId: "card-2", target: "image" })).toEqual({ cardId: "card-2", target: "image" });
    expect(normalizeRichCardSelection([first, second], { cardId: "card-1", target: "image" })).toEqual({ cardId: "card-1", target: "card" });
    expect(normalizeRichCardSelection([{ ...first, ctaEnabled: false }], { cardId: "card-1", target: "cta" })).toEqual({ cardId: "card-1", target: "card" });
  });
});
