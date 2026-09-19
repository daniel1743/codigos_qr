import { describe, expect, it } from "vitest";
import { createBlock } from "../constants/blockDefinitions";
import { moveCollectionItem } from "../components/inspector/CollectionItemControls";
import { createDemoConfig } from "../templates/definitions";
import { createInitialState, templateReducer } from "../state/templateReducer";
import type { BlockType, TemplateBlock } from "../types";

const COLLECTION_CASES = [
  ["links", "items"],
  ["buttonGroup", "items"],
  ["social", "socials"],
  ["gallery", "images"],
  ["portfolio", "items"],
  ["stats", "items"],
  ["services", "items"],
  ["testimonials", "items"],
  ["pricing", "items"],
  ["faq", "items"],
  ["timeline", "items"],
  ["floatingActions", "items"],
  ["productGrid", "products"],
  ["events", "items"],
  ["carousel", "items"],
  ["tabs", "items"],
  ["bottomNav", "items"],
] as const;

function collectionBlock(type: BlockType, field: string): TemplateBlock {
  const block = createBlock(type);
  const source = (block.content as Record<string, unknown>)[field];
  const items = Array.isArray(source) ? source : [];
  return {
    ...block,
    id: "lifecycle-" + type,
    content: { ...block.content, [field]: items.slice(0, 3) },
  };
}

describe("Phase 2 shared collection lifecycle", () => {
  it("moves items without changing IDs or sibling values", () => {
    const items = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ];

    expect(moveCollectionItem(items, 0, -1)).toEqual(items);
    expect(moveCollectionItem(items, 2, 1)).toEqual(items);
    expect(moveCollectionItem(items, 0, 1)).toEqual([items[1], items[0], items[2]]);
    expect(moveCollectionItem(items, 1, 1)).toEqual([items[0], items[2], items[1]]);
  });

  it.each(COLLECTION_CASES)(
    "%s supports add, reorder, atomic delete, undo and redo",
    (type, field) => {
      const block = collectionBlock(type, field);
      const base = { ...createDemoConfig(), blocks: [block] };
      const initial = createInitialState(base);
      const original = ((block.content as Record<string, unknown>)[field] as unknown[]) ?? [];
      const added = [...original, { id: "new-item", label: "New item" }];
      const path = "content." + field;

      const afterAdd = templateReducer(initial, {
        type: "patchBlockField",
        id: block.id,
        path,
        value: added,
      });
      const afterReorder = templateReducer(afterAdd, {
        type: "patchBlockField",
        id: block.id,
        path,
        value: moveCollectionItem(added, added.length - 1, -1),
      });
      const reordered = ((afterReorder.config.blocks[0]?.content as Record<string, unknown>)[field] ??
        []) as unknown[];
      const afterDelete = templateReducer(afterReorder, {
        type: "patchBlockField",
        id: block.id,
        path,
        value: reordered.slice(0, -1),
      });

      expect(((afterAdd.config.blocks[0]?.content as Record<string, unknown>)[field] ?? []) as unknown[]).toHaveLength(
        added.length,
      );
      expect(((afterDelete.config.blocks[0]?.content as Record<string, unknown>)[field] ?? []) as unknown[]).toHaveLength(
        reordered.length - 1,
      );

      const undoDelete = templateReducer(afterDelete, { type: "undo" });
      expect(((undoDelete.config.blocks[0]?.content as Record<string, unknown>)[field] ?? []) as unknown[]).toEqual(
        reordered,
      );
      const redoDelete = templateReducer(undoDelete, { type: "redo" });
      expect(((redoDelete.config.blocks[0]?.content as Record<string, unknown>)[field] ?? []) as unknown[]).toHaveLength(
        reordered.length - 1,
      );

      const reloaded = JSON.parse(JSON.stringify(undoDelete.config)) as typeof undoDelete.config;
      expect(reloaded.blocks[0]?.content).toEqual(undoDelete.config.blocks[0]?.content);
    },
  );
});
