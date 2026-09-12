import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import {
  appendGalleryImage,
  getGalleryColumns,
  moveGalleryImage,
  moveGalleryLightboxIndex,
  removeGalleryImage,
  replaceGalleryImage,
  type GalleryImage,
} from "../components/blocks/galleryImages";
import { createDemoConfig } from "../templates/definitions";
import { templateReducer, type StudioState } from "../state/templateReducer";
import type { BioTemplateConfig, TemplateBlock } from "../types";

const image = (id: string): GalleryImage => ({
  id,
  url: `https://images.example/${id}.jpg`,
  alt: `Image ${id}`,
});

function galleryConfig(images: GalleryImage[]): BioTemplateConfig {
  const base = createDemoConfig();
  const original = base.blocks[0]!;
  const gallery: TemplateBlock = {
    ...original,
    id: "gallery-under-test",
    type: "gallery",
    variant: "grid",
    content: { title: "Gallery", images },
    layout: { columns: 3, gap: 8 },
  };
  return { ...base, blocks: [gallery] };
}

function studioState(config: BioTemplateConfig): StudioState {
  return {
    config,
    past: [],
    future: [],
    selectedBlockId: "gallery-under-test",
    dirty: false,
    revision: 0,
  };
}

describe("Power Gallery management and lightbox", () => {
  it("adds, replaces, removes, and reorders gallery images without altering other items", () => {
    const initial = [image("one"), image("two"), image("three")];
    const added = appendGalleryImage(initial, image("four"));
    const replaced = replaceGalleryImage(added, "two", "https://images.example/replaced.jpg");
    const reordered = moveGalleryImage(replaced, 3, -1);
    const removed = removeGalleryImage(reordered, "three");

    expect(added).toHaveLength(4);
    expect(replaced[1]).toEqual({ ...image("two"), url: "https://images.example/replaced.jpg" });
    expect(reordered.map((entry) => entry.id)).toEqual(["one", "two", "four", "three"]);
    expect(removed.map((entry) => entry.id)).toEqual(["one", "two", "four"]);
    expect(removed[0]).toEqual(image("one"));
  });

  it("persists the edited gallery collection through the canonical block-field update", () => {
    const config = galleryConfig([image("one"), image("two")]);
    const nextImages = [image("two"), image("one"), image("three")];
    const next = templateReducer(studioState(config), {
      type: "patchBlockField",
      id: "gallery-under-test",
      path: "content.images",
      value: nextImages,
    });

    expect(next.config.blocks[0]?.content.images).toEqual(nextImages);
    expect(next.config.blocks[0]?.content.images).toHaveLength(3);
    expect(next.dirty).toBe(true);
  });

  it("balances two and four images while keeping the grid responsive", () => {
    expect(getGalleryColumns(1, 3, false)).toBe(1);
    expect(getGalleryColumns(2, 3, false)).toBe(2);
    expect(getGalleryColumns(4, 3, false)).toBe(2);
    expect(getGalleryColumns(3, 3, true)).toBe(2);

    const twoImageMarkup = renderToStaticMarkup(
      <TemplateRenderer config={galleryConfig([image("one"), image("two")])} mode="public" breakpoint="desktop" />,
    );
    const fourImageMarkup = renderToStaticMarkup(
      <TemplateRenderer
        config={galleryConfig([image("one"), image("two"), image("three"), image("four")])}
        mode="public"
        breakpoint="desktop"
      />,
    );

    expect(twoImageMarkup).toContain("grid-template-columns:repeat(2, minmax(0, 1fr))");
    expect(fourImageMarkup).toContain("grid-template-columns:repeat(2, minmax(0, 1fr))");
  });

  it("opens gallery images only in public mode and preserves previous/next wrapping", () => {
    const config = galleryConfig([image("one"), image("two"), image("three")]);
    const publicMarkup = renderToStaticMarkup(
      <TemplateRenderer config={config} mode="public" breakpoint="mobile" />,
    );
    const editMarkup = renderToStaticMarkup(
      <TemplateRenderer config={config} mode="edit" breakpoint="mobile" />,
    );

    expect(publicMarkup).toContain('aria-label="Open Image one"');
    expect(publicMarkup).toContain('aria-label="Open Image two"');
    expect(editMarkup).not.toContain('aria-label="Open Image one"');
    expect(moveGalleryLightboxIndex(0, 3, -1)).toBe(2);
    expect(moveGalleryLightboxIndex(2, 3, 1)).toBe(0);
  });
});
