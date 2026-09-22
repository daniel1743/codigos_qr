import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { blockKit, blockLabels } from '../../data/blockKit';
import { cx } from '../../utils/cx';

interface BlockPickerProps {
  variant: 'dialog' | 'sheet';
}

const ease = [0.23, 1, 0.32, 1] as const;

/** Block Kit V1. Blocks inherit the template's look automatically — the user only picks *what*, never *how*. */
export function BlockPicker({ variant }: BlockPickerProps) {
  const ed = useEditor();
  const open = ed.picker.open && ed.mode === 'edit' && variant === 'sheet' === ed.isMobile;
  const afterKey = ed.picker.afterKey;
  const afterType = afterKey ? ed.doc.blocks.find((b) => b.key === afterKey)?.type : undefined;
  const isSheet = variant === 'sheet';

  const list =
  <div className={cx('grid gap-2', isSheet ? 'grid-cols-2' : 'grid-cols-2')}>
      {blockKit.map((item) => {
      const Icon = item.icon;
      return (
        <button
          key={item.type}
          type="button"
          onClick={() => ed.addBlock(item.type, afterKey)}
          className={cx(
            'flex items-center gap-3 rounded-2xl border border-line text-left transition-colors duration-150 hover:border-select/50 hover:bg-select-soft/50',
            isSheet ? 'min-h-[64px] p-2.5' : 'p-3'
          )}>
          
            <span className={cx('grid shrink-0 place-items-center rounded-xl bg-[#F2F3F5] text-ink', isSheet ? 'h-10 w-10' : 'h-11 w-11')}>
              <Icon className="h-5 w-5" strokeWidth={1.7} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-ink">{item.label}</span>
              {!isSheet && <span className="block text-[12px] text-mute">{item.description}</span>}
            </span>
          </button>);

    })}
    </div>;


  const header =
  <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[17px] font-semibold text-ink">Añadir bloque</h2>
        <p className="mt-0.5 text-[12.5px] text-mute">
          {afterType ? `Se colocará debajo de «${blockLabels[afterType]}».` : 'Se colocará al final de la página.'} Adopta el estilo de tu plantilla.
        </p>
      </div>
      <button type="button" aria-label="Cerrar" onClick={ed.closePicker} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F2F3F5] text-ink">
        <XIcon className="h-4 w-4" />
      </button>
    </div>;


  return (
    <AnimatePresence>
      {open &&
      <motion.div
        key="picker"
        className={cx(isSheet ? 'absolute' : 'fixed', 'inset-0 z-[60] flex bg-[#0B0D12]/35', isSheet ? 'items-end' : 'items-center justify-center p-6')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={ed.closePicker}>
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Añadir bloque"
          onClick={(e) => e.stopPropagation()}
          initial={isSheet ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 6 }}
          animate={isSheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
          exit={isSheet ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 6 }}
          transition={{ duration: isSheet ? 0.26 : 0.2, ease }}
          className={cx('bg-white', isSheet ? 'max-h-[82%] w-full overflow-y-auto rounded-t-[24px] p-4 pb-8' : 'w-full max-w-[620px] rounded-3xl p-6 shadow-toolbar')}>
          
            {header}
            {list}
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}