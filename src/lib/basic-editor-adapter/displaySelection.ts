import { getTemplates } from "../basic-templates/catalog";
import type { PageRecipeV1, RecipeCandidateV1 } from "../parametric-engine";
import type { RendererRuntimeContextV1 } from "../renderer-capabilities";
import { evaluateRecipeTemplates } from "./recipeToBasicTemplate";
import type {
  BasicEditorAdapterContentV1,
  BasicEditorAdapterSuccessV1,
  BasicEditorTemplateEvaluationV1,
} from "./types";

export type DisplayHeroGeometryV1 = "curved" | "fusion" | "straight";

export interface PerceptualSignatureV1 {
  readonly engineFamily: PageRecipeV1["meta"]["family"];
  readonly compositionPattern: RecipeCandidateV1["pattern"];
  readonly heroMode: PageRecipeV1["structure"]["hero"]["mode"];
  readonly identityAlignment: PageRecipeV1["structure"]["hero"]["identity_alignment"];
  readonly templateId: string;
  readonly templateFamily: string;
  readonly heroGeometry: DisplayHeroGeometryV1;
  readonly linksPresentation: "buttons" | "cards" | "mixed";
  readonly primaryActionPresentation: PageRecipeV1["structure"]["primary_action"]["presentation"];
  readonly cardMediaPosition: "right" | "bottom" | "none";
  readonly density: PageRecipeV1["design"]["geometry"]["density"];
  readonly cardStyle: PageRecipeV1["design"]["card"]["style"];
  readonly buttonStyle: string;
  readonly buttonRadius: string;
  readonly avatarShape: PageRecipeV1["design"]["avatar"]["shape"];
  readonly radius: PageRecipeV1["design"]["geometry"]["radius"];
  readonly backgroundType: PageRecipeV1["design"]["background"]["type"];
  readonly typographyArchetype: string;
  readonly palette: string;
}

export interface DisplayedCandidateV1 {
  readonly slot: "A" | "B" | "C";
  readonly sourceIndex: number;
  readonly directionLabel: string;
  readonly selectionReason: string;
  readonly selectionScore: number;
  readonly candidate: RecipeCandidateV1;
  readonly evaluation: BasicEditorTemplateEvaluationV1 & {
    readonly result: BasicEditorAdapterSuccessV1;
  };
  readonly evaluations: readonly BasicEditorTemplateEvaluationV1[];
  readonly signature: PerceptualSignatureV1;
}

export interface DisplaySelectionResultV1 {
  readonly displayed: readonly DisplayedCandidateV1[];
  readonly poolSize: number;
  readonly totalCandidateTemplatePairings: number;
  readonly validPairingCount: number;
  readonly capabilityRejectedPairCount: number;
  readonly contrastRejectedPairCount: number;
  readonly contrastNotVerifiablePairCount: number;
  readonly genericFallbackSuppressedPairCount: number;
  readonly duplicateCandidatesSkipped: number;
  readonly familyPatternDuplicateCombinationsSkipped: number;
  readonly nearDuplicateCombinationsSkipped: number;
  readonly duplicateGuardRelaxed: boolean;
  readonly combinedPerceptualScore: number;
  readonly selectedMinimumQuality: number;
  readonly selectedMinimumTotal: number;
  readonly bestAchievableMinimumTotal: number;
  readonly qualityTargetTotal: 90;
  readonly qualityTargetSatisfied: boolean;
  readonly qualityLimitingDimensions: readonly string[];
}

interface DisplaySlot {
  readonly id: DisplayedCandidateV1["slot"];
  readonly geometry: DisplayHeroGeometryV1;
  readonly purpose: string;
}

interface PairOption {
  readonly candidate: RecipeCandidateV1;
  readonly sourceIndex: number;
  readonly evaluation: DisplayedCandidateV1["evaluation"];
  readonly evaluations: readonly BasicEditorTemplateEvaluationV1[];
  readonly signature: PerceptualSignatureV1;
  readonly slotScore: number;
}

interface SearchCounters {
  familyPattern: number;
  nearDuplicate: number;
}

