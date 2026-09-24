import React, { useState } from 'react';
import { MousePointerClickIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEditor } from '../../contexts/EditorContext';
import { TemplateRenderer } from '../templates/TemplateRenderer';
import { SelectionLayer } from './SelectionLayer';
import { cx } from '../../utils/cx';

/** Desktop: the page fills the canvas. No sidebars — tools appear only next to what you touch. */
export function DesktopCanvas() {
  const ed = useEditor();
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const showHint = ed.mode === 'edit' && !ed.selection && !ed.picker.open;

  return (
    <div className="relative h-full">
      <div ref={setScroller} className="h-full overflow-y-auto overflow-x-hidden">
        <div ref={setContent} className={cx('relative flex min-h-full flex-col', ed.mode === 'edit' && 'cq-edit')}>
          <TemplateRenderer />
          <SelectionLayer container={content} scroller={scroller} />
        </div>
      </div>
      <AnimatePresence>
        {showHint &&
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 py-2 text-[12.5px] font-medium text-white shadow-toolbar">
          
            <MousePointerClickIcon className="h-4 w-4" /> Haz clic en cualquier elemento para editarlo
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}