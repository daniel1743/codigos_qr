import { useEffect, useMemo, useRef, useState } from "react";
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
  Save,
  Code2,
  X,
  SlidersHorizontal,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import type { BioTemplateConfig, Breakpoint, SaveState } from "../types";
import type { ProductTier } from "../../lib/product-entitlements/capabilities";
import { StudioProvider, useStudio } from "../state/StudioProvider";
import type { StudioAdapters } from "../adapters";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { BREAKPOINT_WIDTHS } from "../constants/layouts";
import { Sidebar, SidebarContent, SidebarTabs } from "./editor/Sidebar";
import { Inspector, InspectorContent } from "./inspector/Inspector";
import {
  clampScrollValue,
  computeInspectorFocusScroll,
  requestInspectorFocus,
  subscribeInspectorFocus,
  type InspectorFocusTarget,
} from "./inspector/inspectorFocus";
import { shouldResetInspectorScroll } from "./inspector/inspectorScroll";
import { cx } from "../utils";
import { createDemoConfig } from "../templates/definitions";
import { parseTemplateJson } from "../engine/TemplateValidator";
import { PowerCanvasViewport } from "./workspace/PowerCanvasViewport";
import { PowerEditorLocaleProvider, usePowerEditorLocale } from "../i18n/PowerEditorLocale";
import { formatBreakpoint } from "../i18n/messages";
import { DiscoveryHintHost } from "../microux/DiscoveryHint";
import "../styles/studio.css";

