import { Eye, Minus, RotateCcw, Save, Send, X, ZoomIn } from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  type WheelEvent,
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
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{
    distance: number;
    zoom: number;
    midpoint: { x: number; y: number };
    panX: number;
    panY: number;
  } | null>(null);
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

  const getPanBounds = () => {
    const viewport = viewportRef.current;
    if (!viewport) return { maxX: 0, maxY: 0 };

    const contentWidth = TEMPLATE_WIDTH * zoom;
    const contentHeight = TEMPLATE_MIN_HEIGHT * zoom;
    const maxX = Math.max(0, (contentWidth - viewport.clientWidth) / 2 + 24);
    const maxY = Math.max(0, (contentHeight - viewport.clientHeight) / 2 + 24);

    return { maxX, maxY };
  };

  const clampPan = (nextX: number, nextY: number) => {
    const { maxX, maxY } = getPanBounds();
    return {
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(maxY, Math.max(-maxY, nextY)),
    };
  };

  const updateZoom = (next: number) => setZoomOffset(next - fitZoom);
  const recenter = () => {
    setPan({ x: 0, y: 0 });
    setZoomOffset(0);
  };

  const getPointerDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(b.x - a.x, b.y - a.y);

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    updateZoom(zoom - event.deltaY * 0.001);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-edit-target], button, input, textarea, a"))
      return;

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointers.current.size === 1) {
      dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
      pinchStartRef.current = null;
      return;
    }

    if (activePointers.current.size >= 2) {
      const active = Array.from(activePointers.current.values());
      const [first, second] = active;
      const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };

      pinchStartRef.current = {
        distance: getPointerDistance(first, second),
        zoom,
        midpoint,
        panX: pan.x,
        panY: pan.y,
      };
      dragStart.current = null;
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(event.pointerId)) return;

    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const active = Array.from(activePointers.current.values());
    if (active.length >= 2) {
      const [first, second] = active;
      const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };

      if (!pinchStartRef.current || pinchStartRef.current.distance <= 0) {
        pinchStartRef.current = {
          distance: getPointerDistance(first, second),
          zoom,
          midpoint,
          panX: pan.x,
          panY: pan.y,
        };
        return;
      }

      const nextDistance = getPointerDistance(first, second);
      const zoomScale = nextDistance / pinchStartRef.current.distance;
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartRef.current.zoom * zoomScale));
      const deltaX = midpoint.x - pinchStartRef.current.midpoint.x;
      const deltaY = midpoint.y - pinchStartRef.current.midpoint.y;

      setZoomOffset(nextZoom - fitZoom);
      setPan(
        clampPan(
          pinchStartRef.current.panX + deltaX * 0.35,
          pinchStartRef.current.panY + deltaY * 0.35,
        )
      );
      return;
    }

    if (!dragStart.current) return;

    const { panX, panY, x, y } = dragStart.current;
    setPan(clampPan(panX + event.clientX - x, panY + event.clientY - y));
  };

  const stopPan = (event?: PointerEvent<HTMLDivElement>) => {
    if (event) {
      activePointers.current.delete(event.pointerId);
    }

    if (activePointers.current.size < 2) {
      pinchStartRef.current = null;
    }

    if (activePointers.current.size === 0) {
      dragStart.current = null;
      return;
    }

    const [nextPointer] = Array.from(activePointers.current.values());
    if (nextPointer && activePointers.current.size === 1) {
      dragStart.current = { x: nextPointer.x, y: nextPointer.y, panX: pan.x, panY: pan.y };
    }
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
      <div className="absolute right-3 top-3 z-20 flex overflow-hidden rounded-xl border border-stone-200 bg-[#fffefa]/95 shadow-sm backdrop-blur">
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
        style={{ touchAction: "none" }}
        onWheel={onWheel}
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
}: BasicEditorShellProps) {
  const [mobileSheetState, setMobileSheetState] = useState<MobileSheetState>("medium");

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
    <div className="min-h-screen bg-[#f1efe9] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] text-[#1d1d1b] lg:pb-0">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-stone-200 bg-[#fffefa]/95 px-4 backdrop-blur lg:px-6">
        <div className="min-w-11 text-sm font-bold tracking-[-0.03em]">Editor QR</div>
        <div className="flex items-center gap-1">
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
            className="h-10 rounded-xl bg-[#1d1d1b] px-3 text-xs text-[#fffefa] hover:bg-[#343432]"
          >
            <Send className="mr-1.5 h-4 w-4" />
            {publishing ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      </header>

      <div className="lg:grid lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
        <main className="min-w-0 border-b border-stone-200 lg:border-b-0 lg:border-r">
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
