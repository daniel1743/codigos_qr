import React, { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useEditor } from "../../contexts/EditorContext";
import { useAnchorRect } from "../../hooks/useAnchorRect";
import { TARGET_LABEL } from "../../types/editor";
import { ToolbarContent } from "./ToolbarContent";

const GAP = 14;
const EDGE = 20;

export function DesktopToolbar() {
  const { selection, selectedProduct } = useEditor();
  const anchorKey = selection ? `${selection.cardId}:${selection.kind}` : null;
  const rect = useAnchorRect(anchorKey);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const measure = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setSize({ width: r.width, height: r.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [anchorKey]);

  if (!selection) return null;
  if (selection.cardId !== "page" && !selectedProduct) return null;

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;

  let top = 0;
  let left = 0;
  let placedBelow = false;

  if (rect) {
    const spaceAbove = rect.top - GAP - EDGE;
    placedBelow = spaceAbove < size.height;
    top = placedBelow ? rect.bottom + GAP : rect.top - GAP - size.height;
    top = Math.max(EDGE, Math.min(top, viewportHeight - size.height - EDGE));
    const centered = rect.left + rect.width / 2 - size.width / 2;
    left = Math.max(EDGE, Math.min(centered, viewportWidth - size.width - EDGE));
  }

  return (
    <AnimatePresence>
      <motion.div
        key="toolbar"
        ref={ref}
        data-chrome="true"
        role="toolbar"
        aria-label={`Acciones de ${TARGET_LABEL[selection.kind]}`}
        initial={{ opacity: 0, scale: 0.96, y: placedBelow ? -4 : 4 }}
        animate={{ opacity: rect ? 1 : 0, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        style={{ top, left, visibility: rect ? "visible" : "hidden" }}
        className="fixed z-40 flex max-w-[min(94vw,1000px)] items-center gap-1 rounded-2xl border border-[#D6CFC5] bg-white px-2 py-1.5 shadow-[0_8px_30px_rgb(23,20,15,0.18)]"
      >
        <span className="ml-1 mr-1 shrink-0 select-none rounded-md bg-selSoft px-2 py-1 text-[11.5px] font-medium text-sel">
          {TARGET_LABEL[selection.kind]}
        </span>
        <ToolbarContent product={selectedProduct} kind={selection.kind} level="desktop" />
        <div className="mx-1 h-5 w-[1px] bg-[#EAE5DE]" />
        <button
          type="button"
          onClick={() => {
            // Dispatch Escape event to trigger selection clear in Workspace and EditorContext
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-body transition-colors hover:bg-[#F5F2ED] hover:text-ink"
          aria-label="Cerrar barra de herramientas"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
