import { describe, expect, it } from "vitest";
import {
  generatePowerEditorCandidates,
  resolveButtons,
  resolveLayout,
  resolvePowerEditorCapabilities,
  type RecipeSemanticsV2,
} from "../power-editor";
import { PLAYGROUND_CASES } from "../power-editor/playground-cases";

const NOW = "2026-01-01T00:00:00.000Z";
const capabilities = resolvePowerEditorCapabilities();
const source = PLAYGROUND_CASES[0]!.intent;
const baseCandidate = generatePowerEditorCandidates(source, {
  content: PLAYGROUND_CASES[0]!.content,
  count: 1,
  now: NOW,
})[0]!;
const recipe = baseCandidate.recipe.source_recipe;
const baseSemantics = baseCandidate.recipe.semantics;

function semantics(
  family: RecipeSemanticsV2["family"],
  primary_goal: RecipeSemanticsV2["primary_goal"],
  overrides: Partial<RecipeSemanticsV2> = {},
): RecipeSemanticsV2 {
  return {
    ...baseSemantics,
    family,
    primary_goal,
    ...overrides,
  };
}

describe("Engine V2 visual composition variety", () => {
  it("uses deterministic, supported button strategies that fit the family and goal", () => {
    const variants = [
      resolveButtons(recipe, semantics("luxury", "booking", { cta_pressure: 70 }), capabilities)
        .variant,
      resolveButtons(
        recipe,
        semantics("creator", "social", { surface_mood: "glass" }),
        capabilities,
      ).variant,
      resolveButtons(recipe, semantics("energetic", "sell", { cta_pressure: 80 }), capabilities)
        .variant,
      resolveButtons(recipe, semantics("minimal", "portfolio", { cta_pressure: 20 }), capabilities)
        .variant,
    ];

    expect(new Set(variants).size).toBeGreaterThanOrEqual(3);
    expect(variants).toEqual([
      resolveButtons(recipe, semantics("luxury", "booking", { cta_pressure: 70 }), capabilities)
        .variant,
      resolveButtons(
        recipe,
        semantics("creator", "social", { surface_mood: "glass" }),
        capabilities,
      ).variant,
      resolveButtons(recipe, semantics("energetic", "sell", { cta_pressure: 80 }), capabilities)
        .variant,
      resolveButtons(recipe, semantics("minimal", "portfolio", { cta_pressure: 20 }), capabilities)
        .variant,
    ]);
    expect(variants.every((variant) => capabilities[`button_${variant}`])).toBe(true);
  });

  it("selects different existing top compositions for media strategies", () => {
    expect(resolveLayout("centered_profile", true, "profile-first")).toEqual(
      resolveLayout("centered_profile", true, "profile-first"),
    );
    expect(resolveLayout("centered_profile", true, "profile-first").header).toBe("overlap");
    expect(resolveLayout("centered_profile", true, "immersive-background").id).toBe("full-width");
    expect(resolveLayout("media_story", true, "gallery-first").id).toBe("bento");
    expect(resolveLayout("visual_cover", false, "banner-first").id).toBe("centered");
  });

  it("keeps sparse users compact and rich users materially larger", () => {
    const simple = {
      ...PLAYGROUND_CASES[2]!,
      intent: {
        ...PLAYGROUND_CASES[2]!.intent,
        identity: { ...PLAYGROUND_CASES[2]!.intent.identity, banner_preview: null },
      },
      content: {
        links: [
          { label: "WhatsApp", url: "https://wa.me/34600000000" },
          { label: "Instagram", url: "https://instagram.com/example" },
        ],
        socials: [{ platform: "instagram", url: "https://instagram.com/example" }],
      },
    };
    const rich = PLAYGROUND_CASES[0]!;
    const simpleCandidate = generatePowerEditorCandidates(simple.intent, {
      content: simple.content,
      count: 1,
      now: NOW,
    })[0]!;
    const richCandidate = generatePowerEditorCandidates(rich.intent, {
      content: rich.content,
      count: 1,
      now: NOW,
    })[0]!;

    expect(simpleCandidate.recipe.semantics.density).toBe("compact");
    expect(richCandidate.recipe.semantics.density).toBe("spacious");
    expect(simpleCandidate.config.blocks.length).toBeLessThan(richCandidate.config.blocks.length);
    expect(simpleCandidate.config.blocks.some((block) => block.type === "gallery")).toBe(false);
    expect(simpleCandidate.config.blocks.some((block) => block.type === "pricing")).toBe(false);
  });

  it("gives the primary CTA stronger semantic emphasis than navigation", () => {
    const candidate = generatePowerEditorCandidates(PLAYGROUND_CASES[0]!.intent, {
      content: PLAYGROUND_CASES[0]!.content,
      count: 1,
      now: NOW,
    })[0]!;
    const blocks = candidate.recipe.structure.blocks;
    const ctaIndex = blocks.findIndex((block) => block.type === "cta");

    expect(ctaIndex).toBeGreaterThanOrEqual(0);
    expect(blocks[ctaIndex]!.frame).not.toBe("none");
    expect(blocks[ctaIndex]!.role).toBe("conversion");
  });
});
