// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { EditorProvider } from "../contexts/EditorContext";
import { TemplateRenderer } from "../components/templates/TemplateRenderer";
import { HeroVariantThumb, heroVariants } from "../components/editor/controls/HeroVariantPicker";

const HERO_PROP_KEY = "block:hero";

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }
});

function mount(node: React.ReactElement): string {
  const host = document.createElement("div");
  document.body.append(host);
  const localRoot = createRoot(host);
  act(() => {
    localRoot.render(node);
  });
  const html = host.innerHTML;
  act(() => localRoot.unmount());
  host.remove();
  return html;
}

/**
 * Renders the real Magic document with one hero variant and returns the produced
 * markup, both raw and with the identifying attributes removed, so two variants
 * only compare equal when their composition is genuinely identical.
 */
function heroMarkupOf(variant: string): { raw: string; composition: string } {
  const raw = mount(
    <EditorProvider
      initialTemplate="bio"
      initialDocument={{
        templateId: "bio",
        doc: {
          blocks: [{ key: "hero", type: "hero" }],
          texts: {},
          textStyles: {},
          props: { [HERO_PROP_KEY]: { variant } },
          removed: {},
        },
      }}
    >
      <TemplateRenderer />
    </EditorProvider>,
  );
  return {
    raw,
    composition: raw
      .replace(/data-hero="[^"]*"/g, "")
      .replace(/data-shape="[^"]*"/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

describe("Bridge 4 · 30/30 hero variants render a different composition", () => {
  it("mounts the hero with the variant the document selected", () => {
    const markup = heroMarkupOf("editorialCenter");
    expect(markup.raw, markup.raw.slice(0, 400)).toContain('data-hero="editorialCenter"');
  });

  it("produces distinct markup with the identifying attributes removed", () => {
    const compositions = new Map<string, string>();
    for (const variant of heroVariants) {
      const markup = heroMarkupOf(variant.value);
      expect(markup.raw, `${variant.value} did not mount its own hero`).toContain(
        `data-hero="${variant.value}"`,
      );
      expect(markup.composition.length, `${variant.value} rendered nothing`).toBeGreaterThan(100);
      compositions.set(variant.value, markup.composition);
    }
    expect(compositions.size).toBe(30);

    const byComposition = new Map<string, string[]>();
    for (const [variant, composition] of compositions) {
      byComposition.set(composition, [...(byComposition.get(composition) ?? []), variant]);
    }

    // Every variant id must render its own composition, not the `default` fallback.
    const collisions = [...byComposition.values()].filter((variants) => variants.length > 1);
    expect(
      collisions,
      `variants sharing one composition: ${collisions.map((c) => c.join(" = ")).join(" | ")}`,
    ).toEqual([]);
  });
});

describe("Bridge 4 · 30/30 hero variants have their own thumbnail", () => {
  it("renders unique thumbnail markup for each variant", () => {
    const thumbs = heroVariants.map((variant) => ({
      variant: variant.value,
      html: mount(<HeroVariantThumb variant={variant.value} />),
    }));

    const groups = new Map<string, string[]>();
    for (const thumb of thumbs) {
      groups.set(thumb.html, [...(groups.get(thumb.html) ?? []), thumb.variant]);
    }
    const collisions = [...groups.values()].filter((variants) => variants.length > 1);
    expect(
      collisions,
      `variants sharing one thumbnail: ${collisions.map((c) => c.join(" = ")).join(" | ")}`,
    ).toEqual([]);
    expect(thumbs).toHaveLength(30);
    for (const thumb of thumbs) {
      expect(thumb.html.length, `${thumb.variant} thumbnail is empty`).toBeGreaterThan(40);
    }
  });
});
