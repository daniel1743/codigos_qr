import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { cx } from "../../utils";
import { usePowerCanvasCamera } from "./usePowerCanvasCamera";

interface PowerCanvasViewportProps {
  children: ReactNode;
  contentWidth: number;
  onBackgroundClick: () => void;
}

function ZoomButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      {label}
    </button>
  );
}

type CameraDiagnosticSample = {
  cycle: number;
  viewport: string;
  stage: string;
  cameraLayer: string;
  renderer: string;
  block: string;
  styles: string;
};

function elementDiagnostic(element: HTMLElement | null): string {
  if (!element) return "missing";
  const rect = element.getBoundingClientRect();
  return JSON.stringify({
    tag: element.tagName.toLowerCase(),
    class: element.className,
    parent: element.parentElement?.className ?? "",
    client: [element.clientWidth, element.clientHeight],
    offset: [element.offsetWidth, element.offsetHeight],
    scroll: [element.scrollWidth, element.scrollHeight],
    offsetPosition: [element.offsetLeft, element.offsetTop],
    rect: [rect.x, rect.y, rect.width, rect.height, rect.top, rect.left, rect.right, rect.bottom],
  });
}

function computedStyleDiagnostic(element: HTMLElement | null) {
  if (!element) return "missing";
  const styles = getComputedStyle(element);
  return JSON.stringify({
    display: styles.display,
    visibility: styles.visibility,
    opacity: styles.opacity,
    position: styles.position,
    inset: styles.inset,
    top: styles.top,
    left: styles.left,
    right: styles.right,
    bottom: styles.bottom,
    width: styles.width,
    height: styles.height,
    minWidth: styles.minWidth,
    minHeight: styles.minHeight,
    maxWidth: styles.maxWidth,
    maxHeight: styles.maxHeight,
    overflowX: styles.overflowX,
    overflowY: styles.overflowY,
    transform: styles.transform,
    transformOrigin: styles.transformOrigin,
    translate: styles.translate,
    scale: styles.scale,
    zIndex: styles.zIndex,
    contain: styles.contain,
  });
}

function CameraDiagnostic({
  viewportRef,
  stageRef,
  contentRef,
  camera,
  stage,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  camera: ReturnType<typeof usePowerCanvasCamera>["camera"];
  stage: ReturnType<typeof usePowerCanvasCamera>["stage"];
}) {
  const [samples, setSamples] = useState<CameraDiagnosticSample[]>([]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let cancelled = false;
    let cycle = 0;
    let frameId = 0;
    const collected: CameraDiagnosticSample[] = [];
    const collect = () => {
      if (cancelled || cycle >= 5) return;
      cycle += 1;
      const viewport = viewportRef.current;
      const stageElement = stageRef.current;
      const cameraLayer = contentRef.current;
      const renderer = cameraLayer?.firstElementChild as HTMLElement | null;
      const firstBlock = renderer?.querySelector<HTMLElement>(".pts-block") ?? null;
      const nextSample: CameraDiagnosticSample = {
        cycle,
        viewport: elementDiagnostic(viewport),
        stage: elementDiagnostic(stageElement),
        cameraLayer: elementDiagnostic(cameraLayer),
        renderer: elementDiagnostic(renderer),
        block: elementDiagnostic(firstBlock),
        styles: JSON.stringify({
          viewport: computedStyleDiagnostic(viewport),
          stage: computedStyleDiagnostic(stageElement),
          cameraLayer: computedStyleDiagnostic(cameraLayer),
          renderer: computedStyleDiagnostic(renderer),
        }),
      };
      collected.push(nextSample);
      if (collected.length === 5) {
        setSamples(collected);
        return;
      }
      frameId = requestAnimationFrame(collect);
    };
    frameId = requestAnimationFrame(collect);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [contentRef, stageRef, viewportRef]);

  if (!import.meta.env.DEV || samples.length === 0) return null;
  return (
    <pre
      aria-label="DEV camera diagnostics"
      className="pointer-events-none absolute bottom-2 left-2 z-30 max-h-40 max-w-[min(90%,42rem)] overflow-auto rounded bg-black/85 p-2 text-[9px] leading-tight text-white"
    >
      {JSON.stringify(
        {
          camera: {
            fitZoom: camera.fitZoom,
            userZoom: camera.userZoom,
            effectiveScale: camera.scale,
            translateX: camera.translateX,
            translateY: camera.translateY,
            viewportWidth: camera.viewportWidth,
            viewportHeight: camera.viewportHeight,
            contentWidth: camera.contentWidth,
            contentHeight: camera.contentHeight,
            stageWidth: stage.stageWidth,
            stageHeight: stage.stageHeight,
            stageOriginX: stage.originX,
            stageOriginY: stage.originY,
          },
          samples,
        },
        null,
        2,
      )}
    </pre>
  );
}

export function PowerCanvasViewport({
  children,
  contentWidth,
  onBackgroundClick,
}: PowerCanvasViewportProps) {
  const { viewportRef, contentRef, camera, stage, controls } = usePowerCanvasCamera();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stageStyle: CSSProperties = {
    position: "relative",
    width: stage.stageWidth,
    height: stage.stageHeight,
  };
  const cameraLayerStyle: CSSProperties = {
    position: "absolute",
    left: stage.originX,
    top: stage.originY,
    width: Math.max(1, contentWidth),
    transform: `translate3d(${camera.translateX}px, ${camera.translateY}px, 0) scale(${camera.scale})`,
    transformOrigin: "top left",
  };

  return (
    <div className="pts-power-viewport-shell relative min-h-0 min-w-0 flex-1">
      <div
        ref={viewportRef}
        className="pts-power-viewport h-full min-h-0 min-w-0 overflow-auto overscroll-contain bg-muted/50 p-4 sm:p-8"
        onClick={onBackgroundClick}
      >
        <div ref={stageRef} className="pts-power-camera-stage" style={stageStyle}>
          <div
            ref={contentRef}
            className="pts-power-camera-layer"
            style={cameraLayerStyle}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>

      <CameraDiagnostic
        viewportRef={viewportRef}
        stageRef={stageRef}
        contentRef={contentRef}
        camera={camera}
        stage={stage}
      />

      <div
        className="absolute left-1/2 top-3 z-10 hidden -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-sm backdrop-blur lg:flex"
        aria-label="Canvas zoom controls"
        onClick={(event) => event.stopPropagation()}
      >
        <ZoomButton label="−" onClick={controls.zoomOut} />
        <span
          className="min-w-12 px-1 text-center text-[11px] font-medium text-foreground"
          aria-live="polite"
        >
          {Math.round(camera.scale * 100)}%
        </span>
        <ZoomButton label="+" onClick={controls.zoomIn} />
        <button
          type="button"
          onClick={controls.fit}
          className={cx(
            "rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition",
            "hover:bg-accent hover:text-foreground",
          )}
        >
          Fit
        </button>
        <button
          type="button"
          onClick={controls.reset}
          className={cx(
            "rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition",
            "hover:bg-accent hover:text-foreground",
          )}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
