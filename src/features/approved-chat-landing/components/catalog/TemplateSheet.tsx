import React from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { TemplateCatalog } from './TemplateCatalog';
import type { BusinessContext, TemplateId } from '../../types/cripqer';

interface TemplateSheetProps {
  open: boolean;
  context: BusinessContext;
  onPreview: (id: TemplateId) => void;
  onSelect: (id: TemplateId) => void;
  onClose: () => void;
}

/** Mobile: templates as a draggable bottom sheet above the conversation. */
export function TemplateSheet({ open, context, onPreview, onSelect, onClose }: TemplateSheetProps) {
  const controls = useDragControls();
  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Plantillas">
          <motion.div
          className="absolute inset-0 bg-ink/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose} />
        
          <motion.div
          className="absolute inset-x-0 bottom-0 flex h-[84dvh] flex-col rounded-t-[26px] bg-canvas shadow-2xl"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          drag="y"
          dragControls={controls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 600) onClose();
          }}>
          
            <div className="flex touch-none justify-center pb-1 pt-2.5" onPointerDown={(e) => controls.start(e)}>
              <span className="h-1.5 w-10 rounded-full bg-ink/15" />
            </div>
            <div className="min-h-0 flex-1">
              <TemplateCatalog context={context} onPreview={onPreview} onSelect={onSelect} onClose={onClose} />
            </div>
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}