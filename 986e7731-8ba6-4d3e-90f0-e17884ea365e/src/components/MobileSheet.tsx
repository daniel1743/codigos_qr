import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { useEditor } from "../contexts/EditorContext";
import type { SheetSnap } from "../contexts/EditorContext";
import { TARGET_LABEL } from "../types/editor";
import { ToolbarContent } from "./toolbar/ToolbarContent";
import type { ToolbarLevel } from "./toolbar/ToolbarContent";

const HEIGHTS: Record<SheetSnap, number> = {
  collapsed: 116,
  medium: 216,
  expanded: 372,
};

const NEXT: Record<SheetSnap, SheetSnap> = {
  collapsed: "medium",
  medium: "expanded",
  expanded: "expanded",
};

const PREV: Record<SheetSnap, SheetSnap> = {
  collapsed: "collapsed",
  medium: "collapsed",
  expanded: "medium",
};

export function MobileSheet() {
  const { selection, selectedProduct, sheetSnap, setSheetSnap, clearSelection } = useEditor();

  return (
    <AnimatePresence>
      {selection && selectedProduct && (
        <motion.div
          key="sheet"
          data-chrome="true"
          role="dialog"
          aria-label={`Editar ${TARGET_LABEL[selection.kind]}`}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1, height: HEIGHTS[sheetSnap] }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.14}
          onDragEnd={(_, info) => {
            if (info.offset.y < -28) setSheetSnap(NEXT[sheetSnap]);
            else if (info.offset.y > 28) setSheetSnap(PREV[sheetSnap]);
          }}
          className="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-3xl border-t border-hairline bg-surface shadow-sheet lg:hidden"
        >
          <button
            type="button"
            aria-label="Ajustar altura del panel"
            onClick={() => setSheetSnap(sheetSnap === "expanded" ? "collapsed" : NEXT[sheetSnap])}
            className="flex h-6 w-full shrink-0 items-center justify-center"
          >
            <span className="h-1 w-10 rounded-full bg-[#DDD7CE]" />
          </button>

          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded-md bg-selSoft px-2 py-1 text-[11.5px] font-medium text-sel">
                {TARGET_LABEL[selection.kind]}
              </span>
              <span className="truncate text-[12.5px] text-muted">{selectedProduct.title}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={sheetSnap === "expanded" ? "Reducir panel" : "Ampliar panel"}
                onClick={() => setSheetSnap(sheetSnap === "expanded" ? "medium" : NEXT[sheetSnap])}
                className="grid h-11 w-11 place-items-center rounded-xl text-body transition-colors duration-150 ease-premium hover:bg-[#F5F2ED]"
              >
                {sheetSnap === "expanded" ? (
                  <ChevronDownIcon className="h-5 w-5" strokeWidth={1.8} />
                ) : (
                  <ChevronUpIcon className="h-5 w-5" strokeWidth={1.8} />
                )}
              </button>
              <button
                type="button"
                aria-label="Cerrar selección"
                onClick={clearSelection}
                className="grid h-11 w-11 place-items-center rounded-xl text-body transition-colors duration-150 ease-premium hover:bg-[#F5F2ED]"
              >
                <XIcon className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="cq-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-5">
            <ToolbarContent
              product={selectedProduct}
              kind={selection.kind}
              level={sheetSnap as ToolbarLevel}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