const QUALITY_TARGET_TOTAL = 90;
const QUALITY_TARGET_BUSINESS = 90;
const QUALITY_TARGET_CONVERSION = 85;

function qualityFloor(option: PairOption): number {
  const score = option.candidate.score;
  return Math.min(
    score.accessibility,
    score.business_fit,
    score.conversion_fit,
    score.content_fit,
    score.visual_coherence,
    score.mobile_viability,
    score.capability_fit,
  );
}

function minimumTotal(options: readonly PairOption[]): number {
  return Math.min(...options.map(({ candidate }) => candidate.score.total));
}

function minimumQuality(options: readonly PairOption[]): number {
  return Math.min(...options.map(qualityFloor));
}

interface BestSet {
  readonly options: readonly [PairOption, PairOption, PairOption];
  readonly score: number;
  readonly key: string;
  readonly minimumQuality: number;
  readonly minimumTotal: number;
  readonly minimumBusiness: number;
  readonly minimumConversion: number;
}

const DISPLAY_SLOTS: readonly DisplaySlot[] = [
  { id: "A", geometry: "curved", purpose: "curved geometry with media-right cards" },
  { id: "B", geometry: "fusion", purpose: "fusion geometry with media-bottom cards" },
  { id: "C", geometry: "straight", purpose: "straight geometry with a distinct button hierarchy" },
] as const;

const DIRECTION_LABELS: Record<string, string> = {
  centered_profile: "Identity First",
  compact_action: "Action First",
  conversion_first: "Conversion First",
  editorial_stack: "Editorial First",
  portfolio_first: "Visual First",
  service_first: "Service First",
  social_first: "Social First",
  trust_first: "Trust First",
  unknown: "Distinct Direction",
};

function asGeometry(value: string): DisplayHeroGeometryV1 | null {
  return value === "curved" || value === "fusion" || value === "straight" ? value : null;
}

function visibleCardMedia(result: BasicEditorAdapterSuccessV1): "right" | "bottom" | "none" {
  return result.projection.linksPresentation === "buttons"
    ? "none"
    : result.projection.cardMediaPosition;
}

function signatureFor(
  candidate: RecipeCandidateV1,
  evaluation: DisplayedCandidateV1["evaluation"],
  geometry: DisplayHeroGeometryV1,
): PerceptualSignatureV1 {
  const { recipe } = candidate;
  const { result } = evaluation;
  return {
    engineFamily: recipe.meta.family,
    compositionPattern: candidate.pattern,
    heroMode: recipe.structure.hero.mode,
    identityAlignment: recipe.structure.hero.identity_alignment,
    templateId: evaluation.templateId,
    templateFamily: result.config.template.family,
    heroGeometry: geometry,
    linksPresentation: result.projection.linksPresentation,
    primaryActionPresentation: recipe.structure.primary_action.presentation,
    cardMediaPosition: visibleCardMedia(result),
    density: recipe.design.geometry.density,
    cardStyle: recipe.design.card.style,
    buttonStyle: result.config.buttonStyle.variant,
    buttonRadius: result.config.buttonStyle.shape,
    avatarShape: recipe.design.avatar.shape,
    radius: recipe.design.geometry.radius,
    backgroundType: recipe.design.background.type,
    typographyArchetype: `${recipe.design.typography.heading_family}/${recipe.design.typography.body_family}/${recipe.design.typography.heading_scale}`,
    palette: `${recipe.design.palette.background}/${recipe.design.palette.accent}`,
  };
}

