import {
  generatePowerEditorCandidates,
  selectStructurallyDiverseCandidates,
  type PowerEditorCandidateV2,
} from "../power-editor";
import { DESIGN_PRESETS_IDS, type DesignPresetId } from "../presets";
import { PLAYGROUND_CASES, type PlaygroundCase } from "../power-editor/playground-cases";
import type { ContentSourceV2 } from "../power-editor/content-source";
import type { CuratedMediaResult, NormalizedMediaAsset } from "../media";
import { VISUAL_QA_CASES } from "./visualQaCases";
import { generateMediaHeroQaCandidates } from "./mediaHeroFixture";

export interface EngineV2PlaygroundPreview {
  scenarioId: string;
  scenarioTitle: string;
  scenarioGoal: string;
  scenarioStyle: string;
  candidateId: string;
  family: string;
  layout: string;
  qualityScore: number;
  fingerprint: string;
  candidate: PowerEditorCandidateV2;
}

export interface EngineV2PowerEditorPlaygroundProps {
  cases?: readonly PlaygroundCase[];
  candidateCount?: number;
  now?: string;
  media?: CuratedMediaResult;
}

const PRESET_BATCHES: readonly DesignPresetId[][] = [
  [...DESIGN_PRESETS_IDS.slice(0, 4)],
  [...DESIGN_PRESETS_IDS.slice(4)],
];

function generateRequestedCandidates(
  scenario: PlaygroundCase,
  candidateCount: number,
  now: string,
): PowerEditorCandidateV2[] {
  if ("qaComposition" in scenario && scenario.qaComposition === "media-hero") {
    return generateMediaHeroQaCandidates(scenario, candidateCount, now);
  }
  const options = {
    content: scenario.content,
    count: candidateCount,
    now,
    ...(scenario.mediaStrategy ? { mediaStrategy: scenario.mediaStrategy } : {}),
  };
  if (candidateCount <= 10) {
    return generatePowerEditorCandidates(scenario.intent, options);
  }

  // Candidate generation is bounded to ten per engine call. The visual QA
  // harness uses two deterministic preset batches to inspect twelve real
  // Engine outputs without changing that Engine safety bound.
  const perBatch = Math.min(10, Math.max(6, candidateCount));
  const generated = PRESET_BATCHES.flatMap((presets) =>
    generatePowerEditorCandidates(scenario.intent, {
      ...options,
      count: perBatch,
      minimumDistance: 2,
      presets,
      ...(scenario.mediaStrategy ? { mediaStrategy: scenario.mediaStrategy } : {}),
    }),
  );
  const unique = new Map<string, PowerEditorCandidateV2>();
  for (const candidate of generated) unique.set(candidate.recipe.meta.fingerprint, candidate);
  const pool = [...unique.values()];
  const diverse = selectStructurallyDiverseCandidates(pool, candidateCount);
  // Sparse/no-media fixtures may not have twelve eligible top compositions.
  // Preserve twelve real deterministic candidates, while keeping the stricter
  // diversity cap whenever the Engine has enough structural alternatives.
  return diverse.length >= candidateCount
    ? diverse
    : selectStructurallyDiverseCandidates(pool, candidateCount, candidateCount);
}

function photoAssets(
  media: CuratedMediaResult | undefined,
  role: "avatar" | "banner" | "background" | "gallery" | "portfolio" | "media-card",
) {
  return (media?.assets[role] ?? []).filter(
    (asset): asset is NormalizedMediaAsset => asset.type === "photo",
  );
}

/** Maps provider media into existing host-content slots; no new editor fields. */
export function applyCuratedMediaToScenario(
  scenario: PlaygroundCase,
  media: CuratedMediaResult | undefined,
): PlaygroundCase {
  if (!media) return scenario;
  const avatar = photoAssets(media, "avatar")[0];
  const banner = photoAssets(media, "banner")[0] ?? photoAssets(media, "background")[0];
  const gallery = photoAssets(media, "gallery");
  const portfolio = photoAssets(media, "portfolio");
  const mediaCard = photoAssets(media, "media-card")[0];
  const content: ContentSourceV2 = {
    ...scenario.content,
    ...(gallery.length >= 2
      ? { gallery: gallery.map((asset) => ({ url: asset.url, alt: asset.alt })) }
      : {}),
    ...(portfolio.length >= 2
      ? {
          portfolio: portfolio.map((asset, index) => ({
            label: `Pexels portfolio ${index + 1}`,
            description: asset.alt,
            url: asset.sourcePage,
            imageUrl: asset.url,
          })),
        }
      : {}),
    ...(mediaCard
      ? {
          mediaCard: {
            title: "Featured visual",
            body: mediaCard.alt,
            imageUrl: mediaCard.url,
            url: mediaCard.sourcePage,
          },
        }
      : {}),
  };
  return {
    ...scenario,
    intent: {
      ...scenario.intent,
      identity: {
        ...scenario.intent.identity,
        ...(avatar ? { avatar_preview: avatar.url } : {}),
        ...(banner ? { banner_preview: banner.url } : {}),
      },
    },
    content,
  };
}

export function buildEngineV2PlaygroundPreviews({
  cases = PLAYGROUND_CASES,
  candidateCount = 2,
  now = "2026-01-01T00:00:00.000Z",
  media,
}: EngineV2PowerEditorPlaygroundProps = {}): EngineV2PlaygroundPreview[] {
  return cases.flatMap((scenario) => {
    const mediaScenario = applyCuratedMediaToScenario(scenario, media);
    return generateRequestedCandidates(mediaScenario, candidateCount, now).map((candidate) => ({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      scenarioGoal:
        "qaGoal" in scenario && typeof scenario.qaGoal === "string" ? scenario.qaGoal : "",
      scenarioStyle:
        "qaStyle" in scenario && typeof scenario.qaStyle === "string" ? scenario.qaStyle : "",
      candidateId: candidate.id,
      family: candidate.recipe.semantics.family,
      layout: candidate.recipe.layout.id,
      qualityScore: candidate.total_score,
      fingerprint: candidate.recipe.meta.fingerprint,
      candidate,
    }));
  });
}

export function buildVisualQaPlaygroundPreviews({
  candidateCount = 12,
  now = "2026-01-01T00:00:00.000Z",
  media,
}: Omit<EngineV2PowerEditorPlaygroundProps, "cases"> = {}): EngineV2PlaygroundPreview[] {
  return buildEngineV2PlaygroundPreviews({
    cases: VISUAL_QA_CASES,
    candidateCount,
    now,
    ...(media ? { media } : {}),
  });
}

export function buildVisualQaScenarioPreviews({
  scenarioId,
  candidateCount = 12,
  now = "2026-01-01T00:00:00.000Z",
  media,
}: Omit<EngineV2PowerEditorPlaygroundProps, "cases"> & {
  scenarioId: string;
}): EngineV2PlaygroundPreview[] {
  const scenario = VISUAL_QA_CASES.find((item) => item.id === scenarioId) ?? VISUAL_QA_CASES[0]!;
  return buildEngineV2PlaygroundPreviews({
    cases: [scenario],
    candidateCount,
    now,
    ...(media ? { media } : {}),
  });
}
