import { describe, expect, it } from "vitest";
import { validateTemplate } from "../../engine/TemplateValidator";
import {
  createPhase4SelectionQaConfig,
  PHASE4_QA_BLOCK_IDS,
} from "../powerEditorPhase4SelectionQaFixture";

describe("Phase 4 selection QA fixture", () => {
  const config = createPhase4SelectionQaConfig();

  it("is a valid canonical template", () => {
    const result = validateTemplate(config);
    expect(result.valid).toBe(true);
  });

  it("contains the expected number of distinct blocks", () => {
    expect(config.blocks.length).toBe(PHASE4_QA_BLOCK_IDS.length);
    expect(config.blocks.length).toBeGreaterThanOrEqual(6);
  });

  it("uses only unique block ids", () => {
    const ids = config.blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exposes the stable QA identities", () => {
    for (const id of PHASE4_QA_BLOCK_IDS) {
      expect(config.blocks.some((b) => b.id === id)).toBe(true);
    }
  });

  it("marks every block visible on all breakpoints", () => {
    for (const block of config.blocks) {
      expect(block.visibility).toEqual({ desktop: true, tablet: true, mobile: true });
    }
  });
});
