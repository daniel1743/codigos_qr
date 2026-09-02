import {
  perceptualDistance,
  selectPerceptuallyDistinctCandidates,
} from "@/lib/basic-editor-adapter";
import {
  generateCandidateSet,
  type CandidateSetV1,
  type OnboardingIntentV1,
} from "@/lib/parametric-engine";
import { getRendererCapabilities, toEngineRendererCapabilities } from "@/lib/renderer-capabilities";
import {
  ENGINE_LAB_FIXTURES,
  adapterContentFromFixtureDraft,
  draftFromFixture,
  fixtureAssetSet,
  getEngineLabFixture,
  intentFromFixtureDraft,
} from "./fixtures";

export interface EngineLabQualityCheckCaseV1 {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface EngineLabQualityCheckResultV1 {
  readonly passed: boolean;
  readonly total: number;
  readonly passedCount: number;
  readonly cases: readonly EngineLabQualityCheckCaseV1[];
}

const NOW = "2026-09-02T00:00:00.000Z";
const DESKTOP = { containerWidth: 500, surface: "editor_preview" as const };
const MOBILE = { containerWidth: 360, surface: "editor_preview" as const };
const MANDATORY_FIXTURES = [
  "wellness",
  "lawyer",
  "photographer",
  "gardener",
  "barber",
  "restaurant",
  "local",
] as const;

function generatePool(intent: OnboardingIntentV1): CandidateSetV1 {
  return generateCandidateSet(intent, {
    count: 3,
    capabilities: toEngineRendererCapabilities(getRendererCapabilities("beauty-curve", DESKTOP)),
    overrides: { hero_mode: "banner_avatar" },
    now: NOW,
  });
}

function selectedSummary(selection: ReturnType<typeof selectPerceptuallyDistinctCandidates>) {
  return selection.displayed.map(({ candidate, evaluation, signature }) => ({
    id: candidate.id,
    fingerprint: candidate.fingerprint,
    templateId: evaluation.templateId,
    signature,
  }));
}

export function runEngineLabQualitySelfCheck(): EngineLabQualityCheckResultV1 {
  const checks: EngineLabQualityCheckCaseV1[] = [];
  const check = (name: string, execute: () => void) => {
    try {
      execute();
      checks.push({ name, passed: true, detail: "pass" });
    } catch (caught) {
      checks.push({
        name,
        passed: false,
        detail: caught instanceof Error ? caught.message : String(caught),
      });
    }
  };
  const assert: (condition: unknown, message: string) => asserts condition = (
    condition,
    message,
  ) => {
    if (!condition) throw new Error(message);
  };

  const scenarioResults = new Map<
    string,
    {
      selection: ReturnType<typeof selectPerceptuallyDistinctCandidates>;
      assets: readonly string[];
      serialized: string;
    }
  >();

  for (const fixtureId of MANDATORY_FIXTURES) {
    check(`${fixtureId} produces a coherent distinct trio`, () => {
      const fixture = getEngineLabFixture(fixtureId);
      const draft = draftFromFixture(fixture);
      const intent = intentFromFixtureDraft(fixture, draft, NOW);
      const content = adapterContentFromFixtureDraft(fixture, draft);
      const pool = generatePool(intent);
      const selection = selectPerceptuallyDistinctCandidates(pool.evaluated, content, {
        runtimeContext: DESKTOP,
      });
      assert(selection.displayed.length === 3, `${fixtureId} did not produce 3 candidates.`);
      assert(
        selection.displayed.every(({ evaluation }) => evaluation.result.renderable),
        `${fixtureId} contains a non-renderable candidate.`,
      );
      assert(
        new Set(selection.displayed.map(({ signature }) => JSON.stringify(signature))).size === 3,
        `${fixtureId} contains duplicate display signatures.`,
      );
      assert(
        new Set(
          selection.displayed.map(
            ({ signature }) => `${signature.engineFamily}/${signature.compositionPattern}`,
          ),
        ).size === 3,
        `${fixtureId} repeats an Engine family+pattern pair.`,
      );
      const distances = selection.displayed.flatMap(({ signature: left }, leftIndex) =>
        selection.displayed
          .slice(leftIndex + 1)
          .map(({ signature: right }) => perceptualDistance(left, right)),
      );
      assert(
        Math.min(...distances) >= 56,
        `${fixtureId} contains a perceptually near-duplicate pairing.`,
      );
      assert(
        selection.displayed.some(({ signature }) => signature.linksPresentation === "buttons"),
        `${fixtureId} has no button proposal.`,
      );
      const assets = fixtureAssetSet(fixture, draft);
      assert(new Set(assets).size === assets.length, `${fixtureId} repeats an asset role.`);
      const assigned = selection.displayed.flatMap(({ evaluation }) => {
        const config = evaluation.result.config;
        return [
          config.content.profile.avatarUrl,
          config.content.profile.heroUrl,
          ...config.content.cards.map(({ imageUrl }) => imageUrl),
        ].filter(Boolean);
      });
      assert(
        assigned.every((asset) => assets.includes(asset)),
        `${fixtureId} received an asset owned by another fixture.`,
      );
      const serialized = JSON.stringify(
        selection.displayed.map(({ evaluation }) => evaluation.result.config),
      );
      if (fixtureId !== "gardener") {
        assert(!serialized.includes("Jardines Aurora"), `${fixtureId} contains garden copy.`);
      }
      for (const { evaluation } of selection.displayed) {
        const cta = evaluation.result.ctaProjection;
        assert(cta, `${fixtureId} is missing CTA debug projection.`);
        if (cta.classification === "low_information" && !cta.reason.includes("locked")) {
          assert(
            cta.renderedLabel === fixture.primaryAction.label,
            `${fixtureId} low-information CTA was not contextualized.`,
          );
        } else {
          assert(
            cta.renderedLabel === cta.originalLabel,
            `${fixtureId} rewrote a specific Engine CTA.`,
          );
        }
      }
      scenarioResults.set(fixtureId, { selection, assets, serialized });
    });
  }

  check("fixture assets are isolated across businesses", () => {
    const ownership = new Map<string, string>();
    for (const fixture of ENGINE_LAB_FIXTURES) {
      const assets = fixtureAssetSet(fixture, draftFromFixture(fixture));
      for (const asset of assets) {
        const owner = ownership.get(asset);
        assert(!owner, `${fixture.id} shares an asset with ${owner}.`);
        ownership.set(asset, fixture.id);
      }
    }
  });

  check("Daniel Falcon wellness regression is isolated", () => {
    const result = scenarioResults.get("wellness");
    assert(result, "Wellness scenario did not run.");
    assert(result.serialized.includes("daniel falcon"), "Daniel Falcon identity is missing.");
    assert(result.serialized.includes("agente de binestar"), "Wellness profession is missing.");
    assert(!result.serialized.includes("Jardines Aurora"), "Daniel still contains garden copy.");
    assert(
      result.selection.displayed.every(
        ({ evaluation }) =>
          evaluation.result.ctaProjection?.renderedLabel === "Hablar por WhatsApp",
      ),
      "Daniel CTA is not wellness/WhatsApp appropriate.",
    );
  });

  check("display selection is deterministic", () => {
    const fixture = getEngineLabFixture("gardener");
    const draft = draftFromFixture(fixture);
    const intent = intentFromFixtureDraft(fixture, draft, NOW);
    const content = adapterContentFromFixtureDraft(fixture, draft);
    const pool = generatePool(intent);
    const first = selectPerceptuallyDistinctCandidates(pool.evaluated, content, {
      runtimeContext: DESKTOP,
    });
    const second = selectPerceptuallyDistinctCandidates(pool.evaluated, content, {
      runtimeContext: DESKTOP,
    });
    assert(
      JSON.stringify(selectedSummary(first)) === JSON.stringify(selectedSummary(second)),
      "Repeated display selection changed the trio.",
    );
  });

  check("display selection does not mutate Engine or content inputs", () => {
    const fixture = getEngineLabFixture("gardener");
    const draft = draftFromFixture(fixture);
    const intent = intentFromFixtureDraft(fixture, draft, NOW);
    const content = adapterContentFromFixtureDraft(fixture, draft);
    const pool = generatePool(intent);
    const beforePool = JSON.stringify(pool.evaluated);
    const beforeContent = JSON.stringify(content);
    selectPerceptuallyDistinctCandidates(pool.evaluated, content, { runtimeContext: DESKTOP });
    assert(JSON.stringify(pool.evaluated) === beforePool, "Engine candidates were mutated.");
    assert(JSON.stringify(content) === beforeContent, "Adapter content was mutated.");
  });

  check("card-right stays semantic at mobile width", () => {
    const fixture = getEngineLabFixture("gardener");
    const draft = draftFromFixture(fixture);
    const intent = intentFromFixtureDraft(fixture, draft, NOW);
    const content = adapterContentFromFixtureDraft(fixture, draft);
    const pool = generatePool(intent);
    const selection = selectPerceptuallyDistinctCandidates(pool.evaluated, content, {
      runtimeContext: MOBILE,
    });
    const right = selection.displayed.find(
      ({ candidate }) => candidate.recipe.design.card.media_position === "right",
    );
    assert(right, "Mobile selection has no right-media Engine recipe.");
    assert(
      right.evaluation.result.projection.cardMediaPosition === "right",
      "Adapter changed right to bottom instead of leaving stacking to CSS.",
    );
  });

  check("quality-first selection preserves usable media variants across mandatory QA", () => {
    const displayed = [...scenarioResults.values()].flatMap(({ selection }) => selection.displayed);
    assert(
      displayed.some(({ signature }) => signature.cardMediaPosition === "bottom"),
      "No bottom-media proposal was selected.",
    );
    assert(
      displayed.some(({ signature }) => signature.cardMediaPosition === "none"),
      "No no-media/button proposal was selected.",
    );
  });

  check("a contrast-safe pairing is selected for every display slot", () => {
    const displayed = [...scenarioResults.values()].flatMap(({ selection }) => selection.displayed);
    assert(
      displayed.length > 0 &&
        displayed.every(({ evaluation }) => evaluation.result.contrast?.status === "PASS"),
      "A selected pairing did not pass the contrast guard.",
    );
  });

  check("gardener uses stronger unlocked CTA and keeps Engine high-info labels", () => {
    const gardener = scenarioResults.get("gardener");
    assert(gardener, "Gardener scenario did not run.");
    assert(
      gardener.selection.displayed.every(
        ({ evaluation }) =>
          evaluation.result.ctaProjection?.renderedLabel === "Solicitar evaluación",
      ),
      "Gardener did not upgrade its low-information Engine action.",
    );
    const wellness = scenarioResults.get("wellness");
    assert(
      wellness?.selection.displayed.every(({ evaluation }) => {
        const cta = evaluation.result.ctaProjection;
        return (
          cta?.classification !== "high_information" || cta.renderedLabel === cta.originalLabel
        );
      }),
      "Wellness high-information CTA was not preserved as a high-information label.",
    );
  });

  check("selected cards never expose a generic Globe media area", () => {
    const displayed = [...scenarioResults.values()].flatMap(({ selection }) => selection.displayed);
    assert(
      displayed.every(({ evaluation }) =>
        evaluation.result.mediaDiagnostics.every(
          ({ sourceType, effectiveMediaMode }) =>
            sourceType !== "generic_fallback" || effectiveMediaMode === "none",
        ),
      ),
      "A generic platform fallback still occupies card media space.",
    );
  });

  check("quality floor and contrast diagnostics are deterministic", () => {
    for (const { selection } of scenarioResults.values()) {
      assert(selection.displayed.length === 3, "Quality guard removed a display slot.");
      assert(
        selection.bestAchievableMinimumTotal >= selection.selectedMinimumTotal,
        "Quality floor metadata is inconsistent.",
      );
      assert(
        selection.displayed.every(
          ({ evaluation }) => evaluation.result.contrast?.status !== "FAIL",
        ),
        "A contrast-failing pairing reached the display set.",
      );
    }
  });

  check("contrast-failing pairing is excluded and rejection stays deterministic", () => {
    const fixture = getEngineLabFixture("gardener");
    const draft = draftFromFixture(fixture);
    const content = adapterContentFromFixtureDraft(fixture, draft);
    const pool = generatePool(intentFromFixtureDraft(fixture, draft, NOW));
    const failingCandidate = JSON.parse(
      JSON.stringify(pool.evaluated[0]),
    ) as CandidateSetV1["evaluated"][number];
    failingCandidate.recipe.design.palette.text = failingCandidate.recipe.design.palette.background;
    failingCandidate.recipe.design.palette.text_muted =
      failingCandidate.recipe.design.palette.background;
    const candidates = [failingCandidate, ...pool.evaluated.slice(1)];
    const first = selectPerceptuallyDistinctCandidates(candidates, content, {
      runtimeContext: DESKTOP,
    });
    const second = selectPerceptuallyDistinctCandidates(candidates, content, {
      runtimeContext: DESKTOP,
    });
    assert(first.contrastRejectedPairCount > 0, "Contrast-failing pair was not rejected.");
    assert(
      JSON.stringify(selectedSummary(first)) === JSON.stringify(selectedSummary(second)),
      "Rejection changed nondeterministically.",
    );
  });

  check("balanced selector maximizes minimum quality before distance", () => {
    const gardener = scenarioResults.get("gardener");
    assert(gardener, "Gardener scenario did not run.");
    assert(gardener.selection.qualityTargetSatisfied, "Gardener missed the primary quality band.");
    assert(gardener.selection.selectedMinimumTotal === 90, "Gardener minimum total is not 90.");
    assert(
      Math.min(
        ...gardener.selection.displayed.map(({ candidate }) => candidate.score.business_fit),
      ) === 92,
      "Gardener minimum business fit is not 92.",
    );
    assert(
      Math.min(
        ...gardener.selection.displayed.map(({ candidate }) => candidate.score.conversion_fit),
      ) === 97,
      "Gardener minimum conversion fit is not 97.",
    );
  });

  check("weak social_first candidate is skipped when a stronger diverse alternative exists", () => {
    const gardener = scenarioResults.get("gardener");
    assert(gardener, "Gardener scenario did not run.");
    assert(
      !gardener.selection.displayed.some(({ candidate }) => candidate.id === "creator_social#2.1"),
      "The weak social_first candidate entered the balanced gardener trio.",
    );
  });

  check("palette alone does not satisfy diversity", () => {
    const gardener = scenarioResults.get("gardener");
    assert(gardener, "Gardener scenario did not run.");
    const signature = gardener.selection.displayed[0]!.signature;
    const paletteOnly = { ...signature, palette: `${signature.palette}-different` };
    assert(
      perceptualDistance(signature, paletteOnly) === 1,
      "Palette received more than a minor diversity tie-break weight.",
    );
  });

  check("fallback remains deterministic when fewer than three meet targets", () => {
    const wellness = scenarioResults.get("wellness");
    assert(wellness, "Wellness scenario did not run.");
    assert(
      !wellness.selection.qualityTargetSatisfied,
      "Wellness unexpectedly entered the primary band.",
    );
    const fixture = getEngineLabFixture("wellness");
    const draft = draftFromFixture(fixture);
    const intent = intentFromFixtureDraft(fixture, draft, NOW);
    const content = adapterContentFromFixtureDraft(fixture, draft);
    const pool = generatePool(intent);
    const repeat = selectPerceptuallyDistinctCandidates(pool.evaluated, content, {
      runtimeContext: DESKTOP,
    });
    assert(
      JSON.stringify(selectedSummary(wellness.selection)) ===
        JSON.stringify(selectedSummary(repeat)),
      "Fallback selection changed nondeterministically.",
    );
  });

  const passedCount = checks.filter(({ passed }) => passed).length;
  return {
    passed: passedCount === checks.length,
    total: checks.length,
    passedCount,
    cases: checks,
  };
}
