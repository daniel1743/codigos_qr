import { Check, Eye, LayoutTemplate, LogOut, Menu, Minus, RotateCcw, Save, Search, Send, UserCircle, X, ZoomIn } from "lucide-react";
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

export type BasicEditorProfileState = "ready" | "missing" | "error";
export type BasicEditorAccount = {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

interface BasicEditorShellProps {
  account?: BasicEditorAccount | null;
  onSignOut?: () => Promise<void>;
  profileState: BasicEditorProfileState;
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
const ZOOM_STEP = 1.05;
const CANVAS_OVERSCAN = 48;
const MIN_VISIBLE_CANVAS = 48;
const VIEWPORT_HORIZONTAL_PADDING = 40;
const VIEWPORT_VERTICAL_PADDING = 88;
const TEMPLATE_WIDTH = 360;
const TEMPLATE_MIN_HEIGHT = 620;

const MOBILE_SHEET_HEIGHTS: Record<MobileSheetState, string> = {
  collapsed: "18dvh",
  medium: "34dvh",
  expanded: "48dvh",
};

type CanvasPoint = { x: number; y: number };
type PanState = {
  pointerId: number;
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  active: boolean;
};
type PinchState = {
  startDistance: number;
  startScale: number;
  startTranslate: CanvasPoint;
  startOrigin: CanvasPoint;
  startFocal: CanvasPoint;
  worldPoint: CanvasPoint;
};
type ViewportSize = { width: number; height: number };

function clamp(value: number, min: number, max: number) {
  const safeValue = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, safeValue));
}

