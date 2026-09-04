import { describe, it, expect } from "vitest";
import { templateReducer, createInitialState } from "../state/templateReducer";
import { createDemoConfig } from "../templates/definitions";
import type { BioTemplateConfig } from "../types";

describe("templateReducer", () => {
  const initialConfig = createDemoConfig();
  const initialState = createInitialState(initialConfig);

  it("creates initial state correctly", () => {
    expect(initialState.config).toEqual(initialConfig);
    expect(initialState.past).toEqual([]);
    expect(initialState.future).toEqual([]);
    expect(initialState.selectedBlockId).toBeNull();
    expect(initialState.dirty).toBe(false);
  });

  it("undo works after an edit", () => {
    const state1 = templateReducer(initialState, {
      type: "patch",
      path: "metadata.name",
      value: "New Name",
    });
    expect(state1.config.metadata.name).toBe("New Name");
    expect(state1.past.length).toBe(1);

    const state2 = templateReducer(state1, { type: "undo" });
    expect(state2.config.metadata.name).toEqual(initialConfig.metadata.name);
    expect(state2.past.length).toBe(0);
    expect(state2.future.length).toBe(1);
  });

  it("redo works after undo", () => {
    const state1 = templateReducer(initialState, {
      type: "patch",
      path: "metadata.name",
      value: "New Name",
    });
    const state2 = templateReducer(state1, { type: "undo" });
    const state3 = templateReducer(state2, { type: "redo" });
    expect(state3.config.metadata.name).toBe("New Name");
  });

  it("addBlock generates fresh ID and selects it", () => {
    const state1 = templateReducer(initialState, { type: "addBlock", blockType: "text" });
    expect(state1.config.blocks.length).toBeGreaterThan(initialState.config.blocks.length);
    const newBlock = state1.config.blocks[state1.config.blocks.length - 1];
    if (!newBlock) throw new Error("Expected addBlock to create a block");
    expect(newBlock.id).toBeDefined();
    expect(state1.selectedBlockId).toBe(newBlock.id);
  });

  it("deleteBlock removes block and clears selection if was selected", () => {
    const state1 = templateReducer(initialState, { type: "addBlock", blockType: "text" });
    const blockId = state1.selectedBlockId;
    const state2 = templateReducer(state1, { type: "deleteBlock", id: blockId! });
    expect(state2.config.blocks.find((b) => b.id === blockId)).toBeUndefined();
    expect(state2.selectedBlockId).toBeNull();
  });

  it("duplicateBlock creates copy with fresh ID", () => {
    const state1 = templateReducer(initialState, { type: "addBlock", blockType: "text" });
    const originalBlockId = state1.selectedBlockId;
    const state2 = templateReducer(state1, { type: "duplicateBlock", id: originalBlockId! });
    const blocks = state2.config.blocks;
    const original = blocks.find((b) => b.id === originalBlockId);
    const copy = blocks.find((b) => b.id === state2.selectedBlockId);
    expect(copy).toBeDefined();
    expect(copy!.id).not.toBe(originalBlockId);
    expect(copy!.type).toBe(original!.type);
  });

  it("history limit prevents unbounded growth", () => {
    let state = initialState;
    for (let i = 0; i < 100; i++) {
      state = templateReducer(state, {
        type: "patch",
        path: "metadata.name",
        value: `name-${i}`,
      });
    }
    expect(state.past.length).toBeLessThanOrEqual(60);
  });

  it("future clears after new edit following undo", () => {
    let state = templateReducer(initialState, {
      type: "patch",
      path: "metadata.name",
      value: "First",
    });
    state = templateReducer(state, {
      type: "patch",
      path: "metadata.name",
      value: "Second",
    });
    state = templateReducer(state, { type: "undo" });
    expect(state.future.length).toBe(1);
    state = templateReducer(state, {
      type: "patch",
      path: "metadata.name",
      value: "Third",
    });
    expect(state.future.length).toBe(0);
    expect(state.config.metadata.name).toBe("Third");
  });

  it("deleteBlock preserves selection if deleted block wasn't selected", () => {
    const state1 = templateReducer(initialState, { type: "addBlock", blockType: "text" });
    const blockToDelete = state1.config.blocks[0];
    if (!blockToDelete) throw new Error("Expected initial config to contain a block");
    const state2 = templateReducer(state1, { type: "deleteBlock", id: blockToDelete.id });
    expect(state2.selectedBlockId).toBe(state1.selectedBlockId);
  });

  it("replaceConfig with resetHistory clears history", () => {
    let state = templateReducer(initialState, {
      type: "patch",
      path: "metadata.name",
      value: "Modified",
    });
    expect(state.past.length).toBeGreaterThan(0);

    const newConfig = { ...initialConfig, metadata: { ...initialConfig.metadata } };
    state = templateReducer(state, {
      type: "replaceConfig",
      config: newConfig,
      resetHistory: true,
    });
    expect(state.past.length).toBe(0);
    expect(state.future.length).toBe(0);
    expect(state.selectedBlockId).toBeNull();
  });
});
