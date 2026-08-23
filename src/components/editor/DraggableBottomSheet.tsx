import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/button";

interface DraggableBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  initialSnap?: "compact" | "half" | "expanded";
}

const MIN_HEIGHT_RATIO = 0.22;
const MAX_HEIGHT_RATIO = 0.88;
const INITIAL_HEIGHTS = {
  compact: 0.3,
  half: 0.5,
  expanded: 0.85,
} as const;
const CLOSE_DRAG_THRESHOLD = 120;

/**
 * Draggable Bottom Sheet
 *
 * Features:
 * - Free-position height controlled directly by the handle
 * - Release keeps the exact allowed height where the finger stopped
 * - Preserves scroll inside content
 * - Does not interfere with canvas gestures
 */
export function DraggableBottomSheet({
  open,
  onOpenChange,
  title,
  children,
  initialSnap = "half",
}: DraggableBottomSheetProps) {
  const getViewportHeight = useCallback(() => {
    if (typeof window === "undefined") return 800;
    return window.visualViewport?.height ?? window.innerHeight;
  }, []);

  const getInitialHeight = useCallback(() => {
    return Math.round(getViewportHeight() * INITIAL_HEIGHTS[initialSnap]);
  }, [getViewportHeight, initialSnap]);

  const getMinHeight = useCallback(() => {
    return Math.round(getViewportHeight() * MIN_HEIGHT_RATIO);
  }, [getViewportHeight]);

  const getMaxHeight = useCallback(() => {
    return Math.round(getViewportHeight() * MAX_HEIGHT_RATIO);
  }, [getViewportHeight]);

  const clampHeight = useCallback(
    (height: number) => Math.max(getMinHeight(), Math.min(getMaxHeight(), height)),
    [getMaxHeight, getMinHeight],
  );

  const [heightPx, setHeightPx] = useState(() => (open ? getInitialHeight() : 0));
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeightPx, setStartHeightPx] = useState(0);
  const [lastDragDeltaY, setLastDragDeltaY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync open state with free height.
  useEffect(() => {
    if (open && heightPx <= 0) {
      setHeightPx(clampHeight(getInitialHeight()));
    } else if (!open && heightPx !== 0) {
      setHeightPx(0);
    }
  }, [clampHeight, getInitialHeight, heightPx, open]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      setHeightPx((currentHeight) => clampHeight(currentHeight));
    };
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [clampHeight, open]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only drag from handle, not from content
      const target = e.target as HTMLElement;
      if (!target.closest("[data-sheet-handle]")) return;

      setIsDragging(true);
      setStartY(e.clientY);
      setStartHeightPx(heightPx);
      setLastDragDeltaY(0);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [heightPx],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const deltaY = e.clientY - startY;
      setLastDragDeltaY(deltaY);
      setHeightPx(clampHeight(startHeightPx - deltaY));
    },
    [clampHeight, isDragging, startHeightPx, startY],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      const shouldClose = lastDragDeltaY > CLOSE_DRAG_THRESHOLD && heightPx <= getMinHeight() + 12;

      if (shouldClose) {
        setHeightPx(0);
        onOpenChange(false);
      } else {
        setHeightPx((currentHeight) => clampHeight(currentHeight));
      }

      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    },
    [clampHeight, getMinHeight, heightPx, isDragging, lastDragDeltaY, onOpenChange],
  );

  const handleClose = () => {
    setHeightPx(0);
    onOpenChange(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300 md:hidden ${
          open && heightPx > 0 ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        data-mobile-bottom-sheet
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t bg-background shadow-2xl md:hidden ${
          isDragging ? "" : "transition-[height] duration-150 ease-out"
        }`}
        style={{
          height: heightPx,
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Handle Area */}
        <div
          data-sheet-handle
          className="flex w-full cursor-grab touch-none flex-col items-center gap-2 px-4 pb-3 pt-4 active:cursor-grabbing"
        >
          {/* Drag Handle */}
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />

          {/* Header */}
          <div className="flex w-full items-center justify-between">
            <h2 className="text-base font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] scrollbar-thin"
          style={{
            touchAction: "pan-y",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
