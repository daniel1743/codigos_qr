import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';

interface SwatchRowProps {
  colors: string[];
  value?: string;
  onChange: (color: string | undefined) => void;
}

export function SwatchRow({ colors, value, onChange }: SwatchRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={cx(
          'h-9 rounded-full border px-3 text-[12px] font-medium transition-colors duration-150',
          !value ? 'border-select bg-select-soft text-select' : 'border-line text-mute hover:text-ink'
        )}>
        
        Automático
      </button>
      {colors.map((c) => {
        const active = value?.toLowerCase() === c.toLowerCase();
        const light = ['#ffffff', '#ece6db', '#f5f0e8'].includes(c.toLowerCase());
        return (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            aria-pressed={active}
            onClick={() => onChange(c)}
            className={cx('grid h-9 w-9 place-items-center rounded-full border transition-transform duration-150 active:scale-95', active ? 'border-select ring-2 ring-select/30' : 'border-black/10')}
            style={{ background: c }}>
            
            {active && <CheckIcon className={cx('h-4 w-4', light ? 'text-ink' : 'text-white')} strokeWidth={2.5} />}
          </button>);

      })}
    </div>);

}