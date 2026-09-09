import { describe, expect, it } from "vitest";
import { createInitialState, templateReducer } from "../state/templateReducer";
import { createDemoConfig } from "../templates/definitions";
import {
  requestInspectorFocus,
  shouldScrollInspectorToFocus,
  subscribeInspectorFocus,
} from "../components/inspector/inspectorFocus";

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
