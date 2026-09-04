/**
 * PUBLIC V2 GENERATION API
 *
 * Reuses the existing deterministic pipeline (candidates, scoring,
 * diversity) and evolves each winning candidate into a
 * PowerEditorRecipeV2 + BioTemplateConfig.
 */

import type { BioTemplateConfig } from "@/premium-template-studio/types";
import { generateCandidateSet, type CandidateOptions } from "../candidates";
import { normalizeIntent } from "../normalize";
import { buildDesignProfile } from "../strategy";
import type { OnboardingIntentV1 } from "../types";
import type { PowerEditorCapabilities } from "./capabilities-v2";
import type { ContentSourceV2 } from "./content-source";
import type { MediaStrategyV2 } from "./media-strategy-v2";
import { buildPowerEditorRecipeV2 } from "./to-recipe-v2";
import { toBioTemplateConfig } from "./to-template-config";
import type { PowerEditorRecipeV2 } from "./types-v2";

export interface GenerateV2Options extends CandidateOptions {
  content?: ContentSourceV2;
  powerEditorCapabilities?: Partial<PowerEditorCapabilities>;
  /** Existing semantic media strategy, useful for controlled QA fixtures. */
  mediaStrategy?: MediaStrategyV2;
}

export interface PowerEditorCandidateV2 {
  id: string;
  recipe: PowerEditorRecipeV2;
  config: BioTemplateConfig;
  total_score: number;
}

export function generatePowerEditorCandidates(
  intent: OnboardingIntentV1,
  options: GenerateV2Options = {},
): PowerEditorCandidateV2[] {
  const { content, powerEditorCapabilities, mediaStrategy, ...candidateOptions } = options;
  const set = generateCandidateSet(intent, candidateOptions);
  const normalized = normalizeIntent(intent);

  return set.candidates.map((candidate) => {
    const profile = buildDesignProfile(
      normalized,
      candidate.variant,
      candidate.recipe.meta.family,
    );
    const recipe = buildPowerEditorRecipeV2({
      ...(content ? { content } : {}),
      ...(powerEditorCapabilities ? { capabilities: powerEditorCapabilities } : {}),
      ...(mediaStrategy ? { mediaStrategy } : {}),
      recipe: candidate.recipe,
      profile,
      pattern: candidate.pattern === "unknown" ? "centered_profile" : candidate.pattern,
      score: candidate.score,
      candidateId: candidate.id,
      preset: candidate.preset,
    });
    return {
      id: candidate.id,
      recipe,
      config: toBioTemplateConfig(recipe),
      total_score: candidate.score.total,
    };
  });
}

/** Single best template, ready for the Power Editor renderer. */
export function generatePowerEditorTemplate(
  intent: OnboardingIntentV1,
  options: GenerateV2Options = {},
): PowerEditorCandidateV2 | null {
  return generatePowerEditorCandidates(intent, { ...options, count: 1 })[0] ?? null;
}
