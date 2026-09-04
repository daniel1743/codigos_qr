import { useEffect, useMemo, useState } from "react";
import { PublicTemplateRenderer } from "@/premium-template-studio/engine/PublicTemplateRenderer";
import { fetchDeepSeekSupervisorReview } from "../ai";
import type { SupervisorOutcome } from "../ai";
import { fetchCuratedMedia } from "../media";
import type { CuratedMediaResult, MediaProvider, MediaRole } from "../media";
import { buildVisualQaScenarioPreviews, type EngineV2PlaygroundPreview } from "./playground-model";
import { VISUAL_QA_CASES } from "./visualQaCases";

const MEDIA_ROLE_OPTIONS: readonly MediaRole[] = [
  "avatar",
  "banner",
  "background",
  "gallery",
  "portfolio",
  "media-card",
  "video",
];
const PROFESSION_OPTIONS = [
  "manicurist",
  "hairdresser",
  "barber",
  "gardener",
  "fitness-trainer",
  "restaurant",
  "beauty-aesthetician",
  "consultant",
  "creator",
  "real-estate-agent",
] as const;
const STYLE_OPTIONS = [
  "minimal",
  "elegant",
  "luxury",
  "modern",
  "creative",
  "energetic",
  "natural",
  "professional",
  "warm",
  "dark-premium",
] as const;

function backgroundStrategy(preview: EngineV2PlaygroundPreview): string {
  const background = preview.candidate.recipe.visual.background;
  if (background.type === "gradient") return `${background.gradient?.kind ?? "gradient"} gradient`;
  if (background.type === "image")
    return `image${background.blur ? ` + blur ${background.blur}px` : ""}`;
  if (background.type === "pattern") return `pattern/${background.pattern ?? "custom"}`;
  return `solid ${background.color ?? ""}`.trim();
}

function blockSequence(preview: EngineV2PlaygroundPreview): string {
  return preview.candidate.recipe.structure.blocks.map((block) => block.type).join(" → ");
}

function frameStrategy(preview: EngineV2PlaygroundPreview): string {
  const frames = new Set(preview.candidate.recipe.structure.blocks.map((block) => block.frame));
  return [...frames].join(", ");
}

function behaviorStrategy(preview: EngineV2PlaygroundPreview): string {
  const blocks = preview.candidate.recipe.structure.blocks;
  const behaviors = [
    blocks.some((block) => block.layout.sticky?.enabled) ? "sticky" : "",
    blocks.some((block) => block.layout.floating?.enabled) ? "floating" : "",
    preview.candidate.recipe.visual.motion.preset !== "none" ? "motion" : "no motion",
  ].filter(Boolean);
  return behaviors.join(" · ");
}

function selectedMediaForSupervisor(media: CuratedMediaResult | undefined) {
  if (!media) return [];
  return Object.entries(media.assets).flatMap(([role, assets]) =>
    (assets ?? []).map((asset) => ({
      role: role as MediaRole,
      provider: asset.provider,
      query: asset.queryUsed,
      alt: asset.alt,
    })),
  );
}

function mediaAssetSummary(media: CuratedMediaResult | undefined): string[] {
  if (!media) return [];
  return Object.entries(media.assets).flatMap(([role, assets]) =>
    (assets ?? [])
      .slice(0, 3)
      .map((asset) => `${role}: ${asset.provider} · ${asset.creatorName || "unknown creator"}`),
  );
}

function mediaDebug(media: CuratedMediaResult | undefined) {
  if (!media) return null;
  return (
    <div className="mt-4 grid gap-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-300">
      <p className="font-semibold text-slate-100">Curated media debug · normalized only</p>
      {Object.entries(media.assets).map(([role, assets]) => (
        <div key={role}>
          <span className="font-semibold text-cyan-200">{role}:</span>{" "}
          {(assets ?? []).slice(0, 3).map((asset) => (
            <span key={`${asset.provider}-${asset.providerId}`} className="mr-2 inline-block">
              {asset.provider} · {asset.queryUsed} · {asset.creatorName || "creator unavailable"}{" "}
              <a
                className="text-cyan-300 underline"
                href={asset.sourcePage}
                target="_blank"
                rel="noreferrer"
              >
                source
              </a>
            </span>
          ))}
        </div>
      ))}
      {Object.keys(media.assets).length === 0 && <p>No coherent provider media was returned.</p>}
    </div>
  );
}

