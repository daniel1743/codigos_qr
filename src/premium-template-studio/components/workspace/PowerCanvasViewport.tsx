import type { CSSProperties, ReactNode } from "react";
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

export function PowerCanvasViewport({
  children,
  contentWidth,
  onBackgroundClick,
}: PowerCanvasViewportProps) {
  const { viewportRef, contentRef, camera, stage, controls } = usePowerCanvasCamera();
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
    <div className="pts-power-viewport-shell relative min-h-0 flex-1">
      <div
        ref={viewportRef}
        className="pts-power-viewport h-full min-h-0 overflow-y-auto overscroll-contain bg-muted/50 p-4 sm:p-8"
        onClick={onBackgroundClick}
      >
        <div className="pts-power-camera-stage" style={stageStyle}>
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