/** Palette and minor type changes deliberately carry almost no weight. */
export function perceptualDistance(
  left: PerceptualSignatureV1,
  right: PerceptualSignatureV1,
): number {
  let score = 0;
  if (left.engineFamily !== right.engineFamily) score += 24;
  if (left.compositionPattern !== right.compositionPattern) score += 24;
  if (left.heroGeometry !== right.heroGeometry) score += 24;
  if (left.templateId !== right.templateId) score += 12;
  if (left.templateFamily !== right.templateFamily) score += 14;
  if (left.heroMode !== right.heroMode) score += 10;
  if (left.identityAlignment !== right.identityAlignment) score += 10;
  if (left.linksPresentation !== right.linksPresentation) score += 22;
  if (left.primaryActionPresentation !== right.primaryActionPresentation) score += 10;
  if (left.cardMediaPosition !== right.cardMediaPosition) score += 15;
  if (left.cardStyle !== right.cardStyle) score += 8;
  if (left.density !== right.density) score += 8;
  if (left.buttonStyle !== right.buttonStyle) score += 7;
  if (left.buttonRadius !== right.buttonRadius) score += 6;
  if (left.avatarShape !== right.avatarShape) score += 4;
  if (left.radius !== right.radius) score += 4;
  if (left.backgroundType !== right.backgroundType) score += 3;
  if (left.typographyArchetype !== right.typographyArchetype) score += 2;
  if (left.palette !== right.palette) score += 1;
  return score;
}

function slotFit(slot: DisplaySlot, option: Omit<PairOption, "slotScore">): number {
  const { candidate, evaluation, signature } = option;
  const { pattern } = candidate;
  let score = candidate.score.total * 5;
  score += evaluation.result.status === "compatible" ? 6 : 0;
  score -= evaluation.result.downgrades.length * 2;

  if (slot.id === "A") {
    score += signature.linksPresentation === "cards" ? 95 : 62;
    score += signature.cardMediaPosition === "right" ? 75 : 0;
    score += signature.density === "spacious" ? 24 : 0;
    score +=
      candidate.recipe.meta.family === "editorial"
        ? 24
        : candidate.recipe.meta.family === "creator"
          ? 16
          : 0;
    score +=
      pattern === "editorial_stack"
        ? 30
        : pattern === "portfolio_first"
          ? 28
          : pattern === "trust_first"
            ? 22
            : 0;
    score += evaluation.templateId === "beauty-curve" ? 24 : 0;
  } else if (slot.id === "B") {
    score += signature.linksPresentation === "cards" ? 95 : 62;
    score += signature.cardMediaPosition === "bottom" ? 75 : 0;
    score += signature.density === "balanced" ? 20 : 0;
    score +=
      candidate.recipe.meta.family === "luxury"
        ? 28
        : candidate.recipe.meta.family === "minimal"
          ? 18
          : 0;
    score +=
      pattern === "portfolio_first"
        ? 28
        : pattern === "service_first"
          ? 26
          : pattern === "trust_first"
            ? 22
            : 0;
    score += signature.buttonStyle === "soft" ? 10 : 0;
  } else {
    score += signature.linksPresentation === "buttons" ? 110 : 25;
    score += signature.identityAlignment === "left" ? 28 : 0;
    score += signature.density === "compact" ? 20 : 0;
    score +=
      candidate.recipe.meta.family === "corporate"
        ? 34
        : candidate.recipe.meta.family === "energetic"
          ? 22
          : 0;
    score +=
      pattern === "conversion_first"
        ? 35
        : pattern === "trust_first"
          ? 30
          : pattern === "compact_action"
            ? 24
            : 0;
    score +=
      evaluation.templateId === "executive-straight"
        ? 60
        : evaluation.templateId === "beauty-catalog"
          ? 20
          : 0;
  }
  return score;
}

function pairKey(option: PairOption): string {
  return `${option.evaluation.templateId}/${option.candidate.id}/${option.candidate.fingerprint}`;
}

function structuralKey(signature: PerceptualSignatureV1): string {
  const { palette: _palette, ...structural } = signature;
  return JSON.stringify(structural);
}

function familyPatternKey(option: PairOption): string {
  return `${option.signature.engineFamily}/${option.signature.compositionPattern}`;
}

function asRenderableEvaluation(
  evaluation: BasicEditorTemplateEvaluationV1,
): DisplayedCandidateV1["evaluation"] | null {
  return evaluation.result.renderable ? (evaluation as DisplayedCandidateV1["evaluation"]) : null;
}

