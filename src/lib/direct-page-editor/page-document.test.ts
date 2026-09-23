import { describe, expect, it } from "vitest";
import { createMagicServicesDocument } from "../../components/direct-page-editor/magicServicesConfig";
import {
  cloneCollectionItem,
  isPageDocumentV1,
  PAGE_DOCUMENT_ADAPTER_SCOPE,
  pageDocumentFromLegacy,
  reorderPageDocumentBlock,
  validatePageDocumentV1,
} from "./page-document";

describe("PageDocumentV1 direct contract", () => {
  it("creates a direct Business/Services document with stable ids", () => {
    const document = createMagicServicesDocument("Pilot Services");
    const services = document.blocks.find((block) => block.id === "magic-services");

    expect(isPageDocumentV1(document)).toBe(true);
    expect(document.documentType).toBe("direct-page");
    expect(services?.type).toBe("collection");
    expect(services?.content.items?.map((item) => item.id)).toEqual([
      "magic-service-1",
      "magic-service-2",
      "magic-service-3",
    ]);
  });

  it("reorders blocks without changing identity and deep-clones items", () => {
    const document = createMagicServicesDocument("Pilot Services");
    const moved = reorderPageDocumentBlock(document, "magic-services", -1);
    const item = document.blocks.find((block) => block.id === "magic-services")?.content.items?.[0];
    const clone = cloneCollectionItem(item!, "magic-service-copy");

    expect(moved.blocks.map((block) => block.id)).toContain("magic-services");
    expect(clone.id).toBe("magic-service-copy");
    expect(clone).not.toBe(item);
    expect(clone.cta).not.toBe(item?.cta);
  });

  it("preserves visibility and left alignment when migrating a legacy document", () => {
    const legacy = {
      editorConfig: {
        theme: { colors: { background: "#fff" } },
        profile: { name: "Pilot Services" },
        blocks: [
          {
            id: "legacy-text",
            type: "text",
            layout: { align: "left" },
            visibility: { desktop: true, tablet: false, mobile: true },
            content: { title: "Texto" },
          },
        ],
        settings: { showBranding: true },
      },
    };
    const document = pageDocumentFromLegacy(legacy, "Pilot Services");
    const migrated = document.blocks.find((block) => block.id === "legacy-text");

    expect(migrated?.visibility).toEqual({ desktop: true, tablet: false, mobile: true });
    expect(migrated?.layout.alignment).toBe("left");
    expect(PAGE_DOCUMENT_ADAPTER_SCOPE.collectionToServices).toBe("PILOT_ONLY");
  });

  it("rejects duplicate block and item ids", () => {
    const document = createMagicServicesDocument("Pilot Services");
    const duplicate = structuredClone(document);
    duplicate.blocks.push(structuredClone(duplicate.blocks[0]!));
    duplicate.blocks[1]!.id = duplicate.blocks[0]!.id;
    const collection = duplicate.blocks.find((block) => block.type === "collection")!;
    collection.content.items = [
      collection.content.items![0]!,
      structuredClone(collection.content.items![0]!),
    ];

    const result = validatePageDocumentV1(duplicate);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("duplicate block id"))).toBe(true);
    expect(result.errors.some((error) => error.includes("duplicate item id"))).toBe(true);
  });
});
