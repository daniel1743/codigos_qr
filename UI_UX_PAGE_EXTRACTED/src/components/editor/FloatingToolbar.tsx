import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, CornerLeftUpIcon, XIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useSelectionActions } from './useSelectionActions';
import { AdvancedPanel } from './AdvancedPanel';
import { ToolButton } from './ToolButton';
import { clamp, cx } from '../../utils/cx';
import { keepFocus } from '../../utils/styles';
import type { Rect } from '../../hooks/useElementRect';

interface FloatingToolbarProps {
  rect: Rect;
  containerWidth: number;
  scrollTop: number;
}

const BAR_H = 44;
const GAP = 10;
const PANEL_W = 340;
const ease = [0.23, 1, 0.32, 1] as const;

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />;
}

/** Desktop: compact contextual toolbar anchored to the selected object. */
export function FloatingToolbar({ rect, containerWidth, scrollTop }: FloatingToolbarProps) {
  const ed = useEditor();
  const sel = ed.selection;
  const actions = useSelectionActions().filter((a) => !a.mobileOnly);
  const [panel, setPanel] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [barW, setBarW] = useState(360);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (el && Math.abs(el.offsetWidth - barW) > 1) setBarW(el.offsetWidth);
  });

  useEffect(() => {
    setPanel(null);
  }, [sel?.id]);

  if (!sel) return null;

  const parent = sel.parentId ? ed.getInfo(sel.parentId) : null;
  const viewTop = scrollTop + 8;
  let top = rect.top - BAR_H - GAP;
  if (top < viewTop) top = rect.height < 220 ? rect.top + rect.height + GAP : Math.max(viewTop, rect.top + 12);
  const left = clamp(rect.left + rect.width / 2 - barW / 2, 8, containerWidth - barW - 8);
  const activeAction = actions.find((a) => a.key === panel);
  const showPanel = ed.moreOpen || !!activeAction?.panel;
  const panelLeft = clamp(left, 8, containerWidth - PANEL_W - 8);

  return (
    <>
      <motion.div
        key={sel.id}
        ref={barRef}
        role="toolbar"
        aria-label={`Editar ${sel.label}`}
        onMouseDown={keepFocus}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16, ease }}
        className="pointer-events-auto absolute z-40 flex h-11 items-center gap-0.5 whitespace-nowrap rounded-[14px] border border-line bg-white px-1.5 text-ink shadow-toolbar"
        style={{ top, left }}>
        
        <span className="px-2 text-[12px] font-medium text-mute">{sel.label}</span>
        {parent && parent.kind !== 'page' &&
        <ToolButton icon={CornerLeftUpIcon} label={`Seleccionar ${parent.label.toLowerCase()}`} onClick={() => ed.select(parent.id)} />
        }
        {actions.length > 0 && <Divider />}
        {actions.map((a) =>
        a.inline ?
        <React.Fragment key={a.key}>{a.inline}</React.Fragment> :

        <ToolButton
          key={a.key}
          icon={a.icon}
          label={a.label}
          showLabel={a.showLabel}
          active={a.active || panel === a.key}
          danger={a.danger}
          disabled={a.disabled}
          swatch={a.swatch}
          onClick={() => {
            if (a.panel) {
              ed.setMoreOpen(false);
              setPanel((cur) => cur === a.key ? null : a.key);
            } else {
              a.onClick?.();
            }
          }} />


        )}
        <Divider />
        <button
          type="button"
          aria-expanded={ed.moreOpen}
          onClick={() => {
            setPanel(null);
            ed.setMoreOpen((o) => !o);
          }}
          className={cx(
            'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors duration-150',
            ed.moreOpen ? 'bg-select-soft text-select' : 'text-ink hover:bg-[#F2F3F5]'
          )}>
          
          Más
          <ChevronDownIcon className={cx('h-3.5 w-3.5 transition-transform duration-150', ed.moreOpen && 'rotate-180')} />
        </button>
        <ToolButton icon={XIcon} label="Cerrar" onClick={ed.clearSelection} />
      </motion.div>

      <AnimatePresence>
        {showPanel &&
        <motion.div
          key={ed.moreOpen ? 'more' : panel}
          role="dialog"
          aria-label={ed.moreOpen ? `Más opciones de ${sel.label}` : activeAction?.label}
          onMouseDown={keepFocus}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.16, ease }}
          className="pointer-events-auto absolute z-40 max-h-[440px] overflow-y-auto rounded-2xl border border-line bg-white p-4 text-ink shadow-toolbar"
          style={{ top: top + BAR_H + 8, left: panelLeft, width: PANEL_W, transformOrigin: 'top left' }}>
          
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold">{ed.moreOpen ? `Más · ${sel.label}` : activeAction?.label}</p>
              <button
              type="button"
              aria-label="Cerrar panel"
              onClick={() => {
                setPanel(null);
                ed.setMoreOpen(false);
              }}
              className="grid h-7 w-7 place-items-center rounded-lg text-mute hover:bg-[#F2F3F5] hover:text-ink">
              
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {ed.moreOpen ? <AdvancedPanel /> : activeAction?.panel}
          </motion.div>
        }
      </AnimatePresence>
    </>);

}