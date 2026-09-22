import { describe, expect, it } from "vitest";
import { createInitialState, templateReducer } from "../state/templateReducer";
import { createDemoConfig } from "../templates/definitions";

describe("optional custom avatar visibility", () => {
  it("preserves the asset while hide, undo and redo change only visibility", () => {
    const config = {
      ...createDemoConfig(),
      blocks: [],
      profile: {
        ...createDemoConfig().profile,
        avatarUrl: "https://example.com/avatar.jpg",
      },
    };
    const initial = createInitialState(config);
    const hidden = templateReducer(initial, {
      type: "patch",
      path: "profile.showAvatar",
      value: false,
    });
    const undone = templateReducer(hidden, { type: "undo" });
    const redone = templateReducer(undone, { type: "redo" });

    expect(hidden.config.profile.showAvatar).toBe(false);
    expect(undone.config.profile.showAvatar).toBeUndefined();
    expect(redone.config.profile.showAvatar).toBe(false);
    expect(redone.config.profile.avatarUrl).toBe("https://example.com/avatar.jpg");
    expect(redone.past.length).toBe(1);
    expect(redone.future.length).toBe(0);
  });
});