function primaryQualityEligible(option: PairOption): boolean {
  const { score } = option.candidate;
  return (
    score.total >= QUALITY_TARGET_TOTAL &&
    score.business_fit >= QUALITY_TARGET_BUSINESS &&
    score.conversion_fit >= QUALITY_TARGET_CONVERSION
  );
}

function searchOptions(pairings: readonly PairOption[]): PairOption[] {
  const byCandidate = new Map<string, PairOption[]>();
  for (const pairing of pairings) {
    const group = byCandidate.get(pairing.candidate.fingerprint) ?? [];
    group.push(pairing);
    byCandidate.set(pairing.candidate.fingerprint, group);
  }

  // Keep one strong renderable representative per hero geometry. The complete
  // pairing pool remains available for diagnostics; this bounded search keeps
  // every fixture deterministic and responsive.
  return [...byCandidate.values()].flatMap((group) => {
    const ordered = group
      .slice()
      .sort(
        (left, right) =>
          Math.max(...DISPLAY_SLOTS.map((slot) => slotFit(slot, right))) -
            Math.max(...DISPLAY_SLOTS.map((slot) => slotFit(slot, left))) ||
          pairKey(left).localeCompare(pairKey(right)),
      );
    const selected: PairOption[] = [];
    const geometries = new Set<DisplayHeroGeometryV1>();
    for (const option of ordered) {
      if (!geometries.has(option.signature.heroGeometry)) {
        selected.push(option);
        geometries.add(option.signature.heroGeometry);
      }
    }
    return selected.length > 0 ? selected : ordered.slice(0, 1);
  });
}

function assignSlots(options: readonly [PairOption, PairOption, PairOption]): {
  readonly options: readonly [PairOption, PairOption, PairOption];
  readonly score: number;
  readonly key: string;
} {
  const permutations = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ] as const;
  let best: {
    options: readonly [PairOption, PairOption, PairOption];
    score: number;
    key: string;
  } | null = null;
  for (const permutation of permutations) {
    const assigned = permutation.map((index, slotIndex) => {
      const option = options[index]!;
      return {
        ...option,
        slotScore: slotFit(DISPLAY_SLOTS[slotIndex]!, option),
      };
    }) as unknown as readonly [PairOption, PairOption, PairOption];
    const score = assigned.reduce((sum, option) => sum + option.slotScore, 0);
    const key = assigned.map(pairKey).join("|");
    if (!best || score > best.score || (score === best.score && key < best.key)) {
      best = { options: assigned, score, key };
    }
  }
  return best!;
}

