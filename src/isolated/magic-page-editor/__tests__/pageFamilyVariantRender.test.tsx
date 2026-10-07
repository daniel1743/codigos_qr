// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditorProvider } from "../contexts/EditorContext";
import { TemplateRenderer } from "../components/templates/TemplateRenderer";
import { cardFamilies } from "../data/cardFamilies";
import { miniGalleryVariants, pageFamilyVariants } from "../data/templates";
import type { TemplateId } from "../types/editor";

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  document.body.replaceChildren();
});

function renderPage(templateId: TemplateId, props: Record<string, Record<string, string>>) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider
        initialTemplate={templateId}
        initialDocument={{
          templateId,
          doc: {
            blocks: templateId === "business" ? [{ key: "catalog", type: "catalog" }] : [{ key: "hero", type: "hero" }],
            texts: {},
            textStyles: {},
            props,
            removed: {},
          },
        }}
      >
        <TemplateRenderer />
      </EditorProvider>,
    );
  });
  return { host, root };
}

describe("Magic page family/variant state reaches the renderer", () => {
  it("consumes every Bio, Business and Portfolio family variant", () => {
    for (const [templateId, variants] of Object.entries(pageFamilyVariants) as [TemplateId, typeof pageFamilyVariants.bio][]) {
      const fingerprints = new Set<string>();
      for (const variant of variants) {
        const { host, root } = renderPage(templateId, { page: { family: templateId, familyVariant: variant.id } });
        const page = host.querySelector<HTMLElement>("[data-page-family]");
        expect(page?.getAttribute("data-page-family")).toBe(templateId);
        expect(page?.getAttribute("data-page-variant")).toBe(variant.id);
        fingerprints.add(`${page?.className}|${page?.style.getPropertyValue("--page-content-width")}|${page?.style.getPropertyValue("--page-variant-scale")}`);
        act(() => root.unmount());
        host.remove();
      }
      expect(fingerprints.size, `${templateId} variants collapsed to one renderer profile`).toBe(variants.length);
    }
    // Enumerates every page-family variant in all three templates. Explicit
    // budget for the same reason as the hero-variant tests: under worker
    // contention the 5s default failed it as a timeout, not as a collision.
  }, 20000);

  it("renders Catalog through a dedicated page-family renderer and consumes all 8 layouts", () => {
    const outputs = new Set<string>();
    for (const variant of cardFamilies.catalog.variants) {
      const { host, root } = renderPage("business", {
        page: { family: "catalog", familyVariant: variant.id },
        "block:catalog": { variant: variant.id },
      });
      expect(host.querySelector('[data-page-family="catalog"]')).not.toBeNull();
      expect(host.textContent).toContain("Catálogo");
      outputs.add(host.querySelector('[data-page-family="catalog"]')?.getAttribute("data-page-variant") ?? "");
      act(() => root.unmount());
      host.remove();
    }
    expect(outputs.size).toBe(cardFamilies.catalog.variants.length);
  });

  it("renders Mini Galería through its dedicated renderer and maps all 5 variants to gallery layouts", () => {
    const layouts = new Set<string>();
    for (const variant of miniGalleryVariants) {
      const { host, root } = renderPage("portfolio", { page: { family: "gallery", familyVariant: variant.id } });
      expect(host.querySelector('[data-page-family="gallery"]')).not.toBeNull();
      layouts.add(host.querySelector("[data-layout]")?.getAttribute("data-layout") ?? "");
      act(() => root.unmount());
      host.remove();
    }
    expect(layouts).toEqual(new Set(["fila", "mosaico", "carrusel", "masonry", "stacked"]));
  });
});
