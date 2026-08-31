import { Check, Eye, LayoutTemplate, Menu, Minus, RotateCcw, Save, Search, Send, X, ZoomIn } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "../ui/button";

interface BasicEditorShellProps {
  canvas: ReactNode;
  canvasViewportRef: RefObject<HTMLDivElement | null>;
  desktopPanel: ReactNode;
  mobilePanel: ReactNode;
  mobilePanelOpen: boolean;
  onCloseMobilePanel: () => void;
  onPreview: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  publishing: boolean;
  publishDisabled: boolean;
  previewMode?: boolean;
  onExitPreview?: () => void;
  templateSearchItems?: TemplateSearchItem[];
  templateSearchQuery?: string;
  onTemplateSearchChange?: (value: string) => void;
  onSelectTemplate?: (templateId: string) => void;
  selectedTemplateId?: string | null;
}

interface TemplateSearchItem {
  id: string;
  name: string;
}

type MobileSheetState = "collapsed" | "medium" | "expanded";

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.5;
const TEMPLATE_WIDTH = 360;
const TEMPLATE_MIN_HEIGHT = 620;

const MOBILE_SHEET_HEIGHTS: Record<MobileSheetState, string> = {
  collapsed: "18dvh",
  medium: "34dvh",
  expanded: "48dvh",
};

