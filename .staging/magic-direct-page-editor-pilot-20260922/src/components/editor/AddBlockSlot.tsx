import React from 'react';
import { PlusIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { cx } from '../../utils/cx';

interface AddBlockSlotProps {
  className?: string;
}

/** Persistent "add block" entry at the end of the page. Only exists while editing. */
export function AddBlockSlot({ className }: AddBlockSlotProps) {
  const ed = useEditor();
  if (ed.mode !== 'edit') return null;
  const last = ed.doc.blocks[ed.doc.blocks.length - 1]?.key;
  return (
    <div className={cx('px-5 py-8', className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          ed.openPicker(last);
        }}
        className="mx-auto flex h-12 w-full max-w-[420px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-dashed border-select/50 bg-white/80 text-[13.5px] font-medium text-select transition-colors duration-150 hover:bg-white">
        
        <PlusIcon className="h-4 w-4" /> Añadir bloque
      </button>
    </div>);

}