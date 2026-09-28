import { describe, test, expect } from "vitest";
import { createCanonicalSemanticTarget } from "../canonical-adapter";
import { createMagicSemanticTarget } from "../magic-adapter";
import type { BioTemplateConfig } from "../../../../premium-template-studio/types";

const mockConfig: BioTemplateConfig = {
  schemaVersion: 1,
  pageInstanceId: "test-page",
  templateDefinitionId: "test-template",
  profile: { name: "Test" },
  metadata: { name: "Test Page" },
  globalStyles: {},
  blocks: [
    {
      id: "hero-1",
      type: "hero",
      contracts: {
        image: { optional: false, protected: true },
        title: { optional: true, protected: false },
      },
    },
    {
      id: "collection-1",
      type: "collection",
    },
  ],
};

describe("Bridge 2 - Semantic Adapters", () => {
  describe("Canonical Adapter", () => {
    test("maps canonical hero to hero target", () => {
      const target = createCanonicalSemanticTarget(mockConfig, "hero-1", "Hero");
      expect(target.documentKind).toBe("canonical");
      expect(target.targetKind).toBe("hero");
      expect(target.readOnly).toBe(false);
      expect(target.capabilities.canChangeLayout).toBe(true);
    });

    test("maps canonical avatar/image to media target", () => {
      const target = createCanonicalSemanticTarget(mockConfig, "hero-1:hero-image", "Avatar");
      expect(target.targetKind).toBe("media");
      expect(target.capabilities.canEditMedia).toBe(true);
      expect(target.capabilities.canRemove).toBe(false); // protected
    });

    test("maps canonical CTA to CTA target", () => {
      const target = createCanonicalSemanticTarget(mockConfig, "hero-1:hero-cta", "CTA");
      expect(target.targetKind).toBe("cta-primary");
      expect(target.capabilities.canEditCTA).toBe(true);
    });

    test("maps canonical card/item to item target", () => {
      const target = createCanonicalSemanticTarget(mockConfig, "collection-1:items:item-1", "Card");
      expect(target.targetKind).toBe("collection-item");
      expect(target.capabilities.canRemove).toBe(true);
    });

    test("maps optional canonical element to report hide/remove", () => {
      const target = createCanonicalSemanticTarget(mockConfig, "hero-1:hero-title", "Title");
      expect(target.capabilities.canHide).toBe(true);
      expect(target.capabilities.canRemove).toBe(true);
    });
  });

  describe("Magic Adapter", () => {
    test("Magic selection normalizes without regression", () => {
      const magicSel = { id: "hero-123", kind: "hero", label: "Portada" };
      const target = createMagicSemanticTarget(magicSel);
      expect(target.documentKind).toBe("magic");
      expect(target.targetKind).toBe("hero");
      expect(target.readOnly).toBe(false);
      expect(target.capabilities.canChangeHeroVariant).toBe(true);
    });

    test("Magic media normalization", () => {
      const magicSel = { id: "img-1", kind: "image", label: "Imagen" };
      const target = createMagicSemanticTarget(magicSel);
      expect(target.targetKind).toBe("media");
      expect(target.capabilities.canCrop).toBe(true);
    });
  });
});
