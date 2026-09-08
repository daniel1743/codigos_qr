import { useEffect, useMemo, useState } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  Pencil,
  Check,
  Loader2,
  Rocket,
  Code2,
  X,
  SlidersHorizontal,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import type { BioTemplateConfig, Breakpoint } from "../types";
import type { ProductTier } from "../../lib/product-entitlements/capabilities";
import { StudioProvider, useStudio } from "../state/StudioProvider";
import type { StudioAdapters } from "../adapters";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { BREAKPOINT_WIDTHS } from "../constants/layouts";
import { Sidebar, SidebarContent, SidebarTabs } from "./editor/Sidebar";
import { Inspector, InspectorContent } from "./inspector/Inspector";
import { cx } from "../utils";
import { createDemoConfig } from "../templates/definitions";
import { parseTemplateJson } from "../engine/TemplateValidator";
import { PowerCanvasViewport } from "./workspace/PowerCanvasViewport";
import "../styles/studio.css";

function Toolbar({ onExport }: { onExport: () => void }) {
  const {
    state,
    dispatch,
    breakpoint,
    setBreakpoint,
    previewing,
    setPreviewing,
    saveState,
    publish,
  } = useStudio();

  const devices: { id: Breakpoint; icon: typeof Monitor }[] = [
    { id: "desktop", icon: Monitor },
    { id: "tablet", icon: Tablet },
    { id: "mobile", icon: Smartphone },
  ];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-foreground">
          {state.config.metadata.name}
        </span>
        <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground sm:inline">
          /{state.config.settings.slug}
        </span>
      </div>

      <div className="hidden items-center gap-0.5 rounded-lg bg-muted p-0.5 md:flex">
        {devices.map((device) => (
          <button
            key={device.id}
            type="button"
            title={device.id}
            onClick={() => setBreakpoint(device.id)}
            className={cx(
              "rounded-md p-1.5 transition",
              breakpoint === device.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <device.icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title="Undo"
          onClick={() => dispatch({ type: "undo" })}
          disabled={!state.past.length}
          className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Redo"
          onClick={() => dispatch({ type: "redo" })}
          disabled={!state.future.length}
          className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <span className="hidden w-16 items-center gap-1 text-[11px] text-muted-foreground sm:flex">
          {saveState === "saving" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Saving
            </>
          ) : saveState === "saved" ? (
            <>
              <Check className="h-3 w-3" /> Saved
            </>
          ) : saveState === "error" ? (
            "Error"
          ) : saveState === "dirty" ? (
            "Unsaved"
          ) : (
            ""
          )}
        </span>
        <button
          type="button"
          title="Export JSON"
          onClick={onExport}
          className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
        >
          <Code2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setPreviewing(!previewing)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
        >
          {previewing ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{previewing ? "Edit" : "Preview"}</span>
        </button>
        <button
          type="button"
          onClick={() => void publish()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
        >
          <Rocket className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Publish</span>
        </button>
      </div>
    </header>
  );
}

type BinaryIsolationMode = "CAMERA_ON" | "CAMERA_BYPASS";

type BinaryIsolationEvidence = {
  mode: BinaryIsolationMode;
  profileId: string;
  schemaVersion: number;
  blockCount: number;
  firstFiveBlockIds: string[];
  firstFiveBlockTypes: string[];
  breakpoint: Breakpoint;
  renderer: Record<string, unknown>;
  firstBlock: Record<string, unknown>;
};

function binaryElementEvidence(
  root: HTMLElement | null,
  selector: string,
): Record<string, unknown> {
  const element = root?.querySelector<HTMLElement>(selector) ?? null;
  if (!element) return { exists: "NO" };

  const rect = element.getBoundingClientRect();
  const styles = getComputedStyle(element);
  return {
    exists: "YES",
    offsetWidth: element.offsetWidth,
    offsetHeight: element.offsetHeight,
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
    display: styles.display,
    visibility: styles.visibility,
    opacity: styles.opacity,
  };
}

function BinaryIsolationDiagnostic({
  config,
  breakpoint,
  mode,
}: {
  config: BioTemplateConfig;
  breakpoint: Breakpoint;
  mode: BinaryIsolationMode;
}) {
  const [evidence, setEvidence] = useState<BinaryIsolationEvidence | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof document === "undefined") return;

    let cancelled = false;
    const frameId = requestAnimationFrame(() => {
      if (cancelled) return;

      const root = document.querySelector<HTMLElement>(`[data-camera-debug-mode="${mode}"]`);
      const nextEvidence: BinaryIsolationEvidence = {
        mode,
        profileId: new URLSearchParams(window.location.search).get("profileId") ?? "missing",
        schemaVersion: config.schemaVersion,
        blockCount: config.blocks.length,
        firstFiveBlockIds: config.blocks.slice(0, 5).map((block) => block.id),
        firstFiveBlockTypes: config.blocks.slice(0, 5).map((block) => block.type),
        breakpoint,
        renderer: binaryElementEvidence(root, ".pts-page"),
        firstBlock: binaryElementEvidence(root, ".pts-block"),
      };

      console.info("[PowerEditor][camera-binary]", nextEvidence);
      setEvidence(nextEvidence);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [config, breakpoint, mode]);

  if (!import.meta.env.DEV || !evidence) return null;
  return (
    <pre
      aria-label="DEV camera binary diagnostics"
      className="pointer-events-none fixed bottom-2 right-2 z-[60] max-h-48 max-w-[min(90%,42rem)] overflow-auto rounded bg-black/85 p-2 text-[9px] leading-tight text-white"
    >
      {JSON.stringify(evidence, null, 2)}
    </pre>
  );
}

function Canvas() {
  const { state, dispatch, breakpoint, previewing } = useStudio();
  const frameWidth = BREAKPOINT_WIDTHS[breakpoint];
  const cameraBypass =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("cameraDebug") === "bypass";

  const templateRenderer = (
    <TemplateRenderer
      config={state.config}
      breakpoint={breakpoint}
      mode={previewing ? "public" : "edit"}
      editing={
        previewing
          ? undefined
          : {
              selectedBlockId: state.selectedBlockId,
              onSelect: (id) => dispatch({ type: "selectBlock", id }),
              onInlineEdit: (path, value) => {
                // Canvas paths look like `blocks.<blockId>.content.title`.
                // Blocks are an array, so route them through patchBlockField.
                const match = /^blocks\.([^.]+)\.(.+)$/.exec(path);
                if (match) {
                  dispatch({
                    type: "patchBlockField",
                    id: match[1]!,
                    path: match[2]!,
                    value,
                  });
                } else {
                  dispatch({ type: "patch", path, value });
                }
              },
              onMove: (id, direction) => dispatch({ type: "moveBlock", id, direction }),
              onDuplicate: (id) => dispatch({ type: "duplicateBlock", id }),
              onToggleHidden: (id) => dispatch({ type: "toggleBlockHidden", id }),
              onDelete: (id) => dispatch({ type: "deleteBlock", id }),
              onReorder: (sourceId, targetId) =>
                dispatch({ type: "reorderBlock", sourceId, targetId }),
            }
      }
    />
  );

  if (cameraBypass) {
    return (
      <>
        <div
          data-camera-debug-mode="CAMERA_BYPASS"
          className="h-full max-h-full min-h-0 min-w-0 w-full overflow-auto bg-muted/50 p-4 sm:p-8"
          style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0, overflow: "auto" }}
          onClick={() => dispatch({ type: "selectBlock", id: null })}
        >
          {templateRenderer}
        </div>
        <BinaryIsolationDiagnostic
          config={state.config}
          breakpoint={breakpoint}
          mode="CAMERA_BYPASS"
        />
      </>
    );
  }

  return (
    <>
      <PowerCanvasViewport
        contentWidth={frameWidth}
        onBackgroundClick={() => dispatch({ type: "selectBlock", id: null })}
      >
        <div
          className="mx-auto overflow-hidden rounded-2xl bg-background shadow-xl ring-1 ring-border transition-[max-width] duration-300"
          style={{ maxWidth: frameWidth }}
        >
          {templateRenderer}
        </div>
      </PowerCanvasViewport>
      <BinaryIsolationDiagnostic config={state.config} breakpoint={breakpoint} mode="CAMERA_ON" />
    </>
  );
}

function ExportSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStudio();
  const json = useMemo(() => JSON.stringify(state.config, null, 2), [state.config]);
  const [tab, setTab] = useState<"export" | "import">("export");
  const [draft, setDraft] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const runImport = (raw: string) => {
    const { config, result } = parseTemplateJson(raw);
    if (!config) {
      const first = result.issues.find((i) => i.level === "error");
      setImportError(first ? `${first.path}: ${first.message}` : "Invalid configuration.");
      return;
    }
    setImportError(null);
    dispatch({ type: "replaceConfig", config, resetHistory: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {(["export", "import"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cx(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold capitalize",
                  tab === id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {id} JSON
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {tab === "export" ? (
          <>
            <pre className="min-h-0 flex-1 overflow-auto bg-background p-4 text-[11px] leading-relaxed text-muted-foreground">
              {json}
            </pre>
            <footer className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(json)}
                className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
              >
                Copy JSON
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Paste a template configuration…"
                className="h-full min-h-[240px] w-full resize-none rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-foreground"
              />
              {importError && <p className="mt-2 text-[11px] text-destructive">{importError}</p>}
            </div>
            <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <label className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                Upload .json
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setDraft(await file.text());
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => runImport(draft)}
                className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
              >
                Import
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function MobileDock() {
  const [sheet, setSheet] = useState<"none" | "panels" | "inspector">("none");

  return (
    <>
      {sheet !== "none" && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-foreground/30 lg:hidden">
          <div className="max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card pb-16">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-2">
              <span className="text-xs font-semibold text-foreground">
                {sheet === "panels" ? "Build" : "Properties"}
              </span>
              <button
                type="button"
                onClick={() => setSheet("none")}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sheet === "panels" ? (
              <>
                <SidebarTabs />
                <SidebarContent />
              </>
            ) : (
              <InspectorContent />
            )}
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border bg-card px-4 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSheet("panels")}
          className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground"
        >
          <Plus className="h-5 w-5" />
          Build
        </button>
        <button
          type="button"
          onClick={() => setSheet("inspector")}
          className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground"
        >
          <SlidersHorizontal className="h-5 w-5" />
          Properties
        </button>
      </nav>
    </>
  );
}

function StudioShell() {
  const [exporting, setExporting] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const { error } = useStudio();

  return (
    <div className="pts-scope flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <Toolbar onExport={() => setExporting(true)} />
      {error && (
        <div
          role="alert"
          className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-[11px] text-destructive"
        >
          {error}
        </div>
      )}
      <div className="pts-studio-workspace flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cx(
            "pts-desktop-panel pts-desktop-panel--tools hidden lg:block",
            toolsCollapsed ? "pts-desktop-panel--collapsed" : "",
          )}
        >
          {toolsCollapsed ? (
            <div className="pts-panel-rail border-r border-border bg-card">
              <button
                type="button"
                title="Open tools"
                aria-label="Open tools"
                aria-expanded={false}
                onClick={() => setToolsCollapsed(false)}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative h-full min-h-0 overflow-hidden">
              <Sidebar />
              <button
                type="button"
                title="Collapse tools"
                aria-label="Collapse tools"
                aria-expanded={true}
                onClick={() => setToolsCollapsed(true)}
                className="absolute right-2 top-2 z-10 rounded-lg border border-border bg-card p-1.5 text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <Canvas />
        <div
          className={cx(
            "pts-desktop-panel pts-desktop-panel--inspector hidden lg:block",
            inspectorCollapsed ? "pts-desktop-panel--collapsed" : "",
          )}
        >
          {inspectorCollapsed ? (
            <div className="pts-panel-rail pts-panel-rail--right border-l border-border bg-card">
              <button
                type="button"
                title="Open inspector"
                aria-label="Open inspector"
                aria-expanded={false}
                onClick={() => setInspectorCollapsed(false)}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative h-full min-h-0 overflow-hidden">
              <Inspector />
              <button
                type="button"
                title="Collapse inspector"
                aria-label="Collapse inspector"
                aria-expanded={true}
                onClick={() => setInspectorCollapsed(true)}
                className="absolute left-2 top-2 z-10 rounded-lg border border-border bg-card p-1.5 text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      <MobileDock />
      {exporting && <ExportSheet onClose={() => setExporting(false)} />}
    </div>
  );
}

export interface PremiumTemplateStudioProps {
  /** Existing page configuration. Falls back to the Creator Premium demo. */
  config?: BioTemplateConfig | undefined;
  adapters?: Partial<StudioAdapters> | undefined;
  autoSave?: boolean | undefined;
  onChange?: ((config: BioTemplateConfig) => void) | undefined;
  onSave?: ((config: BioTemplateConfig) => void) | undefined;
  onPublish?: ((config: BioTemplateConfig) => void) | undefined;
  /** Effective product tier from the host boundary. Missing/invalid → "free". */
  tier?: ProductTier | undefined;
}

/** Editor entry point. Mount anywhere in the host platform. */
export function PremiumTemplateStudio({
  config,
  adapters,
  autoSave,
  onChange,
  onSave,
  onPublish,
  tier,
}: PremiumTemplateStudioProps) {
  const initialConfig = useMemo(() => config ?? createDemoConfig(), [config]);

  return (
    <StudioProvider
      initialConfig={initialConfig}
      adapters={adapters}
      autoSave={autoSave}
      onChange={onChange}
      onSave={onSave}
      onPublish={onPublish}
      tier={tier}
    >
      <StudioShell />
    </StudioProvider>
  );
}
