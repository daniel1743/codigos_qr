import { describe, expect, it } from "vitest";
import type { PageDoc } from "../types/editor";
import {
  IMAGE_CARDS_MAX,
  addImageCard,
  canAddImageCard,
  canDeleteImageCard,
  deleteImageCard,
  duplicateImageCard,
  imageCardId,
  imageCardsOrder,
  moveImageCard,
  parseImageCardSlot,
  resolveImageCardShape,
} from "../utils/imageCardOps";

const KEY = "imageCards-abc";

function emptyDoc(): PageDoc {
  return { blocks: [], texts: {}, textStyles: {}, props: {}, removed: {} };
}

describe("imageCardOps", () => {
  it("starts with two cards when the block has never been materialised", () => {
    expect(imageCardsOrder(emptyDoc(), KEY)).toEqual(["0", "1"]);
    expect(canAddImageCard(emptyDoc(), KEY)).toBe(true);
  });

  it("adds cards up to the maximum of four and never a fifth", () => {
    let doc = emptyDoc();
    doc = addImageCard(doc, KEY); // 3
    doc = addImageCard(doc, KEY); // 4
    expect(imageCardsOrder(doc, KEY)).toHaveLength(IMAGE_CARDS_MAX);
    expect(canAddImageCard(doc, KEY)).toBe(false);

    const fifth = addImageCard(doc, KEY);
    expect(imageCardsOrder(fifth, KEY)).toHaveLength(IMAGE_CARDS_MAX);
    expect(fifth).toBe(doc); // no-op returns the same document
  });

  it("duplicates a card with its image, link and shape right after the original", () => {
    let doc = emptyDoc();
    doc = {
      ...doc,
      props: {
        ...doc.props,
        [imageCardId(KEY, "0")]: { src: "foto.jpg", href: "https://a.com", newTab: "on", shape: "extra" },
      },
    };
    doc = duplicateImageCard(doc, KEY, "0");
    const order = imageCardsOrder(doc, KEY);
    expect(order).toHaveLength(3);
    expect(order[0]).toBe("0");
    const clone = order[1]!;
    expect(clone).not.toBe("0");
    expect(doc.props[imageCardId(KEY, clone)]).toMatchObject({
      src: "foto.jpg",
      href: "https://a.com",
      newTab: "on",
      shape: "extra",
    });
  });

  it("does not duplicate beyond the maximum of four", () => {
    let doc = emptyDoc();
    doc = addImageCard(doc, KEY);
    doc = addImageCard(doc, KEY); // 4
    const next = duplicateImageCard(doc, KEY, "0");
    expect(imageCardsOrder(next, KEY)).toHaveLength(IMAGE_CARDS_MAX);
    expect(next).toBe(doc);
  });

  it("deletes a card but keeps at least one", () => {
    let doc = emptyDoc();
    doc = deleteImageCard(doc, KEY, "0");
    expect(imageCardsOrder(doc, KEY)).toEqual(["1"]);
    expect(canDeleteImageCard(doc, KEY)).toBe(false);

    const same = deleteImageCard(doc, KEY, "1");
    expect(imageCardsOrder(same, KEY)).toEqual(["1"]);
    expect(same).toBe(doc);
  });

  it("reorders cards", () => {
    let doc = emptyDoc();
    doc = addImageCard(doc, KEY); // 0,1,2-x
    const order = imageCardsOrder(doc, KEY);
    const moved = moveImageCard(doc, KEY, order[0]!, 1);
    expect(imageCardsOrder(moved, KEY)[0]).toBe(order[1]);
    expect(imageCardsOrder(moved, KEY)[1]).toBe(order[0]);
  });

  it("parses slot ids and resolves shapes", () => {
    expect(parseImageCardSlot(KEY, imageCardId(KEY, "3"))).toBe("3");
    expect(parseImageCardSlot(KEY, "imageCards-abc/other.0")).toBeNull();
    expect(parseImageCardSlot(KEY, "something-else")).toBeNull();
    expect(resolveImageCardShape(undefined)).toBe("rounded");
    expect(resolveImageCardShape("square")).toBe("square");
    expect(resolveImageCardShape("extra")).toBe("extra");
    expect(resolveImageCardShape("nope")).toBe("rounded");
  });
});
