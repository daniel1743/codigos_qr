import { describe, expect, it } from "vitest";
import { createInitialState, templateReducer } from "../state/templateReducer";
import { createDemoConfig } from "../templates/definitions";
import {
  requestInspectorFocus,
  shouldScrollInspectorToFocus,
  subscribeInspectorFocus,
} from "../components/inspector/inspectorFocus";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TemplateRenderer } from "../engine/TemplateRenderer";

describe("Profile cover contextual editing (Phase 5B2)", () => {
  describe("shouldScrollInspectorToFocus (targeting decision is stable)", () => {
    it("warrants a scroll only for a non-null target", () => {
      expect(shouldScrollInspectorToFocus("profile-cover")).toBe(true);
      expect(shouldScrollInspectorToFocus(null)).toBe(false);
    });
  });

  describe("inspector focus signal", () => {
    it("delivers a request to subscribers exactly once and unsubscribes", () => {
      const received: string[] = [];
      const off = subscribeInspectorFocus((t) => received.push(t));
      requestInspectorFocus("profile-cover");
      expect(received).toEqual(["profile-cover"]);
      off();
      requestInspectorFocus("profile-cover");
      expect(received).toEqual(["profile-cover"]);
    });
  });

  describe("canonical config integrity", () => {
    const config = createDemoConfig();
    const heroBlockId = config.blocks[0]!.id;
    const initialState = createInitialState(config);

    it("clearing block selection (cover context) does not mutate config or history", () => {
      const state = templateReducer(initialState, { type: "selectBlock", id: null });
      expect(state.selectedBlockId).toBeNull();
      expect(state.config).toBe(config);
      expect(state.past.length).toBe(0);
      expect(state.dirty).toBe(false);
    });

    it("editing the cover image does not reset profile identity or blocks", () => {
      const before = initialState.config;
      const state = templateReducer(initialState, {
        type: "patch",
        path: "profile.banner.imageUrl",
        value: "https://example.com/cover.jpg",
      });
      expect(state.config.profile.banner.imageUrl).toBe("https://example.com/cover.jpg");
      expect(state.config.profile.name).toBe(before.profile.name);
      expect(state.config.blocks).toEqual(before.blocks);
    });

    it("editing the cover overlay only changes the cover overlay", () => {
      const before = initialState.config;
      const state = templateReducer(initialState, {
        type: "patch",
        path: "profile.banner.overlay",
        value: 0.65,
      });
      expect(state.config.profile.banner.overlay).toBe(0.65);
      expect(state.config.profile.banner.imageUrl).toBe(before.profile.banner.imageUrl);
      expect(state.config.theme).toEqual(before.theme);
      expect(state.config.blocks).toEqual(before.blocks);
    });

    it("normal block selection still works after a cover context", () => {
      const deselected = templateReducer(initialState, { type: "selectBlock", id: null });
      const reselected = templateReducer(deselected, { type: "selectBlock", id: heroBlockId });
      expect(reselected.selectedBlockId).toBe(heroBlockId);
      expect(reselected.config).toBe(config);
    });
  });
});

describe("Profile Cover full-bleed (Phase 5C6A)", () => {
  describe("schema", () => {
    it("missing widthMode is absent (backward-compatible contained default)", () => {
      expect(createDemoConfig().profile.banner.widthMode).toBeUndefined();
    });

    it("accepts full-bleed and contained via the canonical patch path", () => {
      const state = createInitialState(createDemoConfig());
      const fb = templateReducer(state, {
        type: "patch",
        path: "profile.banner.widthMode",
        value: "full-bleed",
      });
      expect(fb.config.profile.banner.widthMode).toBe("full-bleed");
      const contained = templateReducer(fb, {
        type: "patch",
        path: "profile.banner.widthMode",
        value: "contained",
      });
      expect(contained.config.profile.banner.widthMode).toBe("contained");
    });

    it("widthMode patch preserves the other banner fields", () => {
      const cfg = createDemoConfig();
      const next = templateReducer(createInitialState(cfg), {
        type: "patch",
        path: "profile.banner.widthMode",
        value: "full-bleed",
      });
      expect(next.config.profile.banner.height).toBe(cfg.profile.banner.height);
      expect(next.config.profile.banner.mobileHeight).toBe(cfg.profile.banner.mobileHeight);
      expect(next.config.profile.banner.imageUrl).toBe(cfg.profile.banner.imageUrl);
      expect(next.config.profile.banner.focalX).toBe(cfg.profile.banner.focalX);
      expect(next.config.profile.banner.focalY).toBe(cfg.profile.banner.focalY);
      expect(next.config.profile.banner.blur).toBe(cfg.profile.banner.blur);
      expect(next.config.profile.banner.overlay).toBe(cfg.profile.banner.overlay);
      expect(next.config.profile.banner.radius).toBe(cfg.profile.banner.radius);
    });
  });

  describe("render", () => {
    const renderStatic = (cfg: ReturnType<typeof createDemoConfig>) =>
      renderToStaticMarkup(
        createElement(TemplateRenderer, {
          config: cfg,
          breakpoint: "desktop" as const,
          mode: "public" as const,
        }),
      );

    it("contained (default) keeps the banner radius and never squares the top", () => {
      const cfg = createDemoConfig();
      cfg.profile.banner.radius = 18;
      const markup = renderStatic(cfg);
      expect(markup).toContain("border-radius:18px");
      expect(markup).not.toContain("border-radius:0 0");
    });

    it("full-bleed squares the top corners and keeps the bottom radius", () => {
      const cfg = createDemoConfig();
      cfg.profile.banner.radius = 18;
      cfg.profile.banner.widthMode = "full-bleed";
      const markup = renderStatic(cfg);
      expect(markup).toContain("border-radius:0 0 18px 18px");
    });

    it("full-bleed never uses viewport units (100vw)", () => {
      const cfg = createDemoConfig();
      cfg.profile.banner.widthMode = "full-bleed";
      const markup = renderStatic(cfg);
      expect(markup).not.toContain("100vw");
    });

    it("full-bleed preserves height, focal position and blur", () => {
      const cfg = createDemoConfig();
      cfg.profile.banner.imageUrl = "https://example.com/cover.jpg";
      cfg.profile.banner.widthMode = "full-bleed";
      cfg.profile.banner.height = 220;
      cfg.profile.banner.focalX = 25;
      cfg.profile.banner.focalY = 75;
      cfg.profile.banner.blur = 4;
      const markup = renderStatic(cfg);
      expect(markup).toContain("height:220px");
      expect(markup).toContain("object-position:25% 75%");
      expect(markup).toContain("blur(4px)");
    });
  });
});
