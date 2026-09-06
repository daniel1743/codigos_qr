import { describe, expect, it } from "vitest";
import { createCanonicalPageEnvelope } from "../../../lib/canonical-page/contract";
import { createDemoConfig } from "../../../premium-template-studio/templates/definitions";
import { resolveCanonicalEditorConfig } from "../canonicalRenderBridge";

describe("PublicProfileView canonical render bridge", () => {
  it("selects a valid canonical config when template_id is absent", () => {
    const editorConfig = createDemoConfig();

    expect(resolveCanonicalEditorConfig(createCanonicalPageEnvelope(editorConfig))).toBe(
      editorConfig,
    );
  });

  it("passes every canonical block and advanced field through unchanged", () => {
    const editorConfig = createDemoConfig();
    editorConfig.blocks[0]!.layout.floating = {
      enabled: true,
      anchor: "bottom-right",
      offset: 24,
    };
    const envelope = createCanonicalPageEnvelope(editorConfig);

    expect(resolveCanonicalEditorConfig(envelope)).toBe(editorConfig);
    expect(resolveCanonicalEditorConfig(envelope)?.blocks).toBe(editorConfig.blocks);
    expect(resolveCanonicalEditorConfig(envelope)?.blocks[0]?.layout.floating).toEqual(
      editorConfig.blocks[0]?.layout.floating,
    );
  });

  it("returns null for missing or invalid canonical data so legacy paths can continue", () => {
    expect(resolveCanonicalEditorConfig(undefined)).toBeNull();
    expect(
      resolveCanonicalEditorConfig({ schemaVersion: 1, editorConfig: { blocks: [] } }),
    ).toBeNull();
  });
});
