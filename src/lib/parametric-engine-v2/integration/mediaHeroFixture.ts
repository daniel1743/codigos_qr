import { buildDesignProfile } from "../strategy";
import { normalizeIntent } from "../normalize";
import {
  buildPowerEditorRecipeV2,
  generatePowerEditorCandidates,
  toBioTemplateConfig,
  type PowerEditorCandidateV2,
} from "../power-editor";
import type { PlaygroundCase } from "../power-editor/playground-cases";

const PRESET_BATCHES = [
  ["clean_professional", "bold_conversion", "editorial_calm", "visual_portfolio"],
  ["premium_dark", "friendly_local", "creator_social", "minimal_focus"],
] as const;

/**
 * QA-only adapter: reuses the public Engine pipeline, then asks the existing
 * recipe adapter for its media_story pattern so the bento/hero path is tested
 * explicitly. It does not add a production generation option or a new field.
 */
export function generateMediaHeroQaCandidates(
  scenario: PlaygroundCase,
  count: number,
  now: string,
): PowerEditorCandidateV2[] {
  const options = {
    content: scenario.content,
    count: Math.min(10, Math.max(1, count)),
    now,
    mediaStrategy: "video-first" as const,
  };
  const baseCandidates = PRESET_BATCHES.flatMap((presets) =>
    generatePowerEditorCandidates(scenario.intent, { ...options, presets: [...presets] }),
  );
  const unique = new Map<string, PowerEditorCandidateV2>();
  for (const candidate of baseCandidates) unique.set(candidate.recipe.meta.fingerprint, candidate);

  return [...unique.values()].slice(0, count).map((candidate, index) => {
    const sourceRecipe = candidate.recipe.source_recipe;
    const profile = buildDesignProfile(
      normalizeIntent(scenario.intent),
      index,
      candidate.recipe.semantics.family,
    );
    const recipe = buildPowerEditorRecipeV2({
      recipe: sourceRecipe,
      profile,
      pattern: "media_story",
      score: candidate.recipe.meta.quality,
      content: scenario.content,
      candidateId: `${candidate.id}.media-hero`,
      mediaStrategy: "video-first",
    });
    return {
      ...candidate,
      id: `${candidate.id}.media-hero`,
      recipe,
      config: toBioTemplateConfig(recipe),
    };
  });
}
