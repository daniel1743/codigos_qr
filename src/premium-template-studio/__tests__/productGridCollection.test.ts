import { describe, expect, it } from "vitest";
import { cloneProductItem } from "../components/blocks/productGridCollection";

describe("ProductGrid collection cloning", () => {
  it("clones the complete last-card payload with a fresh ID", () => {
    const source = {
      id: "last-card",
      title: "Original",
      description: "Long copy",
      price: "$99",
      imageUrl: "https://example.com/image.jpg",
      ctaLabel: "Comprar",
      ctaUrl: "#buy",
      typography: { fontSize: 18, textColor: "#123456" },
      descriptionTypography: { textAlign: "center" as const },
      ctaStyle: { radius: 12, fontWeight: 700 },
    };
    const clone = cloneProductItem(source);

    expect(clone).toEqual({ ...source, id: clone.id });
    expect(clone.id).not.toBe(source.id);
    clone.title = "Changed clone";
    expect(source.title).toBe("Original");
  });

  it("creates a complete card when the collection is empty", () => {
    const seed = cloneProductItem();

    expect(seed.id).not.toBe("product-seed");
    expect(seed.title).toBeTruthy();
    expect(seed.description).toBeTruthy();
    expect(seed.price).toBeTruthy();
    expect(seed.imageUrl).toContain("images.unsplash.com");
    expect(seed.ctaLabel).toBeTruthy();
    expect(seed.ctaUrl).toBeTruthy();
  });
});
