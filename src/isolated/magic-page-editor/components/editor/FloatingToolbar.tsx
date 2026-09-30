import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, CornerLeftUpIcon, LayersIcon, XIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useSelectionActions } from './useSelectionActions';
import { AdvancedPanel } from './AdvancedPanel';
import { ToolButton } from './ToolButton';
import { clamp, cx } from '../../utils/cx';
import { keepFocus } from '../../utils/styles';
import type { Rect } from '../../hooks/useElementRect';
import { familyForBlockType } from '../../data/cardFamilies';
import { buttonCollectionFor, buttonGroupIdentity, readButtonGroup } from '../../utils/buttonGroup';

interface FloatingToolbarProps {
  rect: Rect;
  containerWidth: number;
  viewportHeight?: number;
  scrollTop: number;
}

const BAR_H = 44;
const GAP = 10;
const PANEL_W = 440;
const PANEL_H = 440;
const ease = [0.23, 1, 0.32, 1] as const;

export interface PanelPlacementInput {
  target: Rect;
  panelWidth: number;
  panelHeight: number;
  containerWidth: number;
  viewportTop: number;
  viewportBottom: number;
  gap?: number;
}

export interface PanelPlacement {
  top: number;
  left: number;
  transformOrigin: string;
  side: 'left' | 'right' | 'top' | 'bottom';
}

function overlapArea(a: { top: number; left: number; width: number; height: number }, b: Rect) {
  const width = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
  return width * height;
}

/** Chooses the candidate with the least target overlap, then the least viewport overflow. */
export function choosePanelPlacement({ target, panelWidth, panelHeight, containerWidth, viewportTop, viewportBottom, gap = GAP }: PanelPlacementInput): PanelPlacement {
  const raw = [
    { side: 'right' as const, left: target.left + target.width + gap, top: target.top, origin: 'top left' },
    { side: 'left' as const, left: target.left - panelWidth - gap, top: target.top, origin: 'top right' },
    { side: 'bottom' as const, left: target.left + target.width / 2 - panelWidth / 2, top: target.top + target.height + gap, origin: 'top left' },
    { side: 'top' as const, left: target.left + target.width / 2 - panelWidth / 2, top: target.top - panelHeight - gap, origin: 'bottom left' },
    // Fallback candidates for large targets: inner corners
    { side: 'bottom' as const, left: containerWidth - panelWidth - 8, top: viewportBottom - panelHeight - 8, origin: 'bottom right' },
    { side: 'top' as const, left: containerWidth - panelWidth - 8, top: viewportTop + 8, origin: 'top right' }
  ];
  const candidates = raw.map((candidate) => {
    const left = clamp(candidate.left, 8, Math.max(8, containerWidth - panelWidth - 8));
    const top = clamp(candidate.top, viewportTop, Math.max(viewportTop, viewportBottom - panelHeight));
    const overflow = Math.max(0, 8 - candidate.left) + Math.max(0, candidate.left + panelWidth - (containerWidth - 8)) + Math.max(0, viewportTop - candidate.top) + Math.max(0, candidate.top + panelHeight - viewportBottom);
    const overlap = overlapArea({ top, left, width: panelWidth, height: panelHeight }, target);
    const distance = Math.abs(left - candidate.left) + Math.abs(top - candidate.top);
    return { ...candidate, left, top, score: overlap * 1000 + overflow * 100 + distance };
  });
  const best = candidates.sort((a, b) => a.score - b.score)[0]!;
  return { top: best.top, left: best.left, transformOrigin: best.origin, side: best.side };
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />;
}