function searchBestSet(
  pairings: readonly PairOption[],
  counters: SearchCounters,
  enforceFamilyPatternGuard: boolean,
  requiredFingerprints: ReadonlySet<string> = new Set(),
): BestSet | null {
  const options = searchOptions(pairings);
  let best: BestSet | null = null;
  for (let firstIndex = 0; firstIndex < options.length - 2; firstIndex += 1) {
    const first = options[firstIndex]!;
    for (let secondIndex = firstIndex + 1; secondIndex < options.length - 1; secondIndex += 1) {
      const second = options[secondIndex]!;
      if (first.candidate.fingerprint === second.candidate.fingerprint) continue;
      if (structuralKey(first.signature) === structuralKey(second.signature)) continue;
      for (let thirdIndex = secondIndex + 1; thirdIndex < options.length; thirdIndex += 1) {
        const third = options[thirdIndex]!;
        if (
          first.candidate.fingerprint === third.candidate.fingerprint ||
          second.candidate.fingerprint === third.candidate.fingerprint
        )
          continue;
        const structuralKeys = new Set([
          structuralKey(first.signature),
          structuralKey(second.signature),
          structuralKey(third.signature),
        ]);
        if (structuralKeys.size !== 3) continue;
        const familyPatterns = new Set([
          familyPatternKey(first),
          familyPatternKey(second),
          familyPatternKey(third),
        ]);
        if (enforceFamilyPatternGuard && familyPatterns.size !== 3) {
          counters.familyPattern += 1;
          continue;
        }
        const distances = [
          perceptualDistance(first.signature, second.signature),
          perceptualDistance(first.signature, third.signature),
          perceptualDistance(second.signature, third.signature),
        ];
        if (Math.min(...distances) < 56) {
          counters.nearDuplicate += 1;
          continue;
        }
        const selected = assignSlots([first, second, third]);
        const selectedOptions = selected.options;
        const selectedFingerprints = new Set(
          selectedOptions.map(({ candidate }) => candidate.fingerprint),
        );
        if (
          ![...requiredFingerprints].every((fingerprint) => selectedFingerprints.has(fingerprint))
        ) {
          continue;
        }
        const selectedMinimumQuality = minimumQuality(selectedOptions);
        const selectedMinimumTotal = minimumTotal(selectedOptions);
        const selectedMinimumBusiness = Math.min(
          ...selectedOptions.map(({ candidate }) => candidate.score.business_fit),
        );
        const selectedMinimumConversion = Math.min(
          ...selectedOptions.map(({ candidate }) => candidate.score.conversion_fit),
        );
        const score = selected.score + distances.reduce((sum, value) => sum + value, 0) * 4;
        const key = selected.key;
        if (
          !best ||
          selectedMinimumTotal > best.minimumTotal ||
          (selectedMinimumTotal === best.minimumTotal &&
            (selectedMinimumBusiness > best.minimumBusiness ||
              (selectedMinimumBusiness === best.minimumBusiness &&
                (selectedMinimumConversion > best.minimumConversion ||
                  (selectedMinimumConversion === best.minimumConversion &&
                    (selectedMinimumQuality > best.minimumQuality ||
                      (selectedMinimumQuality === best.minimumQuality &&
                        (score > best.score || (score === best.score && key < best.key)))))))))
        ) {
          best = {
            options: selectedOptions,
            score,
            key,
            minimumQuality: selectedMinimumQuality,
            minimumTotal: selectedMinimumTotal,
            minimumBusiness: selectedMinimumBusiness,
            minimumConversion: selectedMinimumConversion,
          };
        }
      }
    }
  }
  return best;
}

