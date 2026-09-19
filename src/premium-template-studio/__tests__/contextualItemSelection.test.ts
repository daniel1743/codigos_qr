import { describe, expect, it } from "vitest";
import { collectionItemKey, collectionTarget } from "../components/inspector/inspectorFocus";

describe("Phase 3 contextual item selection", () => {
  it("creates stable contextual targets from semantic IDs, not array positions", () => {
    const first = collectionTarget("block-1", "portfolio", "item-a", "image");
    const afterReorder = collectionTarget("block-1", "portfolio", "item-a", "image");

    expect(first).toBe(afterReorder);
    expect(first).toContain("portfolio");
    expect(first).toContain("item-a");
    expect(collectionItemKey("block-1", "item-a")).toBe("block-1:item-a");
  });

  it("keeps item and child authority distinct while preserving the parent block", () => {
    expect(collectionTarget("block-1", "buttonGroup", "button-1", "button")).not.toBe(
      collectionTarget("block-1", "buttonGroup", "button-2", "button"),
    );
    expect(collectionTarget("block-1", "services", "service-1", "image")).not.toBe(
      collectionTarget("block-1", "services", "service-1", "cta"),
    );
  });

  it.each([
    "pricing",
    "faq",
    "timeline",
    "events",
    "tabs",
    "social",
    "floating-actions",
    "bottom-nav",
  ])("has a stable target namespace for %s", (collection) => {
    const target = collectionTarget("block-remaining", collection, "item-2");
    expect(target).toMatch(/^collection-/);
    expect(target).toContain(encodeURIComponent(collection));
    expect(target).toContain(encodeURIComponent("item-2"));
  });
});
