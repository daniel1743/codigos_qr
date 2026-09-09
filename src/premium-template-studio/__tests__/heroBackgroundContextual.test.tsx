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

describe("Hero background/overlay contextual editing (Phase 5C4)", () => {
  describe("target acceptance", () => {
    it("accepts hero-background as a ContextualTarget (scroll-worthy, never null)", () => {
      expect(shouldScrollInspectorToFocus("hero-background")).toBe(true);
      expect(shouldScrollInspectorToFocus(null)).toBe(false);
    });

    it("accepts hero-overlay as a ContextualTarget (scroll-worthy, never null)", () => {
      expect(shouldScrollInspectorToFocus("hero-overlay")).toBe(true);
      expect(shouldScrollInspectorToFocus(null)).toBe(false);
    });

    it("keeps all pre-existing contextual targets working", () => {
      expect(shouldScrollInspectorToFocus("hero-eyebrow")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-title")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-subtitle")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-description")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-cta")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-image")).toBe(true);
      expect(shouldScrollInspectorToFocus("profile-cover")).toBe(true);
    });
  });

  describe("focus signals", () => {
    it("delivers a canvas→inspector hero-background request exactly once and unsubscribes", () => {
      const received: string[] = [];
      const off = subscribeInspectorFocus((t) => received.push(t));
      requestInspectorFocus("hero-background");
      expect(received).toEqual(["hero-background"]);
      off();
      requestInspectorFocus("hero-background");
      expect(received).toEqual(["hero-background"]);
    });

    it("delivers an inspector→canvas hero-overlay request exactly once", () => {
      const received: string[] = [];
      const off = subscribeCanvasFocus((t) => received.push(t));
      requestCanvasFocus("hero-overlay");
      expect(received).toEqual(["hero-overlay"]);
      off();
      requestCanvasFocus("hero-overlay");
      expect(received).toEqual(["hero-overlay"]);
    });

    it("delivers an inspector→canvas hero-background request exactly once", () => {
      const received: string[] = [];
      const off = subscribeCanvasFocus((t) => received.push(t));
      requestCanvasFocus("hero-background");
      expect(received).toEqual(["hero-background"]);
      off();
      requestCanvasFocus("hero-background");
      expect(received).toEqual(["hero-background"]);
    });
  });

  describe("DOM wiring", () => {
    function renderHeroMarkup(variant: string, mode: "edit" | "public") {
      const config = createDemoConfig();
      const hero = { ...createBlock("hero"), id: "hero-bg-test", variant } as ReturnType<
        typeof createBlock
      > & { variant: string };
      return renderToStaticMarkup(
        createElement(TemplateRenderer, {
          config: { ...config, blocks: [hero] },
          breakpoint: "desktop",
          mode,
          editing:
            mode === "edit"
              ? { onSelectHeroBackground: () => {}, onSelectHeroImage: () => {} }
              : undefined,
        }),
      );
    }

    it("every Hero variant exposes data-editor-target=hero-background in edit mode", () => {
      for (const variant of ["centered", "split", "editorial", "full-image"]) {
        const markup = renderHeroMarkup(variant, "edit");
        expect(markup, `variant=${variant}`).toContain('data-editor-target="hero-background"');
      }
    });

    it("full-image exposes hero-background and hero-overlay but does NOT mark media as foreground hero-image", () => {
      const markup = renderHeroMarkup("full-image", "edit");
      expect(markup).toContain('data-editor-target="hero-background"');
      expect(markup).toContain('data-editor-target="hero-overlay"');
      expect(markup).not.toContain('data-editor-target="hero-image"');
    });

    it("public rendering never gains the hero-background/hero-overlay editing identity", () => {
      const markup = renderHeroMarkup("full-image", "public");
      expect(markup).not.toContain('data-editor-target="hero-background"');
      expect(markup).not.toContain('data-editor-target="hero-overlay"');
      expect(markup).not.toContain('data-editor-target="hero-image"');
    });
  });

  describe("full-image overlay binding (Phase 5C4B)", () => {
    function renderFullImageOverlay(overlay?: unknown) {
      const base = createBlock("hero");
      const hero = {
        ...base,
        id: "hero-overlay-binding",
        variant: "full-image",
        style: { ...base.style, overlay },
      } as ReturnType<typeof createBlock> & { variant: string };
      const config = createDemoConfig();
      return renderToStaticMarkup(
        createElement(TemplateRenderer, {
          config: { ...config, blocks: [hero] },
          breakpoint: "desktop",
          mode: "edit",
          editing: { onSelectHeroBackground: () => {}, onSelectHeroImage: () => {} },
        }),
      );
    }

    it("full-image overlay consumes style.overlay.opacity", () => {
      const markup = renderFullImageOverlay({ type: "solid", opacity: 0.75 });
      expect(markup).toContain("opacity:0.75");
    });

    it("full-image overlay consumes style.overlay.type (solid)", () => {
      const markup = renderFullImageOverlay({ type: "solid", opacity: 0.4 });
      // The overlay layer itself must resolve to a solid fill (the page may carry
      // an unrelated linear-gradient from the Hero's own backgroundGradient).
      expect(markup).toMatch(/data-editor-target="hero-overlay"[^>]*background:rgba\(0,0,0,0\.6\)/);
      expect(markup).not.toMatch(
        /data-editor-target="hero-overlay"[^>]*background:linear-gradient\(/,
      );
    });

    it("full-image overlay consumes style.overlay.type (gradient)", () => {
      const markup = renderFullImageOverlay({ type: "gradient", opacity: 0.4 });
      expect(markup).toContain("linear-gradient(");
    });

    it("full-image overlay consumes style.overlay.direction where applicable", () => {
      const toTop = renderFullImageOverlay({ type: "gradient", opacity: 0.4, direction: "to-top" });
      expect(toTop).toContain("linear-gradient(0deg,");

      const toBottom = renderFullImageOverlay({
        type: "gradient",
        opacity: 0.4,
        direction: "to-bottom",
      });
      expect(toBottom).toContain("linear-gradient(180deg,");
    });

    it("undefined overlay preserves a compatible fallback", () => {
      const markup = renderFullImageOverlay(undefined);
      expect(markup).toContain("opacity:0.4");
      expect(markup).toContain("background:rgba(0,0,0,0.6)");
    });

    it("full-image overlay keeps pointer-events:none", () => {
      const markup = renderFullImageOverlay({ type: "solid", opacity: 0.4 });
      expect(markup).toContain("pointer-events:none");
    });
  });

  describe("canvas click → selection", () => {
    it("clicking the exposed Hero background emits the exact hero-background selection", () => {
      const received: string[] = [];
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      const config = createDemoConfig();
      const hero = { ...createBlock("hero"), id: "hero-bg-click" };
      try {
        act(() => {
          root.render(
            createElement(TemplateRenderer, {
              config: { ...config, blocks: [hero] },
              breakpoint: "desktop",
              mode: "edit",
              editing: { onSelectHeroBackground: (id) => received.push(id) },
            }),
          );
        });

        const bg = host.querySelector<HTMLElement>('[data-editor-target="hero-background"]');
        expect(bg).not.toBeNull();

        act(() => {
          bg!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });

        expect(received).toEqual(["hero-bg-click"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });
  });

  describe("child click protection", () => {
    function makeHero(id: string) {
      const base = createBlock("hero");
      return {
        ...base,
        id,
        content: {
          ...base.content,
          title: "Test Title",
          subtitle: "Test Subtitle",
          description: "Test description",
          eyebrow: "Test eyebrow",
          primaryCTA: { label: "Primary CTA", url: "https://example.com" },
        },
      } as ReturnType<typeof createBlock>;
    }

    it("clicking the Hero title resolves as title, never hero-background", () => {
      const backgroundIds: string[] = [];
      const textTargets: string[] = [];
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      const config = createDemoConfig();
      try {
        act(() => {
          root.render(
            createElement(TemplateRenderer, {
              config: { ...config, blocks: [makeHero("hero-child-title")] },
              breakpoint: "desktop",
              mode: "edit",
              editing: {
                onSelectHeroBackground: (id) => backgroundIds.push(id),
                onSelectHeroText: (_id, target) => textTargets.push(target),
              },
            }),
          );
        });

        const title = host.querySelector<HTMLElement>('[data-editor-target="hero-title"]');
        expect(title).not.toBeNull();

        act(() => {
          title!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });

        expect(backgroundIds).toEqual([]);
        expect(textTargets).toEqual(["title"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });

    it("clicking the CTA button resolves as CTA, never hero-background", () => {
      const backgroundIds: string[] = [];
      const ctaIds: string[] = [];
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      const config = createDemoConfig();
      try {
        act(() => {
          root.render(
            createElement(TemplateRenderer, {
              config: { ...config, blocks: [makeHero("hero-child-cta")] },
              breakpoint: "desktop",
              mode: "edit",
              editing: {
                onSelectHeroBackground: (id) => backgroundIds.push(id),
                onSelectHeroCta: (id) => ctaIds.push(id),
              },
            }),
          );
        });

        const ctaButton = host.querySelector<HTMLElement>('[data-editor-target="hero-cta"] button');
        expect(ctaButton).not.toBeNull();

        act(() => {
          ctaButton!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });

        expect(backgroundIds).toEqual([]);
        expect(ctaIds).toEqual(["hero-child-cta"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });

    it("clicking a child wrapper (CTA container) is filtered and never resolves as hero-background", () => {
      const backgroundIds: string[] = [];
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      const config = createDemoConfig();
      try {
        act(() => {
          root.render(
            createElement(TemplateRenderer, {
              config: { ...config, blocks: [makeHero("hero-child-wrapper")] },
              breakpoint: "desktop",
              mode: "edit",
              editing: { onSelectHeroBackground: (id) => backgroundIds.push(id) },
            }),
          );
        });

        const ctaContainer = host.querySelector<HTMLElement>('[data-editor-target="hero-cta"]');
        expect(ctaContainer).not.toBeNull();

        act(() => {
          ctaContainer!.dispatchEvent(
            new MouseEvent("click", { bubbles: true, cancelable: true }),
          );
        });

        expect(backgroundIds).toEqual([]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });

    it("clicking the foreground Hero image resolves as hero-image, never hero-background", () => {
      const backgroundIds: string[] = [];
      const imageIds: string[] = [];
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      const config = createDemoConfig();
      const hero = { ...makeHero("hero-child-image"), variant: "centered" } as ReturnType<
        typeof createBlock
      > & { variant: string };
      try {
        act(() => {
          root.render(
            createElement(TemplateRenderer, {
              config: { ...config, blocks: [hero] },
              breakpoint: "desktop",
              mode: "edit",
              editing: {
                onSelectHeroBackground: (id) => backgroundIds.push(id),
                onSelectHeroImage: (id) => imageIds.push(id),
              },
            }),
          );
        });

        const image = host.querySelector<HTMLElement>('[data-editor-target="hero-image"]');
        expect(image).not.toBeNull();

        act(() => {
          image!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });

        expect(backgroundIds).toEqual([]);
        expect(imageIds).toEqual(["hero-child-image"]);
      } finally {
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });
  });
});
