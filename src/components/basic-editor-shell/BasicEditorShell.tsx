import { Check, Eye, LayoutTemplate, Menu, Minus, RotateCcw, Save, Search, Send, X, ZoomIn } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "../ui/button";
import { DesktopSectionNav } from "../editor/DesktopSectionNav";
import type { BasicEditorSectionId } from "../editor/MobileBottomNavbar";
import PlatformNavbar from "../brand/PlatformNavbar";

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
  onOpenTemplateGallery?: () => void;
  selectedTemplateId?: string | null;
  contextSegments?: string[];
  toolFocusTarget?: string | null;
  activeSection?: BasicEditorSectionId;
  onSectionChange?: (section: BasicEditorSectionId) => void;
}

interface TemplateSearchItem {
  id: string;
  name: string;
}

type MobileSheetState = "collapsed" | "medium" | "expanded";

const MIN_ZOOM = 0.35;
const MIN_USER_ZOOM = 0.6;
const MAX_USER_ZOOM = 3;
const PINCH_SENSITIVITY = 1.6;
const TEMPLATE_WIDTH = 360;
const TEMPLATE_MIN_HEIGHT = 620;

const MOBILE_SHEET_HEIGHTS: Record<MobileSheetState, string> = {
  collapsed: "18dvh",
  medium: "34dvh",
  expanded: "48dvh",
};

