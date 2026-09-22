import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { structureActions } from './structureActions';
import { cx } from '../../utils/cx';

interface StructureRowProps {
  blockKey: string;
}

/** Labeled, touch-friendly version of the structural actions (move up/down instead of precision drag). */
export function StructureRow({ blockKey }: StructureRowProps) {
  const ed = useEditor();
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {structureActions(ed, blockKey).map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            className={cx(
              'flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-medium transition-colors duration-150 disabled:opacity-35',
              a.danger ? 'border-[#FBD5C4] text-[#C2410C] hover:bg-[#FFF1EA]' : a.active ? 'border-select bg-select-soft text-select' : 'border-line text-ink hover:bg-[#F7F8FA]'
            )}>
            
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            {a.label}
          </button>);

      })}
    </div>);

}