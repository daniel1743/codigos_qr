import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BatteryFullIcon, PointerIcon, SignalIcon, WifiIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { TemplateRenderer } from '../templates/TemplateRenderer';
import { SelectionLayer } from './SelectionLayer';
import { MobileSheet } from './MobileSheet';
import { MobileKeyboard } from './MobileKeyboard';
import { BlockPicker } from './BlockPicker';
import { PageSettings } from './PageSettings';
import { cx } from '../../utils/cx';
import type { MobileWidth } from '../../types/editor';

const widths: MobileWidth[] = [360, 390, 430];

/** Mobile: a real-width viewport where the sheet and keyboard never hide what is being edited. */
export function MobileCanvas() {
  const ed = useEditor();
  const t = useThemeTokens();
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const bare = ed.isSmallScreen;
  const obstructed = ed.keyboard ? bare ? 110 : 330 : ed.selection ? ed.sheet === 'expanded' ? 0.66 : 200 : 0;

  useEffect(() => {
    if (!scroller || !ed.selection) return;
    const el = (ed.keyboard && ed.editingId ? ed.getElement(ed.editingId) : null) ?? ed.getElement(ed.selection.id);
    if (!el) return;
    const timer = window.setTimeout(() => {
      const obstruct = obstructed < 1 ? scroller.clientHeight * obstructed : obstructed;
      const visible = scroller.clientHeight - obstruct;
      const sr = scroller.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const relTop = er.top - sr.top;
      const fits = er.height <= visible - 24;
      const outOfView = relTop < 16 || relTop + Math.min(er.height, visible) > visible - 8;
      if (outOfView) scroller.scrollBy({ top: fits ? relTop - (visible - er.height) / 2 : relTop - 24, behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scroller, ed.selection, ed.sheet, ed.keyboard, ed.editingId, obstructed]);

  const spacer = ed.mode !== 'edit' ? 0 : ed.keyboard ? 360 : ed.selection ? ed.sheet === 'expanded' ? 520 : 240 : 0;

  const screen =
  <div className="relative flex h-full flex-col overflow-hidden" style={{ background: t.page.color }}>
      {!bare &&
    <div className="flex h-9 shrink-0 items-center justify-between px-6 text-[12.5px] font-semibold" style={{ color: t.page.fg }}>
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <SignalIcon className="h-3.5 w-3.5" />
            <WifiIcon className="h-3.5 w-3.5" />
            <BatteryFullIcon className="h-4 w-4" />
          </span>
        </div>
    }
      <div ref={setScroller} className="cq-scroll-none relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div ref={setContent} className={cx('relative flex min-h-full flex-col', ed.mode === 'edit' && 'cq-edit')}>
          <TemplateRenderer />
          <SelectionLayer container={content} scroller={scroller} />
        </div>
        <div style={{ height: spacer, background: t.page.color }} aria-hidden />
      </div>

      <AnimatePresence>
        {ed.mode === 'edit' && !ed.selection && !ed.picker.open && !ed.settingsOpen &&
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 py-2.5 text-[12.5px] font-medium text-white shadow-toolbar">
        
            <PointerIcon className="h-4 w-4" /> Toca cualquier elemento para editarlo
          </motion.div>
      }
      </AnimatePresence>

      <MobileSheet />
      <MobileKeyboard />
      <BlockPicker variant="sheet" />
      <PageSettings variant="sheet" />
    </div>;


  if (bare) return screen;

  return (
    <div className="flex h-full w-full justify-center overflow-auto bg-canvas px-4 py-5">
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative shrink-0 overflow-hidden rounded-[48px] border-[10px] border-[#17181B] bg-[#17181B] shadow-[0_30px_60px_-30px_rgba(16,24,40,0.5)]"
          style={{ width: ed.mobileWidth + 20, height: 'min(860px, max(600px, calc(100vh - 190px)))' }}>
          
          <div className="h-full overflow-hidden rounded-[38px]">{screen}</div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.08)]" role="radiogroup" aria-label="Ancho del móvil">
          {widths.map((w) =>
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={ed.mobileWidth === w}
            onClick={() => ed.setMobileWidth(w)}
            className={cx(
              'h-7 rounded-full px-3 text-[12px] font-medium tabular-nums transition-colors duration-150',
              ed.mobileWidth === w ? 'bg-ink text-white' : 'text-mute hover:text-ink'
            )}>
            
              {w} px
            </button>
          )}
        </div>
      </div>
    </div>);

}