type CanvasPoint = { x: number; y: number };
type ScrollPanState = {
  pointerId: number;
  x: number;
  y: number;
  scrollLeft: number;
  scrollTop: number;
  active: boolean;
};
type PinchState = {
  startDistance: number;
  startUserZoom: number;
  contentX: number;
  contentY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(first: CanvasPoint, second: CanvasPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function midpoint(first: CanvasPoint, second: CanvasPoint) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function CanvasWorkspace({
  children,
  viewportRef,
  compact = false,
  mobileSheetState,
  resetKey,
}: {
  children: ReactNode;
  viewportRef: RefObject<HTMLDivElement | null>;
  compact?: boolean;
  mobileSheetState?: MobileSheetState;
  resetKey?: string | null;
}) {
  const workspaceRef = useRef<HTMLElement | null>(null);
  const templateRef = useRef<HTMLDivElement | null>(null);
  const activePointers = useRef(new Map<number, CanvasPoint>());
  const pinchStart = useRef<PinchState | null>(null);
  const scrollPanStart = useRef<ScrollPanState | null>(null);
  const suppressClick = useRef(false);
  const [fitZoom, setFitZoom] = useState(0.9);
  const [userZoom, setUserZoom] = useState(1);
  const [templateSize, setTemplateSize] = useState({
    width: TEMPLATE_WIDTH,
    height: TEMPLATE_MIN_HEIGHT,
  });
  const zoom = Math.max(MIN_ZOOM, fitZoom * userZoom);
  const userZoomRef = useRef(userZoom);
  const fitZoomRef = useRef(fitZoom);
  const zoomRef = useRef(zoom);

  userZoomRef.current = userZoom;
  fitZoomRef.current = fitZoom;
  zoomRef.current = zoom;

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace || compact) return;

    const updateFit = () => {
      const template = templateRef.current;
      const measuredWidth = template
        ? Math.max(TEMPLATE_WIDTH, template.scrollWidth, template.offsetWidth)
        : templateSize.width;
      const measuredHeight = template
        ? Math.max(TEMPLATE_MIN_HEIGHT, template.scrollHeight, template.offsetHeight)
        : templateSize.height;
      const availableWidth = Math.max(1, workspace.clientWidth - 40);
      const availableHeight = Math.max(1, workspace.clientHeight - 72);
      const nextFit = Math.min(availableWidth / measuredWidth, availableHeight / measuredHeight, 1);
      setTemplateSize((current) =>
        current.width === measuredWidth && current.height === measuredHeight
          ? current
          : { width: measuredWidth, height: measuredHeight },
      );
      setFitZoom(Math.max(MIN_ZOOM, nextFit));
    };

    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(workspace);
    if (templateRef.current) observer.observe(templateRef.current);
    return () => observer.disconnect();
  }, [compact, mobileSheetState]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const resetGestureState = () => {
      activePointers.current.forEach((_, pointerId) => {
        try {
          viewport?.releasePointerCapture(pointerId);
        } catch {
          // The pointer may already have been released by the browser.
        }
      });
      activePointers.current.clear();
      pinchStart.current = null;
      scrollPanStart.current = null;
      suppressClick.current = false;
    };

    resetGestureState();
    setUserZoom(1);
    viewport?.scrollTo({ left: 0, top: 0 });

    return resetGestureState;
  }, [resetKey, viewportRef]);

  const updateZoom = (next: number) =>
    setUserZoom(clamp(next / fitZoomRef.current, MIN_USER_ZOOM, MAX_USER_ZOOM));
  const recenter = () => {
    setUserZoom(1);
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
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

  const applyPinchZoom = (nextUserZoom: number, contentX: number, contentY: number, focal: CanvasPoint) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const clampedUserZoom = clamp(nextUserZoom, MIN_USER_ZOOM, MAX_USER_ZOOM);
    const nextZoom = Math.max(MIN_ZOOM, fitZoomRef.current * clampedUserZoom);
    setUserZoom(clampedUserZoom);
    window.requestAnimationFrame(() => {
      viewport.scrollTo({
        left: contentX * nextZoom - focal.x,
        top: contentY * nextZoom - focal.y,
      });
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;
    if (activePointers.current.size === 0) suppressClick.current = false;

    if (event.pointerType === "touch") {
      activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        viewport.setPointerCapture(event.pointerId);
      } catch {
        // Some mobile browsers can reject capture during native gestures.
      }

      if (activePointers.current.size === 2) {
        const points = Array.from(activePointers.current.values());
        const focal = midpoint(points[0], points[1]);
        const rect = viewport.getBoundingClientRect();
        pinchStart.current = {
          startDistance: Math.max(1, distance(points[0], points[1])),
          startUserZoom: userZoomRef.current,
          contentX: (viewport.scrollLeft + focal.x - rect.left) / zoomRef.current,
          contentY: (viewport.scrollTop + focal.y - rect.top) / zoomRef.current,
        };
        scrollPanStart.current = null;
        suppressClick.current = true;
        event.preventDefault();
        return;
      }

      if (userZoomRef.current > 1.01) {
        scrollPanStart.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          scrollLeft: viewport.scrollLeft,
          scrollTop: viewport.scrollTop,
          active: false,
        };
      }
      return;
    }

    if ((event.target as HTMLElement).closest("[data-edit-target], button, input, textarea, a"))
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollPanStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
      active: true,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;

    if (event.pointerType === "touch") {
      if (!activePointers.current.has(event.pointerId)) return;
      activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pinchStart.current && activePointers.current.size >= 2) {
        const points = Array.from(activePointers.current.values());
        const focal = midpoint(points[0], points[1]);
        const rect = viewport.getBoundingClientRect();
        const currentDistance = Math.max(1, distance(points[0], points[1]));
        const pinchRatio = currentDistance / pinchStart.current.startDistance;
        const adjustedRatio = Math.pow(pinchRatio, PINCH_SENSITIVITY);
        const nextUserZoom = pinchStart.current.startUserZoom * adjustedRatio;
        applyPinchZoom(
          nextUserZoom,
          pinchStart.current.contentX,
          pinchStart.current.contentY,
          { x: focal.x - rect.left, y: focal.y - rect.top },
        );
        suppressClick.current = true;
        event.preventDefault();
        return;
      }
    }

    const start = scrollPanStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.active && Math.hypot(dx, dy) < 6) return;
    start.active = true;
    suppressClick.current = event.pointerType === "touch";
    viewport.scrollTo({
      left: start.scrollLeft - dx,
      top: start.scrollTop - dy,
    });
    event.preventDefault();
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(event.pointerId);
    if (pinchStart.current && activePointers.current.size < 2) {
      pinchStart.current = null;
      const remaining = Array.from(activePointers.current.entries())[0];
      scrollPanStart.current = remaining && userZoomRef.current > 1.01
        ? {
            pointerId: remaining[0],
            x: remaining[1].x,
            y: remaining[1].y,
            scrollLeft: event.currentTarget.scrollLeft,
            scrollTop: event.currentTarget.scrollTop,
            active: false,
          }
        : null;
      return;
    }

    if (scrollPanStart.current?.pointerId === event.pointerId) scrollPanStart.current = null;
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <section
      ref={workspaceRef}
      className={`relative overflow-hidden bg-[#f1efe9] ${compact ? "h-[calc(100dvh-4rem)]" : "h-[var(--mobile-canvas-height)] min-h-[220px] lg:h-[calc(100dvh-9rem)] lg:min-h-[560px]"}`}
      style={
        {
          "--mobile-canvas-height": mobileSheetState
              ? `calc(100dvh - 3.5rem - 2rem - 78px - ${MOBILE_SHEET_HEIGHTS[mobileSheetState]})`
              : "calc(min(58dvh, 680px) - 2rem)",
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
        style={{ touchAction: userZoom > 1.01 ? "none" : "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        <div
          className="mx-auto transition-[width,height] duration-200 motion-reduce:transition-none"
          style={{
            width: `${templateSize.width * zoom}px`,
            minHeight: `${templateSize.height * zoom}px`,
          }}
        >
          <div
            ref={templateRef}
            className="w-[360px] min-h-[620px] overflow-hidden rounded-[2rem] border-[6px] border-black/10 bg-white shadow-[0_18px_42px_rgba(29,29,27,0.15)] transition-transform duration-200 motion-reduce:transition-none lg:w-[500px]"
            style={{
              transform: `scale(${zoom})`,
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
  onOpenTemplateGallery,
  selectedTemplateId,
  contextSegments,
  toolFocusTarget,
  activeSection,
  onSectionChange,
}: BasicEditorShellProps) {
  const location = useLocation();
  const isEditorActive = location.pathname === "/editor";
  const [mobileSheetState, setMobileSheetState] = useState<MobileSheetState>("medium");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plantillasOpen, setPlantillasOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const plantillasRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const desktopToolsRef = useRef<HTMLElement>(null);
  const mobileToolsRef = useRef<HTMLDivElement>(null);
  const searchEnabled =
    templateSearchItems.length > 0 && Boolean(onTemplateSearchChange) && Boolean(onSelectTemplate);
  const normalizedQuery = templateSearchQuery.trim().toLocaleLowerCase();
  const filteredTemplates = searchEnabled
    ? templateSearchItems.filter((template) =>
        template.name.toLocaleLowerCase().includes(normalizedQuery),
      )
    : [];
  const contextItems = contextSegments?.length ? contextSegments : ["Editar plantilla"];

  const closeAll = () => {
    setMobileMenuOpen(false);
    setPlantillasOpen(false);
    setSearchOpen(false);
  };

  const openPlantillas = () => {
    setPlantillasOpen((open) => !open);
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const openMobileGallery = () => {
    closeAll();
    onOpenTemplateGallery?.();
  };

  const selectTemplate = (templateId: string) => {
    onSelectTemplate?.(templateId);
    closeAll();
  };

  const renderTemplateList = (items: TemplateSearchItem[]) => (
    <>
      {items.map((template) => {
        const isSelected = selectedTemplateId === template.id;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => selectTemplate(template.id)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
          >
            <span className="truncate">{template.name}</span>
            {isSelected && <Check className="h-4 w-4 text-[#D4AF37]" />}
          </button>
        );
      })}
      {items.length === 0 && (
        <p className="px-3 py-5 text-center text-sm text-white/45">
          No se encontraron plantillas.
        </p>
      )}
    </>
  );

  useEffect(() => {
    if (mobilePanelOpen) setMobileSheetState("medium");
  }, [mobilePanelOpen]);

  useEffect(() => {
    if (!mobileMenuOpen && !plantillasOpen && !searchOpen) return;

    const onPointerDown = (event: Event) => {
      const target = event.target as Node;
      if (mobileMenuOpen) {
        if (mobileMenuRef.current?.contains(target)) return;
        if (mobileMenuTriggerRef.current?.contains(target)) return;
      }
      if (plantillasOpen && plantillasRef.current?.contains(target)) return;
      if (searchOpen && searchRef.current?.contains(target)) return;
      closeAll();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAll();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen, plantillasOpen, searchOpen]);

  useEffect(() => {
    if (!toolFocusTarget) return;

    const findTarget = (container: HTMLElement | null) => {
      if (!container) return null;
      return Array.from(container.querySelectorAll<HTMLElement>("[data-tool-target]")).find(
        (element) => element.dataset.toolTarget === toolFocusTarget,
      );
    };
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const target = isDesktop
      ? findTarget(desktopToolsRef.current)
      : findTarget(mobileToolsRef.current) || findTarget(desktopToolsRef.current);
    if (!target) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [toolFocusTarget, mobilePanelOpen]);

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
      <PlatformNavbar
        variant="editor"
        brandHref="/editor"
        logoTheme="inverse"
        className="sticky top-0 z-40 border-b border-white/10 bg-[#090909]/95 px-3 text-[#f5f2ea] backdrop-blur-xl lg:px-6"
        innerClassName="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4"
        brandClassName="shrink-0 transition-opacity hover:opacity-80"
        logoClassName="h-9 w-9 min-[420px]:w-[146px]"
        navigation={
          <nav className="hidden items-center gap-2 lg:flex" aria-label="Navegación principal">
            <Link
              to="/editor"
              className={`rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${isEditorActive ? "bg-white/10 text-[#f5f2ea]" : "text-white/65 hover:bg-white/5 hover:text-white"}`}
              aria-current={isEditorActive ? "page" : undefined}
            >
              Editor
            </Link>
            {searchEnabled && (
              <div ref={plantillasRef} className="relative">
                <button
                  type="button"
                  onClick={openPlantillas}
                  aria-expanded={plantillasOpen}
                  aria-haspopup="menu"
                  aria-controls="plantillas-menu"
                  className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/65 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Plantillas
                </button>
                {plantillasOpen && (
                  <div
                    id="plantillas-menu"
                    className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#161616] shadow-[0_18px_45px_rgba(0,0,0,0.3)]"
                  >
                    <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                      <LayoutTemplate className="h-4 w-4 text-[#D4AF37]" />
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                        Plantillas
                      </p>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2">
                      {renderTemplateList(templateSearchItems)}
                    </div>
                  </div>
                )}
              </div>
            )}
            <Link
              to="/encrypted-documents"
              className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/65 transition-colors hover:bg-white/5 hover:text-white"
            >
              QR cifrado
            </Link>
          </nav>
        }
        center={
          searchEnabled ? (
            <div ref={searchRef} className="relative hidden min-w-[220px] max-w-sm flex-1 justify-center lg:flex">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                aria-label="Buscar plantillas"
                value={templateSearchQuery}
                onChange={(event) => {
                  onTemplateSearchChange?.(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => {
                  setSearchOpen(true);
                  setPlantillasOpen(false);
                }}
                placeholder="Buscar plantillas"
                className="h-10 w-full rounded-full border border-white/15 bg-white/10 pl-10 pr-10 text-sm text-white outline-none transition-all placeholder:text-white/40 focus:w-[min(100%,20rem)] focus:border-[#D4AF37]/70 focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.16)]"
              />
              {templateSearchQuery && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => onTemplateSearchChange?.("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {searchOpen && (
                <div
                  id="search-results"
                  className="absolute top-12 z-50 w-full min-w-[18rem] overflow-hidden rounded-2xl border border-white/10 bg-[#161616] shadow-[0_18px_45px_rgba(0,0,0,0.3)]"
                >
                  <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                    <Search className="h-4 w-4 text-[#D4AF37]" />
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Plantillas
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {renderTemplateList(filteredTemplates)}
                  </div>
                </div>
              )}
            </div>
          ) : null
        }
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Vista previa"
              onClick={onPreview}
              className="h-12 w-12 text-white/75 hover:bg-white/10 hover:text-white lg:h-10 lg:w-10"
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
              className="h-12 w-12 rounded-xl border border-white/10 bg-white/10 text-white/85 hover:bg-white/15 lg:h-10 lg:w-10"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={onPublish}
              disabled={publishing || publishDisabled}
              className="h-12 w-12 rounded-xl bg-[#D4AF37] px-0 text-xs text-[#090909] hover:bg-[#e6c45b] min-[390px]:w-auto min-[390px]:px-3 lg:h-10"
            >
              <Send className="h-4 w-4 min-[390px]:mr-1.5" />
              <span className="hidden min-[390px]:inline">
                {publishing ? "Publicando..." : "Publicar"}
              </span>
            </Button>
            <Button
              ref={mobileMenuTriggerRef}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="h-12 w-12 rounded-xl text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        }
        mobile={mobileMenuOpen && (
          <>
            <div
              className="fixed inset-x-0 bottom-0 top-14 z-40 bg-black/25 backdrop-blur-[1px] lg:hidden"
              aria-hidden="true"
            />
            <div
              ref={mobileMenuRef}
              id="mobile-menu"
              className="fixed inset-x-3 top-[calc(3.5rem+0.5rem)] z-50 max-h-[calc(100dvh-4.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#161616] p-3 text-[#f5f2ea] shadow-[0_18px_45px_rgba(0,0,0,0.3)] lg:hidden"
            >
              {searchEnabled && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="search"
                    aria-label="Buscar plantillas"
                    value={templateSearchQuery}
                    onChange={(event) => onTemplateSearchChange?.(event.target.value)}
                    placeholder="Buscar plantillas"
                    className="h-11 w-full rounded-full border border-white/15 bg-white/10 pl-10 pr-10 text-sm text-white outline-none placeholder:text-white/40"
                  />
                  {templateSearchQuery && (
                    <button
                      type="button"
                      aria-label="Limpiar búsqueda"
                      onClick={() => onTemplateSearchChange?.("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {searchEnabled && templateSearchQuery.trim() !== "" && (
                <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-[#111111] p-2 shadow-sm">
                  {renderTemplateList(filteredTemplates)}
                </div>
              )}

              <nav className="mt-3 flex flex-col gap-1" aria-label="Menú móvil principal">
                <Link
                  to="/editor"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block min-h-12 rounded-xl bg-white/10 px-3 py-3 text-sm font-medium text-[#f5f2ea]"
                  aria-current={isEditorActive ? "page" : undefined}
                >
                  Editor
                </Link>
                {searchEnabled && (
                  <button
                    type="button"
                    onClick={openMobileGallery}
                    className="block min-h-12 w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-white/65 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    Plantillas
                  </button>
                )}
                <Link
                  to="/encrypted-documents"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block min-h-12 rounded-xl px-3 py-3 text-sm font-medium text-white/65 transition-colors hover:bg-white/5 hover:text-white"
                >
                  QR cifrado
                </Link>
              </nav>
            </div>
          </>
        )}
      />

      <nav
        className="sticky top-14 z-30 flex h-8 items-center border-b border-white/10 bg-[#090909]/85 px-3 text-[11px] font-medium text-white/50 backdrop-blur-xl lg:px-6"
        aria-label="Contexto de edición"
      >
        <ol className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {contextItems.map((item, index) => {
            const isCurrent = index === contextItems.length - 1;
            return (
              <li key={`${item}-${index}`} className="flex min-w-0 items-center gap-1">
                {index > 0 && <span className="text-white/25">/</span>}
                <span
                  aria-current={isCurrent ? "location" : undefined}
                  className={`truncate ${isCurrent ? "text-white/85" : ""}`}
                >
                  {item}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="lg:grid lg:h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.85fr)]">
        <main className="min-w-0 border-b border-stone-200 lg:min-h-0 lg:overflow-hidden lg:border-b-0 lg:border-r">
          <CanvasWorkspace
            viewportRef={canvasViewportRef}
            mobileSheetState={mobilePanelOpen ? mobileSheetState : undefined}
            resetKey={selectedTemplateId}
          >
            {canvas}
          </CanvasWorkspace>
        </main>
        <aside ref={desktopToolsRef} className="hidden min-h-0 overflow-y-auto bg-[#fffefa] lg:block">
          <div className="sticky top-0 z-10 border-b border-stone-200 bg-[#fffefa]/95 px-5 py-3 backdrop-blur-xl">
            <DesktopSectionNav activeSection={activeSection ?? "profile"} onSectionChange={onSectionChange ?? (() => {})} />
          </div>
          <div className="p-6">{desktopPanel}</div>
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
          <div ref={mobileToolsRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            {mobilePanel}
          </div>
        </section>
      )}
    </div>
  );
}
