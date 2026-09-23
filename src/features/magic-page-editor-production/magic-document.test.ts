import { describe, expect, it } from "vitest";
import { hydrateMagicEditorState, serializeMagicEditorState, validateMagicPageDocumentV1 } from "./magic-document";

const state = {
  templateId: "bio" as const,
  doc: {
    blocks: [{ key: "hero", type: "hero" as const }],
    texts: { "hero.name": "Marina QA" },
    textStyles: { "hero.name": { bold: true } },
    props: { page: { bg: "crema" } },
    removed: {},
  },
};

describe("MagicPageDocumentV1", () => {
  it("serializes and hydrates the editor state without legacy conversion", () => {
    const document = serializeMagicEditorState(state);
    expect(validateMagicPageDocumentV1(document)).toEqual(document);
    expect(hydrateMagicEditorState(document)).toEqual(state);
  });

  it("rejects documents from another editor contract", () => {
    expect(() => validateMagicPageDocumentV1({ documentType: "page-document", version: 1 })).toThrow();
  });
});