function supervisorDebug(outcome: SupervisorOutcome | null) {
  if (!outcome) return null;
  return (
    <div className="mt-4 rounded-xl border border-violet-800/70 bg-violet-950/20 p-3 text-xs text-slate-300">
      <p className="font-semibold text-violet-200">DeepSeek Supervisor</p>
      {outcome.status === "unavailable" || !outcome.evaluation ? (
        <p className="mt-1">
          Unavailable ({outcome.errorCode}); deterministic Engine output preserved.
        </p>
      ) : (
        <>
          <p className="mt-1">
            Verdict: <strong>{outcome.evaluation.verdict}</strong> · coherence{" "}
            {outcome.evaluation.coherence_score}/100
          </p>
          {outcome.evaluation.warnings.length > 0 && (
            <p>Warnings: {outcome.evaluation.warnings.join(" · ")}</p>
          )}
          {outcome.evaluation.suggestions.length > 0 && (
            <p>
              Controlled suggestions:{" "}
              {outcome.evaluation.suggestions.map((item) => item.adjustment).join(" · ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PreviewMeta({ preview }: { preview: EngineV2PlaygroundPreview }) {
  const theme = preview.candidate.recipe.visual;
  return (
    <dl className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2 xl:grid-cols-3">
      <div>
        <dt className="font-semibold text-slate-100">Family / layout</dt>
        <dd>
          {preview.family} / {preview.layout}
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-100">Quality / fingerprint</dt>
        <dd>
          {preview.qualityScore} / {preview.fingerprint}
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-100">Media strategy</dt>
        <dd>{preview.candidate.recipe.semantics.media_strategy}</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-100">Top composition</dt>
        <dd>
          {preview.candidate.recipe.semantics.top_signature} · {preview.candidate.recipe.layout.header} · banner{" "}
          {preview.candidate.recipe.banner.enabled ? "on" : "off"}
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-100">Typography</dt>
        <dd>
          {preview.candidate.recipe.visual.typography.headingFont} / {preview.candidate.recipe.visual.typography.bodyFont}
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-100">Background</dt>
        <dd>{backgroundStrategy(preview)}</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-100">Block sequence</dt>
        <dd>{blockSequence(preview)}</dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-100">Button / card</dt>
        <dd>
          {theme.buttons.variant} / {theme.cards.preset} · blur {theme.cards.blur}px · opacity{" "}
          {theme.cards.opacity}
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-100">Texture / frame</dt>
        <dd>
          {theme.texture.preset} / {frameStrategy(preview)}
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-100">Important tokens</dt>
        <dd>
          primary {theme.colors.primary} · surface {theme.colors.surface} · radius{" "}
          {theme.cards.radius}px
        </dd>
      </div>
      <div>
        <dt className="font-semibold text-slate-100">Behavior</dt>
        <dd>{behaviorStrategy(preview)}</dd>
      </div>
    </dl>
  );
}

/**
 * Local visual QA only. It is intentionally not imported by production
 * routes; mount it from the guarded development route to inspect output.
 */
export function EngineV2PowerEditorPlayground() {
  const [selectedScenarioId, setSelectedScenarioId] = useState(VISUAL_QA_CASES[0]!.id);
  const [generation, setGeneration] = useState(0);
  const [mediaProvider, setMediaProvider] = useState<MediaProvider>("auto");
  const [liveMedia, setLiveMedia] = useState(false);
  const [aiSupervisor, setAiSupervisor] = useState(false);
  const [profession, setProfession] = useState<(typeof PROFESSION_OPTIONS)[number]>("manicurist");
  const [style, setStyle] = useState<(typeof STYLE_OPTIONS)[number]>("luxury");
  const [selectedRoles, setSelectedRoles] = useState<MediaRole[]>([
    "banner",
    "background",
    "gallery",
    "video",
  ]);
  const [media, setMedia] = useState<CuratedMediaResult>();
  const [mediaStatus, setMediaStatus] = useState("Static fixture media");
  const [supervisor, setSupervisor] = useState<SupervisorOutcome | null>(null);
  const previews = useMemo(
    () =>
      buildVisualQaScenarioPreviews({
        scenarioId: selectedScenarioId,
        candidateCount: 12,
        now: new Date(generation * 1000).toISOString(),
        ...(liveMedia && media ? { media } : {}),
      }),
    [generation, liveMedia, media, selectedScenarioId],
  );
  const scenario =
    VISUAL_QA_CASES.find((item) => item.id === selectedScenarioId) ?? VISUAL_QA_CASES[0]!;
  const scenarioPreviews = previews.filter((preview) => preview.scenarioId === scenario.id);
  const firstPreview = scenarioPreviews[0];

  useEffect(() => {
    if (!liveMedia || selectedRoles.length === 0) {
      setMedia(undefined);
      setMediaStatus("Static fixture media");
      return;
    }
    let active = true;
    setMediaStatus("Loading normalized media from server…");
    void fetchCuratedMedia({
      data: {
        profession,
        style,
        goal: scenario.qaGoal,
        roles: selectedRoles,
        provider: mediaProvider,
      },
    })
      .then((result) => {
        if (!active) return;
        setMedia(result);
        setMediaStatus("Live media loaded; user-provided media would remain higher priority");
      })
      .catch(() => {
        if (!active) return;
        setMedia(undefined);
        setMediaStatus("Provider unavailable; deterministic fixture media preserved");
      });
    return () => {
      active = false;
    };
  }, [liveMedia, mediaProvider, profession, scenario.qaGoal, selectedRoles, style]);

  useEffect(() => {
    if (!aiSupervisor || !firstPreview) {
      setSupervisor(null);
      return;
    }
    let active = true;
    const first = firstPreview;
    void fetchDeepSeekSupervisorReview({
      data: {
        userIntent: {
          profession,
          goal: scenario.qaGoal,
          style,
          selectedFeatures: Object.keys(scenario.content),
          availableUserMedia: [
            "avatar",
            ...(scenario.intent.identity.banner_preview ? ["banner"] : []),
          ],
        },
        selectedMedia: selectedMediaForSupervisor(media),
        engineSummary: {
          family: first.family,
          layout: first.layout,
          mediaStrategy: first.candidate.recipe.semantics.media_strategy,
          blockSequence: first.candidate.recipe.structure.blocks.map((block) => block.type),
          ctaStrategy: first.candidate.recipe.structure.primary_cta.emphasis,
          backgroundStrategy: backgroundStrategy(first),
          buttonCardStrategy: `${first.candidate.recipe.visual.buttons.variant}/${first.candidate.recipe.visual.cards.preset}`,
          contentDensity: first.candidate.recipe.semantics.density,
        },
      },
    }).then((result) => {
      if (active) setSupervisor(result);
    });
    return () => {
      active = false;
    };
  }, [aiSupervisor, firstPreview, media, profession, scenario, style]);

  return (
    <main
      className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50 sm:px-6 lg:px-8"
      data-testid="engine-v2-power-editor-playground"
    >
      <div className="mx-auto max-w-[1800px] space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Visual acceptance playground · dev only
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Engine V2 → Frozen Power Editor V2
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Compare real generated candidates before any Cripqer integration. Each candidate is
                rendered by the current public Power Editor in desktop and mobile modes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGeneration((value) => value + 1)}
              className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/40 hover:bg-cyan-200"
            >
              Regenerate candidates
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-200">
              Scenario
              <select
                value={scenario.id}
                onChange={(event) => setSelectedScenarioId(event.target.value)}
                className="min-w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-normal text-slate-100"
              >
                {VISUAL_QA_CASES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-xs text-slate-400">
              <p>
                <span className="font-semibold text-slate-200">Goal:</span> {scenario.qaGoal}
              </p>
              <p>
                <span className="font-semibold text-slate-200">Style:</span> {scenario.qaStyle}
              </p>
              <p>
                <span className="font-semibold text-slate-200">Candidates:</span>{" "}
                {scenarioPreviews.length} · deterministic regeneration #{generation}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 lg:grid-cols-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-200">
              Media provider
              <select
                value={mediaProvider}
                onChange={(event) => setMediaProvider(event.target.value as MediaProvider)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-normal"
              >
                <option value="auto">Auto</option>
                <option value="pexels">Pexels</option>
                <option value="unsplash">Unsplash</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-200">
              Profession
              <select
                value={profession}
                onChange={(event) =>
                  setProfession(event.target.value as (typeof PROFESSION_OPTIONS)[number])
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-normal"
              >
                {PROFESSION_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-200">
              Style
              <select
                value={style}
                onChange={(event) => setStyle(event.target.value as (typeof STYLE_OPTIONS)[number])}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-normal"
              >
                {STYLE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid content-end gap-2 text-sm text-slate-200">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={liveMedia}
                  onChange={(event) => setLiveMedia(event.target.checked)}
                />{" "}
                Use live media
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiSupervisor}
                  onChange={(event) => setAiSupervisor(event.target.checked)}
                />{" "}
                DeepSeek Supervisor
              </label>
              <span className="text-xs text-slate-400">{mediaStatus}</span>
            </div>
            <fieldset className="lg:col-span-4">
              <legend className="text-sm font-semibold text-slate-200">
                Requested media roles
              </legend>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                {MEDIA_ROLE_OPTIONS.map((role) => (
                  <label key={role} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={(event) =>
                        setSelectedRoles((current) =>
                          event.target.checked
                            ? [...current, role]
                            : current.filter((item) => item !== role),
                        )
                      }
                    />{" "}
                    {role}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          {mediaDebug(media)}
          {supervisorDebug(supervisor)}
        </header>

        <section className="grid gap-5">
          {scenarioPreviews.map((preview, index) => (
            <article
              key={`${preview.scenarioId}-${preview.candidateId}-${index}`}
              data-testid="engine-v2-visual-candidate"
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl"
            >
              <div className="border-b border-slate-800 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">
                    Candidate {index + 1}{" "}
                    <span className="text-sm font-normal text-slate-400">
                      ({preview.candidateId})
                    </span>
                  </h2>
                  <span className="rounded-full border border-cyan-800 bg-cyan-950/50 px-3 py-1 text-xs text-cyan-200">
                    {index + 1} / {scenarioPreviews.length}
                  </span>
                </div>
                <div className="mt-4">
                  <PreviewMeta preview={preview} />
                </div>
              </div>
              <div className="grid gap-4 p-4 xl:grid-cols-2">
                <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                  <h3 className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-cyan-200">
                    Desktop preview
                  </h3>
                  <div data-testid="engine-v2-desktop-preview" className="min-h-[720px]">
                    <PublicTemplateRenderer
                      config={preview.candidate.config}
                      breakpoint="desktop"
                    />
                  </div>
                </section>
                <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                  <h3 className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-amber-200">
                    Mobile preview · 390px contract
                  </h3>
                  <div
                    data-testid="engine-v2-mobile-preview"
                    className="mx-auto min-h-[720px] max-w-[390px]"
                  >
                    <PublicTemplateRenderer config={preview.candidate.config} breakpoint="mobile" />
                  </div>
                </section>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
