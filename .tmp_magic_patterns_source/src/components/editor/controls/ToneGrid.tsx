import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';
import type { SurfaceTone } from '../../../types/editor';

interface ToneGridProps {
  tones: SurfaceTone[];
  value?: string;
  onChange: (id: string) => void;
  allowDefault?: boolean;
}

export function ToneGrid({ tones, value, onChange, allowDefault = true }: ToneGridProps) {
  const items = allowDefault ? [{ id: '', label: 'Heredar', color: 'transparent', fg: '#6B7079' } as SurfaceTone, ...tones] : tones;
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((t) => {
        const active = (value ?? '') === t.id;
        return (
          <button
            key={t.id || 'default'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.id)}
            className={cx(
              'flex flex-col items-start gap-2 rounded-xl border p-2 text-left transition-colors duration-150',
              active ? 'border-select bg-select-soft' : 'border-line hover:border-[#CDD1D7]'
            )}>
            
            <span
              className={cx('grid h-9 w-full place-items-center rounded-lg border border-black/10', !t.id && 'border-dashed border-[#B8BDC5] bg-white')}
              style={t.id ? { background: t.color, color: t.fg } : undefined}>
              
              {active && <CheckIcon className="h-4 w-4" strokeWidth={2.5} />}
            </span>
            <span className="text-[12px] font-medium text-ink">{t.label}</span>
          </button>);

      })}
    </div>);

}