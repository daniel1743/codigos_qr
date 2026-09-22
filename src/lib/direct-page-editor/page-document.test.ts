import { describe, expect, it } from "vitest";
import { createMagicServicesConfig } from "../../components/direct-page-editor/magicServicesConfig";
import {
  canonicalFromPageDocument,
  cloneCollectionItem,
  pageDocumentFromCanonical,
  PAGE_DOCUMENT_ADAPTER_SCOPE,
  reorderPageDocumentBlock,
} from "./page-document";

describe("PageDocumentV1 pilot adapter", () => {
  it("round-trips the Business/Services pilot with stable block and item ids", () => {
    const config = createMagicServicesConfig("Pilot Services");
    const document = pageDocumentFromCanonical(config);
    const restored = canonicalFromPageDocument(document, config);

    expect(document.version).toBe(1);
    expect(document.blocks.map((block) => block.id)).toEqual(
      config.blocks.map((block) => block.id),
    );
    expect(restored.blocks.find((block) => block.id === "magic-services")?.type).toBe("services");
    expect(
      restored.blocks
        .find((block) => block.id === "magic-services")
        ?.content.items?.map((item) => item.id),
    ).toEqual(["magic-service-1", "magic-service-2", "magic-service-3"]);
  });

  it("reorders without changing identity and deep-clones collection items", () => {
    const document = pageDocumentFromCanonical(createMagicServicesConfig("Pilot Services"));
    const moved = reorderPageDocumentBlock(document, "magic-services", -1);
    expect(moved.blocks.map((block) => block.id)).toContain("magic-services");

    const services = document.blocks.find((block) => block.id === "magic-services");
    const item = services?.content.items?.[0];
    expect(item).toBeTruthy();
    const clone = cloneCollectionItem(item!, "magic-service-copy");
    expect(clone.id).toBe("magic-service-copy");
    expect(clone).not.toBe(item);
    expect(clone.title).toBe(item?.title);
  });

  it("preserves device visibility and left alignment across the adapter", () => {
    const config = createMagicServicesConfig("Pilot Services");
    config.blocks[0]!.visibility = { desktop: true, tablet: false, mobile: true };
    config.blocks[0]!.layout.align = "left";
    const document = pageDocumentFromCanonical(config);
    const restored = canonicalFromPageDocument(document, config);

    expect(document.blocks[0]!.visibility).toEqual({ desktop: true, tablet: false, mobile: true });
    expect(restored.blocks[0]!.visibility).toEqual({ desktop: true, tablet: false, mobile: true });
    expect(restored.blocks[0]!.layout.align).toBe("left");
    expect(PAGE_DOCUMENT_ADAPTER_SCOPE.collectionToServices).toBe("PILOT_ONLY");
  });
});