function CanvasWorkspace({
  children,
  viewportRef,
  compact = false,
  mobileSheetState,
}: {
  children: ReactNode;
  viewportRef: RefObject<HTMLDivElement | null>;
  compact?: boolean;
  mobileSheetState?: MobileSheetState;
}) {
  const workspaceRef = useRef<HTMLElement | null>(null);
  const [fitZoom, setFitZoom] = useState(0.9);
  const [zoomOffset, setZoomOffset] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fitZoom + zoomOffset));

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace || compact) return;

    const updateFit = () => {
      const availableWidth = Math.max(1, workspace.clientWidth - 40);
      const availableHeight = Math.max(1, workspace.clientHeight - 72);
      const nextFit = Math.min(availableWidth / TEMPLATE_WIDTH, availableHeight / TEMPLATE_MIN_HEIGHT, 1);
      setFitZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextFit)));
    };

    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [compact, mobileSheetState]);

  const updateZoom = (next: number) => setZoomOffset(next - fitZoom);
  const recenter = () => {
    setPan({ x: 0, y: 0 });
    setZoomOffset(0);
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      updateZoom(zoom - event.deltaY * 0.001);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [fitZoom, viewportRef, zoom]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-edit-target], button, input, textarea, a"))
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setPan({
      x: Math.max(-96, Math.min(96, dragStart.current.panX + event.clientX - dragStart.current.x)),
      y: Math.max(-96, Math.min(96, dragStart.current.panY + event.clientY - dragStart.current.y)),
    });
  };

  const stopPan = () => {
    dragStart.current = null;
  };

  return (
    <section
      ref={workspaceRef}
      className={`relative overflow-hidden bg-[#f1efe9] ${compact ? "h-[calc(100dvh-4rem)]" : "h-[var(--mobile-canvas-height)] min-h-[220px] lg:h-[calc(100dvh-7rem)] lg:min-h-[560px]"}`}
      style={
        {
          "--mobile-canvas-height": mobileSheetState
            ? `calc(100dvh - 3.5rem - 78px - ${MOBILE_SHEET_HEIGHTS[mobileSheetState]})`
            : "min(58dvh, 680px)",
        } as CSSProperties
      }
    >
      <div className="absolute right-3 top-3 z-20 hidden overflow-hidden rounded-xl border border-stone-200 bg-[#fffefa]/95 shadow-sm backdrop-blur lg:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Reducir zoom"
          onClick={() => updateZoom(zoom - 0.1)}
          className="h-9 w-9 rounded-none text-[#1d1d1b]"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span
          className="grid min-w-12 place-items-center border-x border-stone-200 px-2 text-xs font-semibold tabular-nums text-[#1d1d1b]"
          aria-live="polite"
        >
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Aumentar zoom"
          onClick={() => updateZoom(zoom + 0.1)}
          className="h-9 w-9 rounded-none text-[#1d1d1b]"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Recentrar lienzo"
          onClick={recenter}
          className="h-9 w-9 rounded-none text-[#1d1d1b]"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={viewportRef}
        className="h-full overflow-auto overscroll-contain px-5 pb-8 pt-14"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
      >
        <div
          className="mx-auto transition-[width,height] duration-200 motion-reduce:transition-none"
          style={{
            width: `${TEMPLATE_WIDTH * zoom}px`,
            minHeight: `${TEMPLATE_MIN_HEIGHT * zoom}px`,
          }}
        >
          <div
            className="w-[360px] min-h-[620px] overflow-hidden rounded-[2rem] border-[6px] border-black/10 bg-white shadow-[0_18px_42px_rgba(29,29,27,0.15)] transition-transform duration-200 motion-reduce:transition-none"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function BasicEditorShell({
  canvas,
  canvasViewportRef,
  desktopPanel,
  mobilePanel,
  mobilePanelOpen,
  onCloseMobilePanel,
  onPreview,
  onSaveDraft,
  onPublish,
  publishing,
  publishDisabled,
  previewMode = false,
  onExitPreview,
  templateSearchItems = [],
  templateSearchQuery = "",
  onTemplateSearchChange,
  onSelectTemplate,
  selectedTemplateId,
}: BasicEditorShellProps) {
  const [mobileSheetState, setMobileSheetState] = useState<MobileSheetState>("medium");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const searchEnabled =
    templateSearchItems.length > 0 && Boolean(onTemplateSearchChange) && Boolean(onSelectTemplate);
  const normalizedQuery = templateSearchQuery.trim().toLocaleLowerCase();
  const filteredTemplates = searchEnabled
    ? templateSearchItems.filter((template) =>
        template.name.toLocaleLowerCase().includes(normalizedQuery),
      )
    : [];

  const openTemplateMenu = () => {
    if (!searchEnabled) return;
    setTemplateMenuOpen(true);
    setMobileMenuOpen(false);
  };

  const selectTemplate = (templateId: string) => {
    onSelectTemplate?.(templateId);
    setTemplateMenuOpen(false);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (mobilePanelOpen) setMobileSheetState("medium");
  }, [mobilePanelOpen]);

  if (previewMode) {
    return (
      <div className="fixed inset-0 z-[70] bg-background">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4">
          <h1 className="text-sm font-semibold">Vista previa</h1>
          <Button type="button" variant="ghost" onClick={onExitPreview} className="min-h-11">
            <X className="mr-2 h-4 w-4" /> Volver a editar
          </Button>
        </header>
        <CanvasWorkspace viewportRef={canvasViewportRef} compact>
          {canvas}
        </CanvasWorkspace>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1efe9] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] text-[#1d1d1b] lg:h-screen lg:overflow-hidden lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#fffefa]/90 px-3 backdrop-blur-xl lg:px-6">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/editor"
              className="shrink-0 text-sm font-black uppercase tracking-[0.1em] text-[#1d1d1b] transition-colors hover:text-[#8a6b2f] min-[420px]:tracking-[0.14em]"
            >
              <span className="hidden min-[420px]:inline">Editorial Canvas</span>
              <span className="min-[420px]:hidden">Editor QR</span>
            </Link>
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
              <Link
                to="/editor"
                className="rounded-full bg-[#1d1d1b] px-3 py-1.5 text-xs font-semibold text-[#fffefa] shadow-sm"
                aria-current="page"
              >
                Editor
              </Link>
              {searchEnabled && (
                <button
                  type="button"
                  onClick={openTemplateMenu}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#1d1d1b]"
                >
                  Biblioteca
                </button>
              )}
              <Link
                to="/encrypted-documents"
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#1d1d1b]"
              >
                QR cifrado
              </Link>
            </nav>
          </div>

          {searchEnabled && (
            <div className="relative hidden min-w-[220px] max-w-sm flex-1 justify-center lg:flex">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={templateSearchQuery}
                onChange={(event) => {
                  onTemplateSearchChange?.(event.target.value);
                  setTemplateMenuOpen(true);
                }}
                onFocus={openTemplateMenu}
                placeholder="Buscar plantillas"
                className="h-10 w-full rounded-full border border-stone-200 bg-white/70 pl-10 pr-4 text-sm text-[#1d1d1b] outline-none transition-all placeholder:text-stone-400 focus:w-[min(100%,20rem)] focus:border-[#c9a96a]/70 focus:bg-white focus:shadow-[0_0_0_3px_rgba(201,169,106,0.18)]"
              />
              {templateMenuOpen && (
                <div className="absolute top-12 z-50 w-full min-w-[18rem] overflow-hidden rounded-2xl border border-stone-200 bg-[#fffefa] shadow-[0_18px_45px_rgba(29,29,27,0.16)]">
                  <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
                    <LayoutTemplate className="h-4 w-4 text-[#8a6b2f]" />
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                      Biblioteca
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {filteredTemplates.map((template) => {
                      const isSelected = selectedTemplateId === template.id;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => selectTemplate(template.id)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#1d1d1b] transition-colors hover:bg-stone-100"
                        >
                          <span className="truncate">{template.name}</span>
                          {isSelected && <Check className="h-4 w-4 text-[#8a6b2f]" />}
                        </button>
                      );
                    })}
                    {filteredTemplates.length === 0 && (
                      <p className="px-3 py-5 text-center text-sm text-stone-500">
                        No se encontraron plantillas.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Vista previa"
            onClick={onPreview}
            className="h-10 w-10 text-[#1d1d1b]"
          >
            <Eye className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Guardar borrador"
            onClick={onSaveDraft}
            disabled={publishing || publishDisabled}
            className="h-10 w-10 rounded-xl border border-stone-200 bg-stone-100 text-[#1d1d1b] hover:bg-stone-200"
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={onPublish}
            disabled={publishing || publishDisabled}
            className="h-10 w-10 rounded-xl bg-[#1d1d1b] px-0 text-xs text-[#fffefa] hover:bg-[#343432] min-[390px]:w-auto min-[390px]:px-3"
          >
            <Send className="h-4 w-4 min-[390px]:mr-1.5" />
            <span className="hidden min-[390px]:inline">
              {publishing ? "Publicando..." : "Publicar"}
            </span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="h-10 w-10 rounded-xl text-[#1d1d1b] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav className="border-t border-stone-200 py-2 lg:hidden" aria-label="Menú móvil principal">
            <Link
              to="/editor"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl bg-stone-100 px-3 py-3 text-sm font-semibold text-[#1d1d1b]"
              aria-current="page"
            >
              Editor
            </Link>
            {searchEnabled && (
              <button
                type="button"
                onClick={openTemplateMenu}
                className="block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-stone-600"
              >
                Biblioteca
              </button>
            )}
            <Link
              to="/encrypted-documents"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-3 py-3 text-sm font-semibold text-stone-600"
            >
              QR cifrado
            </Link>
          </nav>
        )}
        {templateMenuOpen && searchEnabled && (
          <div className="border-t border-stone-200 py-3 lg:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={templateSearchQuery}
                onChange={(event) => onTemplateSearchChange?.(event.target.value)}
                placeholder="Buscar plantillas"
                className="h-11 w-full rounded-full border border-stone-200 bg-white/70 pl-10 pr-4 text-sm text-[#1d1d1b] outline-none placeholder:text-stone-400"
              />
            </div>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-stone-200 bg-[#fffefa] p-2 shadow-sm">
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template.id)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#1d1d1b]"
                  >
                    <span className="truncate">{template.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-[#8a6b2f]" />}
                  </button>
                );
              })}
              {filteredTemplates.length === 0 && (
                <p className="px-3 py-5 text-center text-sm text-stone-500">
                  No se encontraron plantillas.
                </p>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="lg:grid lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
        <main className="min-w-0 border-b border-stone-200 lg:min-h-0 lg:overflow-hidden lg:border-b-0 lg:border-r">
          <CanvasWorkspace viewportRef={canvasViewportRef} mobileSheetState={mobilePanelOpen ? mobileSheetState : undefined}>{canvas}</CanvasWorkspace>
        </main>
        <aside className="hidden min-h-0 overflow-y-auto bg-[#fffefa] p-6 lg:block">
          {desktopPanel}
        </aside>
      </div>

      {mobilePanelOpen && (
        <section
          className="fixed inset-x-0 bottom-[calc(78px+env(safe-area-inset-bottom,0px))] z-[55] flex max-h-[50dvh] flex-col overflow-hidden rounded-t-[1.75rem] border-t border-stone-200 bg-[#fffefa] shadow-[0_-12px_32px_rgba(29,29,27,0.12)] transition-[height] duration-200 motion-reduce:transition-none lg:hidden"
          style={{ height: MOBILE_SHEET_HEIGHTS[mobileSheetState] }}
        >
          <div className="relative flex h-[4.25rem] shrink-0 flex-col items-center border-b border-stone-200 px-4">
            <button
              type="button"
              aria-label="Cambiar altura del panel"
              onClick={() => setMobileSheetState((state) => state === "expanded" ? "medium" : "expanded")}
              className="mt-2 grid h-6 w-14 place-items-center rounded-full"
            >
              <span className="h-1.5 w-12 rounded-full bg-stone-300" aria-hidden="true" />
            </button>
            <div className="flex w-full items-center justify-between px-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">Herramientas</p>
              <div className="flex rounded-full bg-stone-100 p-0.5" aria-label="Altura del panel">
                {(["collapsed", "medium", "expanded"] as MobileSheetState[]).map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => setMobileSheetState(state)}
                    className={`rounded-full px-2 py-1 text-[9px] font-bold ${mobileSheetState === state ? "bg-[#1d1d1b] text-[#fffefa]" : "text-stone-500"}`}
                  >
                    {{ collapsed: "Bajo", medium: "Medio", expanded: "Amplio" }[state]}
                  </button>
                ))}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cerrar panel"
              onClick={onCloseMobilePanel}
              className="absolute right-2 top-6 h-9 w-9 text-stone-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            {mobilePanel}
          </div>
        </section>
      )}
    </div>
  );
}
