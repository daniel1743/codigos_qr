import React from 'react';
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';
import type { TextAlign } from '../../../types/editor';

interface AlignGroupProps {
  value: TextAlign;
  onChange: (value: TextAlign) => void;
}

export const alignOptions: {value: TextAlign;label: string;icon: typeof AlignLeftIcon;}[] = [
{ value: 'left', label: 'Izquierda', icon: AlignLeftIcon },
{ value: 'center', label: 'Centro', icon: AlignCenterIcon },
{ value: 'right', label: 'Derecha', icon: AlignRightIcon }];


export function AlignGroup({ value, onChange }: AlignGroupProps) {
  return (
    <div className="flex items-center" role="radiogroup" aria-label="Alineación">
      {alignOptions.map((o) => {
        const Icon = o.icon;
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={cx(
              'grid h-8 w-8 place-items-center rounded-lg transition-colors duration-150',
              active ? 'bg-select-soft text-select' : 'text-ink hover:bg-[#F2F3F5]'
            )}>
            
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </button>);

      })}
    </div>);

}