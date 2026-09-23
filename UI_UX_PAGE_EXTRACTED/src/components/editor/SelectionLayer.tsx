import React from 'react';
import { motion } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useElementRect } from '../../hooks/useElementRect';
import { FloatingToolbar } from './FloatingToolbar';

interface SelectionLayerProps {
  container: HTMLElement | null;
  scroller: HTMLElement | null;
}

function ringRadius(raw: string): string {
  if (!raw || raw === '0px') return '6px';
  if (raw.includes('%') || raw.includes(' ')) return raw;
  return `${parseFloat(raw) + 3}px`;
}

/** Draws the single active selection over the page without touching page layout. */
export function SelectionLayer({ container, scroller }: SelectionLayerProps) {
  const ed = useEditor();
  const sel = ed.selection;
  const el = sel ? ed.getElement(sel.id) : null;
  const { rect, scrollTop } = useElementRect(el, container, scroller);
  if (!sel || !rect || !container || ed.mode !== 'edit') return null;

  const isPage = sel.kind === 'page';
  const inset = isPage ? 3 : -3;
  const radius = isPage ? '10px' : ringRadius(el ? window.getComputedStyle(el).borderRadius : '');
  const isBlock = (sel.kind === 'section' || sel.kind === 'hero') && !!sel.blockKey;
  const chipTop = Math.max(rect.top - 24, scrollTop + 6);

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <motion.div
        key={sel.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        className="absolute border-2 border-select"
        style={{ top: rect.top + inset, left: rect.left + inset, width: rect.width - inset * 2, height: rect.height - inset * 2, borderRadius: radius }} />
      
      {ed.isMobile && !isPage &&
      <span
        className="absolute rounded-md bg-select px-2 py-0.5 text-[11px] font-semibold text-white"
        style={{ top: chipTop, left: Math.max(rect.left - 3, 6) }}>
        
          {sel.label}
        </span>
      }
      {isBlock && !ed.isMobile &&
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          ed.openPicker(sel.blockKey);
        }}
        className="pointer-events-auto absolute z-40 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-select px-3.5 text-[12px] font-semibold text-white shadow-toolbar transition-transform duration-150 hover:scale-[1.03] active:scale-[0.97]"
        style={{ top: rect.top + rect.height - 16, left: rect.left + rect.width / 2 }}>
        
          <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.5} /> Añadir bloque
        </button>
      }
      {!ed.isMobile && <FloatingToolbar rect={rect} containerWidth={container.clientWidth} scrollTop={scrollTop} />}
    </div>);

}