/** Evaluate every candidate/template pairing and optimize the trio as a set. */
export function selectPerceptuallyDistinctCandidates(
  candidates: readonly RecipeCandidateV1[],
  content: BasicEditorAdapterContentV1,
  options: { readonly runtimeContext?: RendererRuntimeContextV1 } = {},
): DisplaySelectionResultV1 {
  const templates = getTemplates();
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const evaluated = candidates.map((candidate, sourceIndex) => ({
    candidate,
    sourceIndex,
    evaluations: evaluateRecipeTemplates(candidate.recipe, content, options),
  }));
  const pairings: PairOption[] = [];
  let capabilityRejectedPairCount = 0;
  let contrastRejectedPairCount = 0;
  let contrastNotVerifiablePairCount = 0;
  let genericFallbackSuppressedPairCount = 0;
  for (const entry of evaluated) {
    for (const rawEvaluation of entry.evaluations) {
      const evaluation = asRenderableEvaluation(rawEvaluation);
      const template = templateById.get(rawEvaluation.templateId);
      const geometry = template ? asGeometry(template.structure.heroStyle) : null;
      if (!evaluation || !geometry) {
        capabilityRejectedPairCount += 1;
        continue;
      }
      if (evaluation.result.contrast?.status === "FAIL") {
        contrastRejectedPairCount += 1;
        continue;
      }
      if (evaluation.result.contrast?.status === "NOT_VERIFIABLE")
        contrastNotVerifiablePairCount += 1;
      if (
        evaluation.result.mediaDiagnostics.some(
          ({ sourceType }) => sourceType === "generic_fallback",
        )
      ) {
        genericFallbackSuppressedPairCount += 1;
      }
      const partial = {
        candidate: entry.candidate,
        sourceIndex: entry.sourceIndex,
        evaluation,
        evaluations: entry.evaluations,
        signature: signatureFor(entry.candidate, evaluation, geometry),
      };
      pairings.push({ ...partial, slotScore: 0 });
    }
  }

  const counters: SearchCounters = { familyPattern: 0, nearDuplicate: 0 };
  const qualityBand = pairings.filter(primaryQualityEligible);
  const qualityBandFingerprints = new Set(
    qualityBand.map(({ candidate }) => candidate.fingerprint),
  );
  let best = searchBestSet(qualityBand, counters, true);
  if (!best) best = searchBestSet(qualityBand, counters, false);
  if (!best) {
    const requiredFingerprints =
      qualityBandFingerprints.size === 2 ? qualityBandFingerprints : new Set<string>();
    best = searchBestSet(pairings, counters, true, requiredFingerprints);
  }
  let duplicateGuardRelaxed = false;
  if (!best) {
    duplicateGuardRelaxed = true;
    const requiredFingerprints =
      qualityBandFingerprints.size === 2 ? qualityBandFingerprints : new Set<string>();
    best = searchBestSet(pairings, counters, false, requiredFingerprints);
  }

  const uniqueFingerprints = new Set(candidates.map(({ fingerprint }) => fingerprint));
  const base = {
    poolSize: candidates.length,
    totalCandidateTemplatePairings: candidates.length * templates.length,
    validPairingCount: pairings.length,
    capabilityRejectedPairCount,
    contrastRejectedPairCount,
    contrastNotVerifiablePairCount,
    genericFallbackSuppressedPairCount,
    duplicateCandidatesSkipped: candidates.length - uniqueFingerprints.size,
    familyPatternDuplicateCombinationsSkipped: counters.familyPattern,
    nearDuplicateCombinationsSkipped: counters.nearDuplicate,
    duplicateGuardRelaxed,
  } as const;
  if (!best) {
    return {
      ...base,
      displayed: [],
      combinedPerceptualScore: 0,
      selectedMinimumQuality: 0,
      selectedMinimumTotal: 0,
      bestAchievableMinimumTotal: 0,
      qualityTargetTotal: QUALITY_TARGET_TOTAL,
      qualityTargetSatisfied: false,
      qualityLimitingDimensions: [],
    };
  }

  const minimumQuality = best.minimumQuality;
  const limitingDimensions = [
    [
      "accessibility",
      Math.min(...best.options.map(({ candidate }) => candidate.score.accessibility)),
    ],
    ["business", Math.min(...best.options.map(({ candidate }) => candidate.score.business_fit))],
    [
      "conversion",
      Math.min(...best.options.map(({ candidate }) => candidate.score.conversion_fit)),
    ],
    ["content", Math.min(...best.options.map(({ candidate }) => candidate.score.content_fit))],
    [
      "coherence",
      Math.min(...best.options.map(({ candidate }) => candidate.score.visual_coherence)),
    ],
    ["mobile", Math.min(...best.options.map(({ candidate }) => candidate.score.mobile_viability))],
    [
      "capability",
      Math.min(...best.options.map(({ candidate }) => candidate.score.capability_fit)),
    ],
  ] as const;
  const qualityLimitingDimensions = limitingDimensions
    .filter(([, value]) => value === minimumQuality)
    .map(([name]) => name);

  return {
    ...base,
    displayed: best.options.map((option, index) => {
      const slot = DISPLAY_SLOTS[index]!;
      return {
        slot: slot.id,
        sourceIndex: option.sourceIndex,
        directionLabel: DIRECTION_LABELS[option.candidate.pattern] ?? "Distinct Direction",
        selectionReason: `${option.signature.heroGeometry} · balanced quality + meaningful diversity`,
        selectionScore: option.slotScore,
        candidate: option.candidate,
        evaluation: option.evaluation,
        evaluations: option.evaluations,
        signature: option.signature,
      };
    }),
    combinedPerceptualScore: best.score,
    selectedMinimumQuality: best.minimumQuality,
    selectedMinimumTotal: best.minimumTotal,
    bestAchievableMinimumTotal: best.minimumTotal,
    qualityTargetTotal: QUALITY_TARGET_TOTAL,
    qualityTargetSatisfied: best.minimumTotal >= QUALITY_TARGET_TOTAL,
    qualityLimitingDimensions,
  };
}
