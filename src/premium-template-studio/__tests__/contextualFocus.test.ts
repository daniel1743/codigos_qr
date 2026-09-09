// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import {
  computeInspectorFocusScroll,
  requestCanvasFocus,
  requestInspectorFocus,
  shouldScrollInspectorToFocus,
  subscribeCanvasFocus,
  subscribeInspectorFocus,
} from "../components/inspector/inspectorFocus";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { RenderProvider } from "../engine/RenderContext";
import { ProfileHeader } from "../components/canvas/ProfileHeader";
import { createBlock } from "../constants/blockDefinitions";
import { createDemoConfig } from "../templates/definitions";

// Mark the happy-dom environment as act-ready so React flushes effects in `act()`.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Smart bidirectional contextual focus (Phase 5C2B)", () => {
  describe("computeInspectorFocusScroll (comfortable positioning)", () => {
    const viewport = { top: 0, bottom: 600 };

    it("returns 0 when the target is already comfortably visible", () => {
      expect(computeInspectorFocusScroll(viewport, { top: 100, bottom: 180 })).toBe(0);
    });

    it("returns a positive delta when the target is below the visible region", () => {
      const delta = computeInspectorFocusScroll(viewport, { top: 800, bottom: 880 });
      expect(delta).toBeGreaterThan(0);
    });

    it("returns a negative delta when the target is above the visible region", () => {
      const delta = computeInspectorFocusScroll({ top: 500, bottom: 1100 }, { top: 0, bottom: 40 });
      expect(delta).toBeLessThan(0);
    });

    it("brings an offscreen target into the upper band, not the raw top edge", () => {
      // Raw top-edge placement would be 600; the upper band is ~108 → 492.
      const delta = computeInspectorFocusScroll(viewport, { top: 600, bottom: 640 });
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThan(600);
    });
  });

  describe("source separation (anti-loop)", () => {
    it("canvas-origin request moves Inspector only", () => {
      const canvas: string[] = [];
      const inspector: string[] = [];
      const offCanvas = subscribeCanvasFocus((t) => canvas.push(t));
      const offInspector = subscribeInspectorFocus((t) => inspector.push(t));

      requestInspectorFocus("hero-title");
      expect(inspector).toEqual(["hero-title"]);
      expect(canvas).toEqual([]);

      offCanvas();
      offInspector();
    });

    it("inspector-origin request moves Canvas only", () => {
      const canvas: string[] = [];
      const inspector: string[] = [];
      const offCanvas = subscribeCanvasFocus((t) => canvas.push(t));
      const offInspector = subscribeInspectorFocus((t) => inspector.push(t));

      requestCanvasFocus("hero-title");
      expect(canvas).toEqual(["hero-title"]);
      expect(inspector).toEqual([]);

      offCanvas();
      offInspector();
    });
  });

  describe("canvas focus signal", () => {
    it("delivers a request exactly once and unsubscribes", () => {
      const received: string[] = [];
      const off = subscribeCanvasFocus((t) => received.push(t));
      requestCanvasFocus("profile-bio");
      expect(received).toEqual(["profile-bio"]);
      off();
      requestCanvasFocus("profile-bio");
      expect(received).toEqual(["profile-bio"]);
    });
  });

  describe("target set", () => {
    it("accepts every required target and rejects null", () => {
      expect(shouldScrollInspectorToFocus("profile-bio")).toBe(true);
      expect(shouldScrollInspectorToFocus("profile-cover")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-eyebrow")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-title")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-subtitle")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-description")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-cta")).toBe(true);
      expect(shouldScrollInspectorToFocus(null)).toBe(false);
    });
  });

  describe("DOM wiring integration (Phase 5C2C)", () => {
    it("hero text elements carry the hero-prefixed data-editor-target", () => {
      const config = createDemoConfig();
      const hero = { ...createBlock("hero"), id: "hero-text-wiring" };
      const markup = renderToStaticMarkup(
        createElement(TemplateRenderer, {
          config: { ...config, blocks: [hero] },
          breakpoint: "desktop",
          mode: "edit",
          editing: { onSelectHeroText: () => {} },
        }),
      );
      // The Canvas must expose the prefixed identity that the Inspector queries.
      expect(markup).toContain('data-editor-target="hero-title"');
      expect(markup).toContain('data-editor-target="hero-subtitle"');
      expect(markup).toContain('data-editor-target="hero-description"');
      expect(markup).toContain('data-editor-target="hero-eyebrow"');
      // The bare target must never leak (it would break the Canvas reveal query).
      expect(markup).not.toContain('data-editor-target="title"');
      expect(markup).not.toContain('data-editor-target="subtitle"');
    });

    it("clicking the Bio element in Canvas emits a profile-bio Inspector focus request", () => {
      const received: string[] = [];
      const off = subscribeInspectorFocus((t) => received.push(t));
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      const config = createDemoConfig();
      try {
        act(() => {
          root.render(
            createElement(
              RenderProvider,
              {
                value: {
                  theme: config.theme,
                  breakpoint: "desktop",
                  mode: "edit",
                  onSelectProfileCover: () => {},
                },
              },
              createElement(ProfileHeader, { profile: config.profile, layout: config.layout }),
            ),
          );
        });

        const bio = host.querySelector<HTMLElement>('[data-editor-target="profile-bio"]');
        expect(bio).not.toBeNull();

        act(() => {
          bio!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        });

        expect(received).toEqual(["profile-bio"]);
      } finally {
        off();
        act(() => root.unmount());
        document.body.removeChild(host);
      }
    });
  });
});
