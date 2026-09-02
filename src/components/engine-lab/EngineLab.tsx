import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { BasicTemplateRenderer } from "@/components/basic-template/BasicTemplateRenderer";
import {
  runBasicEditorAdapterSelfCheck,
  selectPerceptuallyDistinctCandidates,
  type BasicEditorAdapterContentV1,
  type DisplayedCandidateV1,
} from "@/lib/basic-editor-adapter";
import { getTemplates } from "@/lib/basic-templates/catalog";
import {
  generateCandidateSet,
  normalizeIntent,
  refineOptions,
  type CandidateSetV1,
  type EngineOptions,
  type OnboardingIntentV1,
  type PrimaryActionType,
  type PrimaryGoal,
  type RefinementCommand,
  type VisualPersonality,
} from "@/lib/parametric-engine";
import { getRendererCapabilities, toEngineRendererCapabilities } from "@/lib/renderer-capabilities";
import {
  ENGINE_LAB_FIXTURES,
  adapterContentFromFixtureDraft,
  draftFromFixture,
  fixtureAssetSet,
  getEngineLabFixture,
  intentFromFixtureDraft,
  type EngineLabDraft,
} from "./fixtures";
import { runEngineLabQualitySelfCheck } from "./engine-lab-quality.selfcheck";

const FIXED_NOW = "2026-09-02T00:00:00.000Z";
const DESKTOP_PREVIEW_WIDTH = 500;
const MOBILE_PREVIEW_WIDTH = 360;
const DEFAULT_FIXTURE = getEngineLabFixture("gardener");

interface LabRun {
  readonly fixtureId: string;
  readonly intent: OnboardingIntentV1;
  readonly content: BasicEditorAdapterContentV1;
  readonly options: EngineOptions;
  readonly candidateSet: CandidateSetV1;
}

const DEFAULT_DRAFT = draftFromFixture(DEFAULT_FIXTURE);
const DEFAULT_OPTIONS: EngineOptions = {
  overrides: { hero_mode: "banner_avatar" },
  now: FIXED_NOW,
};

const REFINEMENTS: readonly { command: RefinementCommand; label: string }[] = [
  { command: "more_premium", label: "Más premium" },
  { command: "more_minimal", label: "Más minimal" },
  { command: "more_visual", label: "Más visual" },
  { command: "more_professional", label: "Más profesional" },
  { command: "more_bold", label: "Más audaz" },
  { command: "more_calm", label: "Más calma" },
  { command: "stronger_cta", label: "CTA más fuerte" },
  { command: "more_trust", label: "Más confianza" },
  { command: "prefer_cards", label: "Preferir cards" },
  { command: "prefer_buttons", label: "Preferir botones" },
  { command: "prefer_banner", label: "Preferir banner" },
  { command: "prefer_avatar", label: "Preferir avatar" },
  { command: "prefer_banner_avatar", label: "Banner + avatar" },
  { command: "another_composition", label: "Otra composición" },
];

function runtimeContext(containerWidth: number) {
  return { containerWidth, surface: "editor_preview" as const };
}

function generationOptions(options: EngineOptions, templateId: string, count: number) {
  const capabilities = toEngineRendererCapabilities(
    getRendererCapabilities(templateId, runtimeContext(DESKTOP_PREVIEW_WIDTH)),
  );
  return {
    count,
    capabilities,
    now: FIXED_NOW,
    ...(options.overrides ? { overrides: options.overrides } : {}),
    ...(options.context ? { context: options.context } : {}),
    ...(options.advanced ? { advanced: options.advanced } : {}),
  };
}

function generateRun(
  fixtureId: string,
  intent: OnboardingIntentV1,
  content: BasicEditorAdapterContentV1,
  options: EngineOptions,
  capabilityTemplateId: string,
  count: number,
): LabRun {
  const capabilities = toEngineRendererCapabilities(
    getRendererCapabilities(capabilityTemplateId, runtimeContext(DESKTOP_PREVIEW_WIDTH)),
  );
  const resolvedOptions: EngineOptions = { ...options, capabilities, now: FIXED_NOW };
  return {
    fixtureId,
    intent,
    content,
    options: resolvedOptions,
    candidateSet: generateCandidateSet(
      intent,
      generationOptions(resolvedOptions, capabilityTemplateId, count),
    ),
  };
}

