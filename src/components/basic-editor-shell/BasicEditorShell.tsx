import { Eye, Minus, RotateCcw, Save, Send, X, ZoomIn } from "lucide-react";
import {
  type PointerEvent,
  type ReactNode,
  type RefObject,
  type WheelEvent,
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

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.5;
const DEFAULT_ZOOM = 0.9;

function CanvasWorkspace({
  children,
  viewportRef,
  compact = false,
}: {
  children: ReactNode;
  viewportRef: RefObject<HTMLDivElement | null>;
  compact?: boolean;
}) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const updateZoom = (next: number) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  const recenter = () => {
    setPan({ x: 0, y: 0 });
    setZoom(DEFAULT_ZOOM);
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    updateZoom(zoom - event.deltaY * 0.001);
  };

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
      className={`relative overflow-hidden bg-muted/50 ${compact ? "h-[calc(100dvh-4rem)]" : "h-[min(58dvh,680px)] min-h-[360px] lg:h-[calc(100dvh-7rem)] lg:min-h-[560px]"}`}
    >
      <div className="absolute right-3 top-3 z-20 flex overflow-hidden rounded-xl border bg-background/95 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Reducir zoom"
          onClick={() => updateZoom(zoom - 0.1)}
          className="h-9 w-9 rounded-none"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span
          className="grid min-w-12 place-items-center border-x px-2 text-xs font-semibold tabular-nums"
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
          className="h-9 w-9 rounded-none"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Recentrar lienzo"
          onClick={recenter}
          className="h-9 w-9 rounded-none"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={viewportRef}
        className="h-full overflow-auto overscroll-contain px-5 pb-8 pt-14"
        style={{ touchAction: "pan-y" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
      >
        <div
          className="mx-auto w-[360px] max-w-none transition-transform duration-200 motion-reduce:transition-none"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: "top center",
          }}
        >
          <div className="min-h-[620px] overflow-hidden rounded-[2rem] border-[6px] border-black/10 bg-white shadow-xl">
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
    <div className="min-h-screen bg-muted/30 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:px-6">
        <div className="min-w-11 text-sm font-semibold">Editor QR</div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Vista previa"
            onClick={onPreview}
            className="h-11 w-11"
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
            className="h-10 w-10 rounded-xl"
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={onPublish}
            disabled={publishing || publishDisabled}
            className="h-10 rounded-xl px-3 text-xs"
          >
            <Send className="mr-1.5 h-4 w-4" />
            {publishing ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      </header>

      <div className="lg:grid lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
        <main className="min-w-0 border-b lg:border-b-0 lg:border-r">
          <CanvasWorkspace viewportRef={canvasViewportRef}>{canvas}</CanvasWorkspace>
        </main>
        <aside className="hidden min-h-0 overflow-y-auto bg-background p-6 lg:block">
          {desktopPanel}
        </aside>
      </div>

      {mobilePanelOpen && (
        <section className="fixed inset-x-0 bottom-[calc(78px+env(safe-area-inset-bottom,0px))] z-[55] max-h-[58dvh] overflow-hidden rounded-t-[1.5rem] border-t bg-background shadow-[0_-12px_32px_rgba(15,23,42,0.16)] lg:hidden">
          <div className="flex h-12 items-center justify-between border-b px-4">
            <span
              className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/30"
              aria-hidden="true"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cerrar panel"
              onClick={onCloseMobilePanel}
              className="absolute right-2 h-11 w-11"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[calc(58dvh-3rem)] overflow-y-auto overscroll-contain p-4">
            {mobilePanel}
          </div>
        </section>
      )}
    </div>
  );
}
