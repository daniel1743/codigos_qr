import { describe, expect, it } from "vitest";
import { createBlock } from "../constants/blockDefinitions";
import { createDemoConfig } from "../templates/definitions";
import { createInitialState, templateReducer } from "../state/templateReducer";

describe("Phase 5 button and CTA independence", () => {
  it("keeps Button Group item destinations and styles isolated", () => {
    const block = createBlock("buttonGroup");
    const items = block.content.items ?? [];
    const base = createInitialState({ ...createDemoConfig(), blocks: [{ ...block, id: "buttons" }] });
    const first = items[0]!;
    const second = items[1]!;
    const next = templateReducer(base, {
      type: "patchBlockField",
      id: "buttons",
      path: "content.items",
      value: items.map((item) =>
        item.id === first.id
          ? {
              ...item,
              url: "https://first.example",
              ctaStyle: { backgroundColor: "#111111", textColor: "#ffffff" },
            }
          : item,
      ),
    });
    const result = next.config.blocks[0]!.content.items!;
    expect(result.find((item) => item.id === first.id)?.url).toBe("https://first.example");
    expect(result.find((item) => item.id === first.id)?.ctaStyle?.backgroundColor).toBe("#111111");
    expect(result.find((item) => item.id === second.id)?.url).not.toBe("https://first.example");
    expect(result.find((item) => item.id === second.id)?.ctaStyle).toBeUndefined();
  });
});
