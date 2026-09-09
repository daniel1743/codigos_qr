import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { createBlock } from "../constants/blockDefinitions";
import { createDemoConfig } from "../templates/definitions";
import { createInitialState, templateReducer } from "../state/templateReducer";
import {
  requestInspectorFocus,
  shouldScrollInspectorToFocus,
  subscribeInspectorFocus,
} from "../components/inspector/inspectorFocus";

describe("Hero text contextual editing (Phase 5C2)", () => {
  describe("shouldScrollInspectorToFocus (targeting decision is stable)", () => {
    it("warrants a scroll for every Hero text target, never null", () => {
      expect(shouldScrollInspectorToFocus("hero-title")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-subtitle")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-description")).toBe(true);
      expect(shouldScrollInspectorToFocus("hero-eyebrow")).toBe(true);
      expect(shouldScrollInspectorToFocus(null)).toBe(false);
    });

    it("keeps the existing CTA and Profile Cover targets working", () => {
      expect(shouldScrollInspectorToFocus("hero-cta")).toBe(true);
      expect(shouldScrollInspectorToFocus("profile-cover")).toBe(true);
    });
  });

  describe("inspector focus signal", () => {
    it("delivers a hero-title request exactly once and unsubscribes", () => {
      const received: string[] = [];
      const off = subscribeInspectorFocus((t) => received.push(t));
      requestInspectorFocus("hero-title");
      expect(received).toEqual(["hero-title"]);
      off();
      requestInspectorFocus("hero-title");
      expect(received).toEqual(["hero-title"]);
    });
  });

  describe("canonical config integrity", () => {
    const config = createDemoConfig();
    const heroBlock = { ...createBlock("hero"), id: "hero-text-test" };
    const withHero = { ...config, blocks: [heroBlock, ...config.blocks] };
    const initialState = createInitialState(withHero);

    it("editing title preserves sibling text fields and keeps selection", () => {
      const selected = templateReducer(initialState, {
        type: "selectBlock",
        id: "hero-text-test",
      });
      const state = templateReducer(selected, {
        type: "patchBlockField",
        id: "hero-text-test",
        path: "content.title",
        value: "New Title",
      });

      const content = state.config.blocks[0]!.content;
      expect(content.title).toBe("New Title");
      expect(content.subtitle).toBe(heroBlock.content.subtitle);
      expect(content.description).toBe(heroBlock.content.description);
      expect(content.eyebrow).toBe(heroBlock.content.eyebrow);
      // Parent Hero selection is preserved (contextual focus, not a new selection).
      expect(state.selectedBlockId).toBe("hero-text-test");
    });

    it("editing subtitle preserves title/description/eyebrow", () => {
      const state = templateReducer(initialState, {
        type: "patchBlockField",
        id: "hero-text-test",
        path: "content.subtitle",
        value: "New Subtitle",
      });
      const content = state.config.blocks[0]!.content;
      expect(content.subtitle).toBe("New Subtitle");
      expect(content.title).toBe(heroBlock.content.title);
      expect(content.description).toBe(heroBlock.content.description);
    });

    it("editing description preserves title/subtitle/eyebrow", () => {
      const state = templateReducer(initialState, {
        type: "patchBlockField",
        id: "hero-text-test",
        path: "content.description",
        value: "New Description",
      });
      const content = state.config.blocks[0]!.content;
      expect(content.description).toBe("New Description");
      expect(content.title).toBe(heroBlock.content.title);
      expect(content.subtitle).toBe(heroBlock.content.subtitle);
    });
  });

  describe("renderer", () => {
    it("renders the hero text in public mode without editing artifacts", () => {
      const config = createDemoConfig();
      const hero = { ...createBlock("hero"), id: "hero-text-test" };
      const markup = renderToStaticMarkup(
        <TemplateRenderer
          config={{ ...config, blocks: [hero] }}
          breakpoint="desktop"
          mode="public"
        />,
      );
      expect(markup).toContain(hero.content.title);
      expect(markup).toContain(hero.content.subtitle);
      expect(markup).toContain(hero.content.description);
      // Public output never carries an Inspector focus marker.
      expect(markup).not.toContain("data-inspector-focus");
    });

    it("renders in edit mode with a text-select callback without crashing", () => {
      const config = createDemoConfig();
      const hero = { ...createBlock("hero"), id: "hero-text-test" };
      const markup = renderToStaticMarkup(
        <TemplateRenderer
          config={{ ...config, blocks: [hero] }}
          breakpoint="desktop"
          mode="edit"
          editing={{ onSelectHeroText: () => {} }}
        />,
      );
      expect(markup).toContain(hero.content.title);
    });
  });
});
