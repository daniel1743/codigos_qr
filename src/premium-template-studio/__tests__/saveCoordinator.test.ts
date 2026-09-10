import { describe, expect, it } from "vitest";
import { createInitialState, templateReducer } from "../state/templateReducer";
import { createDemoConfig } from "../templates/definitions";

/**
 * Save-coordinator revision semantics (Autosave V1). These tests exercise the
 * reducer-level "local revision + revision-aware markSaved" contract that the
 * StudioProvider coordinator relies on for stale-response and out-of-order
 * protection.
 */
describe("Autosave / Save Coordinator — revision + dirty state (Phase Autosave V1)", () => {
  const config = createDemoConfig();

  it("hydration starts Saved / not dirty with revision 0", () => {
    const state = createInitialState(config);
    expect(state.dirty).toBe(false);
    expect(state.revision).toBe(0);
  });

  it("first document mutation increments revision and marks dirty", () => {
    const state = createInitialState(config);
    const next = templateReducer(state, {
      type: "patch",
      path: "theme.colors.primary",
      value: "#ff0000",
    });
    expect(next.dirty).toBe(true);
    expect(next.revision).toBe(1);
  });

  it("markSaved for the current revision clears dirty", () => {
    let state = createInitialState(config);
    state = templateReducer(state, { type: "patch", path: "theme.colors.primary", value: "#ff0000" });
    state = templateReducer(state, { type: "markSaved", revision: 1 });
    expect(state.dirty).toBe(false);
  });

  it("markSaved for a stale revision does not clear dirty when newer edits exist", () => {
    let state = createInitialState(config);
    state = templateReducer(state, { type: "patch", path: "theme.colors.primary", value: "#ff0000" }); // rev 1
    state = templateReducer(state, { type: "patch", path: "theme.colors.accent", value: "#00ff00" }); // rev 2
    state = templateReducer(state, { type: "markSaved", revision: 1 }); // stale rev-1 save completes late
    expect(state.dirty).toBe(true); // rev 2 still unsaved
    expect(state.revision).toBe(2);
  });

  it("markSaved with no revision (legacy) clears dirty", () => {
    let state = createInitialState(config);
    state = templateReducer(state, { type: "patch", path: "theme.colors.primary", value: "#ff0000" });
    state = templateReducer(state, { type: "markSaved" });
    expect(state.dirty).toBe(false);
  });

  it("undo and redo are document mutations that increment revision and dirty", () => {
    let state = createInitialState(config);
    state = templateReducer(state, { type: "patch", path: "theme.colors.primary", value: "#ff0000" }); // rev 1
    state = templateReducer(state, { type: "undo" }); // rev 2
    expect(state.dirty).toBe(true);
    expect(state.revision).toBe(2);
    state = templateReducer(state, { type: "redo" }); // rev 3
    expect(state.revision).toBe(3);
  });

  it("replaceConfig resetHistory resets revision and dirty (document switch)", () => {
    let state = createInitialState(config);
    state = templateReducer(state, { type: "patch", path: "theme.colors.primary", value: "#ff0000" }); // rev 1
    state = templateReducer(state, {
      type: "replaceConfig",
      config: createDemoConfig(),
      resetHistory: true,
    });
    expect(state.revision).toBe(0);
    expect(state.dirty).toBe(false);
  });

  it("selectBlock does not mutate the document (no revision / dirty change)", () => {
    const state = createInitialState(config);
    const next = templateReducer(state, { type: "selectBlock", id: null });
    expect(next.revision).toBe(0);
    expect(next.dirty).toBe(false);
  });
});
