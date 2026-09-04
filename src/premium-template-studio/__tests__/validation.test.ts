import { describe, it, expect } from "vitest";
import { validateTemplate, parseTemplateJson } from "../engine/TemplateValidator";
import { createDemoConfig } from "../templates/definitions";

describe("validateTemplate", () => {
  const validConfig = createDemoConfig();

  it("accepts valid config", () => {
    const result = validateTemplate(validConfig);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("rejects non-object input", () => {
    const result = validateTemplate("not an object");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.level === "error")).toBe(true);
  });

  it("detects missing schemaVersion", () => {
    const { schemaVersion: _schemaVersion, ...config } = validConfig;
    const result = validateTemplate(config);
    expect(result.issues.some((i) => i.path === "schemaVersion")).toBe(true);
  });

  it("rejects future schema versions", () => {
    const config = { ...validConfig, schemaVersion: 999 };
    const result = validateTemplate(config);
    expect(result.valid).toBe(false);
  });

  it("detects duplicate block IDs", () => {
    const config = {
      ...validConfig,
      blocks: [validConfig.blocks[0], { ...validConfig.blocks[0] }],
    };
    const result = validateTemplate(config);
    expect(result.issues.some((i) => i.message.includes("Duplicate"))).toBe(true);
  });

  it("detects unknown block types", () => {
    const config = {
      ...validConfig,
      blocks: [{ ...validConfig.blocks[0], type: "unknownType" }],
    };
    const result = validateTemplate(config);
    expect(result.issues.some((i) => i.message.includes("Unknown block type"))).toBe(true);
  });

  it("validates URLs in block content", () => {
    const firstBlock = validConfig.blocks[0]!;
    const config = {
      ...validConfig,
      blocks: [
        {
          ...firstBlock,
          content: { ...firstBlock.content, url: "javascript:alert('xss')" },
        },
      ],
    };
    const result = validateTemplate(config);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("parseTemplateJson", () => {
  const validConfig = createDemoConfig();
  const validJson = JSON.stringify(validConfig);

  it("parses valid JSON", () => {
    const result = parseTemplateJson(validJson);
    expect(result.config).toBeDefined();
    expect(result.result.valid).toBe(true);
  });

  it("rejects malformed JSON", () => {
    const result = parseTemplateJson("{ invalid json");
    expect(result.config).toBeUndefined();
    expect(result.result.valid).toBe(false);
  });

  it("round-trip preserves schemaVersion", () => {
    const json = JSON.stringify(validConfig);
    const result = parseTemplateJson(json);
    expect(result.config?.schemaVersion).toBe(validConfig.schemaVersion);
  });

  it("returns config only if valid", () => {
    const invalid = JSON.stringify({ notAConfig: true });
    const result = parseTemplateJson(invalid);
    expect(result.config).toBeUndefined();
    expect(result.result.valid).toBe(false);
  });
});