function Toolbar({ onExport }: { onExport: () => void }) {
  const { locale, messages } = usePowerEditorLocale();
  const {
    state,
    dispatch,
    breakpoint,
    setBreakpoint,
    previewing,
    setPreviewing,
    saveState,
    save,
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
            title={formatBreakpoint(locale, device.id)}
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
          title={messages.toolbar.undo}
          onClick={() => dispatch({ type: "undo" })}
          disabled={!state.past.length}
          className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title={messages.toolbar.redo}
          onClick={() => dispatch({ type: "redo" })}
          disabled={!state.future.length}
          className="rounded-lg p-2 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <span className="hidden w-16 items-center gap-1 text-[11px] text-muted-foreground sm:flex">
          {saveState === "saving" ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> {messages.toolbar.saving}
            </>
          ) : saveState === "saved" ? (
            <>
              <Check className="h-3 w-3" /> {messages.toolbar.saved}
            </>
          ) : saveState === "error" ? (
            messages.toolbar.error
          ) : saveState === "dirty" ? (
            messages.toolbar.unsaved
          ) : (
            ""
          )}
        </span>
        <button
          type="button"
          title={messages.toolbar.exportJson}
          onClick={onExport}
          className="hidden rounded-lg p-2 text-muted-foreground transition hover:text-foreground sm:inline-flex"
        >
          <Code2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saveState === "saving"}
          title={messages.toolbar.save}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent disabled:opacity-60"
        >
          {saveState === "saving" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden sm:inline">{messages.toolbar.saving}</span>
            </>
          ) : saveState === "saved" ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{messages.toolbar.saved}</span>
            </>
          ) : saveState === "error" ? (
            <>
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{messages.toolbar.saveFailed}</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{messages.toolbar.save}</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setPreviewing(!previewing)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
        >
          {previewing ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">
            {previewing ? messages.toolbar.edit : messages.toolbar.preview}
          </span>
        </button>
        <button
          type="button"
          onClick={() => void publish()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
        >
          <Rocket className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{messages.toolbar.publish}</span>
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
  
  const showDiagnostic = 
    import.meta.env.DEV && 
    typeof window !== "undefined" && 
    (new URLSearchParams(window.location.search).get("binaryDebug") === "1" ||
     new URLSearchParams(window.location.search).get("binaryDebug") === "true" ||
     new URLSearchParams(window.location.search).get("isolationDebug") === "1");

  useEffect(() => {
    if (!showDiagnostic || typeof document === "undefined") return;

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
  }, [config, breakpoint, mode, showDiagnostic]);

  if (!showDiagnostic || !evidence) return null;
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
              onSelectProfileCover: () => {
                // Clear any block selection so the Inspector shows the Profile
                // panel, then request the Cover/Banner section be brought into
                // view. Only the Inspector scroll moves — never the Canvas zoom
                // or pan (the camera is untouched).
                dispatch({ type: "selectBlock", id: null });
                requestInspectorFocus("profile-cover");
              },
              onSelectPageBackground: () => {
                // Selecting the exposed page/template surface is the LOWEST-
                // priority contextual selection. Clear any block selection so
                // the Inspector switches from a block context to the page/theme
                // context (no redundant churn if already deselected), then
                // request the exact Page Background controls be brought into
                // view. Only the Inspector scroll moves — never the Canvas
                // zoom or pan (the camera is untouched).
                if (state.selectedBlockId !== null) {
                  dispatch({ type: "selectBlock", id: null });
                }
                requestInspectorFocus("page-background");
              },
              onSelectProfileTarget: (target) => {
                // Generalized Profile contextual selection (cover/avatar/bio).
                // Clear any block selection so the Inspector switches from a
                // block context to the Profile panel, then request the exact
                // sub-target be brought into view. Only the Inspector scroll
                // moves — never the Canvas zoom or pan (the camera is untouched).
                if (state.selectedBlockId !== null) {
                  dispatch({ type: "selectBlock", id: null });
                }
                requestInspectorFocus(target);
              },
              onSelectHeroCta: (blockId) => {
                // Select the parent Hero if it is not already selected (no
                // redundant selection churn), then request a one-shot Inspector
                // focus on the CTA controls. Selection is UI state — never a
                // document mutation — and the camera is untouched.
                if (state.selectedBlockId !== blockId) {
                  dispatch({ type: "selectBlock", id: blockId });
                }
                requestInspectorFocus("hero-cta");
              },
              onSelectHeroText: (blockId, target) => {
                // Select the parent Hero if it is not already selected (no
                // redundant churn), then request a one-shot Inspector focus on
                // the exact text field (title/subtitle/description/eyebrow).
                if (state.selectedBlockId !== blockId) {
                  dispatch({ type: "selectBlock", id: blockId });
                }
                requestInspectorFocus(`hero-${target}`);
              },
              onSelectHeroImage: (blockId) => {
                // Select the parent Hero if it is not already selected (no
                // redundant churn), then request a one-shot Inspector focus on
                // the exact image controls. Selection is UI state — never a
                // document mutation — and the camera is untouched.
                if (state.selectedBlockId !== blockId) {
                  dispatch({ type: "selectBlock", id: blockId });
                }
                requestInspectorFocus("hero-image");
              },
              onSelectHeroBackground: (blockId) => {
                // Select the parent Hero if it is not already selected (no
                // redundant churn), then request a one-shot Inspector focus on
                // the exact background controls. Selection is UI state — never a
                // document mutation — and the camera is untouched.
                if (state.selectedBlockId !== blockId) {
                  dispatch({ type: "selectBlock", id: blockId });
                }
                requestInspectorFocus("hero-background");
              },
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
        selectedBlockId={state.selectedBlockId}
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
  const { messages } = usePowerEditorLocale();
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
                {id === "export" ? messages.toolbar.exportJson : messages.toolbar.importJson}
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
                {messages.toolbar.copyJson}
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={messages.toolbar.pasteTemplate}
                className="h-full min-h-[240px] w-full resize-none rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-foreground"
              />
              {importError && <p className="mt-2 text-[11px] text-destructive">{importError}</p>}
            </div>
            <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <label className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                {messages.toolbar.uploadJson}
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
                {messages.toolbar.importJson}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function MobileDock() {
  const { messages } = usePowerEditorLocale();
  const { state } = useStudio();
  const [sheet, setSheet] = useState<"none" | "panels" | "inspector">("none");
  // Internal scroll container for the mobile sheet body. Only THIS element
  // scrolls to reveal a requested control — never window/document/editor root.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // One-shot pending focus target (mobile only). Non-null until the requested
  // control is revealed, then cleared. Kept as STATE (not a ref) so every new
  // Canvas selection re-runs the reveal effect even when `sheet` is already
  // "inspector" and `selectedBlockId` did not change (e.g. avatar → banner).
  const [pendingFocus, setPendingFocus] = useState<InspectorFocusTarget | null>(null);
  const previousSelectionRef = useRef<string | null>(state.selectedBlockId);

  // MOBILE ONLY — a Canvas element tap must surface the Properties sheet
  // automatically and queue a reveal of the exact control. This reuses the same
  // `subscribeInspectorFocus` signal the desktop Inspector already subscribes to
  // (no second selection/focus architecture). Covers avatar/banner/title/...
  // sub-targets, which always fire an explicit focus request.
  useEffect(() => {
    return subscribeInspectorFocus((target) => {
      setPendingFocus(target);
      setSheet("inspector");
    });
  }, []);

  // MOBILE ONLY — plain block selection (video/card/etc.) has no focus request:
  // tapping the block only dispatches `selectBlock`. Surface Properties and show
  // the block controls from the top (mirrors the desktop `shouldResetInspectorScroll`
  // behavior, scoped to the mobile sheet). Never clears an in-flight focus request —
  // the reveal effect owns `pendingFocus` and runs after this reset.
  useEffect(() => {
    if (!shouldResetInspectorScroll(previousSelectionRef.current, state.selectedBlockId)) return;
    previousSelectionRef.current = state.selectedBlockId;
    setSheet("inspector");
    const container = scrollRef.current;
    if (container && container.scrollTop !== 0) container.scrollTop = 0;
  }, [state.selectedBlockId]);

  // Reveal the pending control once the Properties sheet is mounted. Re-runs on
  // every new pendingFocus value (and when the sheet opens), deferred one frame
  // so `InspectorContent` has committed the exact [data-inspector-focus] node.
  // Only the internal sheet body scrolls — the Canvas camera/zoom/pan and the
  // browser/document scroll are never touched.
  useEffect(() => {
    if (sheet !== "inspector" || !pendingFocus) return;
    const container = scrollRef.current;
    if (!container) return;

    let cancelled = false;
    const defer = (cb: () => void) => {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => cb());
      else setTimeout(cb, 0);
    };
    defer(() => {
      if (cancelled) return;
      const target = pendingFocus;
      const el = container.querySelector<HTMLElement>(`[data-inspector-focus="${target}"]`);
      if (!el) return;
      // Exact-target centering: place the target's center at ~45% of the visible
      // sheet height (comfortable 35%–55% band), clamped to the scroll range.
      const delta = computeInspectorFocusScroll(
        container.getBoundingClientRect(),
        el.getBoundingClientRect(),
      );
      if (delta !== 0) {
        container.scrollTop = clampScrollValue(
          container.scrollTop + delta,
          container.scrollHeight,
          container.clientHeight,
        );
      }
      setPendingFocus(null);
    });

    return () => {
      cancelled = true;
    };
  }, [sheet, pendingFocus]);

  return (
    <>
      {sheet !== "none" && (
        <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-end bg-foreground/30 lg:hidden">
          <div className="pointer-events-auto flex h-[50vh] min-h-[30vh] max-h-[65vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card">
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
              <span className="text-xs font-semibold text-foreground">
                {sheet === "panels" ? messages.toolbar.build : messages.toolbar.properties}
              </span>
              <button
                type="button"
                onClick={() => setSheet("none")}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              ref={scrollRef}
              data-inspector-scroll-root
              className="pts-mobile-sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(4rem+env(safe-area-inset-bottom,0px))]"
            >
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
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border bg-card px-4 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSheet("panels")}
          className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground"
        >
          <Plus className="h-5 w-5" />
          {messages.toolbar.build}
        </button>
        <button
          type="button"
          onClick={() => setSheet("inspector")}
          className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground"
        >
          <SlidersHorizontal className="h-5 w-5" />
          {messages.toolbar.properties}
        </button>
      </nav>
    </>
  );
}

function PreviewHeader({ onBack }: { onBack: () => void }) {
  const { messages } = usePowerEditorLocale();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{messages.toolbar.preview}</span>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
      >
        <Pencil className="h-3.5 w-3.5" />
        {messages.toolbar.backToEdit}
      </button>
    </header>
  );
}

function StudioShell() {
  const [exporting, setExporting] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const { messages } = usePowerEditorLocale();
  const { error, previewing, setPreviewing } = useStudio();

  return (
    <div className="pts-scope flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-background text-foreground">
      {previewing ? (
        <PreviewHeader onBack={() => setPreviewing(false)} />
      ) : (
        <Toolbar onExport={() => setExporting(true)} />
      )}
      {error && !previewing && (
        <div
          role="alert"
          className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-[11px] text-destructive"
        >
          {error}
        </div>
      )}
      {previewing ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <Canvas />
        </div>
      ) : (
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
                title={messages.toolbar.openTools}
                aria-label={messages.toolbar.openTools}
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
                title={messages.toolbar.collapseTools}
                aria-label={messages.toolbar.collapseTools}
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
                title={messages.toolbar.openInspector}
                aria-label={messages.toolbar.openInspector}
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
                title={messages.toolbar.collapseInspector}
                aria-label={messages.toolbar.collapseInspector}
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
      )}
      {!previewing && <MobileDock />}
      {exporting && !previewing && <ExportSheet onClose={() => setExporting(false)} />}
      {!previewing && <DiscoveryHintHost />}
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
  /** Stable document identity (e.g. profile id) used to isolate saves per document. */
  documentId?: string | undefined;
  /** Reports save-state changes (idle/saving/saved/dirty/error) to the host. */
  onSaveStateChange?: ((state: SaveState) => void) | undefined;
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
  documentId,
  onSaveStateChange,
  tier,
}: PremiumTemplateStudioProps) {
  const initialConfig = useMemo(() => config ?? createDemoConfig(), [config]);

  return (
    <PowerEditorLocaleProvider>
      <StudioProvider
        initialConfig={initialConfig}
        adapters={adapters}
        autoSave={autoSave}
        onChange={onChange}
        onSave={onSave}
        onPublish={onPublish}
        documentId={documentId}
        onSaveStateChange={onSaveStateChange}
        tier={tier}
      >
        <StudioShell />
      </StudioProvider>
    </PowerEditorLocaleProvider>
  );
}
