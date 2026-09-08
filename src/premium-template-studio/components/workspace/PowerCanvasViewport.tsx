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
import { calculateFitZoom } from "./powerCanvasCameraMath";

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
  const reconstructionStep =
    import.meta.env.DEV && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("cameraDebug")
      : null;
  const requestedControlledScale =
    import.meta.env.DEV && typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("cameraScale") ?? 1)
      : 1;
  const controlledScale = [0.5, 0.75, 1, 1.25].includes(requestedControlledScale)
    ? requestedControlledScale
    : 1;
  const { viewportRef, contentRef, camera, controls } = usePowerCanvasCamera();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const reconstructionViewportRef = useRef<HTMLDivElement | null>(null);
  const reconstructionContentRef = useRef<HTMLDivElement | null>(null);
  const [reconstructionContentHeight, setReconstructionContentHeight] = useState(1);
  const [reconstructionViewportSize, setReconstructionViewportSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (
      reconstructionStep !== "stage" &&
      reconstructionStep !== "camera1" &&
      reconstructionStep !== "scale" &&
      reconstructionStep !== "fit"
    )
      return;

    let cancelled = false;
    const frameId = requestAnimationFrame(() => {
      if (cancelled) return;
      const content = reconstructionContentRef.current;
      const nextHeight = Math.max(1, content?.scrollHeight ?? 0, content?.offsetHeight ?? 0);
      setReconstructionContentHeight((previous) =>
        previous === nextHeight ? previous : nextHeight,
      );
      const viewport = reconstructionViewportRef.current;
      const nextViewportSize = {
        width: Math.max(0, viewport?.clientWidth ?? 0),
        height: Math.max(0, viewport?.clientHeight ?? 0),
      };
      setReconstructionViewportSize((previous) =>
        previous.width === nextViewportSize.width && previous.height === nextViewportSize.height
          ? previous
          : nextViewportSize,
      );
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [contentWidth, reconstructionStep]);
  const reconstructionFitZoom = calculateFitZoom({
    viewportWidth: reconstructionViewportSize.width,
    viewportHeight: reconstructionViewportSize.height,
    contentWidth: Math.max(1, contentWidth),
    contentHeight: reconstructionContentHeight,
  });

  if (reconstructionStep === "viewport") {
    return (
      <div
        ref={reconstructionViewportRef}
        data-camera-debug-mode="CAMERA_ON"
        data-camera-reconstruction-step="VIEWPORT_ONLY"
        className="relative h-full max-h-full w-full min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-muted/50 p-4 sm:p-8"
        onClick={onBackgroundClick}
      >
        <div onClick={(event) => event.stopPropagation()}>{children}</div>
      </div>
    );
  }

  if (reconstructionStep === "stage") {
    return (
      <div
        ref={reconstructionViewportRef}
        data-camera-debug-mode="CAMERA_ON"
        data-camera-reconstruction-step="STAGE_NO_TRANSFORM"
        className="relative h-full max-h-full w-full min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-muted/50 p-4 sm:p-8"
        onClick={onBackgroundClick}
      >
        <div
          className="pts-power-camera-stage"
          style={{
            position: "relative",
            width: Math.max(1, contentWidth),
            height: reconstructionContentHeight,
          }}
        >
          <div ref={reconstructionContentRef} onClick={(event) => event.stopPropagation()}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (reconstructionStep === "camera1") {
    return (
      <div
        ref={reconstructionViewportRef}
        data-camera-debug-mode="CAMERA_ON"
        data-camera-reconstruction-step="CAMERA_SCALE_1"
        className="relative h-full max-h-full w-full min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-muted/50 p-4 sm:p-8"
        onClick={onBackgroundClick}
      >
        <div
          className="pts-power-camera-stage"
          style={{
            position: "relative",
            width: Math.max(1, contentWidth),
            height: reconstructionContentHeight,
          }}
        >
          <div
            ref={reconstructionContentRef}
            className="pts-power-camera-layer"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: Math.max(1, contentWidth),
              transform: "translate3d(0, 0, 0) scale(1)",
              transformOrigin: "top left",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (reconstructionStep === "scale") {
    return (
      <div
        ref={reconstructionViewportRef}
        data-camera-debug-mode="CAMERA_ON"
        data-camera-reconstruction-step="CONTROLLED_SCALE"
        data-camera-controlled-scale={controlledScale}
        className="relative h-full max-h-full w-full min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-muted/50 p-4 sm:p-8"
        onClick={onBackgroundClick}
      >
        <div
          className="pts-power-camera-stage"
          style={{
            position: "relative",
            width: Math.max(1, contentWidth * controlledScale),
            height: Math.max(1, reconstructionContentHeight * controlledScale),
          }}
        >
          <div
            ref={reconstructionContentRef}
            className="pts-power-camera-layer"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: Math.max(1, contentWidth),
              transform: `scale(${controlledScale})`,
              transformOrigin: "top left",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (reconstructionStep === "fit") {
    return (
      <div
        ref={reconstructionViewportRef}
        data-camera-debug-mode="CAMERA_ON"
        data-camera-reconstruction-step="FIT_ZOOM"
        data-camera-fit-zoom={reconstructionFitZoom}
        className="relative h-full max-h-full w-full min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-muted/50 p-4 sm:p-8"
        onClick={onBackgroundClick}
      >
        <div
          className="pts-power-camera-stage"
          style={{
            position: "relative",
            width: Math.max(1, contentWidth * reconstructionFitZoom),
            height: Math.max(1, reconstructionContentHeight * reconstructionFitZoom),
          }}
        >
          <div
            ref={reconstructionContentRef}
            className="pts-power-camera-layer"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: Math.max(1, contentWidth),
              transform: `scale(${reconstructionFitZoom})`,
              transformOrigin: "top left",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  const finalIntrinsicWidth = Math.max(1, contentWidth);
  const finalIntrinsicHeight = Math.max(1, camera.contentHeight);
  const finalStageWidth = Math.max(1, finalIntrinsicWidth * camera.scale);
  const finalStageHeight = Math.max(1, finalIntrinsicHeight * camera.scale);
  const finalStage = {
    stageWidth: finalStageWidth,
    stageHeight: finalStageHeight,
    originX: 0,
    originY: 0,
    scaledContentWidth: finalStageWidth,
    scaledContentHeight: finalStageHeight,
  };
  const finalStageStyle: CSSProperties = {
    position: "relative",
    width: finalStageWidth,
    height: finalStageHeight,
    marginInline: "auto",
  };
  const finalCameraLayerStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: finalIntrinsicWidth,
    transform: `scale(${camera.scale})`,
    transformOrigin: "top left",
  };

  return (
    <div
      data-camera-debug-mode="CAMERA_ON"
      data-camera-reconstruction-step="USER_ZOOM"
      data-camera-fit-zoom={camera.fitZoom}
      data-camera-user-zoom={camera.userZoom}
      data-camera-effective-scale={camera.scale}
      className="pts-power-viewport-shell relative h-full max-h-full min-h-0 min-w-0 flex-1 overflow-hidden"
    >
      <div
        ref={viewportRef}
        className="pts-power-viewport h-full min-h-0 min-w-0 overflow-auto overscroll-contain bg-muted/50 p-4 sm:p-8"
        onClick={onBackgroundClick}
      >
        <div ref={stageRef} className="pts-power-camera-stage" style={finalStageStyle}>
          <div
            ref={contentRef}
            className="pts-power-camera-layer"
            style={finalCameraLayerStyle}
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
        stage={finalStage}
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
