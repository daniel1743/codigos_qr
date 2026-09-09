import { describe, expect, it } from "vitest";
import { createInitialState, templateReducer } from "../state/templateReducer";
import { createDemoConfig } from "../templates/definitions";
import { createBlock } from "../constants/blockDefinitions";
import {
  requestInspectorFocus,
  shouldScrollInspectorToFocus,
  subscribeInspectorFocus,
} from "../components/inspector/inspectorFocus";

describe("Hero CTA contextual editing (Phase 5C1)", () => {
  describe("shouldScrollInspectorToFocus (targeting decision is stable)", () => {
    it("warrants a scroll for hero-cta and profile-cover, never null", () => {
      expect(shouldScrollInspectorToFocus("hero-cta")).toBe(true);
      expect(shouldScrollInspectorToFocus("profile-cover")).toBe(true);
      expect(shouldScrollInspectorToFocus(null)).toBe(false);
    });
  });

  describe("inspector focus signal", () => {
    it("delivers a hero-cta request exactly once and unsubscribes", () => {
      const received: string[] = [];
      const off = subscribeInspectorFocus((t) => received.push(t));
      requestInspectorFocus("hero-cta");
      expect(received).toEqual(["hero-cta"]);
      off();
      requestInspectorFocus("hero-cta");
      expect(received).toEqual(["hero-cta"]);
    });
  });

  describe("canonical config integrity", () => {
    const config = createDemoConfig();
    const heroBlock = { ...createBlock("hero"), id: "hero-cta-test" };
    const withHero = { ...config, blocks: [heroBlock, ...config.blocks] };
    const initialState = createInitialState(withHero);

    it("selecting the same hero (redundant) does not mutate config/history", () => {
      const s1 = templateReducer(initialState, { type: "selectBlock", id: "hero-cta-test" });
      expect(s1.selectedBlockId).toBe("hero-cta-test");
      expect(s1.config).toBe(withHero);
      expect(s1.past.length).toBe(0);
      expect(s1.dirty).toBe(false);

      const s2 = templateReducer(s1, { type: "selectBlock", id: "hero-cta-test" });
      expect(s2.selectedBlockId).toBe("hero-cta-test");
      expect(s2.config).toBe(withHero);
      expect(s2.past.length).toBe(0);
      expect(s2.dirty).toBe(false);
    });

    it("editing primary CTA label only changes that field", () => {
      const beforeCta = initialState.config.blocks[0]!.content.primaryCTA!;
      const beforeSecondary = initialState.config.blocks[0]!.content.secondaryCTA;

      const state = templateReducer(initialState, {
        type: "patchBlockField",
        id: "hero-cta-test",
        path: "content.primaryCTA.label",
        value: "New Label",
      });

      const cta = state.config.blocks[0]!.content.primaryCTA!;
      expect(cta.label).toBe("New Label");
      expect(cta.url).toBe(beforeCta.url);
      expect(cta.icon).toBe(beforeCta.icon);
      expect(state.config.blocks[0]!.content.secondaryCTA).toEqual(beforeSecondary);
    });

    it("editing primary CTA url preserves label and icon", () => {
      const beforeCta = initialState.config.blocks[0]!.content.primaryCTA!;

      const state = templateReducer(initialState, {
        type: "patchBlockField",
        id: "hero-cta-test",
        path: "content.primaryCTA.url",
        value: "https://example.com/new",
      });

      const cta = state.config.blocks[0]!.content.primaryCTA!;
      expect(cta.url).toBe("https://example.com/new");
      expect(cta.label).toBe(beforeCta.label);
      expect(cta.icon).toBe(beforeCta.icon);
    });

    it("editing primary CTA icon only changes the icon", () => {
      const beforeCta = initialState.config.blocks[0]!.content.primaryCTA!;

      const state = templateReducer(initialState, {
        type: "patchBlockField",
        id: "hero-cta-test",
        path: "content.primaryCTA.icon",
        value: "globe",
      });

      const cta = state.config.blocks[0]!.content.primaryCTA!;
      expect(cta.icon).toBe("globe");
      expect(cta.label).toBe(beforeCta.label);
      expect(cta.url).toBe(beforeCta.url);
    });
  });
});
