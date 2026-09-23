import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';
import type { FontPair } from '../../../types/editor';

interface FontPickerProps {
  fonts: FontPair[];
  value: string;
  onChange: (id: string) => void;
}

export function FontPicker({ fonts, value, onChange }: FontPickerProps) {
  return (
    <div className="space-y-2">
      {fonts.map((f) => {
        const active = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(f.id)}
            className={cx(
              'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-150',
              active ? 'border-select bg-select-soft' : 'border-line hover:border-[#CDD1D7]'
            )}>
            
            <span className="w-10 text-[26px] leading-none text-ink" style={{ fontFamily: f.display }}>
              Aa
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">{f.label}</span>
              <span className="block truncate text-[12px] text-mute" style={{ fontFamily: f.body }}>
                {f.display.split(',')[0].replace(/'/g, '')} + {f.body.split(',')[0].replace(/'/g, '')}
              </span>
            </span>
            {active && <CheckIcon className="h-4 w-4 text-select" strokeWidth={2.5} />}
          </button>);

      })}
    </div>);

}