/** Desktop: compact contextual toolbar anchored to the selected object. */
export function FloatingToolbar({ rect, containerWidth, viewportHeight, scrollTop }: FloatingToolbarProps) {
  const ed = useEditor();
  const sel = ed.selection;
  const actions = useSelectionActions().filter((a) => !a.mobileOnly);
  const [panel, setPanel] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [barW, setBarW] = useState(360);
  const [panelSize, setPanelSize] = useState({ width: PANEL_W, height: PANEL_H });
  const [, setLayoutVersion] = useState(0);
  const activeAction = actions.find((a) => a.key === panel);
  const showPanel = ed.moreOpen || !!activeAction?.panel;

  useLayoutEffect(() => {
    const el = barRef.current;
    if (el && Math.abs(el.offsetWidth - barW) > 1) setBarW(el.offsetWidth);
  });

  useEffect(() => {
    setPanel(null);
  }, [sel?.id]);

  useLayoutEffect(() => {
    if (!showPanel || !panelRef.current) return;
    const update = () => {
      const next = { width: panelRef.current?.offsetWidth ?? PANEL_W, height: panelRef.current?.offsetHeight ?? PANEL_H };
      setPanelSize((current) => current.width === next.width && current.height === next.height ? current : next);
      setLayoutVersion((version) => version + 1);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(panelRef.current);
    return () => observer?.disconnect();
  }, [showPanel, panel, ed.moreOpen, sel?.id]);

  useEffect(() => {
    if (!showPanel) return;
    const update = () => setLayoutVersion((version) => version + 1);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showPanel]);

  if (!sel) return null;

  /* Identidad de la selección: nunca un «Botón» genérico. */
  const linksCollection = sel.blockKey ? buttonCollectionFor(ed.doc, ed.templateId, sel.blockKey) : undefined;
  const linksModel = linksCollection ? readButtonGroup(ed.doc, linksCollection.blockKey, linksCollection.seeds) : undefined;
  const identityLabel = sel.kind === 'section' && linksModel ? buttonGroupIdentity(linksModel.items.length) : sel.label;
  const hasOwnMore = actions.some((action) => action.key === 'more-actions');

  const parent = sel.parentId ? ed.getInfo(sel.parentId) : null;
  const block = sel.blockKey ? ed.doc.blocks.find((candidate) => candidate.key === sel.blockKey) : null;
  const group = block ? familyForBlockType(block.type) : undefined;
  const linksGroup = block?.type === 'links' ? { label: 'Enlaces' } : undefined;
  const hideGenericGroupNav = sel.kind === 'cta' && linksGroup;
  const viewTop = scrollTop + 8;
  let top = rect.top - BAR_H - GAP;
  if (top < viewTop) top = rect.height < 220 ? rect.top + rect.height + GAP : Math.max(viewTop, rect.top + 12);
  const left = clamp(rect.left + rect.width / 2 - barW / 2, 8, containerWidth - barW - 8);
  const viewportTop = scrollTop + 8;
  const viewportBottom = scrollTop + (viewportHeight ?? (typeof window === 'undefined' ? PANEL_H : window.innerHeight)) - 8;
  const panelPosition = choosePanelPlacement({ target: rect, panelWidth: panelSize.width, panelHeight: panelSize.height, containerWidth, viewportTop, viewportBottom });

  return (
    <>
      <motion.div
        key={sel.id}
        ref={barRef}
        role="toolbar"
        aria-label={`Editar ${identityLabel}`}
        onMouseDown={keepFocus}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16, ease }}
        className="pointer-events-auto absolute z-40 flex h-11 max-w-[calc(100%_-_16px)] items-center gap-0.5 overflow-x-auto whitespace-nowrap rounded-[14px] border border-line bg-white px-1.5 text-ink shadow-toolbar"
        style={{ top, left }}>
        
        <span className="px-2 text-[12px] font-medium text-mute">{identityLabel}</span>
        {(group || linksGroup) && sel.kind !== 'section' && !hideGenericGroupNav &&
        <ToolButton icon={LayersIcon} label={`Editar grupo · ${(group || linksGroup)?.label}`} showLabel onClick={() => ed.select(`block:${sel.blockKey}`)} />}
        {!hideGenericGroupNav && parent && parent.kind !== 'page' &&
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
        {!hasOwnMore && <button
          type="button"
          aria-expanded={ed.moreOpen}
          onClick={() => {
            setPanel(null);
            ed.setMoreOpen((o) => !o);
          }}
          className={cx(
            'inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1',
            ed.moreOpen ? 'bg-select-soft text-select' : 'text-ink hover:bg-[#F2F3F5]'
          )}>
          Más
          <ChevronDownIcon className={cx('h-3.5 w-3.5 transition-transform duration-150', ed.moreOpen && 'rotate-180')} />
        </button>}
        <ToolButton icon={XIcon} label="Cerrar" onClick={ed.clearSelection} />
      </motion.div>

      <AnimatePresence>
        {showPanel &&
        <motion.div
          key={ed.moreOpen ? 'more' : panel}
          ref={panelRef}
          role="dialog"
          aria-label={ed.moreOpen ? `Más opciones de ${identityLabel}` : `${activeAction?.label} · ${identityLabel}`}
          onMouseDown={keepFocus}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.16, ease }}
          className="pointer-events-auto absolute z-40 max-h-[440px] overflow-y-auto rounded-2xl border border-line bg-white p-4 text-ink shadow-toolbar"
          style={{ ...panelPosition, width: PANEL_W, maxHeight: Math.min(440, Math.max(200, viewportBottom - panelPosition.top)) }}>
          
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold">{ed.moreOpen ? `Más · ${identityLabel}` : `${activeAction?.label} · ${identityLabel}`}</p>
              <button
              type="button"
              aria-label="Cerrar panel"
              onClick={() => {
                setPanel(null);
                ed.setMoreOpen(false);
              }}
              className="grid h-7 w-7 place-items-center rounded-lg text-mute hover:bg-[#F2F3F5] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-select focus-visible:ring-offset-1">
              
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {ed.moreOpen ? <AdvancedPanel /> : activeAction?.panel}
          </motion.div>
        }
      </AnimatePresence>
    </>);

}