function distance(first: CanvasPoint, second: CanvasPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function midpoint(first: CanvasPoint, second: CanvasPoint) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function isFinitePoint(point: CanvasPoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
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
  const panStart = useRef<PanState | null>(null);
  const suppressClick = useRef(false);
  const [fitZoom, setFitZoom] = useState(0.9);
  const [userZoom, setUserZoom] = useState(1);
  const [translate, setTranslate] = useState<CanvasPoint>({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [templateSize, setTemplateSize] = useState({
    width: TEMPLATE_WIDTH,
    height: TEMPLATE_MIN_HEIGHT,
  });
  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    width: TEMPLATE_WIDTH,
    height: TEMPLATE_MIN_HEIGHT,
  });
  const userZoomRef = useRef(userZoom);
  const fitZoomRef = useRef(fitZoom);
  const templateSizeRef = useRef(templateSize);
  const viewportSizeRef = useRef(viewportSize);
  const translateRef = useRef(translate);
  const zoomRef = useRef(MIN_ZOOM);

  const minScale = Math.max(MIN_ZOOM, fitZoom * MIN_USER_ZOOM);
  const maxScale = Math.max(minScale, fitZoom * MAX_USER_ZOOM);
  const zoom = clamp(fitZoom * userZoom, minScale, maxScale);

  userZoomRef.current = userZoom;
  fitZoomRef.current = fitZoom;
  templateSizeRef.current = templateSize;
  viewportSizeRef.current = viewportSize;
  translateRef.current = translate;
  zoomRef.current = zoom;

  const getScaleBounds = (baseFitZoom = fitZoomRef.current) => {
    const minimum = Math.max(MIN_ZOOM, baseFitZoom * MIN_USER_ZOOM);
    return {
      min: minimum,
      max: Math.max(minimum, baseFitZoom * MAX_USER_ZOOM),
    };
  };

  const getCanvasGeometry = (scale: number) => {
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : MIN_ZOOM;
    const scaledWidth = templateSizeRef.current.width * safeScale;
    const scaledHeight = templateSizeRef.current.height * safeScale;
    const availableWidth = Math.max(1, viewportSizeRef.current.width);
    const availableHeight = Math.max(1, viewportSizeRef.current.height);
    const stageWidth = scaledWidth > availableWidth ? scaledWidth + CANVAS_OVERSCAN * 2 : availableWidth;
    const stageHeight = scaledHeight > availableHeight ? scaledHeight + CANVAS_OVERSCAN * 2 : availableHeight;

    return {
      scaledWidth,
      scaledHeight,
      stageWidth,
      stageHeight,
      originX: scaledWidth > availableWidth ? CANVAS_OVERSCAN : (availableWidth - scaledWidth) / 2,
      originY: scaledHeight > availableHeight ? CANVAS_OVERSCAN : (availableHeight - scaledHeight) / 2,
    };
  };

  const getTranslationBounds = (scale: number) => {
    const geometry = getCanvasGeometry(scale);
    const viewport = viewportRef.current;
    const scrollLeft = viewport?.scrollLeft ?? 0;
    const scrollTop = viewport?.scrollTop ?? 0;
    const visibleWidth = Math.max(1, viewportSizeRef.current.width);
    const visibleHeight = Math.max(1, viewportSizeRef.current.height);

    return {
      minX: scrollLeft + MIN_VISIBLE_CANVAS - geometry.originX - geometry.scaledWidth,
      maxX: scrollLeft + visibleWidth - MIN_VISIBLE_CANVAS - geometry.originX,
      minY: scrollTop + MIN_VISIBLE_CANVAS - geometry.originY - geometry.scaledHeight,
      maxY: scrollTop + visibleHeight - MIN_VISIBLE_CANVAS - geometry.originY,
    };
  };

  const clampTranslation = (next: CanvasPoint, scale = zoomRef.current) => {
    const bounds = getTranslationBounds(scale);
    return {
      x: clamp(next.x, Math.min(bounds.minX, bounds.maxX), Math.max(bounds.minX, bounds.maxX)),
      y: clamp(next.y, Math.min(bounds.minY, bounds.maxY), Math.max(bounds.minY, bounds.maxY)),
    };
  };

  const canvasNeedsPan = () => {
    const geometry = getCanvasGeometry(zoomRef.current);
    return userZoomRef.current > 1.01 ||
      geometry.scaledWidth > viewportSizeRef.current.width ||
      geometry.scaledHeight > viewportSizeRef.current.height;
  };

  useEffect(() => {
    const workspace = workspaceRef.current;
    const viewport = viewportRef.current;
    if (!workspace || !viewport) return;

    const updateFit = () => {
      const template = templateRef.current;
      const measuredWidth = template
        ? Math.max(TEMPLATE_WIDTH, template.scrollWidth, template.offsetWidth)
        : templateSize.width;
      const measuredHeight = template
        ? Math.max(TEMPLATE_MIN_HEIGHT, template.scrollHeight, template.offsetHeight)
        : templateSize.height;
      const availableWidth = Math.max(1, viewport.clientWidth - VIEWPORT_HORIZONTAL_PADDING);
      const availableHeight = Math.max(1, viewport.clientHeight - VIEWPORT_VERTICAL_PADDING);
      const nextFit = clamp(Math.min(availableWidth / measuredWidth, availableHeight / measuredHeight, 1), MIN_ZOOM, 1);
      const nextTemplateSize = { width: measuredWidth, height: measuredHeight };
      const nextViewportSize = { width: availableWidth, height: availableHeight };

      templateSizeRef.current = nextTemplateSize;
      viewportSizeRef.current = nextViewportSize;
      setTemplateSize((current) =>
        current.width === measuredWidth && current.height === measuredHeight ? current : nextTemplateSize,
      );
      setViewportSize((current) =>
        current.width === availableWidth && current.height === availableHeight ? current : nextViewportSize,
      );
      setFitZoom((current) => (current === nextFit ? current : nextFit));

      const nextBounds = getScaleBounds(nextFit);
      const nextScale = clamp(nextFit * userZoomRef.current, nextBounds.min, nextBounds.max);
      if (userZoomRef.current === 1) {
        setTranslate({ x: 0, y: 0 });
        viewport.scrollTo({ left: 0, top: 0 });
      } else {
        setTranslate((current) => clampTranslation(current, nextScale));
      }
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
      panStart.current = null;
      suppressClick.current = false;
      setIsInteracting(false);
    };

    resetGestureState();
    setUserZoom(1);
    setTranslate({ x: 0, y: 0 });
    viewport?.scrollTo({ left: 0, top: 0 });

    return resetGestureState;
  }, [resetKey, viewportRef]);

  const applyZoomAt = (nextScale: number, focalClient: CanvasPoint) => {
    const template = templateRef.current;
    if (!template) return;

    const currentScale = zoomRef.current;
    if (!Number.isFinite(currentScale) || currentScale <= 0) return;
    const currentRect = template.getBoundingClientRect();
    const worldPoint = {
      x: (focalClient.x - currentRect.left) / currentScale,
      y: (focalClient.y - currentRect.top) / currentScale,
    };
    const bounds = getScaleBounds();
    const clampedScale = clamp(nextScale, bounds.min, bounds.max);
    const currentGeometry = getCanvasGeometry(currentScale);
    const nextGeometry = getCanvasGeometry(clampedScale);
    const nextTranslate = clampTranslation({
      x: translateRef.current.x + currentGeometry.originX - nextGeometry.originX + worldPoint.x * (currentScale - clampedScale),
      y: translateRef.current.y + currentGeometry.originY - nextGeometry.originY + worldPoint.y * (currentScale - clampedScale),
    }, clampedScale);

    setUserZoom(clamp(clampedScale / fitZoomRef.current, MIN_USER_ZOOM, MAX_USER_ZOOM));
    setTranslate(nextTranslate);
  };

  const updateZoom = (nextScale: number, focalClient?: CanvasPoint) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    applyZoomAt(
      nextScale,
      focalClient ?? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    );
  };

  const recenter = () => {
    setUserZoom(1);
    setTranslate({ x: 0, y: 0 });
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const focal = {
        x: Number.isFinite(event.clientX) ? event.clientX : rect.left + rect.width / 2,
        y: Number.isFinite(event.clientY) ? event.clientY : rect.top + rect.height / 2,
      };
      updateZoom(zoomRef.current * Math.exp(-event.deltaY * 0.001), focal);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [fitZoom, viewportRef, zoom]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;
    if (activePointers.current.size === 0) suppressClick.current = false;

    if (event.pointerType === "touch") {
      const point = { x: event.clientX, y: event.clientY };
      if (!isFinitePoint(point)) return;
      activePointers.current.set(event.pointerId, point);
      setIsInteracting(true);
      try {
        viewport.setPointerCapture(event.pointerId);
      } catch {
        // Some mobile browsers can reject capture during native gestures.
      }

      if (activePointers.current.size === 2) {
        const points = Array.from(activePointers.current.values());
        const [firstPoint, secondPoint] = points;
        if (!firstPoint || !secondPoint) return;
        const startFocal = midpoint(firstPoint, secondPoint);
        const template = templateRef.current;
        const rect = template?.getBoundingClientRect();
        if (!rect) return;
        const startScale = zoomRef.current;
        const startGeometry = getCanvasGeometry(startScale);
        pinchStart.current = {
          startDistance: Math.max(1, distance(firstPoint, secondPoint)),
          startScale,
          startTranslate: translateRef.current,
          startOrigin: { x: startGeometry.originX, y: startGeometry.originY },
          startFocal,
          worldPoint: {
            x: (startFocal.x - rect.left) / startScale,
            y: (startFocal.y - rect.top) / startScale,
          },
        };
        panStart.current = null;
        suppressClick.current = true;
        event.preventDefault();
        return;
      }

      if (!(event.target as HTMLElement).closest("[data-edit-target], button, input, textarea, a") && canvasNeedsPan()) {
        panStart.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          translateX: translateRef.current.x,
          translateY: translateRef.current.y,
          active: false,
        };
      }
      return;
    }

    if ((event.target as HTMLElement).closest("[data-edit-target], button, input, textarea, a"))
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsInteracting(true);
    panStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      translateX: translateRef.current.x,
      translateY: translateRef.current.y,
      active: true,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;

    if (event.pointerType === "touch") {
      if (!activePointers.current.has(event.pointerId)) return;
      const point = { x: event.clientX, y: event.clientY };
      if (!isFinitePoint(point)) return;
      activePointers.current.set(event.pointerId, point);

      if (pinchStart.current && activePointers.current.size >= 2) {
        const points = Array.from(activePointers.current.values());
        const [firstPoint, secondPoint] = points;
        if (!firstPoint || !secondPoint) return;
        const focal = midpoint(firstPoint, secondPoint);
        const currentDistance = Math.max(1, distance(firstPoint, secondPoint));
        const pinchRatio = currentDistance / pinchStart.current.startDistance;
        const bounds = getScaleBounds();
        const nextScale = clamp(pinchStart.current.startScale * pinchRatio, bounds.min, bounds.max);
        const nextGeometry = getCanvasGeometry(nextScale);
        const nextTranslate = clampTranslation({
          x: pinchStart.current.startTranslate.x + pinchStart.current.startOrigin.x - nextGeometry.originX +
            (focal.x - pinchStart.current.startFocal.x) +
            pinchStart.current.worldPoint.x * (pinchStart.current.startScale - nextScale),
          y: pinchStart.current.startTranslate.y + pinchStart.current.startOrigin.y - nextGeometry.originY +
            (focal.y - pinchStart.current.startFocal.y) +
            pinchStart.current.worldPoint.y * (pinchStart.current.startScale - nextScale),
        }, nextScale);
        setUserZoom(clamp(nextScale / fitZoomRef.current, MIN_USER_ZOOM, MAX_USER_ZOOM));
        setTranslate(nextTranslate);
        suppressClick.current = true;
        event.preventDefault();
        return;
      }
    }

    const start = panStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.active && Math.hypot(dx, dy) < 6) return;
    start.active = true;
    suppressClick.current = event.pointerType === "touch";
    setTranslate(clampTranslation({
      x: start.translateX + dx,
      y: start.translateY + dy,
    }));
    event.preventDefault();
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") activePointers.current.delete(event.pointerId);
    if (pinchStart.current && activePointers.current.size < 2) {
      pinchStart.current = null;
      const remaining = Array.from(activePointers.current.entries())[0];
      panStart.current = remaining && canvasNeedsPan()
        ? {
            pointerId: remaining[0],
            x: remaining[1].x,
            y: remaining[1].y,
            translateX: translateRef.current.x,
            translateY: translateRef.current.y,
            active: false,
          }
        : null;
      if (activePointers.current.size === 0) setIsInteracting(false);
      return;
    }

    if (panStart.current?.pointerId === event.pointerId) panStart.current = null;
    if (activePointers.current.size === 0) setIsInteracting(false);
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const canvasGeometry = getCanvasGeometry(zoom);

  return (
    <section
      ref={workspaceRef}
      className={`relative overflow-hidden bg-[#f1efe9] ${compact ? "h-[calc(100dvh-4rem)]" : "h-[var(--mobile-canvas-height)] min-h-[220px] lg:h-[calc(100dvh-9rem)] lg:min-h-[560px]"}`}
      style={
        {
          "--mobile-canvas-height": mobileSheetState
              ? `calc(100dvh - 3.5rem - 2rem - 78px - env(safe-area-inset-bottom, 0px) - ${MOBILE_SHEET_HEIGHTS[mobileSheetState]})`
              : "calc(100dvh - 3.5rem - 2rem - 78px - env(safe-area-inset-bottom, 0px))",
        } as CSSProperties
      }
    >
      <div className="absolute right-3 top-3 z-20 hidden overflow-hidden rounded-xl border border-stone-200 bg-[#fffefa]/95 shadow-sm backdrop-blur lg:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Reducir zoom"
          onClick={() => updateZoom(zoom / ZOOM_STEP)}
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
          onClick={() => updateZoom(zoom * ZOOM_STEP)}
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
        className="h-full select-none overflow-auto overscroll-contain px-5 pb-8 pt-14"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        <div
          className="relative shrink-0"
          style={{
            width: `${canvasGeometry.stageWidth}px`,
            height: `${canvasGeometry.stageHeight}px`,
          }}
        >
          <div
            ref={templateRef}
            className={`absolute w-[360px] min-h-[620px] overflow-hidden rounded-[2rem] border-[6px] border-black/10 bg-white shadow-[0_18px_42px_rgba(29,29,27,0.15)] ${isInteracting ? "transition-none" : "transition-transform duration-150 ease-out motion-reduce:transition-none"} lg:w-[500px]`}
            style={{
              left: `${canvasGeometry.originX}px`,
              top: `${canvasGeometry.originY}px`,
              transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${zoom})`,
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
  account,
  onSignOut,
  profileState,
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
  const [signingOut, setSigningOut] = useState(false);
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
  const accountName = account?.fullName;
  const accountAvatar = account?.avatarUrl;

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

  const handleSignOut = async () => {
    if (!onSignOut) return;
    setSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
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
          (element) => element.dataset["toolTarget"] === toolFocusTarget,
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
    <div className="basic-editor-shell min-h-screen bg-[#f1efe9] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] text-[#1d1d1b] lg:h-screen lg:overflow-hidden lg:pb-0">
      <style>{`
        [data-radix-dialog-content] > div > div.min-h-0.flex-1.overflow-y-auto:has(> .basic-editor-shell-drawer-content) {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        [data-radix-dialog-content] > div > div.min-h-0.flex-1.overflow-y-auto:has(> .basic-editor-shell-drawer-content)::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .basic-editor-shell .select-none.overflow-auto.overscroll-contain {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .basic-editor-shell .select-none.overflow-auto.overscroll-contain::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .basic-editor-shell__inspector-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(29, 29, 27, 0.22) transparent;
        }

        .basic-editor-shell__inspector-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }

        .basic-editor-shell__inspector-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .basic-editor-shell__inspector-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(29, 29, 27, 0.22);
        }

        .basic-editor-shell__inspector-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(29, 29, 27, 0.38);
        }
      `}</style>
      <PlatformNavbar
        variant="editor"
        brandHref="/editor"
        logoTheme="inverse"
        className="sticky top-0 z-40 border-b border-white/10 bg-[#090909]/95 px-3 text-[#f5f2ea] backdrop-blur-xl lg:px-6"
        innerClassName="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4"
        brandClassName="shrink-0 transition-opacity hover:opacity-80"
        logoClassName="h-[34px] w-[34px] min-[420px]:w-[146px]"
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
          </div>
        }
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuChange={setMobileMenuOpen}
        mobileMenuContent={
          <div className="basic-editor-shell-drawer-content flex flex-col min-h-full pb-6 relative">
            {/* Top dark wave */}
            <div className="absolute top-0 left-0 w-full h-[180px] bg-[#161616] overflow-hidden z-0">
               <svg className="absolute bottom-0 w-full h-[120px] text-[#0a0a0a] translate-y-[2px]" viewBox="0 0 1440 320" preserveAspectRatio="none">
                 <path fill="currentColor" d="M0,160L80,181.3C160,203,320,245,480,245.3C640,245,800,203,960,181.3C1120,160,1280,160,1360,160L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
               </svg>
            </div>
            
            <div className="relative z-10 px-6 pt-[80px] mb-6">
              {/* Profile Avatar */}
              <div className="inline-block rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#e6c45b] to-[#f8efcf] p-[3px] mb-3 shadow-lg">
                <span className="grid h-[86px] w-[86px] shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-[#0a0a0a] bg-white/10 text-white/50">
                  {accountAvatar ? (
                    <img src={accountAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="h-10 w-10" aria-hidden="true" />
                  )}
                </span>
              </div>
              <h2 className="text-[28px] font-bold text-white leading-tight">
                {accountName || account?.email?.split('@')[0] || "Usuario"}
              </h2>
              <p className="text-[15px] font-medium text-white/50">
                {account?.email || ""}
              </p>
              {profileState === "error" && (
                <p className="mt-3 max-w-[15rem] text-xs leading-5 text-amber-200/85" role="alert">
                  No pudimos cargar los datos guardados. Tus datos no se han eliminado.
                </p>
              )}
            </div>

            <div className="px-4 flex-1 relative z-10">
              {searchEnabled && (
                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="search"
                    aria-label="Buscar plantillas"
                    value={templateSearchQuery}
                    onChange={(event) => onTemplateSearchChange?.(event.target.value)}
                    placeholder="Buscar plantillas"
                    className="h-11 w-full rounded-full border border-white/15 bg-white/10 pl-10 pr-10 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/30 focus:ring-1 focus:ring-white/30"
                  />
                  {templateSearchQuery && (
                    <button
                      type="button"
                      aria-label="Limpiar búsqueda"
                      onClick={() => onTemplateSearchChange?.("")}
                      className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {searchEnabled && templateSearchQuery.trim() !== "" && (
                <div className="mb-4 max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-[#111111] p-2 shadow-sm">
                  {renderTemplateList(filteredTemplates)}
                </div>
              )}

              <nav className="flex flex-col gap-1" aria-label="Menú móvil principal">
                <Link
                  to="/editor"
                  data-close="true"
                  className={`flex items-center gap-3 min-h-[52px] rounded-2xl px-4 py-3 text-base font-medium transition-colors ${isEditorActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
                  aria-current={isEditorActive ? "page" : undefined}
                >
                  <LayoutTemplate className="h-5 w-5" />
                  Editor
                </Link>

                <hr className="my-2 border-white/5 mx-2" />

                {searchEnabled && (
                  <button
                    type="button"
                    onClick={openMobileGallery}
                    className="flex items-center gap-3 min-h-[52px] w-full rounded-2xl px-4 py-3 text-left text-base font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Search className="h-5 w-5" />
                    Biblioteca
                  </button>
                )}
                <Link
                  to="/encrypted-documents"
                  data-close="true"
                  className="flex items-center gap-3 min-h-[52px] rounded-2xl px-4 py-3 text-base font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Check className="h-5 w-5" />
                  QR cifrado
                </Link>
                <Link
                  to="/profile"
                  data-close="true"
                  className="flex items-center gap-3 min-h-[52px] rounded-2xl px-4 py-3 text-base font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <UserCircle className="h-5 w-5" />
                  Mi Perfil
                </Link>

                <hr className="my-2 border-white/5 mx-2" />

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut || !onSignOut}
                  className="flex items-center gap-3 min-h-[52px] w-full rounded-2xl px-4 py-3 text-left text-base font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  <LogOut className="h-5 w-5" />
                  {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </button>
              </nav>
            </div>
          </div>
        }
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
          {mobilePanelOpen ? (
            <CanvasWorkspace
              viewportRef={canvasViewportRef}
              mobileSheetState={mobileSheetState}
              resetKey={selectedTemplateId ?? null}
            >
              {canvas}
            </CanvasWorkspace>
          ) : (
            <CanvasWorkspace viewportRef={canvasViewportRef} resetKey={selectedTemplateId ?? null}>
              {canvas}
            </CanvasWorkspace>
          )}
        </main>
        <aside ref={desktopToolsRef} className="basic-editor-shell__inspector-scroll hidden min-h-0 overflow-y-auto bg-[#fffefa] lg:block">
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
          <div ref={mobileToolsRef} className="basic-editor-shell__inspector-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            {mobilePanel}
          </div>
        </section>
      )}
    </div>
  );
}
