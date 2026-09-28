import { describe, expect, it } from "vitest";
import { createPageStarterConfig } from "../../components/power-editor/pageStarterConfig";
import { createMagicServicesDocument } from "../../components/direct-page-editor/magicServicesConfig";
import { createCanonicalPageEnvelope, createDirectPageEnvelope } from "../../lib/canonical-page";
import { serializeMagicEditorState } from "./magic-document";
import { createPageEditorSession, detectDocumentKind } from "./document-session";

const magic = serializeMagicEditorState({
  templateId: "bio",
  doc: {
    blocks: [{ key: "hero-unchanged", type: "hero" }],
    texts: { "hero-unchanged.title": "Original" },
    textStyles: {},
    props: {},
    removed: {},
  },
});
const canonicalConfig = createPageStarterConfig("Canónica", "landing");
const canonical = createCanonicalPageEnvelope(canonicalConfig);
const direct = createDirectPageEnvelope(createMagicServicesDocument("Direct"));

describe("Bridge 1 document detection and safe read", () => {
  it("classifies valid Magic, canonical, Direct, null and unknown documents", () => {
    expect(detectDocumentKind(magic)).toBe("MAGIC_V1");
    expect(detectDocumentKind(canonical)).toBe("CANONICAL_V1");
    expect(detectDocumentKind(direct)).toBe("DIRECT");
    expect(detectDocumentKind(null)).toBe("NULL");
    expect(detectDocumentKind(undefined)).toBe("UNKNOWN");
    expect(detectDocumentKind({ schemaVersion: 1, editorConfig: {} })).toBe("UNKNOWN");
    expect(detectDocumentKind({ documentType: "magic-page", version: 1 })).toBe("UNKNOWN");
    expect(detectDocumentKind({ ...magic, props: { hero: { zoom: 2 } } })).toBe("UNKNOWN");
  });

  it("keeps Magic identity and payload unchanged through a no-edit read", () => {
    const before = JSON.stringify(magic);
    const session = createPageEditorSession(magic, "Ignored", "landing");
    expect(session.kind).toBe("MAGIC_V1");
    expect(session.canWrite).toBe(true);
    if (session.kind === "MAGIC_V1") {
      expect(session.document.doc.blocks[0]?.key).toBe("hero-unchanged");
      expect(session.document.doc.texts["hero-unchanged.title"]).toBe("Original");
    }
    expect(JSON.stringify(magic)).toBe(before);
  });

  it("opens canonical by reference with writes enabled and no conversion", () => {
    const before = JSON.stringify(canonical);
    const session = createPageEditorSession(canonical, "Ignored", "landing");
    expect(session.kind).toBe("CANONICAL_V1");
    expect(session.canWrite).toBe(true);
    if (session.kind === "CANONICAL_V1") {
      expect(session.config).toBe(canonicalConfig);
      expect(session.config.blocks.map((block) => block.id)).toEqual(
        canonicalConfig.blocks.map((block) => block.id),
      );
    }
    expect(JSON.stringify(canonical)).toBe(before);
  });

  it("creates an editable in-memory canonical starter for null", () => {
    const session = createPageEditorSession(null, "Página nueva", "catalog");
    expect(session.kind).toBe("NULL");
    expect(session.canWrite).toBe(true);
    if (session.kind === "NULL") {
      expect(session.config.profile.name).toBe("Página nueva");
      expect(session.config.templateDefinitionId).toBe("catalog-default-v1");
    }
  });

  it("never makes Direct or unknown documents writable", () => {
    expect(createPageEditorSession(direct, "Direct", "services")).toEqual({
      kind: "DIRECT",
      canWrite: false,
    });
    expect(createPageEditorSession({ unexpected: "payload" }, "Unknown", "landing")).toEqual({
      kind: "UNKNOWN",
      canWrite: false,
    });
  });
});
