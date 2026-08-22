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

type SnapPoint = "closed" | "compact" | "half" | "expanded";

const SNAP_HEIGHTS: Record<SnapPoint, string> = {
  closed: "0vh",
  compact: "30vh",
  half: "50vh",
  expanded: "85vh",
};

/**
 * Draggable Bottom Sheet
 *
 * Features:
 * - Snap points: compact, half, expanded
 * - Drag by handle to resize
 * - Smooth transitions
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
  const [snapPoint, setSnapPoint] = useState<SnapPoint>(open ? initialSnap : "closed");
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync open state with snap point
  useEffect(() => {
    if (open && snapPoint === "closed") {
      setSnapPoint(initialSnap);
    } else if (!open && snapPoint !== "closed") {
      setSnapPoint("closed");
    }
  }, [open, snapPoint, initialSnap]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from handle, not from content
    const target = e.target as HTMLElement;
    if (!target.closest("[data-sheet-handle]")) return;

    setIsDragging(true);
    setStartY(e.clientY);
    setCurrentY(e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setCurrentY(e.clientY);
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      const deltaY = currentY - startY;
      const threshold = 50; // px

      // Determine new snap point based on drag direction
      if (deltaY > threshold) {
        // Dragged down
        if (snapPoint === "expanded") {
          setSnapPoint("half");
        } else if (snapPoint === "half") {
          setSnapPoint("compact");
        } else if (snapPoint === "compact") {
          setSnapPoint("closed");
          onOpenChange(false);
        }
      } else if (deltaY < -threshold) {
        // Dragged up
        if (snapPoint === "compact") {
          setSnapPoint("half");
        } else if (snapPoint === "half") {
          setSnapPoint("expanded");
        }
      }

      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    },
    [isDragging, currentY, startY, snapPoint, onOpenChange]
  );

  const handleClose = () => {
    setSnapPoint("closed");
    onOpenChange(false);
  };

  // Calculate transform during drag
  const getDragTransform = () => {
    if (!isDragging) return 0;
    const delta = currentY - startY;
    // Clamp to prevent dragging too far
    return Math.max(-100, Math.min(200, delta));
  };

  const height = SNAP_HEIGHTS[snapPoint];
  const transform = isDragging ? getDragTransform() : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300 md:hidden ${
          snapPoint !== "closed" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t bg-background shadow-2xl md:hidden ${
          isDragging ? "" : "transition-all duration-300 ease-out"
        }`}
        style={{
          height: snapPoint === "closed" ? "0vh" : height,
          transform: `translateY(${transform}px)`,
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
