import { useCallback, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/button";

/**
 * Direct Manipulation Bottom Sheet
 *
 * PRINCIPLE: Sheet follows finger exactly during drag
 *
 * - NO snap points during drag
 * - Sheet position = finger position
 * - Only snaps AFTER finger lifts
 * - If user leaves it at 63%, it stays at 63% until finger lifts
 * - Immediate response to direction changes
 */

interface DirectBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

export function DirectBottomSheet({ open, onOpenChange, title, children }: DirectBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Drag state
  const dragState = useRef({
    isDragging: false,
    startY: 0,
    startHeight: 0,
    currentHeight: 0,
  });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from handle
    const target = e.target as HTMLElement;
    if (!target.closest("[data-sheet-handle]")) return;

    const sheet = sheetRef.current;
    if (!sheet) return;

    dragState.current = {
      isDragging: true,
      startY: e.clientY,
      startHeight: sheet.offsetHeight,
      currentHeight: sheet.offsetHeight,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.isDragging) return;

    const sheet = sheetRef.current;
    if (!sheet) return;

    const deltaY = dragState.current.startY - e.clientY;
    const newHeight = dragState.current.startHeight + deltaY;

    // Clamp between 0 and 90vh
    const maxHeight = window.innerHeight * 0.9;
    const clampedHeight = Math.max(0, Math.min(maxHeight, newHeight));

    dragState.current.currentHeight = clampedHeight;

    // DIRECT DOM MANIPULATION - Sheet follows finger exactly
    sheet.style.height = `${clampedHeight}px`;
    sheet.style.transition = "none"; // No transition during drag
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current.isDragging) return;

      const sheet = sheetRef.current;
      if (!sheet) return;

      dragState.current.isDragging = false;
      e.currentTarget.releasePointerCapture(e.pointerId);

      const finalHeight = dragState.current.currentHeight;
      const viewportHeight = window.innerHeight;

      // NOW we can snap (after finger lifts)
      const snapPoints: [number, number, number, number] = [
        0, // closed
        viewportHeight * 0.3, // compact
        viewportHeight * 0.5, // half
        viewportHeight * 0.85, // expanded
      ];

      // Find nearest snap point
      let nearestSnap = snapPoints[0];
      let minDistance = Math.abs(finalHeight - snapPoints[0]);

      for (const snap of snapPoints) {
        const distance = Math.abs(finalHeight - snap);
        if (distance < minDistance) {
          minDistance = distance;
          nearestSnap = snap;
        }
      }

      // Animate to snap point (only after finger lifts)
      sheet.style.transition = "height 200ms ease-out";
      sheet.style.height = `${nearestSnap}px`;

      // If snapped to closed, trigger close
      if (nearestSnap === 0) {
        setIsClosing(true);
        setTimeout(() => {
          onOpenChange(false);
          setIsClosing(false);
        }, 200);
      }
    },
    [onOpenChange],
  );

  const handleClose = () => {
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.transition = "height 200ms ease-out";
      sheet.style.height = "0px";
    }
    setIsClosing(true);
    setTimeout(() => {
      onOpenChange(false);
      setIsClosing(false);
    }, 200);
  };

  if (!open && !isClosing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity md:hidden"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        data-mobile-bottom-sheet
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t bg-background shadow-2xl md:hidden"
        style={{
          height: open ? "50vh" : "0",
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