function initialRun(): LabRun {
  return generateRun(
    DEFAULT_FIXTURE.id,
    intentFromFixtureDraft(DEFAULT_FIXTURE, DEFAULT_DRAFT, FIXED_NOW),
    adapterContentFromFixtureDraft(DEFAULT_FIXTURE, DEFAULT_DRAFT),
    DEFAULT_OPTIONS,
    "beauty-curve",
    3,
  );
}

function statusTone(status: string): string {
  if (status === "compatible") return "bg-emerald-100 text-emerald-800";
  if (status === "compatible_with_downgrade") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function qualityGaps(candidate: DisplayedCandidateV1["candidate"]): string[] {
  const score = candidate.score;
  const targets = [
    ["accessibility", score.accessibility, 100],
    ["business", score.business_fit, 90],
    ["conversion", score.conversion_fit, 85],
    ["content", score.content_fit, 85],
    ["coherence", score.visual_coherence, 90],
    ["mobile", score.mobile_viability, 85],
    ["capability", score.capability_fit, 90],
    ["total", score.total, 90],
  ] as const;
  return targets
    .filter(([, value, target]) => value < target)
    .map(([label, value, target]) => `${label} ${value}<${target}`);
}

function CandidatePanel({
  displayed,
  content,
  fixtureId,
  previewWidth,
}: {
  displayed: DisplayedCandidateV1;
  content: BasicEditorAdapterContentV1;
  fixtureId: string;
  previewWidth: number;
}) {
  const { candidate, evaluation, evaluations, signature } = displayed;
  const compatible = evaluations.filter(({ result }) => result.renderable);
  const incompatible = evaluations.filter(({ result }) => !result.renderable);
  const gaps = qualityGaps(candidate);
  const result = evaluation.result;
  const assignedAssets = {
    avatar: result.config.content.profile.avatarUrl,
    banner: result.config.content.profile.heroUrl,
    cards: result.config.content.cards.map(({ id, imageUrl, mediaMode, mediaPosition }) => ({
      id,
      imageUrl,
      mediaMode,
      mediaPosition,
    })),
    mediaDiagnostics: result.mediaDiagnostics,
  };

  return (
    <article
      className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      data-testid={`engine-candidate-${displayed.slot.toLowerCase()}`}
      data-template-id={evaluation.templateId}
      data-hero-geometry={signature.heroGeometry}
      data-card-media={signature.cardMediaPosition}
      data-preview-width={previewWidth}
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Candidate {displayed.slot} · {displayed.directionLabel}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {candidate.recipe.meta.family} · {candidate.pattern}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Engine #{displayed.sourceIndex + 1} · {candidate.id} · {evaluation.templateName}
            </p>
          </div>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
            {candidate.score.total}/100
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-medium ${statusTone(result.status)}`}>
            {result.status}
          </span>
          <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-800">
            {signature.heroGeometry} hero
          </span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-800">
            {signature.linksPresentation} · media {signature.cardMediaPosition}
          </span>
          <span className="rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-800">
            {signature.density} · {signature.buttonStyle}/{signature.buttonRadius}
          </span>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-600">{displayed.selectionReason}</p>
        {gaps.length > 0 ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900">
            Selection target gaps: {gaps.join(", ")}. Scores are frozen Engine diagnostics.
          </p>
        ) : (
          <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-900">
            Meets all display-selection score targets.
          </p>
        )}
      </div>

      <div className="overflow-x-auto bg-slate-100 p-3 sm:p-5">
        <div
          className="mx-auto h-[720px] overflow-y-auto overflow-x-hidden rounded-[28px] border-[7px] border-slate-950 bg-white shadow-xl"
          style={{ width: previewWidth, minWidth: previewWidth }}
          data-testid={`candidate-${displayed.slot.toLowerCase()}-preview`}
        >
          <BasicTemplateRenderer config={result.config} width={previewWidth} />
        </div>
      </div>

      <div className="space-y-4 border-t border-slate-200 px-5 py-4 text-sm">
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
          <span>
            Template <strong className="text-slate-900">{evaluation.templateId}</strong>
          </span>
          <span>
            Viewport <strong className="text-slate-900">{previewWidth}px</strong>
          </span>
          <span>
            recipeCardMediaPosition{" "}
            <strong className="text-slate-900">
              {candidate.recipe.design.card.media_position}
            </strong>
          </span>
          <span>
            effectiveCardMediaPosition{" "}
            <strong className="text-slate-900">{signature.cardMediaPosition}</strong>
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          <p>
            <strong>Engine CTA:</strong> {result.ctaProjection?.originalLabel ?? "unavailable"}
          </p>
          <p>
            <strong>Rendered CTA:</strong> {result.ctaProjection?.renderedLabel ?? "unavailable"}
          </p>
          <p>
            <strong>Policy:</strong> {result.ctaProjection?.reason ?? "unavailable"}
          </p>
          <p>
            <strong>CTA classification:</strong>{" "}
            {result.ctaProjection?.classification ?? "unavailable"}
          </p>
          <p>
            <strong>Fixture preferred:</strong>{" "}
            {result.ctaProjection?.fixturePreferredLabel ?? "none"}
          </p>
        </div>

        {result.downgrades.length ? (
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Explicit downgrades:</strong>{" "}
            {result.downgrades.map(({ code }) => code).join(", ")}
          </div>
        ) : null}

        <details className="rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-3 py-2 font-medium text-slate-800">
            Quality dimensions
          </summary>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-200 p-3 text-xs">
            {Object.entries(candidate.score).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <dt className="text-slate-500">{key}</dt>
                <dd className="font-mono font-semibold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </details>

        <details className="rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-3 py-2 font-medium text-slate-800">
            Adapter + Engine debug
          </summary>
          <div className="space-y-3 border-t border-slate-200 p-3 text-xs">
            <DebugValue
              label="Engine candidate index / id"
              value={{ index: displayed.sourceIndex, id: candidate.id }}
            />
            <DebugValue label="Engine score" value={candidate.score} />
            <DebugValue
              label="Family / composition"
              value={{ family: candidate.recipe.meta.family, pattern: candidate.pattern }}
            />
            <DebugValue
              label="Selected template / geometry"
              value={{
                template: evaluation.templateId,
                geometry: signature.heroGeometry,
                viewportWidth: previewWidth,
              }}
            />
            <DebugValue label="Structural fingerprint" value={candidate.fingerprint} />
            <DebugValue label="Engine structural signature" value={candidate.signature} />
            <DebugValue label="Display diversity signature" value={signature} />
            <DebugValue label="Adapter projection" value={result.projection} />
            <DebugValue label="CTA projection" value={result.ctaProjection} />
            <DebugValue label="Projected contrast guard" value={result.contrast} />
            <DebugValue label="Media diagnostics" value={result.mediaDiagnostics} />
            <DebugValue label="Fixture id" value={fixtureId} />
            <DebugValue label="Asset assignments" value={assignedAssets} />
            <DebugValue label="Downgrades" value={result.downgrades} />
            <DebugValue
              label="Compatible templates"
              value={compatible.map(({ templateId }) => templateId)}
            />
            <DebugValue
              label="Capability-rejected templates"
              value={incompatible.map(({ templateId }) => templateId)}
            />
            <DebugValue label="Declared adapter content" value={content} />
            <DebugValue label="Recipe JSON" value={candidate.recipe} />
          </div>
        </details>
      </div>
    </article>
  );
}

function DebugValue({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function EngineLab() {
  const templates = useMemo(() => getTemplates(), []);
  const selfCheck = useMemo(() => {
    const adapter = runBasicEditorAdapterSelfCheck();
    const lab = runEngineLabQualitySelfCheck();
    return {
      passed: adapter.passed && lab.passed,
      passedCount: adapter.passedCount + lab.passedCount,
      total: adapter.total + lab.total,
      cases: [
        ...adapter.cases.map((testCase) => ({ ...testCase, name: `Adapter · ${testCase.name}` })),
        ...lab.cases.map((testCase) => ({ ...testCase, name: `Lab · ${testCase.name}` })),
      ],
    };
  }, []);
  const [draft, setDraft] = useState<EngineLabDraft>(DEFAULT_DRAFT);
  const [capabilityTemplateId, setCapabilityTemplateId] = useState("beauty-curve");
  const [candidateCount, setCandidateCount] = useState(3);
  const [previewWidth, setPreviewWidth] = useState(DESKTOP_PREVIEW_WIDTH);
  const [run, setRun] = useState<LabRun>(initialRun);
  const [error, setError] = useState<string | null>(null);
  const [refinementNote, setRefinementNote] = useState("Baseline Engine options");
  const selection = useMemo(
    () =>
      selectPerceptuallyDistinctCandidates(run.candidateSet.evaluated, run.content, {
        runtimeContext: runtimeContext(previewWidth),
      }),
    [previewWidth, run.candidateSet.evaluated, run.content],
  );

  const updateDraft = <Key extends keyof EngineLabDraft>(key: Key, value: EngineLabDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const regenerate = (
    fixtureId: string,
    intent: OnboardingIntentV1,
    content: BasicEditorAdapterContentV1,
    options: EngineOptions,
    nextCapabilityTemplateId = capabilityTemplateId,
  ) => {
    try {
      setRun(
        generateRun(fixtureId, intent, content, options, nextCapabilityTemplateId, candidateCount),
      );
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const generateFromControls = () => {
    const fixture = getEngineLabFixture(draft.fixtureId);
    regenerate(
      fixture.id,
      intentFromFixtureDraft(fixture, draft, FIXED_NOW),
      adapterContentFromFixtureDraft(fixture, draft),
      run.options,
    );
    setRefinementNote("Generated from one coherent in-memory business fixture");
  };

  const applyFixture = (fixtureId: string) => {
    const fixture = getEngineLabFixture(fixtureId);
    const nextDraft = draftFromFixture(fixture);
    setDraft(nextDraft);
    regenerate(
      fixture.id,
      intentFromFixtureDraft(fixture, nextDraft, FIXED_NOW),
      adapterContentFromFixtureDraft(fixture, nextDraft),
      DEFAULT_OPTIONS,
    );
    setRefinementNote(`Loaded isolated fixture: ${fixture.label}`);
  };

  const applyRefinement = (command: RefinementCommand) => {
    try {
      const refinement = refineOptions(command, run.options, normalizeIntent(run.intent));
      regenerate(run.fixtureId, run.intent, run.content, refinement.options);
      const changed = refinement.changed.join(", ") || "none";
      const ignored = refinement.ignored.join(", ") || "none";
      setRefinementNote(`${command} · changed: ${changed} · ignored: ${ignored}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const changeCapabilityTemplate = (nextTemplateId: string) => {
    setCapabilityTemplateId(nextTemplateId);
    regenerate(run.fixtureId, run.intent, run.content, run.options, nextTemplateId);
    setRefinementNote(`Generation capability baseline changed to ${nextTemplateId}`);
  };

  const currentFixture = getEngineLabFixture(draft.fixtureId);
  const currentAssets = fixtureAssetSet(currentFixture, draft);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" data-testid="engine-lab">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-[1780px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-teal-400/15 p-3 text-teal-300">
              <FlaskConical className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Frozen Engine → Basic Editor Lab
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Internal route · memory only · no production connection
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${selfCheck.passed ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}
            data-testid="adapter-selfcheck"
          >
            {selfCheck.passed ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            Adapter self-check {selfCheck.passedCount}/{selfCheck.total}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1780px] px-3 py-6 sm:px-6">
        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Business fixture + Engine</h2>
                <p className="mt-1 text-xs text-slate-500">Draft edits apply on Generate.</p>
              </div>
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800">
                V1.5.1
              </span>
            </div>

            <div className="space-y-4">
              <LabField label="QA business fixture">
                <select
                  className="lab-input"
                  value={draft.fixtureId}
                  onChange={(event) => applyFixture(event.target.value)}
                  data-testid="fixture-select"
                >
                  {ENGINE_LAB_FIXTURES.map((fixture) => (
                    <option key={fixture.id} value={fixture.id}>
                      {fixture.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Replaces identity, links, CTA, footer and assets together.
                </p>
              </LabField>

              <LabField label="Business type">
                <input
                  className="lab-input"
                  value={draft.businessType}
                  onChange={(event) => updateDraft("businessType", event.target.value)}
                />
              </LabField>
              <LabField label="Name">
                <input
                  className="lab-input"
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                />
              </LabField>
              <LabField label="Profession">
                <input
                  className="lab-input"
                  value={draft.profession}
                  onChange={(event) => updateDraft("profession", event.target.value)}
                />
              </LabField>
              <LabField label="Bio">
                <textarea
                  className="lab-input min-h-24 resize-y"
                  maxLength={160}
                  value={draft.bio}
                  onChange={(event) => updateDraft("bio", event.target.value)}
                />
              </LabField>

              <div className="grid grid-cols-2 gap-3">
                <LabField label="Primary goal">
                  <select
                    className="lab-input"
                    value={draft.primaryGoal}
                    onChange={(event) =>
                      updateDraft("primaryGoal", event.target.value as PrimaryGoal)
                    }
                  >
                    {(["whatsapp", "booking", "sell", "leads", "portfolio", "social"] as const).map(
                      (goal) => (
                        <option key={goal}>{goal}</option>
                      ),
                    )}
                  </select>
                </LabField>
                <LabField label="Personality">
                  <select
                    className="lab-input"
                    value={draft.personality}
                    onChange={(event) =>
                      updateDraft("personality", event.target.value as VisualPersonality)
                    }
                  >
                    {(
                      [
                        "elegant",
                        "minimal",
                        "modern",
                        "professional",
                        "energetic",
                        "premium",
                      ] as const
                    ).map((personality) => (
                      <option key={personality}>{personality}</option>
                    ))}
                  </select>
                </LabField>
              </div>

              <div className="grid grid-cols-[120px_1fr] gap-3">
                <LabField label="Action type">
                  <select
                    className="lab-input"
                    value={draft.actionType}
                    onChange={(event) =>
                      updateDraft("actionType", event.target.value as PrimaryActionType)
                    }
                  >
                    {(["whatsapp", "booking", "website", "instagram", "email"] as const).map(
                      (action) => (
                        <option key={action}>{action}</option>
                      ),
                    )}
                  </select>
                </LabField>
                <LabField label="Destination">
                  <input
                    className="lab-input"
                    value={draft.actionValue}
                    onChange={(event) => updateDraft("actionValue", event.target.value)}
                  />
                </LabField>
              </div>

              <LabField label="Contextual CTA candidate">
                <input
                  className="lab-input"
                  value={draft.primaryActionLabel}
                  onChange={(event) => updateDraft("primaryActionLabel", event.target.value)}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Applied only when the Engine label is generic and CTA copy is unlocked.
                </p>
              </LabField>

              <div className="grid grid-cols-4 gap-2">
                <LabToggle
                  label="Avatar"
                  checked={draft.hasAvatar}
                  onChange={(checked) => updateDraft("hasAvatar", checked)}
                />
                <LabToggle
                  label="Banner"
                  checked={draft.hasBanner}
                  onChange={(checked) => updateDraft("hasBanner", checked)}
                />
                <LabToggle
                  label="Cards"
                  checked={draft.hasCardMedia}
                  onChange={(checked) => updateDraft("hasCardMedia", checked)}
                />
                <LabToggle
                  label="CTA lock"
                  checked={draft.lockPrimaryCta}
                  onChange={(checked) => updateDraft("lockPrimaryCta", checked)}
                />
              </div>

              <LabField label="Generation capability baseline">
                <select
                  className="lab-input"
                  value={capabilityTemplateId}
                  onChange={(event) => changeCapabilityTemplate(event.target.value)}
                  data-testid="template-filter"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · {template.id}
                    </option>
                  ))}
                </select>
              </LabField>

              <LabField label="Engine shortlist count">
                <select
                  className="lab-input"
                  value={candidateCount}
                  onChange={(event) => setCandidateCount(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Displayed A/B/C are selected from the full evaluated pool.
                </p>
              </LabField>

              <button
                type="button"
                onClick={generateFromControls}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                data-testid="generate-candidates"
              >
                <RefreshCw className="h-4 w-4" /> Generate real candidates
              </button>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-4 rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-800"
              >
                {error}
              </div>
            ) : null}

            <div className="mt-6 border-t border-slate-200 pt-5">
              <h2 className="font-semibold">Real Engine refinements</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Every control calls frozen refineOptions, then reruns display selection.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {REFINEMENTS.map(({ command, label }) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => applyRefinement(command)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900"
                    data-refinement={command}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p
                className="mt-3 rounded-lg bg-slate-100 p-2 text-[11px] leading-5 text-slate-600"
                data-testid="refinement-note"
              >
                {refinementNote}
              </p>
            </div>

            <details className="mt-5 rounded-xl border border-slate-200">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">
                Fixture asset ownership
              </summary>
              <div className="border-t border-slate-200 p-3">
                <DebugValue label={currentFixture.id} value={currentAssets} />
              </div>
            </details>

            <details className="mt-3 rounded-xl border border-slate-200">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">
                Self-check detail
              </summary>
              <ul className="space-y-2 border-t border-slate-200 p-3 text-xs">
                {selfCheck.cases.map((testCase) => (
                  <li key={testCase.name} className="flex items-start gap-2">
                    {testCase.passed ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                    )}
                    <span>
                      {testCase.name}
                      {testCase.passed ? "" : `: ${testCase.detail}`}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Perceptual candidate set
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    Real Engine recipes × all active Basic renderers
                  </h2>
                </div>
                <div
                  className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1"
                  data-testid="preview-width-control"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewWidth(DESKTOP_PREVIEW_WIDTH)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${previewWidth === DESKTOP_PREVIEW_WIDTH ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  >
                    <Monitor className="h-4 w-4" />
                    Desktop 500
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewWidth(MOBILE_PREVIEW_WIDTH)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${previewWidth === MOBILE_PREVIEW_WIDTH ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile 360
                  </button>
                </div>
              </div>

              <dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt>Engine evaluated</dt>
                  <dd className="font-semibold text-slate-950">{selection.poolSize}</dd>
                </div>
                <div>
                  <dt>Valid candidate/template pairs</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.validPairingCount}/{selection.totalCandidateTemplatePairings}
                  </dd>
                </div>
                <div>
                  <dt>Capability-rejected pairs</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.capabilityRejectedPairCount}
                  </dd>
                </div>
                <div>
                  <dt>Contrast-rejected pairs</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.contrastRejectedPairCount}
                  </dd>
                </div>
                <div>
                  <dt>Contrast NOT_VERIFIABLE</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.contrastNotVerifiablePairCount}
                  </dd>
                </div>
                <div>
                  <dt>Generic fallback suppressed</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.genericFallbackSuppressedPairCount}
                  </dd>
                </div>
                <div>
                  <dt>Duplicate Engine fingerprints</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.duplicateCandidatesSkipped}
                  </dd>
                </div>
                <div>
                  <dt>Family+pattern combos skipped</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.familyPatternDuplicateCombinationsSkipped}
                  </dd>
                </div>
                <div>
                  <dt>Near-duplicate combos skipped</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.nearDuplicateCombinationsSkipped}
                  </dd>
                </div>
                <div>
                  <dt>Guard relaxed</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.duplicateGuardRelaxed ? "yes" : "no"}
                  </dd>
                </div>
                <div>
                  <dt>Engine rejected pre-selection</dt>
                  <dd className="font-semibold text-slate-950">
                    {run.candidateSet.rejected.length}
                  </dd>
                </div>
                <div>
                  <dt>Selected minimum total</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.selectedMinimumTotal}/100
                  </dd>
                </div>
                <div>
                  <dt>Best achievable minimum</dt>
                  <dd className="font-semibold text-slate-950">
                    {selection.bestAchievableMinimumTotal}/100
                  </dd>
                </div>
              </dl>
              <p
                className={`mt-3 rounded-lg px-3 py-2 text-xs leading-5 ${selection.qualityTargetSatisfied ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
              >
                Quality floor:{" "}
                {selection.qualityTargetSatisfied
                  ? "3/3 at or above 90"
                  : `best achievable minimum ${selection.bestAchievableMinimumTotal}; limiting dimensions: ${selection.qualityLimitingDimensions.join(", ") || "none"}`}
              </p>
              <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-900">
                The set optimizer weighs Engine quality plus mutual distance. Family, composition,
                hero geometry and links dominate; palette is a one-point tie-breaker.
              </p>
            </div>

            {selection.displayed.length === 3 ? (
              <div className="grid min-w-0 gap-5 2xl:grid-cols-2">
                {selection.displayed.map((displayed) => (
                  <CandidatePanel
                    key={`${displayed.slot}-${displayed.candidate.fingerprint}-${displayed.evaluation.templateId}`}
                    displayed={displayed}
                    content={run.content}
                    fixtureId={run.fixtureId}
                    previewWidth={previewWidth}
                  />
                ))}
              </div>
            ) : (
              <div
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900"
              >
                The current capability pool cannot produce three safely distinct
                curved/fusion/straight pairings.
              </div>
            )}
          </div>
        </section>
      </main>
      <style>{`.lab-input { width: 100%; border-radius: .65rem; border: 1px solid #cbd5e1; background: #fff; padding: .55rem .65rem; color: #0f172a; font-size: .8rem; outline: none; } .lab-input:focus { border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,.12); }`}</style>
    </div>
  );
}

function LabField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function LabToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2 text-center text-[11px] font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-teal-600"
      />
      {label}
    </label>
  );
}
