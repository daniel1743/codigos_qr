import { useState, type ReactNode } from "react";
import type { DiagnosticStatus, GenerationTraceV1 } from "@/lib/generation-inspector/types";
import { DIAGNOSTIC_ICONS } from "@/lib/generation-inspector/types";
import "./generation-inspector.css";

function icon(status: DiagnosticStatus | "OK"): string {
  if (status === "OK") return "✅";
  return DIAGNOSTIC_ICONS[status];
}

const SECTIONS = [
  "Summary",
  "Event Log",
  "Intent",
  "Smart Pages",
  "Host Mapping",
  "PAGES_7",
  "Engine",
  "Visual Authoring",
  "Media",
  "Canonical",
  "Renderer",
  "Raw Trace",
] as const;
type Section = (typeof SECTIONS)[number];

function downloadTrace(trace: GenerationTraceV1, format: "json" | "ndjson") {
  const body =
    format === "json"
      ? JSON.stringify(trace, null, 2)
      : trace.stages.map((stage, index) => JSON.stringify({
          traceId: trace.traceId,
          sequence: index + 1,
          timestamp: trace.startedAt,
          stage: stage.id,
          event: stage.name,
          inputSnapshot: stage.data,
          outputSnapshot: stage.data,
          changes: stage.fields,
          warnings: [],
          classification: stage.status === "ok" ? "PASS" : stage.status.toUpperCase(),
        })).join("\n");
  const blob = new Blob([body], { type: format === "json" ? "application/json" : "application/x-ndjson" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cripqer-blackbox-${trace.traceId}.${format}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="gi-section">
      <h4 className="gi-section__title">{title}</h4>
      <div className="gi-section__body">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="gi-row">
      <span className="gi-row__label">{label}</span>
      <span className="gi-row__value">{value ?? "—"}</span>
    </div>
  );
}

function json(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function GenerationInspector({
  trace,
  onClose,
}: {
  trace: GenerationTraceV1;
  onClose: () => void;
}) {
  const [section, setSection] = useState<Section>("Summary");
  const [copied, setCopied] = useState(false);

  const copyRaw = () => {
    void navigator.clipboard?.writeText(json(trace)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const stageData = (id: string) => trace.stages.find((s) => s.id === id)?.data;

  return (
    <div className="gi-drawer" role="dialog" aria-modal="false" aria-label="Diagnóstico de generación">
      <header className="gi-header">
        <div>
          <span className="gi-header__title">Cripqer Generation Inspector</span>
          <span className="gi-header__trace">{trace.traceId}</span>
        </div>
        <button type="button" className="gi-header__close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </header>

      <nav className="gi-nav">
        {SECTIONS.map((s) => (
          <button
            type="button"
            key={s}
            className={`gi-nav__item ${section === s ? "is-active" : ""}`}
            onClick={() => setSection(s)}
          >
            {s}
          </button>
        ))}
      </nav>

      <main className="gi-main">
        {section === "Summary" && (
          <>
            <SectionBlock title="Diagnóstico">
              <div className="gi-diagnosis__primary">
                <strong>Primera divergencia</strong>
                <p>{trace.firstDivergence ? `${trace.firstDivergence.field}: ${trace.firstDivergence.status}` : "Ninguna"}</p>
              </div>
              <div className="gi-diagnosis">
                <div className="gi-diagnosis__primary">
                  <strong>{trace.diagnostics.primaryIssue ?? "Sin desviación principal"}</strong>
                </div>
                <p className="gi-diagnosis__explanation">{trace.diagnostics.explanation}</p>
                <ul className="gi-diagnosis__findings">
                  {trace.diagnostics.secondaryFindings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            </SectionBlock>

            <SectionBlock title="Salud por capa">
              <div className="gi-summary">
                {Object.entries(trace.summary).map(([layer, health]) => (
                  <div className="gi-summary__row" key={layer}>
                    <span className="gi-summary__icon">{icon(health.status)}</span>
                    <span className="gi-summary__layer">{layer}</span>
                    <span className="gi-summary__evidence">{health.evidence}</span>
                  </div>
                ))}
              </div>
            </SectionBlock>

            {trace.failure && (
              <SectionBlock title="Fallo">
                <div className="gi-failure">
                  <span>❌ {trace.failure.stageName}</span>
                  <code>{trace.failure.code}</code>
                  <p>{trace.failure.message}</p>
                </div>
              </SectionBlock>
            )}
          </>
        )}

        {section === "Intent" && (
          <SectionBlock title="OnboardingIntentV2 (T1)">
            <pre className="gi-json">{json(stageData("T1"))}</pre>
          </SectionBlock>
        )}

        {section === "Event Log" && (
          <SectionBlock title="Event Log — etapas observadas">
            <div className="gi-event-log">
              {trace.stages.map((stage, index) => (
                <details className="gi-event" key={stage.id} open={index === 0}>
                  <summary>
                    <span className="gi-event__sequence">{String(index + 1).padStart(2, "0")}</span>
                    <span className="gi-event__name">{stage.name}</span>
                    <span className={`gi-event__status gi-event__status--${stage.status}`}>{stage.status}</span>
                  </summary>
                  <div className="gi-event__body">
                    <Row label="Contract" value={stage.contract} />
                    <Row label="Classification" value={stage.status === "ok" ? "PASS" : stage.status.toUpperCase()} />
                    <pre className="gi-json">{json(stage.data)}</pre>
                    {stage.fields.length > 0 && <pre className="gi-json">{json(stage.fields)}</pre>}
                  </div>
                </details>
              ))}
            </div>
            <div className="gi-export-actions">
              <button type="button" className="gi-copy" onClick={() => downloadTrace(trace, "json")}>
                Exportar JSON
              </button>
              <button type="button" className="gi-copy" onClick={() => downloadTrace(trace, "ndjson")}>
                Exportar NDJSON
              </button>
            </div>
          </SectionBlock>
        )}

        {section === "Smart Pages" && (
          <>
            <SectionBlock title="PageGenerationRequest (T3)">
              <pre className="gi-json">{json(stageData("T3"))}</pre>
            </SectionBlock>
            <SectionBlock title="PagePlanV1 (T4)">
              <pre className="gi-json">{json(stageData("T4"))}</pre>
            </SectionBlock>
          </>
        )}

        {section === "Host Mapping" && (
          <SectionBlock title="GeneratedPageInput (T5)">
            <pre className="gi-json">{json(stageData("T5"))}</pre>
          </SectionBlock>
        )}

        {section === "PAGES_7" && (
          <SectionBlock title="EngineV2HostGenerationInput (T6)">
            <pre className="gi-json">{json(stageData("T6"))}</pre>
          </SectionBlock>
        )}

        {section === "Engine" && trace.engine && (
          <SectionBlock title="Engine V2 — Estrategia (T7)">
            <Row label="Archetype" value={trace.engine.archetype} />
            <Row label="Business category" value={trace.engine.businessCategory} />
            <Row label="Visual personality" value={trace.engine.visualPersonality} />
            <Row label="Primary goal" value={trace.engine.primaryGoal} />
            <Row label="Selected family" value={trace.engine.selectedFamily} />
            <Row label="Layout" value={trace.engine.layout} />
            <Row label="Pattern" value={trace.engine.pattern} />
            <Row label="Preset" value={trace.engine.preset ?? "—"} />
            <Row label="Media strategy" value={trace.engine.mediaStrategy} />
            <Row label="Score" value={trace.engine.score} />
            <Row label="Candidate" value={trace.engine.candidateId} />
            <div className="gi-engine-scores">
              <div>
                <h5>Family scores (with bias)</h5>
                <pre className="gi-json">{json(trace.engine.familyScores)}</pre>
              </div>
              <div>
                <h5>Family scores (before bias)</h5>
                <pre className="gi-json">{json(trace.engine.familyScoresBeforeBias)}</pre>
              </div>
              <div>
                <h5>Family bias applied</h5>
                <pre className="gi-json">{json(trace.engine.familyBias)}</pre>
              </div>
            </div>
          </SectionBlock>
        )}

        {section === "Visual Authoring" && trace.visual && (
          <SectionBlock title="Visual Authoring (T8)">
            <Row label="Family" value={trace.visual.family} />
            <Row label="Typography" value={json(trace.visual.typography)} />
            <Row label="Colors" value={json(trace.visual.colors)} />
            <Row label="Background" value={json(trace.visual.background)} />
            <Row label="Cards" value={json(trace.visual.cards)} />
            <Row label="Buttons" value={json(trace.visual.buttons)} />
            <Row label="Blocks" value={json(trace.visual.blocks)} />
            <Row label="Selected" value={trace.visual.selected.join(", ") || "—"} />
            <Row label="Not selected" value={trace.visual.notSelected.join(", ") || "—"} />
            <Row label="Unsupported" value={trace.visual.unsupported.join(", ") || "—"} />
          </SectionBlock>
        )}

        {section === "Media" && (
          <SectionBlock title="Contextual Media">
            <Row label="Owner media available" value={trace.media.ownerMediaAvailable ? "SÍ" : "NO"} />
            <Row label="Owner media priority" value={trace.media.ownerMediaPriority ? "SÍ" : "NO"} />
            <Row label="Contextual needed" value={trace.media.contextualMediaNeeded ? "SÍ" : "NO"} />
            <Row label="Contextual allowed" value={trace.media.contextualMediaAllowed ? "SÍ" : "NO"} />
            <Row label="Unsplash" value={trace.media.unsplashConnected ? "CONNECTED" : "NOT_CONNECTED"} />
            <Row label="Pexels" value={trace.media.pexelsConnected ? "CONNECTED" : "NOT_CONNECTED"} />
            <Row label="Search executed" value={trace.media.searchQuery ?? "NO"} />
            <Row label="Selected asset" value={trace.media.selectedAsset ?? "—"} />
            <Row label="Result" value={trace.media.result} />
          </SectionBlock>
        )}

        {section === "Canonical" && (
          <SectionBlock title="BioTemplateConfig (T9)">
            <pre className="gi-json">{json(stageData("T9"))}</pre>
          </SectionBlock>
        )}

        {section === "Renderer" && (
          <SectionBlock title="Renderer (T10)">
            <pre className="gi-json">{json(stageData("T10"))}</pre>
          </SectionBlock>
        )}

        {section === "Raw Trace" && (
          <SectionBlock title="Raw Trace (redacted)">
            <button type="button" className="gi-copy" onClick={copyRaw}>
              {copied ? "Copiado ✓" : "Copiar JSON"}
            </button>
            <pre className="gi-json">{json(trace)}</pre>
          </SectionBlock>
        )}
      </main>
    </div>
  );
}
