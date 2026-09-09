// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import {
  requestCanvasFocus,
  requestInspectorFocus,
  shouldScrollInspectorToFocus,
  subscribeCanvasFocus,
  subscribeInspectorFocus,
} from "../components/inspector/inspectorFocus";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { createBlock } from "../constants/blockDefinitions";
import { createDemoConfig } from "../templates/definitions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Hero image contextual editing (Phase 5C3)", () => {
  describe("target acceptance", () => {
    it("accepts hero-image as a ContextualTarget (scroll-worthy, never null)", () => {
      expect(shouldScrollInspectorToFocus("hero-image")).toBe(true);
      expect(shouldScrollInspectorToFocus(null)).toBe(false);
    });

    it("keeps all pre-existing contextual targets working", () => {
      expect(shouldScrollInspectorToFocus("hero-eyebrow")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-title")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-subtitle")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-description")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-cta")).toBe(true);
      expect(shouldScrollInspectorToFocus("profile-cover")).toBe(true);
    });
  });

  describe("focus signals", () => {
    it("delivers a canvas→inspector hero-image request exactly once and unsubscribes", () => {
      const received: string[] = [];
      const off = subscribeInspectorFocus((t) => received.push(t));
      requestInspectorFocus("hero-image");
      expect(received).toEqual(["hero-image"]);
      off();
      requestInspectorFocus("hero-image");
      expect(received).toEqual(["hero-image"]);
    });

    it("delivers an inspector→canvas hero-image request exactly once", () => {
      const received: string[] = [];
      const off = subscribeCanvasFocus((t) => received.push(t));
      requestCanvasFocus("hero-image");
      expect(received).toEqual(["hero-image"]);
      off();
      requestCanvasFocus("hero-image");
      expect(received).toEqual(["hero-image"]);
    });
  });

  describe("DOM wiring", () => {
    function renderHeroMarkup(variant: string, mode: "edit" | "public") {
      const config = createDemoConfig();
      const hero = { ...createBlock("hero"), id: "hero-image-test", variant } as ReturnType<
        typeof createBlock
      > & { variant: string };
      return renderToStaticMarkup(
        createElement(TemplateRenderer, {
          config: { ...config, blocks: [hero] },
          breakpoint: "desktop",
          mode,
          editing: mode === "edit" ? { onSelectHeroImage: () => {} } : undefined,
        }),
      );
    }

    it("foreground-media variants (centered/split/editorial) expose data-editor-target=hero-image", () => {
      for (const variant of ["centered", "split", "editorial"]) {
        const markup = renderHeroMarkup(variant, "edit");
        expect(markup, `variant=${variant}`).toContain('data-editor-target="hero-image"');
      }
    });

    it("the background-only full-image variant does NOT mark its media as foreground hero-image", () => {
      const markup = renderHeroMarkup("full-image", "edit");
      expect(markup).not.toContain('data-editor-target="hero-image"');
    });

    it("public rendering never gains the hero-image editing click identity", () => {
      const markup = renderHeroMarkup("centered", "public");
      expect(markup).not.toContain('data-editor-target="hero-image"');
    });
  });

  describe("canvas click → selection", () => {
    it("clicking the foreground Hero image emits the exact hero-image selection", () => {
      const received: string[] = [];
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      const config = createDemoConfig();
      const hero = { ...createBlock("hero"), id: "hero-image-click" };
      try {
        act(() => {
          root.render(
            createElement(TemplateRenderer, {
              config: { ...config, blocks: [hero] },
              breakpoint: "desktop",
              mode: "edit",
              editing: { onSelectHeroImage: (id) => received.push(id) },
            }),
          );
        });

        const image = host.querySelector<HTMLElement>('[data-editor-target="hero-image"]');
        expect(image).not.toBeNull();

        act(() => {
          image!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });

        expect(received).toEqual(["hero-image-click"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });
  });
});
